"use client";

import { useState } from "react";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { UserPublicProfileResp } from "@repo/api";
import { ProfileTab } from "./profile-tab/profile-tab";
import { SecurityTab } from "./security-tab/security-tab";
import { ProfileMomentsTab } from "./profile-moments-tab/profile-moments-tab";
import { ProfileLikesTab } from "./profile-likes-tab/profile-likes-tab";
import { formatProfileMomentsTabLabel } from "./profile-moments-tab/constants";
import { formatProfileLikesTabLabel } from "./profile-likes-tab/constants";
import type { MomentPageResp } from "@repo/api";

type TabKey = "profile" | "moments" | "likes" | "security";

interface TabDef {
  id: TabKey;
  label: string;
  icon: Parameters<typeof SvgIcon>[0]["name"];
  iconColor: string;
}

interface UserProfileTabsProps {
  profile: UserPublicProfileResp;
  initialMomentsPage: MomentPageResp;
  initialLikesCount: number;
  isOwner: boolean;
  isEditMode: boolean;
  onSaveField: (field: string, value: string) => Promise<void>;
  onActiveEditingChange?: (active: boolean) => void;
}

export function UserProfileTabs({
  profile,
  initialMomentsPage,
  initialLikesCount,
  isOwner,
  isEditMode,
  onSaveField,
  onActiveEditingChange,
}: UserProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [momentsTotal, setMomentsTotal] = useState(initialMomentsPage.total);
  const [likesTotal, setLikesTotal] = useState(initialLikesCount);

  const tabs: TabDef[] =
    isEditMode && isOwner
      ? [
          { id: "profile", label: "资料", icon: "user", iconColor: "text-pink-400" },
          { id: "security", label: "账号安全", icon: "shield", iconColor: "text-blue-400" },
        ]
      : [
          { id: "profile", label: "资料", icon: "user", iconColor: "text-pink-400" },
          {
            id: "moments",
            label: formatProfileMomentsTabLabel(momentsTotal),
            icon: "message-circle",
            iconColor: "text-sky-400",
          },
          {
            id: "likes",
            label: formatProfileLikesTabLabel(likesTotal),
            icon: "heart-fill",
            iconColor: "text-rose-400",
          },
        ];

  const validTab = tabs.find((t) => t.id === activeTab) ? activeTab : "profile";
  const activeIndex = tabs.findIndex((t) => t.id === validTab);

  return (
    <div>
      {/* Tab 导航栏 */}
      <div className="relative flex border-b border-border" role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={validTab === tab.id}
            onMouseDown={(event) => {
              // 鼠标切换 Tab 不保留 focus，避免点击后按修饰键触发 focus ring
              event.preventDefault();
            }}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium select-none",
              "text-muted-foreground outline-none [-webkit-tap-highlight-color:transparent]",
              "transition-colors duration-200 hover:bg-foreground/[0.08] focus-visible:bg-foreground/[0.08]",
              index === 0 && "rounded-tl-lg",
              index === tabs.length - 1 && "rounded-tr-lg",
            )}
          >
            <SvgIcon name={tab.icon} size={17} className={cn("shrink-0", tab.iconColor)} />
            <span>{tab.label}</span>
          </button>
        ))}

        {/* 滑动指示线 — 下移 1px 覆盖 tablist 的 border-b */}
        <span
          aria-hidden
          data-testid="user-profile-tab-indicator"
          className="pointer-events-none absolute -bottom-px left-0 z-10 h-[2px] bg-primary transition-transform duration-300 ease-in-out"
          style={{
            width: `${100 / tabs.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
      </div>

      {/* Tab 内容 */}
      <div className="min-h-[160px]">
        {validTab === "profile" && (
          <ProfileTab
            profile={profile}
            isOwner={isOwner}
            isEditMode={isEditMode}
            onSaveField={onSaveField}
            onActiveEditingChange={onActiveEditingChange}
          />
        )}
        {validTab === "moments" && (
          <ProfileMomentsTab
            userId={profile.id}
            isOwner={isOwner}
            initialPage={initialMomentsPage}
            onTotalChange={setMomentsTotal}
          />
        )}
        {validTab === "likes" && (
          <ProfileLikesTab
            userId={profile.id}
            isOwner={isOwner}
            likesCount={likesTotal}
            onCountChange={setLikesTotal}
          />
        )}
        {validTab === "security" && isOwner && isEditMode && <SecurityTab userId={profile.id} />}
      </div>
    </div>
  );
}
