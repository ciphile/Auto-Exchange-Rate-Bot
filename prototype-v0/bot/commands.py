"""Parse chat commands: /rate, /bank, /convert, /doi."""

from __future__ import annotations

import re
from dataclasses import dataclass

HELP = (
    "Lệnh:\n"
    "/rate – tỉ giá SGD→VND hôm nay (Wise, VCB, VPBank, chợ đen ước tính)\n"
    "/bank – giá VCB và VPBank\n"
    "/convert <số tiền> [sgd|vnd] – quy đổi (mặc định SGD→VND)\n"
    "/doi <giá> – báo giá chợ đen vừa đổi dc, vd /doi 20100 (để bot ước tính chuẩn hơn)\n"
    "Ví dụ: /convert 10000  hoặc  /convert 200tr vnd"
)

REPORT_RANGE = (10_000.0, 40_000.0)  # sanity bounds for a SGD→VND rate


@dataclass(frozen=True)
class Command:
    name: str  # 'rate' | 'bank' | 'convert' | 'report' | 'help'
    amount: float | None = None
    currency: str = "SGD"


_CMD_RE = re.compile(r"^/(\w+)(?:@\w+)?(?:\s+(.*))?$", re.DOTALL)


def parse_amount(text: str) -> float | None:
    """Accept '10000', '10,000', '10.000' (VN thousands), '10.5', '10k', '1.5m', '200tr'."""
    t = text.strip().lower().replace(" ", "")
    mult = 1.0
    if t.endswith("tr"):
        mult, t = 1_000_000.0, t[:-2]
    elif t.endswith("k"):
        mult, t = 1_000.0, t[:-1]
    elif t.endswith("m"):
        mult, t = 1_000_000.0, t[:-1]
    if not t:
        return None
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", t):  # '10.000' / '1.234.567' => thousands separators
        t = t.replace(".", "")
    t = t.replace(",", "")
    try:
        value = float(t) * mult
    except ValueError:
        return None
    return value if value > 0 else None


def parse_command(text: str | None) -> Command | None:
    if not text:
        return None
    m = _CMD_RE.match(text.strip())
    if not m:
        return None
    name, rest = m.group(1).lower(), (m.group(2) or "").strip()
    if name in ("rate", "tygia"):
        return Command("rate")
    if name in ("bank", "vcb", "vpbank"):
        return Command("bank")
    if name in ("start", "help"):
        return Command("help")
    if name == "doi":
        amount = parse_amount(rest)
        if amount is None or not REPORT_RANGE[0] <= amount <= REPORT_RANGE[1]:
            return Command("help")
        return Command("report", amount)
    if name in ("convert", "quydoi"):
        parts = rest.split()
        if not parts:
            return Command("help")
        currency = "SGD"
        if parts[-1].lower() in ("sgd", "vnd") and len(parts) > 1:
            currency = parts.pop().upper()
        amount = parse_amount("".join(parts))
        return Command("convert", amount, currency) if amount else Command("help")
    return None
