import { describe, it, expect, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { signAnalyticsCollectToken } from "./analytics-token";

const SECRET_KEY = "ANALYTICS_COLLECT_TOKEN_SECRET";
const TTL_KEY = "ANALYTICS_COLLECT_TOKEN_TTL_MS";

afterEach(() => {
  delete process.env[SECRET_KEY];
  delete process.env[TTL_KEY];
});

describe("signAnalyticsCollectToken", () => {
  it("未配置 secret 时返回 undefined（后端按空 secret 放行）", () => {
    delete process.env[SECRET_KEY];
    expect(signAnalyticsCollectToken()).toBeUndefined();
  });

  it("生成 payload.sig 两段式 token，exp 为 unix 秒且含 5 分钟 TTL", () => {
    process.env[SECRET_KEY] = "s3cr3t";
    const now = new Date("2026-06-26T00:00:00.000Z");
    const token = signAnalyticsCollectToken(now)!;

    const parts = token.split(".");
    expect(parts).toHaveLength(2);
    expect(parts[0]).not.toBe("");
    expect(parts[1]).not.toBe("");
    // base64url 无填充：不含 '='、'+'、'/'
    expect(token).not.toMatch(/[=+/]/);

    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    expect(payload.aud).toBe("analytics_collect");
    expect(payload.exp).toBe(Math.floor((now.getTime() + 300000) / 1000));
  });

  it("尊重 ANALYTICS_COLLECT_TOKEN_TTL_MS 覆盖默认 TTL", () => {
    process.env[SECRET_KEY] = "s3cr3t";
    process.env[TTL_KEY] = "60000";
    const now = new Date("2026-06-26T00:00:00.000Z");
    const token = signAnalyticsCollectToken(now)!;
    const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
    expect(payload.exp).toBe(Math.floor((now.getTime() + 60000) / 1000));
  });

  // 跨仓契约：复刻后端 Go 校验算法（RawURLEncoding base64url + HMAC-SHA256(secret, 编码后的 payload 字符串)）。
  it("产出的 token 可被等价于后端 collect_token.go 的算法验证通过", () => {
    const secret = "shared-with-backend";
    process.env[SECRET_KEY] = secret;
    const now = new Date("2026-06-26T00:00:00.000Z");
    const token = signAnalyticsCollectToken(now)!;

    const [encodedPayload, sig] = token.split(".");
    // 后端：signCollectTokenPayload = RawURLEncoding(HMAC-SHA256(secret, parts[0]))
    const expectedSig = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
    expect(sig).toBe(expectedSig);

    // 后端：base64.RawURLEncoding.DecodeString(parts[0]) → JSON → 校验 aud 与 exp
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    expect(payload.aud).toBe("analytics_collect");
    expect(now.getTime() / 1000).toBeLessThanOrEqual(payload.exp); // 未过期
  });
});
