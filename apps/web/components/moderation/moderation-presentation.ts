import type { BadgeProps } from "@repo/ui";
import type { ModerationView } from "@repo/api";

export interface ModerationPresentation {
  label: string;
  description: string;
  variant: NonNullable<BadgeProps["variant"]>;
}

const legacyVisibleModeration: ModerationView = {
  public_state: "visible",
  display_version: "last_approved",
  has_pending_revision: false,
  can_interact: true,
};

const publicStates = new Set(["visible", "placeholder", "hidden", "emergency_hidden"]);

/** 审核关闭或旧响应缺失状态时，回退为普通可见且允许交互。 */
export function normalizeModerationView(moderation?: ModerationView | null): ModerationView {
  if (!moderation || !publicStates.has(moderation.public_state)) {
    return legacyVisibleModeration;
  }
  return moderation;
}

/** 非作者在中风险首次发布占位态下不得看到提交正文。 */
export function shouldShowModerationContentPlaceholder(
  moderation?: ModerationView | null,
  isOwner = false,
): boolean {
  const view = normalizeModerationView(moderation);
  return view.public_state === "placeholder" && !isOwner;
}

/** 作者在中风险首次发布时优先展示待审正文。 */
export function getAuthorMomentDisplayContent(moment: {
  content: string;
  moderation?: ModerationView | null;
}): string {
  const moderation = normalizeModerationView(moment.moderation);
  if (moderation.public_state === "placeholder") {
    const pending = moment.moderation?.pending_content?.trim();
    if (pending) return pending;
  }
  return moment.content;
}

/** 将后端审核事实转换为稳定、无业务耦合的前端文案。 */
export function getModerationPresentation(
  value?: ModerationView | null,
): ModerationPresentation | null {
  const moderation = normalizeModerationView(value);
  if (moderation.public_state === "emergency_hidden") {
    return {
      label: "紧急隐藏",
      description: "该内容当前不可见。",
      variant: "error",
    };
  }
  if (moderation.review_status === "rejected") {
    return {
      label: "审核未通过",
      description: "该内容未通过审核，仅你可见。",
      variant: "error",
    };
  }
  if (moderation.public_state === "hidden") {
    return {
      label: "已隐藏",
      description: "该内容当前不可见。",
      variant: "error",
    };
  }
  if (moderation.public_state === "placeholder") {
    return {
      label: "等待人工审核",
      description: "内容存在风险，正在等待人工审核。",
      variant: "warning",
    };
  }
  if (!moderation.has_pending_revision) {
    return null;
  }
  if (moderation.pending_risk_level === "medium") {
    return {
      label: "等待人工审核",
      description: "新版本存在风险，正在等待人工审核；当前显示最后通过版本。",
      variant: "warning",
    };
  }
  return {
    label: "待审核",
    description: "内容已发布，正在等待审核。",
    variant: "secondary",
  };
}
