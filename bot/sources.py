"""Rate sources. Each fetcher returns plain dataclasses and raises SourceError on failure."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass

USER_AGENT = "Mozilla/5.0 (compatible; auto-exchange-rate-bot)"
TIMEOUT = 20

MID_MARKET_URL = "https://open.er-api.com/v6/latest/{base}"
VCB_LIVE_URL = "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx?b=10"
VPBANK_URL = "https://www.vpbank.com.vn/uiux-api/api/exchange-rate"
WISE_LIVE_URL = "https://wise.com/rates/live?source={base}&target={quote}"
WISE_HISTORY_URL = (
    "https://wise.com/rates/history+live?source={base}&target={quote}"
    "&length={days}&resolution=hourly&unit=day"
)


class SourceError(Exception):
    pass


@dataclass(frozen=True)
class BankRate:
    """A bank's quote in VND per 1 unit of foreign currency. None = not quoted.

    'buy' is the bank BUYING your foreign currency, i.e. what you receive when you
    sell SGD to the bank. 'sell' is the bank selling SGD to you.
    """

    bank: str
    currency: str
    cash_buy: float | None
    transfer_buy: float | None
    sell: float | None


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.read()
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise SourceError(f"request failed for {url}: {exc}") from exc


def _num(text: str | None) -> float | None:
    """Parse '19,497.26' / '19454.97' / '-' / '' into a float or None."""
    if text is None:
        return None
    text = text.strip().replace(",", "")
    if text in ("", "-"):
        return None
    try:
        return float(text)
    except ValueError:
        return None


# --- mid-market --------------------------------------------------------------


def parse_mid_market(payload: bytes, base: str, quote: str) -> float:
    try:
        data = json.loads(payload)
        if data.get("result") != "success":
            raise SourceError(f"mid-market API error: {data.get('error-type')}")
        return float(data["rates"][quote])
    except (ValueError, KeyError, TypeError) as exc:
        raise SourceError(f"bad mid-market payload for {base}/{quote}: {exc}") from exc


def fetch_mid_market(base: str = "SGD", quote: str = "VND") -> float:
    """Mid-market rate (what Wise-style services start from, before their fee)."""
    return parse_mid_market(_get(MID_MARKET_URL.format(base=base)), base, quote)


# --- Vietcombank -------------------------------------------------------------


def parse_vcb_xml(payload: bytes, currency: str) -> BankRate:
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as exc:
        raise SourceError(f"bad VCB XML: {exc}") from exc
    for node in root.iter("Exrate"):
        if node.get("CurrencyCode") == currency:
            return BankRate(
                "VCB",
                currency,
                _num(node.get("Buy")),
                _num(node.get("Transfer")),
                _num(node.get("Sell")),
            )
    raise SourceError(f"{currency} not found in VCB XML")


def fetch_vcb_live(currency: str = "SGD") -> BankRate:
    """Current VCB board rate. VCB asks for at most one request per 5 minutes."""
    return parse_vcb_xml(_get(VCB_LIVE_URL), currency)


# --- VPBank ------------------------------------------------------------------


def parse_vpbank(payload: bytes, currency: str) -> BankRate:
    """VPBank returns one snapshot per update during the day; use the latest one."""
    try:
        snapshots = json.loads(payload)
        for snap in sorted(snapshots, key=lambda s: s["effectiveTime"], reverse=True):
            for row in snap["exchangeRates"]:
                if row.get("currency") == currency:
                    return BankRate(
                        "VPBank",
                        currency,
                        _num(str(row["buyCash"]) if row.get("buyCash") is not None else None),
                        _num(str(row["buyTransfer"]) if row.get("buyTransfer") is not None else None),
                        _num(str(row["sellTransfer"]) if row.get("sellTransfer") is not None else None),
                    )
    except (ValueError, KeyError, TypeError) as exc:
        raise SourceError(f"bad VPBank payload: {exc}") from exc
    raise SourceError(f"{currency} not found in VPBank payload")


def fetch_vpbank(currency: str = "SGD") -> BankRate:
    return parse_vpbank(_get(VPBANK_URL), currency)


# --- Wise (public rate endpoints used by wise.com itself; unofficial) --------


def parse_wise_live(payload: bytes) -> float:
    try:
        return float(json.loads(payload)["value"])
    except (ValueError, KeyError, TypeError) as exc:
        raise SourceError(f"bad Wise live payload: {exc}") from exc


def parse_wise_history(payload: bytes) -> list[tuple[float, float]]:
    """Return [(epoch_seconds, rate)] sorted by time."""
    try:
        points = [(float(p["time"]) / 1000.0, float(p["value"])) for p in json.loads(payload)]
    except (ValueError, KeyError, TypeError) as exc:
        raise SourceError(f"bad Wise history payload: {exc}") from exc
    if not points:
        raise SourceError("empty Wise history")
    return sorted(points)


def fetch_wise_live(base: str = "SGD", quote: str = "VND") -> float:
    return parse_wise_live(_get(WISE_LIVE_URL.format(base=base, quote=quote)))


def fetch_wise_history(days: int = 8, base: str = "SGD", quote: str = "VND") -> list[tuple[float, float]]:
    return parse_wise_history(_get(WISE_HISTORY_URL.format(base=base, quote=quote, days=days)))
