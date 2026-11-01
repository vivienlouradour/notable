import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { LogLevel } from './logger.model';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  const originalProduction = environment.production;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    environment.production = originalProduction;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([
    [LogLevel.Debug, 'debug'],
    [LogLevel.Info, 'info'],
    [LogLevel.Warn, 'warn'],
    [LogLevel.Error, 'error'],
  ] as const)(
    'formats level %s with its timestamp and forwards additional arguments',
    (level, method) => {
      environment.production = false;
      new LoggerService().log(level, 'Message', { id: 'note:test' }, 42);
      expect(console[method]).toHaveBeenCalledExactlyOnceWith(
        `[2026-01-01T12:00:00.000Z] [${LogLevel[level]}] Message`,
        { id: 'note:test' },
        42
      );
    }
  );

  it('suppresses debug and info in production while preserving warnings and errors', () => {
    environment.production = true;
    const logger = new LoggerService();
    logger.debug('Debug');
    logger.info('Info');
    logger.warn('Warning');
    logger.error('Error');
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('does not log messages at the Off level', () => {
    new LoggerService().log(LogLevel.Off, 'Disabled');
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('prefixes contextual messages while retaining the severity and production filtering', () => {
    environment.production = true;
    const logger = new LoggerService().withContext('Notes');
    logger.info('Hidden');
    logger.warn('Write failed');
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledOnce();
    expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toBe(
      '[2026-01-01T12:00:00.000Z] [Warn] [Notes] Write failed'
    );
  });
});
