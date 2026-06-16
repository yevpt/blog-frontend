"use client";

import { useState } from "react";
import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { ReactNode } from "react";
import type { UserPublicProfileResp } from "@repo/api";
import { FieldRow } from "./field-row";

function getZodiac(birthday: string): string {
  const d = new Date(birthday);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return "白羊座";
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return "金牛座";
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return "双子座";
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return "巨蟹座";
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return "狮子座";
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return "处女座";
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return "天秤座";
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return "天蝎座";
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return "射手座";
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return "摩羯座";
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return "水瓶座";
  return "双鱼座";
}

function getAge(birthday: string): number {
  const now = new Date();
  const b = new Date(birthday);
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function formatRegisterAt(iso: string): string {
  try {
    return iso.replace("T", " ").slice(0, 19);
  } catch {
    return iso;
  }
}

const SOCIAL_PLATFORMS: Record<
  string,
  { icon: Parameters<typeof SvgIcon>[0]["name"]; label: string; color: string }
> = {
  site: { icon: "link", label: "个人站点", color: "text-muted-foreground" },
  github: { icon: "github", label: "GitHub", color: "text-foreground" },
  gitee: { icon: "gitee", label: "Gitee", color: "text-orange-500" },
  bilibili: { icon: "bilibili", label: "Bilibili", color: "text-sky-400" },
  zhihu: { icon: "zhihu", label: "知乎", color: "text-blue-500" },
  weibo: { icon: "weibo", label: "微博", color: "text-red-500" },
  qq: { icon: "qq", label: "QQ", color: "text-blue-400" },
  wechat: { icon: "wechat", label: "微信", color: "text-green-500" },
};

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
      onSave: (v: string) => onSaveField(field, v),
    };
  }

  const genderDisplay = profile.gender === "1" ? "男生" : profile.gender === "0" ? "女生" : null;

  const ageDisplay = profile.birthday
    ? `${getAge(profile.birthday)}（${getZodiac(profile.birthday)}）`
    : null;

  // 只读模式：扁平列表，与参考版一致
  if (!isEditMode) {
    const socialLinks = [
      ...(profile.site ? [{ platform: "site", url: profile.site }] : []),
      ...(profile.social_links ?? []).filter((l) => SOCIAL_PLATFORMS[l.platform] && l.url),
    ];

    return (
      <div>
        {/* 联系方式 — 社交图标行 */}
        {socialLinks.length > 0 && (
          <ReadRow icon="message-circle" iconColor="text-pink-400" label="联系方式">
            <div className="flex items-center gap-2">
              {socialLinks.map((link) => {
                const meta =
                  link.platform === "site"
                    ? SOCIAL_PLATFORMS.site
                    : SOCIAL_PLATFORMS[link.platform];
                if (!meta) return null;
                if (link.platform === "site") {
                  return (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.06] transition-colors hover:bg-primary/15"
                      title={meta.label}
                    >
                      <SvgIcon name={meta.icon} size={18} className={meta.color} />
                    </a>
                  );
                }
                return (
                  <button
                    type="button"
                    key={link.platform}
                    onClick={() => {
                      if (link.platform === "qq" || link.platform === "wechat") {
                        navigator.clipboard.writeText(link.url).catch(() => {});
                      } else {
                        window.open(link.url, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.06] transition-colors hover:bg-primary/15"
                    title={meta.label}
                  >
                    <SvgIcon name={meta.icon} size={18} className={meta.color} />
                  </button>
                );
              })}
            </div>
          </ReadRow>
        )}

        {/* 注册时间 */}
        <ReadRow icon="info-circle" iconColor="text-sky-400" label="注册时间">
          <span className="text-[13px] text-foreground">
            {formatRegisterAt(profile.register_at)}
          </span>
        </ReadRow>

        {/* 身份标签 */}
        {profile.mark && (
          <ReadRow icon="tag" iconColor="text-indigo-400" label="身份标签">
            <span className="text-[13px] text-foreground">{profile.mark}</span>
          </ReadRow>
        )}

        {/* 年龄 */}
        <ReadRow icon="birthday" iconColor="text-amber-400" label="年龄">
          <span className="text-[13px] text-foreground">{ageDisplay ?? "-"}</span>
        </ReadRow>

        {/* 性别 */}
        <ReadRow icon="gender" iconColor="text-yellow-400" label="性别">
          <span className="text-[13px] text-foreground">{genderDisplay ?? "-"}</span>
        </ReadRow>

        {/* 位置 */}
        <ReadRow icon="home" iconColor="text-violet-400" label="位置">
          <span className="text-[13px] text-muted-foreground/50">-</span>
        </ReadRow>
      </div>
    );
  }

  // 编辑模式：保留分区和编辑功能
  const validateNickname = (v: string) => {
    if (!v.trim()) return "昵称不能为空";
    if (v.length > 30) return "最多 30 个字符";
    return null;
  };
  const validateMark = (v: string) => (v.length > 30 ? "最多 30 个字符" : null);
  const validateDescription = (v: string) => (v.length > 200 ? "最多 200 个字符" : null);
  const validateUrl = (v: string) => {
    if (!v) return null;
    try {
      new URL(v);
      return null;
    } catch {
      return "请输入有效的链接（如 https://...）";
    }
  };
  const validateUrlLen = (v: string) =>
    validateUrl(v) ?? (v.length > 200 ? "最多 200 个字符" : null);
  const validateQq = (v: string) => {
    if (!v) return null;
    if (!/^\d{5,15}$/.test(v)) return "请输入 5-15 位 QQ 号";
    return null;
  };
  const validateWechat = (v: string) => {
    if (!v) return null;
    if (v.length < 6 || v.length > 20) return "微信号长度 6-20 位";
    if (!/^[a-zA-Z0-9_-]+$/.test(v)) return "只允许字母、数字、下划线和连字符";
    return null;
  };
  const validatePhone = (v: string) => {
    if (!v) return null;
    if (!/^\+?[\d\s-]{7,20}$/.test(v)) return "请输入有效的手机号";
    return null;
  };

  const GENDER_OPTIONS = [
    { label: "请选择", value: "" },
    { label: "男生", value: "1" },
    { label: "女生", value: "0" },
  ];

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
          options={GENDER_OPTIONS}
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
        {(
          [
            {
              field: "github",
              label: "GitHub",
              icon: "github",
              color: "text-foreground",
              type: "url",
              validate: validateUrlLen,
            },
            {
              field: "gitee",
              label: "Gitee",
              icon: "gitee",
              color: "text-orange-500",
              type: "url",
              validate: validateUrlLen,
            },
            {
              field: "wechat",
              label: "微信",
              icon: "wechat",
              color: "text-green-500",
              type: "text",
              validate: validateWechat,
            },
            {
              field: "qq",
              label: "QQ",
              icon: "qq",
              color: "text-blue-400",
              type: "text",
              validate: validateQq,
            },
            {
              field: "bilibili",
              label: "Bilibili",
              icon: "bilibili",
              color: "text-sky-400",
              type: "url",
              validate: validateUrlLen,
            },
            {
              field: "zhihu",
              label: "知乎",
              icon: "zhihu",
              color: "text-blue-500",
              type: "url",
              validate: validateUrlLen,
            },
            {
              field: "weibo",
              label: "微博",
              icon: "weibo",
              color: "text-red-500",
              type: "url",
              validate: validateUrlLen,
            },
          ] as const
        ).map(({ field, label, icon, color, type, validate }) => {
          const socialLink = profile.social_links.find((l) => l.platform === field);
          return (
            <FieldRow
              key={field}
              label={label}
              icon={icon}
              iconColor={color}
              value={socialLink?.url ?? null}
              emptyText="+ 添加"
              inputType={type as "text" | "url"}
              isLink={!!socialLink?.url}
              validate={validate}
              {...fieldProps(field)}
            />
          );
        })}
      </div>
    </div>
  );
}

/** 只读模式的通用行组件 */
function ReadRow({
  icon,
  iconColor,
  label,
  children,
}: {
  icon: Parameters<typeof SvgIcon>[0]["name"];
  iconColor: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[52px] items-center border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex w-[130px] shrink-0 items-center gap-2.5">
        <SvgIcon name={icon} size={22} className={cn("shrink-0", iconColor)} />
        <span className="text-[13px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex flex-1 items-center justify-end">{children}</div>
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
