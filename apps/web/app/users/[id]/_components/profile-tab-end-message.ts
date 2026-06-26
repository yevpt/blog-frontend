/** 是否展示个人页 Tab 列表底部「已经到底了」：不足一页时省略，避免短列表突兀占位 */
export function shouldShowProfileTabEndMessage(
  itemCount: number,
  hasMore: boolean,
  currentPage: number,
  pageSize: number,
): boolean {
  if (hasMore || itemCount === 0) {
    return false;
  }
  if (currentPage > 1) {
    return true;
  }
  return itemCount >= pageSize;
}
