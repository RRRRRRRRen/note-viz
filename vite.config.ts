import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { contentScan } from "./plugins/contentScan.ts";

export default defineConfig({
  resolve: {
    // @ 别名单一来源在 tsconfig.json paths，这里开启 Vite 8 原生读取
    tsconfigPaths: true,
  },
  plugins: [react(), tailwindcss(), contentScan()],
});
