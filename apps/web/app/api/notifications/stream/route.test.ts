import { describe, expect, it, vi } from "vitest";

const proxySseGet = vi.fn();

vi.mock("@/lib/backend-proxy", () => ({
  proxySseGet: (...args: unknown[]) => proxySseGet(...args),
}));

import { GET } from "./route";

describe("GET /api/notifications/stream", () => {
  it("委托给 proxySseGet 转发到 /notifications/stream", async () => {
    proxySseGet.mockResolvedValue(new Response(null, { status: 200 }));
    const req = {} as unknown as Parameters<typeof GET>[0];

    await GET(req);

    expect(proxySseGet).toHaveBeenCalledWith(req, "/notifications/stream");
  });
});
