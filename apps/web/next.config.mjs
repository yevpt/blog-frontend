import { getDevAllowedOrigins } from "./config/allowed-dev-origins.mjs";

/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/icons", "@repo/hooks", "@repo/styles", "@repo/editor"],
  allowedDevOrigins: getDevAllowedOrigins(),
  images: {
    // Mock 阶段使用的外部图片域名，正式接入后端后替换为真实 CDN 域名
    remotePatterns: [
      { hostname: "picsum.photos" },
      { hostname: "i.pravatar.cc" },
      { hostname: "blog-oss.yevpt.com" },
    ],
  },
};

export default nextConfig;
