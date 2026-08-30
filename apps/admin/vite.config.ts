import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

const DEFAULT_CHUNK_LIMIT_BYTES = 500_000;
const HEIC_DECODER_CHUNK_LIMIT_BYTES = 1_400_000;

function chunkSizeBudgetPlugin(): Plugin {
  return {
    name: "admin-chunk-size-budget",
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk" || output.code.length <= DEFAULT_CHUNK_LIMIT_BYTES) continue;

        // heic2any 自带 WASM 解码器，只在上传 HEIC 时动态加载，单独保留更高预算。
        const isHeicDecoder = Object.keys(output.modules).some((id) =>
          /[\\/]node_modules[\\/]heic2any[\\/]/.test(id),
        );
        if (isHeicDecoder && output.code.length <= HEIC_DECODER_CHUNK_LIMIT_BYTES) continue;

        this.error(
          `Chunk "${output.fileName}" exceeds the Admin bundle budget (${output.code.length} bytes).`,
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_DEV_BACKEND_URL || "http://localhost:8080";

  return {
    plugins: [react(), chunkSizeBudgetPlugin()],
    build: {
      chunkSizeWarningLimit: HEIC_DECODER_CHUNK_LIMIT_BYTES / 1000,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "prosemirror",
                test: /[\\/]node_modules[\\/]prosemirror-[^\\/]+[\\/]/,
                priority: 30,
              },
              {
                name: "tiptap",
                test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
                priority: 20,
              },
              {
                name: "charts",
                test: /[\\/]node_modules[\\/](?:recharts|victory-vendor|d3-[^\\/]+)[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      // 开发态 API 走同源 /api 代理，避免局域网设备访问时 localhost 指向自身
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
