import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("POST /api/captcha/register/verify", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  it("透传 Go 后端注册图形验证码校验", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({
          code: 0,
          message: "ok",
          data: { captcha_token: "captcha-token" },
        }),
    } as Response);

    const req = new NextRequest("http://localhost/api/captcha/register/verify", {
      method: "POST",
      body: JSON.stringify({ challenge_id: "challenge-id", x: 160, y: 80 }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/captcha/register/verify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ challenge_id: "challenge-id", x: 160, y: 80 }),
      }),
    );
    expect(body.data.captcha_token).toBe("captcha-token");
  });
});
