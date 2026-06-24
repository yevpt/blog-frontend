import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const proxyPostForm = vi.fn();

vi.mock("@/lib/backend-proxy", () => ({
  proxyPostForm: (...args: unknown[]) => proxyPostForm(...args),
}));

describe("POST /api/uploads/temp", () => {
  beforeEach(() => {
    proxyPostForm.mockReset();
    proxyPostForm.mockResolvedValue(new Response(JSON.stringify({ key: "k", url: "u" })));
  });

  it("代理到后端 /uploads/temp", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/uploads/temp", { method: "POST" });

    await POST(req);

    expect(proxyPostForm).toHaveBeenCalledWith(req, "/uploads/temp");
  });
});
