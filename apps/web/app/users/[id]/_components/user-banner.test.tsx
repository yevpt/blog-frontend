import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserBanner } from "./user-banner";

const baseProps = {
  lastLoginAt: null,
  isOwner: false,
  isEditMode: false,
};

describe("UserBanner", () => {
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

  it("最近 3 分钟内登录显示在线", () => {
    const recentLogin = new Date(Date.now() - 60 * 1000).toISOString();
    render(<UserBanner {...baseProps} lastLoginAt={recentLogin} />);
    expect(screen.getByText("在线")).toBeInTheDocument();
  });

  it("超过 3 分钟显示相对时间", () => {
    const oldLogin = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    render(<UserBanner {...baseProps} lastLoginAt={oldLogin} />);
    expect(screen.getByText(/来过/)).toBeInTheDocument();
  });
});
