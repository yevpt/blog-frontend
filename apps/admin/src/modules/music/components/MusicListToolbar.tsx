import { Select } from "@repo/ui";
import { AdminListToolbar } from "../../../components/AdminListToolbar";

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
  canClear?: boolean;
  onClear?: () => void;
}

export function MusicListToolbar({
  searchValue,
  visibilityFilter,
  onSearchChange,
  onVisibilityFilterChange,
  canClear = false,
  onClear,
}: MusicListToolbarProps) {
  return (
    <AdminListToolbar
      searchLabel="搜索音乐"
      searchPlaceholder="搜索曲名、歌手或专辑…"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      canClear={canClear}
      onClear={onClear}
      filters={
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
      }
    />
  );
}
