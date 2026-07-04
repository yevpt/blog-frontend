import { Select } from "@repo/ui";
import { AdminListToolbar } from "../../../components/AdminListToolbar";
import type { AdminUserListFilters } from "../model";

interface UserListToolbarProps {
  filters: AdminUserListFilters;
  onFiltersChange: (
    updater: (previous: AdminUserListFilters) => AdminUserListFilters,
  ) => void;
  canClear?: boolean;
  onClear?: () => void;
}

export function UserListToolbar({
  filters,
  onFiltersChange,
  canClear = false,
  onClear,
}: UserListToolbarProps) {
  return (
    <AdminListToolbar
      searchLabel="搜索用户"
      searchPlaceholder="搜索用户名、昵称或邮箱…"
      searchValue={filters.keyword}
      onSearchChange={(value) =>
        onFiltersChange((previous) => ({ ...previous, keyword: value }))
      }
      canClear={canClear}
      onClear={onClear}
      filters={
        <>
          <Select
            aria-label="筛选角色"
            selectedKey={filters.role}
            onSelectionChange={(key) =>
              onFiltersChange((previous) => ({ ...previous, role: String(key) }))
            }
            className="w-full sm:w-32"
          >
            <Select.Item id="all" label="全部角色" />
            <Select.Item id="ROLE_ADMIN" label="管理员" />
            <Select.Item id="ROLE_VIP" label="VIP" />
            <Select.Item id="ROLE_NORMAL" label="普通用户" />
          </Select>
          <Select
            aria-label="筛选账号状态"
            selectedKey={filters.status}
            onSelectionChange={(key) =>
              onFiltersChange((previous) => ({ ...previous, status: String(key) }))
            }
            className="w-full sm:w-32"
          >
            <Select.Item id="all" label="全部状态" />
            <Select.Item id="active" label="正常" />
            <Select.Item id="disabled" label="已禁用" />
          </Select>
        </>
      }
    />
  );
}
