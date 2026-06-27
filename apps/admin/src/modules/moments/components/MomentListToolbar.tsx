import type { AdminMomentStatusFilter } from "@repo/api";
import { Select } from "@repo/ui";
import { AdminListToolbar } from "../../../components/AdminListToolbar";
import { MOMENT_STATUS_FILTER_OPTIONS } from "../model";

interface MomentListToolbarProps {
  searchValue: string;
  status: AdminMomentStatusFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AdminMomentStatusFilter) => void;
  canClear?: boolean;
  onClear?: () => void;
}

export function MomentListToolbar({
  searchValue,
  status,
  onSearchChange,
  onStatusChange,
  canClear = false,
  onClear,
}: MomentListToolbarProps) {
  return (
    <AdminListToolbar
      searchLabel="搜索碎语"
      searchPlaceholder="搜索碎语内容…"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      canClear={canClear}
      onClear={onClear}
      filters={
        <Select
          aria-label="筛选碎语状态"
          selectedKey={status}
          onSelectionChange={(key) => onStatusChange(String(key) as AdminMomentStatusFilter)}
          className="w-full sm:w-36"
        >
          {MOMENT_STATUS_FILTER_OPTIONS.map((option) => (
            <Select.Item key={option.value} id={option.value} label={option.label} />
          ))}
        </Select>
      }
    />
  );
}
