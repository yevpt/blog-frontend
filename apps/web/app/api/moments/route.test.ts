import { describe, it, expect, vi } from "vitest";

const proxyPostForm = vi.fn();
vi.mock("@/lib/backend-proxy", () => ({ proxyPostForm: (...a: unknown[]) => proxyPostForm(...a) }));

import { POST } from "./route";

describe("POST /api/moments", () => {
  it("委托给 proxyPostForm 转发到 /moments", async () => {
    proxyPostForm.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as unknown as Parameters<typeof POST>[0];
    await POST(req);
    expect(proxyPostForm).toHaveBeenCalledWith(req, "/moments");
  });
});
