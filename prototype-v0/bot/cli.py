"""Entry points: `python -m bot daily|check|poll|preview`."""

from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone

from . import ai, blackmarket, config, levels, messages, state as state_store
from .commands import HELP, Command, parse_command
from .market import Market, get_market
from .sources import BankRate, SourceError, fetch_vcb_live, fetch_vpbank
from .telegram import Telegram, TelegramError

VN_TZ = timezone(timedelta(hours=7))  # Vietnam has no DST
MAX_COMMAND_AGE_S = 30 * 60  # ignore commands older than this (e.g. after an outage)


def now_vn() -> datetime:
    return datetime.now(VN_TZ)


def _try(fn, *args):
    try:
        return fn(*args)
    except SourceError as exc:
        print(f"warning: {exc}", file=sys.stderr)
        return None


def fetch_banks() -> tuple[BankRate | None, BankRate | None]:
    return _try(fetch_vcb_live, "SGD"), _try(fetch_vpbank, "SGD")


def _direction(change: float | None) -> str:
    return "flat" if change is None or abs(change) < 5 else ("up" if change > 0 else "down")


def facts_for(market: Market, black: tuple[float, float, int], today: date, event: str | None = None) -> dict:
    """Context for the AI. Numbers here are for reasoning only; the model may not quote them."""
    last_day = (date(today.year + (today.month == 12), today.month % 12 + 1, 1) - timedelta(days=1)).day
    facts = {
        "levels": list(config.LEVELS),
        "wise_rate_vnd_per_sgd": round(market.mid, 1),
        "change_24h_vnd": None if market.change_24h is None else round(market.change_24h, 1),
        "range_7d_vnd": [market.low_7d and round(market.low_7d), market.high_7d and round(market.high_7d)],
        "black_market_estimate": black[0],
        "days_until_month_end_salary_time": last_day - today.day,
        "trend": _direction(market.change_24h),
    }
    if event:
        facts["event"] = event
    return facts


def comment_for(kind: str, market: Market, black, today: date, state: dict, event: str | None, direction: str) -> str:
    recent = state.get("recent_texts", [])
    text = ai.generate_comment(kind, facts_for(market, black, today, event), recent)
    return text or messages.fallback_comment(kind, direction, recent)


def build_daily(state: dict) -> str | None:
    today = now_vn().date()
    market = get_market()
    vcb, vpbank = fetch_banks()
    if market is None and vcb is None and vpbank is None:
        return None
    black = blackmarket.estimate(market.mid, state) if market else None
    comment = None
    if market and black:
        comment = comment_for("daily", market, black, today, state, None, _direction(market.change_24h))
        state_store.remember_text(state, comment)
    return messages.build_summary(today, market, vcb, vpbank, black, comment)


def in_quiet_hours(now: datetime) -> bool:
    return now.hour >= config.QUIET_START_HOUR or now.hour < config.QUIET_END_HOUR


def describe_event(events: list[tuple[int, str]]) -> tuple[str, str, bool]:
    """Pick the most notable crossing: (description, direction, is_key_level)."""
    key = [e for e in events if e[0] in config.KEY_LEVELS]
    level, direction = (key or events)[-1]
    verb = "vừa vượt lên trên" if direction == "up" else "vừa tụt xuống dưới"
    return f"{verb} mốc {level:,}", direction, bool(key)


def check_alert(state: dict, market: Market, now: datetime) -> str | None:
    """Update the level band and return an alert message when one is due."""
    prev = state.get("band")
    new = levels.update_band(prev, market.mid, config.LEVELS, config.HYSTERESIS)
    events = [] if prev is None else levels.crossings(prev, new, config.LEVELS)
    state["last_mid"] = market.mid
    if not events:
        state["band"] = new
        return None

    event, direction, is_key = describe_event(events)
    today_key = now.date().isoformat()
    sent = state.setdefault("alerts", {})
    if sent.get("date") != today_key:
        sent.update(date=today_key, n=0)
    since_last = time.time() - state.get("last_alert_ts", 0)
    if in_quiet_hours(now) or sent["n"] >= config.MAX_ALERTS_PER_DAY or (
        not is_key and since_last < config.ALERT_COOLDOWN_S
    ):
        print(f"alert suppressed ({event}); band kept so it can fire later")
        return None  # band left unchanged: a still-valid crossing fires once allowed

    black = blackmarket.estimate(market.mid, state)
    comment = comment_for("alert", market, black, now.date(), state, event, direction)
    state_store.remember_text(state, comment)
    state.update(band=new, last_alert_ts=time.time())
    sent["n"] += 1
    return messages.build_alert(market, event, black, comment)


def answer(cmd: Command, state: dict) -> str:
    if cmd.name == "help":
        return HELP
    market = get_market() if cmd.name in ("rate", "convert", "report") else None
    vcb = vpbank = None
    if cmd.name in ("rate", "bank", "convert"):
        vcb, vpbank = fetch_banks()
    black = blackmarket.estimate(market.mid, state) if market else None
    if cmd.name == "report":
        if market is None:
            return "Không lấy được tỉ giá Wise lúc này, báo lại sau nha."
        assert cmd.amount is not None
        blackmarket.record_report(state, cmd.amount, market.mid)
        return messages.build_report_ack(cmd.amount, market.mid, blackmarket.estimate(market.mid, state))
    if cmd.name == "rate":
        return messages.build_summary(now_vn().date(), market, vcb, vpbank, black)
    if cmd.name == "bank":
        return messages.build_banks(vcb, vpbank)
    assert cmd.amount is not None
    return messages.build_convert(cmd.amount, cmd.currency, market, black, vcb, vpbank)


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"error: environment variable {name} is not set")
    return value


def _send(text: str) -> None:
    Telegram(_require_env("TELEGRAM_BOT_TOKEN")).send_message(_require_env("TELEGRAM_CHAT_ID"), text)


def cmd_daily(args: argparse.Namespace) -> None:
    state = state_store.load()
    text = build_daily(state)
    if text is None:
        raise SystemExit("error: no rate source available; not posting")
    if args.dry_run:
        print(text)
        return
    _send(text)
    state_store.save(state)


def cmd_check(args: argparse.Namespace) -> None:
    state = state_store.load()
    market = get_market()
    if market is None:
        raise SystemExit("error: no Wise/mid-market rate available")
    text = check_alert(state, market, now_vn())
    print(f"mid={market.mid:.1f} band={state.get('band')}")
    if text:
        if args.dry_run:
            print(text)
            return
        _send(text)
    if not args.dry_run:
        state_store.save(state)


def cmd_poll(args: argparse.Namespace) -> None:
    """Answer pending commands, then confirm them so they are not replayed.

    GitHub Actions has no long-running process, so this runs on a short cron and
    drains Telegram's update queue. Updates are confirmed with getUpdates(offset)
    rather than persisted, so the job needs no extra storage.
    """
    tg = Telegram(_require_env("TELEGRAM_BOT_TOKEN"))
    chat_id = str(_require_env("TELEGRAM_CHAT_ID"))
    updates = tg.get_updates()
    if not updates:
        print("no updates")
        return
    state = state_store.load()
    now = time.time()
    handled = 0
    for upd in updates:
        msg = upd.get("message") or {}
        if str((msg.get("chat") or {}).get("id")) != chat_id:
            continue  # only serve the configured group
        if now - msg.get("date", 0) > MAX_COMMAND_AGE_S:
            continue
        cmd = parse_command(msg.get("text"))
        if cmd is None:
            continue
        try:
            tg.send_message(chat_id, answer(cmd, state), reply_to=msg.get("message_id"))
            handled += 1
        except TelegramError as exc:
            print(f"warning: could not reply: {exc}", file=sys.stderr)
    state_store.save(state)
    tg.get_updates(offset=updates[-1]["update_id"] + 1, limit=1)  # confirm everything seen
    print(f"processed {len(updates)} updates, answered {handled} commands")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="bot", description="SGD→VND exchange-rate Telegram bot")
    sub = parser.add_subparsers(dest="command", required=True)
    for name, func, helptext in (
        ("daily", cmd_daily, "post the morning rate summary"),
        ("check", cmd_check, "post an alert if Wise crossed a level"),
    ):
        p = sub.add_parser(name, help=helptext)
        p.add_argument("--dry-run", action="store_true", help="print instead of sending; state is not saved")
        p.set_defaults(func=func)
    sub.add_parser("poll", help="answer pending /rate, /bank, /convert, /doi commands").set_defaults(func=cmd_poll)
    sub.add_parser("preview", help="print the morning message (alias of daily --dry-run)").set_defaults(
        func=cmd_daily, dry_run=True
    )
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except TelegramError as exc:
        raise SystemExit(f"error: {exc}") from None


if __name__ == "__main__":
    main()
