import { AdminListToolbar } from "../../../components/AdminListToolbar";

interface CategoryListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  canClear?: boolean;
  onClear?: () => void;
}

export function CategoryListToolbar({
  searchValue,
  onSearchChange,
  canClear = false,
  onClear,
}: CategoryListToolbarProps) {
  return (
    <AdminListToolbar
      searchLabel="搜索分类"
      searchPlaceholder="搜索分类名称、别名或描述…"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      canClear={canClear}
      onClear={onClear}
    />
  );
}
