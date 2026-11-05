import { defineConfig } from "vite";
import { createSyncMiddleware } from "./sync-store.js";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Replaces Vite's list, so it repeats its defaults. private-paths.js blocks the same folder earlier.
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.librepos/**"] },
  },
  plugins: [
    {
      name: "librepos-lan-sync",
      configureServer(server) {
        const middleware = createSyncMiddleware();
        server.middlewares.use(middleware);
        server.httpServer?.once('close', middleware.close);
      },
      configurePreviewServer(server) {
        const middleware = createSyncMiddleware();
        server.middlewares.use(middleware);
        server.httpServer?.once('close', middleware.close);
      },
    },
  ],
});
