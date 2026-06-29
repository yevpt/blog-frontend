import { Button, Select, cn } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import {
  CONTENT_TYPE_OPTIONS,
  RISK_LEVEL_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  type FilterValue,
} from "../model";

interface ModerationListToolbarProps {
  contentType: FilterValue;
  riskLevel: FilterValue;
  reviewStatus: FilterValue;
  onContentTypeChange: (value: FilterValue) => void;
  onRiskLevelChange: (value: FilterValue) => void;
  onReviewStatusChange: (value: FilterValue) => void;
  canClear?: boolean;
  onClear?: () => void;
}

/** 审核队列筛选工具栏：内容类型 / 风险 / 审核状态三选 + 清除筛选 */
export function ModerationListToolbar({
  contentType,
  riskLevel,
  reviewStatus,
  onContentTypeChange,
  onRiskLevelChange,
  onReviewStatusChange,
  canClear = false,
  onClear,
}: ModerationListToolbarProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 shrink-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:flex-wrap",
      )}
    >
      <Select
        aria-label="筛选内容类型"
        selectedKey={contentType}
        onSelectionChange={(key) => onContentTypeChange(String(key) as FilterValue)}
        className="w-full sm:w-40"
      >
        {CONTENT_TYPE_OPTIONS.map((option) => (
          <Select.Item key={option.value} id={option.value} label={option.label} />
        ))}
      </Select>

      <Select
        aria-label="筛选风险等级"
        selectedKey={riskLevel}
        onSelectionChange={(key) => onRiskLevelChange(String(key) as FilterValue)}
        className="w-full sm:w-32"
      >
        {RISK_LEVEL_OPTIONS.map((option) => (
          <Select.Item key={option.value} id={option.value} label={option.label} />
        ))}
      </Select>

      <Select
        aria-label="筛选审核状态"
        selectedKey={reviewStatus}
        onSelectionChange={(key) => onReviewStatusChange(String(key) as FilterValue)}
        className="w-full sm:w-32"
      >
        {REVIEW_STATUS_OPTIONS.map((option) => (
          <Select.Item key={option.value} id={option.value} label={option.label} />
        ))}
      </Select>

      {canClear ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 px-2.5 text-muted-foreground hover:text-foreground"
          onPress={onClear}
        >
          <SvgIcon name="close" size={14} />
          清除筛选
        </Button>
      ) : null}
    </div>
  );
}
