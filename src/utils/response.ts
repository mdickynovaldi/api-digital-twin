/**
 * Standard API response helpers for consistent JSON format.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

export function listResponse<T>(
  data: T[],
  meta?: { total?: number; page?: number; limit?: number }
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    meta,
  };
}

export function errorResponse(
  message: string,
  code?: string,
  details?: unknown
): ApiResponse<never> {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };
}
