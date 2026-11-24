"""Message formatting (Vietnamese, matching the group's tone).

All numbers are produced here, never by the AI."""

from __future__ import annotations

import random
from datetime import date

from . import config
from .market import Market
from .sources import BankRate

LEGEND = (
    "ℹ️ Wise = tỉ giá mid-market, ko có giá mua/bán riêng, phí tính thêm khi chuyển. "
    "NH mua = ngân hàng mua SGD của mình (số mình nhận dc). CK = chuyển khoản, TM = tiền mặt."
)


def fmt(value: float | None, decimals: int = 2) -> str:
    return "n/a" if value is None else f"{value:,.{decimals}f}"


def signed(value: float | None, decimals: int = 2) -> str:
    if value is None:
        return ""
    if abs(value) < 0.005:
        return "■ 0"
    return f"{'▲' if value > 0 else '▼'} {value:+,.{decimals}f}"


def wise_line(m: Market) -> str:
    label = "Wise (mid-market, chưa trừ phí)" if m.source == "wise" else "Mid-market ≈ Wise (nguồn dự phòng, cập nhật 1 lần/ngày)"
    line = f"🌐 {label}: {fmt(m.mid)}"
    if m.change_24h is not None:
        line += f"  {signed(m.change_24h, 1)} / 24h"
    if m.high_7d is not None and m.low_7d is not None:
        line += f"\n    7 ngày: thấp {fmt(m.low_7d, 0)} – cao {fmt(m.high_7d, 0)}"
    return line


def bank_line(b: BankRate | None, name: str) -> str:
    if b is None:
        return f"🏦 {name}: không lấy được dữ liệu"
    return (
        f"🏦 {b.bank} – NH mua: CK {fmt(b.transfer_buy, 0)} · TM {fmt(b.cash_buy, 0)}"
        f" | NH bán: {fmt(b.sell, 0)}"
    )


def black_line(est: float, premium: float, n: int) -> str:
    basis = f"từ {n} lần đổi gần đây" if n else "mặc định, dùng /doi <giá> để chỉnh"
    return f"🕶 Chợ đen (ước tính): ~{fmt(est, 0)} (Wise {premium * 100:+.2f}%, {basis})"


def level_line(mid: float) -> str:
    below = [lv for lv in config.LEVELS if lv <= mid]
    above = [lv for lv in config.LEVELS if lv > mid]
    parts = []
    if below:
        parts.append(f"trên {below[-1]:,} {mid - below[-1]:+,.0f}")
    if above:
        parts.append(f"dưới {above[0]:,} {mid - above[0]:+,.0f}")
    return "📍 " + " · ".join(parts)


def build_summary(
    today: date,
    market: Market | None,
    vcb: BankRate | None,
    vpbank: BankRate | None,
    black: tuple[float, float, int] | None,
    comment: str | None = None,
) -> str:
    head = f"Giá SGD hôm nay {today.strftime('%d.%m.%Y')}:"
    lines = [f"{head} {comment}" if comment else head, ""]
    lines.append(wise_line(market) if market else "🌐 Wise: không lấy được dữ liệu")
    if black:
        lines.append(black_line(*black))
    lines += [bank_line(vcb, "VCB"), bank_line(vpbank, "VPBank")]
    if market:
        lines.append(level_line(market.mid))
    lines += ["", LEGEND]
    return "\n".join(lines)


def build_alert(
    market: Market,
    event: str,
    black: tuple[float, float, int],
    comment: str,
) -> str:
    lines = [comment, "", f"{'📈' if 'lên' in event else '📉'} Wise {event}: {fmt(market.mid)}"]
    if market.change_24h is not None:
        lines[-1] += f"  ({signed(market.change_24h, 1)} / 24h)"
    lines.append(black_line(*black))
    return "\n".join(lines)


def build_banks(vcb: BankRate | None, vpbank: BankRate | None) -> str:
    return "\n".join([bank_line(vcb, "VCB"), bank_line(vpbank, "VPBank"), "", LEGEND])


def build_convert(
    amount: float,
    from_ccy: str,
    market: Market | None,
    black: tuple[float, float, int] | None,
    vcb: BankRate | None,
    vpbank: BankRate | None,
) -> str:
    def conv(rate: float | None, label: str, decimals: int) -> str | None:
        if rate is None:
            return None
        value = amount * rate if from_ccy == "SGD" else amount / rate
        return f"• {label}: {fmt(value, decimals)}{' đ' if from_ccy == 'SGD' else ' SGD'}"

    d = 0 if from_ccy == "SGD" else 2
    lines = [f"💸 {fmt(amount, 0 if amount == int(amount) else 2)} {from_ccy} → {'VND' if from_ccy == 'SGD' else 'SGD'}"]
    candidates = [
        conv(market.mid if market else None, "Wise (chưa phí)", d),
        conv(black[0] if black else None, "Chợ đen (ước tính)", d),
    ]
    for b in (vcb, vpbank):
        if b is None:
            continue
        if from_ccy == "SGD":
            candidates += [conv(b.transfer_buy, f"{b.bank} mua CK", d), conv(b.cash_buy, f"{b.bank} mua TM", d)]
        else:
            candidates.append(conv(b.sell, f"{b.bank} bán", d))
    lines += [c for c in candidates if c]
    if len(lines) == 1:
        lines.append("Không lấy được tỉ giá, thử lại sau.")
    return "\n".join(lines)


def build_report_ack(rate: float, mid: float, est: tuple[float, float, int]) -> str:
    diff = (rate / mid - 1) * 100
    _, premium, n = est
    return (
        f"Ghi nhận đổi dc {fmt(rate, 0)} (Wise lúc này {fmt(mid)}, chênh {diff:+.2f}%). "
        f"Chênh lệch chợ đen đang ước tính {premium * 100:+.2f}% dựa trên {n} lần báo."
    )


# --- template fallbacks (used when the AI is unavailable or rejected) --------

_DAILY = {
    "up": ["Nhích lên 1 xíu", "Tăng nhẹ, cũng ổn", "Lên chút xíu haha"],
    "down": ["Tụt 1 xíu :))", "Giảm nhẹ, pùn", "Xuống chút r mấy sếp"],
    "flat": ["Đứng im ko biến động", "Lình xình quanh mốc cũ", "Êm ru"],
}
_ALERT = {
    "up": ["Lên r nè haha", "Nhích dc 1 xíu :))", "Ngon, vượt mốc r"],
    "down": ["Pùn :))", "Tụt mốc r mấy sếp ơi", "Rớt r, haha lo gì"],
}


def fallback_comment(kind: str, direction: str, recent: list[str]) -> str:
    pool = (_DAILY if kind == "daily" else _ALERT).get(direction) or _DAILY["flat"]
    fresh = [p for p in pool if p not in recent] or pool
    return random.choice(fresh)
