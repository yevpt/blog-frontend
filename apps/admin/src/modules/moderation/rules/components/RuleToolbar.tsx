import type { Key } from "react";
import { Button, Dropdown, Input, Select, cn } from "@repo/ui";
import type { AdminModerationRuleMetadataResp } from "@repo/api";
import type { RuleFilters } from "../model";

interface RuleToolbarProps {
  filters: RuleFilters;
  metadata: AdminModerationRuleMetadataResp | null;
  hasActiveFilters: boolean;
  searchError?: string;
  onFilterChange: <K extends keyof RuleFilters>(key: K, value: RuleFilters[K]) => void;
  onResetFilters: () => void;
  onAdd: () => void;
  onTest: () => void;
  onImport: () => void;
  onTemplate: (format: "csv" | "txt") => void;
  onExport: () => void;
  exportDisabled?: boolean;
}

const filterSelectClassName = "w-full shrink-0 sm:w-36";

export function RuleToolbar({
  filters,
  metadata,
  hasActiveFilters,
  searchError,
  onFilterChange,
  onResetFilters,
  onAdd,
  onTest,
  onImport,
  onTemplate,
  onExport,
  exportDisabled,
}: RuleToolbarProps) {
  const handleTemplateAction = (key: Key) => {
    if (key === "csv" || key === "txt") onTemplate(key);
  };

  return (
    <div className="flex min-w-0 shrink-0 flex-col gap-3 px-4 py-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onPress={onAdd}>
            新增规则
          </Button>
          <Button type="button" size="sm" variant="outline" onPress={onTest}>
            文本试跑
          </Button>
          <Button type="button" size="sm" variant="outline" onPress={onImport}>
            批量导入
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown.Root>
            <Button type="button" size="sm" variant="outline">
              下载模板
            </Button>
            <Dropdown.Popover placement="bottom end" className="min-w-40">
              <Dropdown.Menu aria-label="导入模板" onAction={handleTemplateAction}>
                <Dropdown.Item id="csv" label="CSV 模板" />
                <Dropdown.Item id="txt" label="TXT 模板" />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onPress={onExport}
            isDisabled={exportDisabled}
          >
            导出规则
          </Button>
          {hasActiveFilters ? (
            <Button type="button" size="sm" variant="ghost" onPress={onResetFilters}>
              重置筛选
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Select
          aria-label="搜索模式"
          selectedKey={filters.searchMode}
          onSelectionChange={(key) =>
            onFilterChange("searchMode", key === "exact" ? "exact" : "prefix")
          }
          className={cn(filterSelectClassName, "sm:w-32")}
        >
          <Select.Item id="prefix" label="前缀匹配" />
          <Select.Item id="exact" label="精确匹配" />
        </Select>
        <div className="min-w-0 flex-1">
          <Input
            aria-label="模式搜索"
            size="sm"
            value={filters.pattern}
            onChange={(value) => onFilterChange("pattern", value)}
            placeholder="输入关键词或模式"
            isInvalid={Boolean(searchError)}
            hint={searchError}
          />
        </div>
      </div>

      <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        <Select
          aria-label="规则分类"
          selectedKey={filters.category}
          onSelectionChange={(key) =>
            onFilterChange(
              "category",
              key === "all" ? "all" : (String(key) as RuleFilters["category"]),
            )
          }
          className={filterSelectClassName}
        >
          <Select.Item id="all" label="全部分类" />
          {metadata?.categories.map((entry) => (
            <Select.Item key={entry.key} id={entry.key} label={entry.name} />
          ))}
        </Select>
        <Select
          aria-label="规则类型"
          selectedKey={filters.ruleType}
          onSelectionChange={(key) =>
            onFilterChange(
              "ruleType",
              key === "all" ? "all" : (String(key) as RuleFilters["ruleType"]),
            )
          }
          className={filterSelectClassName}
        >
          <Select.Item id="all" label="全部类型" />
          <Select.Item id="keyword" label="关键词" />
          <Select.Item id="regexp" label="正则" />
          <Select.Item id="composite" label="组合" />
        </Select>
        <Select
          aria-label="风险等级"
          selectedKey={filters.riskLevel}
          onSelectionChange={(key) =>
            onFilterChange(
              "riskLevel",
              key === "all" ? "all" : (String(key) as RuleFilters["riskLevel"]),
            )
          }
          className={filterSelectClassName}
        >
          <Select.Item id="all" label="全部风险" />
          <Select.Item id="low" label="低风险" />
          <Select.Item id="medium" label="中风险" />
          <Select.Item id="high" label="高风险" />
        </Select>
        <Select
          aria-label="规则效果"
          selectedKey={filters.effect}
          onSelectionChange={(key) =>
            onFilterChange("effect", key === "all" ? "all" : (String(key) as RuleFilters["effect"]))
          }
          className={filterSelectClassName}
        >
          <Select.Item id="all" label="全部效果" />
          <Select.Item id="review" label="审核" />
          <Select.Item id="allow" label="白名单" />
        </Select>
        <Select
          aria-label="启用状态"
          selectedKey={filters.active}
          onSelectionChange={(key) =>
            onFilterChange("active", String(key) as RuleFilters["active"])
          }
          className={filterSelectClassName}
        >
          <Select.Item id="all" label="全部状态" />
          <Select.Item id="true" label="启用" />
          <Select.Item id="false" label="停用" />
        </Select>
        <Select
          aria-label="来源"
          selectedKey={filters.sourceId || "all"}
          onSelectionChange={(key) => onFilterChange("sourceId", key === "all" ? "" : String(key))}
          className={filterSelectClassName}
        >
          <Select.Item id="all" label="全部来源" />
          {metadata?.sources.map((source) => (
            <Select.Item key={source.id} id={String(source.id)} label={source.name} />
          ))}
        </Select>
      </div>
    </div>
  );
}
