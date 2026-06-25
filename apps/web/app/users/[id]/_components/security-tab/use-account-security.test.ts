import { describe, it, expect } from "vitest";
import type { UserDetailResp } from "@repo/api";
import { normalizeOAuthBindings, toSecurityData } from "./use-account-security";

function meResp(over: Partial<UserDetailResp> = {}): UserDetailResp {
  return {
    id: 1,
    username: "tester",
    email: "main@example.com",
    status: 0,
    roles: [],
    password_set: true,
    meta: { sub_email: null },
    setting: {
      mail_show: 1,
      mail_receive: 0,
      dark_mode: 0,
      receive_mail: false,
      show_name: false,
      show_age: false,
      show_phone: false,
      show_qq: false,
      show_wechat: false,
      show_zhihu: false,
      show_sina: false,
      show_bili: false,
      show_position: false,
    },
    ...over,
  };
}

describe("normalizeOAuthBindings", () => {
  it("解析 source 字段", () => {
    expect(normalizeOAuthBindings([{ source: "github", social_user_id: 1 }])).toEqual([
      { source: "github", social_user_id: 1 },
    ]);
  });

  it("兼容 provider 字段与大小写", () => {
    expect(normalizeOAuthBindings([{ provider: "GitHub", social_user_id: 2 }])).toEqual([
      { source: "github", social_user_id: 2 },
    ]);
  });

  it("非数组响应回退为空列表", () => {
    expect(normalizeOAuthBindings({})).toEqual([]);
    expect(normalizeOAuthBindings(null)).toEqual([]);
  });
});

describe("toSecurityData", () => {
  it("providers 与 bindings 按 source 合并绑定态", () => {
    const data = toSecurityData(
      meResp(),
      ["github", "qq"],
      [{ source: "github", social_user_id: 1 }],
    );
    expect(data.providers).toEqual([
      { source: "github", bound: true },
      { source: "qq", bound: false },
    ]);
  });

  it("bindings 大小写与 providers 不一致时仍能匹配", () => {
    const data = toSecurityData(meResp(), ["github"], [{ provider: "GitHub", social_user_id: 1 }]);
    expect(data.providers).toEqual([{ source: "github", bound: true }]);
  });
});
