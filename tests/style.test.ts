// BR-31 → BR-34: tính cách (bật / tắt) × tâm trạng → chỉ thị nói gửi AI; code kiểm lời AI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOOD_CODES, type MoodCode } from '../src/config/persona.ts';
import { decideChimeIn } from '../src/services/chattiness.service.ts';
import {
  checkStyledOutput, computeStyleDirective, getChimeFactor, isSensitiveTopic, normalizeSouthern, parseMood,
  renderStyleSystemBlock, renderStyleTurnBlock, resolveAddress, type StyleSettings,
} from '../src/services/style.service.ts';
import { seededRandom, vn } from './helpers.ts';

const XOLA: StyleSettings = { bot: 'ray', personaOn: true, mood: 'binhthuong' };
const NGOAN: StyleSettings = { bot: 'ray', personaOn: false, mood: 'binhthuong' };

function stanceRate(settings: StyleSettings, stance: string, purpose: 'answer_chat' | 'answer_data' = 'answer_chat', n = 20_000): number {
  const rnd = seededRandom(7);
  let hit = 0;
  for (let i = 0; i < n; i++) if (computeStyleDirective(settings, { purpose }, rnd).stance === stance) hit++;
  return hit / n;
}

test('BR-32 /tamtrang: nhận mã không dấu, chữ có dấu, tên gọi khác; lạ → null', () => {
  assert.equal(parseMood('sieubua'), 'sieubua');
  assert.equal(parseMood('Siêu bựa'), 'sieubua');
  assert.equal(parseMood('khìn khìn'), 'khinkhin');
  assert.equal(parseMood('không ổn định'), 'baton');
  assert.equal(parseMood('xỏ lá chọt khe'), 'baton');
  assert.equal(parseMood('căng thẳng'), 'stress');
  assert.equal(parseMood('cộc cằn'), 'coccan');
  assert.equal(parseMood('buồn ngủ'), null);
  assert.equal(MOOD_CODES.length, 14);
});

test('BR-31 tính cách quyết định NÓI GÌ: xỏ lá hay phản biện (~55%), ngoan hầu như không (~8%), ngoan không bao giờ chọt', () => {
  const xola = stanceRate(XOLA, 'phan_bien');
  const ngoan = stanceRate(NGOAN, 'phan_bien');
  assert.ok(xola > 0.5 && xola < 0.6, `xỏ lá ${xola}`);
  assert.ok(ngoan > 0.06 && ngoan < 0.1, `ngoan ${ngoan}`);
  assert.equal(stanceRate(NGOAN, 'choc'), 0);
  assert.equal(stanceRate(NGOAN, 'tra_loi_kem_choc', 'answer_data'), 0);
  assert.ok(stanceRate(XOLA, 'tra_loi_kem_choc', 'answer_data') > 0.3);
});

test('BR-32 tâm trạng nắn việc nói gì: tức giận phản biện nhiều hơn trầm tĩnh; xác suất có trần', () => {
  const angry = stanceRate({ bot: 'ray', personaOn: true, mood: 'tucgian' }, 'phan_bien');
  const calm = stanceRate({ bot: 'ray', personaOn: true, mood: 'tramtinh' }, 'phan_bien');
  assert.ok(angry > 0.8 && angry <= 0.9 + 0.01, `tức giận ${angry}`);
  assert.ok(calm < 0.4, `trầm tĩnh ${calm}`);
});

test('BR-32 tâm trạng quyết định NÓI THẾ NÀO: cộc cằn ngắn, siêu bựa dài + nhiều emoji, nghiêm túc 0 emoji', () => {
  const r = seededRandom(1);
  const coc = computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'coccan' }, { purpose: 'answer_chat' }, r);
  const bua = computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'sieubua' }, { purpose: 'answer_chat' }, r);
  const nghiem = computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'nghiemtuc' }, { purpose: 'answer_chat' }, r);
  assert.ok(coc.words[1] <= 15 && coc.maxSentences === 1);
  assert.ok(bua.words[1] > 50 && bua.emojiMax === 3);
  assert.equal(nghiem.emojiMax, 0);
});

test('BR-31 tắt tính cách: emoji ≤ 1, xưng hô luôn lễ phép (em – anh chị) dù /xungho đặt "tao – mày"', () => {
  const d = computeStyleDirective({ bot: 'ray', personaOn: false, mood: 'sieubua' }, { purpose: 'answer_chat' }, seededRandom(2));
  assert.ok(d.emojiMax <= 1);
  const rude = { self: 'tao', others: 'mày' };
  assert.deepEqual(resolveAddress(NGOAN, rude), { self: 'em', others: 'anh chị' });
  assert.deepEqual(resolveAddress(XOLA, rude), rude);
  assert.deepEqual(resolveAddress(XOLA, null), { self: 'tui', others: 'mấy ông mấy bà' });
});

test('BR-32 "không ổn định": mỗi lần nói bốc 1 tâm trạng khác nhau; ghi rõ trong khối CÁCH NÓI LẦN NÀY', () => {
  const r = seededRandom(3);
  const moods = new Set(Array.from({ length: 200 }, () => computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'baton' }, { purpose: 'chime_in' }, r).effectiveMood));
  assert.ok(moods.size >= 4);
  assert.ok(!moods.has('baton' as never));
  const d = computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'baton' }, { purpose: 'chime_in' }, r);
  assert.match(renderStyleTurnBlock(d), /Lần này tâm trạng bốc ra là/);
});

test('BR-25 chuyện chính trị trong nước → code ép trung lập, kể cả khi xỏ lá + tức giận', () => {
  assert.ok(isSensitiveTopic('mấy ông bàn chuyện chính trị hoài'));
  assert.ok(!isSensitiveTopic('Trump khịa phe Dân chủ'));
  for (let i = 0; i < 50; i++) {
    const d = computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'tucgian' }, { purpose: 'answer_chat', userText: 'nhà nước mới ra luật' }, seededRandom(i));
    assert.equal(d.stance, 'trung_lap');
  }
});

test('BR-34 báo giá / cảnh báo / tóm tắt: lập trường cố định; tóm tắt có độ dài riêng', () => {
  const r = seededRandom(4);
  assert.equal(computeStyleDirective(XOLA, { purpose: 'rate_alert' }, r).stance, 'binh_luan_gia');
  const sum = computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'coccan' }, { purpose: 'daily_summary' }, r);
  assert.equal(sum.stance, 'tom_tat');
  assert.ok(sum.words[1] >= 200);
});

test('BR-34 khối SYSTEM có tính cách + tâm trạng + xưng hô + giọng miền Nam; khối lần này có số cụ thể + mã', () => {
  const sys = renderStyleSystemBlock({ bot: 'ray', personaOn: true, mood: 'khinkhin' }, { self: 'tui', others: 'mấy ông' });
  for (const must of ['xỏ lá', 'khìn khìn', '"tui"', 'GIỌNG MIỀN NAM', 'TRÁNH từ miền Bắc']) assert.ok(sys.includes(must), must);
  const sysPolite = renderStyleSystemBlock(NGOAN, resolveAddress(NGOAN, null));
  assert.ok(sysPolite.includes('nữ sinh lớp 10') && sysPolite.includes('GIỌNG MIỀN NAM'));
  const d = computeStyleDirective(XOLA, { purpose: 'answer_chat' }, seededRandom(5));
  const turn = renderStyleTurnBlock(d);
  assert.ok(turn.includes(d.signature) && /\d+–\d+ chữ/.test(turn) && /Emoji: tối đa \d/.test(turn));
});

test('BR-33 giọng miền Nam: code thay từ miền Bắc an toàn, giữ chữ hoa, bỏ "ạ" cuối câu; không đụng "thế giới"', () => {
  assert.equal(normalizeSouthern('Thế nào rồi, đi nhé'), 'Sao rồi, đi nha');
  assert.equal(normalizeSouthern('Dạ em cảm ơn anh ạ.'), 'Dạ em cảm ơn anh.');
  assert.equal(normalizeSouthern('Vâng, giá đấy cao nhỉ'), 'Dạ, giá đó cao ha');
  assert.equal(normalizeSouthern('bọn mình hỏi gì thế'), 'tụi mình hỏi gì vậy');
  assert.equal(normalizeSouthern('kinh tế thế giới'), 'kinh tế thế giới');
  assert.equal(normalizeSouthern('cái ạch'), 'cái ạch');
  assert.equal(normalizeSouthern('Con phải vâng lời ba'), 'Con phải nghe lời ba'); // audit: không thành "dạ lời"
  assert.ok(!isSensitiveTopic('chế độ ăn kiêng') && !isSensitiveTopic('bật chế độ ngoan')); // audit: không bắt nhầm
});

test('BR-34 kiểm lời AI: tục → bỏ (dùng câu soạn sẵn); dài quá → cắt cuối câu; emoji dư → bỏ', () => {
  const d = computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'coccan' }, { purpose: 'answer_chat' }, seededRandom(6));
  assert.equal(checkStyledOutput('đm giá thấp quá', d).ok, false);
  const long = Array.from({ length: 8 }, (_, i) => `Câu số ${i} nói dài dòng lắm nha.`).join(' ');
  const cut = checkStyledOutput(long, d);
  assert.ok(cut.ok && cut.text.split(/(?<=\.)\s+/).length <= d.maxSentences + 1 && cut.warnings.length > 0);
  const e = checkStyledOutput('Hông 😤😤😤', d);
  assert.equal([...e.text.matchAll(/\p{Extended_Pictographic}/gu)].length, d.emojiMax);
  assert.ok(checkStyledOutput('Giá lên rồi nhé', d).text.endsWith('nha'));
});

test('BR-18 + BR-32 hệ số chen chuyện: xỏ lá + siêu bựa nói nhiều hơn ngoan + trầm tĩnh; trần / ngày không đổi', () => {
  const loud = getChimeFactor({ bot: 'ray', personaOn: true, mood: 'sieubua' });
  const quiet = getChimeFactor({ bot: 'ray', personaOn: false, mood: 'tramtinh' });
  assert.ok(loud > 1.5 && quiet < 0.6);
  const base = { level: 5, newMessageCount: 5, lastMessageAt: vn(2026, 11, 25, 9, 0).getTime(), chimeInsToday: 0, lastChimeInAt: null, hasTopicKeyword: false, now: vn(2026, 11, 25, 9, 10) };
  const rate = (f: number) => { const r = seededRandom(9); let n = 0; for (let i = 0; i < 20_000; i++) if (decideChimeIn({ ...base, personaFactor: f }, r).speak) n++; return n / 20_000; };
  assert.ok(rate(loud) > rate(1) && rate(1) > rate(quiet));
  assert.equal(decideChimeIn({ ...base, chimeInsToday: 4, personaFactor: loud }, () => 0).speak, false);
});

test('BR-32 mọi tâm trạng × 2 tính cách × mọi mục đích đều tạo được chỉ thị hợp lệ', () => {
  const r = seededRandom(8);
  for (const mood of MOOD_CODES as readonly MoodCode[]) for (const personaOn of [true, false]) for (const bot of ['ray', 'lui'] as const) {
    for (const purpose of ['answer_data', 'answer_chat', 'chime_in', 'rate_report', 'rate_alert', 'daily_summary'] as const) {
      const d = computeStyleDirective({ bot, personaOn, mood }, { purpose }, r);
      assert.ok(d.words[0] >= 1 && d.words[1] > d.words[0] && d.maxSentences >= 1 && d.emojiMax >= 0, d.signature);
    }
  }
});

test('BR-31 cơ chế dùng chung cho Lũi: tên Lũi trong khối STYLE, ghi rõ tính cách đang chờ Khang; không lẫn tên Rây', () => {
  const settings = { bot: 'lui', personaOn: true, mood: 'vuive' } as const;
  const sys = renderStyleSystemBlock(settings, resolveAddress(settings, null));
  assert.ok(sys.includes('Lũi') && sys.includes('chờ chủ bot gửi'));
  assert.ok(!sys.includes('Rây') && !sys.includes('{ten}'));
  const d = computeStyleDirective(settings, { purpose: 'answer_chat' }, seededRandom(30));
  assert.ok(d.signature.startsWith('lui|on|') && !renderStyleTurnBlock(d).includes('{ten}'));
  const ray = renderStyleSystemBlock(XOLA, resolveAddress(XOLA, null));
  assert.ok(ray.includes('Rây xỏ lá') && !ray.includes('{ten}')); // "hiền hơn Lũi" là lời Khang — được nhắc Lũi
});
