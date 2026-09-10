import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { contentScan } from "./plugins/contentScan.ts";

export default defineConfig({
  plugins: [react(), tailwindcss(), contentScan()],
});
