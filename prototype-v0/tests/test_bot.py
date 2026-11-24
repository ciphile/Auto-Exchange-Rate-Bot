import json
import os
import tempfile
import time
import unittest
from datetime import date, datetime
from types import SimpleNamespace
from unittest import mock

from bot import ai, blackmarket, cli, config, levels, messages, state as state_store
from bot.commands import Command, parse_amount, parse_command
from bot.market import Market, market_from_history
from bot.sources import (
    BankRate, SourceError, parse_mid_market, parse_vcb_xml, parse_vpbank, parse_wise_history, parse_wise_live,
)

VCB_XML = b"""<!--For reference only. Only one request every 5 minutes!-->
<ExrateList>
  <Exrate CurrencyCode="DKK" CurrencyName="DANISH KRONE" Buy="-" Transfer="3,729.61" Sell="3,872.33" />
  <Exrate CurrencyCode="SGD" CurrencyName="SINGAPORE DOLLAR    " Buy="19,497.26" Transfer="19,694.20" Sell="20,366.19" />
</ExrateList>"""

VPB = json.dumps([
    {"effectiveTime": "2026-11-23T14:55:01", "exchangeRates": [
        {"currency": "SGD", "buyCash": 19644.0, "buyTransfer": 19694.0, "sellCash": 20457.0, "sellTransfer": 20357.0}]},
    {"effectiveTime": "2026-11-23T16:00:03", "exchangeRates": [
        {"currency": "USD", "buyCash": None, "buyTransfer": 25622.0, "sellCash": None, "sellTransfer": 25982.0},
        {"currency": "SGD", "buyCash": 19648.0, "buyTransfer": 19698.0, "sellCash": 20465.0, "sellTransfer": 20365.0}]},
]).encode()

VCB = BankRate("VCB", "SGD", 19497.26, 19694.20, 20366.19)
VPBK = BankRate("VPBank", "SGD", 19648.0, 19698.0, 20365.0)
MKT = Market(19993.0, "wise", -7.4, 20029.0, 19913.0)
VN = lambda h: datetime(2026, 11, 23, h, 0, tzinfo=cli.VN_TZ)  # noqa: E731


class SourceTests(unittest.TestCase):
    def test_vcb_xml(self):
        self.assertEqual(parse_vcb_xml(VCB_XML, "SGD"), VCB)
        self.assertIsNone(parse_vcb_xml(VCB_XML, "DKK").cash_buy)
        with self.assertRaises(SourceError):
            parse_vcb_xml(VCB_XML, "XYZ")
        with self.assertRaises(SourceError):
            parse_vcb_xml(b"<html>", "SGD")

    def test_vpbank_uses_latest_snapshot(self):
        self.assertEqual(parse_vpbank(VPB, "SGD"), VPBK)
        with self.assertRaises(SourceError):
            parse_vpbank(VPB, "XYZ")
        with self.assertRaises(SourceError):
            parse_vpbank(b"nope", "SGD")

    def test_wise(self):
        self.assertEqual(parse_wise_live(b'{"value": 20015.1, "time": 1}'), 20015.1)
        pts = parse_wise_history(b'[{"value": 2.0, "time": 2000}, {"value": 1.0, "time": 1000}]')
        self.assertEqual(pts, [(1.0, 1.0), (2.0, 2.0)])
        for bad in (b"x", b"[]", b'{"nope": 1}'):
            with self.assertRaises(SourceError):
                parse_wise_live(bad) if bad != b"[]" else parse_wise_history(bad)

    def test_mid_market_fallback(self):
        self.assertEqual(parse_mid_market(json.dumps({"result": "success", "rates": {"VND": 19993.5}}).encode(), "SGD", "VND"), 19993.5)
        with self.assertRaises(SourceError):
            parse_mid_market(json.dumps({"result": "error"}).encode(), "SGD", "VND")


class MarketTests(unittest.TestCase):
    def test_history_stats(self):
        hour = 3600.0
        pts = [(i * hour, 20000.0 + i) for i in range(0, 200)]  # rising 1 VND/hour
        m = market_from_history(pts)
        self.assertEqual(m.mid, 20199.0)
        self.assertAlmostEqual(m.change_24h, 24.0)
        self.assertEqual(m.high_7d, 20199.0)
        self.assertEqual(m.low_7d, 20031.0)  # 7 days = 168h back from the last point

    def test_no_24h_point(self):
        m = market_from_history([(0.0, 1.0), (10 * 3600.0, 2.0)])
        self.assertIsNone(m.change_24h)


class LevelTests(unittest.TestCase):
    L = (19900, 19950, 20000, 20100, 20200, 20300)

    def test_bands_and_crossings(self):
        self.assertEqual(levels.band_of(20050, self.L), 3)
        self.assertEqual(levels.crossings(4, 2, self.L), [(20100, "down"), (20000, "down")])
        self.assertEqual(levels.crossings(2, 4, self.L), [(20000, "up"), (20100, "up")])
        self.assertEqual(levels.crossings(3, 3, self.L), [])

    def test_hysteresis_prevents_flapping(self):
        band = levels.band_of(20005, self.L)  # just above 20,000
        for rate in (19998, 20003, 19995, 20008):  # hovering within +-10 of the level
            band = levels.update_band(band, rate, self.L, 10)
        self.assertEqual(band, 3)
        self.assertEqual(levels.update_band(band, 19989, self.L, 10), 2)  # really below
        self.assertEqual(levels.update_band(2, 20005, self.L, 10), 2)  # not yet +10 above
        self.assertEqual(levels.update_band(2, 20011, self.L, 10), 3)

    def test_first_run_has_no_prev(self):
        self.assertEqual(levels.update_band(None, 20150, self.L, 10), 4)


class BlackMarketTests(unittest.TestCase):
    def test_default_premium(self):
        est, prem, n = blackmarket.estimate(20000.0, {})
        self.assertEqual((est, n), (20080.0, 0))
        self.assertAlmostEqual(prem, config.DEFAULT_PREMIUM)

    def test_learns_from_reports(self):
        st = {}
        for _ in range(3):
            blackmarket.record_report(st, 20100.0, 20000.0)  # +0.5%
        est, prem, n = blackmarket.estimate(20000.0, st)
        self.assertEqual(n, 3)
        self.assertAlmostEqual(prem, 0.005)
        self.assertEqual(est, 20100.0)

    def test_blend_with_few_reports_and_bounds(self):
        st = {}
        blackmarket.record_report(st, 20100.0, 20000.0)
        _, prem, _ = blackmarket.estimate(20000.0, st)
        self.assertTrue(config.DEFAULT_PREMIUM < prem < 0.005)
        st = {}
        for _ in range(3):
            blackmarket.record_report(st, 30000.0, 20000.0)  # absurd +50%
        _, prem, _ = blackmarket.estimate(20000.0, st)
        self.assertEqual(prem, config.PREMIUM_BOUNDS[1])

    def test_old_reports_ignored(self):
        st = {"reports": [{"ts": 0, "rate": 21000.0, "mid": 20000.0}]}
        self.assertEqual(blackmarket.estimate(20000.0, st)[2], 0)


class CommandTests(unittest.TestCase):
    def test_amounts(self):
        for text, expected in [("10000", 10000), ("10,000", 10000), ("10.000", 10000), ("10.5", 10.5),
                               ("10k", 10000), ("1.5m", 1_500_000), ("200tr", 200_000_000), ("1.234.567", 1234567)]:
            self.assertEqual(parse_amount(text), expected, text)
        for bad in ("", "abc", "-5", "0"):
            self.assertIsNone(parse_amount(bad), bad)

    def test_commands(self):
        self.assertEqual(parse_command("/rate@MyBot"), Command("rate"))
        self.assertEqual(parse_command("/vcb"), Command("bank"))
        self.assertEqual(parse_command("/convert 10000"), Command("convert", 10000, "SGD"))
        self.assertEqual(parse_command("/convert 200tr vnd"), Command("convert", 200_000_000, "VND"))
        self.assertEqual(parse_command("/doi 20100"), Command("report", 20100))
        self.assertEqual(parse_command("/doi 20.100"), Command("report", 20100))
        self.assertEqual(parse_command("/doi 5"), Command("help"))  # outside sane range
        self.assertEqual(parse_command("/convert"), Command("help"))

    def test_ignored(self):
        for text in (None, "", "hello", "Giá vcb", "/unknown"):
            self.assertIsNone(parse_command(text), text)


class ValidatorTests(unittest.TestCase):
    L = config.LEVELS

    def test_accepts(self):
        for ok in ("Pùn :))", "Nhích dc 1 xíu", "Tụt dưới 20k r haha", "Tầm 20-20100 thoy", "Thủng 20.000 r", "Tụt dưới mốc 20,000"):
            self.assertTrue(ai.is_valid(ok, self.L), ok)

    def test_rejects(self):
        for bad in ("", "x" * 300, "dòng 1\ndòng 2\ndòng 3", "Tụt còn 19,993 r", "giảm 0.5% haha",
                    "xem https://x.com", "Tụt dưới 20.001", "ngày 23 nè", "giảm 0.5 thoy"):
            self.assertFalse(ai.is_valid(bad, self.L), bad)


class FakeClaude:
    def __init__(self, text=None, stop="end_turn", exc=None):
        self.calls = []
        self._resp = SimpleNamespace(stop_reason=stop, content=[SimpleNamespace(type="text", text=text or "")])
        self._exc = exc
        self.messages = self

    def create(self, **kw):
        self.calls.append(kw)
        if self._exc:
            raise self._exc
        return self._resp


class AiTests(unittest.TestCase):
    FACTS = {"levels": list(config.LEVELS)}

    def test_generates_and_sends_style_and_facts(self):
        fake = FakeClaude('"Pùn :))"')
        out = ai.generate_comment("alert", self.FACTS, ["tin cũ"], client=fake)
        self.assertEqual(out, "Pùn :))")
        kw = fake.calls[0]
        self.assertEqual(kw["model"], config.MODEL)
        self.assertIn("Mít", kw["system"])
        prompt = kw["messages"][0]["content"]
        self.assertIn("Pùn :))", prompt)  # a style example
        self.assertIn("tin cũ", prompt)  # anti-repeat memory
        self.assertNotIn("Xchange", prompt)  # no names / business names from the chat
        self.assertNotIn("+84", prompt)

    def test_rejections_return_none(self):
        self.assertIsNone(ai.generate_comment("daily", self.FACTS, [], client=FakeClaude("Tụt còn 19,993")))
        self.assertIsNone(ai.generate_comment("daily", self.FACTS, [], client=FakeClaude("x", stop="refusal")))
        self.assertIsNone(ai.generate_comment("daily", self.FACTS, [], client=FakeClaude(exc=RuntimeError("boom"))))

    def test_no_key_no_call(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("ANTHROPIC_API_KEY", None)
            self.assertIsNone(ai.generate_comment("daily", self.FACTS, []))


class MessageTests(unittest.TestCase):
    def test_summary_shows_all_sources_with_buy_sell(self):
        black = blackmarket.estimate(MKT.mid, {})
        text = messages.build_summary(date(2026, 11, 23), MKT, VCB, VPBK, black, "Pùn :))")
        self.assertTrue(text.startswith("Giá SGD hôm nay 23.11.2026: Pùn :))"))
        for needle in ("mid-market, chưa trừ phí", "19,993.00", "VCB – NH mua: CK 19,694", "NH bán: 20,366",
                       "VPBank – NH mua: CK 19,698 · TM 19,648", "NH bán: 20,365", "Chợ đen", "NH mua = ngân hàng mua SGD"):
            self.assertIn(needle, text)

    def test_summary_degrades(self):
        text = messages.build_summary(date(2026, 11, 23), None, None, VPBK, None)
        self.assertIn("Wise: không lấy được", text)
        self.assertIn("VCB: không lấy được", text)
        self.assertIn("VPBank – NH mua", text)

    def test_convert(self):
        text = messages.build_convert(10000, "SGD", Market(20000.0, "wise"), (20080.0, 0.004, 0), VCB, VPBK)
        self.assertIn("10,000 SGD → VND", text)
        self.assertIn("200,000,000 đ", text)
        self.assertIn("VPBank mua CK: 196,980,000 đ", text)
        text = messages.build_convert(200_000_000, "VND", Market(20000.0, "wise"), None, VCB, VPBK)
        self.assertIn("10,000.00 SGD", text)

    def test_fallback_avoids_recent(self):
        pool = messages._ALERT["down"]
        for _ in range(20):
            self.assertNotIn(messages.fallback_comment("alert", "down", pool[:2]), pool[:2])


class AlertTests(unittest.TestCase):
    def setUp(self):
        self.fake_ai = mock.patch.object(ai, "generate_comment", return_value="Pùn :))")
        self.fake_ai.start()
        self.addCleanup(self.fake_ai.stop)

    def run_check(self, state, mid, hour=10):
        return cli.check_alert(state, Market(mid, "wise", -10.0), VN(hour))

    def test_first_run_is_silent(self):
        st = {}
        self.assertIsNone(self.run_check(st, 20050))
        self.assertEqual(st["band"], 3)

    def test_key_crossing_alerts_once(self):
        st = {"band": 3}
        text = self.run_check(st, 19985)
        self.assertIn("vừa tụt xuống dưới mốc 20,000", text)
        self.assertIn("Pùn :))", text)
        self.assertEqual(st["band"], 2)
        self.assertIsNone(self.run_check(st, 19984))  # same band: no repeat
        self.assertEqual(st["alerts"]["n"], 1)

    def test_no_flapping_near_level(self):
        st = {"band": 3}
        self.run_check(st, 19985)
        for mid in (19995, 20004, 19998):
            self.assertIsNone(self.run_check(st, mid))

    def test_quiet_hours_defer_then_fire(self):
        st = {"band": 3}
        self.assertIsNone(self.run_check(st, 19985, hour=23))
        self.assertEqual(st["band"], 3)  # kept so it can fire later
        self.assertIn("20,000", self.run_check(st, 19985, hour=8))

    def test_daily_cap_and_cooldown(self):
        st = {"band": 5, "alerts": {"date": "2026-11-23", "n": config.MAX_ALERTS_PER_DAY}}
        self.assertIsNone(self.run_check(st, 20250))
        st = {"band": 5, "last_alert_ts": time.time()}
        self.assertIsNone(self.run_check(st, 20150))  # non-key level inside cooldown
        st = {"band": 4, "last_alert_ts": time.time()}
        self.assertIsNotNone(self.run_check(st, 20090))  # key level 20,100 ignores cooldown


class FakeTelegram:
    def __init__(self, updates):
        self.updates, self.sent, self.confirmed = updates, [], None

    def get_updates(self, offset=None, limit=100):
        if offset is not None:
            self.confirmed = offset
            return []
        return self.updates

    def send_message(self, chat_id, text, reply_to=None):
        self.sent.append((chat_id, text, reply_to))


class PollTests(unittest.TestCase):
    def run_poll(self, updates):
        fake = FakeTelegram(updates)
        tmp = tempfile.mkdtemp()
        env = {"TELEGRAM_BOT_TOKEN": "t", "TELEGRAM_CHAT_ID": "-100", "BOT_STATE_FILE": os.path.join(tmp, "s.json")}
        with mock.patch.dict(os.environ, env), \
             mock.patch.object(cli, "Telegram", return_value=fake), \
             mock.patch.object(cli, "get_market", return_value=Market(20000.0, "wise")), \
             mock.patch.object(cli, "fetch_banks", return_value=(VCB, VPBK)):
            cli.cmd_poll(mock.Mock())
            self.saved = state_store.load()
        return fake

    def upd(self, uid, text, chat=-100, age=10):
        return {"update_id": uid, "message": {"message_id": uid, "text": text, "chat": {"id": chat}, "date": time.time() - age}}

    def test_answers_confirms_and_saves_reports(self):
        fake = self.run_poll([self.upd(5, "/convert 10000"), self.upd(6, "just chatting"), self.upd(7, "/doi 20100")])
        self.assertEqual(len(fake.sent), 2)
        self.assertEqual(fake.sent[0][2], 5)
        self.assertIn("200,000,000", fake.sent[0][1])
        self.assertIn("Ghi nhận đổi dc 20,100", fake.sent[1][1])
        self.assertEqual(fake.confirmed, 8)
        self.assertEqual(self.saved["reports"][0]["rate"], 20100.0)

    def test_ignores_other_chats_and_stale(self):
        fake = self.run_poll([self.upd(1, "/rate", chat=-999), self.upd(2, "/rate", age=3600)])
        self.assertEqual(fake.sent, [])
        self.assertEqual(fake.confirmed, 3)

    def test_no_updates(self):
        self.assertEqual(self.run_poll([]).sent, [])


class DailyTests(unittest.TestCase):
    def test_build_daily_uses_ai_comment_and_remembers_it(self):
        st = {}
        with mock.patch.object(cli, "get_market", return_value=MKT), \
             mock.patch.object(cli, "fetch_banks", return_value=(VCB, VPBK)), \
             mock.patch.object(ai, "generate_comment", return_value="Nhích dc 1 xíu"):
            text = cli.build_daily(st)
        self.assertIn(": Nhích dc 1 xíu\n", text)
        self.assertEqual(st["recent_texts"], ["Nhích dc 1 xíu"])

    def test_build_daily_none_when_all_sources_down(self):
        with mock.patch.object(cli, "get_market", return_value=None), \
             mock.patch.object(cli, "fetch_banks", return_value=(None, None)):
            self.assertIsNone(cli.build_daily({}))


class StateTests(unittest.TestCase):
    def test_roundtrip_and_corrupt(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = os.path.join(tmp, "s.json")
            with mock.patch.dict(os.environ, {"BOT_STATE_FILE": p}):
                self.assertEqual(state_store.load(), {})
                state_store.save({"band": 2, "t": "Pùn"})
                self.assertEqual(state_store.load(), {"band": 2, "t": "Pùn"})
                with open(p, "w") as f:
                    f.write("{broken")
                self.assertEqual(state_store.load(), {})

    def test_recent_texts_capped(self):
        st = {}
        for i in range(10):
            state_store.remember_text(st, str(i))
        self.assertEqual(st["recent_texts"], [str(i) for i in range(4, 10)])


if __name__ == "__main__":
    unittest.main()
