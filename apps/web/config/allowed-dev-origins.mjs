import os from "node:os";

/** 常见私有网段，覆盖局域网真机调试场景 */
const PRIVATE_NETWORK_PATTERNS = ["192.168.*.*", "10.*.*.*", "*.local"];

/** @param {import('node:os').NetworkInterfaceInfo} iface */
function isPublicIPv4(iface) {
  const isIPv4 = iface.family === "IPv4" || iface.family === 4;
  return isIPv4 && !iface.internal;
}

/**
 * 开发模式 allowedDevOrigins：本机 LAN IP + 私有网段通配符。
 * Next.js 16 默认拦截跨域访问 /_next/*，局域网访问 dev 时必须配置。
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 */
export function getDevAllowedOrigins() {
  const origins = new Set(PRIVATE_NETWORK_PATTERNS);

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const iface of interfaces ?? []) {
      if (isPublicIPv4(iface)) {
        origins.add(iface.address);
      }
    }
  }

  return [...origins];
}
