"""Message formatting (Vietnamese, to match the group)."""

from __future__ import annotations

from datetime import date

from .sources import VcbRate


def fmt(value: float | None, decimals: int = 2) -> str:
    return "n/a" if value is None else f"{value:,.{decimals}f}"


def delta(now: float | None, before: float | None) -> str:
    """'▲ +12.30' / '▼ -4.10' / '■ 0.00', or '' when either side is unknown."""
    if now is None or before is None:
        return ""
    diff = now - before
    if abs(diff) < 0.005:
        return " (■ 0.00)"
    arrow = "▲" if diff > 0 else "▼"
    return f" ({arrow} {diff:+,.2f})"


def build_rate_message(
    today: date,
    mid: float | None,
    vcb: VcbRate | None,
    vcb_yesterday: VcbRate | None = None,
    currency: str = "SGD",
) -> str:
    lines = [f"💱 Tỷ giá {currency} → VND ngày {today.strftime('%d.%m.%Y')}", ""]

    if mid is not None:
        lines.append(f"🌐 Mid-market (≈ Wise, chưa phí): {fmt(mid)}")
    else:
        lines.append("🌐 Mid-market: không lấy được dữ liệu")

    if vcb is not None:
        y = vcb_yesterday
        lines += [
            "",
            "🏦 Vietcombank (VCB)",
            f"• Mua tiền mặt: {fmt(vcb.cash_buy)}{delta(vcb.cash_buy, y and y.cash_buy)}",
            f"• Mua chuyển khoản: {fmt(vcb.transfer_buy)}{delta(vcb.transfer_buy, y and y.transfer_buy)}",
            f"• Bán: {fmt(vcb.sell)}{delta(vcb.sell, y and y.sell)}",
        ]
        if mid is not None and vcb.transfer_buy is not None:
            gap = vcb.transfer_buy - mid
            lines += [
                "",
                f"📉 VCB chuyển khoản thấp hơn mid-market {abs(gap):,.2f} đ/SGD"
                if gap < 0
                else f"📈 VCB chuyển khoản cao hơn mid-market {gap:,.2f} đ/SGD",
            ]
    else:
        lines += ["", "🏦 VCB: không lấy được dữ liệu"]

    lines += ["", "ℹ️ Mũi tên so với giá VCB cuối ngày hôm qua. Gõ /convert <số tiền> để quy đổi."]
    return "\n".join(lines)


def build_vcb_message(vcb: VcbRate) -> str:
    return "\n".join(
        [
            f"🏦 VCB {vcb.currency} → VND",
            f"• Mua tiền mặt: {fmt(vcb.cash_buy)}",
            f"• Mua chuyển khoản: {fmt(vcb.transfer_buy)}",
            f"• Bán: {fmt(vcb.sell)}",
        ]
    )


def build_convert_message(
    amount: float,
    from_ccy: str,
    mid: float | None,
    vcb: VcbRate | None,
) -> str:
    """Convert SGD→VND or VND→SGD using mid-market and VCB transfer-buy / sell."""
    lines = []
    if from_ccy == "SGD":
        lines.append(f"💸 {fmt(amount, 0 if amount == int(amount) else 2)} SGD → VND")
        if mid is not None:
            lines.append(f"• Mid-market: {fmt(amount * mid, 0)} đ")
        if vcb is not None and vcb.transfer_buy is not None:
            lines.append(f"• VCB mua chuyển khoản: {fmt(amount * vcb.transfer_buy, 0)} đ")
        if vcb is not None and vcb.cash_buy is not None:
            lines.append(f"• VCB mua tiền mặt: {fmt(amount * vcb.cash_buy, 0)} đ")
    else:
        lines.append(f"💸 {fmt(amount, 0)} VND → SGD")
        if mid is not None:
            lines.append(f"• Mid-market: {fmt(amount / mid)} SGD")
        if vcb is not None and vcb.sell is not None:
            lines.append(f"• VCB bán (giá mua SGD của bạn): {fmt(amount / vcb.sell)} SGD")
    if len(lines) == 1:
        lines.append("Không lấy được tỷ giá, thử lại sau.")
    return "\n".join(lines)
