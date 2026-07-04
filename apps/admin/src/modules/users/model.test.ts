import { describe, expect, it } from "vitest";
import type { AdminUserListItemResp } from "@repo/api";
import {
  DEFAULT_USER_LIST_QUERY_STATE,
  getAccountStatusBadge,
  getSanctionBadge,
  mapUserToRow,
  userListQueryCodec,
} from "./model";

const adminUser: AdminUserListItemResp = {
  id: 7,
  username: "vpt",
  nickname: "VPT",
  email: "vpt@example.com",
  mark: "博主",
  roles: ["ROLE_ADMIN"],
  status: 0,
  sanction_state: "muted",
  is_online: true,
  last_active_at: "2026-06-26T08:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
};

describe("userListQueryCodec", () => {
  it("解析并写回关键词、角色、账号状态与分页", () => {
    const state = userListQueryCodec.parse(
      new URLSearchParams("page=2&keyword=vpt&role=ROLE_ADMIN&status=disabled"),
    );

    expect(state).toEqual({
      page: 2,
      filters: { keyword: "vpt", role: "ROLE_ADMIN", status: "disabled" },
    });
    expect(userListQueryCodec.write(state).toString()).toBe(
      "page=2&keyword=vpt&role=ROLE_ADMIN&status=disabled",
    );
    expect(userListQueryCodec.hasActive(state)).toBe(true);
  });

  it("默认筛选不写入查询参数", () => {
    expect(userListQueryCodec.write(DEFAULT_USER_LIST_QUERY_STATE).toString()).toBe("");
    expect(userListQueryCodec.hasActive(DEFAULT_USER_LIST_QUERY_STATE)).toBe(false);
  });
});

describe("mapUserToRow", () => {
  it("映射管理端用户账号和内容治理字段", () => {
    const row = mapUserToRow(adminUser);

    expect(row).toMatchObject({
      id: "7",
      username: "vpt",
      displayName: "VPT",
      email: "vpt@example.com",
      accountStatus: "disabled",
      sanctionState: "muted",
      isAdmin: true,
    });
    expect(row.registerAt).not.toBe("-");
    expect(getAccountStatusBadge(row)).toEqual({ label: "已禁用", variant: "error" });
    expect(getSanctionBadge(row)).toEqual({ label: "禁言", variant: "warning" });
  });
});
