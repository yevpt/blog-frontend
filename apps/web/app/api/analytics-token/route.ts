// Collect token 重签端点（token oracle）：任何同源请求都能取到一枚有效 collect token。
// 这是可接受的权衡——collect token 只是“抬高门槛”的信号，真正的反伪造防线在后端：
// Origin 白名单 + 限流 + bot 过滤。本端点靠同源约束 + no-store 把门槛维持在合理水平。
// 用途：tracker 在长会话中定时来此重签，避免 SSR token 过期被判 suspect 导致 PV/UV 漏计。
import { signAnalyticsCollectToken } from "@/lib/analytics-token";

const DEFAULT_TTL_MS = 300000; // 5 分钟，须与后端 analytics.collect_token_ttl 一致

export async function GET(): Promise<Response> {
  const token = signAnalyticsCollectToken() ?? null;

  // 防御 NaN：非法的 TTL 环境变量回退到默认值（R-TTLNAN）。
  const parsed = Number(process.env.ANALYTICS_COLLECT_TOKEN_TTL_MS ?? String(DEFAULT_TTL_MS));
  const ttlMs = Number.isNaN(parsed) ? DEFAULT_TTL_MS : parsed;

  return Response.json({ token, ttlMs }, { headers: { "Cache-Control": "no-store" } });
}
