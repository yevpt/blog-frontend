import { ApiError } from "./errors";
import type {
  SendCodeReq,
  RegisterReq,
  LoginReq,
  AdminLoginReq,
  RefreshReq,
  LoginResp,
  TokenResp,
  OAuthAuthorizeResp,
  PasswordResetCodeReq,
  PasswordResetReq,
} from "./types/auth";
import type {
  AdminArticleDetailResp,
  AdminArticlePageResp,
  ArticleDetailResp,
  ArticleLikeResp,
  ArticleListReq,
  ArticlePageResp,
  ArticleSaveReq,
} from "./types/article";
import type {
  TagArticlesReq,
  TagArticlesResp,
  TagCreateReq,
  TagItemResp,
  TagListResp,
  TagUpdateReq,
} from "./types/tag";
import type {
  CategoryArticlesReq,
  CategoryArticlesResp,
  CategoryCreateReq,
  CategoryItemResp,
  CategoryTabsResp,
  CategoryUpdateReq,
} from "./types/category";
import type {
  MusicAdminListReq,
  MusicAdminListResp,
  MusicAlbumListResp,
  MusicAlbumResp,
  MusicAlbumSaveReq,
  MusicArtistListResp,
  MusicArtistResp,
  MusicArtistSaveReq,
  MusicListResp,
  MusicSaveReq,
  MusicUploadReq,
  MusicUploadResp,
} from "./types/music";
import type {
  AdminMomentListReq,
  AdminMomentPageResp,
  MomentDeleteResp,
  MomentItemResp,
  MomentFeedListReq,
  MomentListReq,
  MomentPageResp,
  MomentSaveReq,
  MomentTopResp,
} from "./types/moment";
import type {
  AdminCommentListReq,
  AdminCommentPageResp,
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
  AdminGuestbookListReq,
  AdminGuestbookPageResp,
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
  UpdateEmailReq,
  SendAccountEmailCodeReq,
  SetInitialPasswordReq,
  UserLikedContentListReq,
  UserLikedContentPageResp,
  UserLikesCountResp,
  UserMomentsCountResp,
  AdminUserRolesResp,
} from "./types/user";
import type {
  FriendLinkAdminListReq,
  FriendLinkCreateReq,
  FriendLinkItemResp,
  FriendLinkListReq,
  FriendLinkPageResp,
  FriendLinkUpdateReq,
} from "./types/friend-link";
import type {
  NotificationListReq,
  NotificationPageResp,
  NotificationUnreadCountResp,
} from "./types/notification";
import type { TempImageUploadReq, TempUploadResp } from "./types/upload";
import type {
  AnalyticsOverviewResp,
  AnalyticsTrendReq,
  AnalyticsTrendPoint,
  AnalyticsDimension,
  AnalyticsDimensionPoint,
  AnalyticsPageStat,
  AnalyticsFriendLinkStat,
  AnalyticsRealtimeResp,
  AnalyticsPathSequence,
  AnalyticsFunnelStep,
  AnalyticsRangeReq,
  AnalyticsBackfillReq,
  AnalyticsBackfillResp,
  AdminOverviewSummaryResp,
} from "./types/analytics";

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
    ...(init.headers as Record<string, string>),
  };
  // FormData 由浏览器自动设置 multipart boundary，不能手动加 JSON Content-Type
  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, { ...init, headers });
  const rawText = await res.text();
  let json: BackendResponse<T>;
  try {
    json = rawText ? (JSON.parse(rawText) as BackendResponse<T>) : { code: 0, message: "ok" };
  } catch {
    throw new ApiError(res.status || 500, rawText || "响应不是合法的 JSON");
  }

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
      /** 邮箱注册（无需登录，消耗验证码；multipart 上传可选头像；成功返回登录态） */
      register: (req: RegisterReq) => {
        const formData = new FormData();
        formData.append("email", req.email);
        formData.append("password", req.password);
        formData.append("code", req.code);
        if (req.nickname) {
          formData.append("nickname", req.nickname);
        }
        if (req.avatar) {
          formData.append("avatar", req.avatar, req.avatar.name);
        }
        return fetchPublic<LoginResp>("/auth/register", { method: "POST", body: formData });
      },
      /** 登录，返回双 token（无需登录，401 = 凭证错误而非 token 过期，不自动刷新） */
      login: (req: LoginReq) =>
        fetchPublic<LoginResp>("/auth/login", { method: "POST", body: JSON.stringify(req) }),
      /** 换发新 token（不走 fetchAuthed 避免递归） */
      refresh: (req: RefreshReq) =>
        fetchPublic<TokenResp>("/auth/refresh", { method: "POST", body: JSON.stringify(req) }),
      /** 找回密码·发码（公开） */
      passwordResetCode: (req: PasswordResetCodeReq) =>
        fetchPublic<void>("/auth/password-reset/code", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 找回密码·重置（公开） */
      passwordReset: (req: PasswordResetReq) =>
        fetchPublic<void>("/auth/password-reset", { method: "POST", body: JSON.stringify(req) }),
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
      /** 获取管理端文章详情，需管理员登录 */
      getAdminDetail: (id: number) =>
        fetchAuthed<AdminArticleDetailResp>(`/admin/articles/${id}`, { method: "GET" }),
      /** 新增或更新文章，需管理员登录 */
      saveAdmin: (req: ArticleSaveReq) =>
        fetchAuthed<ArticleDetailResp>("/admin/articles", {
          method: "POST",
          body: JSON.stringify(req),
        }),
    },
    categories: {
      /** 查询分类 Tab 列表（含文章数量，按 seq/count 排序） */
      listTabs: () => fetchPublic<CategoryTabsResp>("/categories", { method: "GET" }),
      /** 新增分类，需管理员登录 */
      create: (req: CategoryCreateReq) =>
        fetchAuthed<CategoryItemResp>("/admin/categories", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 修改分类，需管理员登录 */
      update: (id: number, req: CategoryUpdateReq) =>
        fetchAuthed<CategoryItemResp>(`/admin/categories/${id}`, {
          method: "PUT",
          body: JSON.stringify(req),
        }),
      /** 删除分类（清空文章关联），需管理员登录 */
      delete: (id: number) =>
        fetchAuthed<CategoryItemResp>(`/admin/categories/${id}`, { method: "DELETE" }),
      /** 批量将文章归入分类，需管理员登录 */
      addArticles: (id: number, req: CategoryArticlesReq) =>
        fetchAuthed<CategoryArticlesResp>(`/admin/categories/${id}/articles`, {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 批量移除分类下文章关联，需管理员登录 */
      removeArticles: (id: number, req: CategoryArticlesReq) =>
        fetchAuthed<CategoryArticlesResp>(`/admin/categories/${id}/articles`, {
          method: "DELETE",
          body: JSON.stringify(req),
        }),
    },
    tags: {
      /** 查询标签列表（含公开文章数量，按 seq/count 排序） */
      list: () => fetchPublic<TagListResp>("/tags", { method: "GET" }),
      /** 查询标签详情 */
      get: (id: number) => fetchPublic<TagItemResp>(`/tags/${id}`, { method: "GET" }),
      /** 新增标签，需管理员登录 */
      create: (req: TagCreateReq) =>
        fetchAuthed<TagItemResp>("/admin/tags", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 修改标签，需管理员登录 */
      update: (id: number, req: TagUpdateReq) =>
        fetchAuthed<TagItemResp>(`/admin/tags/${id}`, {
          method: "PUT",
          body: JSON.stringify(req),
        }),
      /** 删除标签（清空文章关联），需管理员登录 */
      delete: (id: number) => fetchAuthed<TagItemResp>(`/admin/tags/${id}`, { method: "DELETE" }),
      /** 批量给文章添加标签，需管理员登录 */
      addArticles: (id: number, req: TagArticlesReq) =>
        fetchAuthed<TagArticlesResp>(`/admin/tags/${id}/articles`, {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 批量移除标签下文章关联，需管理员登录 */
      removeArticles: (id: number, req: TagArticlesReq) =>
        fetchAuthed<TagArticlesResp>(`/admin/tags/${id}/articles`, {
          method: "DELETE",
          body: JSON.stringify(req),
        }),
    },
    music: {
      /** 查询音乐列表，用于文章编辑页选择背景音乐 */
      list: () => fetchPublic<MusicListResp>("/music", { method: "GET" }),
      /** 分页查询管理端音乐，需管理员登录 */
      listAdmin: (req: MusicAdminListReq = {}) => {
        const params = new URLSearchParams();
        if (req.keyword !== undefined && req.keyword.trim() !== "") {
          params.set("keyword", req.keyword.trim());
        }
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        const qs = params.toString();
        return fetchAuthed<MusicAdminListResp>(`/admin/music${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 新增音乐，需管理员登录 */
      create: (req: MusicSaveReq) =>
        fetchAuthed<void>("/admin/music", { method: "POST", body: JSON.stringify(req) }),
      /** 修改音乐，需管理员登录 */
      update: (id: number, req: MusicSaveReq) =>
        fetchAuthed<void>(`/admin/music/${id}`, { method: "PUT", body: JSON.stringify(req) }),
      /** 删除音乐，需管理员登录 */
      delete: (id: number) => fetchAuthed<void>(`/admin/music/${id}`, { method: "DELETE" }),
      /** 查询管理端歌手，需管理员登录 */
      listArtistsAdmin: (keyword = "") => {
        const params = new URLSearchParams();
        if (keyword.trim() !== "") params.set("keyword", keyword.trim());
        const qs = params.toString();
        return fetchAuthed<MusicArtistListResp>(`/admin/music/artists${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 新增歌手，需管理员登录 */
      createArtist: (req: MusicArtistSaveReq) =>
        fetchAuthed<MusicArtistResp>("/admin/music/artists", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 修改歌手，需管理员登录 */
      updateArtist: (id: number, req: MusicArtistSaveReq) =>
        fetchAuthed<MusicArtistResp>(`/admin/music/artists/${id}`, {
          method: "PUT",
          body: JSON.stringify(req),
        }),
      /** 删除歌手，需管理员登录 */
      deleteArtist: (id: number) =>
        fetchAuthed<void>(`/admin/music/artists/${id}`, { method: "DELETE" }),
      /** 查询管理端专辑，需管理员登录 */
      listAlbumsAdmin: (keyword = "") => {
        const params = new URLSearchParams();
        if (keyword.trim() !== "") params.set("keyword", keyword.trim());
        const qs = params.toString();
        return fetchAuthed<MusicAlbumListResp>(`/admin/music/albums${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 新增专辑，需管理员登录 */
      createAlbum: (req: MusicAlbumSaveReq) =>
        fetchAuthed<MusicAlbumResp>("/admin/music/albums", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 修改专辑，需管理员登录 */
      updateAlbum: (id: number, req: MusicAlbumSaveReq) =>
        fetchAuthed<MusicAlbumResp>(`/admin/music/albums/${id}`, {
          method: "PUT",
          body: JSON.stringify(req),
        }),
      /** 删除专辑，需管理员登录 */
      deleteAlbum: (id: number) =>
        fetchAuthed<void>(`/admin/music/albums/${id}`, { method: "DELETE" }),
      /** 上传音乐音频到临时路径，需管理员登录 */
      uploadAudio: (req: MusicUploadReq) => {
        const formData = new FormData();
        formData.append("file", req.file, req.file.name);
        return fetchAuthed<MusicUploadResp>("/admin/music/uploads/audio", {
          method: "POST",
          body: formData,
        });
      },
      /** 上传专辑封面到临时路径，需管理员登录 */
      uploadAlbumCover: (req: MusicUploadReq) => {
        const formData = new FormData();
        formData.append("file", req.file, req.file.name);
        return fetchAuthed<MusicUploadResp>("/admin/music/uploads/album-cover", {
          method: "POST",
          body: formData,
        });
      },
      /** 上传歌手头像到临时路径，需管理员登录 */
      uploadArtistAvatar: (req: MusicUploadReq) => {
        const formData = new FormData();
        formData.append("file", req.file, req.file.name);
        return fetchAuthed<MusicUploadResp>("/admin/music/uploads/artist-avatar", {
          method: "POST",
          body: formData,
        });
      },
    },
    moments: {
      /** 后台分页查询全站碎语（需管理员） */
      listAdmin: (req: AdminMomentListReq = {}) => {
        const params = new URLSearchParams();
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        if (req.status !== undefined) params.set("status", req.status);
        if (req.search !== undefined && req.search !== "") params.set("search", req.search);
        const qs = params.toString();
        return fetchAuthed<AdminMomentPageResp>(`/admin/moments${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 上报一次碎语阅读（触发即可，不等待返回值） */
      view: (id: number) => fetchPublic<void>(`/moments/${id}/view`, { method: "POST" }),
      /** 分页查询公开碎语，支持用户/角色过滤；登录态可返回 is_liked */
      listPublic: (req: MomentListReq = {}) => {
        const params = new URLSearchParams();
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        if (req.user_id !== undefined) params.set("user_id", String(req.user_id));
        if (req.role_id !== undefined) params.set("role_id", String(req.role_id));
        if (req.random !== undefined) params.set("random", String(req.random));
        if (req.exclude_ids !== undefined && req.exclude_ids.length > 0) {
          params.set("exclude_ids", req.exclude_ids.join(","));
        }
        const qs = params.toString();
        return fetchOptionalAuth<MomentPageResp>(`/moments${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 碎语独立页 feed，按 scope/sort 分页；登录态可返回 is_liked */
      feed: (req: MomentFeedListReq) => {
        const params = new URLSearchParams();
        params.set("scope", req.scope);
        params.set("sort", req.sort);
        if (req.page !== undefined) params.set("page", String(req.page));
        if (req.page_size !== undefined) params.set("page_size", String(req.page_size));
        const qs = params.toString();
        return fetchOptionalAuth<MomentPageResp>(`/moments/feed?${qs}`, { method: "GET" });
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
      /** 已启用的第三方平台列表 */
      getProviders: () => fetchPublic<string[]>("/oauth/providers", { method: "GET" }),
      /** 解绑第三方平台（最后登录方式时后端拒绝） */
      unbindOAuth: (source: string) =>
        fetchAuthed<void>(`/oauth/bindings/${source}`, { method: "DELETE" }),
      /** 取第三方「绑定」授权地址 */
      authorizeOAuthBind: (source: string, redirectUri: string) =>
        fetchOptionalAuth<OAuthAuthorizeResp>(
          `/oauth/${source}/authorize?action=bind&redirect_uri=${encodeURIComponent(redirectUri)}`,
          { method: "GET" },
        ),
      /** 发送账号邮箱验证码（需图形验证码 token） */
      sendAccountEmailCode: (req: SendAccountEmailCodeReq) =>
        fetchAuthed<void>("/users/me/email/code", {
          method: "POST",
          body: JSON.stringify(req),
        }),
      /** 绑定/换绑主或副邮箱 */
      updateEmail: (req: UpdateEmailReq) =>
        fetchAuthed<void>("/users/me/email", { method: "PATCH", body: JSON.stringify(req) }),
      /** 设置初始密码（OAuth 注册无密码用户） */
      setInitialPassword: (req: SetInitialPasswordReq) =>
        fetchAuthed<void>("/users/me/password/initial", {
          method: "PATCH",
          body: JSON.stringify(req),
        }),
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
      /** 分页查询用户赞过的内容（公开，可选登录） */
      listLikedContent: (userId: number, req: UserLikedContentListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        if (req.type !== undefined) p.set("type", req.type);
        const qs = p.toString();
        return fetchOptionalAuth<UserLikedContentPageResp>(
          `/users/${userId}/likes${qs ? `?${qs}` : ""}`,
          { method: "GET" },
        );
      },
      /** 查询用户点赞总数（公开，可选登录） */
      getLikesCount: (userId: number) =>
        fetchOptionalAuth<UserLikesCountResp>(`/users/${userId}/likes/count`, { method: "GET" }),
      /** 查询用户碎语总数（公开，可选登录） */
      getMomentsCount: (userId: number) =>
        fetchOptionalAuth<UserMomentsCountResp>(`/users/${userId}/moments/count`, {
          method: "GET",
        }),
      /** 授予目标用户 VIP 角色，需管理员登录；幂等 */
      grantVipRole: (userId: number) =>
        fetchAuthed<AdminUserRolesResp>(`/admin/users/${userId}/roles/vip`, { method: "POST" }),
      /** 取消目标用户 VIP 角色，需管理员登录；幂等 */
      revokeVipRole: (userId: number) =>
        fetchAuthed<AdminUserRolesResp>(`/admin/users/${userId}/roles/vip`, {
          method: "DELETE",
        }),
    },
    comments: {
      /** 后台分页查询文章与碎语评论（需管理员） */
      listAdmin: (req: AdminCommentListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        if (req.target_type !== undefined) p.set("target_type", req.target_type);
        if (req.search !== undefined && req.search !== "") p.set("search", req.search);
        const qs = p.toString();
        return fetchAuthed<AdminCommentPageResp>(`/admin/comments${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
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
      /** 后台分页查询全站留言（需管理员） */
      listAdmin: (req: AdminGuestbookListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        if (req.search !== undefined && req.search !== "") p.set("search", req.search);
        const qs = p.toString();
        return fetchAuthed<AdminGuestbookPageResp>(`/admin/guestbook${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
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
      /** 管理端分页查询友链，需管理员登录 */
      listAdmin: (req: FriendLinkAdminListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        if (req.status !== undefined) p.set("status", String(req.status));
        const qs = p.toString();
        return fetchAuthed<FriendLinkPageResp>(`/admin/friend-links${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 新增友链，需管理员登录；multipart 上传 logo */
      create: (req: FriendLinkCreateReq) => {
        const formData = new FormData();
        formData.append("name", req.name);
        formData.append("site", req.site);
        formData.append("seq", String(req.seq));
        if (req.description !== undefined) formData.append("description", req.description);
        if (req.email !== undefined) formData.append("email", req.email);
        if (req.phone !== undefined) formData.append("phone", req.phone);
        if (req.status !== undefined) formData.append("status", String(req.status));
        formData.append("logo", req.logo, req.logo.name);
        return fetchAuthed<FriendLinkItemResp>("/admin/friend-links", {
          method: "POST",
          body: formData,
        });
      },
      /** 修改友链，需管理员登录；logo 可选，未传则保留原头像 */
      update: (id: number, req: FriendLinkUpdateReq) => {
        const formData = new FormData();
        if (req.name !== undefined) formData.append("name", req.name);
        if (req.site !== undefined) formData.append("site", req.site);
        if (req.seq !== undefined) formData.append("seq", String(req.seq));
        if (req.description !== undefined) formData.append("description", req.description);
        if (req.email !== undefined) formData.append("email", req.email);
        if (req.phone !== undefined) formData.append("phone", req.phone);
        if (req.status !== undefined) formData.append("status", String(req.status));
        if (req.logo) formData.append("logo", req.logo, req.logo.name);
        return fetchAuthed<FriendLinkItemResp>(`/admin/friend-links/${id}`, {
          method: "PUT",
          body: formData,
        });
      },
      /** 软删除友链，需管理员登录 */
      delete: (id: number) =>
        fetchAuthed<FriendLinkItemResp>(`/admin/friend-links/${id}`, { method: "DELETE" }),
    },
    notifications: {
      /** 查询当前用户未读通知数量，需登录。 */
      unreadCount: () =>
        fetchAuthed<NotificationUnreadCountResp>("/notifications/unread-count", {
          method: "GET",
        }),
      /** 分页查询当前用户站内通知，需登录。 */
      list: (req: NotificationListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        if (req.unread_only !== undefined) p.set("unread_only", String(req.unread_only));
        const qs = p.toString();
        return fetchAuthed<NotificationPageResp>(`/notifications${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
    },
    uploads: {
      /** 上传临时图片，需登录；scene 默认 article，comment 用于留言/评论/回复 */
      tempImage: (file: File, options: TempImageUploadReq) => {
        const formData = new FormData();
        formData.append("dir", options.dir);
        if (options.scene) {
          formData.append("scene", options.scene);
        }
        formData.append("file", file);
        return fetchAuthed<TempUploadResp>("/uploads/temp", {
          method: "POST",
          body: formData,
        });
      },
    },
    /**
     * 测试用端点，与后端 /test/* 路由对应。
     * 同时作为 fetchAuthed 路径的示例，未来可删除。
     */
    /** 站点分析（后台），均需管理员登录 */
    analytics: {
      /** 总览：今日 PV/UV、在线、累计、注册/匿名分档 */
      getOverview: () =>
        fetchAuthed<AnalyticsOverviewResp>("/admin/analytics/overview", { method: "GET" }),
      /** 趋势序列：metric × segment，按天 */
      getTrend: (req: AnalyticsTrendReq = {}) => {
        const p = new URLSearchParams();
        if (req.from !== undefined) p.set("from", req.from);
        if (req.to !== undefined) p.set("to", req.to);
        if (req.metric !== undefined) p.set("metric", req.metric);
        if (req.segment !== undefined) p.set("segment", req.segment);
        const qs = p.toString();
        return fetchAuthed<AnalyticsTrendPoint[]>(`/admin/analytics/trend${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 维度分布：按「天 × 维度取值」返回，调用方按 dim_value 汇总 */
      getDimensions: (
        dimension: AnalyticsDimension,
        req: Omit<AnalyticsRangeReq, "limit"> = {},
      ) => {
        const p = new URLSearchParams();
        p.set("dimension", dimension);
        if (req.from !== undefined) p.set("from", req.from);
        if (req.to !== undefined) p.set("to", req.to);
        return fetchAuthed<AnalyticsDimensionPoint[]>(
          `/admin/analytics/dimensions?${p.toString()}`,
          { method: "GET" },
        );
      },
      /** 热门页面排行 */
      getPages: (req: AnalyticsRangeReq = {}) => {
        const p = new URLSearchParams();
        if (req.from !== undefined) p.set("from", req.from);
        if (req.to !== undefined) p.set("to", req.to);
        if (req.limit !== undefined) p.set("limit", String(req.limit));
        const qs = p.toString();
        return fetchAuthed<AnalyticsPageStat[]>(`/admin/analytics/pages${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 友链入站来源排行（含入站占比） */
      getFriendLinks: (req: AnalyticsRangeReq = {}) => {
        const p = new URLSearchParams();
        if (req.from !== undefined) p.set("from", req.from);
        if (req.to !== undefined) p.set("to", req.to);
        if (req.limit !== undefined) p.set("limit", String(req.limit));
        const qs = p.toString();
        return fetchAuthed<AnalyticsFriendLinkStat[]>(
          `/admin/analytics/friend-links${qs ? `?${qs}` : ""}`,
          { method: "GET" },
        );
      },
      /** 实时：当前在线 + 最近活跃路径 */
      getRealtime: () =>
        fetchAuthed<AnalyticsRealtimeResp>("/admin/analytics/realtime", { method: "GET" }),
      /** 访问路径序列 */
      getPaths: (req: AnalyticsRangeReq = {}) => {
        const p = new URLSearchParams();
        if (req.from !== undefined) p.set("from", req.from);
        if (req.to !== undefined) p.set("to", req.to);
        if (req.limit !== undefined) p.set("limit", String(req.limit));
        const qs = p.toString();
        return fetchAuthed<AnalyticsPathSequence[]>(`/admin/analytics/paths${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 漏斗：按有序 step 列表返回每步留存与转化率 */
      getFunnel: (steps: string[], req: Omit<AnalyticsRangeReq, "limit"> = {}) => {
        const p = new URLSearchParams();
        steps.forEach((s) => p.append("step", s));
        if (req.from !== undefined) p.set("from", req.from);
        if (req.to !== undefined) p.set("to", req.to);
        return fetchAuthed<AnalyticsFunnelStep[]>(`/admin/analytics/funnel?${p.toString()}`, {
          method: "GET",
        });
      },
      /** 回填日聚合：按闭区间逐日重算 */
      backfill: (req: AnalyticsBackfillReq) => {
        const p = new URLSearchParams();
        p.set("from", req.from);
        p.set("to", req.to);
        return fetchAuthed<AnalyticsBackfillResp>(`/admin/analytics/backfill?${p.toString()}`, {
          method: "POST",
        });
      },
      /** 后台首页汇总：内容总量、互动待办、用户统计 */
      getOverviewSummary: () =>
        fetchAuthed<AdminOverviewSummaryResp>("/admin/overview/summary", { method: "GET" }),
    },
    test: {
      authed: () => fetchAuthed<string>("/test/authed", { method: "GET" }),
    },
  };
}
