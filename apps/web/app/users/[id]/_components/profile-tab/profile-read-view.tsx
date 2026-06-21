"use client";

import { Button, cn, Tooltip } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { ReactNode } from "react";
import type { UserPublicProfileResp } from "@repo/api";
import {
  SOCIAL_PLATFORMS,
  getProfileContactLinks,
  type ProfileContactLink,
} from "./profile-config";
import { formatRegisterAt, getAge, getZodiac } from "./profile-format";

interface ProfileReadViewProps {
  profile: UserPublicProfileResp;
}

const profileValueClassName = "text-[13px] text-(--fg1)";

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
      <div className="flex w-[108px] shrink-0 items-center gap-2 sm:w-[130px]">
        <SvgIcon name={icon} size={22} className={cn("shrink-0", iconColor)} />
        <span className="text-[13px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end">{children}</div>
    </div>
  );
}

/** 联系方式行：宽度足够时与标题同行；不足时图标整行换到第二行 */
function ContactMethodsRow({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="profile-contact-row"
      className="flex flex-wrap items-start gap-x-2 gap-y-2.5 border-b border-border px-4 py-3 last:border-b-0"
    >
      <div className="flex h-8 shrink-0 items-center gap-2">
        <SvgIcon name="message-circle" size={22} className="shrink-0 text-pink-400" />
        <span className="text-[13px] text-muted-foreground">联系方式</span>
      </div>
      {/* min-w-fit 按实际图标数量计算最小宽度，仅当与标题同行放不下时才整组换行 */}
      <div
        data-testid="profile-contact-links"
        className="flex min-w-fit flex-1 flex-wrap justify-end gap-1.5"
      >
        {children}
      </div>
    </div>
  );
}

function ContactLinkButton({ link }: { link: ProfileContactLink }) {
  const meta = SOCIAL_PLATFORMS[link.platform];
  if (!meta) return null;

  const icon = (
    <SvgIcon name={meta.icon} size={18} className={meta.color ? meta.color : undefined} />
  );
  const tooltipProps = {
    title: meta.label,
    description: link.tooltipDescription,
    placement: "top" as const,
    delay: 200,
  };

  if (link.platform === "site") {
    return (
      <Tooltip {...tooltipProps}>
        <Button
          variant="ghost"
          size="sm"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={meta.label}
          className="h-8 w-8 shrink-0 p-0"
        >
          {icon}
        </Button>
      </Tooltip>
    );
  }

  if (link.platform === "email") {
    return (
      <Tooltip {...tooltipProps}>
        <Button
          variant="ghost"
          size="sm"
          aria-label={meta.label}
          className="h-8 w-8 shrink-0 p-0"
          onPress={() => {
            window.location.assign(link.url);
          }}
        >
          {icon}
        </Button>
      </Tooltip>
    );
  }

  return (
    <Tooltip {...tooltipProps}>
      <Button
        variant="ghost"
        size="sm"
        aria-label={meta.label}
        className="h-8 w-8 shrink-0 p-0"
        onPress={() => {
          if (link.platform === "qq" || link.platform === "wechat") {
            navigator.clipboard.writeText(link.url).catch(() => {});
          } else {
            window.open(link.url, "_blank", "noopener,noreferrer");
          }
        }}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}

export function ProfileReadView({ profile }: ProfileReadViewProps) {
  const genderDisplay = profile.gender === "1" ? "男生" : profile.gender === "0" ? "女生" : null;
  const ageDisplay = profile.birthday
    ? `${getAge(profile.birthday)}（${getZodiac(profile.birthday)}）`
    : null;

  const contactLinks = getProfileContactLinks(profile);

  return (
    <div>
      {contactLinks.length > 0 && (
        <ContactMethodsRow>
          {contactLinks.map((link) => (
            <ContactLinkButton key={link.key} link={link} />
          ))}
        </ContactMethodsRow>
      )}

      <ReadRow icon="info-circle" iconColor="text-sky-400" label="注册时间">
        <span className={profileValueClassName}>{formatRegisterAt(profile.register_at)}</span>
      </ReadRow>

      {profile.mark && (
        <ReadRow icon="tag" iconColor="text-indigo-400" label="身份标签">
          <span className={profileValueClassName}>{profile.mark}</span>
        </ReadRow>
      )}

      <ReadRow icon="birthday" iconColor="text-amber-400" label="年龄">
        <span className={profileValueClassName}>{ageDisplay ?? "-"}</span>
      </ReadRow>

      <ReadRow icon="gender" iconColor="text-yellow-400" label="性别">
        <span className={profileValueClassName}>{genderDisplay ?? "-"}</span>
      </ReadRow>

      <ReadRow icon="home" iconColor="text-violet-400" label="位置">
        <span className="text-[13px] text-muted-foreground/50">-</span>
      </ReadRow>
    </div>
  );
}
