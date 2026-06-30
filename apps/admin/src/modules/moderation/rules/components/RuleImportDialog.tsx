import { useMemo, useState } from "react";
import { Button, Input, Label, Modal, Select } from "@repo/ui";
import type { AdminModerationRuleMetadataResp } from "@repo/api";
import { useRuleImports } from "../hooks/use-rule-imports";
import { RuleImportHistory } from "./RuleImportHistory";

interface RuleImportDialogProps {
  open: boolean;
  metadata: AdminModerationRuleMetadataResp | null;
  currentRulesetId: number;
  onClose: () => void;
  onPublished: () => void;
  onDownloadErrors: (importId: number) => void;
}

export function RuleImportDialog({
  open,
  metadata,
  currentRulesetId,
  onClose,
  onPublished,
  onDownloadErrors,
}: RuleImportDialogProps) {
  const imports = useRuleImports({ open, currentRulesetId, onPublished });
  const [file, setFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [format, setFormat] = useState<"csv" | "txt">("csv");
  const [category, setCategory] = useState("other");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("medium");
  const [effect, setEffect] = useState<"review" | "allow">("review");
  const [priority, setPriority] = useState("100");
  const [localError, setLocalError] = useState<string | null>(null);

  const canUpload = useMemo(
    () => Boolean(file && sourceName.trim().length >= 1 && sourceName.trim().length <= 100),
    [file, sourceName],
  );

  const handleUpload = async () => {
    if (!file || !canUpload) return;
    setLocalError(null);
    try {
      await imports.upload({
        file,
        format,
        sourceName: sourceName.trim(),
        defaultCategory: category,
        defaultRiskLevel: riskLevel,
        defaultEffect: effect,
        defaultPriority: Number(priority),
      });
      setFile(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "上传失败");
    }
  };

  const active = imports.active;

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => !next && onClose()}
      size="lg"
      aria-label="批量导入规则"
    >
      <h2 className="mb-4 text-lg font-semibold">批量导入规则</h2>
      <div className="grid gap-4">
        <Input
          label="来源名称"
          value={sourceName}
          onChange={setSourceName}
          placeholder="1-100 字符，例如：采购词库-2026"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="import-format">文件格式</Label>
            <Select
              id="import-format"
              aria-label="文件格式"
              selectedKey={format}
              onSelectionChange={(key) => setFormat(key === "txt" ? "txt" : "csv")}
            >
              <Select.Item id="csv" label="CSV" />
              <Select.Item id="txt" label="TXT" />
            </Select>
          </div>
          <Input label="缺省优先级" value={priority} onChange={setPriority} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label htmlFor="import-category">缺省分类</Label>
            <Select
              id="import-category"
              aria-label="缺省分类"
              selectedKey={category}
              onSelectionChange={(key) => setCategory(String(key))}
            >
              {metadata?.categories.map((entry) => (
                <Select.Item key={entry.key} id={entry.key} label={entry.name} />
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="import-risk">缺省风险</Label>
            <Select
              id="import-risk"
              aria-label="缺省风险"
              selectedKey={riskLevel}
              onSelectionChange={(key) => setRiskLevel(String(key) as typeof riskLevel)}
            >
              <Select.Item id="low" label="低" />
              <Select.Item id="medium" label="中" />
              <Select.Item id="high" label="高" />
            </Select>
          </div>
          <div>
            <Label htmlFor="import-effect">缺省效果</Label>
            <Select
              id="import-effect"
              aria-label="缺省效果"
              selectedKey={effect}
              onSelectionChange={(key) => setEffect(String(key) as typeof effect)}
            >
              <Select.Item id="review" label="审核" />
              <Select.Item id="allow" label="白名单" />
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="import-file">规则文件</Label>
          <input
            id="import-file"
            aria-label="规则文件"
            type="file"
            accept={format === "csv" ? ".csv,text/csv" : ".txt,text/plain"}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button onPress={() => void handleUpload()} isDisabled={!canUpload || imports.isLoading}>
          上传并开始校验
        </Button>

        {active ? (
          <div className="rounded-lg border border-border p-4 text-sm">
            <p className="font-medium">
              任务 #{active.id} · {active.file_name} · {active.validation_status}
            </p>
            <p className="text-muted-foreground">
              总行 {active.total_rows} · 有效 {active.valid_rows} · 重复 {active.duplicate_rows} ·
              错误 {active.error_rows}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {active.validation_status === "valid" && active.ruleset_id ? (
                <Button size="sm" onPress={() => void imports.publish()}>
                  确认发布
                </Button>
              ) : null}
              {active.validation_status !== "invalid" && active.validation_status !== "canceled" ? (
                <Button size="sm" variant="outline" onPress={() => void imports.cancel()}>
                  取消任务
                </Button>
              ) : null}
              {active.error_rows > 0 ? (
                <Button size="sm" variant="outline" onPress={() => onDownloadErrors(active.id)}>
                  下载错误报告
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {(imports.error || localError) && (
          <p className="text-sm text-destructive">{imports.error ?? localError}</p>
        )}

        <RuleImportHistory items={imports.history} onDownloadErrors={onDownloadErrors} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="ghost" onPress={onClose}>
          关闭
        </Button>
      </div>
    </Modal>
  );
}
