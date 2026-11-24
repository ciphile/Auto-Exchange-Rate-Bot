"""Minimal Telegram Bot API client (stdlib only)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

API = "https://api.telegram.org/bot{token}/{method}"


class TelegramError(Exception):
    pass


class Telegram:
    def __init__(self, token: str):
        self._token = token

    def _call(self, method: str, payload: dict) -> object:
        req = urllib.request.Request(
            API.format(token=self._token, method=method),
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = json.load(resp)
        except urllib.error.HTTPError as exc:
            # Don't echo the URL: it contains the bot token.
            raise TelegramError(f"{method} failed: HTTP {exc.code}") from None
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            raise TelegramError(f"{method} failed: {type(exc).__name__}") from None
        if not body.get("ok"):
            raise TelegramError(f"{method} failed: {body.get('description')}")
        return body["result"]

    def send_message(self, chat_id: int | str, text: str, reply_to: int | None = None) -> None:
        payload: dict = {"chat_id": chat_id, "text": text, "disable_web_page_preview": True}
        if reply_to is not None:
            payload["reply_parameters"] = {"message_id": reply_to, "allow_sending_without_reply": True}
        self._call("sendMessage", payload)

    def get_updates(self, offset: int | None = None, limit: int = 100) -> list[dict]:
        payload: dict = {"limit": limit, "timeout": 0, "allowed_updates": ["message"]}
        if offset is not None:
            payload["offset"] = offset
        return self._call("getUpdates", payload)  # type: ignore[return-value]
