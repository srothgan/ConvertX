import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const backendOrigin = process.env.CONVERTX_API_ORIGIN ?? "http://localhost:3000";

const backendPaths = [
  "/account",
  "/api",
  "/choose-converter",
  "/convert",
  "/conversions",
  "/delete",
  "/download",
  "/logoff",
  "/progress",
  "/register",
  "/setup",
  "/upload"
];

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: Object.fromEntries(
      backendPaths.map((path) => [
        path,
        {
          target: backendOrigin,
          changeOrigin: true
        }
      ])
    )
  }
});
