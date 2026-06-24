import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { MomentPageResp, UserPublicProfileResp } from "@repo/api";
import { createServerApiClient } from "@/lib/server-api";
import { UserProfilePage } from "./_components/user-profile-page";
import {
  EMPTY_MOMENTS_PAGE,
  PROFILE_MOMENTS_PAGE_SIZE,
} from "./_components/profile-moments-tab/constants";

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
  try {
    return await api.users.getPublicProfile(id);
  } catch (err) {
    console.warn(`[UserProfile] GET /users/${id} 失败，尝试降级到 /users/me:`, err);
  }

  // 降级：用当前登录用户数据（/users/me）模拟公开详情
  try {
    const me = await api.users.getMe();
    if (me.id !== id) return null;
    return {
      id: me.id,
      nickname: me.nickname ?? me.username ?? "用户",
      avatar_url: me.avatar_url ?? null,
      mark: me.mark ?? null,
      description: me.meta?.description ?? null,
      last_login_at: me.last_login_at ?? null,
      register_at: new Date().toISOString(),
      roles: me.roles,
      display_email: null,
      site: me.site ?? null,
      social_links: me.social_links ?? [],
      gender: me.meta?.gender != null ? String(me.meta.gender) : null,
      birthday: me.meta?.birthday ?? null,
    };
  } catch {
    // /users/me also failed
  }

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

  return <UserProfilePage profile={profile} initialMomentsPage={initialMomentsPage} />;
}
