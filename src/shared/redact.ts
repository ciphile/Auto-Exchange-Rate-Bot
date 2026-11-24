// Che bí mật ở MỌI đường ra (log kỹ thuật, tin báo lỗi gửi Khang, log AI) — CODING_STANDARDS 6.5, Bẫy 44.
// Hai lớp: (1) che đúng các giá trị bí mật app đang giữ; (2) che theo dạng (token bot, khóa Google, khóa Supabase)
// phòng khi dịch vụ ngoài chép lại khóa trong câu báo lỗi.

const SECRET_SHAPES: readonly RegExp[] = [
  /\b\d{5,}:[A-Za-z0-9_-]{30,}\b/g, // token bot Telegram
  /AIza[0-9A-Za-z_-]{30,}/g, // khóa Google
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{10,}/g, // khóa Supabase kiểu mới
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWT
  /\bbot\d{5,}:[^/\s]+/g, // đường dẫn api.telegram.org/bot<token>/…
];

const MIN_SECRET_TO_MASK = 8; // giá trị quá ngắn che theo giá trị sẽ che nhầm chữ thường

export function redactSecrets(text: string, knownSecrets: readonly (string | null | undefined)[] = []): string {
  let out = text;
  for (const secret of knownSecrets) {
    if (secret && secret.length >= MIN_SECRET_TO_MASK) out = out.split(secret).join('[đã che]');
  }
  for (const shape of SECRET_SHAPES) out = out.replace(shape, '[đã che]');
  return out;
}
