import json
import os
import time
import unittest
from datetime import date
from unittest import mock

from bot import cli, messages
from bot.commands import Command, parse_amount, parse_command
from bot.sources import SourceError, VcbRate, parse_mid_market, parse_vcb_json, parse_vcb_xml

VCB_XML = b"""<!--For reference only. Only one request every 5 minutes!-->
<ExrateList>
  <DateTime>11/23/2026 2:34:11 PM</DateTime>
  <Exrate CurrencyCode="DKK" CurrencyName="DANISH KRONE" Buy="-" Transfer="3,729.61" Sell="3,872.33" />
  <Exrate CurrencyCode="SGD" CurrencyName="SINGAPORE DOLLAR    " Buy="19,497.26" Transfer="19,694.20" Sell="20,366.19" />
</ExrateList>"""

VCB_JSON = json.dumps(
    {"Data": [{"currencyCode": "SGD", "cash": "19454.97", "transfer": "19651.49", "sell": "20322.05"}]}
).encode()

SGD = VcbRate("SGD", 19497.26, 19694.20, 20366.19)


class SourceTests(unittest.TestCase):
    def test_vcb_xml(self):
        self.assertEqual(parse_vcb_xml(VCB_XML, "SGD"), SGD)

    def test_vcb_xml_dash_is_none(self):
        self.assertIsNone(parse_vcb_xml(VCB_XML, "DKK").cash_buy)

    def test_vcb_xml_missing_currency(self):
        with self.assertRaises(SourceError):
            parse_vcb_xml(VCB_XML, "XYZ")

    def test_vcb_xml_garbage(self):
        with self.assertRaises(SourceError):
            parse_vcb_xml(b"<html>", "SGD")

    def test_vcb_json(self):
        self.assertEqual(parse_vcb_json(VCB_JSON, "SGD"), VcbRate("SGD", 19454.97, 19651.49, 20322.05))

    def test_vcb_json_garbage(self):
        with self.assertRaises(SourceError):
            parse_vcb_json(b"nope", "SGD")

    def test_mid_market(self):
        payload = json.dumps({"result": "success", "rates": {"VND": 19993.5}}).encode()
        self.assertEqual(parse_mid_market(payload, "SGD", "VND"), 19993.5)

    def test_mid_market_error(self):
        with self.assertRaises(SourceError):
            parse_mid_market(json.dumps({"result": "error", "error-type": "x"}).encode(), "SGD", "VND")


class CommandTests(unittest.TestCase):
    def test_amounts(self):
        for text, expected in [
            ("10000", 10000), ("10,000", 10000), ("10.000", 10000), ("10.5", 10.5),
            ("10k", 10000), ("1.5m", 1_500_000), ("200tr", 200_000_000), ("1.234.567", 1234567),
        ]:
            self.assertEqual(parse_amount(text), expected, text)
        for bad in ("", "abc", "-5", "0"):
            self.assertIsNone(parse_amount(bad), bad)

    def test_commands(self):
        self.assertEqual(parse_command("/rate"), Command("rate"))
        self.assertEqual(parse_command("/rate@MyBot"), Command("rate"))
        self.assertEqual(parse_command("/vcb"), Command("vcb"))
        self.assertEqual(parse_command("/convert 10000"), Command("convert", 10000, "SGD"))
        self.assertEqual(parse_command("/convert 200000000 vnd"), Command("convert", 200_000_000, "VND"))
        self.assertEqual(parse_command("/convert 10 000 sgd"), Command("convert", 10000, "SGD"))
        self.assertEqual(parse_command("/convert"), Command("help"))
        self.assertEqual(parse_command("/convert abc"), Command("help"))

    def test_ignored(self):
        for text in (None, "", "hello", "Giá vcb", "/unknown"):
            self.assertIsNone(parse_command(text), text)


class MessageTests(unittest.TestCase):
    def test_daily_with_delta(self):
        prev = VcbRate("SGD", 19454.97, 19651.49, 20322.05)
        text = messages.build_rate_message(date(2026, 11, 23), 19993.5, SGD, prev)
        self.assertIn("23.11.2026", text)
        self.assertIn("19,993.50", text)
        self.assertIn("19,694.20 (▲ +42.71)", text)
        self.assertIn("thấp hơn mid-market 299.30", text)

    def test_daily_degrades_without_sources(self):
        text = messages.build_rate_message(date(2026, 11, 23), None, SGD)
        self.assertIn("Mid-market: không lấy được", text)
        text = messages.build_rate_message(date(2026, 11, 23), 19993.5, None)
        self.assertIn("VCB: không lấy được", text)

    def test_convert_sgd(self):
        text = messages.build_convert_message(10000, "SGD", 20000.0, SGD)
        self.assertIn("10,000 SGD → VND", text)
        self.assertIn("200,000,000 đ", text)
        self.assertIn("196,942,000 đ", text)

    def test_convert_vnd(self):
        text = messages.build_convert_message(200_000_000, "VND", 20000.0, SGD)
        self.assertIn("10,000.00 SGD", text)

    def test_convert_no_rates(self):
        self.assertIn("Không lấy được", messages.build_convert_message(5, "SGD", None, None))


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
        env = {"TELEGRAM_BOT_TOKEN": "t", "TELEGRAM_CHAT_ID": "-100"}
        with mock.patch.dict(os.environ, env), \
             mock.patch.object(cli, "Telegram", return_value=fake), \
             mock.patch.object(cli, "fetch_mid_market", return_value=20000.0), \
             mock.patch.object(cli, "fetch_vcb_live", return_value=SGD):
            cli.cmd_poll(mock.Mock())
        return fake

    def upd(self, uid, text, chat=-100, age=10):
        return {"update_id": uid, "message": {"message_id": uid, "text": text,
                                             "chat": {"id": chat}, "date": time.time() - age}}

    def test_answers_and_confirms(self):
        fake = self.run_poll([self.upd(5, "/convert 10000"), self.upd(6, "just chatting")])
        self.assertEqual(len(fake.sent), 1)
        self.assertEqual(fake.sent[0][2], 5)  # replies to the command
        self.assertIn("200,000,000", fake.sent[0][1])
        self.assertEqual(fake.confirmed, 7)

    def test_ignores_other_chats_and_stale(self):
        fake = self.run_poll([self.upd(1, "/rate", chat=-999), self.upd(2, "/rate", age=3600)])
        self.assertEqual(fake.sent, [])
        self.assertEqual(fake.confirmed, 3)

    def test_no_updates(self):
        self.assertEqual(self.run_poll([]).sent, [])


if __name__ == "__main__":
    unittest.main()
