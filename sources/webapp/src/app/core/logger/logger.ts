import { inject } from '@angular/core';
import { LoggerService } from './logger.service';
import { Logger } from './logger.model';

export function injectLogger(context: string): Logger {
  return inject(LoggerService).withContext(context);
}
