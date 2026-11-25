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
  // Khang 25/11/2026: bật tính cách thì nói ngắn hơn + hay cụt → siêu bựa (khi không cụt) vẫn dài hơn cộc cằn rõ rệt.
  assert.ok((bua.terse || bua.words[1] > 40) && bua.emojiMax === 3);
  assert.equal(nghiem.emojiMax, 0);
});

test('Khang 25/11/2026: bật tính cách → ~45% lần nói CỤT (1 câu, ≤ 12 chữ) + dặn biểu cảm ký tự ":))"; tắt tính cách → không bao giờ cụt', () => {
  const r = seededRandom(7);
  let cut = 0;
  for (let i = 0; i < 2000; i++) {
    const d = computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'vuive' }, { purpose: 'answer_data' }, r);
    if (d.terse) { cut++; assert.ok(d.maxSentences === 1 && d.words[1] <= 12); }
  }
  assert.ok(cut > 800 && cut < 1000, `cụt ${cut}/2000`);
  const on = computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'vuive' }, { purpose: 'answer_data' }, () => 0.01);
  assert.ok(on.terse);
  assert.match(renderStyleTurnBlock(on), /nói CỤT[\s\S]*ĐỦ chữ số[\s\S]*":\)\)", "=\)\)"/);
  for (let i = 0; i < 200; i++) assert.equal(computeStyleDirective({ bot: 'ray', personaOn: false, mood: 'vuive' }, { purpose: 'answer_data' }, r).terse, false);
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

test('BR-34 kiểm lời AI: từ cấm tuyệt đối → bỏ (câu soạn sẵn); /noituc 0 → che từ tục; dài quá → cắt; emoji dư → bỏ', () => {
  const d = computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'coccan' }, { purpose: 'answer_chat' }, seededRandom(6));
  assert.equal(checkStyledOutput('đồ ngu, giá thấp quá', d).ok, false);
  const masked = checkStyledOutput('đm giá thấp quá', d);
  assert.ok(masked.ok && masked.text.startsWith('đ* giá') && masked.profanityUsed === 0);
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

test('BR-38 nói tục có giới hạn: /noituc 1 chỉ tục nhẹ ≤ 1 / tin; 3 = nhẹ + vừa ≤ 2 / tin; dư → che', () => {
  const mk = (level: 0 | 1 | 2 | 3, used = 0) => computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'tucgian', profanityLevel: level }, { purpose: 'answer_chat', profanityUsedToday: used }, seededRandom(40));
  const l1 = mk(1);
  assert.deepEqual([l1.profanityMax, l1.profanityTiers], [1, ['nhe']]);
  const r1 = checkStyledOutput('Vl, đm giá xuống nữa rồi', l1);
  assert.equal(r1.profanityUsed, 1);
  assert.ok(r1.text.startsWith('Vl, đ* giá'));
  const l3 = mk(3);
  const r3 = checkStyledOutput('đm vl vcl giá', l3);
  assert.equal(r3.profanityUsed, 2);
  assert.ok(r3.text.includes('đm vl v**'));
  assert.match(renderStyleTurnBlock(l3), /ĐƯỢC dùng tối đa 2 từ/);
  assert.match(renderStyleTurnBlock(mk(0)), /Từ tục: KHÔNG dùng/);
});

test('BR-38 giới hạn: trần / ngày; ngoan luôn 0; nghiêm túc / trầm tĩnh / tóm tắt / chuyện nhạy cảm → 0; từ cấm luôn bị bỏ', () => {
  const base = { bot: 'ray', personaOn: true, mood: 'coccan', profanityLevel: 2 } as const;
  assert.equal(computeStyleDirective(base, { purpose: 'answer_chat', profanityUsedToday: 5 }, seededRandom(41)).profanityMax, 0);
  assert.equal(computeStyleDirective({ ...base, personaOn: false }, { purpose: 'answer_chat' }, seededRandom(41)).profanityMax, 0);
  assert.equal(computeStyleDirective({ ...base, mood: 'nghiemtuc' }, { purpose: 'answer_chat' }, seededRandom(41)).profanityMax, 0);
  assert.equal(computeStyleDirective(base, { purpose: 'daily_summary' }, seededRandom(41)).profanityMax, 0);
  assert.equal(computeStyleDirective(base, { purpose: 'answer_chat', userText: 'chuyện chính trị' }, seededRandom(41)).profanityMax, 0);
  const d3 = computeStyleDirective({ ...base, profanityLevel: 3 }, { purpose: 'answer_chat' }, seededRandom(41));
  assert.equal(checkStyledOutput('mẹ mày', d3).ok, false);
  assert.match(renderStyleTurnBlock(d3), /TUYỆT ĐỐI KHÔNG: địt/);
});

test('BR-31 mặc định chế độ NGOAN (Khang 25/11/2026)', async () => {
  const { DEFAULT_PERSONA_ON } = await import('../src/config/persona.ts');
  assert.deepEqual(DEFAULT_PERSONA_ON, { ray: false, lui: false });
});

test('Khang 25/11/2026: từ lóng "vãi, éo, móa" — KHÔNG ngoan thì dùng tự do (kể cả /noituc 0, không tính lượt tục); ngoan thì bị che', () => {
  const on = computeStyleDirective({ bot: 'ray', personaOn: true, mood: 'vuive', profanityLevel: 0 }, { purpose: 'answer_chat' }, seededRandom(3));
  const r = checkStyledOutput('vãi, éo hiểu sao giảm hoài =)) móa', on);
  assert.equal(r.text, 'vãi, éo hiểu sao giảm hoài =)) móa');
  assert.equal(r.profanityUsed, 0);
  assert.match(renderStyleTurnBlock(on), /"=D"[\s\S]*từ lóng "vãi", "éo", "móa"/);
  const off = computeStyleDirective({ bot: 'ray', personaOn: false, mood: 'vuive' }, { purpose: 'answer_chat' }, seededRandom(3));
  const r2 = checkStyledOutput('Dạ vãi giá giảm', off);
  assert.ok(!r2.text.includes('vãi'));
  assert.match(renderStyleTurnBlock(off), /KHÔNG dùng từ lóng/);
});

test('Barie chặn số bịa: khối dặn AI (SYSTEM) của tính cách KHÔNG chứa số ≥ 1.000 — số trong SYSTEM được coi là "số hợp lệ", để ví dụ có số sẽ hở lớp chặn', async () => {
  const { extractBigNumbers } = await import('../src/services/number-guard.service.ts');
  for (const bot of ['ray', 'lui'] as const) {
    for (const personaOn of [true, false]) {
      const block = renderStyleSystemBlock({ bot, personaOn, mood: 'vuive' }, { self: 'em', others: 'anh chị' });
      assert.deepEqual(extractBigNumbers(block), [], `${bot} ${personaOn ? 'bật' : 'tắt'}`);
    }
  }
});
