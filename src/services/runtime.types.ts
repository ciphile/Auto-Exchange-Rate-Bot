// Kiểu "bộ đồ nghề" của 1 yêu cầu (webhook / tick) — service dùng, controller (runtime.ts) tạo. Chỉ kiểu, không code.
import type { AppEnv } from '../config/env.ts';
import type { TelegramClient } from '../adapters/telegram.adapter.ts';
import type { Store } from '../repositories/store.repository.ts';
import type { Logger } from '../shared/logger.ts';
import type { RateFetchers } from './rate-feed.service.ts';
import type { SpeechDeps } from './speech.service.ts';

export type Runtime = SpeechDeps & {
  env: AppEnv; tg: TelegramClient; log: Logger; requestId: string; ownerId: number;
  fetchers: RateFetchers; store: Store;
};
