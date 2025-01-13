import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';

type LogLevel = 'info' | 'warn' | 'error';

type Result<T> = {
  success: boolean;
  data: T | null;
  error: Error | null;
};

export enum LogLevelEnum {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export type LogEntry = {
  level: LogLevelEnum;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  component: string;
};

export class Logger {
  private supabase: SupabaseClient<Database>;
  private component: string;

  constructor(supabase: SupabaseClient<Database>, component: string) {
    this.supabase = supabase;
    this.component = component;
  }

  private async logToDatabase(entry: LogEntry): Promise<Result<any>> {
    try {
      const { data: logData, error } = await this.supabase
        .from('workflow_logs')
        .insert([entry])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          data: null,
          error: new Error(`Failed to write log to database: ${error.message}`)
        };
      }

      return {
        success: true,
        data: logData,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  private createLogEntry(
    level: LogLevelEnum,
    message: string,
    context?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      component: this.component
    };
  }

  async getSuccessRates(hours: number = 24): Promise<Result<any>> {
    try {
      const { data, error } = await this.supabase
        .from('queue_success_rates')
        .select('*')
        .gte('time_bucket', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('time_bucket', { ascending: false });

      if (error) {
        return {
          success: false,
          data: null,
          error: new Error(`Failed to fetch success rates: ${error.message}`)
        };
      }

      return {
        success: true,
        data,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  async debug(message: string, context?: Record<string, any>): Promise<Result<any>> {
    const entry = this.createLogEntry(LogLevelEnum.DEBUG, message, context);
    console.debug(`[${entry.component}] ${message}`, context || '');
    return this.logToDatabase(entry);
  }

  async info(message: string, context?: Record<string, any>): Promise<Result<any>> {
    const entry = this.createLogEntry(LogLevelEnum.INFO, message, context);
    console.info(`[${entry.component}] ${message}`, context || '');
    return this.logToDatabase(entry);
  }

  async warn(message: string, context?: Record<string, any>): Promise<Result<any>> {
    const entry = this.createLogEntry(LogLevelEnum.WARN, message, context);
    console.warn(`[${entry.component}] ${message}`, context || '');
    return this.logToDatabase(entry);
  }

  async error(message: string, context?: Record<string, any>): Promise<Result<any>> {
    const entry = this.createLogEntry(LogLevelEnum.ERROR, message, context);
    console.error(`[${entry.component}] ${message}`, context || '');
    return this.logToDatabase(entry);
  }
}
