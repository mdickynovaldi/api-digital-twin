import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { corsMiddleware, loggerMiddleware, errorHandler } from '@/src/middleware';
import nodeRoutes from '@/src/routes/node.routes';

// ─── Create Hono app with base path /api ────────────────────────────
const app = new Hono().basePath('/api');

// ─── Global Middleware ──────────────────────────────────────────────
app.use('*', corsMiddleware);
app.use('*', loggerMiddleware);
app.use('*', errorHandler);

// ─── Health Check ───────────────────────────────────────────────────
app.get('/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'digital-twin-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── Mount Node Routes ──────────────────────────────────────────────
app.route('/nodes', nodeRoutes);

// ─── 404 Fallback ───────────────────────────────────────────────────
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        message: `Route not found: ${c.req.method} ${c.req.path}`,
        code: 'NOT_FOUND',
      },
    },
    404
  );
});

// ─── Export handlers for Next.js App Router ──────────────────────────
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
