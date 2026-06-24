"use client";

import type { MomentPageResp, UserPublicProfileResp } from "@repo/api";
import { Card } from "@repo/ui";
import { useProfileEditor } from "@/hooks/use-profile-editor";
import { UserInfoHeader } from "./user-info-header";
import { UserProfileTabs } from "./user-profile-tabs";

interface UserProfilePageProps {
  profile: UserPublicProfileResp;
  initialMomentsPage: MomentPageResp;
}

export function UserProfilePage({
  profile: initialProfile,
  initialMomentsPage,
}: UserProfilePageProps) {
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

        <Card className="overflow-hidden">
          <UserProfileTabs
            profile={profile}
            initialMomentsPage={initialMomentsPage}
            isOwner={isOwner}
            isEditMode={isEditMode}
            onSaveField={saveField}
            onActiveEditingChange={setIsAnyFieldEditing}
          />
        </Card>

        <div className="pb-8" />
      </div>
    </div>
  );
}
