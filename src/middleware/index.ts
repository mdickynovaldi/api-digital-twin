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

    const maybeHttpError = err as {
      code?: unknown;
      message?: unknown;
      status?: unknown;
      statusCode?: unknown;
    };
    const maybeStatusCode =
      typeof maybeHttpError.statusCode === 'number'
        ? maybeHttpError.statusCode
        : typeof maybeHttpError.status === 'number'
          ? maybeHttpError.status
          : undefined;
    if (maybeStatusCode && maybeStatusCode >= 400 && maybeStatusCode <= 599) {
      return c.json(
        errorResponse(
          typeof maybeHttpError.message === 'string'
            ? maybeHttpError.message
            : 'Application error',
          typeof maybeHttpError.code === 'string'
            ? maybeHttpError.code
            : 'APP_ERROR'
        ),
        maybeStatusCode as ContentfulStatusCode
      );
    }

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
    if (
      err instanceof AppError ||
      (
        err &&
        typeof err === 'object' &&
        'statusCode' in err &&
        'code' in err &&
        'message' in err
      )
    ) {
      const appError = err as AppError;
      return c.json(
        errorResponse(appError.message, appError.code),
        appError.statusCode as ContentfulStatusCode
      );
    }

    // Handle Prisma errors
    if (err && typeof err === 'object' && 'code' in err) {
      const codedError = err as {
        code: string;
        message?: string;
        status?: number;
        statusCode?: number;
        meta?: unknown;
      };
      if (typeof codedError.code === 'string' && !codedError.code.startsWith('P')) {
        const statusCode =
          typeof codedError.statusCode === 'number'
            ? codedError.statusCode
            : typeof codedError.status === 'number'
              ? codedError.status
              : 400;

        return c.json(
          errorResponse(
            codedError.message || 'Application error',
            codedError.code
          ),
          statusCode as ContentfulStatusCode
        );
      }

      const prismaError = codedError as { code: string; message: string; meta?: unknown };
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
