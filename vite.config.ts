import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
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
        // Use index.html as fallback for SPA navigation (React Router handles routing)
        navigateFallback: "/index.html",
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
    // Enable module preload polyfill for better browser support
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        // Dynamic chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          // Core React ecosystem - MUST stay together to avoid initialization errors
          if (
            id.includes('node_modules/react/') || 
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
          
          // All Radix UI components together (they share internal dependencies)
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-ui';
          }
          
          // React-dependent UI libraries - keep with UI to avoid circular deps
          if (
            id.includes('node_modules/sonner') ||
            id.includes('node_modules/vaul') ||
            id.includes('node_modules/cmdk') ||
            id.includes('node_modules/next-themes') ||
            id.includes('node_modules/react-day-picker') ||
            id.includes('node_modules/embla-carousel') ||
            id.includes('node_modules/input-otp') ||
            id.includes('node_modules/react-resizable-panels') ||
            id.includes('node_modules/react-error-boundary') ||
            id.includes('node_modules/react-helmet-async')
          ) {
            return 'vendor-ui';
          }
          
          // Data layer - Supabase & TanStack Query
          if (id.includes('node_modules/@supabase/') || id.includes('node_modules/@tanstack/')) {
            return 'vendor-data';
          }
          
          // Forms
          if (
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/@hookform/') ||
            id.includes('node_modules/zod')
          ) {
            return 'vendor-forms';
          }
          
          // Animations
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          
          // Charts - lazy loaded
          if (
            id.includes('node_modules/recharts') ||
            id.includes('node_modules/d3-') ||
            id.includes('node_modules/victory-')
          ) {
            return 'vendor-charts';
          }
          
          // PDF/Export - lazy loaded
          if (
            id.includes('node_modules/jspdf') ||
            id.includes('node_modules/jszip') ||
            id.includes('node_modules/pako')
          ) {
            return 'vendor-pdf';
          }
          
          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }
          
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          
          // Small utilities - keep together
          if (
            id.includes('node_modules/clsx') ||
            id.includes('node_modules/tailwind-merge') ||
            id.includes('node_modules/class-variance-authority')
          ) {
            return 'vendor-utils';
          }
          
          // DnD - admin only
          if (id.includes('node_modules/@dnd-kit/')) {
            return 'vendor-dnd';
          }
          
          // QR Code
          if (id.includes('node_modules/qrcode')) {
            return 'vendor-qr';
          }
          
          // Confetti
          if (id.includes('node_modules/canvas-confetti')) {
            return 'vendor-confetti';
          }
          
          // All other node_modules - let Vite handle automatically
          // This avoids circular dependency issues
        },
      },
      // Tree-shaking optimization
      treeshake: {
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
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
