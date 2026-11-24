// Tiện ích dùng chung cho test: số ngẫu nhiên có hạt giống (lặp lại được) + tạo thời điểm theo giờ VN.
import { getInstantFromVn } from '../src/shared/vn-time.ts';

export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const vn = (y: number, m: number, d: number, h = 0, min = 0) => getInstantFromVn(y, m, d, h, min);
