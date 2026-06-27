import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDevAllowedOrigins } from "./config/allowed-dev-origins.mjs";
import optimizedImageHosts from "./config/optimized-image-hosts.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: [
    "@repo/ui",
    "@repo/icons",
    "@repo/hooks",
    "@repo/styles",
    "@repo/editor",
    "@repo/markdown",
    "@repo/tracker",
  ],
  allowedDevOrigins: [...getDevAllowedOrigins(), "www.yevpt.com"],
  experimental: {
    // 默认 7s：拉取 OSS 原图 + sharp 转码易超时；放宽 sharp 阶段上限
    imgOptTimeoutInSeconds: 30,
  },
  images: {
    // 优化结果缓存 24h，避免同一 OSS 图反复拉取+转码
    minimumCacheTTL: 86400,
    remotePatterns: optimizedImageHosts.map((hostname) => ({ hostname })),
  },
};

export default nextConfig;
