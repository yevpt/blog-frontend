import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiClient } from "./client";
import { ApiError } from "./errors";
import type { ArticleDetailResp, ArticlePageResp } from "./types/article";

// 构造一个最小的 mock Response
function mockResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
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

    await client.auth.sendCode({ email: "a@b.com", captcha_token: "captcha-token" });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/auth/send-code",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "a@b.com", captcha_token: "captcha-token" }),
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

  it("register 使用 FormData 且不手动设置 JSON Content-Type", async () => {
    const loginResp = {
      access_token: "acc",
      refresh_token: "ref",
      expires_in: 7200,
      user: { id: 1, username: "user@example.com", nickname: "昵称" },
    };
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: loginResp }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });
    const avatar = new File(["avatar"], "avatar.jpg", { type: "image/jpeg" });

    const result = await client.auth.register({
      email: "user@example.com",
      password: "password1",
      code: "123456",
      nickname: "昵称",
      avatar,
    });

    expect(result.access_token).toBe("acc");
    expect(result.user.nickname).toBe("昵称");

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(init?.body).toBeInstanceOf(FormData);
    const body = init?.body as FormData;
    expect(body.get("email")).toBe("user@example.com");
    expect(body.get("password")).toBe("password1");
    expect(body.get("code")).toBe("123456");
    expect(body.get("nickname")).toBe("昵称");
    const avatarField = body.get("avatar");
    expect(avatarField).toBeInstanceOf(File);
    expect((avatarField as File).name).toBe("avatar.jpg");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("adminAuth.login 调用 /admin/auth/login 并返回 LoginResp", async () => {
    const loginResp = {
      access_token: "acc",
      refresh_token: "ref",
      expires_in: 7200,
      user: { id: 1, username: "admin" },
    };
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: loginResp }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    const result = await client.adminAuth.login({ username: "admin", password: "pass" });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "admin", password: "pass" }),
      }),
    );
    expect(result).toEqual(loginResp);
  });

  it("code !== 0 时抛出 ApiError", async () => {
    vi.mocked(global.fetch).mockResolvedValue(mockResponse({ code: 400, message: "参数错误" }));
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await expect(
      client.auth.sendCode({ email: "bad", captcha_token: "captcha-token" }),
    ).rejects.toThrow(ApiError);
    await expect(
      client.auth.sendCode({ email: "bad", captcha_token: "captcha-token" }),
    ).rejects.toMatchObject({
      code: 400,
      message: "参数错误",
    });
  });

  it("非 JSON 响应时抛出包含 HTTP 状态的 ApiError", async () => {
    vi.mocked(global.fetch).mockResolvedValue(mockResponse("404 page not found", 404));
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await expect(client.music.list()).rejects.toMatchObject({
      code: 404,
      message: "404 page not found",
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

  it("articles.listPublic 在存在 access token 时附带 Authorization header", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 10, list: [] },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "token123",
    });

    await client.articles.listPublic({ page: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/articles?page=1",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token123" }),
      }),
    );
  });

  it("articles.listPublic 保留嵌套用户头像 CDN 地址", async () => {
    const pageResp: ArticlePageResp = {
      total: 1,
      pages: 1,
      page: 1,
      page_size: 10,
      list: [
        {
          id: 1,
          title: "Test",
          user_id: 1,
          status: 1,
          comment_status: 1,
          read_count: 0,
          like_count: 0,
          is_liked: false,
          comment_count: 0,
          is_recommended: false,
          user: {
            id: 1,
            username: "vpt",
            nickname: "VPT",
            avatar_url: "https://blog-oss.yevpt.com/avatars/vpt.png",
          },
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
      ],
    };
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: pageResp }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    const result = await client.articles.listPublic();

    expect(result.list[0]?.user?.avatar_url).toBe("https://blog-oss.yevpt.com/avatars/vpt.png");
  });

  it("articles.listAdmin 使用 fetchAuthed 并构造 query string", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 10, list: [] },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.articles.listAdmin({
      page: 2,
      page_size: 10,
      recommend: false,
      category_id: 3,
      tag_id: 5,
      search: "Go",
      sort_by: "category",
      sort_order: "asc",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/articles?page=2&page_size=10&recommend=false&category_id=3&tag_id=5&search=Go&sort_by=category&sort_order=asc",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer admin-token" }),
      }),
    );
  });

  it("articles.deleteAdmin 使用 fetchAuthed 调用 DELETE /admin/articles/{id}", async () => {
    const detailResp: ArticleDetailResp = {
      id: 7,
      title: "Deleted",
      content: "body",
      user_id: 1,
      status: 1,
      comment_status: 1,
      read_count: 0,
      like_count: 0,
      comment_count: 0,
      is_recommended: false,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: detailResp }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    const result = await client.articles.deleteAdmin(7);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/articles/7",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ Authorization: "Bearer admin-token" }),
      }),
    );
    expect(result.id).toBe(7);
  });

  it("articles.toggleLike 使用 fetchAuthed 调用 /articles/{id}/like", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { is_liked: true, like_count: 9 },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "token123",
    });

    const result = await client.articles.toggleLike(7);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/articles/7/like",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token123" }),
      }),
    );
    expect(result).toEqual({ is_liked: true, like_count: 9 });
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

  it("categories.create 使用 fetchAuthed 调用 POST /admin/categories", async () => {
    const req = {
      name: "编程",
      icon: "icons/code.svg",
      description: "编程笔记",
      cover_img_url: "covers/code.jpg",
      seq: 0,
    };
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: { id: 1, ...req, article_count: 0 } }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.categories.create(req);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/categories",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(req),
        headers: expect.objectContaining({ Authorization: "Bearer admin-token" }),
      }),
    );
  });

  it("categories.update 使用 fetchAuthed 调用 PUT /admin/categories/{id}", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { id: 2, name: "生活", seq: 1, article_count: 3 },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.categories.update(2, { name: "生活", seq: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/categories/2",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "生活", seq: 1 }),
      }),
    );
  });

  it("categories.delete 使用 fetchAuthed 调用 DELETE /admin/categories/{id}", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { id: 3, name: "随笔", seq: 2, article_count: 0 },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.categories.delete(3);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/categories/3",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("categories.addArticles 使用 fetchAuthed 调用 POST /admin/categories/{id}/articles", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { category_id: 1, article_ids: [5, 6], affected_count: 2 },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.categories.addArticles(1, { article_ids: [5, 6] });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/categories/1/articles",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ article_ids: [5, 6] }),
      }),
    );
  });

  it("tags.list 调用 /tags", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: { list: [] } }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.tags.list();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/tags",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("tags.create 使用 fetchAuthed 调用 POST /admin/tags", async () => {
    const req = { name: "Go", seq: 0 };
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: { id: 1, ...req, article_count: 0 } }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.tags.create(req);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/tags",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(req),
        headers: expect.objectContaining({ Authorization: "Bearer admin-token" }),
      }),
    );
  });

  it("tags.update 使用 fetchAuthed 调用 PUT /admin/tags/{id}", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { id: 2, name: "TypeScript", seq: 1, article_count: 3 },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.tags.update(2, { name: "TypeScript", seq: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/tags/2",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "TypeScript", seq: 1 }),
      }),
    );
  });

  it("tags.delete 使用 fetchAuthed 调用 DELETE /admin/tags/{id}", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { id: 3, name: "React", seq: 2, article_count: 0 },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.tags.delete(3);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/tags/3",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("tags.addArticles 使用 fetchAuthed 调用 POST /admin/tags/{id}/articles", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { tag_id: 1, article_ids: [5, 6], affected_count: 2 },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.tags.addArticles(1, { article_ids: [5, 6] });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/tags/1/articles",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ article_ids: [5, 6] }),
      }),
    );
  });

  it("music.list 调用 /music", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: { list: [] } }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.music.list();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/music",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("music.listAdmin 使用 fetchAuthed 并构造 query string", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: { total: 0, list: [] } }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.music.listAdmin({ keyword: " rain ", page: 2, page_size: 30 });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/music?keyword=rain&page=2&page_size=30",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer admin-token" }),
      }),
    );
  });

  it("music.create 和 update 使用 JSON 请求体", async () => {
    vi.mocked(global.fetch).mockResolvedValue(mockResponse({ code: 0, message: "ok", data: null }));
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });
    const req = {
      name: "Ref:rain",
      artist_ids: [1],
      album_track_no: 1,
      audio_key: "temp/music/1/audio/a.mp3",
      audio_size: 1024,
      duration: 270,
      is_public: true,
      seq: 0,
    };

    await client.music.create(req);
    await client.music.update(7, req);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://api/admin/music",
      expect.objectContaining({ method: "POST", body: JSON.stringify(req) }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://api/admin/music/7",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(req) }),
    );
  });

  it("music.uploadAudio 使用 FormData 且不手动设置 JSON Content-Type", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: {
          key: "temp/music/1/audio/a.mp3",
          url: "https://cdn.example.com/a.mp3",
          size: 1024,
          mime: "audio/mpeg",
          hash: "hash",
        },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });
    const file = new File(["audio"], "a.mp3", { type: "audio/mpeg" });

    const result = await client.music.uploadAudio({ file });

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/music/uploads/audio",
      expect.objectContaining({ method: "POST" }),
    );
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBeInstanceOf(File);
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    expect(result.key).toBe("temp/music/1/audio/a.mp3");
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

  it("moments.listAdmin 使用后台动态查询路径并拼接筛选参数", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 1, pages: 1, page: 2, page_size: 20, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token" });

    await client.moments.listAdmin({
      page: 2,
      page_size: 20,
      status: "hidden",
      search: "风",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/moments?page=2&page_size=20&status=hidden&search=%E9%A3%8E",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
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

  it("moments.feed 构造 scope/sort 与分页 query string", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 10, list: [] },
      }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.moments.feed({ scope: "friends", sort: "hot", page: 2, page_size: 20 });

    const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.pathname).toBe("/moments/feed");
    expect(url.searchParams.get("scope")).toBe("friends");
    expect(url.searchParams.get("sort")).toBe("hot");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("page_size")).toBe("20");
  });

  it("moments.save 使用 fetchAuthed 调用 POST /moments", async () => {
    const moment = {
      id: 7,
      user_id: 1,
      content: "更新",
      status: 1,
      comment_status: 1,
      read_count: 0,
      is_top: false,
      like_count: 0,
      comment_count: 0,
      is_liked: false,
      images: [],
      created_at: "2026-05-30T09:00:00Z",
      updated_at: "2026-05-30T09:00:00Z",
    };
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: moment }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token" });

    await client.moments.save({
      id: 7,
      content: "更新",
      status: 1,
      comment_status: 1,
      image_urls: ["moments/a.jpg"],
      image_order: ["url:0"],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/moments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          id: 7,
          content: "更新",
          status: 1,
          comment_status: 1,
          image_urls: ["moments/a.jpg"],
          image_order: ["url:0"],
        }),
      }),
    );
  });

  it("moments.delete 使用 fetchAuthed 调用 DELETE /moments/{id}", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: { id: 7 } }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token" });

    await client.moments.delete(7);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/moments/7",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("moments.setTop 和 removeTop 调用置顶端点", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        mockResponse({ code: 0, message: "ok", data: { id: 7, is_top: true } }),
      )
      .mockResolvedValueOnce(
        mockResponse({ code: 0, message: "ok", data: { id: 7, is_top: false } }),
      );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token" });

    await client.moments.setTop(7);
    await client.moments.removeTop(7);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://api/moments/7/top",
      expect.objectContaining({ method: "POST" }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://api/moments/7/top",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  // ── 用户接口 ─────────────────────────────────────────────────────

  describe("users", () => {
    it("getMe 使用 fetchAuthed 调用 /users/me", async () => {
      const userDetail = {
        id: 1,
        username: "vpt",
        nickname: "VPT",
        email: "vpt@example.com",
        roles: ["admin"],
        status: 1,
      };
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: userDetail }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      const result = await client.users.getMe();

      expect(result).toEqual(userDetail);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/users/me",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ Authorization: "Bearer token123" }),
        }),
      );
    });

    // ── 账号安全：第三方绑定 ──────────────────────────────────────

    it("getProviders 使用 fetchPublic 调用 GET /oauth/providers 并返回字符串数组", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: ["github", "google"] }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

      const result = await client.users.getProviders();

      expect(result).toEqual(["github", "google"]);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/oauth/providers",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("getOAuthBindings 返回 { source, social_user_id } 结构", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({
          code: 0,
          message: "ok",
          data: [{ source: "github", social_user_id: 42 }],
        }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token" });

      const result = await client.users.getOAuthBindings();

      expect(result).toEqual([{ source: "github", social_user_id: 42 }]);
    });

    it("unbindOAuth 发 DELETE 到 /oauth/bindings/:source", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: null }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token" });

      await client.users.unbindOAuth("github");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/oauth/bindings/github"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("authorizeOAuthBind 拼接 action=bind 与编码后的 redirect_uri", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: { authorize_url: "https://gh/auth" } }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token" });

      const result = await client.users.authorizeOAuthBind(
        "github",
        "https://app.example.com/callback?x=1",
      );

      expect(result).toEqual({ authorize_url: "https://gh/auth" });
      const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      const url = new URL(calledUrl);
      expect(url.pathname).toBe("/oauth/github/authorize");
      expect(url.searchParams.get("action")).toBe("bind");
      expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.com/callback?x=1");
    });

    // ── 账号安全：邮箱与初始密码 ───────────────────────────────────

    it("sendAccountEmailCode 发 POST 到 /users/me/email/code 且携带 body", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: null }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token" });

      await client.users.sendAccountEmailCode({ email: "a@b.com", captcha_token: "cap" });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/users/me/email/code",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "a@b.com", captcha_token: "cap" }),
          headers: expect.objectContaining({ Authorization: "Bearer token" }),
        }),
      );
    });

    it("updateEmail 发 PATCH 到 /users/me/email，body 带 target/email/code", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: null }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token" });

      await client.users.updateEmail({ target: "main", email: "a@b.com", code: "123456" });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/users/me/email",
        expect.objectContaining({ method: "PATCH" }),
      );
      const [, init] = vi.mocked(global.fetch).mock.calls[0];
      expect(JSON.parse(init?.body as string)).toEqual({
        target: "main",
        email: "a@b.com",
        code: "123456",
      });
    });

    it("setInitialPassword 发 PATCH 到 /users/me/password/initial 且携带 body", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: null }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token" });

      await client.users.setInitialPassword({ new_password: "secret123", code: "654321" });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/users/me/password/initial",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ new_password: "secret123", code: "654321" }),
        }),
      );
    });

    it("listLikedContent 构造 /users/:id/likes 分页与 type 查询参数", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({
          code: 0,
          message: "ok",
          data: { total: 0, pages: 0, page: 2, page_size: 20, list: [] },
        }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => "token" });

      await client.users.listLikedContent(9, { page: 2, page_size: 20, type: "comment" });

      const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      const url = new URL(calledUrl);
      expect(url.pathname).toBe("/users/9/likes");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("page_size")).toBe("20");
      expect(url.searchParams.get("type")).toBe("comment");
      expect(global.fetch).toHaveBeenCalledWith(
        calledUrl,
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ Authorization: "Bearer token" }),
        }),
      );
    });

    it("getLikesCount 请求 GET /users/:id/likes/count", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: { count: 12 } }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

      const result = await client.users.getLikesCount(5);

      expect(result).toEqual({ count: 12 });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/users/5/likes/count",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("grantVipRole 使用 fetchAuthed 调用 POST /admin/users/:id/roles/vip", async () => {
      const data = { user_id: 42, roles: ["ROLE_NORMAL", "ROLE_VIP"] };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse({ code: 0, message: "ok", data }));
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "admin-token",
      });

      const result = await client.users.grantVipRole(42);

      expect(result).toEqual(data);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/admin/users/42/roles/vip",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ Authorization: "Bearer admin-token" }),
        }),
      );
    });

    it("revokeVipRole 使用 fetchAuthed 调用 DELETE /admin/users/:id/roles/vip", async () => {
      const data = { user_id: 42, roles: ["ROLE_NORMAL"] };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse({ code: 0, message: "ok", data }));
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "admin-token",
      });

      const result = await client.users.revokeVipRole(42);

      expect(result).toEqual(data);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/admin/users/42/roles/vip",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({ Authorization: "Bearer admin-token" }),
        }),
      );
    });
  });

  // ── 找回密码（公开）──────────────────────────────────────────────

  describe("auth password-reset", () => {
    it("passwordResetCode 使用 fetchPublic 发 POST 到 /auth/password-reset/code", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: null }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

      await client.auth.passwordResetCode({ email: "a@b.com", captcha_token: "cap" });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/auth/password-reset/code",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "a@b.com", captcha_token: "cap" }),
        }),
      );
    });

    it("passwordReset 使用 fetchPublic 发 POST 到 /auth/password-reset", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: null }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

      await client.auth.passwordReset({
        email: "a@b.com",
        code: "123456",
        new_password: "secret123",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/auth/password-reset",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "a@b.com", code: "123456", new_password: "secret123" }),
        }),
      );
    });
  });

  // ── 通知接口 ─────────────────────────────────────────────────────

  describe("notifications", () => {
    it("unreadCount 使用 fetchAuthed 调用 /notifications/unread-count", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: { count: 7 } }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      const result = await client.notifications.unreadCount();

      expect(result).toEqual({ count: 7 });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/notifications/unread-count",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ Authorization: "Bearer token123" }),
        }),
      );
    });

    it("list 构造分页和 unread_only 查询参数", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({
          code: 0,
          message: "ok",
          data: { total: 0, page: 1, page_size: 5, list: [] },
        }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      await client.notifications.list({ page: 1, page_size: 5, unread_only: true });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/notifications?page=1&page_size=5&unread_only=true",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("list 返回条目保留 actor_user 与删除状态", async () => {
      const listItem = {
        id: 1,
        event_id: 2,
        type: "article_liked",
        title: "赞了你的文章",
        content_excerpt: "",
        is_read: false,
        created_at: "2026-01-01T00:00:00Z",
        actor_user: { id: 3, nickname: "Alice", avatar_url: "https://cdn/a.png" },
        source_type: "article",
        source_id: 10,
        root_type: "article",
        root_id: 10,
        source_deleted: true,
        root_deleted: false,
        like_count: 2,
        is_liked: true,
        reply_count: 1,
      };
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({
          code: 0,
          message: "ok",
          data: { total: 1, page: 1, page_size: 20, list: [listItem] },
        }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      const result = await client.notifications.list({ page: 1, page_size: 20 });

      expect(result.list[0]?.actor_user).toEqual(listItem.actor_user);
      expect(result.list[0]?.source_deleted).toBe(true);
      expect(result.list[0]?.root_deleted).toBe(false);
      expect(result.list[0]?.like_count).toBe(2);
      expect(result.list[0]?.is_liked).toBe(true);
      expect(result.list[0]?.reply_count).toBe(1);
    });
  });

  // ── 评论接口 ─────────────────────────────────────────────────────

  describe("comments", () => {
    it("listArticle 拼接正确的查询参数", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({
          code: 0,
          message: "ok",
          data: { total: 1, pages: 1, page: 1, page_size: 10, list: [] },
        }),
      );
      const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

      await client.comments.listArticle(5, { page: 2 });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/articles/5/comments?page=2",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("listAdmin 使用后台评论查询路径并拼接筛选参数", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({
          code: 0,
          message: "ok",
          data: { total: 1, pages: 1, page: 2, page_size: 20, list: [] },
        }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      await client.comments.listAdmin({
        page: 2,
        page_size: 20,
        target_type: "moment",
        search: "测试",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/admin/comments?page=2&page_size=20&target_type=moment&search=%E6%B5%8B%E8%AF%95",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ Authorization: "Bearer token123" }),
        }),
      );
    });

    it("createArticle 使用 fetchAuthed 并发送正确 body", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({
          code: 0,
          message: "ok",
          data: {
            id: 1,
            target_type: "article",
            target_id: 5,
            user_id: 1,
            content: "hi",
            reply_count: 0,
            like_count: 0,
            is_liked: false,
            created_at: "",
            updated_at: "",
          },
        }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      await client.comments.createArticle(5, { content: "hi" });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/articles/5/comments",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ content: "hi" }),
          headers: expect.objectContaining({ Authorization: "Bearer token123" }),
        }),
      );
    });

    it("replyArticle 调用 /articles/comments/{id}/replies", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({
          code: 0,
          message: "ok",
          data: {
            id: 2,
            target_type: "article",
            comment_id: 1,
            from_user_id: 2,
            to_user_id: 1,
            parent_reply_id: 0,
            content: "ok",
            like_count: 0,
            is_liked: false,
            created_at: "",
            updated_at: "",
          },
        }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      await client.comments.replyArticle(1, { content: "ok" });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/articles/comments/1/replies",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("deleteArticle 使用 fetchAuthed 调用 DELETE /articles/comments/{id}", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: { id: 9 } }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      const result = await client.comments.deleteArticle(9);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/articles/comments/9",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({ Authorization: "Bearer token123" }),
        }),
      );
      expect(result.id).toBe(9);
    });

    it("deleteArticleReply 使用后端扁平回复删除路径", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: { id: 12 } }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      await client.comments.deleteArticleReply(12);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/articles/comment-replies/12",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("deleteMoment 和 deleteMomentReply 调用碎语评论删除路径", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: { id: 7 } }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      await client.comments.deleteMoment(7);
      await client.comments.deleteMomentReply(8);

      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        "http://api/moments/comments/7",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "http://api/moments/comment-replies/8",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("guestbook", () => {
    it("listAdmin 使用后台留言查询路径并拼接搜索参数", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({
          code: 0,
          message: "ok",
          data: { total: 1, pages: 1, page: 2, page_size: 20, list: [] },
        }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      await client.guestbook.listAdmin({ page: 2, page_size: 20, search: "你好" });

      expect(global.fetch).toHaveBeenCalledWith(
        "http://api/admin/guestbook?page=2&page_size=20&search=%E4%BD%A0%E5%A5%BD",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ Authorization: "Bearer token123" }),
        }),
      );
    });

    it("delete 和 deleteReply 调用留言删除路径", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: { id: 5 } }),
      );
      const client = createApiClient({
        baseUrl: "http://api",
        getAccessToken: () => "token123",
      });

      await client.guestbook.delete(5);
      await client.guestbook.deleteReply(6);

      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        "http://api/guestbook/5",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "http://api/guestbook/comment-replies/6",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("articles.getDetail 调用正确的端点", async () => {
    const detail: ArticleDetailResp = {
      id: 1,
      title: "Test",
      content: "# Hello",
      user_id: 1,
      status: 1,
      comment_status: 1,
      read_count: 0,
      like_count: 0,
      comment_count: 0,
      is_recommended: false,
      user: {
        id: 1,
        username: "vpt",
        nickname: "VPT",
        avatar_url: "https://blog-oss.yevpt.com/avatars/vpt.png",
      },
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({ code: 0, message: "ok", data: detail }),
    );
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    const result = await client.articles.getDetail(1);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/articles/1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.title).toBe("Test");
    expect(result.user?.avatar_url).toBe("https://blog-oss.yevpt.com/avatars/vpt.png");
  });

  it("articles.view 调用正确的端点", async () => {
    vi.mocked(global.fetch).mockResolvedValue(mockResponse({ code: 0, message: "ok", data: null }));
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.articles.view(42);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/articles/42/view",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("moments.view 调用正确的端点", async () => {
    vi.mocked(global.fetch).mockResolvedValue(mockResponse({ code: 0, message: "ok", data: null }));
    const client = createApiClient({ baseUrl: "http://api", getAccessToken: () => null });

    await client.moments.view(7);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/moments/7/view",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("articles.getAdminDetail 调用正确端点并携带 Authorization", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: {
          id: 12,
          title: "Admin",
          content: "body",
          user_id: 1,
          status: 0,
          comment_status: 1,
          read_count: 0,
          like_count: 0,
          comment_count: 0,
          is_recommended: false,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.articles.getAdminDetail(12);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/articles/12",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer admin-token" }),
      }),
    );
  });

  it("articles.saveAdmin 发送正确 body 并携带 Authorization", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: {
          id: 3,
          title: "Saved",
          content: "content",
          user_id: 1,
          status: 1,
          comment_status: 1,
          read_count: 0,
          like_count: 0,
          comment_count: 0,
          is_recommended: false,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    const req = {
      title: "Saved",
      content: "content",
      status: 1 as const,
      comment_status: 1 as const,
      category_ids: [1],
      tags: [{ tag_id: 2, seq: 0 }],
      music_ids: [],
    };
    await client.articles.saveAdmin(req);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/articles",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(req),
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("uploads.tempImage 使用 FormData 且不手动设置 JSON Content-Type", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { key: "temp/key.png", url: "https://cdn.example.com/key.png" },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    const file = new File(["image"], "cover.png", { type: "image/png" });
    const result = await client.uploads.tempImage(file, { dir: "covers", scene: "article" });

    expect(result.url).toBe("https://cdn.example.com/key.png");
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("dir")).toBe("covers");
    expect((init?.body as FormData).get("scene")).toBe("article");
    expect((init?.body as FormData).get("file")).toBe(file);
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer admin-token");
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("uploads.tempImage comment 场景写入 scene 字段", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { key: "temp/comment.png", url: "https://cdn.example.com/comment.png" },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "token",
    });
    const file = new File(["image"], "comment.png", { type: "image/png" });
    await client.uploads.tempImage(file, { dir: "images", scene: "comment" });

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect((init?.body as FormData).get("scene")).toBe("comment");
    expect((init?.body as FormData).get("dir")).toBe("images");
  });

  it("friendLinks.listAdmin 带 status 时构造 query string", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { total: 0, pages: 0, page: 1, page_size: 10, list: [] },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.friendLinks.listAdmin({ page: 1, page_size: 50, status: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api/admin/friend-links?page=1&page_size=50&status=1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("friendLinks.create 使用 FormData 上传 logo", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { id: 1, name: "VPT", site: "https://vpt.im", seq: 0, status: 1 },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });
    const logo = new File(["logo"], "logo.jpg", { type: "image/jpeg" });

    await client.friendLinks.create({
      name: "VPT",
      site: "https://vpt.im",
      seq: 0,
      logo,
    });

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(init?.body).toBeInstanceOf(FormData);
    const body = init?.body as FormData;
    expect(body.get("name")).toBe("VPT");
    const uploadedLogo = body.get("logo");
    expect(uploadedLogo).toBeInstanceOf(File);
    expect((uploadedLogo as File).name).toBe("logo.jpg");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("friendLinks.update 无 logo 时仅提交文本字段", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockResponse({
        code: 0,
        message: "ok",
        data: { id: 1, name: "VPT", site: "https://vpt.im", seq: 1, status: 1 },
      }),
    );
    const client = createApiClient({
      baseUrl: "http://api",
      getAccessToken: () => "admin-token",
    });

    await client.friendLinks.update(1, { name: "VPT Blog", seq: 1 });

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = init?.body as FormData;
    expect(body.get("name")).toBe("VPT Blog");
    expect(body.get("logo")).toBeNull();
  });
});
