import { SearchField, Select } from "@repo/ui";
import type { FilterOption } from "../model";

interface ArticleListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  categoryOptions: FilterOption[];
  onCategoryChange: (value: string) => void;
}

export function ArticleListToolbar({
  searchValue,
  onSearchChange,
  categoryId,
  categoryOptions,
  onCategoryChange,
}: ArticleListToolbarProps) {
  return (
    <div className="flex shrink-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <SearchField
        aria-label="搜索文章"
        placeholder="搜索标题或摘要…"
        value={searchValue}
        onChange={onSearchChange}
        className="w-full max-w-none sm:flex-1"
      />

      <Select
        aria-label="筛选分类"
        selectedKey={categoryId}
        onSelectionChange={(key) => onCategoryChange(String(key))}
        className="w-full sm:w-40 md:hidden"
      >
        {categoryOptions.map((option) => (
          <Select.Item key={option.value} id={option.value} label={option.label} />
        ))}
      </Select>
    </div>
  );
}
