import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// النشر تحت مسار فرعي ممكن؛ يُضبط عبر متغيّر البيئة BASE_PATH عند الحاجة.
const base = process.env.BASE_PATH || "./";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,json,svg,webp,png}"],
        // الخطوط وقشرة التطبيق تُخزَّن مباشرة؛ الأصول الثقيلة عند الطلب.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "nafra-images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: "النّفرة — سيرة الرِّكيب",
        short_name: "النّفرة",
        description:
          "سيرة نفرة أهل الرِّكيب لشراء محوّل الكهرباء — كتاب رقمي بتجربة تقليب حقيقية.",
        lang: "ar",
        dir: "rtl",
        display: "standalone",
        orientation: "portrait",
        background_color: "#efe7db",
        theme_color: "#efe7db",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  build: {
    target: "es2019",
  },
});
