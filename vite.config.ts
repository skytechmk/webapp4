import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      visualizer({
        filename: 'dist/stats.html',
        open: env.VITE_BUILD_ANALYSIS === 'true',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // Enhanced visualization
        emitFile: true,
      }),
      // Add compression plugins for production builds
      ...(mode === 'production' ? [
        viteCompression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 10240, // Only compress files larger than 10KB
          deleteOriginFile: false,
        }),
        viteCompression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 10240, // Only compress files larger than 10KB
          deleteOriginFile: false,
        })
      ] : []),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'snapify-logo.png'],
        strategies: 'generateSW',
        srcDir: 'src',
        filename: 'sw.ts',
        devOptions: {
          enabled: true,
          type: 'module'
        },
        manifest: {
          name: 'SnapifY - Event Sharing',
          short_name: 'SnapifY',
          description: 'Seamlessly capture, share, and manage event memories.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: '/snapify-logo.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/snapify-logo.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/snapify-logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          share_target: {
            action: "/",
            method: "GET",
            enctype: "application/x-www-form-urlencoded",
            params: {
              title: "title",
              text: "text",
              url: "url"
            }
          },
          // File handling for PWA downloads
          file_handlers: [
            {
              action: '/handle-files',
              accept: {
                'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
                'video/*': ['.mp4', '.mov', '.avi', '.mkv']
              }
            }
          ],
          // Launch handler for file handling
          launch_handler: {
            client_mode: 'focus-existing'
          },
          // Handle links for better navigation
          handle_links: 'preferred',
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB limit instead of default 2 MB
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          // Fix for null revision issues - ensure proper revision hashing
          dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
          manifestTransforms: [
            (manifestEntries) => {
              return {
                manifest: manifestEntries.map(entry => {
                  // Ensure all entries have proper revisions
                  if (!entry.revision) {
                    // Generate a hash from the URL if no revision exists
                    const url = entry.url;
                    const hash = require('crypto').createHash('md5').update(url).digest('hex').substring(0, 8);
                    return { ...entry, revision: hash };
                  }
                  return entry;
                }),
                warnings: []
              };
            }
          ],
          runtimeCaching: [
            {
              // Cache API responses (event lists, user data) but NOT media URLs
              // Media URLs are presigned and expire in 1 hour, so caching them would cause broken images
              urlPattern: ({ url }) => url.pathname.startsWith('/api/') &&
                !url.pathname.includes('/api/proxy-media') &&
                !url.pathname.includes('/api/media'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'snapify-api-cache',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours for API responses
                },
                cacheableResponse: {
                  statuses: [0, 200]
                },
                backgroundSync: {
                  name: 'snapify-upload-queue',
                  options: {
                    maxRetentionTime: 24 * 60
                  }
                }
              }
            },
            {
              // Cache CDN resources like recharts, lucide-react, etc.
              urlPattern: ({ url }) => url.host.includes('aistudiocdn.com') || url.host.includes('cdn.jsdelivr.net'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'snapify-cdn-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days for CDN resources
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    build: {
      outDir: 'dist',
      sourcemap: env.VITE_SOURCE_MAP === 'true' ? 'hidden' : false,
      chunkSizeWarningLimit: 1000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: env.VITE_DROP_CONSOLE === 'true',
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
        },
        output: {
          comments: false,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) return 'vendor';
              if (id.includes('socket.io-client') || id.includes('lucide-react')) return 'libs';
              if (id.includes('recharts')) return 'charts';
              if (id.includes('qrcode.react')) return 'qrcode';
              if (id.includes('sharp') || id.includes('jszip') || id.includes('exif-js')) return 'utils';
              if (id.includes('jsonwebtoken') || id.includes('jwt-decode') || id.includes('google-auth-library')) return 'auth';
              if (id.includes('@aws-sdk')) return 'aws';
              // Default vendor chunk for other node_modules
              return 'vendor';
            }
          },
          // Enable better caching with content hash
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        }
      }
    },
    // Environment-aware configuration
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
      __ENVIRONMENT__: JSON.stringify(mode),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
    }
  };
});