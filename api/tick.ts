// Cửa vào nhịp lịch 10 phút (Supabase Cron gọi). Chỉ chuyển vào controller.
import { handleTickRequest } from '../src/controllers/http.controller.ts';

export const POST = (request: Request) => handleTickRequest(request);
