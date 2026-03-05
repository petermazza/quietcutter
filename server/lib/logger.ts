export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, source, metadata, error } = entry;
    
    let logString = `[${timestamp}] ${level.toUpperCase()}`;
    
    if (source) {
      logString += ` [${source}]`;
    }
    
    logString += `: ${message}`;
    
    if (metadata && Object.keys(metadata).length > 0) {
      logString += ` | ${JSON.stringify(metadata)}`;
    }
    
    if (error) {
      logString += ` | Error: ${error.name} - ${error.message}`;
      if (error.stack && !this.isProduction) {
        logString += `\nStack: ${error.stack}`;
      }
    }
    
    return logString;
  }

  private log(level: LogLevel, message: string, source?: string, metadata?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      source,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    const formattedLog = this.formatLog(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.DEBUG:
        if (!this.isProduction) {
          console.debug(formattedLog);
        }
        break;
    }
  }

  error(message: string, source?: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, source, metadata, error);
  }

  warn(message: string, source?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, source, metadata);
  }

  info(message: string, source?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, source, metadata);
  }

  debug(message: string, source?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, source, metadata);
  }
}

export const logger = new Logger();

// Convenience function for backward compatibility
export function log(message: string, source = "express"): void {
  logger.info(message, source);
}
