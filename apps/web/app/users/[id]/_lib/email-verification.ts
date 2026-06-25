/** 邮箱绑定/验证态（仅未验证、未绑定时需在 UI 展示） */
export type EmailVerificationStatus = "unbound" | "unverified" | "verified";

/** 由地址与 verified 字段推导展示态；缺省 verified 按 false（兼容旧用户） */
export function resolveEmailVerificationStatus(
  email: string | null | undefined,
  verified: boolean | undefined,
): EmailVerificationStatus {
  if (!email) return "unbound";
  return verified ? "verified" : "unverified";
}

/** GET /users/me 主邮箱是否视为已验证 */
export function isMainEmailVerified(me: { email?: string; email_verified?: boolean }): boolean {
  return !!me.email && (me.email_verified ?? false);
}

/** GET /users/me 副邮箱是否视为已验证 */
export function isSubEmailVerified(me: {
  meta?: { sub_email?: string | null; sub_email_verified?: boolean };
}): boolean {
  const sub = me.meta?.sub_email;
  return !!sub && (me.meta?.sub_email_verified ?? false);
}
