/**
 * Production-Safe Logging Utility
 * 
 * Provides structured logging that can be controlled by environment
 * In production, only logs errors and warnings
 * In development, logs everything
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Logger class for production-safe logging
 */
class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (isDevelopment) return true;
    if (isProduction) {
      // In production, only log warnings and errors
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, isDevelopment ? 2 : 0)}`;
    }
    
    return `${prefix} ${message}`;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      if (error instanceof Error) {
        console.error(this.formatMessage('error', message, {
          error: error.message,
          stack: isDevelopment ? error.stack : undefined,
          name: error.name,
        }));
      } else {
        console.error(this.formatMessage('error', message, error));
      }
    }
  }

  /**
   * Logs subscription detection summary (always logged in production)
   */
  subscriptionDetectionSummary(data: {
    transactions: number;
    merchants: number;
    subscriptions: number;
    monthlySpend: number;
    mostExpensive?: string;
  }): void {
    const message = `✅ Subscription Detection: ${data.merchants} merchants → ${data.subscriptions} subscriptions → $${data.monthlySpend.toFixed(2)}/month`;
    this.info(message);
    if (data.mostExpensive) {
      this.info(`   Most expensive: ${data.mostExpensive}`);
    }
  }
}

export const logger = new Logger();

