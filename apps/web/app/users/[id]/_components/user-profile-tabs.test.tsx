import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
