"""Tiny JSON state file. In GitHub Actions it is loaded from / saved to the
`bot-state` branch by scripts/state.sh, so no database is needed."""

from __future__ import annotations

import json
import os
from pathlib import Path

MAX_RECENT_TEXTS = 6


def path() -> Path:
    return Path(os.environ.get("BOT_STATE_FILE", "state.json"))


def load() -> dict:
    try:
        data = json.loads(path().read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def save(state: dict) -> None:
    path().write_text(json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def remember_text(state: dict, text: str) -> None:
    recent = state.setdefault("recent_texts", [])
    recent.append(text)
    del recent[:-MAX_RECENT_TEXTS]
