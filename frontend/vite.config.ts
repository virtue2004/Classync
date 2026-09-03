import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// host: true lets other devices on the LAN reach the dev server, not just localhost
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5500 },
});
