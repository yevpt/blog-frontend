import { expect, test } from "vitest";
import {
  CIRCLE_GRID_LIST_STYLE,
  CIRCLE_GRID_MAX_COLUMNS,
  CIRCLE_GRID_ROW_HEIGHT,
  CIRCLE_GRID_SHELL_CLASS,
  sortCircleUsers,
} from "./circle-grid";
import type { UserListItemResp } from "@repo/api";

function user(id: number, roles: string[] = []): UserListItemResp {
  return {
    id,
    nickname: `User ${id}`,
    avatar_url: "",
    roles,
    last_login_at: undefined,
  };
}

test("sortCircleUsers 按 Admin > VIP > 普通排序并去重", () => {
  const sorted = sortCircleUsers([user(1), user(2, ["vip"]), user(3, ["admin"]), user(1)]);

  expect(sorted.map((u) => u.id)).toEqual([3, 2, 1]);
});

test("网格样式限制最多 6 列自适应", () => {
  expect(CIRCLE_GRID_MAX_COLUMNS).toBe(6);
  const columns = CIRCLE_GRID_LIST_STYLE.gridTemplateColumns;
  expect(columns).toContain("repeat(auto-fill");
  expect(columns).toContain("/ 6");
  expect(CIRCLE_GRID_LIST_STYLE.gridAutoRows).toBe(CIRCLE_GRID_ROW_HEIGHT);
});

test("平板断点限宽居中，宽屏恢复满宽", () => {
  expect(CIRCLE_GRID_SHELL_CLASS).toContain("md:max-w-[40rem]");
  expect(CIRCLE_GRID_SHELL_CLASS).toContain("xl:max-w-none");
});
