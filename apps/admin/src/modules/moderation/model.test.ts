import { describe, expect, it } from "vitest";
import { ApiError } from "@repo/api";
import type { AdminModerationItemResp } from "@repo/api";
import {
  CONTENT_TYPE_OPTIONS,
  RISK_LEVEL_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  PUBLIC_STATE_OPTIONS,
  canReview,
  canHide,
  canRestore,
  contentTypeLabel,
  formatModerationDate,
  hasActiveModerationListQuery,
  isReviewConflictError,
  mapItemToRow,
  moderationListQueryCodec,
  policyActionLabel,
  publicStateLabel,
  publicStateVariant,
  reviewStatusLabel,
  riskLevelLabel,
  riskLevelVariant,
  reviewStatusVariant,
  toListReq,
  truncateContent,
  type AdminModerationListFilters,
  type ModerationListQueryState,
} from "./model";

function createItem(overrides: Partial<AdminModerationItemResp> = {}): AdminModerationItemResp {
  return {
    item_id: 100,
    subject: { type: "moment", id: 9 },
    author_id: 42,
    lock_version: 3,
    lifecycle_state: "active",
    public_state: "placeholder",
    revision_id: 200,
    revision_version: 2,
    submitted_content: "新提交内容",
    published_content: "已发布内容",
    risk_level: "medium",
    policy_action: "post_review",
    review_status: "pending",
    created_at: "2026-06-29T08:00:00Z",
    can_interact: true,
    ...overrides,
  };
}

describe("moderation model 标签与选项", () => {
  it("CONTENT_TYPE_OPTIONS / RISK_LEVEL_OPTIONS / REVIEW_STATUS_OPTIONS 包含全部选项", () => {
    expect(CONTENT_TYPE_OPTIONS.map((o) => o.value)).toEqual([
      "all",
      "moment",
      "article_comment",
      "moment_comment",
      "guestbook",
      "article_comment_reply",
      "moment_comment_reply",
      "guestbook_reply",
    ]);
    expect(RISK_LEVEL_OPTIONS.map((o) => o.value)).toEqual(["all", "low", "medium", "high"]);
    expect(REVIEW_STATUS_OPTIONS.map((o) => o.value)).toEqual([
      "all",
      "pending",
      "approved",
      "rejected",
      "superseded",
    ]);
    expect(PUBLIC_STATE_OPTIONS.map((o) => o.value)).toEqual([
      "all",
      "visible",
      "placeholder",
      "hidden",
      "emergency_hidden",
    ]);
  });

  it("标签字典覆盖完整", () => {
    expect(contentTypeLabel("moment")).toBe("碎语");
    expect(contentTypeLabel("article_comment")).toBe("文章评论");
    expect(contentTypeLabel("guestbook_reply")).toBe("留言回复");
    expect(riskLevelLabel("high")).toBe("高风险");
    expect(reviewStatusLabel("superseded")).toBe("已被新版本替代");
    expect(publicStateLabel("emergency_hidden")).toBe("紧急隐藏");
    expect(policyActionLabel("pre_review")).toBe("先审后发");
  });

  it("风险与状态徽标 variant 映射稳定", () => {
    expect(riskLevelVariant("low")).toBe("success");
    expect(riskLevelVariant("medium")).toBe("warning");
    expect(riskLevelVariant("high")).toBe("error");
    expect(reviewStatusVariant("approved")).toBe("success");
    expect(reviewStatusVariant("rejected")).toBe("error");
    expect(reviewStatusVariant("pending")).toBe("warning");
    expect(reviewStatusVariant("superseded")).toBe("secondary");
    expect(publicStateVariant("visible")).toBe("success");
    expect(publicStateVariant("placeholder")).toBe("secondary");
    expect(publicStateVariant("hidden")).toBe("outline");
    expect(publicStateVariant("emergency_hidden")).toBe("error");
  });
});

describe("mapItemToRow", () => {
  it("映射基础字段并截断 submitted_content", () => {
    const row = mapItemToRow(
      createItem({ submitted_content: "一二三四五六七八九十一二三四五六七八九十" }),
    );

    expect(row.itemId).toBe(100);
    expect(row.authorId).toBe(42);
    expect(row.lockVersion).toBe(3);
    expect(row.revisionId).toBe(200);
    expect(row.contentTypeLabel).toBe("碎语");
    expect(row.riskLabel).toBe("中风险");
    expect(row.policyLabel).toBe("审后通过");
    expect(row.reviewLabel).toBe("待审核");
    expect(row.createdAt).toMatch(/2026/);
    expect(row.summary.length).toBeLessThanOrEqual(60);
  });

  it("moment_options 透传到行", () => {
    const row = mapItemToRow(
      createItem({
        subject: { type: "moment", id: 9 },
        moment_options: { status: 0, comment_status: 1 },
      }),
    );

    expect(row.momentOptions).toEqual({ status: 0, comment_status: 1 });
  });

  it("非 moment 类型不展示 moment_options", () => {
    const row = mapItemToRow(createItem({ subject: { type: "guestbook", id: 5 } }));

    expect(row.momentOptions).toBeUndefined();
  });

  it("映射紧急隐藏原因与时间并格式化时间", () => {
    const row = mapItemToRow(
      createItem({
        public_state: "emergency_hidden",
        emergency_hide_reason: "紧急下架违规内容",
        emergency_hidden_at: "2026-06-29T08:00:00Z",
      }),
    );

    expect(row.emergencyHideReason).toBe("紧急下架违规内容");
    expect(row.emergencyHiddenAt).toMatch(/2026/);
  });

  it("非紧急隐藏项不设置紧急隐藏字段", () => {
    const row = mapItemToRow(createItem({ public_state: "visible" }));

    expect(row.emergencyHideReason).toBeUndefined();
    expect(row.emergencyHiddenAt).toBeUndefined();
  });
});

describe("操作可用性", () => {
  it("deleted item 不可审核、不可隐藏、不可恢复", () => {
    const item = createItem({ lifecycle_state: "deleted" });

    expect(canReview(item)).toBe(false);
    expect(canHide(item)).toBe(false);
    expect(canRestore(item)).toBe(false);
  });

  it("仅 pending revision 可以通过、驳回或修正", () => {
    expect(canReview(createItem({ review_status: "pending" }))).toBe(true);
    expect(canReview(createItem({ review_status: "approved" }))).toBe(false);
    expect(canReview(createItem({ review_status: "rejected" }))).toBe(false);
    expect(canReview(createItem({ review_status: "superseded" }))).toBe(false);
  });

  it("active 且 visible 可隐藏", () => {
    expect(canHide(createItem({ public_state: "visible" }))).toBe(true);
    expect(canHide(createItem({ public_state: "emergency_hidden" }))).toBe(false);
    expect(canHide(createItem({ public_state: "placeholder" }))).toBe(false);
  });

  it("emergency_hidden 可恢复，其他不可恢复", () => {
    expect(canRestore(createItem({ public_state: "emergency_hidden" }))).toBe(true);
    expect(canRestore(createItem({ public_state: "visible" }))).toBe(false);
    expect(
      canRestore(createItem({ lifecycle_state: "deleted", public_state: "emergency_hidden" })),
    ).toBe(false);
  });
});

describe("isReviewConflictError", () => {
  it("识别 MODERATION_REVIEW_CONFLICT 字符串错误码", () => {
    expect(isReviewConflictError(new ApiError("MODERATION_REVIEW_CONFLICT", "冲突"))).toBe(true);
  });

  it("其他错误不识别为审核冲突", () => {
    expect(isReviewConflictError(new ApiError(404, "未找到"))).toBe(false);
    expect(isReviewConflictError(new Error("网络错误"))).toBe(false);
    expect(isReviewConflictError(null)).toBe(false);
  });
});

describe("truncateContent / formatModerationDate", () => {
  it("truncateContent 超长截断并加省略号", () => {
    const long = "字".repeat(80);
    const truncated = truncateContent(long, 60);
    expect(truncated).toHaveLength(61);
    expect(truncated.endsWith("…")).toBe(true);
  });

  it("短文本原样返回", () => {
    expect(truncateContent("短文本", 60)).toBe("短文本");
  });

  it("formatModerationDate 解析失败回退原值", () => {
    expect(formatModerationDate("not-a-date")).toBe("not-a-date");
  });
});

describe("moderationListQueryCodec", () => {
  const defaultFilters: AdminModerationListFilters = {
    contentType: "all",
    riskLevel: "all",
    reviewStatus: "pending",
    publicState: "all",
  };

  it("默认状态 review_status=pending", () => {
    expect(moderationListQueryCodec.defaultState).toEqual({
      page: 1,
      filters: defaultFilters,
    });
  });

  it("write/parse 往返非默认筛选", () => {
    const state: ModerationListQueryState = {
      page: 2,
      filters: {
        contentType: "guestbook",
        riskLevel: "high",
        reviewStatus: "approved",
        publicState: "all",
      },
    };

    const params = moderationListQueryCodec.write(state);
    expect(params.get("page")).toBe("2");
    expect(params.get("content_type")).toBe("guestbook");
    expect(params.get("risk_level")).toBe("high");
    expect(params.get("review_status")).toBe("approved");

    expect(moderationListQueryCodec.parse(params)).toEqual(state);
  });

  it("write 省略默认值", () => {
    expect(moderationListQueryCodec.write({ page: 1, filters: defaultFilters }).toString()).toBe(
      "",
    );
  });

  it("toListReq 在 reviewStatus=all 时传 review_status=all", () => {
    expect(
      toListReq({
        page: 1,
        filters: { ...defaultFilters, reviewStatus: "all" },
      }),
    ).toEqual({
      page: 1,
      page_size: 10,
      review_status: "all",
      public_state: undefined,
    });
  });

  it("toListReq 透传 public_state 非默认值", () => {
    expect(
      toListReq({
        page: 1,
        filters: { ...defaultFilters, publicState: "emergency_hidden" },
      }),
    ).toEqual({
      page: 1,
      page_size: 10,
      review_status: "pending",
      public_state: "emergency_hidden",
    });
  });

  it("hasActiveModerationListQuery 识别非默认状态", () => {
    expect(hasActiveModerationListQuery({ page: 1, filters: defaultFilters })).toBe(false);
    expect(
      hasActiveModerationListQuery({
        page: 1,
        filters: { ...defaultFilters, contentType: "moment" },
      }),
    ).toBe(true);
    expect(
      hasActiveModerationListQuery({
        page: 1,
        filters: { ...defaultFilters, publicState: "emergency_hidden" },
      }),
    ).toBe(true);
    expect(
      hasActiveModerationListQuery({
        page: 2,
        filters: defaultFilters,
      }),
    ).toBe(true);
  });

  it("parse 无效值回退默认", () => {
    const params = new URLSearchParams({
      page: "abc",
      content_type: "unknown",
      risk_level: "unknown",
      review_status: "unknown",
    });

    expect(moderationListQueryCodec.parse(params)).toEqual({
      page: 1,
      filters: defaultFilters,
    });
  });
});

describe("superseded 文案", () => {
  it('reviewStatusLabel superseded 返回"已被新版本替代"', () => {
    expect(reviewStatusLabel("superseded")).toBe("已被新版本替代");
  });
});

describe("mapItemToRow rowId", () => {
  it("rowId 为 itemId:revisionId 格式", () => {
    const row = mapItemToRow(createItem({ item_id: 42, revision_id: 99 }));
    expect(row.rowId).toBe("42:99");
  });
});
