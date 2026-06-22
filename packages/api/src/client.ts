import { ApiError } from "./errors";
import type {
  SendCodeReq,
  RegisterReq,
  LoginReq,
  AdminLoginReq,
  RefreshReq,
  UserResp,
  LoginResp,
  TokenResp,
} from "./types/auth";
import type {
  AdminArticlePageResp,
  ArticleDetailResp,
  ArticleLikeResp,
  ArticleListReq,
  ArticlePageResp,
} from "./types/article";
import type { TagListResp } from "./types/tag";
import type { CategoryTabsResp } from "./types/category";
import type {
  MomentDeleteResp,
  MomentItemResp,
  MomentListReq,
  MomentPageResp,
  MomentSaveReq,
  MomentTopResp,
} from "./types/moment";
import type {
  CommentCreateReq,
  CommentItemResp,
  CommentListReq,
  CommentPageResp,
  CommentReplyCreateReq,
  CommentReplyListReq,
  CommentReplyPageResp,
  CommentReplyResp,
  CommentLikeResp,
  CommentDeleteResp,
} from "./types/comment";
import type {
  GuestbookCreateReq,
  GuestbookDeleteResp,
  GuestbookItemResp,
  GuestbookListReq,
  GuestbookLikeResp,
  GuestbookPageResp,
} from "./types/guestbook";
import type {
  UserDetailResp,
  UserListReq,
  UserPageResp,
  UserPublicProfileResp,
  OAuthBindingResp,
  UpdateProfileReq,
  UpdateMetaReq,
  EmailDisplaySetting,
} from "./types/user";
import type { FriendLinkListReq, FriendLinkPageResp } from "./types/friend-link";

/** createApiClient 的注入配置接口 */
export interface ApiClientConfig {
  baseUrl: string;
  /** 获取当前 access token（同步或异步均可） */
  getAccessToken: () => string | null | Promise<string | null>;
  /** 获取当前 refresh token，不提供则不自动刷新 */
  getRefreshToken?: () => string | null | Promise<string | null>;
  /** token 刷新成功后的回调，用于各 App 更新本地存储 */
  onTokenRefreshed?: (tokens: TokenResp) => void | Promise<void>;
  /** token 刷新失败（refresh token 也过期）时的回调，用于触发登出 */
  onRefreshFailed?: () => void | Promise<void>;
}

/** 后端统一响应包装结构 */
interface BackendResponse<T> {
  code: number;
  message: string;
  data?: T;
}

/**
 * 发起一次 HTTP 请求，附加指定 token，解析后端统一响应格式。
 * HTTP 401 会作为 ApiError(401) 抛出，由调用方决定是否触发刷新重试。
 */
async function request<T>(url: string, init: RequestInit, accessToken: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, { ...init, headers });
  const json: BackendResponse<T> = await res.json();

  // HTTP 401 单独处理，供上层 fetchAuthed 捕获后触发刷新逻辑
  if (res.status === 401) {
    throw new ApiError(401, json.message);
  }
  if (json.code !== 0) {
    throw new ApiError(json.code, json.message);
  }
  return json.data as T;
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, getAccessToken, getRefreshToken, onTokenRefreshed, onRefreshFailed } = config;

  /** 公开请求：不附加 token，不自动刷新；用于 login / register / send-code / refresh */
  async function fetchPublic<T>(path: string, init: RequestInit): Promise<T> {
    return request<T>(`${baseUrl}${path}`, init, null);
  }

  /**
   * 可选鉴权请求：有 access token 就附带，没有就按公开请求处理。
   * 适用于支持 OptionalAuth 的公开接口，例如文章列表这类“匿名可访问，登录可带个性化状态”的场景。
   */
  async function fetchOptionalAuth<T>(path: string, init: RequestInit): Promise<T> {
    const accessToken = await getAccessToken();
    return request<T>(`${baseUrl}${path}`, init, accessToken);
  }

  /**
   * 认证请求：附加 access token，遇到 401 时自动刷新并重试一次。
   * 用于所有需要登录才能访问的接口。
   */
  async function fetchAuthed<T>(path: string, init: RequestInit): Promise<T> {
    const accessToken = await getAccessToken();
    try {
      return await request<T>(`${baseUrl}${path}`, init, accessToken);
    } catch (err) {
      // 只有 ApiError(401) 才触发刷新，其他错误直接透传
      if (!(err instanceof ApiError) || err.code !== 401) throw err;

      const refreshToken = await getRefreshToken?.();
      if (!refreshToken) {
        // 没有 refresh token，无法刷新，直接触发登出回调
        await onRefreshFailed?.();
        throw err;
      }

      try {
        // 用 refresh token 换发新的双 token
        const tokens = await request<TokenResp>(
          `${baseUrl}/auth/refresh`,
          { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
          null,
        );
        await onTokenRefreshed?.(tokens);
        // 用新 access token 重试原请求
        const newToken = await getAccessToken();
        return await request<T>(`${baseUrl}${path}`, init, newToken);
      } catch {
        // 刷新也失败（refresh token 过期），触发登出回调
        await onRefreshFailed?.();
        throw err;
      }
    }
  }

  return {
    auth: {
      /** 发送邮箱验证码（无需登录） */
      sendCode: (req: SendCodeReq) =>
        fetchPublic<void>("/auth/send-code", { method: "POST", body: JSON.stringify(req) }),
      /** 邮箱注册（无需登录，消耗验证码） */
      register: (req: RegisterReq) =>
        fetchPublic<UserResp>("/auth/register", { method: "POST", body: JSON.stringify(req) }),
      /** 登录，返回双 token（无需登录，401 = 凭证错误而非 token 过期，不自动刷新） */
      login: (req: LoginReq) =>
        fetchPublic<LoginResp>("/auth/login", { method: "POST", body: JSON.stringify(req) }),
      /** 换发新 token（不走 fetchAuthed 避免递归） */
      refresh: (req: RefreshReq) =>
        fetchPublic<TokenResp>("/auth/refresh", { method: "POST", body: JSON.stringify(req) }),
    },
    adminAuth: {
      /** 管理后台登录，返回双 token；401 = 凭证错误，403 = 非管理员或账号禁用 */
      login: (req: AdminLoginReq) =>
        fetchPublic<LoginResp>("/admin/auth/login", {
          method: "POST",
          body: JSON.stringify(req),
        }),
    },
    articles: {
      /** 分页查询公开文章，支持分类/标签/推荐过滤 */
      listPublic: (req: ArticleListReq = {}) => {
        const params = new URLSearchParams();
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        if (req.recommend !== undefined) params.set("recommend", String(req.recommend));
        if (req.category_id !== undefined) params.set("category_id", String(req.category_id));
        if (req.tag_id !== undefined) params.set("tag_id", String(req.tag_id));
        const qs = params.toString();
        return fetchOptionalAuth<ArticlePageResp>(`/articles${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 切换当前用户对文章的点赞状态，返回服务端最新点赞状态与数量 */
      toggleLike: (id: number) =>
        fetchAuthed<ArticleLikeResp>(`/articles/${id}/like`, {
          method: "POST",
        }),
      /** 获取文章详情（公开接口，携带可选登录态以返回 is_liked） */
      getDetail: (id: number) =>
        fetchOptionalAuth<ArticleDetailResp>(`/articles/${id}`, { method: "GET" }),
      /** 上报一次文章阅读（触发即可，不等待返回值） */
      view: (id: number) => fetchPublic<void>(`/articles/${id}/view`, { method: "POST" }),
      /** 分页查询管理端文章，需管理员登录；含隐藏/公开/加密及已软删除文章 */
      listAdmin: (req: ArticleListReq = {}) => {
        const params = new URLSearchParams();
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        if (req.recommend !== undefined) params.set("recommend", String(req.recommend));
        if (req.category_id !== undefined) params.set("category_id", String(req.category_id));
        if (req.tag_id !== undefined) params.set("tag_id", String(req.tag_id));
        if (req.search !== undefined && req.search.trim() !== "") {
          params.set("search", req.search.trim());
        }
        if (req.sort_by !== undefined) params.set("sort_by", req.sort_by);
        if (req.sort_order !== undefined) params.set("sort_order", req.sort_order);
        const qs = params.toString();
        return fetchAuthed<AdminArticlePageResp>(`/admin/articles${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 软删除文章，需管理员登录；返回删除后的文章详情 */
      deleteAdmin: (id: number) =>
        fetchAuthed<ArticleDetailResp>(`/admin/articles/${id}`, { method: "DELETE" }),
    },
    categories: {
      /** 查询分类 Tab 列表（含文章数量，按 seq/count 排序） */
      listTabs: () => fetchPublic<CategoryTabsResp>("/categories", { method: "GET" }),
    },
    tags: {
      /** 查询标签列表（含公开文章数量，按 seq/count 排序） */
      list: () => fetchPublic<TagListResp>("/tags", { method: "GET" }),
    },
    moments: {
      /** 上报一次碎语阅读（触发即可，不等待返回值） */
      view: (id: number) => fetchPublic<void>(`/moments/${id}/view`, { method: "POST" }),
      /** 分页查询公开碎语，支持用户/角色过滤；登录态可返回 is_liked */
      listPublic: (req: MomentListReq = {}) => {
        const params = new URLSearchParams();
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        if (req.user_id !== undefined) params.set("user_id", String(req.user_id));
        if (req.role_id !== undefined) params.set("role_id", String(req.role_id));
        const qs = params.toString();
        return fetchOptionalAuth<MomentPageResp>(`/moments${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 切换当前用户对碎语的点赞状态，返回服务端最新点赞状态与数量 */
      toggleLike: (id: number) =>
        fetchAuthed<MomentItemResp>(`/moments/${id}/like`, {
          method: "POST",
        }),
      /** 新增或更新碎语，需登录；图片 multipart 上传由 web route handler 单独转发 */
      save: (req: MomentSaveReq) =>
        fetchAuthed<MomentItemResp>("/moments", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 删除自己的碎语，需登录；管理员也可删除 */
      delete: (id: number) => fetchAuthed<MomentDeleteResp>(`/moments/${id}`, { method: "DELETE" }),
      /** 置顶自己的碎语，需登录；每个作者最多三条 */
      setTop: (id: number) => fetchAuthed<MomentTopResp>(`/moments/${id}/top`, { method: "POST" }),
      /** 取消置顶自己的碎语，需登录 */
      removeTop: (id: number) =>
        fetchAuthed<MomentTopResp>(`/moments/${id}/top`, { method: "DELETE" }),
    },
    users: {
      /** 获取当前登录用户详情（需登录） */
      getMe: () => fetchAuthed<UserDetailResp>("/users/me", { method: "GET" }),
      /** 按 ID 获取某个用户的公开详情 */
      getPublicProfile: (id: number) =>
        fetchOptionalAuth<UserPublicProfileResp>(`/users/${id}`, { method: "GET" }),
      /** 更新昵称、身份标签、简介等基本信息（需登录） */
      updateProfile: (req: UpdateProfileReq) =>
        fetchAuthed<UserDetailResp>("/users/me/profile", {
          method: "PATCH",
          body: JSON.stringify(req),
        }),
      /** 更新 meta 字段（需登录） */
      updateMeta: (req: UpdateMetaReq) =>
        fetchAuthed<UserDetailResp>("/users/me/meta", {
          method: "PATCH",
          body: JSON.stringify(req),
        }),
      /** 更新或删除某个社交链接（需登录） */
      updateSocialLink: (platform: string, url: string | null) =>
        fetchAuthed<UserDetailResp>(`/users/me/social/${platform}`, {
          method: "PATCH",
          body: JSON.stringify({ url }),
        }),
      /** 修改用户名（成功后需重新登录） */
      updateUsername: (username: string) =>
        fetchAuthed<void>("/users/me/username", {
          method: "PATCH",
          body: JSON.stringify({ username }),
        }),
      /** 修改密码（成功后需重新登录） */
      updatePassword: (oldPassword: string, newPassword: string) =>
        fetchAuthed<void>("/users/me/password", {
          method: "PATCH",
          body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        }),
      /** 获取 OAuth 绑定列表 */
      getOAuthBindings: () =>
        fetchAuthed<OAuthBindingResp[]>("/users/me/oauth-bindings", { method: "GET" }),
      /** 设置对外展示邮箱 */
      updateEmailDisplay: (display: EmailDisplaySetting) =>
        fetchAuthed<void>("/users/me/email/display", {
          method: "PATCH",
          body: JSON.stringify({ display }),
        }),
      /** 获取最近访问用户（公开接口） */
      listRecent: (req: UserListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        const qs = p.toString();
        return fetchPublic<UserPageResp>(`/users/recent${qs ? `?${qs}` : ""}`, { method: "GET" });
      },
      /** 分页查询公开用户，包含所有注册用户 */
      listPublic: (req: UserListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        if (req.role_id !== undefined) p.set("role_id", String(req.role_id));
        const qs = p.toString();
        return fetchPublic<UserPageResp>(`/users${qs ? `?${qs}` : ""}`, { method: "GET" });
      },
    },
    comments: {
      /** 分页查询文章评论（可选登录，登录后返回 is_liked） */
      listArticle: (articleId: number, req: CommentListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        const qs = p.toString();
        return fetchOptionalAuth<CommentPageResp>(
          `/articles/${articleId}/comments${qs ? `?${qs}` : ""}`,
          { method: "GET" },
        );
      },
      /** 分页查询碎语评论 */
      listMoment: (momentId: number, req: CommentListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        const qs = p.toString();
        return fetchOptionalAuth<CommentPageResp>(
          `/moments/${momentId}/comments${qs ? `?${qs}` : ""}`,
          { method: "GET" },
        );
      },
      /** 新增文章评论（需登录） */
      createArticle: (articleId: number, req: CommentCreateReq) =>
        fetchAuthed<CommentItemResp>(`/articles/${articleId}/comments`, {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 新增碎语评论（需登录） */
      createMoment: (momentId: number, req: CommentCreateReq) =>
        fetchAuthed<CommentItemResp>(`/moments/${momentId}/comments`, {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 分页查询文章评论回复（可选登录） */
      listArticleReplies: (commentId: number, req: CommentReplyListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        const qs = p.toString();
        return fetchOptionalAuth<CommentReplyPageResp>(
          `/articles/comments/${commentId}/replies${qs ? `?${qs}` : ""}`,
          { method: "GET" },
        );
      },
      /** 分页查询碎语评论回复 */
      listMomentReplies: (commentId: number, req: CommentReplyListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        const qs = p.toString();
        return fetchOptionalAuth<CommentReplyPageResp>(
          `/moments/comments/${commentId}/replies${qs ? `?${qs}` : ""}`,
          { method: "GET" },
        );
      },
      /** 回复文章评论（需登录） */
      replyArticle: (commentId: number, req: CommentReplyCreateReq) =>
        fetchAuthed<CommentReplyResp>(`/articles/comments/${commentId}/replies`, {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 回复碎语评论（需登录） */
      replyMoment: (commentId: number, req: CommentReplyCreateReq) =>
        fetchAuthed<CommentReplyResp>(`/moments/comments/${commentId}/replies`, {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 切换文章评论点赞（需登录） */
      toggleArticleLike: (commentId: number) =>
        fetchAuthed<CommentLikeResp>(`/articles/comments/${commentId}/like`, {
          method: "POST",
        }),
      /** 切换碎语评论点赞（需登录） */
      toggleMomentLike: (commentId: number) =>
        fetchAuthed<CommentLikeResp>(`/moments/comments/${commentId}/like`, {
          method: "POST",
        }),
      /** 切换文章评论回复点赞（需登录） */
      toggleArticleReplyLike: (commentId: number, replyId: number) =>
        fetchAuthed<CommentLikeResp>(`/articles/comments/${commentId}/replies/${replyId}/like`, {
          method: "POST",
        }),
      /** 切换碎语评论回复点赞（需登录） */
      toggleMomentReplyLike: (commentId: number, replyId: number) =>
        fetchAuthed<CommentLikeResp>(`/moments/comments/${commentId}/replies/${replyId}/like`, {
          method: "POST",
        }),
      /** 删除文章评论（需登录；作者或管理员） */
      deleteArticle: (commentId: number) =>
        fetchAuthed<CommentDeleteResp>(`/articles/comments/${commentId}`, { method: "DELETE" }),
      /** 删除碎语评论（需登录；作者或管理员） */
      deleteMoment: (commentId: number) =>
        fetchAuthed<CommentDeleteResp>(`/moments/comments/${commentId}`, { method: "DELETE" }),
      /** 删除文章评论回复（需登录；回复作者或管理员） */
      deleteArticleReply: (replyId: number) =>
        fetchAuthed<CommentDeleteResp>(`/articles/comment-replies/${replyId}`, {
          method: "DELETE",
        }),
      /** 删除碎语评论回复（需登录；回复作者或管理员） */
      deleteMomentReply: (replyId: number) =>
        fetchAuthed<CommentDeleteResp>(`/moments/comment-replies/${replyId}`, {
          method: "DELETE",
        }),
    },
    guestbook: {
      /** 分页查询留言（可选登录） */
      list: (req: GuestbookListReq = {}) => {
        const p = new URLSearchParams();
        if (req.owner_user_id !== undefined) p.set("owner_user_id", String(req.owner_user_id));
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        const qs = p.toString();
        return fetchOptionalAuth<GuestbookPageResp>(`/guestbook${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 发表留言（需登录） */
      create: (req: GuestbookCreateReq) =>
        fetchAuthed<GuestbookItemResp>("/guestbook", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 切换留言点赞（需登录） */
      toggleLike: (id: number) =>
        fetchAuthed<GuestbookLikeResp>(`/guestbook/${id}/like`, { method: "POST" }),
      /** 分页查询留言回复 */
      listReplies: (guestbookId: number, req: CommentReplyListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        const qs = p.toString();
        return fetchOptionalAuth<CommentReplyPageResp>(
          `/guestbook/comments/${guestbookId}/replies${qs ? `?${qs}` : ""}`,
          { method: "GET" },
        );
      },
      /** 回复留言（需登录） */
      reply: (guestbookId: number, req: CommentReplyCreateReq) =>
        fetchAuthed<CommentReplyResp>(`/guestbook/comments/${guestbookId}/replies`, {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 切换留言回复点赞（需登录） */
      toggleReplyLike: (guestbookId: number, replyId: number) =>
        fetchAuthed<CommentLikeResp>(`/guestbook/comments/${guestbookId}/replies/${replyId}/like`, {
          method: "POST",
        }),
      /** 删除留言（需登录；留言作者或管理员） */
      delete: (id: number) =>
        fetchAuthed<GuestbookDeleteResp>(`/guestbook/${id}`, { method: "DELETE" }),
      /** 删除留言回复（需登录；回复作者或管理员） */
      deleteReply: (replyId: number) =>
        fetchAuthed<CommentDeleteResp>(`/guestbook/comment-replies/${replyId}`, {
          method: "DELETE",
        }),
    },
    friendLinks: {
      /** 查询公开友情链接（含显示和失联状态） */
      listPublic: (req: FriendLinkListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        const qs = p.toString();
        return fetchPublic<FriendLinkPageResp>(`/friend-links${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
    },
    /**
     * 测试用端点，与后端 /test/* 路由对应。
     * 同时作为 fetchAuthed 路径的示例，未来可删除。
     */
    test: {
      authed: () => fetchAuthed<string>("/test/authed", { method: "GET" }),
    },
  };
}
