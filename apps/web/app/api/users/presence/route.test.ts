import { describe, it, expect, vi } from "vitest";

const proxyGet = vi.fn();

vi.mock("@/lib/backend-proxy", () => ({
  proxyGet: (...args: unknown[]) => proxyGet(...args),
}));

describe("GET /api/users/presence", () => {
  it("委托给 proxyGet 转发到 /users/presence", async () => {
    proxyGet.mockResolvedValue(new Response(null, { status: 200 }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/users/presence?ids=1,2,3");
    await GET(req as never);

    expect(proxyGet).toHaveBeenCalledWith(req, "/users/presence");
  });
});
