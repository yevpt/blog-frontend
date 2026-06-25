import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDevAllowedOrigins } from "./config/allowed-dev-origins.mjs";

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
  images: {
    remotePatterns: [
      { hostname: "picsum.photos" },
      { hostname: "i.pravatar.cc" },
      { hostname: "blog-oss.yevpt.com" },
      { hostname: "garage-s3-local-api.yevpt.com" },
      { hostname: "api.dicebear.com" },
    ],
  },
};

export default nextConfig;
