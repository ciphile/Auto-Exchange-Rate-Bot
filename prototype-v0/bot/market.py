"""Wise mid-market snapshot with 24h change and 7-day range."""

from __future__ import annotations

import sys
from dataclasses import dataclass

from . import sources
from .sources import SourceError

DAY = 86400.0


@dataclass(frozen=True)
class Market:
    mid: float
    source: str  # 'wise' | 'er-api'
    change_24h: float | None = None
    high_7d: float | None = None
    low_7d: float | None = None


def market_from_history(points: list[tuple[float, float]]) -> Market:
    last_ts, mid = points[-1]
    window = [v for ts, v in points if ts >= last_ts - 7 * DAY]
    # point closest to exactly 24h before the latest one, if it is within 2h of that
    ts24, v24 = min(points, key=lambda p: abs(p[0] - (last_ts - DAY)))
    change = mid - v24 if abs(ts24 - (last_ts - DAY)) <= 2 * 3600 else None
    return Market(mid, "wise", change, max(window), min(window))


def get_market() -> Market | None:
    """Best available mid-market rate: Wise hourly history > Wise live > daily fallback."""
    try:
        return market_from_history(sources.fetch_wise_history(8))
    except SourceError as exc:
        print(f"warning: wise history: {exc}", file=sys.stderr)
    try:
        return Market(sources.fetch_wise_live(), "wise")
    except SourceError as exc:
        print(f"warning: wise live: {exc}", file=sys.stderr)
    try:
        return Market(sources.fetch_mid_market("SGD", "VND"), "er-api")
    except SourceError as exc:
        print(f"warning: er-api: {exc}", file=sys.stderr)
    return None
