import { AdminListToolbar } from "../../../components/AdminListToolbar";

interface TagListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  canClear?: boolean;
  onClear?: () => void;
}

export function TagListToolbar({
  searchValue,
  onSearchChange,
  canClear = false,
  onClear,
}: TagListToolbarProps) {
  return (
    <AdminListToolbar
      searchLabel="搜索标签"
      searchPlaceholder="搜索标签名称或别名…"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      canClear={canClear}
      onClear={onClear}
    />
  );
}
