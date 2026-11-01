import { describe, expect, it, vi } from 'vitest';
import { Logger, LogLevel } from './logger.model';

class RecordingLogger extends Logger {
  override log =
    vi.fn<(level: LogLevel, message: string, ...args: unknown[]) => void>();
}

describe('Logger', () => {
  it.each([
    ['debug', LogLevel.Debug],
    ['info', LogLevel.Info],
    ['warn', LogLevel.Warn],
    ['error', LogLevel.Error],
  ] as const)(
    'forwards %s messages and their arguments at the correct level',
    (method, level) => {
      const logger = new RecordingLogger();
      const details = { id: 'note:test' };
      logger[method]('Message', details, 42);
      expect(logger.log).toHaveBeenCalledExactlyOnceWith(
        level,
        'Message',
        details,
        42
      );
    }
  );
});
