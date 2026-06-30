import type {
  AdminModerationRuleListReq,
  AdminModerationRuleMetadataResp,
  AdminModerationRuleResp,
  ModerationRuleCategory,
  ModerationRuleEffect,
  ModerationRuleSearchMode,
  ModerationRuleType,
  ModerationRiskLevel,
} from "@repo/api";
import type { AdminListQueryCodec } from "../../../lib/admin-list-query";
import {
  parsePositiveInt,
  parseStringFilter,
  writeStringFilter,
} from "../../../lib/admin-list-query";

export type FilterAll = "all";

export interface RuleFilters {
  category: ModerationRuleCategory | FilterAll;
  ruleType: ModerationRuleType | FilterAll;
  riskLevel: ModerationRiskLevel | FilterAll;
  effect: ModerationRuleEffect | FilterAll;
  sourceId: string;
  active: "all" | "true" | "false";
  searchMode: ModerationRuleSearchMode;
  pattern: string;
  limit: number;
  [key: string]: string | number | undefined;
}

export interface RuleListQueryState {
  filters: RuleFilters;
}

export interface RuleRow {
  id: number;
  name: string;
  pattern: string;
  category: ModerationRuleCategory;
  categoryLabel: string;
  ruleType: ModerationRuleType;
  ruleTypeLabel: string;
  effect: ModerationRuleEffect;
  effectLabel: string;
  riskLevel: ModerationRiskLevel;
  riskLabel: string;
  priority: number;
  sourceId: number;
  sourceLabel: string;
  active: boolean;
  activeLabel: string;
  updatedAt: string;
}

export interface RuleFormValues {
  name: string;
  ruleType: ModerationRuleType;
  pattern: string;
  category: ModerationRuleCategory;
  effect: ModerationRuleEffect;
  riskLevel: ModerationRiskLevel;
  priority: string;
  sourceId: string;
}

export type RuleFormErrors = Partial<Record<keyof RuleFormValues, string>>;

const RULE_QUERY_KEYS = {
  category: "rules_category",
  ruleType: "rules_type",
  riskLevel: "rules_risk",
  effect: "rules_effect",
  sourceId: "rules_source",
  active: "rules_active",
  searchMode: "rules_search_mode",
  pattern: "rules_pattern",
  limit: "rules_limit",
} as const;

const DEFAULT_FILTERS: RuleFilters = {
  category: "all",
  ruleType: "all",
  riskLevel: "all",
  effect: "all",
  sourceId: "",
  active: "all",
  searchMode: "prefix",
  pattern: "",
  limit: 50,
};

export const DEFAULT_RULE_LIST_QUERY_STATE: RuleListQueryState = {
  filters: DEFAULT_FILTERS,
};

const VALID_CATEGORIES: ModerationRuleCategory[] = [
  "politics",
  "pornography",
  "violence",
  "terrorism",
  "gambling",
  "drugs",
  "fraud",
  "abuse",
  "advertising",
  "minors",
  "other",
];
const VALID_RULE_TYPES: ModerationRuleType[] = ["keyword", "regexp", "composite"];
const VALID_EFFECTS: ModerationRuleEffect[] = ["review", "allow"];
const VALID_RISK_LEVELS: ModerationRiskLevel[] = ["low", "medium", "high"];

const RISK_LABELS: Record<ModerationRiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

const RULE_TYPE_LABELS: Record<ModerationRuleType, string> = {
  keyword: "关键词",
  regexp: "正则",
  composite: "组合",
};

const EFFECT_LABELS: Record<ModerationRuleEffect, string> = {
  review: "审核",
  allow: "白名单",
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export function validateRuleForm(values: RuleFormValues): RuleFormErrors {
  const errors: RuleFormErrors = {};
  if (!values.pattern.trim()) errors.pattern = "请输入匹配内容";
  if (values.effect === "allow" && values.ruleType !== "keyword") {
    errors.effect = "白名单仅支持关键词";
  }
  const priority = Number(values.priority);
  if (!Number.isInteger(priority)) errors.priority = "优先级必须是整数";
  if (!values.sourceId.trim()) errors.sourceId = "请选择来源";
  return errors;
}

export function validateSearchPattern(
  pattern: string,
  searchMode: ModerationRuleSearchMode,
): string | undefined {
  const trimmed = pattern.trim();
  if (!trimmed) return undefined;
  if (searchMode === "exact" && trimmed.length > 500) {
    return "精确搜索最长 500 字符";
  }
  return undefined;
}

function parseEnumFilter<T extends string>(
  value: string,
  valid: readonly T[],
  defaultValue: T | FilterAll,
): T | FilterAll {
  if (value === "all" || !value) return defaultValue;
  return valid.includes(value as T) ? (value as T) : defaultValue;
}

function writeEnumFilter(
  params: URLSearchParams,
  key: string,
  value: string,
  defaultValue: string,
) {
  if (value && value !== defaultValue) {
    params.set(key, value);
  }
}

export const ruleListQueryCodec: AdminListQueryCodec<RuleListQueryState> = {
  defaultState: DEFAULT_RULE_LIST_QUERY_STATE,
  parse(params) {
    const limit = parsePositiveInt(params.get(RULE_QUERY_KEYS.limit)) ?? DEFAULT_FILTERS.limit;
    const clampedLimit = Math.min(Math.max(limit, 1), 100);
    return {
      filters: {
        category: parseEnumFilter(
          params.get(RULE_QUERY_KEYS.category) ?? "",
          VALID_CATEGORIES,
          "all",
        ),
        ruleType: parseEnumFilter(
          params.get(RULE_QUERY_KEYS.ruleType) ?? "",
          VALID_RULE_TYPES,
          "all",
        ),
        riskLevel: parseEnumFilter(
          params.get(RULE_QUERY_KEYS.riskLevel) ?? "",
          VALID_RISK_LEVELS,
          "all",
        ),
        effect: parseEnumFilter(params.get(RULE_QUERY_KEYS.effect) ?? "", VALID_EFFECTS, "all"),
        sourceId: parseStringFilter(params, RULE_QUERY_KEYS.sourceId, ""),
        active: parseEnumFilter(
          params.get(RULE_QUERY_KEYS.active) ?? "",
          ["true", "false"] as const,
          "all",
        ),
        searchMode:
          params.get(RULE_QUERY_KEYS.searchMode) === "exact" ? "exact" : ("prefix" as const),
        pattern: parseStringFilter(params, RULE_QUERY_KEYS.pattern, ""),
        limit: clampedLimit,
      },
    };
  },
  write(state) {
    const params = new URLSearchParams();
    const { filters } = state;
    writeEnumFilter(params, RULE_QUERY_KEYS.category, filters.category, "all");
    writeEnumFilter(params, RULE_QUERY_KEYS.ruleType, filters.ruleType, "all");
    writeEnumFilter(params, RULE_QUERY_KEYS.riskLevel, filters.riskLevel, "all");
    writeEnumFilter(params, RULE_QUERY_KEYS.effect, filters.effect, "all");
    writeStringFilter(params, RULE_QUERY_KEYS.sourceId, filters.sourceId, "");
    writeEnumFilter(params, RULE_QUERY_KEYS.active, filters.active, "all");
    if (filters.searchMode !== "prefix") {
      params.set(RULE_QUERY_KEYS.searchMode, filters.searchMode);
    }
    writeStringFilter(params, RULE_QUERY_KEYS.pattern, filters.pattern.trim(), "");
    if (filters.limit !== DEFAULT_FILTERS.limit) {
      params.set(RULE_QUERY_KEYS.limit, String(filters.limit));
    }
    return params;
  },
  hasActive(state) {
    const { filters } = state;
    return (
      filters.category !== "all" ||
      filters.ruleType !== "all" ||
      filters.riskLevel !== "all" ||
      filters.effect !== "all" ||
      filters.sourceId.trim() !== "" ||
      filters.active !== "all" ||
      filters.searchMode !== "prefix" ||
      filters.pattern.trim() !== "" ||
      filters.limit !== DEFAULT_FILTERS.limit
    );
  },
};

export function buildLabelMaps(metadata: AdminModerationRuleMetadataResp | null) {
  const categoryLabels = new Map<ModerationRuleCategory, string>();
  metadata?.categories.forEach((entry) => categoryLabels.set(entry.key, entry.name));
  const sourceLabels = new Map<number, string>();
  metadata?.sources.forEach((entry) => sourceLabels.set(entry.id, entry.name));
  return { categoryLabels, sourceLabels };
}

export function mapRuleToRow(
  rule: AdminModerationRuleResp,
  labels: {
    categoryLabels: Map<ModerationRuleCategory, string>;
    sourceLabels: Map<number, string>;
  },
): RuleRow {
  return {
    id: rule.id,
    name: rule.name ?? "",
    pattern: rule.pattern,
    category: rule.category,
    categoryLabel: labels.categoryLabels.get(rule.category) ?? rule.category,
    ruleType: rule.rule_type,
    ruleTypeLabel: RULE_TYPE_LABELS[rule.rule_type],
    effect: rule.effect,
    effectLabel: EFFECT_LABELS[rule.effect],
    riskLevel: rule.risk_level,
    riskLabel: RISK_LABELS[rule.risk_level],
    priority: rule.priority,
    sourceId: rule.source_id,
    sourceLabel: labels.sourceLabels.get(rule.source_id) ?? `来源 #${rule.source_id}`,
    active: rule.active,
    activeLabel: rule.active ? "启用" : "停用",
    updatedAt: formatDateTime(rule.updated_at),
  };
}

export function toListReq(filters: RuleFilters, cursor?: number): AdminModerationRuleListReq {
  const req: AdminModerationRuleListReq = { limit: filters.limit };
  if (cursor !== undefined) req.cursor = cursor;
  if (filters.category !== "all") req.category = filters.category;
  if (filters.ruleType !== "all") req.rule_type = filters.ruleType;
  if (filters.riskLevel !== "all") req.risk_level = filters.riskLevel;
  if (filters.effect !== "all") req.effect = filters.effect;
  const sourceId = Number.parseInt(filters.sourceId, 10);
  if (Number.isInteger(sourceId) && sourceId > 0) req.source_id = sourceId;
  if (filters.active === "true") req.active = true;
  if (filters.active === "false") req.active = false;
  const pattern = filters.pattern.trim();
  if (pattern) {
    req.pattern = pattern;
    req.search_mode = filters.searchMode;
  }
  return req;
}

export function ruleFormFromRow(row: RuleRow): RuleFormValues {
  return {
    name: row.name,
    ruleType: row.ruleType,
    pattern: row.pattern,
    category: row.category,
    effect: row.effect,
    riskLevel: row.riskLevel,
    priority: String(row.priority),
    sourceId: String(row.sourceId),
  };
}

export function defaultRuleFormValues(
  metadata: AdminModerationRuleMetadataResp | null,
): RuleFormValues {
  const firstCategory = metadata?.categories[0]?.key ?? "other";
  const firstSource = metadata?.sources[0]?.id;
  return {
    name: "",
    ruleType: "keyword",
    pattern: "",
    category: firstCategory,
    effect: "review",
    riskLevel: "medium",
    priority: "100",
    sourceId: firstSource ? String(firstSource) : "",
  };
}
