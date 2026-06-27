import type { CSSProperties } from "react";
import type { UserListItemResp } from "@repo/api";
import { isAdminUser, isVipUser } from "@/lib/user-roles";

export const CIRCLE_GRID_MAX_COLUMNS = 6;

/** gap-2 = 0.5rem；6 列时共 5 个列间隙 */
const GRID_GAP_TOTAL_REM = 2.5;

/** 固定卡片行高，供 Virtuoso 测算与 grid-auto-rows 对齐，减少滚动 CLS */
export const CIRCLE_GRID_ROW_HEIGHT = "7.5rem";

export const CIRCLE_GRID_LIST_CLASS = "grid items-stretch gap-2";

/**
 * auto-fill 自适应列数：窄屏少列，宽屏增至最多 6 列。
 * 单格最小宽度 max(100px, 容器宽/6)，避免大屏超过 6 列、小屏过碎。
 */
export const CIRCLE_GRID_LIST_STYLE: CSSProperties = {
  gridTemplateColumns: `repeat(auto-fill, minmax(max(6.25rem, calc((100% - ${GRID_GAP_TOTAL_REM}rem) / ${CIRCLE_GRID_MAX_COLUMNS})), 1fr))`,
  gridAutoRows: CIRCLE_GRID_ROW_HEIGHT,
};

export const CIRCLE_GRID_ITEM_CLASS = "box-border min-w-0 contain-[layout]";

/** Virtuoso item 内层固定高度，与 gridAutoRows 一致 */
export const CIRCLE_GRID_ITEM_INNER_CLASS = "h-[7.5rem]";

/** 与 BaseUserCard variant=normal 一致的卡片壳（圈子网格专用，无交互态） */
export const CIRCLE_USER_CARD_CLASS = "flex h-full flex-col items-center gap-2 rounded-xl p-2.5";

/**
 * 手机端贴满 PageContainer 内容区；平板（md～lg）限宽居中留左右空白；xl+ 用满容器以容纳 6 列。
 */
export const CIRCLE_GRID_SHELL_CLASS =
  "mx-auto w-full md:max-w-[40rem] lg:max-w-[44rem] xl:max-w-none";

export const CIRCLE_PAGE_SIZE = 50;

export function sortCircleUsers(list: UserListItemResp[]): UserListItemResp[] {
  const unique = [...new Map(list.map((u) => [u.id, u])).values()];
  return [...unique].sort((a, b) => {
    const aAdmin = isAdminUser(a.roles) ? 1 : 0;
    const bAdmin = isAdminUser(b.roles) ? 1 : 0;
    if (aAdmin !== bAdmin) return bAdmin - aAdmin;
    const aVip = isVipUser(a.roles) ? 1 : 0;
    const bVip = isVipUser(b.roles) ? 1 : 0;
    return bVip - aVip;
  });
}
