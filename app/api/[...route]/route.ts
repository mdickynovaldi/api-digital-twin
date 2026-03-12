import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { corsMiddleware, loggerMiddleware, errorHandler } from '@/src/middleware';
import nodeRoutes from '@/src/routes/node.routes';
import { openApiSpec } from '@/src/docs/openapi';

// ─── Create Hono app with base path /api ────────────────────────────
const app = new Hono().basePath('/api');

// ─── Global Middleware ──────────────────────────────────────────────
app.use('*', corsMiddleware);
app.use('*', loggerMiddleware);
app.use('*', errorHandler);

// ─── Language Filter Helper ─────────────────────────────────────────
function filterLanguage(obj: unknown, lang: 'en' | 'id'): unknown {
  if (typeof obj === 'string') {
    if (obj.includes('**[EN]**') && obj.includes('**[ID]**')) {
      const enMatch = obj.match(/\*\*\[EN\]\*\*\s*([\s\S]*?)(?=\*\*\[ID\]\*\*|$)/);
      const idMatch = obj.match(/\*\*\[ID\]\*\*\s*([\s\S]*?)(?=\*\*\[EN\]\*\*|$)/);
      if (lang === 'en' && enMatch) return enMatch[1].trim();
      if (lang === 'id' && idMatch) return idMatch[1].trim();
    }
    if (obj.includes(' | ')) {
      const parts = obj.split(' | ');
      if (parts.length === 2) {
        return lang === 'en' ? parts[0].trim() : parts[1].trim();
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => filterLanguage(item, lang));
  }
  if (typeof obj === 'object' && obj !== null) {
    const newObj: Record<string, unknown> = {};
    for (const key in obj) {
      newObj[key] = filterLanguage((obj as Record<string, unknown>)[key], lang);
    }
    return newObj;
  }
  return obj;
}

// ─── OpenAPI JSON Spec ──────────────────────────────────────────────
app.get('/doc', (c) => {
  const lang = (c.req.query('lang') as 'en' | 'id') || 'en';
  return c.json(filterLanguage(openApiSpec, lang));
});

// ─── Scalar API Documentation UI ────────────────────────────────────
app.get('/docs', (c) => {
  const lang = (c.req.query('lang') as 'en' | 'id') || 'en';
  
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Digital Twin API \u2014 ${lang === 'en' ? 'Documentation' : 'Dokumentasi'}</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { margin: 0; }
          .lang-switch-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 100000;
          }
          .lang-btn {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .lang-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
          }
          @media (prefers-color-scheme: light) {
            .lang-btn {
              color: #333;
              border: 1px solid #e2e8f0;
              background: rgba(255, 255, 255, 0.9);
            }
            .lang-btn:hover {
              background: #f8fafc;
            }
          }
        </style>
      </head>
      <body>
        <div class="lang-switch-container">
          <button class="lang-btn" onclick="toggleLanguage()">
            <span style="font-size: 16px;">${lang === 'en' ? '🇮🇩' : '🇬🇧'}</span>
            ${lang === 'en' ? 'Ganti ke Bahasa Indonesia' : 'Switch to English'}
          </button>
        </div>
        
        <script id="api-reference" data-url="/api/doc?lang=${lang}"></script>
        <script>
          var configuration = {
            theme: 'kepler',
          }
          document.getElementById('api-reference').dataset.configuration = JSON.stringify(configuration)
          
          function toggleLanguage() {
            const params = new URLSearchParams(window.location.search);
            const currentLang = params.get('lang') || 'en';
            const newLang = currentLang === 'en' ? 'id' : 'en';
            params.set('lang', newLang);
            window.location.search = params.toString();
          }
        </script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
  `);
});

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

// ─── Route Segment Config ────────────────────────────────────────
// Disable Next.js body size limit so large file uploads (videos up to 200MB) can pass through.
// The actual per-file limits are enforced in src/utils/upload.ts.
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout for large uploads

// ─── Export handlers for Next.js App Router ──────────────────────────
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
