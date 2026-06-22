import type { UserPublicProfileResp, UserSocialLinkResp } from "@repo/api";
import type { SvgIcon } from "@repo/icons";

/** 后端 user_social_link.platform → 前端 canonical key */
const SOCIAL_PLATFORM_ALIASES: Record<string, string> = {
  sina: "weibo",
  bili: "bilibili",
};

/** 前端 field → 后端 PATCH /users/me/social/:platform 路径参数 */
const SOCIAL_PLATFORM_API_KEYS: Record<string, string> = {
  weibo: "sina",
  bilibili: "bili",
};

export function normalizeSocialPlatform(platform: string): string {
  return SOCIAL_PLATFORM_ALIASES[platform] ?? platform;
}

export function toBackendSocialPlatform(platform: string): string {
  return SOCIAL_PLATFORM_API_KEYS[platform] ?? platform;
}

/** 按前端 field 查找社交链接（兼容后端 platform 别名） */
export function findSocialLink(
  links: UserSocialLinkResp[] | undefined,
  field: string,
): UserSocialLinkResp | undefined {
  return (links ?? []).find((link) => normalizeSocialPlatform(link.platform) === field);
}

/** 过滤并归一化可展示的社交链接 */
export function getDisplaySocialLinks(
  links: UserSocialLinkResp[] | undefined,
): Array<{ platform: string; url: string }> {
  return (links ?? [])
    .filter((link) => link.url && SOCIAL_PLATFORMS[normalizeSocialPlatform(link.platform)])
    .map((link) => ({
      platform: normalizeSocialPlatform(link.platform),
      url: link.url,
    }));
}

export interface ProfileContactLink {
  key: string;
  platform: string;
  url: string;
  tooltipDescription?: string;
}

/** 资料页「联系方式」行：站点、对外邮箱、社交链接（顺序对齐旧版） */
export function getProfileContactLinks(
  profile: Pick<UserPublicProfileResp, "site" | "display_email" | "social_links">,
): ProfileContactLink[] {
  const links: ProfileContactLink[] = [];

  if (profile.site) {
    links.push({ key: "site", platform: "site", url: profile.site });
  }

  if (profile.display_email) {
    links.push({
      key: "email",
      platform: "email",
      url: `mailto:${profile.display_email}`,
      tooltipDescription: profile.display_email,
    });
  }

  for (const link of getDisplaySocialLinks(profile.social_links)) {
    links.push({ key: link.platform, platform: link.platform, url: link.url });
  }

  return links;
}

export const SOCIAL_PLATFORMS: Record<
  string,
  { icon: Parameters<typeof SvgIcon>[0]["name"]; label: string; color: string }
> = {
  site: { icon: "link", label: "个人站点", color: "text-muted-foreground" },
  email: { icon: "email", label: "邮箱", color: "" },
  github: { icon: "github", label: "GitHub", color: "text-foreground" },
  gitee: { icon: "gitee", label: "Gitee", color: "text-orange-500" },
  bilibili: { icon: "bilibili", label: "Bilibili", color: "text-sky-400" },
  zhihu: { icon: "zhihu", label: "知乎", color: "text-blue-500" },
  weibo: { icon: "weibo", label: "微博", color: "text-red-500" },
  qq: { icon: "qq", label: "QQ", color: "text-blue-400" },
  wechat: { icon: "wechat", label: "微信", color: "text-green-500" },
};

export const GENDER_OPTIONS = [
  { label: "请选择", value: "" },
  { label: "男生", value: "1" },
  { label: "女生", value: "0" },
] as const;

export const SOCIAL_FIELD_LIST = [
  {
    field: "github",
    label: "GitHub",
    icon: "github",
    color: "text-foreground",
    type: "url",
  },
  {
    field: "gitee",
    label: "Gitee",
    icon: "gitee",
    color: "text-orange-500",
    type: "url",
  },
  {
    field: "wechat",
    label: "微信",
    icon: "wechat",
    color: "text-green-500",
    type: "text",
  },
  {
    field: "qq",
    label: "QQ",
    icon: "qq",
    color: "text-blue-400",
    type: "text",
  },
  {
    field: "bilibili",
    label: "Bilibili",
    icon: "bilibili",
    color: "text-sky-400",
    type: "url",
  },
  {
    field: "zhihu",
    label: "知乎",
    icon: "zhihu",
    color: "text-blue-500",
    type: "url",
  },
  {
    field: "weibo",
    label: "微博",
    icon: "weibo",
    color: "text-red-500",
    type: "url",
  },
] as const;

export function validateNickname(value: string): string | null {
  if (!value.trim()) return "昵称不能为空";
  if (value.length > 150) return "最多 150 个字符";
  return null;
}

export function validateMark(value: string): string | null {
  return value.length > 200 ? "最多 200 个字符" : null;
}

export function validateDescription(value: string): string | null {
  return value.length > 1000 ? "最多 1000 个字符" : null;
}

export function validateUrl(value: string): string | null {
  if (!value) return null;
  try {
    new URL(value);
    return null;
  } catch {
    return "请输入有效的链接（如 https://...）";
  }
}

export function validateUrlLen(value: string): string | null {
  return validateUrl(value) ?? (value.length > 500 ? "最多 500 个字符" : null);
}

export function validateQq(value: string): string | null {
  if (!value) return null;
  if (!/^\d{5,15}$/.test(value)) return "请输入 5-15 位 QQ 号";
  return null;
}

export function validateWechat(value: string): string | null {
  if (!value) return null;
  if (value.length < 6 || value.length > 20) return "微信号长度 6-20 位";
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) return "只允许字母、数字、下划线和连字符";
  return null;
}

export function validatePhone(value: string): string | null {
  if (!value) return null;
  if (!/^\+?[\d\s-]{7,20}$/.test(value)) return "请输入有效的手机号";
  return null;
}

export const SOCIAL_FIELD_VALIDATORS: Record<
  (typeof SOCIAL_FIELD_LIST)[number]["field"],
  (value: string) => string | null
> = {
  github: validateUrlLen,
  gitee: validateUrlLen,
  wechat: validateWechat,
  qq: validateQq,
  bilibili: validateUrlLen,
  zhihu: validateUrlLen,
  weibo: validateUrlLen,
};
