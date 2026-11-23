"""Ask Claude for a short comment in Abe's voice. The numbers in the message are
always produced by code; the model only writes the one-line comment, and the
comment is rejected (-> template fallback) if it mentions numbers we did not give it."""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from . import config

EXAMPLES_FILE = Path(__file__).with_name("style_examples.txt")
MAX_LEN = 220

SYSTEM = """Bạn là bot trong group Telegram của 5 đồng nghiệp người Việt làm remote cho một công ty Singapore. \
Lương trả bằng SGD qua Wise; mọi người đổi SGD sang VND (chợ đen hoặc ngân hàng) nên hay than phiền khi tỉ giá lên xuống. \
Nhiệm vụ của bạn: viết bình luận ngắn về tỉ giá SGD→VND bằng giọng của Abe, một đồng nghiệp trong nhóm.

Giọng Abe: thân mật, ngắn gọn như nhắn tin; viết tắt (ko, dc, bít, thoy, r, h, e, a); thỉnh thoảng "haha", ":))", "Ahihi". \
Không trang trọng, không hashtag, tối đa 1 emoji.

Quy tắc cứng:
- Chỉ dựa vào dữ kiện được cung cấp. Con số duy nhất được phép viết là các mốc trong danh sách "levels" \
(dạng 20000, 20.000 hoặc 20k). Không viết số nào khác (ngày, phần trăm, số lẻ...); hãy dùng lời như "nhích 1 xíu", "tụt nhẹ".
- Không bịa trải nghiệm cá nhân (không nói mình vừa đổi tiền, đang cầm tiền, đã nhắn tiệm đổi...).
- Không khẳng định chắc chắn tỉ giá sẽ đi đâu; than nhẹ hoặc đùa thì được.
- Không lặp lại cách mở đầu hay ý của các tin gần đây.
- Chỉ trả về đúng nội dung tin nhắn: không giải thích, không dấu ngoặc kép, không xuống dòng quá 2 dòng."""

KIND_INSTRUCTIONS = {
    "daily": (
        "Viết phần đứng sau dấu hai chấm của dòng tin sáng 'Giá SGD hôm nay <ngày>: ...'. "
        "Là một cụm ngắn kiểu tít báo (tối đa khoảng 12 từ) tóm tắt diễn biến, như "
        "'Tăng cao đẩy euro và bảng Anh lao dốc'. Chỉ trả về cụm đó, không lặp lại phần 'Giá SGD hôm nay'."
    ),
    "alert": (
        "Tỉ giá vừa cắt một mốc quan trọng. Viết 1-2 câu phản ứng ngắn của Abe (như 'Pùn :))' hoặc 'Nhích dc 1 xíu'), "
        "nhắc đến mốc đó nếu hợp lý."
    ),
}


def load_examples() -> list[str]:
    return [ln.strip() for ln in EXAMPLES_FILE.read_text(encoding="utf-8").splitlines() if ln.strip()]


def build_user_prompt(kind: str, facts: dict, recent: list[str]) -> str:
    parts = [
        "Các câu mẫu thật của Abe (chỉ để học giọng, đừng chép lại):",
        *[f"- {ex}" for ex in load_examples()],
        "",
        "Dữ kiện (JSON):",
        json.dumps(facts, ensure_ascii=False, indent=2),
        "",
    ]
    if recent:
        parts += ["Các tin gần đây của bạn (đừng lặp lại):", *[f"- {t}" for t in recent], ""]
    parts.append(KIND_INSTRUCTIONS[kind])
    return "\n".join(parts)


_NUM_RE = re.compile(r"\d[\d.,]*\s?k?", re.IGNORECASE)


def is_valid(text: str, levels: tuple[int, ...]) -> bool:
    """Reject empty/long/odd output and any number that isn't a known level."""
    if not text or len(text) > MAX_LEN or text.count("\n") > 1:
        return False
    if re.search(r"https?://|@\w", text):
        return False
    allowed = set(levels)
    for tok in _NUM_RE.findall(text):
        tok = tok.strip().lower()
        if len(tok) == 1:  # a lone digit is a quantity word ("1 xíu"), not a rate
            continue
        mult = 1000 if tok.endswith("k") else 1
        digits = re.sub(r"[^\d]", "", tok)
        if not digits:
            continue
        value = int(digits) * mult
        if value not in allowed and value * 1000 not in allowed:  # bare "20" means 20k
            return False
    return True


def generate_comment(kind: str, facts: dict, recent: list[str], client=None) -> str | None:
    """Return a validated comment, or None (no key, API error, refusal, or bad output)."""
    if client is None:
        if not os.environ.get("ANTHROPIC_API_KEY"):
            return None
        import anthropic  # imported lazily so the bot also runs without the package

        client = anthropic.Anthropic(timeout=30.0, max_retries=2)
    try:
        response = client.messages.create(
            model=config.MODEL,
            max_tokens=1024,
            system=SYSTEM,
            output_config={"effort": "low"},
            messages=[{"role": "user", "content": build_user_prompt(kind, facts, recent)}],
        )
    except Exception as exc:  # network/API problems must never block the rate message
        print(f"warning: claude call failed: {type(exc).__name__}", file=sys.stderr)
        return None
    if response.stop_reason == "refusal":
        print("warning: claude declined; using template", file=sys.stderr)
        return None
    text = "".join(b.text for b in response.content if b.type == "text").strip().strip('"“”')
    if not is_valid(text, config.LEVELS):
        print("warning: claude output rejected by validator; using template", file=sys.stderr)
        return None
    return text
