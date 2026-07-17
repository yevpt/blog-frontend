// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.stubEnv("API_BASE_URL", "http://mock-backend");

// mock next/headers 的 cookies()，返回可控 cookie
const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value ? { name, value } : undefined;
    },
  }),
}));

import { createServerApiClient } from "./server-api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createServerApiClient SSR 兜底续期", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("access token 失效导致 /users/me 401 时，用 refresh token 续期并重试成功", async () => {
    cookieStore.set("access_token", "expired-access");
    cookieStore.set("refresh_token", "valid-refresh");

    vi.mocked(fetch)
      // 首次 /users/me → 401
      .mockResolvedValueOnce(jsonResponse({ message: "unauthorized" }, 401))
      // /auth/refresh → 新双 token
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          message: "ok",
          data: { access_token: "new-access", refresh_token: "new-refresh", expires_in: 7200 },
        }),
      )
      // 重试 /users/me → 200 带 profile
      .mockResolvedValueOnce(
        jsonResponse({ code: 0, message: "ok", data: { id: 42, avatar_url: "http://cdn/a.png" } }),
      );

    const api = await createServerApiClient();
    const profile = await api.users.getMe();

    expect(profile.avatar_url).toBe("http://cdn/a.png");
    // 第二次调用命中 /auth/refresh
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe("http://mock-backend/auth/refresh");
  });
});
