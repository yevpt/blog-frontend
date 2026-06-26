import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserProfilePage } from "./_components/user-profile-page";
import type { UserPublicProfileResp } from "@repo/api";

// page.tsx 是 Server Component，直接测试其客户端组件 UserProfilePage
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: null, profile: null }),
}));

// UserProfileTabs/UserProfilePage 依赖 next/navigation 读取回跳参数，访客无 tab 即默认资料 Tab。
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
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
    render(<UserProfilePage profile={mockProfile} initialMomentsCount={0} initialLikesCount={0} />);
    expect(screen.getByText("MockUser")).toBeInTheDocument();
  });

  it("访客不显示编辑入口", () => {
    render(<UserProfilePage profile={mockProfile} initialMomentsCount={0} initialLikesCount={0} />);
    expect(screen.queryByText("编辑个人资料")).not.toBeInTheDocument();
  });

  it("显示资料、碎语、点赞 Tab", () => {
    render(<UserProfilePage profile={mockProfile} initialMomentsCount={0} initialLikesCount={0} />);
    expect(screen.getByText("资料")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "碎语 (0)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "点赞 (0)" })).toBeInTheDocument();
  });
});
