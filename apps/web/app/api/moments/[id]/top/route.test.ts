import { describe, it, expect, vi } from "vitest";

const proxyDelete = vi.fn();
const proxyPost = vi.fn();

vi.mock("@/lib/backend-proxy", () => ({
  proxyDelete: (...args: unknown[]) => proxyDelete(...args),
  proxyPost: (...args: unknown[]) => proxyPost(...args),
}));

import { DELETE, POST } from "./route";

describe("/api/moments/:id/top", () => {
  it("POST 委托给 proxyPost 转发到 /moments/:id/top 且不转发 body", async () => {
    proxyPost.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as unknown as Parameters<typeof POST>[0];
    const params = Promise.resolve({ id: "9" });

    await POST(req, { params });

    expect(proxyPost).toHaveBeenCalledWith(req, "/moments/9/top", { hasBody: false });
  });

  it("DELETE 委托给 proxyDelete 转发到 /moments/:id/top", async () => {
    proxyDelete.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as unknown as Parameters<typeof DELETE>[0];
    const params = Promise.resolve({ id: "9" });

    await DELETE(req, { params });

    expect(proxyDelete).toHaveBeenCalledWith(req, "/moments/9/top");
  });
});
