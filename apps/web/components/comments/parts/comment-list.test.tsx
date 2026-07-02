// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommentItemResp, CommentReplyResp } from "@repo/api";
import { CommentList, getCommentListSkeletonCount } from "./comment-list";

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

vi.mock("./comment-skeleton", () => ({
  CommentListSkeleton: ({ count }: { count?: number }) => (
    <div data-testid="comment-list-skeleton" data-count={String(count ?? 3)} />
  ),
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
    onSubmitReply:
      vi.fn<
        (commentId: number, parentReplyId: number | undefined, content: string) => Promise<boolean>
      >(),
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

  it("加载中且预期有评论时按评论数渲染骨架屏", () => {
    render(
      <CommentList
        {...defaultProps}
        comments={[]}
        isLoading
        expectedCommentCount={7}
        hasLoaded={false}
      />,
    );

    expect(screen.getByTestId("comment-list-skeleton")).toHaveAttribute("data-count", "7");
    expect(screen.queryByText("暂无评论，来发表第一条吧")).not.toBeInTheDocument();
  });

  it("首屏未加载完成且预期评论数超过单页时骨架屏不超过单页上限", () => {
    render(
      <CommentList
        {...defaultProps}
        comments={[]}
        isLoading={false}
        expectedCommentCount={15}
        hasLoaded={false}
      />,
    );

    expect(screen.getByTestId("comment-list-skeleton")).toHaveAttribute("data-count", "10");
  });

  it("加载完成且无评论时展示空状态", () => {
    render(
      <CommentList
        {...defaultProps}
        comments={[]}
        isLoading={false}
        expectedCommentCount={0}
        hasLoaded
      />,
    );

    expect(screen.getByText("暂无评论，来发表第一条吧")).toBeInTheDocument();
    expect(screen.queryByTestId("comment-list-skeleton")).not.toBeInTheDocument();
  });
});

describe("getCommentListSkeletonCount", () => {
  it("未知或为零时返回默认条数", () => {
    expect(getCommentListSkeletonCount()).toBe(3);
    expect(getCommentListSkeletonCount(0)).toBe(3);
  });

  it("按实际评论数返回且不超过单页上限", () => {
    expect(getCommentListSkeletonCount(5)).toBe(5);
    expect(getCommentListSkeletonCount(10)).toBe(10);
    expect(getCommentListSkeletonCount(25)).toBe(10);
  });
});
