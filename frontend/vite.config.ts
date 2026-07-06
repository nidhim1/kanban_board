import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy API calls to our Go backend during development.
    // When the React app calls /api/tasks, Vite forwards it to localhost:8080/api/tasks. This avoids CORS issues in development and mimics the production setup where both frontend and API share the same domain.
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});