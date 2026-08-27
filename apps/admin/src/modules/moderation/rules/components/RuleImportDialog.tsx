import { useMemo, useRef, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, ButtonUtility, Input, Label, Modal, Select, cn } from "@repo/ui";
import type { AdminModerationRuleMetadataResp } from "@repo/api";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
  adminDialogSectionClassName,
} from "../../../../components/AdminDialog";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "上传失败");
    }
  };

  const active = imports.active;

  const handleClose = () => {
    if (imports.isLoading) return;
    setLocalError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => !next && handleClose()}
      isDismissable={!imports.isLoading}
      placement="fullscreen-mobile"
      size="lg"
      aria-label="批量导入规则"
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <AdminDialogFrame>
        <AdminDialogHeader
          eyebrow="规则维护"
          title="批量导入规则"
          description="上传 CSV 或 TXT 词库，先校验重复与错误行，再决定是否发布到候选规则集。"
          action={
            <ButtonUtility
              tooltip="关闭批量导入"
              color="tertiary"
              icon={<SvgIcon name="close" />}
              isDisabled={imports.isLoading}
              onClick={handleClose}
            />
          }
        />

        <AdminDialogBody contentClassName="grid gap-6">
          <section className="grid gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">来源与默认值</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                文件内未声明的字段会使用这里的默认值。
              </p>
            </div>
            <Input
              label="来源名称"
              value={sourceName}
              onChange={setSourceName}
              placeholder="例如：采购词库-2026"
              hint="1–100 个字符，用于后续追踪规则来源。"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
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
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
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
              <div className="grid gap-1.5">
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
              <div className="grid gap-1.5">
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
          </section>

          <section className="grid gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">规则文件</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                当前接受 {format.toUpperCase()} 文件；上传前不会向服务端发送内容。
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/80 bg-muted/10 p-4 sm:flex-row sm:items-center">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary ring-1 ring-inset ring-primary/10">
                <SvgIcon name="list-checks" size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {file ? file.name : `尚未选择 ${format.toUpperCase()} 文件`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "选择文件后可开始校验"}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onPress={() => fileInputRef.current?.click()}
              >
                <SvgIcon name="arrow-up" size={14} />
                {file ? "替换文件" : "选择文件"}
              </Button>
              <input
                ref={fileInputRef}
                id="import-file"
                aria-label="规则文件"
                type="file"
                className="sr-only"
                accept={format === "csv" ? ".csv,text/csv" : ".txt,text/plain"}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
          </section>

          {active ? (
            <section className={cn(adminDialogSectionClassName, "grid gap-3 text-sm")}>
              <div>
                <p className="font-semibold text-foreground">
                  校验任务 #{active.id} · {active.file_name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  当前状态：{active.validation_status}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["总行", active.total_rows],
                  ["有效", active.valid_rows],
                  ["重复", active.duplicate_rows],
                  ["错误", active.error_rows],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-background/70 px-3 py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-0.5 font-semibold tabular-nums text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {active.validation_status === "valid" && active.ruleset_id ? (
                  <Button size="sm" onPress={() => void imports.publish()}>
                    确认发布
                  </Button>
                ) : null}
                {active.validation_status !== "invalid" &&
                active.validation_status !== "canceled" ? (
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
            </section>
          ) : null}

          {imports.error || localError ? (
            <p role="alert" className="text-sm text-destructive">
              {imports.error ?? localError}
            </p>
          ) : null}

          <RuleImportHistory items={imports.history} onDownloadErrors={onDownloadErrors} />
        </AdminDialogBody>

        <AdminDialogFooter>
          <Button variant="outline" onPress={handleClose} isDisabled={imports.isLoading}>
            关闭
          </Button>
          <Button
            onPress={() => void handleUpload()}
            isDisabled={!canUpload || imports.isLoading}
            isLoading={imports.isLoading}
            loadingText="上传中…"
          >
            上传并开始校验
          </Button>
        </AdminDialogFooter>
      </AdminDialogFrame>
    </Modal>
  );
}
