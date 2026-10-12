import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { injectLogger } from './logger';
import { LoggerService } from './logger.service';

describe('injectLogger', () => {
  it('obtains a logger for the requested context through Angular injection', () => {
    const logger = new LoggerService();
    const contextual = logger.withContext('Notes');
    const withContext = vi.fn(() => contextual);
    TestBed.configureTestingModule({
      providers: [{ provide: LoggerService, useValue: { withContext } }],
    });
    const result = TestBed.runInInjectionContext(() => injectLogger('Notes'));
    expect(result).toBe(contextual);
    expect(withContext).toHaveBeenCalledExactlyOnceWith('Notes');
  });
});
