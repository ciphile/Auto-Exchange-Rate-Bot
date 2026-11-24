// F-01: đọc tỉ giá từ nguồn ngoài (ADR-07). Nơi DUY NHẤT gọi mạng tới nguồn tỉ giá; đổi dữ liệu ngoài
// thành kiểu dự án; không chứa quy tắc nghiệp vụ. Hàm parse tách riêng để test bằng dữ liệu mẫu.
import { HTTP_TIMEOUT_MS, HTTP_USER_AGENT } from '../config/defaults.ts';
import { fail, ok, type Result } from '../shared/result.ts';

export type BankQuote = { bank: 'VCB' | 'VPBank'; cashBuyVnd: number | null; transferBuyVnd: number | null; sellVnd: number | null };
export type RatePoint = { at: number; rateVnd: number };

const WISE_LIVE_URL = 'https://wise.com/rates/live?source=SGD&target=VND';
const WISE_HISTORY_URL = 'https://wise.com/rates/history+live?source=SGD&target=VND&length=8&resolution=hourly&unit=day';
const FALLBACK_URL = 'https://open.er-api.com/v6/latest/SGD';
const VCB_URL = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx?b=10';
const VPBANK_URL = 'https://www.vpbank.com.vn/uiux-api/api/exchange-rate';

/** '19,497.26' | '19454.97' | 19648 | '-' | '' → số hoặc null. */
export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/,/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseWiseLive(body: unknown): number | null {
  const v = (body as { value?: unknown } | null)?.value;
  const n = parseNumber(v);
  return n !== null && n > 0 ? n : null;
}

export function parseWiseHistory(body: unknown): RatePoint[] {
  if (!Array.isArray(body)) return [];
  return body
    .map((p) => ({ at: Number((p as { time?: unknown }).time), rateVnd: parseNumber((p as { value?: unknown }).value) }))
    .filter((p): p is RatePoint => Number.isFinite(p.at) && p.rateVnd !== null && p.rateVnd > 0)
    .sort((a, b) => a.at - b.at);
}

export function parseFallbackMid(body: unknown): number | null {
  const b = body as { result?: unknown; rates?: Record<string, unknown> } | null;
  if (b?.result !== 'success') return null;
  const n = parseNumber(b.rates?.VND ?? null);
  return n !== null && n > 0 ? n : null; // giá ≤ 0 là dữ liệu hỏng (tránh chia cho 0 khi quy đổi)
}

/** VCB trả XML `<Exrate CurrencyCode="SGD" Buy=".." Transfer=".." Sell=".." />` — đọc bằng regex, không cần thư viện. */
export function parseVcbXml(xml: string): BankQuote | null {
  const tag = xml.match(/<Exrate\b[^>]*CurrencyCode="SGD"[^>]*\/?>/);
  if (!tag) return null;
  const attr = (name: string) => parseNumber(tag[0].match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null);
  return { bank: 'VCB', cashBuyVnd: attr('Buy'), transferBuyVnd: attr('Transfer'), sellVnd: attr('Sell') };
}

/** VPBank trả nhiều bản chụp trong ngày → lấy bản mới nhất có SGD. */
export function parseVpbank(body: unknown): BankQuote | null {
  if (!Array.isArray(body)) return null;
  const snapshots = [...body].sort((a, b) => String(b?.effectiveTime).localeCompare(String(a?.effectiveTime)));
  for (const snap of snapshots) {
    const row = Array.isArray(snap?.exchangeRates) ? snap.exchangeRates.find((r: { currency?: string }) => r?.currency === 'SGD') : null;
    if (row) return { bank: 'VPBank', cashBuyVnd: parseNumber(row.buyCash), transferBuyVnd: parseNumber(row.buyTransfer), sellVnd: parseNumber(row.sellTransfer) };
  }
  return null;
}

async function getText(url: string): Promise<Result<string>> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': HTTP_USER_AGENT }, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    if (!res.ok) return fail('E-SRC-002', `${new URL(url).host} HTTP ${res.status}`);
    return ok(await res.text());
  } catch (err) {
    return fail('E-SRC-002', `${new URL(url).host} ${(err as Error).name}`);
  }
}

async function getJson(url: string): Promise<Result<unknown>> {
  const r = await getText(url);
  if (!r.ok) return r;
  try { return ok(JSON.parse(r.data)); } catch { return fail('E-SRC-002', `${new URL(url).host} JSON hỏng`); }
}

export async function fetchWiseLive(): Promise<Result<number>> {
  const r = await getJson(WISE_LIVE_URL);
  if (!r.ok) return r;
  const v = parseWiseLive(r.data);
  return v === null ? fail('E-SRC-001', 'wise live không có giá') : ok(v);
}

export async function fetchWiseHistory(): Promise<Result<RatePoint[]>> {
  const r = await getJson(WISE_HISTORY_URL);
  if (!r.ok) return r;
  const pts = parseWiseHistory(r.data);
  return pts.length === 0 ? fail('E-SRC-001', 'wise history rỗng') : ok(pts);
}

export async function fetchFallbackMid(): Promise<Result<number>> {
  const r = await getJson(FALLBACK_URL);
  if (!r.ok) return r;
  const v = parseFallbackMid(r.data);
  return v === null ? fail('E-SRC-002', 'nguồn dự phòng không có giá') : ok(v);
}

export async function fetchVcb(): Promise<Result<BankQuote>> {
  const r = await getText(VCB_URL);
  if (!r.ok) return r;
  const q = parseVcbXml(r.data);
  return q === null ? fail('E-SRC-002', 'VCB không có SGD') : ok(q);
}

export async function fetchVpbank(): Promise<Result<BankQuote>> {
  const r = await getJson(VPBANK_URL);
  if (!r.ok) return r;
  const q = parseVpbank(r.data);
  return q === null ? fail('E-SRC-002', 'VPBank không có SGD') : ok(q);
}
