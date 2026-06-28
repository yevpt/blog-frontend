/** Admin/VIP 头像外圈 ring-offset 样式；网格场景 reserveSlot 用透明 ring 占位防 CLS */
export function userAvatarRoleRingClass(
  isAdmin: boolean,
  isVip: boolean,
  reserveSlot = false,
): string {
  if (!isAdmin && !isVip && !reserveSlot) return "";

  const color = isAdmin ? "ring-primary/70" : isVip ? "ring-amber-400/70" : "ring-transparent";

  return `ring-2 ring-offset-1 ring-offset-background ${color}`;
}
