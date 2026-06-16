"use client";

import { useState, useCallback } from "react";
import { useSession } from "@/app/providers/session-provider";
import type { UserPublicProfileResp } from "@repo/api";
import { UserInfoHeader } from "./user-info-header";
import { UserProfileTabs } from "./user-profile-tabs";

interface UserProfilePageProps {
  profile: UserPublicProfileResp;
}

async function apiPatch(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "保存失败");
  }
}

export function UserProfilePage({ profile: initialProfile }: UserProfilePageProps) {
  const { userId } = useSession();
  const isOwner = userId !== null && userId === initialProfile.id;

  const [isEditMode, setIsEditMode] = useState(false);
  const [isAnyFieldEditing, setIsAnyFieldEditing] = useState(false);
  const [profile, setProfile] = useState(initialProfile);

  function handleToggleEditMode() {
    setIsEditMode((prev) => !prev);
  }

  const handleAvatarChange = useCallback(async (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetch("/api/users/me/avatar", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "上传失败");
    }
    const data = (await res.json()) as { avatar_url?: string };
    if (data.avatar_url) setProfile((p) => ({ ...p, avatar_url: data.avatar_url! }));
  }, []);

  const handleSaveNickname = useCallback(async (nickname: string) => {
    await apiPatch("/api/users/me/profile", { nickname });
    setProfile((p) => ({ ...p, nickname }));
  }, []);

  const handleSaveField = useCallback(async (field: string, value: string) => {
    const profileFields = ["mark", "description"] as const;
    const metaFields = ["gender", "birthday"] as const;
    const socialPlatforms = ["github", "gitee", "bilibili", "zhihu", "weibo", "qq", "wechat"];

    if (field === "nickname") {
      await apiPatch("/api/users/me/profile", { nickname: value });
      setProfile((p) => ({ ...p, nickname: value }));
      return;
    }

    if (profileFields.includes(field as (typeof profileFields)[number])) {
      await apiPatch("/api/users/me/profile", { [field]: value || null });
      setProfile((p) => ({ ...p, [field]: value || null }));
      return;
    }

    if (field === "site") {
      await apiPatch("/api/users/me/profile", { site: value || null });
      setProfile((p) => ({ ...p, site: value || null }));
      return;
    }

    if (metaFields.includes(field as (typeof metaFields)[number])) {
      await apiPatch("/api/users/me/meta", { [field]: value || "" });
      setProfile((p) => ({ ...p, [field]: value || null }));
      return;
    }

    if (socialPlatforms.includes(field)) {
      await apiPatch(`/api/users/me/social/${field}`, { url: value || null });
      setProfile((p) => ({
        ...p,
        social_links: [
          ...p.social_links.filter((l) => l.platform !== field),
          ...(value ? [{ platform: field, url: value }] : []),
        ],
      }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-muted/40">
      {/* 为固定导航栏留白 */}
      <div className="h-16" />

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {/* 用户信息卡片 */}
        <UserInfoHeader
          nickname={profile.nickname}
          mark={profile.mark}
          description={profile.description}
          avatarUrl={profile.avatar_url}
          lastLoginAt={profile.last_login_at}
          roles={profile.roles}
          socialLinks={profile.social_links}
          isOwner={isOwner}
          isEditMode={isEditMode}
          hasActiveFieldEditing={isAnyFieldEditing}
          onToggleEditMode={handleToggleEditMode}
          onSaveNickname={handleSaveNickname}
          onAvatarChange={handleAvatarChange}
        />

        {/* 详情 Tab 卡片 */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <UserProfileTabs
            profile={profile}
            isOwner={isOwner}
            isEditMode={isEditMode}
            onSaveField={handleSaveField}
            onActiveEditingChange={setIsAnyFieldEditing}
          />
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
