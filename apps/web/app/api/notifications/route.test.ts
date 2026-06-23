import { describe, expect, it, vi } from "vitest";

const proxyGet = vi.fn();

vi.mock("@/lib/backend-proxy", () => ({
  proxyGet: (...args: unknown[]) => proxyGet(...args),
}));

import { GET } from "./route";

describe("GET /api/notifications", () => {
  it("委托给 proxyGet 转发到 /notifications", async () => {
    proxyGet.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as unknown as Parameters<typeof GET>[0];

    await GET(req);

    expect(proxyGet).toHaveBeenCalledWith(req, "/notifications");
  });
});
