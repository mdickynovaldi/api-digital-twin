import type { Context, Next } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ZodError } from 'zod';
import { errorResponse } from '@/src/utils/response';

/**
 * CORS middleware configured for Unity access.
 * Allows all origins since Unity apps (WebGL, native) need unrestricted access.
 */
export const corsMiddleware = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: false,
});

/**
 * Request logger middleware.
 * Logs method, path, status, and response time.
 */
export const loggerMiddleware = logger((message: string, ...rest: string[]) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, ...rest);
});

/**
 * Global error handler middleware.
 * Catches all errors and returns consistent JSON responses.
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (err: unknown) {
    console.error('[ERROR]', err);

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      return c.json(
        errorResponse(
          'Validation failed',
          'VALIDATION_ERROR',
          err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        ),
        400
      );
    }

    // Handle known application errors
    if (err instanceof AppError) {
      return c.json(
        errorResponse(err.message, err.code),
        err.statusCode as ContentfulStatusCode
      );
    }

    // Handle Prisma errors
    if (err && typeof err === 'object' && 'code' in err) {
      const prismaError = err as { code: string; message: string; meta?: unknown };
      if (prismaError.code === 'P2025') {
        return c.json(errorResponse('Record not found', 'NOT_FOUND'), 404);
      }
      if (prismaError.code === 'P2002') {
        return c.json(errorResponse('Duplicate record', 'CONFLICT'), 409);
      }
      if (prismaError.code === 'P2003') {
        return c.json(errorResponse('Foreign key constraint failed', 'CONSTRAINT_ERROR'), 400);
      }
    }

    // Unknown error
    const message =
      process.env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : 'Internal server error';

    return c.json(errorResponse(message, 'INTERNAL_ERROR'), 500);
  }
}

/**
 * Custom application error class for consistent error handling.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'APP_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}
