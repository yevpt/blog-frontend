"use client";

import { useState } from "react";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { UserPublicProfileResp } from "@repo/api";
import { ProfileTab } from "./profile-tab/profile-tab";
import { SecurityTab } from "./security-tab/security-tab";

type TabKey = "profile" | "moments" | "likes" | "security";

interface TabDef {
  id: TabKey;
  label: string;
  icon: Parameters<typeof SvgIcon>[0]["name"];
  iconColor: string;
}

interface UserProfileTabsProps {
  profile: UserPublicProfileResp;
  isOwner: boolean;
  isEditMode: boolean;
  onSaveField: (field: string, value: string) => Promise<void>;
  onActiveEditingChange?: (active: boolean) => void;
}

export function UserProfileTabs({
  profile,
  isOwner,
  isEditMode,
  onSaveField,
  onActiveEditingChange,
}: UserProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const tabs: TabDef[] =
    isEditMode && isOwner
      ? [
          { id: "profile", label: "资料", icon: "user", iconColor: "text-pink-400" },
          { id: "security", label: "账号安全", icon: "shield", iconColor: "text-blue-400" },
        ]
      : [
          { id: "profile", label: "资料", icon: "user", iconColor: "text-pink-400" },
          { id: "moments", label: "碎语", icon: "message-circle", iconColor: "text-sky-400" },
          { id: "likes", label: "点赞", icon: "heart-fill", iconColor: "text-rose-400" },
        ];

  const validTab = tabs.find((t) => t.id === activeTab) ? activeTab : "profile";
  const activeIndex = tabs.findIndex((t) => t.id === validTab);

  return (
    <div>
      {/* Tab 导航栏 */}
      <div className="relative flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium select-none",
              "text-foreground rounded-t-lg transition-colors duration-200 hover:bg-foreground/[0.08]",
            )}
          >
            <SvgIcon name={tab.icon} size={17} className={cn("shrink-0", tab.iconColor)} />
            <span>{tab.label}</span>
          </button>
        ))}

        {/* 滑动指示线 — 单一元素，translateX 动效 */}
        <span
          className="pointer-events-none absolute bottom-0 h-[2px] bg-primary transition-transform duration-300 ease-in-out"
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
          <p className="py-12 text-center text-sm text-muted-foreground/50">暂无碎语</p>
        )}
        {validTab === "likes" && (
          <p className="py-12 text-center text-sm text-muted-foreground/50">暂无点赞内容</p>
        )}
        {validTab === "security" && isOwner && isEditMode && <SecurityTab userId={profile.id} />}
      </div>
    </div>
  );
}
