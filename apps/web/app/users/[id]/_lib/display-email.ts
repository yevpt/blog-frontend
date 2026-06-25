import type { UserDetailResp } from "@repo/api";
import { isMainEmailVerified, isSubEmailVerified } from "./email-verification";

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

export interface ResolveDisplayEmailVerified {
  main?: boolean;
  sub?: boolean;
}

/** 按对外展示设置从主/副邮箱解析应展示的邮箱地址（仅已验证邮箱可展示） */
export function resolveDisplayEmail(
  mailShow: number,
  mainEmail: string | null | undefined,
  subEmail: string | null | undefined,
  verified: ResolveDisplayEmailVerified = {},
): string | null {
  const display = mailShowToDisplay(mailShow);
  if (display === "none") return null;
  if (display === "sub") return verified.sub && subEmail ? subEmail : null;
  return verified.main && mainEmail ? mainEmail : null;
}

/** 从 GET /users/me 响应解析对外展示邮箱 */
export function resolveDisplayEmailFromMe(me: UserDetailResp): string | null {
  return resolveDisplayEmail(me.setting?.mail_show ?? 0, me.email, me.meta?.sub_email, {
    main: isMainEmailVerified(me),
    sub: isSubEmailVerified(me),
  });
}

/** 展示值 + 主副邮箱 → 对外展示邮箱（账号安全 Tab 局部更新资料 Tab 用） */
export function displayEmailForSetting(
  display: EmailDisplayValue,
  mainEmail: string | null,
  subEmail: string | null,
  mainVerified = false,
  subVerified = false,
): string | null {
  return resolveDisplayEmail(displayToMailShow(display), mainEmail, subEmail, {
    main: mainVerified,
    sub: subVerified,
  });
}
