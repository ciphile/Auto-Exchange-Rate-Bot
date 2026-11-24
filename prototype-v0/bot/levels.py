"""Level (threshold) crossing detection with hysteresis.

Band k means: levels[k-1] <= rate < levels[k]. Moving up through levels[i] needs
rate >= levels[i] + h; moving down needs rate <= levels[i] - h, so a rate hovering
right on a level doesn't fire repeatedly.
"""

from __future__ import annotations


def band_of(rate: float, levels: tuple[int, ...]) -> int:
    return sum(1 for lv in levels if rate >= lv)


def update_band(prev: int | None, rate: float, levels: tuple[int, ...], h: float) -> int:
    if prev is None:
        return band_of(rate, levels)
    band = prev
    while band < len(levels) and rate >= levels[band] + h:
        band += 1
    while band > 0 and rate <= levels[band - 1] - h:
        band -= 1
    return band


def crossings(prev: int, new: int, levels: tuple[int, ...]) -> list[tuple[int, str]]:
    """Levels crossed going from band prev to band new, in the order crossed."""
    if new > prev:
        return [(levels[i], "up") for i in range(prev, new)]
    if new < prev:
        return [(levels[i], "down") for i in range(prev - 1, new - 1, -1)]
    return []
