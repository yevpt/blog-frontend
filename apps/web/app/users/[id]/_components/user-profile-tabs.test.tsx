import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfileTabs } from "./user-profile-tabs";
import type { UserPublicProfileResp } from "@repo/api";

const baseProfile: UserPublicProfileResp = {
  id: 1,
  nickname: "TestUser",
  avatar_url: null,
  mark: null,
  description: null,
  last_login_at: null,
  register_at: "2024-01-01",
  roles: [],
  display_email: null,
  site: null,
  social_links: [],
  gender: null,
  birthday: null,
};

const baseProps = {
  profile: baseProfile,
  isOwner: false,
  isEditMode: false,
  onSaveField: vi.fn().mockResolvedValue(undefined),
};

describe("UserProfileTabs", () => {
  it("渲染不崩溃", () => {
    render(<UserProfileTabs {...baseProps} />);
    expect(screen.getByText("资料")).toBeInTheDocument();
  });

  it("访客模式显示碎语和点赞 Tab", () => {
    render(<UserProfileTabs {...baseProps} />);
    expect(screen.getByText("碎语")).toBeInTheDocument();
    expect(screen.getByText("点赞")).toBeInTheDocument();
  });

  it("访客模式不显示账号安全 Tab", () => {
    render(<UserProfileTabs {...baseProps} />);
    expect(screen.queryByText("账号安全")).not.toBeInTheDocument();
  });

  it("编辑模式下显示账号安全 Tab，隐藏碎语/点赞", () => {
    render(<UserProfileTabs {...baseProps} isOwner isEditMode />);
    expect(screen.getByText("账号安全")).toBeInTheDocument();
    expect(screen.queryByText("碎语")).not.toBeInTheDocument();
    expect(screen.queryByText("点赞")).not.toBeInTheDocument();
  });

  it("Tab hover 背景仅首尾保留外侧圆角", () => {
    render(<UserProfileTabs {...baseProps} />);

    const profileTab = screen.getByRole("tab", { name: "资料" });
    const momentsTab = screen.getByRole("tab", { name: "碎语" });
    const likesTab = screen.getByRole("tab", { name: "点赞" });

    expect(profileTab.className).toContain("rounded-tl-lg");
    expect(profileTab.className).not.toContain("rounded-tr-lg");

    expect(momentsTab.className).not.toContain("rounded-tl-lg");
    expect(momentsTab.className).not.toContain("rounded-tr-lg");

    expect(likesTab.className).toContain("rounded-tr-lg");
    expect(likesTab.className).not.toContain("rounded-tl-lg");
  });

  it("Tab 按钮不使用 focus ring，避免点击后按键出现边框", () => {
    render(<UserProfileTabs {...baseProps} />);

    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toContain("outline-none");
      expect(tab.className).not.toContain("focus-visible:ring");
    }
  });

  it("鼠标点击 Tab 不保留 focus", async () => {
    const user = userEvent.setup();
    render(<UserProfileTabs {...baseProps} />);

    const momentsTab = screen.getByRole("tab", { name: "碎语" });
    await user.click(momentsTab);

    expect(momentsTab).not.toHaveFocus();
    expect(momentsTab).toHaveAttribute("aria-selected", "true");
  });

  it("mousedown 时阻止默认 focus 行为", () => {
    render(<UserProfileTabs {...baseProps} />);

    const momentsTab = screen.getByRole("tab", { name: "碎语" });
    const prevented = !momentsTab.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );

    expect(prevented).toBe(true);
    fireEvent.click(momentsTab);
    expect(momentsTab).not.toHaveFocus();
  });

  it("激活指示线覆盖 tablist 底部 border", () => {
    render(<UserProfileTabs {...baseProps} />);

    const indicator = screen.getByTestId("user-profile-tab-indicator");
    expect(indicator.className).toContain("-bottom-px");
    expect(indicator.className).toContain("z-10");
  });

  it("碎语 Tab 无内容时显示现代化空态", async () => {
    const user = userEvent.setup();
    render(<UserProfileTabs {...baseProps} />);

    await user.click(screen.getByRole("tab", { name: "碎语" }));

    expect(screen.getByText("暂无碎语")).toBeInTheDocument();
    expect(screen.getByText("TA 还没有发布过碎语")).toBeInTheDocument();
    expect(screen.getByTestId("profile-tab-empty-state")).toBeInTheDocument();
  });

  it("本人查看碎语 Tab 空态时显示引导文案", async () => {
    const user = userEvent.setup();
    render(<UserProfileTabs {...baseProps} isOwner />);

    await user.click(screen.getByRole("tab", { name: "碎语" }));

    expect(screen.getByText("你还没有发布过碎语，去分享生活的碎片吧")).toBeInTheDocument();
  });

  it("点赞 Tab 无内容时显示现代化空态", async () => {
    const user = userEvent.setup();
    render(<UserProfileTabs {...baseProps} />);

    await user.click(screen.getByRole("tab", { name: "点赞" }));

    expect(screen.getByText("暂无点赞")).toBeInTheDocument();
    expect(screen.getByText("TA 还没有点赞过任何内容")).toBeInTheDocument();
  });
});
