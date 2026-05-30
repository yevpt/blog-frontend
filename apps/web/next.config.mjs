/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/hooks", "@repo/styles"],
};

export default nextConfig;
