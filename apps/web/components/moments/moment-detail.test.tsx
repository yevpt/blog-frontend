import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MomentItemResp } from "@repo/api";
import { MomentDetail } from "./moment-detail";

const mockToggleLike = vi.fn();
const mockUpdateMoment = vi.fn();
const mockToggleTop = vi.fn();
const mockDeleteMoment = vi.fn();
const mockOpenMomentModal = vi.fn();

vi.mock("@/hooks/use-moment-detail", () => ({
  useMomentDetail: (initialMoment: MomentItemResp) => ({
    moment: initialMoment,
    likePending: false,
    actionPending: false,
    toggleLike: mockToggleLike,
    updateMoment: mockUpdateMoment,
    toggleTop: mockToggleTop,
    deleteMoment: mockDeleteMoment,
  }),
}));

vi.mock("@/store/use-moment-modal", () => ({
  useMomentModal: (selector: (state: { open: typeof mockOpenMomentModal }) => unknown) =>
    selector({ open: mockOpenMomentModal }),
}));

vi.mock("./moment-card", () => ({
  MomentCard: ({
    moment,
    onLike,
    onComment,
    onEdit,
    onToggleTop,
    onDelete,
  }: {
    moment: { id: number; content: string };
    onLike?: (moment: unknown) => void;
    onComment?: (moment: unknown) => void;
    onEdit?: (moment: unknown) => void;
    onToggleTop?: (moment: unknown) => void;
    onDelete?: (moment: unknown) => void;
  }) => (
    <div data-testid="moment-card">
      <span>{moment.content}</span>
      <button aria-label="点赞" onClick={() => onLike?.(moment)} />
      <button aria-label="评论" onClick={() => onComment?.(moment)} />
      <button aria-label="编辑" onClick={() => onEdit?.(moment)} />
      <button aria-label="置顶" onClick={() => onToggleTop?.(moment)} />
      <button aria-label="删除" onClick={() => onDelete?.(moment)} />
    </div>
  ),
}));

function makeMoment(overrides: Partial<MomentItemResp> = {}): MomentItemResp {
  return {
    id: 1,
    user_id: 1,
    content: "详情碎语",
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 2,
    comment_count: 1,
    is_liked: false,
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

describe("MomentDetail", () => {
  it("渲染碎语内容", () => {
    render(<MomentDetail initialMoment={makeMoment()} />);
    expect(screen.getByText("详情碎语")).toBeInTheDocument();
  });

  it("点击点赞调用 useMomentDetail.toggleLike", async () => {
    const user = userEvent.setup();
    render(<MomentDetail initialMoment={makeMoment()} />);
    await user.click(screen.getByLabelText("点赞"));
    expect(mockToggleLike).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("点击编辑打开全局编辑弹窗并传入当前碎语与 updateMoment", async () => {
    const user = userEvent.setup();
    render(<MomentDetail initialMoment={makeMoment()} />);
    await user.click(screen.getByLabelText("编辑"));
    expect(mockOpenMomentModal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      mockUpdateMoment,
    );
  });

  it("点击置顶调用 useMomentDetail.toggleTop", async () => {
    const user = userEvent.setup();
    render(<MomentDetail initialMoment={makeMoment()} />);
    await user.click(screen.getByLabelText("置顶"));
    expect(mockToggleTop).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("点击删除调用 useMomentDetail.deleteMoment", async () => {
    const user = userEvent.setup();
    render(<MomentDetail initialMoment={makeMoment()} />);
    await user.click(screen.getByLabelText("删除"));
    expect(mockDeleteMoment).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("点击评论滚动到内联评论区锚点", async () => {
    const user = userEvent.setup();
    const scrollIntoViewMock = vi.fn();
    const anchor = document.createElement("div");
    anchor.id = "moment-detail-comments";
    anchor.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(anchor);

    render(<MomentDetail initialMoment={makeMoment()} />);
    await user.click(screen.getByLabelText("评论"));

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
    document.body.removeChild(anchor);
  });
});
