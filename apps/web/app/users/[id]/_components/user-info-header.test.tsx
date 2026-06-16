import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserInfoHeader } from "./user-info-header";

const baseProps = {
  nickname: "TestUser",
  mark: null,
  description: null,
  avatarUrl: null,
  lastLoginAt: null,
  roles: [],
  socialLinks: [],
  isOwner: false,
  isEditMode: false,
  onToggleEditMode: vi.fn(),
  onSaveNickname: vi.fn().mockResolvedValue(undefined),
};

describe("UserInfoHeader", () => {
  it("渲染不崩溃", () => {
    render(<UserInfoHeader {...baseProps} />);
    expect(screen.getByText("TestUser")).toBeInTheDocument();
  });

  it("非本人不显示编辑按钮", () => {
    render(<UserInfoHeader {...baseProps} isOwner={false} />);
    expect(screen.queryByText("编辑个人资料")).not.toBeInTheDocument();
  });

  it("本人只读模式显示「编辑个人资料」按钮", () => {
    render(<UserInfoHeader {...baseProps} isOwner isEditMode={false} />);
    expect(screen.getByText("编辑个人资料")).toBeInTheDocument();
  });

  it("本人编辑模式显示「退出编辑」按钮", () => {
    render(<UserInfoHeader {...baseProps} isOwner isEditMode />);
    expect(screen.getByText("退出编辑")).toBeInTheDocument();
  });

  it("编辑模式下昵称旁显示铅笔图标", () => {
    render(<UserInfoHeader {...baseProps} isOwner isEditMode />);
    expect(screen.getByLabelText("编辑昵称")).toBeInTheDocument();
  });

  it("有身份标签时显示", () => {
    render(<UserInfoHeader {...baseProps} mark="全栈工程师" />);
    expect(screen.getByText("全栈工程师")).toBeInTheDocument();
  });

  it("VIP 角色显示 badge", () => {
    render(<UserInfoHeader {...baseProps} roles={["vip"]} />);
    expect(screen.getByText("VIP")).toBeInTheDocument();
  });

  it("点击铅笔图标进入昵称编辑态", async () => {
    render(<UserInfoHeader {...baseProps} isOwner isEditMode />);
    await userEvent.click(screen.getByLabelText("编辑昵称"));
    expect(screen.getByDisplayValue("TestUser")).toBeInTheDocument();
  });

  it("传入社交链接不崩溃", () => {
    const socialLinks = [{ platform: "github", url: "https://github.com/test" }];
    expect(() => render(<UserInfoHeader {...baseProps} socialLinks={socialLinks} />)).not.toThrow();
  });
});
