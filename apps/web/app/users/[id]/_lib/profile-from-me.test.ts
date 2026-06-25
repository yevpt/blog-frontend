import { describe, it, expect } from "vitest";
import type { UserDetailResp, UserPublicProfileResp } from "@repo/api";
import { buildPublicProfileFromMe, enrichProfileDisplayEmailForOwner } from "./profile-from-me";

const me: UserDetailResp = {
  id: 7,
  username: "alice",
  nickname: "Alice",
  email: "alice@main.com",
  status: 0,
  roles: [],
  meta: { sub_email: "alice@sub.com" },
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
};

describe("profile-from-me", () => {
  it("buildPublicProfileFromMe 包含按设置解析的 display_email", () => {
    const profile = buildPublicProfileFromMe(me);
    expect(profile.display_email).toBe("alice@main.com");
    expect(profile.nickname).toBe("Alice");
  });

  it("enrichProfileDisplayEmailForOwner 为本人补全缺失的 display_email", () => {
    const publicProfile: UserPublicProfileResp = {
      id: 7,
      nickname: "Alice",
      avatar_url: null,
      mark: null,
      description: null,
      last_login_at: null,
      register_at: "2024-01-01",
      roles: [],
      display_email: null,
      site: null,
      social_links: [],
      gender: null,
      birthday: null,
    };
    const enriched = enrichProfileDisplayEmailForOwner(publicProfile, me);
    expect(enriched.display_email).toBe("alice@main.com");
  });

  it("非本人不修改 display_email", () => {
    const publicProfile: UserPublicProfileResp = {
      id: 99,
      nickname: "Bob",
      avatar_url: null,
      mark: null,
      description: null,
      last_login_at: null,
      register_at: "2024-01-01",
      roles: [],
      display_email: null,
      site: null,
      social_links: [],
      gender: null,
      birthday: null,
    };
    expect(enrichProfileDisplayEmailForOwner(publicProfile, me)).toBe(publicProfile);
  });
});
