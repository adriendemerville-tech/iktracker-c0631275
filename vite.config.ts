import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from "vite-plugin-compression";

// Plugin to make CSS non-render-blocking for better FCP
function asyncCssPlugin(): Plugin {
  return {
    name: 'async-css',
    enforce: 'post',
    transformIndexHtml(html) {
      // Transform CSS links to use media="print" trick for non-blocking load
      // This loads CSS asynchronously then swaps to media="all" when loaded
      let result = html.replace(
        /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
        `<link rel="preload" href="$1" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="$1"></noscript>`
      );
      
      // Add defer to non-critical scripts for better FCP
      // Entry point script will still block, but other scripts become non-blocking
      result = result.replace(
        /<script type="module" crossorigin src="(\/assets\/[^"]+\.js)"><\/script>/g,
        (match, src) => {
          // Keep entry script as-is, defer others
          if (src.includes('index-')) {
            return match;
          }
          return `<script type="module" crossorigin src="${src}" defer></script>`;
        }
      );
      
      return result;
    },
  };
}

// Plugin to add high-priority modulepreload for critical vendor chunks
function criticalChunkPreloadPlugin(): Plugin {
  return {
    name: 'critical-chunk-preload',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      // Only in production builds
      if (!ctx.bundle) return html;
      
      // Find critical vendor chunks that should be preloaded with high priority
      const criticalChunks = ['vendor-react', 'vendor-router'];
      const preloadLinks: string[] = [];
      
      for (const [fileName, chunk] of Object.entries(ctx.bundle)) {
        if (chunk.type === 'chunk') {
          // Check if this is a critical vendor chunk
          const isCritical = criticalChunks.some(name => fileName.includes(name));
          if (isCritical) {
            preloadLinks.push(`<link rel="modulepreload" href="/${fileName}" fetchpriority="high">`);
          }
        }
      }
      
      // Insert preload links right after the opening head tag
      if (preloadLinks.length > 0) {
        return html.replace(
          '<head>',
          `<head>\n    <!-- Critical vendor chunks preload -->\n    ${preloadLinks.join('\n    ')}`
        );
      }
      
      return html;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    asyncCssPlugin(), // Add async CSS loading for better FCP
    criticalChunkPreloadPlugin(), // Add high-priority preload for critical vendors
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null, // Disable auto-injection, we'll register manually after load
      includeAssets: ["favicon.png", "robots.txt", "pwa-icon-192.png", "pwa-icon-512.png", "apple-touch-icon.png", "splash/*.png"],
      manifest: {
        name: "IKtracker - Indemnités Kilométriques",
        short_name: "IKtracker",
        description: "Suivez vos indemnités kilométriques facilement",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2661D9",
        orientation: "portrait",
        categories: ["finance", "productivity", "utilities"],
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Nouveau trajet",
            short_name: "Trajet",
            description: "Ajouter un nouveau trajet",
            url: "/?action=new-trip",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Mes rapports",
            short_name: "Rapports",
            description: "Voir mes rapports kilométriques",
            url: "/report",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,json}"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB to accommodate larger bundles
        navigateFallback: "/offline",
        navigateFallbackAllowlist: [/^\/(?!api|functions|.*\.\w+$).*/],
        navigateFallbackDenylist: [/^\/api/, /^\/functions/, /\.\w+$/],
        runtimeCaching: [
          // Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Google Fonts webfonts
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Google Maps API - NetworkFirst for freshness
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "google-maps-api",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Google Maps tiles - CacheFirst for performance
          {
            urlPattern: /^https:\/\/.*\.google\.com\/.*maps.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-maps-tiles",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Supabase API - NetworkFirst with offline fallback
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Images - CacheFirst for faster loading
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Static assets - CacheFirst with long expiration
          {
            urlPattern: /\.(?:js|css|woff2|woff|ttf)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year (hashed files)
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // HTML pages - NetworkFirst for freshness
          {
            urlPattern: /\.html$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "html-pages",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
    // Gzip compression for broad compatibility
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Only compress files > 1KB
      deleteOriginFile: false,
    }),
    // Brotli compression for modern browsers (better ratio)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Disable modulePreload polyfill - modern browsers support it natively
    // This reduces initial JS and chain length
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        // Dynamic chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          // Core React - minimal bundle for initial load
          'vendor-react': [
            'react',
            'react-dom',
          ],
          // Router loaded after React hydration
          'vendor-router': [
            'react-router-dom',
          ],
          // Data layer - split Supabase and React Query for better parallelization
          'vendor-supabase': [
            '@supabase/supabase-js',
          ],
          'vendor-query': [
            '@tanstack/react-query',
          ],
          // SEO - loaded async
          'vendor-seo': [
            'react-helmet-async',
          ],
          // Critical UI only - minimal for FCP
          'vendor-ui-core': [
            '@radix-ui/react-slot',
          ],
          // Toast/Dialog - deferred
          'vendor-ui-feedback': [
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-dialog',
            '@radix-ui/react-alert-dialog',
          ],
          // Secondary UI - lazy loaded
          'vendor-ui-forms': [
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-switch',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-slider',
          ],
          // Navigation UI
          'vendor-ui-nav': [
            '@radix-ui/react-tabs',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-accordion',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-progress',
            '@radix-ui/react-avatar',
          ],
          // Heavy features - lazy loaded only when needed
          'vendor-charts': ['recharts'],
          'vendor-zip': ['jszip', 'pako'],
          'vendor-motion': ['framer-motion'],
          'vendor-qr': ['qrcode.react'],
          'vendor-pdf': ['html2pdf.js'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 400,
    // Minification settings for smaller bundles
    minify: 'esbuild',
    target: 'es2020',
    // Additional optimizations
    cssCodeSplit: true,
    sourcemap: false,
    // Reduce bundle size
    reportCompressedSize: true,
  },
}));
