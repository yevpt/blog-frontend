"use client";

import type { MomentPageResp, UserPublicProfileResp } from "@repo/api";
import { Card, cn } from "@repo/ui";
import { useProfileEditor } from "@/hooks/use-profile-editor";
import { UserInfoHeader } from "./user-info-header";
import { UserProfileTabs } from "./user-profile-tabs";
import { PROFILE_PAGE_MAX_WIDTH_CLASS } from "./constants";

interface UserProfilePageProps {
  profile: UserPublicProfileResp;
  initialMomentsPage: MomentPageResp;
  initialLikesCount: number;
}

export function UserProfilePage({
  profile: initialProfile,
  initialMomentsPage,
  initialLikesCount,
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
    <div className="min-h-screen bg-background">
      <div className="h-16" />

      <div className={cn("mx-auto space-y-4 px-4 py-6", PROFILE_PAGE_MAX_WIDTH_CLASS)}>
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

        <Card className="overflow-hidden rounded-2xl">
          <UserProfileTabs
            profile={profile}
            initialMomentsPage={initialMomentsPage}
            initialLikesCount={initialLikesCount}
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
