// F-05 + BR-18: quyết định có TỰ chen vào chuyện hay không — LUẬT THUẦN CODE, không gọi AI.
// Chỉ khi hàm này trả `speak: true` mới được gọi AI để soạn câu.
import {
  BURST_MIN_MESSAGES, BURST_SILENCE_MS, CHATTINESS_MAX_PROBABILITY, CHATTINESS_TABLE, CHATTINESS_TOPIC_BOOST,
  CHIME_IN_COOLDOWN_MS, DEFAULT_QUIET_HOURS,
} from '../config/defaults.ts';
import { isInQuietHours } from '../shared/vn-time.ts';

export type ChimeInInput = {
  level: number; // 1–10
  newMessageCount: number; // số tin mới của thành viên từ lần xét trước
  lastMessageAt: number; // ms
  chimeInsToday: number;
  lastChimeInAt: number | null;
  hasTopicKeyword: boolean; // đợt có từ khóa đúng chuyên môn bot
  now: Date;
};
export type ChimeInDecision = { speak: boolean; reason: string };

/** "Đợt trò chuyện" đã xong: đủ tin mới và group đã im đủ lâu. */
export function isBurstComplete(newMessageCount: number, lastMessageAt: number, now: Date): boolean {
  return newMessageCount >= BURST_MIN_MESSAGES && now.getTime() - lastMessageAt >= BURST_SILENCE_MS;
}

export function decideChimeIn(input: ChimeInInput, random: () => number, quiet = DEFAULT_QUIET_HOURS): ChimeInDecision {
  const level = Math.min(10, Math.max(1, Math.round(input.level)));
  const row = CHATTINESS_TABLE[level - 1];
  if (!isBurstComplete(input.newMessageCount, input.lastMessageAt, input.now)) return { speak: false, reason: 'chưa xong đợt' };
  if (isInQuietHours(input.now, quiet)) return { speak: false, reason: 'giờ nghỉ' };
  if (input.chimeInsToday >= row.dailyCap) return { speak: false, reason: 'đủ trần lượt / ngày' };
  if (input.lastChimeInAt !== null && input.now.getTime() - input.lastChimeInAt < CHIME_IN_COOLDOWN_MS) {
    return { speak: false, reason: 'đang nghỉ sau lần chen trước' };
  }
  const p = Math.min(CHATTINESS_MAX_PROBABILITY, row.probability * (input.hasTopicKeyword ? CHATTINESS_TOPIC_BOOST : 1));
  return random() < p ? { speak: true, reason: `trúng xác suất ${p}` } : { speak: false, reason: `trượt xác suất ${p}` };
}
