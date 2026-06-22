import { describe, it, expect, vi } from "vitest";

const proxyDelete = vi.fn();

vi.mock("@/lib/backend-proxy", () => ({
  proxyDelete: (...args: unknown[]) => proxyDelete(...args),
}));

import { DELETE } from "./route";

describe("DELETE /api/moments/:id", () => {
  it("委托给 proxyDelete 转发到 /moments/:id", async () => {
    proxyDelete.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as unknown as Parameters<typeof DELETE>[0];
    const params = Promise.resolve({ id: "9" });

    await DELETE(req, { params });

    expect(proxyDelete).toHaveBeenCalledWith(req, "/moments/9");
  });
});
