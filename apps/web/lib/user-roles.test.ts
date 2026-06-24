import { describe, expect, it } from "vitest";
import { isAdminUser, isVipUser, ROLE_ADMIN, ROLE_VIP } from "./user-roles";

describe("user-roles", () => {
  it("识别后端 ROLE_VIP", () => {
    expect(isVipUser(["ROLE_NORMAL", ROLE_VIP])).toBe(true);
  });

  it("识别后端 ROLE_ADMIN", () => {
    expect(isAdminUser([ROLE_ADMIN])).toBe(true);
  });

  it("Admin 不算 VIP 皇冠", () => {
    expect(isVipUser([ROLE_ADMIN])).toBe(false);
  });

  it("兼容测试 mock 的小写 vip", () => {
    expect(isVipUser(["vip"])).toBe(true);
  });
});
