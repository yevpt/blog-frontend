import type { SvgIcon } from "@repo/icons";

export const SOCIAL_PLATFORMS: Record<
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
  if (value.length > 30) return "最多 30 个字符";
  return null;
}

export function validateMark(value: string): string | null {
  return value.length > 30 ? "最多 30 个字符" : null;
}

export function validateDescription(value: string): string | null {
  return value.length > 200 ? "最多 200 个字符" : null;
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
  return validateUrl(value) ?? (value.length > 200 ? "最多 200 个字符" : null);
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
