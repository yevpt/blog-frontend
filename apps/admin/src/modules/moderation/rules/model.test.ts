import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULE_LIST_QUERY_STATE,
  mapRuleToRow,
  ruleListQueryCodec,
  toListReq,
  validateRuleForm,
  buildLabelMaps,
} from "./model";
import type { AdminModerationRuleResp } from "@repo/api";

const sampleRule: AdminModerationRuleResp = {
  id: 1,
  name: "测试",
  rule_type: "keyword",
  pattern: "风险词",
  category: "fraud",
  effect: "review",
  risk_level: "high",
  priority: 100,
  source_id: 2,
  activated_ruleset_id: 7,
  active: true,
  created_at: "2026-06-30T00:00:00Z",
  updated_at: "2026-06-30T01:00:00Z",
};

describe("rule model", () => {
  it("validateRuleForm 拒绝非关键词白名单", () => {
    const errors = validateRuleForm({
      name: "",
      ruleType: "regexp",
      pattern: "abc",
      category: "other",
      effect: "allow",
      riskLevel: "low",
      priority: "10",
      sourceId: "1",
    });
    expect(errors.effect).toBe("白名单仅支持关键词");
  });

  it("toListReq 仅发送已设置的筛选", () => {
    expect(
      toListReq({
        ...DEFAULT_RULE_LIST_QUERY_STATE.filters,
        category: "fraud",
        pattern: "风险",
        searchMode: "prefix",
      }),
    ).toEqual({
      limit: 50,
      category: "fraud",
      pattern: "风险",
      search_mode: "prefix",
    });
  });

  it("ruleListQueryCodec 往返 URL 参数", () => {
    const params = ruleListQueryCodec.write({
      filters: {
        ...DEFAULT_RULE_LIST_QUERY_STATE.filters,
        category: "fraud",
        pattern: "测试",
      },
    });
    const parsed = ruleListQueryCodec.parse(params);
    expect(parsed.filters.category).toBe("fraud");
    expect(parsed.filters.pattern).toBe("测试");
  });

  it("mapRuleToRow 使用元数据标签", () => {
    const labels = buildLabelMaps({
      categories: [{ key: "fraud", name: "欺诈" }],
      rule_types: ["keyword"],
      effects: ["review"],
      risk_levels: ["high"],
      sources: [{ id: 2, name: "手工维护" }],
    });
    const row = mapRuleToRow(sampleRule, labels);
    expect(row.categoryLabel).toBe("欺诈");
    expect(row.sourceLabel).toBe("手工维护");
    expect(row.riskLabel).toBe("高风险");
  });
});
