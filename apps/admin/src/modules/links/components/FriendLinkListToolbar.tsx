import { SearchField, Select } from "@repo/ui";
import { FRIEND_LINK_STATUS_FILTER_OPTIONS } from "../model";

interface FriendLinkListToolbarProps {
  searchValue: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}

export function FriendLinkListToolbar({
  searchValue,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
}: FriendLinkListToolbarProps) {
  return (
    <div className="flex min-w-0 shrink-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <SearchField
        aria-label="搜索友链"
        placeholder="搜索名称、站点或描述…"
        value={searchValue}
        onChange={onSearchChange}
        className="w-full max-w-none sm:flex-1"
      />

      <Select
        aria-label="筛选状态"
        selectedKey={statusFilter}
        onSelectionChange={(key) => onStatusFilterChange(String(key))}
        className="w-full sm:w-36"
      >
        {FRIEND_LINK_STATUS_FILTER_OPTIONS.map((option) => (
          <Select.Item key={option.value} id={option.value} label={option.label} />
        ))}
      </Select>
    </div>
  );
}
