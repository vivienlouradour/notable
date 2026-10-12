import { Injectable } from '@angular/core';
import { Logger, LogLevel } from './logger.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoggerService extends Logger {
  private readonly minLevel: LogLevel = environment.production
    ? LogLevel.Warn
    : LogLevel.Debug;

  public withContext(context: string): Logger {
    return new ContextualLogger(this, context);
  }

  public log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (level < this.minLevel || level === LogLevel.Off) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${LogLevel[level]}] ${message}`;

    switch (level) {
      case LogLevel.Debug:
        console.debug(formatted, ...args);
        break;
      case LogLevel.Info:
        console.info(formatted, ...args);
        break;
      case LogLevel.Warn:
        console.warn(formatted, ...args);
        break;
      case LogLevel.Error:
        console.error(formatted, ...args);
        break;
    }
  }
}

class ContextualLogger extends Logger {
  constructor(
    private readonly logger: Logger,
    private readonly context: string
  ) {
    super();
  }

  public log(level: LogLevel, message: string, ...args: unknown[]): void {
    const contextualMessage = `[${this.context}] ${message}`;

    this.logger.log(level, contextualMessage, args);
  }
}
