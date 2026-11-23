"""Black-market (chợ đen) estimate. There is no API, so we model it as
Wise mid-market * (1 + premium) and calibrate the premium from rates the group
reports with /doi."""

from __future__ import annotations

import statistics
import time

from . import config

MAX_REPORTS = 30
MAX_AGE_S = 45 * 86400
RECENT_N = 10
MIN_FULL_WEIGHT = 3  # fewer reports than this are blended with the default premium


def record_report(state: dict, rate: float, mid: float, now: float | None = None) -> None:
    reports = state.setdefault("reports", [])
    reports.append({"ts": now or time.time(), "rate": rate, "mid": mid})
    del reports[:-MAX_REPORTS]


def estimate(mid: float, state: dict, now: float | None = None) -> tuple[float, float, int]:
    """Return (estimated_rate, premium_fraction, n_reports_used)."""
    now = now or time.time()
    recent = [
        r for r in state.get("reports", []) if now - r["ts"] <= MAX_AGE_S and r["mid"] > 0
    ][-RECENT_N:]
    default = config.DEFAULT_PREMIUM
    if recent:
        med = statistics.median(r["rate"] / r["mid"] - 1 for r in recent)
        w = min(len(recent), MIN_FULL_WEIGHT) / MIN_FULL_WEIGHT
        premium = w * med + (1 - w) * default
    else:
        premium = default
    lo, hi = config.PREMIUM_BOUNDS
    premium = max(lo, min(hi, premium))
    return round(mid * (1 + premium), -1), premium, len(recent)
