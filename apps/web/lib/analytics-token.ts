import { createHmac } from "node:crypto";

// 与后端 internal/service/analytics/collect_token.go 严格对齐的 audience 常量。
const AUD = "analytics_collect";
const DEFAULT_TTL_MS = 300000; // 5 分钟，须与后端 analytics.collect_token_ttl 一致

function b64url(input: Buffer | string): string {
  // Node base64url 为无填充编码，对应后端 base64.RawURLEncoding。
  return Buffer.from(input).toString("base64url");
}

// 在 SSR（服务端）签发短期 collect token：token = base64url(payload) + "." + base64url(HMAC)。
// secret 须与后端 BLOG_ANALYTICS_COLLECT_TOKEN_SECRET 相同；未配置时返回 undefined，后端按空 secret 放行。
export function signAnalyticsCollectToken(now = new Date()): string | undefined {
  const secret = process.env.ANALYTICS_COLLECT_TOKEN_SECRET;
  if (!secret) return undefined;

  const ttlMs = Number(process.env.ANALYTICS_COLLECT_TOKEN_TTL_MS ?? String(DEFAULT_TTL_MS));
  // exp 为 unix 秒（与后端 collectTokenPayload.Exp int64 对齐）。
  const exp = Math.floor((now.getTime() + ttlMs) / 1000);
  const payload = b64url(JSON.stringify({ aud: AUD, exp }));
  // HMAC 输入是编码后的 payload 字符串本身，而非原始 JSON 字节（与后端一致）。
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
