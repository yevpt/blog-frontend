import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserProfilePage } from "./_components/user-profile-page";
import type { UserPublicProfileResp } from "@repo/api";
import { EMPTY_MOMENTS_PAGE } from "./_components/profile-moments-tab/constants";

// page.tsx 是 Server Component，直接测试其客户端组件 UserProfilePage
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: null, profile: null }),
}));

const mockProfile: UserPublicProfileResp = {
  id: 42,
  nickname: "MockUser",
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

describe("用户详情页", () => {
  it("显示用户昵称", () => {
    render(<UserProfilePage profile={mockProfile} initialMomentsPage={EMPTY_MOMENTS_PAGE} />);
    expect(screen.getByText("MockUser")).toBeInTheDocument();
  });

  it("访客不显示编辑入口", () => {
    render(<UserProfilePage profile={mockProfile} initialMomentsPage={EMPTY_MOMENTS_PAGE} />);
    expect(screen.queryByText("编辑个人资料")).not.toBeInTheDocument();
  });

  it("显示资料、碎语、点赞 Tab", () => {
    render(<UserProfilePage profile={mockProfile} initialMomentsPage={EMPTY_MOMENTS_PAGE} />);
    expect(screen.getByText("资料")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "碎语 (0)" })).toBeInTheDocument();
    expect(screen.getByText("点赞")).toBeInTheDocument();
  });
});
