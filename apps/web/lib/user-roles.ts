/** 与后端 pkg/roles 保持一致 */
export const ROLE_ADMIN = "ROLE_ADMIN";
export const ROLE_VIP = "ROLE_VIP";
export const ROLE_NORMAL = "ROLE_NORMAL";

function normalizeRole(role: string): string {
  return role.trim().toUpperCase();
}

/** 判断用户是否拥有 VIP 角色（不含 Admin） */
export function isVipUser(roles?: string[] | null): boolean {
  if (!roles?.length) return false;
  return roles.some((role) => {
    const normalized = normalizeRole(role);
    return normalized === ROLE_VIP || normalized === "VIP";
  });
}

/** 判断用户是否拥有 Admin 角色 */
export function isAdminUser(roles?: string[] | null): boolean {
  if (!roles?.length) return false;
  return roles.some((role) => {
    const normalized = normalizeRole(role);
    return normalized === ROLE_ADMIN || normalized === "ADMIN";
  });
}
