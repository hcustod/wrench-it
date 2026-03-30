import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        // Spring Boot API default in services/api (local dev). Docker static www uses 8081; run API on 8080 when using Vite.
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});