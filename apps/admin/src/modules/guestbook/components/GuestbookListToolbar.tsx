import { SearchField } from "@repo/ui";

interface GuestbookListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function GuestbookListToolbar({ searchValue, onSearchChange }: GuestbookListToolbarProps) {
  return (
    <div className="flex min-w-0 shrink-0 px-4 py-3">
      <SearchField
        aria-label="搜索留言"
        placeholder="搜索留言内容…"
        value={searchValue}
        onChange={onSearchChange}
        className="w-full max-w-none"
      />
    </div>
  );
}
