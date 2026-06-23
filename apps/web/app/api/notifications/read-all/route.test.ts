import { describe, it, expect, vi, beforeEach } from "vitest";

const proxyPost = vi.fn();
vi.mock("@/lib/backend-proxy", () => ({ proxyPost: (...a: unknown[]) => proxyPost(...a) }));

import { POST } from "./route";

describe("POST /api/notifications/read-all", () => {
  beforeEach(() => vi.clearAllMocks());
  it("转发到 /notifications/read-all", async () => {
    const req = {} as never;
    await POST(req);
    expect(proxyPost).toHaveBeenCalledWith(req, "/notifications/read-all");
  });
});
