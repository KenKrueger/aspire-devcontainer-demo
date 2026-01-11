import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import optimizeLocales from "@react-aria/optimize-locales-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      ...optimizeLocales.vite({
        locales: ["en-US"],
      }),
      enforce: "pre",
    },
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Proxy API calls to the app service
      "/api": {
        target: process.env.SERVER_HTTPS || process.env.SERVER_HTTP,
        changeOrigin: true,
      },
    },
  },
});
