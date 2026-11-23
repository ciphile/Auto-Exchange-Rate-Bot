"""Parse and answer chat commands: /rate, /vcb, /convert."""

from __future__ import annotations

import re
from dataclasses import dataclass

HELP = (
    "Lệnh:\n"
    "/rate – tỷ giá SGD→VND hôm nay\n"
    "/vcb – bảng giá VCB cho SGD\n"
    "/convert <số tiền> [sgd|vnd] – quy đổi (mặc định SGD→VND)\n"
    "Ví dụ: /convert 10000  hoặc  /convert 200000000 vnd"
)


@dataclass(frozen=True)
class Command:
    name: str  # 'rate' | 'vcb' | 'convert' | 'help'
    amount: float | None = None
    currency: str = "SGD"


_CMD_RE = re.compile(r"^/(\w+)(?:@\w+)?(?:\s+(.*))?$", re.DOTALL)


def parse_amount(text: str) -> float | None:
    """Accept '10000', '10,000', '10.000' (VN thousands), '10.5', '10k', '1.5m'."""
    t = text.strip().lower().replace(" ", "")
    mult = 1.0
    if t.endswith("k"):
        mult, t = 1_000.0, t[:-1]
    elif t.endswith("m") or t.endswith("tr"):
        mult, t = 1_000_000.0, t[:-1] if t.endswith("m") else t[:-2]
    if not t:
        return None
    # '10.000' / '1.234.567' => thousands separators; '10.5' => decimal.
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", t):
        t = t.replace(".", "")
    t = t.replace(",", "")
    try:
        value = float(t) * mult
    except ValueError:
        return None
    return value if value > 0 else None


def parse_command(text: str | None) -> Command | None:
    """Return a Command for a message, or None if it isn't one of ours."""
    if not text:
        return None
    m = _CMD_RE.match(text.strip())
    if not m:
        return None
    name, rest = m.group(1).lower(), (m.group(2) or "").strip()
    if name in ("rate", "tygia"):
        return Command("rate")
    if name == "vcb":
        return Command("vcb")
    if name in ("start", "help"):
        return Command("help")
    if name in ("convert", "doi"):
        parts = rest.split()
        if not parts:
            return Command("help")
        currency = "SGD"
        if parts[-1].lower() in ("sgd", "vnd") and len(parts) > 1:
            currency = parts.pop().upper()
        amount = parse_amount("".join(parts))
        if amount is None:
            return Command("help")
        return Command("convert", amount, currency)
    return None
