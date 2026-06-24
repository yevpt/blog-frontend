import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "./route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  it("注册成功时写入 Cookie 并仅向客户端返回 user", async () => {
    const formData = new FormData();
    formData.append("email", "user@example.com");
    formData.append("password", "password1");
    formData.append("code", "123456");

    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "ok",
          data: {
            access_token: "acc",
            refresh_token: "ref",
            expires_in: 7200,
            user: { id: 1, username: "user@example.com", nickname: "Alice" },
          },
        }),
        { status: 200 },
      ),
    );

    const req = {
      formData: async () => formData,
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(json).toEqual({
      code: 0,
      message: "ok",
      data: { user: { id: 1, username: "user@example.com", nickname: "Alice" } },
    });
    expect(res.cookies.get("access_token")?.value).toBe("acc");
    expect(res.cookies.get("refresh_token")?.value).toBe("ref");
  });

  it("后端未返回 user 时从 JWT 与表单邮箱补全", async () => {
    const formData = new FormData();
    formData.append("email", "user@example.com");
    formData.append("password", "password1");
    formData.append("code", "123456");
    formData.append("nickname", "Bob");

    const accessToken = "eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOjcsInR5cGUiOiJhY2Nlc3MifQ.signature";

    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "ok",
          data: {
            access_token: accessToken,
            refresh_token: "ref",
            expires_in: 7200,
          },
        }),
        { status: 200 },
      ),
    );

    const req = {
      formData: async () => formData,
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(json.data.user).toEqual({
      id: 7,
      username: "user@example.com",
      email: "user@example.com",
      nickname: "Bob",
    });
  });
});
