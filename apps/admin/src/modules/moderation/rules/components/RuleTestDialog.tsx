import { Badge, Button, Label, Modal, Select } from "@repo/ui";
import type { AdminModerationRuleStatusResp } from "@repo/api";
import { useRuleTest } from "../hooks/use-rule-test";

interface RuleTestDialogProps {
  open: boolean;
  status: AdminModerationRuleStatusResp | null;
  onClose: () => void;
}

const RISK_LABELS = { low: "低风险", medium: "中风险", high: "高风险" } as const;

export function RuleTestDialog({ open, status, onClose }: RuleTestDialogProps) {
  const candidate = status?.candidate;
  const candidateReady = candidate?.status === "ready";
  const test = useRuleTest({
    currentRulesetId: status?.current_ruleset_id ?? 0,
    candidateRulesetId: candidate?.ruleset_id,
    candidateReady,
  });

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) {
          test.reset();
          onClose();
        }
      }}
      size="lg"
      aria-label="审核规则文本试跑"
    >
      <h2 className="mb-4 text-lg font-semibold">文本试跑</h2>
      <div className="grid gap-4">
        <div>
          <Label htmlFor="rule-test-target">测试规则集</Label>
          <Select
            id="rule-test-target"
            aria-label="测试规则集"
            selectedKey={test.target}
            onSelectionChange={(key) =>
              test.setTarget(key === "candidate" ? "candidate" : "current")
            }
          >
            <Select.Item id="current" label={`当前版本 #${status?.current_ruleset_id ?? "-"}`} />
            <Select.Item
              id="candidate"
              label={`候选版本 #${candidate?.ruleset_id ?? "-"}`}
              isDisabled={!candidateReady}
            />
          </Select>
        </div>
        <div>
          <Label htmlFor="rule-test-text">测试文本</Label>
          <textarea
            id="rule-test-text"
            aria-label="测试文本"
            className="min-h-32 w-full rounded-md border border-border bg-background p-3 text-sm"
            value={test.text}
            onChange={(event) => test.setText(event.target.value)}
          />
          {test.charLimitError ? (
            <p className="text-xs text-destructive">{test.charLimitError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{test.text.length} / 10000</p>
          )}
        </div>
        {test.error ? <p className="text-sm text-destructive">{test.error}</p> : null}
        {test.result ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">最终风险 {RISK_LABELS[test.result.risk]}</Badge>
              <Badge variant="outline">规则集 #{test.result.ruleset_id}</Badge>
            </div>
            {test.result.truncated ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">还有命中未展示</p>
            ) : null}
            {test.result.hits.length === 0 ? (
              <p className="text-sm text-muted-foreground">无命中</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {test.result.hits.map((hit) => (
                  <li key={hit.rule_id} className="rounded border border-border p-2">
                    <p>
                      #{hit.rule_id} · {hit.pattern} · {hit.category}
                    </p>
                    <p className="text-muted-foreground">{hit.excerpt}</p>
                  </li>
                ))}
              </ul>
            )}
            {test.result.suppressed_ids.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                被白名单抑制：{test.result.suppressed_ids.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onPress={onClose}>
          关闭
        </Button>
        <Button onPress={() => void test.runTest()} isDisabled={test.isSubmitting}>
          {test.isSubmitting ? "测试中…" : "开始测试"}
        </Button>
      </div>
    </Modal>
  );
}
