import { describe, it, expect, vi, beforeEach } from "vitest";

const proxyPatch = vi.fn();
vi.mock("@/lib/backend-proxy", () => ({ proxyPatch: (...a: unknown[]) => proxyPatch(...a) }));

import { PATCH } from "./route";

describe("PATCH /api/notifications/[id]/read", () => {
  beforeEach(() => vi.clearAllMocks());
  it("转发到 /notifications/{id}/read", async () => {
    const req = {} as never;
    await PATCH(req, { params: Promise.resolve({ id: "9" }) });
    expect(proxyPatch).toHaveBeenCalledWith(req, "/notifications/9/read");
  });
});
