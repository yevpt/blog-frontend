import type { ModerationRiskLevel } from "./moderation";

export type ModerationRuleType = "keyword" | "regexp" | "composite";
export type ModerationRuleEffect = "review" | "allow";
export type ModerationRuleCategory =
  | "politics"
  | "pornography"
  | "violence"
  | "terrorism"
  | "gambling"
  | "drugs"
  | "fraud"
  | "abuse"
  | "advertising"
  | "minors"
  | "other";
export type ModerationRulesetStatus =
  | "building"
  | "ready"
  | "publishing"
  | "published"
  | "failed"
  | "superseded";
export type ModerationImportValidationStatus =
  | "queued"
  | "validating"
  | "valid"
  | "invalid"
  | "canceled";
export type ModerationImportFormat = "csv" | "txt";
export type ModerationRuleSearchMode = "exact" | "prefix";

export interface AdminModerationRuleListReq {
  cursor?: number;
  limit?: number;
  id?: number;
  pattern?: string;
  search_mode?: ModerationRuleSearchMode;
  category?: ModerationRuleCategory;
  rule_type?: ModerationRuleType;
  risk_level?: ModerationRiskLevel;
  effect?: ModerationRuleEffect;
  source_id?: number;
  active?: boolean;
}

export interface AdminModerationRuleResp {
  id: number;
  name?: string;
  rule_type: ModerationRuleType;
  pattern: string;
  category: ModerationRuleCategory;
  effect: ModerationRuleEffect;
  risk_level: ModerationRiskLevel;
  priority: number;
  source_id: number;
  activated_ruleset_id: number;
  deactivated_ruleset_id?: number;
  replaces_rule_id?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminModerationRulePageResp {
  list: AdminModerationRuleResp[];
  next_cursor: number;
  has_more: boolean;
}

export interface AdminModerationRuleSaveReq {
  expected_ruleset_version: number;
  name?: string;
  rule_type: ModerationRuleType;
  pattern: string;
  category: ModerationRuleCategory;
  effect: ModerationRuleEffect;
  risk_level: ModerationRiskLevel;
  priority: number;
  source_id: number;
}

export interface AdminModerationRuleBatchStatusReq {
  expected_ruleset_version: number;
  rule_ids: number[];
  active: boolean;
}

export interface AdminModerationRuleJobResp {
  ruleset_id: number;
  base_ruleset_id: number;
  status: ModerationRulesetStatus;
}

export interface AdminModerationRuleTestReq {
  text: string;
  ruleset_id?: number;
}

export interface AdminModerationRuleTestHit {
  rule_id: number;
  rule_type: ModerationRuleType;
  pattern: string;
  category: ModerationRuleCategory;
  effect: ModerationRuleEffect;
  risk_level: ModerationRiskLevel;
  excerpt: string;
}

export interface AdminModerationRuleTestResp {
  risk: ModerationRiskLevel;
  ruleset_id: number;
  rule_ids: number[];
  suppressed_ids: number[];
  truncated: boolean;
  hits: AdminModerationRuleTestHit[];
}

export interface AdminModerationCategoryEntry {
  key: ModerationRuleCategory;
  name: string;
}

export interface AdminModerationRuleSourceResp {
  id: number;
  name: string;
}

export interface AdminModerationRuleMetadataResp {
  categories: AdminModerationCategoryEntry[];
  rule_types: ModerationRuleType[];
  effects: ModerationRuleEffect[];
  risk_levels: ModerationRiskLevel[];
  sources: AdminModerationRuleSourceResp[];
}

export interface AdminModerationCandidateStatusResp {
  ruleset_id: number;
  status: ModerationRulesetStatus;
  base_ruleset_id: number;
  rule_count: number;
  index_bytes: number;
  build_peak_bytes: number;
  failure_code?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminModerationRuleStatusResp {
  current_ruleset_id: number;
  rule_count: number;
  keyword_count: number;
  regexp_count: number;
  composite_count: number;
  index_bytes: number;
  build_peak_bytes: number;
  build_duration_ms: number;
  updated_at: string;
  candidate?: AdminModerationCandidateStatusResp;
}

export interface AdminModerationImportCreateReq {
  file: File;
  format: ModerationImportFormat;
  source_name: string;
  default_category: ModerationRuleCategory;
  default_risk_level: ModerationRiskLevel;
  default_effect: ModerationRuleEffect;
  default_priority: number;
}

export interface AdminModerationImportResp {
  id: number;
  file_name: string;
  format: ModerationImportFormat;
  file_size: number;
  source_id: number;
  default_category: ModerationRuleCategory;
  default_effect: ModerationRuleEffect;
  default_risk_level: ModerationRiskLevel;
  default_priority: number;
  validation_status: ModerationImportValidationStatus;
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  error_rows: number;
  error_object_key?: string;
  ruleset_id?: number;
  operator_id: number;
  created_at: string;
  updated_at: string;
}

export interface AdminModerationImportPageResp {
  list: AdminModerationImportResp[];
  next_cursor: number;
  has_more: boolean;
}

export interface AdminModerationRuleImportPublishReq {
  expected_ruleset_version: number;
}

export interface BinaryDownload {
  blob: Blob;
  filename?: string;
}
