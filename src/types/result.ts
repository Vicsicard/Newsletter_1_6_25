export type Result<T> = {
  success: boolean;
  data?: T;
  error?: Error;
};

export function ok<T>(value: T): Result<T> {
  return { success: true, data: value };
}

export function err(error: Error): Result<never> {
  return { success: false, error };
}

export function isOk<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success;
}

export function isErr<T>(result: Result<T>): result is { success: false; error: Error } {
  return !result.success;
}
