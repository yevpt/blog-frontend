import { SearchField } from "@repo/ui";

interface UserListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function UserListToolbar({ searchValue, onSearchChange }: UserListToolbarProps) {
  return (
    <div className="flex min-w-0 shrink-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <SearchField
        aria-label="搜索用户"
        placeholder="搜索昵称、标记或角色…"
        value={searchValue}
        onChange={onSearchChange}
        className="w-full max-w-none sm:flex-1"
      />
    </div>
  );
}
