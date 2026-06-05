import { ApiError } from "./errors";
import type {
  SendCodeReq,
  RegisterReq,
  LoginReq,
  RefreshReq,
  UserResp,
  LoginResp,
  TokenResp,
} from "./types/auth";
import type {
  ArticleDetailResp,
  ArticleLikeResp,
  ArticleListReq,
  ArticlePageResp,
} from "./types/article";
import type { CategoryTabsResp } from "./types/category";
import type { MomentListReq, MomentPageResp } from "./types/moment";
import type {
  CommentCreateReq,
  CommentItemResp,
  CommentListReq,
  CommentPageResp,
  CommentReplyCreateReq,
  CommentReplyResp,
} from "./types/comment";
import type { UserDetailResp } from "./types/user";

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
    },
    categories: {
      /** 查询分类 Tab 列表（含文章数量，按 seq/count 排序） */
      listTabs: () => fetchPublic<CategoryTabsResp>("/categories", { method: "GET" }),
    },
    moments: {
      /** 分页查询公开碎语，支持用户/角色过滤 */
      listPublic: (req: MomentListReq = {}) => {
        const params = new URLSearchParams();
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        if (req.user_id !== undefined) params.set("user_id", String(req.user_id));
        if (req.role_id !== undefined) params.set("role_id", String(req.role_id));
        const qs = params.toString();
        return fetchPublic<MomentPageResp>(`/moments${qs ? `?${qs}` : ""}`, { method: "GET" });
      },
    },
    users: {
      /** 获取当前登录用户详情（需登录） */
      getMe: () => fetchAuthed<UserDetailResp>("/users/me", { method: "GET" }),
    },
    comments: {
      /** 分页查询评论，支持 article / moment / guestbook */
      listPublic: (req: CommentListReq) => {
        const params = new URLSearchParams();
        params.set("target_type", req.target_type);
        params.set("target_id", String(req.target_id));
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        return fetchPublic<CommentPageResp>(`/comments?${params.toString()}`, { method: "GET" });
      },
      /** 新增一级评论（需登录） */
      create: (req: CommentCreateReq) =>
        fetchAuthed<CommentItemResp>("/comments", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 回复一级评论（需登录） */
      reply: (commentId: number, req: CommentReplyCreateReq) =>
        fetchAuthed<CommentReplyResp>(`/comments/${commentId}/replies`, {
          method: "POST",
          body: JSON.stringify(req),
        }),
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
