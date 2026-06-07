import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const backendOrigin = process.env.CONVERTX_API_ORIGIN ?? "http://localhost:3000";

const backendPaths = ["/api", "/download", "/archive", "/health", "/outpost.goauthentik.io"];

const productionAliases = {
  "react-dom/server": "react-dom/server.node",
  "react-dom/static": "react-dom/static.node",
};

export default defineConfig(({ command }) => ({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    ...(command === "build" ? { alias: productionAliases } : {}),
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: Object.fromEntries(
      backendPaths.map((path) => [
        path,
        {
          target: backendOrigin,
          changeOrigin: true,
        },
      ]),
    ),
  },
}));
