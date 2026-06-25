import { SearchField } from "@repo/ui";

interface CategoryListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function CategoryListToolbar({ searchValue, onSearchChange }: CategoryListToolbarProps) {
  return (
    <div className="shrink-0 px-4 py-3">
      <SearchField
        aria-label="搜索分类"
        placeholder="搜索分类名称、别名或描述…"
        value={searchValue}
        onChange={onSearchChange}
        className="w-full max-w-none"
      />
    </div>
  );
}
