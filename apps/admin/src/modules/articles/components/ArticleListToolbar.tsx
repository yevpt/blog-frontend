import { Select } from "@repo/ui";
import { AdminListToolbar } from "../../../components/AdminListToolbar";
import type { FilterOption } from "../model";

interface ArticleListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  categoryOptions: FilterOption[];
  onCategoryChange: (value: string) => void;
  canClear?: boolean;
  onClear?: () => void;
}

export function ArticleListToolbar({
  searchValue,
  onSearchChange,
  categoryId,
  categoryOptions,
  onCategoryChange,
  canClear = false,
  onClear,
}: ArticleListToolbarProps) {
  return (
    <AdminListToolbar
      searchLabel="搜索文章"
      searchPlaceholder="搜索标题或摘要…"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      canClear={canClear}
      onClear={onClear}
      filters={
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
      }
    />
  );
}
