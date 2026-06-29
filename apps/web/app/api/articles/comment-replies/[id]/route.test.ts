// apps/web/app/api/articles/comment-replies/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const proxyDelete = vi.fn();
const proxyPatch = vi.fn();

vi.mock("@/lib/backend-proxy", () => ({
  proxyDelete: (...args: unknown[]) => proxyDelete(...args),
  proxyPatch: (...args: unknown[]) => proxyPatch(...args),
}));

import { DELETE, PATCH } from "./route";

describe("/api/articles/comment-replies/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DELETE 委托给 proxyDelete 转发到 /articles/comment-replies/{id}", async () => {
    proxyDelete.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as never;
    const params = Promise.resolve({ id: "9" });

    await DELETE(req, { params });

    expect(proxyDelete).toHaveBeenCalledWith(req, "/articles/comment-replies/9");
  });

  it("PATCH 委托给 proxyPatch 转发到 /articles/comment-replies/{id}（Idempotency-Key 由公共代理透传）", async () => {
    proxyPatch.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as never;
    const params = Promise.resolve({ id: "9" });

    await PATCH(req, { params });

    expect(proxyPatch).toHaveBeenCalledWith(req, "/articles/comment-replies/9");
  });
});
