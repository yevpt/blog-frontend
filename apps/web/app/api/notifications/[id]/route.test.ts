import { describe, it, expect, vi, beforeEach } from "vitest";

const proxyDelete = vi.fn();
vi.mock("@/lib/backend-proxy", () => ({ proxyDelete: (...a: unknown[]) => proxyDelete(...a) }));

import { DELETE } from "./route";

describe("DELETE /api/notifications/[id]", () => {
  beforeEach(() => vi.clearAllMocks());
  it("转发到 /notifications/{id}", async () => {
    const req = {} as never;
    await DELETE(req, { params: Promise.resolve({ id: "9" }) });
    expect(proxyDelete).toHaveBeenCalledWith(req, "/notifications/9");
  });
});
