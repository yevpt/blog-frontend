import { describe, it, expect, vi } from "vitest";

const proxyDelete = vi.fn();
const proxyPost = vi.fn();

vi.mock("@/lib/backend-proxy", () => ({
  proxyDelete: (...args: unknown[]) => proxyDelete(...args),
  proxyPost: (...args: unknown[]) => proxyPost(...args),
}));

import { DELETE, POST } from "./route";

describe("/api/admin/users/:id/roles/vip", () => {
  it("POST 委托给 proxyPost 转发到 /admin/users/:id/roles/vip", async () => {
    proxyPost.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as unknown as Parameters<typeof POST>[0];
    const params = Promise.resolve({ id: "42" });

    await POST(req, { params });

    expect(proxyPost).toHaveBeenCalledWith(req, "/admin/users/42/roles/vip", { hasBody: false });
  });

  it("DELETE 委托给 proxyDelete 转发到 /admin/users/:id/roles/vip", async () => {
    proxyDelete.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as unknown as Parameters<typeof DELETE>[0];
    const params = Promise.resolve({ id: "42" });

    await DELETE(req, { params });

    expect(proxyDelete).toHaveBeenCalledWith(req, "/admin/users/42/roles/vip");
  });
});
