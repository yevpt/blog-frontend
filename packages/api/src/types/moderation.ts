export type ModerationRiskLevel = "low" | "medium" | "high";
export type ModerationPublicState = "visible" | "placeholder" | "hidden" | "emergency_hidden";
export type ModerationDisplayVersion = "pending" | "last_approved" | "none";
export type ModerationReviewStatus = "pending" | "approved" | "rejected" | "superseded";
export type ModerationImageDisplayMode = "original" | "blurred" | "gif_placeholder";
export type ModerationContentType =
  | "moment"
  | "article_comment"
  | "moment_comment"
  | "guestbook"
  | "article_comment_reply"
  | "moment_comment_reply"
  | "guestbook_reply";
export type ModerationLifecycleState = "active" | "deleted";
export type ModerationPolicyAction = "auto_approve" | "post_review" | "pre_review" | "block";
export type ModerationDecisionType = "approved" | "corrected" | "rejected";
export type ModerationTrustLevel = "new" | "normal" | "trusted" | "restricted";
export type ModerationTrustSource = "auto" | "manual";
export type ModerationSanctionState = "active" | "muted" | "banned";
export type ModerationRegistrationMode = "open" | "closed";
export type ModerationPublishingMode = "open" | "pre_review_all" | "closed";

/** 内容当前公开形态和作者可见的待审状态。 */
export interface ModerationView {
  notice?: string;
  public_state: ModerationPublicState;
  display_version: ModerationDisplayVersion;
  has_pending_revision: boolean;
  pending_risk_level?: ModerationRiskLevel;
  review_status?: ModerationReviewStatus;
  pending_content?: string;
  can_interact: boolean;
}

export interface AdminModerationListReq {
  page?: number;
  page_size?: number;
  content_type?: ModerationContentType;
  risk_level?: ModerationRiskLevel;
  review_status?: ModerationReviewStatus;
}

export interface AdminModerationReviewReq {
  revision_id: number;
  lock_version: number;
  reason: string;
}

export interface AdminModerationCorrectReq extends AdminModerationReviewReq {
  content: string;
}

export interface AdminModerationSubjectResp {
  type: ModerationContentType;
  id: number;
  root_id?: number;
  parent_id?: number;
}

export interface AdminModerationMomentOptionsResp {
  status: 0 | 1;
  comment_status: 0 | 1;
}

export interface AdminModerationItemResp {
  item_id: number;
  subject: AdminModerationSubjectResp;
  author_id: number;
  lock_version: number;
  lifecycle_state: ModerationLifecycleState;
  public_state: ModerationPublicState;
  revision_id: number;
  revision_version: number;
  submitted_content: string;
  published_content: string;
  risk_level: ModerationRiskLevel;
  policy_action: ModerationPolicyAction;
  review_status: ModerationReviewStatus;
  moment_options?: AdminModerationMomentOptionsResp;
  decision_type?: ModerationDecisionType;
  decision_reason?: string;
  reviewer_id?: number;
  reviewed_at?: string;
  created_at: string;
  can_interact: boolean;
}

export interface AdminModerationPageResp {
  /** Go int64 — safe as JS number for blog-scale counts */
  total: number;
  page: number;
  page_size: number;
  list: AdminModerationItemResp[];
}

export interface AdminModerationControlReq {
  registration_mode: ModerationRegistrationMode;
  publishing_mode: ModerationPublishingMode;
  reason: string;
  lock_version: number;
}

export interface AdminModerationControlResp {
  registration_mode: ModerationRegistrationMode;
  publishing_mode: ModerationPublishingMode;
  reason?: string;
  operator_id?: number;
  changed_at: string;
  lock_version: number;
}

export interface AdminModerationProfileReq {
  trust_level: ModerationTrustLevel;
  manual_locked: boolean;
  restricted_until?: string | null;
}

export interface AdminModerationSanctionReq {
  until?: string | null;
  reason: string;
}

export interface AdminModerationProfileResp {
  user_id: number;
  trust_level: ModerationTrustLevel;
  trust_source: ModerationTrustSource;
  manual_trust_locked: boolean;
  sanction_state: ModerationSanctionState;
  sanction_until?: string;
  sanction_reason?: string;
  clean_approval_streak: number;
  corrected_count: number;
  rejected_count: number;
  high_risk_count: number;
  violation_score: number;
  last_violation_at?: string;
  restricted_until?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminModerationEmergencyReq {
  reason: string;
}

export interface AdminModerationEmergencyBatchReq {
  cursor: number;
  limit?: number;
  reason?: string;
}

export interface AdminModerationEmergencyItemResp {
  item_id: number;
  public_state: ModerationPublicState;
  lock_version: number;
}

export interface AdminModerationEmergencyBatchResp {
  processed: number;
  next_cursor: number;
  has_more: boolean;
}
