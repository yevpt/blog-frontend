import { SearchField } from "@repo/ui";

interface TagListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function TagListToolbar({ searchValue, onSearchChange }: TagListToolbarProps) {
  return (
    <div className="shrink-0 px-4 py-3">
      <SearchField
        aria-label="搜索标签"
        placeholder="搜索标签名称或别名…"
        value={searchValue}
        onChange={onSearchChange}
        className="w-full max-w-none"
      />
    </div>
  );
}
