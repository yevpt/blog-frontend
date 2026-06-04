import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

describe("POST /api/captcha/register/challenge", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  it("透传 Go 后端注册图形验证码挑战", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({
          code: 0,
          message: "ok",
          data: { challenge_id: "challenge-id" },
        }),
    } as Response);

    const res = await POST();
    const body = await res.json();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/captcha/register/challenge",
      expect.objectContaining({ method: "POST" }),
    );
    expect(body.data.challenge_id).toBe("challenge-id");
  });
});
