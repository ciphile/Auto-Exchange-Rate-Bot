// F-08: câu chữ của lệnh Khang (nhãn cài đặt, hướng dẫn, câu báo sai cú pháp). Không tên thật (Rule 5).

export const SETTING_LABELS = {
  alertLevelsVnd: 'Mốc cảnh báo',
  listenOn: 'Lắng nghe (đọc tin trong nhóm)',
  chattinessLevel: 'Mức hóng chuyện',
  address: 'Xưng hô',
  personaOn: 'Tính cách',
  mood: 'Tâm trạng',
  styleNote: 'Phong cách thêm',
  quietHours: 'Giờ nghỉ',
  sources: 'Nguồn tỉ giá',
  frequencyLevel: 'Mức tần suất báo giá + cảnh báo',
  alertFullMonth: 'Cảnh báo cả tháng',
  profanityLevel: 'Mức nói tục',
} as const;

/** Bẫy 35: hướng dẫn phải khớp đúng cú pháp code nhận (test đối chiếu từng lệnh). */
export const OWNER_COMMAND_HELP: readonly (readonly [string, string])[] = [
  ['/caidat', 'xem toàn bộ cài đặt hiện tại'],
  ['/moc 19800 19900 20000', 'đặt mốc cảnh báo (VND / 1 SGD)'],
  ['/langnghe on | off', 'bật / tắt đọc tin trong nhóm'],
  ['/hongchuyen 1..10', 'mức tự chen chuyện'],
  ['/xungho tui - mấy ông', 'cách bot xưng - gọi mọi người (khi bật tính cách)'],
  ['/tinhcach on | off', 'bật tính cách riêng / tắt = ngoan, lễ phép'],
  ['/tamtrang <mã>', 'đổi tâm trạng (gõ /tamtrang không kèm mã để xem danh sách)'],
  ['/tansuat 1..5', 'báo giá + cảnh báo thưa (1) hay dày (5)'],
  ['/canhbaocathang on | off', 'cảnh báo cả tháng / chỉ 14 ngày cuối'],
  ['/noituc 0..3', 'nói tục: 0 cấm · 1 tục nhẹ · 2 nhẹ + vừa · 3 thoáng hơn (từ cấm tuyệt đối thì không bao giờ)'],
  ['/gionghi 20-6', 'giờ nghỉ, bot không tự nhắn (giờ VN)'],
  ['/nguon wise,vcb,vpbank', 'nguồn tỉ giá được dùng'],
  ['/phongcach <mô tả>', 'ghi thêm phong cách (gõ /phongcach xoa để xóa)'],
];

export const COMMAND_ERRORS = {
  onOff: 'Gõ on hoặc off nha (bật / tắt cũng được).',
  levels: 'Mốc phải là các số từ 15000 tới 30000, cách nhau bằng khoảng trắng, tối đa 12 mốc. Ví dụ: /moc 19800 19900 20000',
  chattiness: 'Mức hóng chuyện là số từ 1 tới 10. Ví dụ: /hongchuyen 3',
  address: 'Gõ theo dạng: /xungho <bot xưng> - <gọi mọi người>. Ví dụ: /xungho tui - mấy ông',
  frequency: 'Mức tần suất là số từ 1 tới 5. Ví dụ: /tansuat 3',
  profanity: 'Mức nói tục là số từ 0 tới 3. Ví dụ: /noituc 1',
  quiet: 'Gõ giờ bắt đầu - giờ kết thúc (giờ chẵn, 0–23). Ví dụ: /gionghi 20-6',
  sources: 'Gõ các nguồn wise, vcb, vpbank cách nhau dấu phẩy. Ví dụ: /nguon wise,vcb',
  style: 'Phong cách tối đa 200 ký tự. Ví dụ: /phongcach hay ví von kiểu miền Tây',
  same: 'Cài đặt này đang đúng như vậy rồi, không cần đổi.',
} as const;
