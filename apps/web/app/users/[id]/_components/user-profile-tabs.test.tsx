import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfileTabs } from "./user-profile-tabs";
import type { MomentPageResp, UserPublicProfileResp } from "@repo/api";
import { EMPTY_MOMENTS_PAGE } from "./profile-moments-tab/constants";

vi.mock("./profile-moments-tab/profile-moments-tab", () => ({
  ProfileMomentsTab: ({ onTotalChange }: { onTotalChange?: (total: number) => void }) => {
    onTotalChange?.(3);
    return <div data-testid="profile-moments-tab">moments content</div>;
  },
}));

vi.mock("./profile-likes-tab/profile-likes-tab", () => ({
  ProfileLikesTab: () => <div data-testid="profile-likes-tab">likes content</div>,
}));

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

const emptyMomentsPage: MomentPageResp = EMPTY_MOMENTS_PAGE;

const baseProps = {
  profile: baseProfile,
  initialMomentsPage: emptyMomentsPage,
  initialLikesCount: 0,
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
    expect(screen.getByRole("tab", { name: "碎语 (0)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "点赞 (0)" })).toBeInTheDocument();
  });

  it("Tab 标签展示点赞总数", () => {
    render(<UserProfileTabs {...baseProps} initialLikesCount={12} />);
    expect(screen.getByRole("tab", { name: "点赞 (12)" })).toBeInTheDocument();
  });

  it("Tab 标签展示碎语总数", () => {
    render(
      <UserProfileTabs {...baseProps} initialMomentsPage={{ ...emptyMomentsPage, total: 24 }} />,
    );
    expect(screen.getByRole("tab", { name: "碎语 (24)" })).toBeInTheDocument();
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
    const momentsTab = screen.getByRole("tab", { name: "碎语 (0)" });
    const likesTab = screen.getByRole("tab", { name: "点赞 (0)" });

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

    const momentsTab = screen.getByRole("tab", { name: "碎语 (0)" });
    await user.click(momentsTab);

    expect(momentsTab).not.toHaveFocus();
    expect(momentsTab).toHaveAttribute("aria-selected", "true");
  });

  it("mousedown 时阻止默认 focus 行为", () => {
    render(<UserProfileTabs {...baseProps} />);

    const momentsTab = screen.getByRole("tab", { name: "碎语 (0)" });
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

  it("碎语 Tab 有内容时渲染列表", async () => {
    const user = userEvent.setup();
    render(
      <UserProfileTabs
        {...baseProps}
        initialMomentsPage={{
          ...emptyMomentsPage,
          total: 3,
          pages: 1,
          list: [
            {
              id: 1,
              user_id: 1,
              content: "hello",
              status: 1,
              comment_status: 1,
              read_count: 0,
              is_top: false,
              like_count: 0,
              comment_count: 0,
              is_liked: false,
              images: [],
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        }}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "碎语 (3)" }));

    expect(screen.getByTestId("profile-moments-tab")).toBeInTheDocument();
  });

  it("打开碎语 Tab 后同步更新 Tab 计数", async () => {
    const user = userEvent.setup();
    render(<UserProfileTabs {...baseProps} />);

    await user.click(screen.getByRole("tab", { name: "碎语 (0)" }));

    expect(screen.getByRole("tab", { name: "碎语 (3)" })).toBeInTheDocument();
  });

  it("点赞 Tab 渲染真实列表组件", async () => {
    const user = userEvent.setup();
    render(<UserProfileTabs {...baseProps} />);

    await user.click(screen.getByRole("tab", { name: "点赞 (0)" }));

    expect(screen.getByTestId("profile-likes-tab")).toBeInTheDocument();
  });
});
