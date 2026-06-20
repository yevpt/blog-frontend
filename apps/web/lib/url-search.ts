/* global window */
/** 仅更新地址栏 page 查询参数，不触发 Next.js 路由导航 */
export function replacePageSearchParam(page: number): void {
  const url = new URL(window.location.href);
  if (page <= 1) {
    url.searchParams.delete("page");
  } else {
    url.searchParams.set("page", String(page));
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}
