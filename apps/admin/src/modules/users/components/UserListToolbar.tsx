import { AdminListToolbar } from "../../../components/AdminListToolbar";

interface UserListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  canClear?: boolean;
  onClear?: () => void;
}

export function UserListToolbar({
  searchValue,
  onSearchChange,
  canClear = false,
  onClear,
}: UserListToolbarProps) {
  return (
    <AdminListToolbar
      searchLabel="搜索用户"
      searchPlaceholder="搜索昵称、标记或角色…"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      canClear={canClear}
      onClear={onClear}
    />
  );
}
