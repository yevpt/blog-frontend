import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { MomentPageResp, UserPublicProfileResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { UserProfilePage } from "./_components/user-profile-page";
import {
  EMPTY_MOMENTS_PAGE,
  PROFILE_MOMENTS_PAGE_SIZE,
} from "./_components/profile-moments-tab/constants";
import {
  buildPublicProfileFromMe,
  enrichProfileDisplayEmailForOwner,
} from "./_lib/profile-from-me";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 尝试获取用户公开详情。
 * 若后端 /users/:id 接口未就绪（404/500），降级为 /users/me（仅本人可用）。
 * 两者都失败则返回 null。
 */
async function fetchProfile(id: number): Promise<UserPublicProfileResp | null> {
  const api = await createServerApiClient();
  let profile: UserPublicProfileResp | null = null;

  try {
    profile = await api.users.getPublicProfile(id);
  } catch (err) {
    console.warn(`[UserProfile] GET /users/${id} 失败，尝试降级到 /users/me:`, err);
  }

  // 降级：用当前登录用户数据（/users/me）模拟公开详情
  if (!profile) {
    try {
      const me = await api.users.getMe();
      if (me.id !== id) return null;
      profile = buildPublicProfileFromMe(me);
    } catch {
      // /users/me also failed
    }
  }

  // 本人查看：用 /users/me 的 mail_show 补全 display_email（公开接口可能未返回）
  if (profile) {
    try {
      const me = await api.users.getMe();
      profile = enrichProfileDisplayEmailForOwner(profile, me);
    } catch {
      // 未登录或非本人，保留公开接口返回值
    }
  }

  if (profile) return profile;

  // dev 模式：返回 mock 数据方便本地预览（生产环境不会触发此分支）
  if (process.env.NODE_ENV === "development") {
    return {
      id,
      nickname: "预览用户",
      avatar_url: null,
      mark: "全栈开发者",
      description: "这是一段个人简介，用于本地 UI 预览。",
      last_login_at: new Date(Date.now() - 60 * 1000).toISOString(),
      register_at: "2023-01-01T00:00:00Z",
      roles: [],
      display_email: "preview@example.com",
      site: "https://yevpt.com",
      social_links: [
        { platform: "github", url: "https://github.com/example" },
        { platform: "bilibili", url: "https://bilibili.com" },
      ],
      gender: "1",
      birthday: "1995-06-15",
    };
  }

  return null;
}

async function fetchUserMoments(userId: number): Promise<MomentPageResp> {
  const api = await createServerApiClient();
  try {
    return await api.moments.listPublic({
      user_id: userId,
      page: 1,
      page_size: PROFILE_MOMENTS_PAGE_SIZE,
    });
  } catch (err) {
    console.warn(`[UserProfile] GET /moments?user_id=${userId} 失败:`, err);
    return EMPTY_MOMENTS_PAGE;
  }
}

async function fetchUserLikesCount(userId: number): Promise<number> {
  const api = await createServerApiClient();
  try {
    const data = await api.users.getLikesCount(userId);
    return data.count;
  } catch (err) {
    console.warn(`[UserProfile] GET /users/${userId}/likes/count 失败:`, err);
    return 0;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return { title: "用户不存在" };
  const profile = await fetchProfile(numId);
  if (!profile) return { title: "用户主页" };
  return {
    title: `${profile.nickname} | Yevpt's Blog`,
    description: profile.description ?? `${profile.nickname} 的个人主页`,
  };
}

export default async function UserProfileRoute({ params }: Props) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId) || numId <= 0) notFound();

  const profile = await fetchProfile(numId);
  if (!profile) notFound();

  const initialMomentsPage = await fetchUserMoments(numId);
  const initialLikesCount = await fetchUserLikesCount(numId);

  return (
    <UserProfilePage
      profile={profile}
      initialMomentsPage={initialMomentsPage}
      initialLikesCount={initialLikesCount}
    />
  );
}
