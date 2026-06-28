import { describe, expect, it } from "vitest";
import { userAvatarRoleRingClass } from "./user-avatar-role-ring";

describe("userAvatarRoleRingClass", () => {
  it("Admin 返回主色外圈", () => {
    expect(userAvatarRoleRingClass(true, false)).toContain("ring-primary/70");
  });

  it("VIP 返回琥珀色外圈", () => {
    expect(userAvatarRoleRingClass(false, true)).toContain("ring-amber-400/70");
  });

  it("Admin 优先于 VIP", () => {
    expect(userAvatarRoleRingClass(true, true)).toContain("ring-primary/70");
  });

  it("普通用户默认无 ring", () => {
    expect(userAvatarRoleRingClass(false, false)).toBe("");
  });

  it("reserveSlot 时普通用户保留透明 ring 占位", () => {
    expect(userAvatarRoleRingClass(false, false, true)).toContain("ring-transparent");
    expect(userAvatarRoleRingClass(false, false, true)).toContain("ring-offset-1");
  });
});
