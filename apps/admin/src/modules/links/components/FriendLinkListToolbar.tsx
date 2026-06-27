import { Select } from "@repo/ui";
import { AdminListToolbar } from "../../../components/AdminListToolbar";
import { FRIEND_LINK_STATUS_FILTER_OPTIONS } from "../model";

interface FriendLinkListToolbarProps {
  searchValue: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  canClear?: boolean;
  onClear?: () => void;
}

export function FriendLinkListToolbar({
  searchValue,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  canClear = false,
  onClear,
}: FriendLinkListToolbarProps) {
  return (
    <AdminListToolbar
      searchLabel="搜索友链"
      searchPlaceholder="搜索名称、站点或描述…"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      canClear={canClear}
      onClear={onClear}
      filters={
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
      }
    />
  );
}
