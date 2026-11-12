import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // 테스트는 개인 설정(.env.local의 실제 서버 주소)과 상관없이 항상 목 서버만 쓴다
    env: { VITE_API_BASE: "" },
  },
});
