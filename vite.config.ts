import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ---------------------------------------------------------------------------
// Dev-only plugin: runs Vercel serverless handlers inside Vite's dev server
// so `npm run dev` works without `vercel dev` or the Vercel CLI.
// ---------------------------------------------------------------------------
function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server: any) {
      const _require = createRequire(import.meta.url);
      const projectRoot = process.cwd();

      // Use Vite's own loadEnv with prefix '' to load ALL vars (VITE_ and non-VITE_)
      // This is the most reliable way to read .env in a Vite project.
      const localEnv = loadEnv('development', projectRoot, '');
      Object.assign(process.env, localEnv);

      // Dev-only: Route crawler user-agents on /browse/ or /watch/ to /api/content-seo
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const userAgent = req.headers['user-agent'] || '';
        const isBot = /facebookexternalhit|whatsapp|telegrambot|twitterbot|discordbot|slackbot|applebot|googlebot|bingbot/i.test(userAgent);
        const match = req.url?.match(/^\/(browse|watch)\/([^\/?#]+)/i);
        if (isBot && match) {
          req.url = `/api/content-seo?id=${encodeURIComponent(match[2])}&type=${match[1]}`;
        }
        next();
      });

      server.middlewares.use('/api/', async (req: any, res: any, next: any) => {
        // When mounted at '/api/', connect strips the prefix: req.url = 'songs?movie=Dune'
        const fullUrl = new URL('/api/' + req.url, 'http://localhost');
        const pathname = fullUrl.pathname; // e.g. /api/songs

        // Build query object from search params
        req.query = Object.fromEntries(fullUrl.searchParams.entries());

        // Derive handler path → <project>/api/songs.js
        const handlerPath = path.resolve(projectRoot, `.${pathname}.js`);

        let handler: any;
        try {
          if (!fs.existsSync(handlerPath)) {
             throw new Error(`Handler file not found: ${handlerPath}`);
          }
          // Use dynamic import with cache busting for development
          const module = await import(`file://${handlerPath}?update=${Date.now()}`);
          handler = module.default || module;
        } catch (e: any) {
          console.error('[API ERROR] Failed to load handler:', e.message);
          next();
          return;
        }

        // Minimal Express-like res shim
        if (!res.status) res.status = (code: number) => { res.statusCode = code; return res; };
        if (!res.json)   res.json   = (data: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
        if (!res.send)   res.send   = (data: unknown) => res.end(String(data));

        try {
          const fn = typeof handler === 'function' ? handler : handler.default;
          if (typeof fn !== 'function') {
             throw new Error('Handler is not a function');
          }
          await fn(req, res);
        } catch (e: any) {
          console.error('[API EXECUTION ERROR]:', e.message);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: true
    },
    plugins: [
      localApiPlugin(),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MiB
          navigateFallbackDenylist: [/^\/api/, /^\/sitemap\.xml$/, /^\/robots\.txt$/, /\.[a-zA-Z0-9]+$/],
        },
        manifest: {
          name: 'My Donkey OTT',
          short_name: 'MyDonkey',
          description: 'Free OTT Platform',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              const parts = id.toString().split('node_modules/');
              const name = parts[parts.length - 1].split('/')[0];
              if (name === 'react' || name === 'react-dom' || name === 'react-router-dom' || name === 'react-router') {
                return 'vendor-react';
              }
              if (name.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (name === 'shaka-player' || name === 'dashjs' || name === 'hls.js' || name === 'movi-player') {
                return 'vendor-players';
              }
              return `vendor-${name.replace('@', '')}`;
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000,
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    }
  };
});

