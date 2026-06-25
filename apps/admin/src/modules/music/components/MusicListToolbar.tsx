import { SearchField, Select } from "@repo/ui";

const visibilityOptions = [
  { value: "all", label: "全部状态" },
  { value: "public", label: "公开" },
  { value: "hidden", label: "隐藏" },
];

interface MusicListToolbarProps {
  searchValue: string;
  visibilityFilter: string;
  onSearchChange: (value: string) => void;
  onVisibilityFilterChange: (value: string) => void;
}

export function MusicListToolbar({
  searchValue,
  visibilityFilter,
  onSearchChange,
  onVisibilityFilterChange,
}: MusicListToolbarProps) {
  return (
    <div className="flex min-w-0 shrink-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <SearchField
        aria-label="搜索音乐"
        placeholder="搜索曲名、歌手或专辑…"
        value={searchValue}
        onChange={onSearchChange}
        className="w-full max-w-none sm:flex-1"
      />
      <Select
        aria-label="筛选公开状态"
        selectedKey={visibilityFilter}
        onSelectionChange={(key) => onVisibilityFilterChange(String(key))}
        className="w-full sm:w-36"
      >
        {visibilityOptions.map((option) => (
          <Select.Item key={option.value} id={option.value} label={option.label} />
        ))}
      </Select>
    </div>
  );
}
