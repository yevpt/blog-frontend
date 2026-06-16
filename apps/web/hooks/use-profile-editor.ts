"use client";

import { useCallback, useState } from "react";
import type { UserPublicProfileResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { apiForm, apiJson, ApiClientError } from "@/lib/client-fetch";

const PROFILE_FIELDS = ["mark", "description"] as const;
const META_FIELDS = ["gender", "birthday"] as const;
const SOCIAL_PLATFORMS = ["github", "gitee", "bilibili", "zhihu", "weibo", "qq", "wechat"] as const;

interface AvatarUploadResp {
  avatar_url?: string;
}

function toClientError(err: unknown, fallback: string): Error {
  if (err instanceof ApiClientError) {
    return new Error(err.message);
  }
  if (err instanceof Error) {
    return err;
  }
  return new Error(fallback);
}

export function useProfileEditor(initialProfile: UserPublicProfileResp) {
  const { userId } = useSession();
  const isOwner = userId !== null && userId === initialProfile.id;

  const [profile, setProfile] = useState(initialProfile);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAnyFieldEditing, setIsAnyFieldEditing] = useState(false);

  const toggleEditMode = useCallback(() => {
    setIsEditMode((current) => !current);
  }, []);

  const saveNickname = useCallback(async (nickname: string) => {
    try {
      await apiJson("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      setProfile((current) => ({ ...current, nickname }));
    } catch (err) {
      throw toClientError(err, "保存失败");
    }
  }, []);

  const saveField = useCallback(async (field: string, value: string) => {
    try {
      if (field === "nickname") {
        await apiJson("/api/users/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: value }),
        });
        setProfile((current) => ({ ...current, nickname: value }));
        return;
      }

      if (PROFILE_FIELDS.includes(field as (typeof PROFILE_FIELDS)[number])) {
        await apiJson("/api/users/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value || null }),
        });
        setProfile((current) => ({ ...current, [field]: value || null }));
        return;
      }

      if (field === "site") {
        await apiJson("/api/users/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site: value || null }),
        });
        setProfile((current) => ({ ...current, site: value || null }));
        return;
      }

      if (META_FIELDS.includes(field as (typeof META_FIELDS)[number])) {
        await apiJson("/api/users/me/meta", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value || "" }),
        });
        setProfile((current) => ({ ...current, [field]: value || null }));
        return;
      }

      if (SOCIAL_PLATFORMS.includes(field as (typeof SOCIAL_PLATFORMS)[number])) {
        await apiJson(`/api/users/me/social/${field}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value || null }),
        });
        setProfile((current) => ({
          ...current,
          social_links: [
            ...current.social_links.filter((link) => link.platform !== field),
            ...(value ? [{ platform: field, url: value }] : []),
          ],
        }));
      }
    } catch (err) {
      throw toClientError(err, "保存失败");
    }
  }, []);

  const changeAvatar = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const data = await apiForm<AvatarUploadResp>("/api/users/me/avatar", formData, {
        method: "POST",
      });
      if (data.avatar_url) {
        setProfile((current) => ({
          ...current,
          avatar_url: data.avatar_url ?? current.avatar_url,
        }));
      }
    } catch (err) {
      throw toClientError(err, "上传失败");
    }
  }, []);

  return {
    profile,
    isOwner,
    isEditMode,
    isAnyFieldEditing,
    setIsAnyFieldEditing,
    toggleEditMode,
    saveNickname,
    saveField,
    changeAvatar,
  };
}
