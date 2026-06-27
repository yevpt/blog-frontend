/** 从列表进入详情/编辑页时携带，用于返回时恢复列表筛选状态 */
export interface AdminListEditorLocationState {
  listSearch?: string;
}

export function buildAdminListEditorLinkState(listSearch: string): AdminListEditorLocationState {
  return listSearch ? { listSearch } : {};
}

export function resolveAdminListReturnSearch(
  state: AdminListEditorLocationState | null | undefined,
): string {
  const listSearch = state?.listSearch ?? "";
  return listSearch ? `?${listSearch}` : "";
}
