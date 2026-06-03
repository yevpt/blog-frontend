import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiClient } from "./client";
import { ApiError } from "./errors";

// 构造一个最小的 mock Response
function mockResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("createApiClient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  // ── 公开接口（不自动刷新）────────────────────────────────────────

  it("sendCode 调用正确的端点和参数", async () => {
    vi.mocked(global.fetch).mockResolvedValue(mockResponse({ code: 0, message: "ok", data: null }));
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.auth.sendCode({ email: "a@b.com" });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/auth/send-code",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "a@b.com" }),
      }),
    );
  });

  it("login 返回正确的 LoginResp", async () => {
    const loginResp = {
      access_token: "acc",
      refresh_token: "ref",
      expires_in: 7200,
      user: { id: 1, username: "vpt" },
    };
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: loginResp }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    const result = await client.auth.login({ identifier: "vpt", password: "pass" });
    expect(result).toEqual(loginResp);
  });

  it("code !== 0 时抛出 ApiError", async () => {
    vi.mocked(global.fetch).mockResolvedValue(mockResponse({ code: 400, message: "参数错误" }));
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await expect(client.auth.sendCode({ email: "bad" })).rejects.toThrow(ApiError);
    await expect(client.auth.sendCode({ email: "bad" })).rejects.toMatchObject({
      code: 400,
      message: "参数错误",
    });
  });

  // ── 认证接口（自动刷新）──────────────────────────────────────────

  it("认证请求携带 Authorization header", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: "authed" }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "my-token",
    });

    // test.authed() uses fetchAuthed path
    await client.test.authed();
    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/test/authed",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer my-token" }),
      }),
    );
  });

  it("401 触发 token 刷新并重试原请求", async () => {
    const newTokens = { access_token: "new-acc", refresh_token: "new-ref", expires_in: 7200 };
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(mockResponse({ code: 401, message: "未登录" }, 401))
      .mockResolvedValueOnce(mockResponse({ code: 0, message: "ok", data: newTokens }))
      .mockResolvedValueOnce(mockResponse({ code: 0, message: "ok", data: "authed" }));

    const onTokenRefreshed = vi.fn();
    let currentToken = "expired-token";
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => currentToken,
      getRefreshToken: () => "valid-refresh",
      onTokenRefreshed: (tokens) => {
        currentToken = tokens.access_token;
        onTokenRefreshed(tokens);
      },
    });

    const result = await client.test.authed();
    expect(result).toBe("authed");
    expect(onTokenRefreshed).toHaveBeenCalledWith(newTokens);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("刷新失败时调用 onRefreshFailed 并抛出 ApiError", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(mockResponse({ code: 401, message: "未登录" }, 401))
      .mockResolvedValueOnce(mockResponse({ code: 401, message: "token 已过期" }, 401));

    const onRefreshFailed = vi.fn();
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "expired",
      getRefreshToken: () => "expired-refresh",
      onRefreshFailed,
    });

    await expect(client.test.authed()).rejects.toThrow(ApiError);
    expect(onRefreshFailed).toHaveBeenCalledOnce();
  });

  it("无 refresh token 时直接调用 onRefreshFailed", async () => {
    vi.mocked(global.fetch).mockResolvedValue(mockResponse({ code: 401, message: "未登录" }, 401));
    const onRefreshFailed = vi.fn();
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "expired",
      getRefreshToken: () => null,
      onRefreshFailed,
    });

    await expect(client.test.authed()).rejects.toThrow(ApiError);
    expect(onRefreshFailed).toHaveBeenCalledOnce();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // ── 文章与分类接口（公开，无需登录）────────────────────────────────

  it("articles.listPublic 无参数时调用 /articles", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 10, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.articles.listPublic();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/articles",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("articles.listPublic 带 category_id 和 page 时构造正确 query string", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 2, page_size: 10, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.articles.listPublic({ page: 2, category_id: 3 });

    const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/articles");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("category_id")).toBe("3");
  });

  it("articles.listPublic 带 recommend 和 page_size 时构造正确 query string", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 5, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.articles.listPublic({ page: 1, page_size: 5, recommend: true });

    const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/articles");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("page_size")).toBe("5");
    expect(url.searchParams.get("recommend")).toBe("true");
  });

  it("categories.listTabs 调用 /categories", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: { list: [] } }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.categories.listTabs();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/categories",
      expect.objectContaining({ method: "GET" }),
    );
  });

  // ── 碎语接口（公开，无需登录）────────────────────────────────────────

  it("moments.listPublic 无参数时调用 /moments", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 10, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.moments.listPublic();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/moments",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("moments.listPublic 带 page 和 page_size 时构造正确 query string", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 3, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.moments.listPublic({ page: 1, page_size: 3 });

    const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/moments");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("page_size")).toBe("3");
  });

  it("moments.listPublic 带 user_id 时构造正确 query string", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 10, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.moments.listPublic({ user_id: 2 });

    const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/moments");
    expect(url.searchParams.get("user_id")).toBe("2");
  });
});
