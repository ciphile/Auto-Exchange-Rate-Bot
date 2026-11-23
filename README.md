# Auto-Exchange-Rate-Bot

Telegram bot that posts the **SGD → VND** rate every morning and answers rate
questions in the group, so nobody has to paste Wise / VCB screenshots by hand.

Sources (no API keys needed):

| Source | What | Notes |
| --- | --- | --- |
| [open.er-api.com](https://www.exchangerate-api.com/docs/free) | mid-market rate (≈ Wise before fees) | updated once a day |
| Vietcombank XML | live VCB cash-buy / transfer-buy / sell | VCB asks for ≤ 1 request per 5 min |
| Vietcombank JSON | VCB's end-of-day rate for a past date | used for the "▲/▼ vs yesterday" arrows |

DBS, PayNow and black-market rates have no public API, so they are not included.
To add a source, write a fetcher in `bot/sources.py` and show it in `bot/messages.py`.

## Chat commands

- `/rate` – today's summary
- `/vcb` – VCB board for SGD
- `/convert 10000` – SGD → VND (mid-market and VCB)
- `/convert 200000000 vnd` – VND → SGD; amounts accept `10,000`, `10.000`, `10k`, `200tr`

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather), add it to the group, and
   turn **Group Privacy** off (BotFather → Bot Settings) so it can see `/commands`.
2. Find the group's chat id (a negative number): send a message in the group, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `message.chat.id`.
3. In the GitHub repo: **Settings → Secrets and variables → Actions**, add
   `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
4. Run **Actions → Daily rate post → Run workflow** once to check it posts.

The bot only answers in the configured chat and ignores commands older than 30 minutes.

## Schedules and limits

- **Daily post**: 02:00 UTC (09:00 Vietnam). Edit the cron in `.github/workflows/daily.yml`.
- **Commands**: polled every 5 minutes (GitHub's minimum), so replies can take a few
  minutes and cron runs are best-effort. For instant replies, run `python -m bot poll`
  in a loop on any always-on machine, or move to a webhook host.
- Polling costs ~8,600 runner-minutes/month. That is free on a public repo but exceeds
  the 2,000 free minutes of a private one; use a public repo, or drop the poll workflow
  and keep only the daily post.
- `getUpdates` doesn't work while a webhook is set on the bot.

## Local use

Python 3.10+, no dependencies.

```sh
python -m bot preview          # print the daily message, nothing is sent
python -m unittest discover -s tests -t .
TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... python -m bot daily
```
