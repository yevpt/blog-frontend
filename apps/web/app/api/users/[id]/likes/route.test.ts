import { describe, it, expect, vi } from "vitest";

const proxyGet = vi.fn();

vi.mock("@/lib/backend-proxy", () => ({
  proxyGet: (...args: unknown[]) => proxyGet(...args),
}));

describe("GET /api/users/[id]/likes", () => {
  it("委托给 proxyGet 转发到 /users/:id/likes", async () => {
    proxyGet.mockResolvedValue(new Response(null, { status: 200 }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/users/3/likes?page=1&page_size=20");
    await GET(req as never, { params: Promise.resolve({ id: "3" }) });

    expect(proxyGet).toHaveBeenCalledWith(req, "/users/3/likes");
  });
});
