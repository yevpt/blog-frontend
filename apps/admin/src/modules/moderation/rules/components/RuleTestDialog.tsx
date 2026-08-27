import { SvgIcon } from "@repo/icons";
import { Badge, Button, ButtonUtility, Label, Modal, Select, cn } from "@repo/ui";
import type { AdminModerationRuleStatusResp } from "@repo/api";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
  adminDialogSectionClassName,
  adminDialogTextareaClassName,
} from "../../../../components/AdminDialog";
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

  const handleClose = () => {
    test.reset();
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
      isDismissable={!test.isSubmitting}
      size="lg"
      aria-label="审核规则文本试跑"
    >
      <AdminDialogFrame>
        <AdminDialogHeader
          eyebrow="规则校验"
          title="文本试跑"
          description="输入一段实际文本，预览当前或候选规则集的风险判定与命中详情。"
          action={
            <ButtonUtility
              tooltip="关闭文本试跑"
              color="tertiary"
              icon={<SvgIcon name="close" />}
              isDisabled={test.isSubmitting}
              onClick={handleClose}
            />
          }
        />

        <AdminDialogBody contentClassName="grid gap-5">
          <div className="grid gap-1.5">
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

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="rule-test-text">测试文本</Label>
              <span
                className={cn(
                  "shrink-0 text-xs tabular-nums text-muted-foreground",
                  test.charLimitError && "text-destructive",
                )}
              >
                {test.text.length.toLocaleString()} / 10,000
              </span>
            </div>
            <textarea
              id="rule-test-text"
              aria-label="测试文本"
              placeholder="粘贴一段接近真实场景的文本，查看会命中哪些规则…"
              className={cn(adminDialogTextareaClassName, "min-h-40")}
              value={test.text}
              onChange={(event) => test.setText(event.target.value)}
            />
            {test.charLimitError ? (
              <p role="alert" className="text-xs text-destructive">
                {test.charLimitError}
              </p>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">
                仅用于预览，不会保存文本或修改线上规则。
              </p>
            )}
          </div>

          {test.error ? (
            <p role="alert" className="text-sm text-destructive">
              {test.error}
            </p>
          ) : null}

          {test.result ? (
            <section className={cn(adminDialogSectionClassName, "grid gap-3")}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto text-sm font-semibold text-foreground">试跑结果</p>
                <Badge variant="secondary">最终风险 {RISK_LABELS[test.result.risk]}</Badge>
                <Badge variant="outline">规则集 #{test.result.ruleset_id}</Badge>
              </div>
              {test.result.truncated ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">还有命中未展示</p>
              ) : null}
              {test.result.hits.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/70 px-3 py-5 text-center text-sm text-muted-foreground">
                  当前文本没有命中规则
                </p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {test.result.hits.map((hit) => (
                    <li
                      key={hit.rule_id}
                      className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5"
                    >
                      <p className="font-medium text-foreground">
                        #{hit.rule_id} · {hit.pattern} · {hit.category}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{hit.excerpt}</p>
                    </li>
                  ))}
                </ul>
              )}
              {test.result.suppressed_ids.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  被白名单抑制：{test.result.suppressed_ids.join(", ")}
                </p>
              ) : null}
            </section>
          ) : null}
        </AdminDialogBody>

        <AdminDialogFooter>
          <Button variant="outline" onPress={handleClose} isDisabled={test.isSubmitting}>
            关闭
          </Button>
          <Button
            onPress={() => void test.runTest()}
            isLoading={test.isSubmitting}
            loadingText="测试中…"
          >
            开始测试
          </Button>
        </AdminDialogFooter>
      </AdminDialogFrame>
    </Modal>
  );
}
