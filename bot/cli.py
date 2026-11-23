"""Entry points: `python -m bot daily|poll|preview`."""

from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone

from . import messages
from .commands import HELP, Command, parse_command
from .sources import SourceError, VcbRate, fetch_mid_market, fetch_vcb_day, fetch_vcb_live
from .telegram import Telegram, TelegramError

VN_TZ = timezone(timedelta(hours=7))  # Vietnam has no DST
MAX_COMMAND_AGE_S = 30 * 60  # ignore commands older than this (e.g. after an outage)


def today_vn() -> date:
    return datetime.now(VN_TZ).date()


def _try(fn, *args):
    try:
        return fn(*args)
    except SourceError as exc:
        print(f"warning: {exc}", file=sys.stderr)
        return None


def build_daily_message() -> str:
    today = today_vn()
    mid = _try(fetch_mid_market, "SGD", "VND")
    vcb = _try(fetch_vcb_live, "SGD")
    vcb_prev = _try(fetch_vcb_day, today - timedelta(days=1), "SGD")
    if mid is None and vcb is None:
        raise SystemExit("error: no rate source available; not posting")
    return messages.build_rate_message(today, mid, vcb, vcb_prev)


def answer(cmd: Command) -> str:
    if cmd.name == "help":
        return HELP
    mid: float | None = None
    vcb: VcbRate | None = None
    if cmd.name in ("rate", "convert"):
        mid = _try(fetch_mid_market, "SGD", "VND")
    if cmd.name in ("rate", "vcb", "convert"):
        vcb = _try(fetch_vcb_live, "SGD")
    if cmd.name == "rate":
        return messages.build_rate_message(today_vn(), mid, vcb)
    if cmd.name == "vcb":
        return messages.build_vcb_message(vcb) if vcb else "Không lấy được giá VCB, thử lại sau."
    assert cmd.amount is not None
    return messages.build_convert_message(cmd.amount, cmd.currency, mid, vcb)


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"error: environment variable {name} is not set")
    return value


def cmd_daily(args: argparse.Namespace) -> None:
    text = build_daily_message()
    if args.dry_run:
        print(text)
        return
    Telegram(_require_env("TELEGRAM_BOT_TOKEN")).send_message(_require_env("TELEGRAM_CHAT_ID"), text)


def cmd_poll(args: argparse.Namespace) -> None:
    """Answer pending commands, then confirm them so they are not replayed.

    GitHub Actions has no long-running process, so this runs on a short cron and
    drains Telegram's update queue. Updates are confirmed with getUpdates(offset)
    rather than persisted state, so the job needs no storage.
    """
    tg = Telegram(_require_env("TELEGRAM_BOT_TOKEN"))
    chat_id = str(_require_env("TELEGRAM_CHAT_ID"))
    updates = tg.get_updates()
    if not updates:
        print("no updates")
        return
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
            tg.send_message(chat_id, answer(cmd), reply_to=msg.get("message_id"))
            handled += 1
        except TelegramError as exc:
            print(f"warning: could not reply: {exc}", file=sys.stderr)
    tg.get_updates(offset=updates[-1]["update_id"] + 1, limit=1)  # confirm everything seen
    print(f"processed {len(updates)} updates, answered {handled} commands")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="bot", description="SGD→VND exchange-rate Telegram bot")
    sub = parser.add_subparsers(dest="command", required=True)
    daily = sub.add_parser("daily", help="post the daily rate summary")
    daily.add_argument("--dry-run", action="store_true", help="print instead of sending")
    daily.set_defaults(func=cmd_daily)
    poll = sub.add_parser("poll", help="answer pending /rate, /vcb, /convert commands")
    poll.set_defaults(func=cmd_poll)
    preview = sub.add_parser("preview", help="print the daily message (alias of daily --dry-run)")
    preview.set_defaults(func=cmd_daily, dry_run=True)
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except TelegramError as exc:
        raise SystemExit(f"error: {exc}") from None


if __name__ == "__main__":
    main()
