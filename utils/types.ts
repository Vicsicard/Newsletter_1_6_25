export type Result<T> = {
  success: boolean;
  data: T | null;
  error: Error | null;
};
