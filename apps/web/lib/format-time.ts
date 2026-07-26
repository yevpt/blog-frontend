import type { Locale } from "@repo/hooks/locale";

/** 展示时区：SSR（容器 UTC）与浏览器本地时区一致，避免 hydration 日期文本不匹配 */
const DISPLAY_TIME_ZONE = "Asia/Shanghai";

/** 中文月份名，索引 0 对应 1 月 */
const ZH_MONTHS = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];

function getZonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: lookup("year"),
    month: Number(lookup("month")),
    day: Number(lookup("day")),
    hour: lookup("hour").padStart(2, "0"),
    minute: lookup("minute").padStart(2, "0"),
  };
}

/**
 * 将日期格式化为指定语言的绝对日期字符串。
 * 中文：六月 24, 2021
 * 英文：December 26, 2025
 */
export function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (locale === "en") {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: DISPLAY_TIME_ZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  }
  const { year, month, day } = getZonedParts(d);
  return `${ZH_MONTHS[month - 1]} ${day}, ${year}`;
}

/** 将日期格式化为 YYYY-MM-DD HH:mm（Asia/Shanghai） */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const { year, month, day, hour, minute } = getZonedParts(d);
  const monthStr = String(month).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");
  return `${year}-${monthStr}-${dayStr} ${hour}:${minute}`;
}

/** 将日期格式化为紧凑的 MM-DD（Asia/Shanghai），用于归档行内日期 */
export function formatMonthDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const { month, day } = getZonedParts(d);
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 取展示时区（Asia/Shanghai）下的年份，用于归档按年分组 */
export function getDisplayYear(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Number(getZonedParts(d).year);
}

/**
 * 将日期转换为相对时间字符串（中文）
 * 例如：刚刚、5 分钟前、2 小时前、3 天前、1 个月前、2 年前
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  if (months < 12) return `${months} 个月前`;
  return `${years} 年前`;
}
