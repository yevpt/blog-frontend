/** 站点创建日（本地时区 2019-12-30 00:00） */
export const SITE_CREATED_AT = new Date(2019, 11, 30);

/** 将建站至今的时长格式化为中文展示文案 */
export function formatSiteUptime(since: Date, now: Date): string {
  const diffMs = Math.max(0, now.getTime() - since.getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `已运行 ${days} 天 ${hours} 小时 ${minutes} 分钟`;
}
