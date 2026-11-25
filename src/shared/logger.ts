// Log kỹ thuật (CODING_STANDARDS 6.5): JSON 1 dòng ra đầu ra chuẩn, có requestId. Không ghi token / khóa / chữ riêng tư.
export type LogLevel = 'info' | 'warn' | 'error';
export type Logger = (level: LogLevel, event: string, fields?: Record<string, unknown>) => void;

export function createLogger(requestId: string, module: string, secrets: readonly string[] = []): Logger {
  return (level, event, fields = {}) => {
    let line = JSON.stringify({ at: new Date().toISOString(), level, module, requestId, event, ...fields });
    for (const s of secrets) if (s && s.length >= 8) line = line.split(s).join('***');
    (level === 'error' ? console.error : console.log)(line);
  };
}
