// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { GET } from "./route";

const SECRET_KEY = "ANALYTICS_COLLECT_TOKEN_SECRET";
const TTL_KEY = "ANALYTICS_COLLECT_TOKEN_TTL_MS";

afterEach(() => {
  delete process.env[SECRET_KEY];
  delete process.env[TTL_KEY];
});

describe("GET /api/analytics-token", () => {
  it("配置 secret 时返回非空 token 字符串、ttlMs 数字与 no-store", async () => {
    process.env[SECRET_KEY] = "s3cr3t";
    const res = await GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { token: string | null; ttlMs: number };
    expect(typeof body.token).toBe("string");
    expect(body.token).not.toBe("");
    expect(typeof body.ttlMs).toBe("number");
  });

  it("未配置 secret 时 token 为 null（后端按空 secret 放行）", async () => {
    delete process.env[SECRET_KEY];
    const res = await GET();
    const body = (await res.json()) as { token: string | null; ttlMs: number };
    expect(body.token).toBeNull();
    expect(body.ttlMs).toBe(300000);
  });

  it("TTL 环境变量为 NaN 时回退到 300000（R-TTLNAN）", async () => {
    process.env[SECRET_KEY] = "s3cr3t";
    process.env[TTL_KEY] = "not-a-number";
    const res = await GET();
    const body = (await res.json()) as { token: string | null; ttlMs: number };
    expect(body.ttlMs).toBe(300000);
  });

  it("尊重合法的 TTL 覆盖", async () => {
    process.env[TTL_KEY] = "60000";
    const res = await GET();
    const body = (await res.json()) as { ttlMs: number };
    expect(body.ttlMs).toBe(60000);
  });
});
