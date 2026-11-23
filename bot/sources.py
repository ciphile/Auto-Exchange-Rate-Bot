"""Rate sources. Each fetcher returns plain dataclasses and raises SourceError on failure."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date

USER_AGENT = "Mozilla/5.0 (compatible; auto-exchange-rate-bot)"
TIMEOUT = 20

MID_MARKET_URL = "https://open.er-api.com/v6/latest/{base}"
VCB_LIVE_URL = "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx?b=10"
VCB_DAY_URL = "https://www.vietcombank.com.vn/api/exchangerates?date={day}"


class SourceError(Exception):
    pass


@dataclass(frozen=True)
class VcbRate:
    """VCB quotes in VND per 1 unit of foreign currency. None = not quoted."""

    currency: str
    cash_buy: float | None  # VCB buys your foreign cash (what you get for cash)
    transfer_buy: float | None  # VCB buys via bank transfer
    sell: float | None  # VCB sells foreign currency to you


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


def parse_vcb_xml(payload: bytes, currency: str) -> VcbRate:
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as exc:
        raise SourceError(f"bad VCB XML: {exc}") from exc
    for node in root.iter("Exrate"):
        if node.get("CurrencyCode") == currency:
            return VcbRate(
                currency,
                _num(node.get("Buy")),
                _num(node.get("Transfer")),
                _num(node.get("Sell")),
            )
    raise SourceError(f"{currency} not found in VCB XML")


def parse_vcb_json(payload: bytes, currency: str) -> VcbRate:
    try:
        data = json.loads(payload)
        for row in data["Data"]:
            if row.get("currencyCode") == currency:
                return VcbRate(
                    currency,
                    _num(row.get("cash")),
                    _num(row.get("transfer")),
                    _num(row.get("sell")),
                )
    except (ValueError, KeyError, TypeError) as exc:
        raise SourceError(f"bad VCB JSON: {exc}") from exc
    raise SourceError(f"{currency} not found in VCB JSON")


def fetch_vcb_live(currency: str = "SGD") -> VcbRate:
    """Current VCB board rate. VCB asks for at most one request per 5 minutes."""
    return parse_vcb_xml(_get(VCB_LIVE_URL), currency)


def fetch_vcb_day(day: date, currency: str = "SGD") -> VcbRate:
    """VCB's published rate for a past day (used for the 'vs yesterday' delta)."""
    return parse_vcb_json(_get(VCB_DAY_URL.format(day=day.isoformat())), currency)
