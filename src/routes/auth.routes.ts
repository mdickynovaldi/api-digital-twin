import { Hono } from 'hono';
import { authService } from '@/src/services/auth.service';
import { loginSchema, registerSchema } from '@/src/schemas/auth.schema';
import { getAuthUser, requireAuth } from '@/src/middleware/auth';
import { successResponse } from '@/src/utils/response';

const authRoutes = new Hono();

authRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.parse(body);
  const result = await authService.register(parsed);
  return c.json(successResponse(result), 201);
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.parse(body);
  const result = await authService.login(parsed);
  return c.json(successResponse(result));
});

authRoutes.get('/me', requireAuth, async (c) => {
  return c.json(successResponse(getAuthUser(c)));
});

authRoutes.post('/logout', requireAuth, async (c) => {
  const result = await authService.logout(c.req.header('authorization'));
  return c.json(successResponse(result));
});

export default authRoutes;
