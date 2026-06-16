"use client";

import type { UserPublicProfileResp } from "@repo/api";
import { useProfileEditor } from "@/hooks/use-profile-editor";
import { UserInfoHeader } from "./user-info-header";
import { UserProfileTabs } from "./user-profile-tabs";

interface UserProfilePageProps {
  profile: UserPublicProfileResp;
}

export function UserProfilePage({ profile: initialProfile }: UserProfilePageProps) {
  const {
    profile,
    isOwner,
    isEditMode,
    isAnyFieldEditing,
    setIsAnyFieldEditing,
    toggleEditMode,
    saveNickname,
    saveField,
    changeAvatar,
  } = useProfileEditor(initialProfile);

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="h-16" />

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
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
          onToggleEditMode={toggleEditMode}
          onSaveNickname={saveNickname}
          onAvatarChange={changeAvatar}
        />

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <UserProfileTabs
            profile={profile}
            isOwner={isOwner}
            isEditMode={isEditMode}
            onSaveField={saveField}
            onActiveEditingChange={setIsAnyFieldEditing}
          />
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
