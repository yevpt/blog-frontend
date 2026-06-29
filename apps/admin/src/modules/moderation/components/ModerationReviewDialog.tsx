import { useEffect, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { ButtonUtility, Modal } from "@repo/ui";
import type { ModerationRow } from "../model";
import { ModerationReviewActions, type ReviewMode } from "./ModerationReviewActions";
import { ModerationReviewDetails } from "./ModerationReviewDetails";

interface ModerationReviewDialogProps {
  open: boolean;
  item: ModerationRow | null;
  isSaving: boolean;
  submitError: string | null;
  onClose: () => void;
  onApprove: (reason: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onCorrect: (content: string, reason: string) => Promise<void>;
  onHide: (reason: string) => Promise<void>;
  onRestore: () => Promise<void>;
}

export function ModerationReviewDialog(props: ModerationReviewDialogProps) {
  const [mode, setMode] = useState<ReviewMode>("approve");
  const [reason, setReason] = useState("");
  const [correctContent, setCorrectContent] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open || !props.item) return;
    setMode(defaultMode(props.item));
    setReason("");
    setCorrectContent(props.item.submittedContent);
    setValidationError(null);
  }, [props.item, props.open]);

  const item = props.item;
  if (!item) return null;
  const deleted = item.lifecycleState === "deleted";
  const canReview = !deleted && item.reviewStatus === "pending";
  const canHide = !deleted && item.publicState === "visible";
  const canRestore = !deleted && item.publicState === "emergency_hidden";

  async function submit() {
    setValidationError(null);
    if (mode === "approve") return props.onApprove(reason.trim());
    if (mode === "reject") {
      if (!reason.trim()) return setValidationError("驳回必须填写理由");
      return props.onReject(reason.trim());
    }
    if (mode === "correct") {
      if (!correctContent.trim()) return setValidationError("修正正文不能为空");
      if (!reason.trim()) return setValidationError("修正必须填写理由");
      return props.onCorrect(correctContent.trim(), reason.trim());
    }
    if (mode === "hide") {
      if (!reason.trim()) return setValidationError("紧急隐藏必须填写原因");
      return props.onHide(reason.trim());
    }
    return props.onRestore();
  }

  return (
    <Modal
      isOpen={props.open}
      onOpenChange={(next) => {
        if (!next && !props.isSaving) props.onClose();
      }}
      isDismissable={!props.isSaving}
      placement="fullscreen-mobile"
      size="full"
      aria-label={`审核内容 #${item.itemId}`}
      modalClassName="max-md:top-0 max-md:h-dvh max-md:max-h-dvh md:max-w-[min(calc(100vw-2rem),64rem)] md:w-full"
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="shrink-0 border-b border-border/70 px-4 py-4 sm:px-5 max-md:pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                审核 #{item.itemId} · {item.contentTypeLabel}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                作者 ID：{item.authorId} · 提交版本 v{item.revisionVersion} · 创建 {item.createdAt}
              </p>
            </div>
            <ButtonUtility
              tooltip="关闭"
              icon={<SvgIcon name="close" size={16} />}
              isDisabled={props.isSaving}
              onClick={props.onClose}
              className="shrink-0 md:hidden"
            />
          </div>
        </header>
        <ModerationReviewDetails item={item} />
        {deleted ? null : (
          <ModerationReviewActions
            mode={mode}
            reason={reason}
            correctContent={correctContent}
            validationError={validationError}
            submitError={props.submitError}
            canReview={canReview}
            canHide={canHide}
            canRestore={canRestore}
            isSaving={props.isSaving}
            onModeChange={(next) => {
              setMode(next);
              setValidationError(null);
            }}
            onReasonChange={setReason}
            onCorrectContentChange={setCorrectContent}
            onClose={props.onClose}
            onSubmit={() => void submit()}
          />
        )}
      </div>
    </Modal>
  );
}

function defaultMode(item: ModerationRow): ReviewMode {
  if (item.reviewStatus === "pending") return "approve";
  if (item.publicState === "visible") return "hide";
  if (item.publicState === "emergency_hidden") return "restore";
  return "approve";
}
