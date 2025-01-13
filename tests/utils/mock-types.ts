import { PostgrestError, PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

export interface MockPostgrestSuccess<T> {
  data: T;
  error: null;
  count: null;
  status: number;
  statusText: string;
}

export interface MockPostgrestError {
  data: null;
  error: PostgrestError;
  count: null;
  status: number;
  statusText: string;
}

export type MockPostgrestResponse<T> = MockPostgrestSuccess<T> | MockPostgrestError;

export function createSuccessResponse<T>(data: T): Promise<PostgrestResponse<T>> {
  return Promise.resolve({
    data,
    error: null,
    count: null,
    status: 200,
    statusText: 'OK'
  } as unknown as PostgrestResponse<T>);
}

export function createErrorResponse(error: Error): Promise<PostgrestResponse<any>> {
  return Promise.resolve({
    data: null,
    error: {
      message: error.message,
      details: '',
      hint: '',
      code: 'ERROR'
    },
    count: null,
    status: 500,
    statusText: 'Error'
  } as unknown as PostgrestResponse<any>);
}

export function createSingleSuccessResponse<T>(data: T): Promise<PostgrestSingleResponse<T>> {
  return Promise.resolve({
    data,
    error: null,
    count: null,
    status: 200,
    statusText: 'OK'
  } as unknown as PostgrestSingleResponse<T>);
}

export function createSingleErrorResponse(error: Error): Promise<PostgrestSingleResponse<any>> {
  return Promise.resolve({
    data: null,
    error: {
      message: error.message,
      details: '',
      hint: '',
      code: 'ERROR'
    },
    count: null,
    status: 500,
    statusText: 'Error'
  } as unknown as PostgrestSingleResponse<any>);
}
