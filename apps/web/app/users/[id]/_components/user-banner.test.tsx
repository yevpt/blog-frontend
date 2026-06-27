import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePresenceStore } from "@repo/hooks";
import { UserBanner } from "./user-banner";

const baseProps = {
  userId: 1,
  lastLoginAt: null,
  isOwner: false,
  isEditMode: false,
};

describe("UserBanner", () => {
  beforeEach(() => {
    usePresenceStore.setState({ records: new Map() });
  });
  it("渲染不崩溃", () => {
    const { container } = render(<UserBanner {...baseProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("非本人不显示编辑遮罩", () => {
    render(<UserBanner {...baseProps} isOwner={false} isEditMode={false} />);
    expect(screen.queryByText("点击更换背景")).not.toBeInTheDocument();
  });

  it("本人编辑模式显示 Banner 遮罩", () => {
    render(<UserBanner {...baseProps} isOwner isEditMode />);
    expect(screen.getByText("点击更换背景")).toBeInTheDocument();
  });

  it("is_online=true 显示在线", () => {
    render(<UserBanner {...baseProps} isOnline />);
    expect(screen.getByText("在线")).toBeInTheDocument();
  });

  it("离线时显示相对活跃时间", () => {
    const oldActive = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    render(<UserBanner {...baseProps} lastActiveAt={oldActive} isOnline={false} />);
    expect(screen.getByText(/活跃过/)).toBeInTheDocument();
  });
});
