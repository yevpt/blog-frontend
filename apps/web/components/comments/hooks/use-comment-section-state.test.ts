// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import type { ReplyTarget } from "@/components/comments/parts/comment-item";
import { useCommentSectionState } from "./use-comment-section-state";

const mockOpenLoginModal = vi.fn();
const mockAddComment = vi.fn();
const mockIncrementReplyCount = vi.fn();
const mockUpdateCommentLike = vi.fn();
const mockSubmitComment = vi.fn();
const mockSubmitReply = vi.fn();
const mockToggleCommentLike = vi.fn();
const mockClearError = vi.fn();

let mockSessionUserId: number | null = 1;
let mockComments: CommentItemResp[] = [];

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockSessionUserId }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: (selector: (state: { open: typeof mockOpenLoginModal }) => unknown) =>
    selector({ open: mockOpenLoginModal }),
}));

vi.mock("@/hooks/use-comment-list", () => ({
  useCommentList: () => ({
    comments: mockComments,
    isLoading: false,
    hasMore: false,
    error: null,
    loadMore: vi.fn(),
    addComment: mockAddComment,
    incrementReplyCount: mockIncrementReplyCount,
    updateCommentLike: mockUpdateCommentLike,
  }),
}));

vi.mock("@/hooks/use-comment-submit", () => ({
  useCommentSubmit: () => ({
    isSubmitting: false,
    error: null,
    clearError: mockClearError,
    submitComment: mockSubmitComment,
    submitReply: mockSubmitReply,
  }),
}));

vi.mock("@/hooks/use-comment-like", () => ({
  useCommentLike: () => ({
    toggleCommentLike: mockToggleCommentLike,
  }),
}));

function makeComment(id: number): CommentItemResp {
  return {
    id,
    target_type: "article",
    target_id: 1,
    user_id: 1,
    content: `评论 ${id}`,
    user: { id: 1, username: "alice", nickname: "Alice" },
    reply_count: 0,
    like_count: 0,
    is_liked: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function makeReply(id: number): CommentReplyResp {
  return {
    id,
    target_type: "article",
    comment_id: 1,
    from_user_id: 1,
    to_user_id: 2,
    parent_reply_id: 0,
    content: "回复内容",
    like_count: 0,
    is_liked: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("useCommentSectionState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionUserId = 1;
    mockComments = [makeComment(1)];
    mockSubmitComment.mockResolvedValue(makeComment(99));
    mockSubmitReply.mockResolvedValue(makeReply(10));
    mockToggleCommentLike.mockResolvedValue({ is_liked: true, like_count: 3 });
  });

  it("reply action opens login modal when logged out", () => {
    mockSessionUserId = null;
    const { result } = renderHook(() =>
      useCommentSectionState({ targetType: "article", targetId: 1 }),
    );

    const target: ReplyTarget = { commentId: 1, toUsername: "Alice" };
    act(() => {
      result.current.handleReply(target);
    });

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(result.current.replyTarget).toBeNull();
  });

  it("comment submit calls addComment, clears content, and calls onCommentAdded", async () => {
    const onCommentAdded = vi.fn();
    const onScrollToListTop = vi.fn();
    const { result } = renderHook(() =>
      useCommentSectionState({
        targetType: "article",
        targetId: 1,
        onCommentAdded,
        onScrollToListTop,
      }),
    );

    act(() => {
      result.current.setContent("新评论");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSubmitComment).toHaveBeenCalledWith("新评论");
    expect(mockAddComment).toHaveBeenCalledWith(makeComment(99));
    expect(result.current.content).toBe("");
    expect(onCommentAdded).toHaveBeenCalledOnce();
    expect(onScrollToListTop).toHaveBeenCalledOnce();
  });

  it("reply submit increments reply count and stores pending reply", async () => {
    const onScrollToComment = vi.fn();
    const { result } = renderHook(() =>
      useCommentSectionState({
        targetType: "article",
        targetId: 1,
        onScrollToComment,
      }),
    );

    act(() => {
      result.current.handleReply({ commentId: 1, toUsername: "Alice" });
      result.current.setContent("回复一下");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSubmitReply).toHaveBeenCalledWith(1, "回复一下", undefined);
    expect(mockIncrementReplyCount).toHaveBeenCalledWith(1);
    expect(result.current.pendingReplies[1]).toEqual(makeReply(10));
    expect(result.current.replyTarget).toBeNull();
    expect(result.current.content).toBe("");
    expect(onScrollToComment).toHaveBeenCalledWith(1);
  });

  it("like action opens login modal when logged out", async () => {
    mockSessionUserId = null;
    const { result } = renderHook(() =>
      useCommentSectionState({ targetType: "article", targetId: 1 }),
    );

    await act(async () => {
      await result.current.handleCommentLike(1);
    });

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(mockToggleCommentLike).not.toHaveBeenCalled();
  });

  it("successful like updates the matching comment", async () => {
    const { result } = renderHook(() =>
      useCommentSectionState({ targetType: "article", targetId: 1 }),
    );

    await act(async () => {
      await result.current.handleCommentLike(1);
    });

    expect(mockToggleCommentLike).toHaveBeenCalledWith(1);
    expect(mockUpdateCommentLike).toHaveBeenCalledWith(1, true, 3);
  });
});
