import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "./route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.API_BASE_URL = "http://localhost:8080";
  });

  it("注册成功时写入 Cookie 并仅向客户端返回 user", async () => {
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
      headers: new Headers({ "content-type": "multipart/form-data; boundary=test" }),
      body: new ReadableStream(),
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

  it("后端未返回 user 时从 JWT 补全 id", async () => {
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
      headers: new Headers({ "content-type": "multipart/form-data; boundary=test" }),
      body: new ReadableStream(),
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(json.data.user).toEqual({
      id: 7,
      username: "",
      email: undefined,
      nickname: undefined,
    });
  });
});
