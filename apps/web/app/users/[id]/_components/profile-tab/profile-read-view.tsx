"use client";

import { cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { ReactNode } from "react";
import type { UserPublicProfileResp } from "@repo/api";
import { SOCIAL_PLATFORMS } from "./profile-config";
import { formatRegisterAt, getAge, getZodiac } from "./profile-format";

interface ProfileReadViewProps {
  profile: UserPublicProfileResp;
}

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

export function ProfileReadView({ profile }: ProfileReadViewProps) {
  const genderDisplay = profile.gender === "1" ? "男生" : profile.gender === "0" ? "女生" : null;
  const ageDisplay = profile.birthday
    ? `${getAge(profile.birthday)}（${getZodiac(profile.birthday)}）`
    : null;

  const socialLinks = [
    ...(profile.site ? [{ platform: "site", url: profile.site }] : []),
    ...(profile.social_links ?? []).filter((link) => SOCIAL_PLATFORMS[link.platform] && link.url),
  ];

  return (
    <div>
      {socialLinks.length > 0 && (
        <ReadRow icon="message-circle" iconColor="text-pink-400" label="联系方式">
          <div className="flex items-center gap-2">
            {socialLinks.map((link) => {
              const meta =
                link.platform === "site" ? SOCIAL_PLATFORMS.site : SOCIAL_PLATFORMS[link.platform];
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

      <ReadRow icon="info-circle" iconColor="text-sky-400" label="注册时间">
        <span className="text-[13px] text-foreground">{formatRegisterAt(profile.register_at)}</span>
      </ReadRow>

      {profile.mark && (
        <ReadRow icon="tag" iconColor="text-indigo-400" label="身份标签">
          <span className="text-[13px] text-foreground">{profile.mark}</span>
        </ReadRow>
      )}

      <ReadRow icon="birthday" iconColor="text-amber-400" label="年龄">
        <span className="text-[13px] text-foreground">{ageDisplay ?? "-"}</span>
      </ReadRow>

      <ReadRow icon="gender" iconColor="text-yellow-400" label="性别">
        <span className="text-[13px] text-foreground">{genderDisplay ?? "-"}</span>
      </ReadRow>

      <ReadRow icon="home" iconColor="text-violet-400" label="位置">
        <span className="text-[13px] text-muted-foreground/50">-</span>
      </ReadRow>
    </div>
  );
}
