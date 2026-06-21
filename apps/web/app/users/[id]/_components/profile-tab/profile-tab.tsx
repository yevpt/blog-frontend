"use client";

import { useState } from "react";
import { cn } from "@repo/ui";
import type { ReactNode } from "react";
import type { UserPublicProfileResp } from "@repo/api";
import { FieldRow } from "./field-row";
import {
  GENDER_OPTIONS,
  SOCIAL_FIELD_LIST,
  SOCIAL_FIELD_VALIDATORS,
  findSocialLink,
  validateDescription,
  validateMark,
  validateNickname,
  validatePhone,
  validateUrlLen,
} from "./profile-config";
import { ProfileReadView } from "./profile-read-view";

interface ProfileTabProps {
  profile: UserPublicProfileResp;
  isOwner: boolean;
  isEditMode: boolean;
  onSaveField: (field: string, value: string) => Promise<void>;
  onActiveEditingChange?: (active: boolean) => void;
}

export function ProfileTab({
  profile,
  isOwner,
  isEditMode,
  onSaveField,
  onActiveEditingChange,
}: ProfileTabProps) {
  const [activeField, setActiveField] = useState<string | null>(null);

  function fieldProps(field: string) {
    return {
      isEditMode,
      isOwner,
      isActiveEditing: activeField === field,
      isAnyEditing: activeField !== null,
      onActivate: () => {
        setActiveField(field);
        onActiveEditingChange?.(true);
      },
      onDeactivate: () => {
        setActiveField(null);
        onActiveEditingChange?.(false);
      },
      onSave: (value: string) => onSaveField(field, value),
    };
  }

  const genderDisplay = profile.gender === "1" ? "男生" : profile.gender === "0" ? "女生" : null;

  if (!isEditMode) {
    return <ProfileReadView profile={profile} />;
  }

  return (
    <div>
      <SectionHeader>基本信息</SectionHeader>
      <div className="border-t border-border">
        <FieldRow
          label="昵称"
          icon="user"
          iconColor="text-pink-400"
          value={profile.nickname}
          emptyText="未填写"
          validate={validateNickname}
          {...fieldProps("nickname")}
        />
        <FieldRow
          label="身份标签"
          icon="tag"
          iconColor="text-indigo-400"
          value={profile.mark}
          emptyText="未填写"
          validate={validateMark}
          {...fieldProps("mark")}
        />
        <FieldRow
          label="个人简介"
          icon="edit"
          iconColor="text-blue-400"
          value={profile.description}
          emptyText="未填写"
          validate={validateDescription}
          {...fieldProps("description")}
        />
        <FieldRow
          label="性别"
          icon="gender"
          iconColor="text-yellow-400"
          value={profile.gender ?? null}
          displayValue={genderDisplay}
          emptyText="未填写"
          options={[...GENDER_OPTIONS]}
          {...fieldProps("gender")}
        />
        <FieldRow
          label="生日"
          icon="birthday"
          iconColor="text-amber-400"
          value={profile.birthday}
          emptyText="未填写"
          inputType="date"
          {...fieldProps("birthday")}
        />
      </div>

      <SectionHeader className="mt-2">联系方式</SectionHeader>
      <div className="border-t border-border">
        <FieldRow
          label="个人站点"
          icon="link"
          iconColor="text-muted-foreground"
          value={profile.site}
          emptyText="+ 添加"
          inputType="url"
          isLink={!!profile.site}
          validate={validateUrlLen}
          {...fieldProps("site")}
        />
        <FieldRow
          label="联系电话"
          icon="phone"
          iconColor="text-green-400"
          value={null}
          emptyText="+ 添加"
          inputType="tel"
          validate={validatePhone}
          {...fieldProps("phone")}
        />
      </div>

      <SectionHeader className="mt-2">社交账号</SectionHeader>
      <div className="border-t border-border">
        {SOCIAL_FIELD_LIST.map(({ field, label, icon, color, type }) => {
          const socialLink = findSocialLink(profile.social_links, field);
          return (
            <FieldRow
              key={field}
              label={label}
              icon={icon}
              iconColor={color}
              value={socialLink?.url ?? null}
              emptyText="+ 添加"
              inputType={type}
              isLink={!!socialLink?.url}
              validate={SOCIAL_FIELD_VALIDATORS[field]}
              {...fieldProps(field)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn("px-4 pb-1 pt-4 text-xs font-semibold text-muted-foreground/60", className)}>
      {children}
    </h3>
  );
}
