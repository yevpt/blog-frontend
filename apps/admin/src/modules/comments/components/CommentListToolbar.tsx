import type { AdminCommentTargetType } from "@repo/api";
import { Select } from "@repo/ui";
import { AdminListToolbar } from "../../../components/AdminListToolbar";
import { COMMENT_TARGET_FILTER_OPTIONS } from "../model";

interface CommentListToolbarProps {
  searchValue: string;
  targetType: AdminCommentTargetType;
  onSearchChange: (value: string) => void;
  onTargetTypeChange: (value: AdminCommentTargetType) => void;
  canClear?: boolean;
  onClear?: () => void;
}

export function CommentListToolbar({
  searchValue,
  targetType,
  onSearchChange,
  onTargetTypeChange,
  canClear = false,
  onClear,
}: CommentListToolbarProps) {
  return (
    <AdminListToolbar
      searchLabel="搜索评论"
      searchPlaceholder="搜索评论内容…"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      canClear={canClear}
      onClear={onClear}
      filters={
        <Select
          aria-label="筛选评论类型"
          selectedKey={targetType}
          onSelectionChange={(key) => onTargetTypeChange(String(key) as AdminCommentTargetType)}
          className="w-full sm:w-36"
        >
          {COMMENT_TARGET_FILTER_OPTIONS.map((option) => (
            <Select.Item key={option.value} id={option.value} label={option.label} />
          ))}
        </Select>
      }
    />
  );
}
