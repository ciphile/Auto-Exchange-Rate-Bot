// Cửa vào webhook Telegram của Rây (Vercel Function). Chỉ chuyển vào controller.
import { handleWebhookRequest } from '../src/controllers/http.controller.ts';

export const POST = (request: Request) => handleWebhookRequest('ray', request);
