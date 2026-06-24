import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfilePage } from "./user-profile-page";
import type { MomentPageResp, UserPublicProfileResp } from "@repo/api";

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1, profile: null }),
}));

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
