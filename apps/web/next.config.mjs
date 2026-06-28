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
  images: {
    loader: "custom",
    loaderFile: "./lib/blog-image-loader.ts",
    remotePatterns: optimizedImageHosts.map((hostname) => ({ hostname })),
  },
};

export default nextConfig;
