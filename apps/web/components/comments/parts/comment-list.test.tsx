// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { CommentList } from "./comment-list";
import type { ReplyTarget } from "./comment-item";

const mockState = vi.hoisted(() => ({
  commentItemProps: [] as Array<{
    comment: CommentItemResp;
    currentUserId?: number | null;
    onDelete?: (commentId: number) => Promise<boolean>;
    onDeleteReply?: (commentId: number, replyId: number) => Promise<boolean>;
  }>,
}));

vi.mock("./comment-item", () => ({
  CommentItem: (props: {
    comment: CommentItemResp;
    currentUserId?: number | null;
    onDelete?: (commentId: number) => Promise<boolean>;
    onDeleteReply?: (commentId: number, replyId: number) => Promise<boolean>;
  }) => {
    mockState.commentItemProps.push(props);
    return <div data-testid="comment-item">{props.comment.content}</div>;
  },
}));

function makeComment(id: number): CommentItemResp {
  return {
    id,
    target_type: "article",
    target_id: 1,
    user_id: id,
    content: `评论 ${id}`,
    reply_count: 0,
    like_count: 0,
    is_liked: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("CommentList", () => {
  const defaultProps = {
    comments: [makeComment(1)],
    isLoading: false,
    error: null,
    hasMore: false,
    pendingReplies: {} as Record<number, CommentReplyResp | null>,
    targetType: "article" as const,
    onReply: vi.fn<(target: ReplyTarget) => void>(),
    onLike: vi.fn<(commentId: number) => void>(),
    onLoadMore: vi.fn<() => void>(),
  };

  beforeEach(() => {
    mockState.commentItemProps = [];
  });

  it("向评论项透传当前用户和删除回调", () => {
    const onDelete = vi.fn();
    const onDeleteReply = vi.fn();
    render(
      <CommentList
        {...defaultProps}
        currentUserId={7}
        onDelete={onDelete}
        onDeleteReply={onDeleteReply}
      />,
    );

    expect(screen.getByText("评论 1")).toBeTruthy();
    expect(mockState.commentItemProps[0].currentUserId).toBe(7);
    expect(mockState.commentItemProps[0].onDelete).toBe(onDelete);
    expect(mockState.commentItemProps[0].onDeleteReply).toBe(onDeleteReply);
  });
});
