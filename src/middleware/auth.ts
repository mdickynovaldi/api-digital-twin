import type { Context, MiddlewareHandler, Next } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authService, type AuthenticatedUser } from '@/src/services/auth.service';
import type { ApiRole } from '@/src/schemas/auth.schema';
import { AppError } from '@/src/middleware';
import { errorResponse } from '@/src/utils/response';

function authErrorResponse(c: Context, err: unknown) {
  const error = err as {
    code?: string;
    message?: string;
    status?: number;
    statusCode?: number;
  };
  const statusCode =
    typeof error.statusCode === 'number'
      ? error.statusCode
      : typeof error.status === 'number'
        ? error.status
        : 401;

  return c.json(
    errorResponse(
      error.message || 'Authentication is required',
      error.code || 'UNAUTHORIZED'
    ),
    statusCode as ContentfulStatusCode
  );
}

export async function requireAuth(c: Context, next: Next) {
  let user: AuthenticatedUser;
  try {
    user = await authService.authenticate(c.req.header('authorization'));
  } catch (err) {
    return authErrorResponse(c, err);
  }

  c.set('authUser', user);
  await next();
}

export function requireRole(...roles: ApiRole[]): MiddlewareHandler {
  return async (c, next) => {
    let user: AuthenticatedUser;
    try {
      user = await authService.authenticate(c.req.header('authorization'));
    } catch (err) {
      return authErrorResponse(c, err);
    }

    if (!roles.includes(user.role)) {
      return c.json(
        errorResponse('Forbidden for this role', 'FORBIDDEN'),
        403
      );
    }

    c.set('authUser', user);
    try {
      await next();
    } catch (err) {
      if (err instanceof AppError) {
        return authErrorResponse(c, err);
      }
      throw err;
    }
  };
}

export function getAuthUser(c: Context): AuthenticatedUser {
  const user = c.get('authUser') as AuthenticatedUser | undefined;
  if (!user) {
    throw new AppError('Authentication is required', 401, 'UNAUTHORIZED');
  }
  return user;
}
