import { describe, it, expect } from "vitest";
import type { UserDetailResp } from "@repo/api";
import {
  displayEmailForSetting,
  displayToMailShow,
  mailShowToDisplay,
  resolveDisplayEmail,
  resolveDisplayEmailFromMe,
} from "./display-email";

function meResp(over: Partial<UserDetailResp> = {}): UserDetailResp {
  return {
    id: 1,
    username: "tester",
    email: "main@example.com",
    email_verified: true,
    status: 0,
    roles: [],
    meta: { sub_email: "sub@example.com", sub_email_verified: true },
    setting: { mail_show: 1 } as UserDetailResp["setting"],
    ...over,
  };
}

describe("display-email", () => {
  it("mailShow 与展示值互转", () => {
    expect(displayToMailShow("main")).toBe(1);
    expect(displayToMailShow("sub")).toBe(0);
    expect(displayToMailShow("none")).toBe(2);
    expect(mailShowToDisplay(1)).toBe("main");
    expect(mailShowToDisplay(0)).toBe("sub");
    expect(mailShowToDisplay(2)).toBe("none");
  });

  it("resolveDisplayEmail 仅返回已验证邮箱", () => {
    expect(resolveDisplayEmail(1, "main@x.com", "sub@x.com", { main: true, sub: true })).toBe(
      "main@x.com",
    );
    expect(resolveDisplayEmail(0, "main@x.com", "sub@x.com", { main: true, sub: true })).toBe(
      "sub@x.com",
    );
    expect(
      resolveDisplayEmail(1, "main@x.com", "sub@x.com", { main: false, sub: true }),
    ).toBeNull();
    expect(resolveDisplayEmail(2, "main@x.com", "sub@x.com", { main: true })).toBeNull();
  });

  it("resolveDisplayEmailFromMe 从用户详情解析", () => {
    expect(resolveDisplayEmailFromMe(meResp())).toBe("main@example.com");
    expect(
      resolveDisplayEmailFromMe(
        meResp({ email_verified: false, setting: { mail_show: 1 } as UserDetailResp["setting"] }),
      ),
    ).toBeNull();
    expect(
      resolveDisplayEmailFromMe(meResp({ setting: { mail_show: 2 } as UserDetailResp["setting"] })),
    ).toBeNull();
  });

  it("displayEmailForSetting 供客户端局部更新", () => {
    expect(displayEmailForSetting("main", "a@b.com", null, true, false)).toBe("a@b.com");
    expect(displayEmailForSetting("main", "a@b.com", null, false, false)).toBeNull();
    expect(displayEmailForSetting("none", "a@b.com", null, true, false)).toBeNull();
  });
});
