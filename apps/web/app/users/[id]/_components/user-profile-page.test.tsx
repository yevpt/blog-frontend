import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfilePage } from "./user-profile-page";
import type { MomentPageResp, UserPublicProfileResp } from "@repo/api";

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1, profile: null }),
}));

// 进入编辑态后账号安全 Tab 会渲染 SecurityTab（带取数副作用），此处替身以隔离测试。
vi.mock("./security-tab/security-tab", () => ({
  SecurityTab: () => <div data-testid="security-tab">security content</div>,
}));

// 可变查询参数：默认无 tab，绑定回跳用例改写为 ?tab=security
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

afterEach(() => {
  mockSearchParams = new URLSearchParams();
});

const baseProfile: UserPublicProfileResp = {
  id: 1,
  nickname: "TestUser",
  avatar_url: null,
  mark: "工程师",
  description: "简介内容",
  last_login_at: null,
  register_at: "2024-01-01",
  roles: [],
  display_email: null,
  site: null,
  social_links: [],
  gender: null,
  birthday: null,
};

const emptyMomentsPage: MomentPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 10,
  list: [],
};

describe("UserProfilePage", () => {
  it("渲染不崩溃", () => {
    render(
      <UserProfilePage
        profile={baseProfile}
        initialMomentsPage={emptyMomentsPage}
        initialLikesCount={0}
      />,
    );
    expect(screen.getByText("TestUser")).toBeInTheDocument();
  });

  it("本人（id 匹配）显示编辑按钮", () => {
    render(
      <UserProfilePage
        profile={baseProfile}
        initialMomentsPage={emptyMomentsPage}
        initialLikesCount={0}
      />,
    );
    expect(screen.getByText("编辑个人资料")).toBeInTheDocument();
  });

  it("点击编辑按钮进入编辑模式", async () => {
    render(
      <UserProfilePage
        profile={baseProfile}
        initialMomentsPage={emptyMomentsPage}
        initialLikesCount={0}
      />,
    );
    await userEvent.click(screen.getByText("编辑个人资料"));
    expect(screen.getByText("退出编辑")).toBeInTheDocument();
  });

  it("绑定回跳 ?tab=security 时本人自动进入编辑态", () => {
    mockSearchParams = new URLSearchParams("tab=security");
    render(
      <UserProfilePage
        profile={baseProfile}
        initialMomentsPage={emptyMomentsPage}
        initialLikesCount={0}
      />,
    );
    expect(screen.getByText("退出编辑")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /账号安全/ })).toHaveAttribute("aria-selected", "true");
  });

  it("退出编辑后回到只读模式", async () => {
    render(
      <UserProfilePage
        profile={baseProfile}
        initialMomentsPage={emptyMomentsPage}
        initialLikesCount={0}
      />,
    );
    await userEvent.click(screen.getByText("编辑个人资料"));
    await userEvent.click(screen.getByText("退出编辑"));
    expect(screen.getByText("编辑个人资料")).toBeInTheDocument();
  });
});
