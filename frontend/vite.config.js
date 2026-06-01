import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  // dev  → "/"            (Vite dev server at localhost)
  // build for Vercel → "/"  (served from domain root)
  // build for Django → "/static/react/"  (set VITE_TARGET=django)
  base: command === "build" && process.env.VITE_TARGET === "django"
    ? "/static/react/"
    : "/",
  build: {
    outDir: "static/react",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/media": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/static": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/logout": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://127.0.0.1:8000",
        ws: true,
      },
    },
  },
}));
