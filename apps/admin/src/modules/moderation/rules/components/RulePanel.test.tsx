import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AdminModerationRuleMetadataResp, AdminModerationRuleStatusResp } from "@repo/api";
import { RulePanel } from "./RulePanel";
import type { UseRuleListResult } from "../hooks/use-rule-list";
import type { UseRuleStatusResult } from "../hooks/use-rule-status";
import { DEFAULT_RULE_LIST_QUERY_STATE } from "../model";

vi.mock("../../../tags/hooks/use-is-md-screen", () => ({
  useIsMdScreen: () => true,
}));

vi.mock("./RuleTable", () => ({
  RuleTable: () => <div data-testid="rule-table" />,
}));

vi.mock("./RuleMobileList", () => ({
  RuleMobileList: () => null,
}));

function fixtureList(overrides: Partial<UseRuleListResult> = {}): UseRuleListResult {
  return {
    rows: [
      {
        id: 1,
        name: "",
        pattern: "风险词",
        category: "fraud",
        categoryLabel: "欺诈",
        ruleType: "keyword",
        ruleTypeLabel: "关键词",
        effect: "review",
        effectLabel: "审核",
        riskLevel: "high",
        riskLabel: "高风险",
        priority: 100,
        sourceId: 1,
        sourceLabel: "手工",
        active: true,
        activeLabel: "启用",
        updatedAt: "2026/06/30 08:00",
      },
      {
        id: 2,
        name: "",
        pattern: "风险词2",
        category: "fraud",
        categoryLabel: "欺诈",
        ruleType: "keyword",
        ruleTypeLabel: "关键词",
        effect: "review",
        effectLabel: "审核",
        riskLevel: "medium",
        riskLabel: "中风险",
        priority: 100,
        sourceId: 1,
        sourceLabel: "手工",
        active: false,
        activeLabel: "停用",
        updatedAt: "2026/06/30 08:00",
      },
    ],
    pageData: { list: [], next_cursor: 2, has_more: true },
    isLoading: false,
    error: null,
    filters: DEFAULT_RULE_LIST_QUERY_STATE.filters,
    setFilter: vi.fn(),
    resetFilters: vi.fn(),
    hasActiveFilters: false,
    canGoPrevious: false,
    canGoNext: true,
    nextPage: vi.fn(),
    previousPage: vi.fn(),
    reload: vi.fn(),
    ...overrides,
  };
}

const fixtureStatus: AdminModerationRuleStatusResp = {
  current_ruleset_id: 7,
  rule_count: 1,
  keyword_count: 1,
  regexp_count: 0,
  composite_count: 0,
  index_bytes: 64 * 1024 * 1024,
  build_peak_bytes: 80 * 1024 * 1024,
  build_duration_ms: 100,
  updated_at: "2026-06-30T00:00:00Z",
};

const fixtureMetadata: AdminModerationRuleMetadataResp = {
  categories: [{ key: "fraud", name: "欺诈" }],
  rule_types: ["keyword"],
  effects: ["review"],
  risk_levels: ["high"],
  sources: [{ id: 1, name: "手工" }],
};

function fixtureStatusState(overrides: Partial<UseRuleStatusResult> = {}): UseRuleStatusResult {
  return {
    status: fixtureStatus,
    metadata: fixtureMetadata,
    isLoading: false,
    error: null,
    reload: vi.fn(),
    ...overrides,
  };
}

function fixtureProps(
  overrides: {
    list?: Partial<UseRuleListResult>;
    statusState?: Partial<UseRuleStatusResult>;
  } = {},
) {
  return {
    list: fixtureList(overrides.list),
    statusState: fixtureStatusState(overrides.statusState),
    selectedIds: new Set<number>(),
    togglingRuleId: null,
    isSubmitting: false,
    onSelectedIdsChange: vi.fn(),
    actions: {
      onAdd: vi.fn(),
      onTest: vi.fn(),
      onImport: vi.fn(),
      onTemplate: vi.fn(),
      onExport: vi.fn(),
      onEdit: vi.fn(),
      onConfirmToggleActive: vi.fn(),
    },
    batchBar: {
      selectedCount: 0,
      isBusy: false,
      candidateBlocking: false,
      onEnable: vi.fn(),
      onDisable: vi.fn(),
      onClear: vi.fn(),
    },
  };
}

describe("RulePanel", () => {
  it("显示索引内存、筛选器和下一批操作", () => {
    render(<RulePanel {...fixtureProps({ list: { canGoNext: true } })} />);
    expect(screen.getByText("64 MB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下一批" })).toBeEnabled();
    expect(screen.getByLabelText("规则分类")).toBeInTheDocument();
  });

  it("加载失败时展示错误", () => {
    render(<RulePanel {...fixtureProps({ list: { error: new Error("列表失败"), rows: [] } })} />);
    expect(screen.getByText("列表失败")).toBeInTheDocument();
  });
});
