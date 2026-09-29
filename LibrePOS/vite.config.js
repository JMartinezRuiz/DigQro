import { defineConfig } from "vite";
import { createSyncMiddleware } from "./sync-store.js";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
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
