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
});
