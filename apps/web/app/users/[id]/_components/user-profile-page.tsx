"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { MomentPageResp, UserPublicProfileResp } from "@repo/api";
import { Card, cn } from "@repo/ui";
import { useSession } from "@/app/providers/session-provider";
import { useProfileEditor } from "@/hooks/use-profile-editor";
import { isAdminUser } from "@/lib/user-roles";
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
    updateRoles,
  } = useProfileEditor(initialProfile);

  const { profile: viewerProfile } = useSession();
  const isViewerAdmin = isAdminUser(viewerProfile?.roles);
  const canManageVip = isViewerAdmin && !isOwner && !isAdminUser(profile.roles);

  const searchParams = useSearchParams();
  // 第三方绑定回跳：URL 带 ?tab=security 时本人自动进入编辑态，使账号安全 Tab 可见并被选中。
  // useRef 守卫确保只触发一次，避免重复 toggle。
  const hasAutoEnteredEditRef = useRef(false);
  useEffect(() => {
    if (hasAutoEnteredEditRef.current) return;
    if (searchParams.get("tab") === "security" && isOwner && !isEditMode) {
      hasAutoEnteredEditRef.current = true;
      toggleEditMode();
    }
  }, [searchParams, isOwner, isEditMode, toggleEditMode]);

  return (
    <div className="min-h-screen bg-background">
      <div className="h-16" />

      <div className={cn("mx-auto space-y-4 px-4 py-6", PROFILE_PAGE_MAX_WIDTH_CLASS)}>
        <UserInfoHeader
          userId={profile.id}
          nickname={profile.nickname}
          mark={profile.mark}
          description={profile.description}
          avatarUrl={profile.avatar_url}
          lastLoginAt={profile.last_login_at}
          roles={profile.roles}
          socialLinks={profile.social_links}
          isOwner={isOwner}
          isEditMode={isEditMode}
          canManageVip={canManageVip}
          hasActiveFieldEditing={isAnyFieldEditing}
          onToggleEditMode={toggleEditMode}
          onSaveNickname={saveNickname}
          onAvatarChange={changeAvatar}
          onRolesChange={updateRoles}
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
