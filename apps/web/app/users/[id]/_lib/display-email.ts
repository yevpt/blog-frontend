import type { UserDetailResp } from "@repo/api";

/** 对外展示邮箱的可选值 */
export type EmailDisplayValue = "main" | "sub" | "none";

/** mailShow 数值 → 展示值（后端：1=main, 0=sub, 2=none，未知按 main） */
export function mailShowToDisplay(mailShow: number): EmailDisplayValue {
  if (mailShow === 0) return "sub";
  if (mailShow === 2) return "none";
  return "main";
}

/** 展示值 → mailShow 数值 */
export function displayToMailShow(display: EmailDisplayValue): number {
  if (display === "sub") return 0;
  if (display === "none") return 2;
  return 1;
}

/** 按对外展示设置从主/副邮箱解析应展示的邮箱地址 */
export function resolveDisplayEmail(
  mailShow: number,
  mainEmail: string | null | undefined,
  subEmail: string | null | undefined,
): string | null {
  const display = mailShowToDisplay(mailShow);
  if (display === "none") return null;
  if (display === "sub") return subEmail ?? null;
  return mainEmail ?? null;
}

/** 从 GET /users/me 响应解析对外展示邮箱 */
export function resolveDisplayEmailFromMe(me: UserDetailResp): string | null {
  return resolveDisplayEmail(me.setting?.mail_show ?? 0, me.email, me.meta?.sub_email);
}

/** 展示值 + 主副邮箱 → 对外展示邮箱（账号安全 Tab 局部更新资料 Tab 用） */
export function displayEmailForSetting(
  display: EmailDisplayValue,
  mainEmail: string | null,
  subEmail: string | null,
): string | null {
  return resolveDisplayEmail(displayToMailShow(display), mainEmail, subEmail);
}
