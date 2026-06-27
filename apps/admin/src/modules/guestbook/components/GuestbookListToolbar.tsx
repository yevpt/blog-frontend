import { AdminListToolbar } from "../../../components/AdminListToolbar";

interface GuestbookListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  canClear?: boolean;
  onClear?: () => void;
}

export function GuestbookListToolbar({
  searchValue,
  onSearchChange,
  canClear = false,
  onClear,
}: GuestbookListToolbarProps) {
  return (
    <AdminListToolbar
      searchLabel="搜索留言"
      searchPlaceholder="搜索留言内容…"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      canClear={canClear}
      onClear={onClear}
    />
  );
}
