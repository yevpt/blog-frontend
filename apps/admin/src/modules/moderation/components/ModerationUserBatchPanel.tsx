import { useState } from "react";
import { Button, Input } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import type { BatchState, HideBatchReq } from "../hooks/use-moderation-user";

interface ModerationUserBatchPanelProps {
  batch: BatchState | null;
  isSaving: boolean;
  onHideBatch: (req: HideBatchReq) => Promise<void>;
  onRestoreBatch: (req: HideBatchReq) => Promise<void>;
}

export function ModerationUserBatchPanel({
  batch,
  isSaving,
  onHideBatch,
  onRestoreBatch,
}: ModerationUserBatchPanelProps) {
  const [reason, setReason] = useState("");

  function request(operation: "hide" | "restore") {
    const req = {
      cursor: batch?.operation === operation ? batch.next_cursor : 0,
      reason: reason.trim() || undefined,
    };
    return operation === "hide" ? onHideBatch(req) : onRestoreBatch(req);
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border/70 p-3">
      <p className="text-sm font-medium text-foreground">按用户批量隐藏 / 恢复内容</p>
      <p className="text-xs text-muted-foreground">
        每次只处理一批，由管理员点击「继续下一批」推进，不会自动循环。
      </p>
      <Input
        label="批次原因（可选）"
        size="sm"
        value={reason}
        onChange={setReason}
        isDisabled={isSaving}
      />
      {batch ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          本批处理 {batch.processed} 条 · next_cursor {batch.next_cursor} ·{" "}
          {batch.has_more ? "仍有更多" : "已处理完毕"}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onPress={() => void request("hide")}
          isDisabled={isSaving}
          isLoading={isSaving}
          loadingText="处理中…"
        >
          隐藏本批
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={() => void request("restore")}
          isDisabled={isSaving}
        >
          恢复本批
        </Button>
        {batch?.has_more ? (
          <Button
            size="sm"
            variant="ghost"
            onPress={() => void request(batch.operation)}
            isDisabled={isSaving}
          >
            <SvgIcon name="chevron-right" size={14} />
            继续下一批
          </Button>
        ) : null}
      </div>
    </div>
  );
}
