import type { AdminCommentTargetType } from "@repo/api";
import { SearchField, Select } from "@repo/ui";
import { COMMENT_TARGET_FILTER_OPTIONS } from "../model";

interface CommentListToolbarProps {
  searchValue: string;
  targetType: AdminCommentTargetType;
  onSearchChange: (value: string) => void;
  onTargetTypeChange: (value: AdminCommentTargetType) => void;
}

export function CommentListToolbar({
  searchValue,
  targetType,
  onSearchChange,
  onTargetTypeChange,
}: CommentListToolbarProps) {
  return (
    <div className="flex min-w-0 shrink-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <SearchField
        aria-label="搜索评论"
        placeholder="搜索评论内容…"
        value={searchValue}
        onChange={onSearchChange}
        className="w-full max-w-none sm:flex-1"
      />

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
    </div>
  );
}
