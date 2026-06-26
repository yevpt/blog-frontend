import type { AdminMomentStatusFilter } from "@repo/api";
import { SearchField, Select } from "@repo/ui";
import { MOMENT_STATUS_FILTER_OPTIONS } from "../model";

interface MomentListToolbarProps {
  searchValue: string;
  status: AdminMomentStatusFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AdminMomentStatusFilter) => void;
}

export function MomentListToolbar({
  searchValue,
  status,
  onSearchChange,
  onStatusChange,
}: MomentListToolbarProps) {
  return (
    <div className="flex min-w-0 shrink-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <SearchField
        aria-label="搜索动态"
        placeholder="搜索动态内容…"
        value={searchValue}
        onChange={onSearchChange}
        className="w-full max-w-none sm:flex-1"
      />

      <Select
        aria-label="筛选动态状态"
        selectedKey={status}
        onSelectionChange={(key) => onStatusChange(String(key) as AdminMomentStatusFilter)}
        className="w-full sm:w-36"
      >
        {MOMENT_STATUS_FILTER_OPTIONS.map((option) => (
          <Select.Item key={option.value} id={option.value} label={option.label} />
        ))}
      </Select>
    </div>
  );
}
