import { useEffect, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Modal, Button, ButtonUtility, Input, Label, Select } from "@repo/ui";
import type { AdminModerationRuleMetadataResp } from "@repo/api";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
} from "../../../../components/AdminDialog";
import {
  defaultRuleFormValues,
  ruleFormFromRow,
  validateRuleForm,
  type RuleFormErrors,
  type RuleFormValues,
  type RuleRow,
} from "../model";

interface RuleFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  row: RuleRow | null;
  metadata: AdminModerationRuleMetadataResp | null;
  isSubmitting: boolean;
  conflictMessage?: string | null;
  serverError?: string | null;
  onClose: () => void;
  onSubmit: (values: RuleFormValues) => Promise<boolean>;
}

export function RuleFormDialog({
  mode,
  open,
  row,
  metadata,
  isSubmitting,
  conflictMessage,
  serverError,
  onClose,
  onSubmit,
}: RuleFormDialogProps) {
  const [values, setValues] = useState<RuleFormValues>(defaultRuleFormValues(metadata));
  const [errors, setErrors] = useState<RuleFormErrors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (mode === "edit" && row) {
      setValues(ruleFormFromRow(row));
      return;
    }
    setValues(defaultRuleFormValues(metadata));
  }, [open, mode, row, metadata]);

  const updateField = <K extends keyof RuleFormValues>(key: K, value: RuleFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const allowEffectDisabled = values.ruleType !== "keyword";

  const handleSubmit = async () => {
    const nextErrors = validateRuleForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const ok = await onSubmit(values);
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={!isSubmitting}
      placement="fullscreen-mobile"
      size="lg"
      aria-label={mode === "create" ? "新增规则" : `修改规则 ${row?.id ?? ""}`}
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <AdminDialogFrame>
        <AdminDialogHeader
          eyebrow="规则维护"
          title={mode === "create" ? "新增规则" : `修改规则 #${row?.id ?? ""}`}
          description="提交后将触发候选规则集构建，当前线上版本在发布成功前保持不变。"
          className="max-md:pt-[max(1rem,env(safe-area-inset-top))]"
          action={
            <ButtonUtility
              tooltip="关闭规则表单"
              color="tertiary"
              icon={<SvgIcon name="close" />}
              isDisabled={isSubmitting}
              onClick={onClose}
            />
          }
        />

        <AdminDialogBody contentClassName="grid min-w-0 gap-5">
          <Input
            label="名称（可选）"
            value={values.name}
            onChange={(v) => updateField("name", v)}
            className="min-w-0"
          />
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <Label htmlFor="rule-form-type">规则类型</Label>
              <Select
                id="rule-form-type"
                aria-label="规则类型"
                selectedKey={values.ruleType}
                onSelectionChange={(key) =>
                  updateField("ruleType", String(key) as RuleFormValues["ruleType"])
                }
              >
                <Select.Item id="keyword" label="关键词" />
                <Select.Item id="regexp" label="正则" />
                <Select.Item id="composite" label="组合" />
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="rule-form-effect">规则效果</Label>
              <Select
                id="rule-form-effect"
                aria-label="规则效果"
                selectedKey={values.effect}
                isDisabled={allowEffectDisabled}
                onSelectionChange={(key) =>
                  updateField("effect", String(key) as RuleFormValues["effect"])
                }
              >
                <Select.Item id="review" label="审核" />
                <Select.Item id="allow" label="白名单" isDisabled={allowEffectDisabled} />
              </Select>
              {errors.effect ? <p className="text-xs text-destructive">{errors.effect}</p> : null}
            </div>
          </div>
          <Input
            label="匹配内容"
            value={values.pattern}
            onChange={(v) => updateField("pattern", v)}
            isInvalid={Boolean(errors.pattern)}
            hint={errors.pattern}
            className="min-w-0"
          />
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <Label htmlFor="rule-form-category">分类</Label>
              <Select
                id="rule-form-category"
                aria-label="分类"
                selectedKey={values.category}
                onSelectionChange={(key) =>
                  updateField("category", String(key) as RuleFormValues["category"])
                }
              >
                {metadata?.categories.map((entry) => (
                  <Select.Item key={entry.key} id={entry.key} label={entry.name} />
                ))}
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="rule-form-risk">风险等级</Label>
              <Select
                id="rule-form-risk"
                aria-label="风险等级"
                selectedKey={values.riskLevel}
                onSelectionChange={(key) =>
                  updateField("riskLevel", String(key) as RuleFormValues["riskLevel"])
                }
              >
                <Select.Item id="low" label="低风险" />
                <Select.Item id="medium" label="中风险" />
                <Select.Item id="high" label="高风险" />
              </Select>
            </div>
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Input
              label="优先级"
              value={values.priority}
              onChange={(v) => updateField("priority", v)}
              isInvalid={Boolean(errors.priority)}
              hint={errors.priority}
              className="min-w-0"
            />
            <div className="min-w-0">
              <Label htmlFor="rule-form-source">来源</Label>
              <Select
                id="rule-form-source"
                aria-label="来源"
                selectedKey={values.sourceId}
                onSelectionChange={(key) => updateField("sourceId", String(key))}
              >
                {metadata?.sources.map((source) => (
                  <Select.Item key={source.id} id={String(source.id)} label={source.name} />
                ))}
              </Select>
              {errors.sourceId ? (
                <p className="text-xs text-destructive">{errors.sourceId}</p>
              ) : null}
            </div>
          </div>
          {conflictMessage ? <p className="text-sm text-destructive">{conflictMessage}</p> : null}
          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        </AdminDialogBody>

        <AdminDialogFooter className="max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" onPress={onClose} isDisabled={isSubmitting}>
            取消
          </Button>
          <Button
            onPress={() => void handleSubmit()}
            isLoading={isSubmitting}
            loadingText="提交中…"
          >
            提交
          </Button>
        </AdminDialogFooter>
      </AdminDialogFrame>
    </Modal>
  );
}
