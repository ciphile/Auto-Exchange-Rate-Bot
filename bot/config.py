"""Tunable settings. Levels come from what the group actually worries about:
20,100 (Thuan: "rớt xuống < 20100 rồi"), 20,000 ("SGD sắp rớt xuống dưới 20.000đ"),
and the ~19,910-20,340 range Wise showed over the last two months."""

from __future__ import annotations

import os


def _levels() -> tuple[int, ...]:
    raw = os.environ.get("BOT_LEVELS", "")
    if raw.strip():
        return tuple(sorted(int(x) for x in raw.split(",") if x.strip()))
    return (19900, 19950, 20000, 20100, 20200, 20300)


LEVELS = _levels()
KEY_LEVELS = (20000, 20100)  # alerts on these ignore the cooldown
HYSTERESIS = 10.0  # VND; avoids flapping when the rate hovers on a level (~ Thuan's 19990/20010)

DEFAULT_PREMIUM = 0.004  # black market vs Wise mid-market: Abe says "tầm 20-20100" when Wise is ~20,000
PREMIUM_BOUNDS = (-0.005, 0.02)

QUIET_START_HOUR = 22  # Vietnam time; no alerts from 22:00 to 07:00
QUIET_END_HOUR = 7
MAX_ALERTS_PER_DAY = 4
ALERT_COOLDOWN_S = 2 * 3600

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-5-5")
