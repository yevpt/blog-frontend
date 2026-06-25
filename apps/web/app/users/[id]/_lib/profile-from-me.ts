import type { UserDetailResp, UserPublicProfileResp } from "@repo/api";
import { resolveDisplayEmailFromMe } from "./display-email";

/** 将 GET /users/me 降级映射为公开资料（仅本人可见场景） */
export function buildPublicProfileFromMe(me: UserDetailResp): UserPublicProfileResp {
  return {
    id: me.id,
    nickname: me.nickname ?? me.username ?? "用户",
    avatar_url: me.avatar_url ?? null,
    mark: me.mark ?? null,
    description: me.meta?.description ?? null,
    last_login_at: me.last_login_at ?? null,
    register_at: new Date().toISOString(),
    roles: me.roles,
    display_email: resolveDisplayEmailFromMe(me),
    site: me.site ?? null,
    social_links: me.social_links ?? [],
    gender: me.meta?.gender != null ? String(me.meta.gender) : null,
    birthday: me.meta?.birthday ?? null,
  };
}

/** 本人查看时，用 /users/me 补全公开资料里缺失的 display_email */
export function enrichProfileDisplayEmailForOwner(
  profile: UserPublicProfileResp,
  me: UserDetailResp,
): UserPublicProfileResp {
  if (me.id !== profile.id) return profile;
  const displayEmail = resolveDisplayEmailFromMe(me);
  if (displayEmail === profile.display_email) return profile;
  return { ...profile, display_email: displayEmail };
}
