import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import path from "path";
// https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/api-kong": {
        target: "https://kong.traffy.in.th",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-kong/, ""),
      },
      "/api-neo": {
        target: "https://neo-fondue.traffy.in.th",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-neo/, ""),
      },
      "/api-traffy": {
        target: "https://api.traffy.in.th",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-traffy/, ""),
      },
    },

  },
});

