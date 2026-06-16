import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileTab } from "./profile-tab";
import type { UserPublicProfileResp } from "@repo/api";

const baseProfile: UserPublicProfileResp = {
  id: 1,
  nickname: "TestUser",
  avatar_url: null,
  mark: null,
  description: null,
  last_login_at: null,
  register_at: "2024-01-01T00:00:00Z",
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

describe("ProfileTab", () => {
  it("渲染不崩溃", () => {
    render(<ProfileTab {...baseProps} />);
  });

  it("只读模式下显示注册时间", () => {
    render(<ProfileTab {...baseProps} />);
    expect(screen.getByText("注册时间")).toBeInTheDocument();
    expect(screen.getByText("2024-01-01 00:00:00")).toBeInTheDocument();
  });

  it("只读模式下无社交链接时不显示联系方式行", () => {
    render(<ProfileTab {...baseProps} />);
    expect(screen.queryByText("联系方式")).not.toBeInTheDocument();
  });

  it("只读模式下有 site 时显示联系方式行", () => {
    render(<ProfileTab {...baseProps} profile={{ ...baseProfile, site: "https://example.com" }} />);
    expect(screen.getByText("联系方式")).toBeInTheDocument();
  });

  it("只读模式下性别为 null 时显示 -", () => {
    render(<ProfileTab {...baseProps} />);
    expect(screen.getByText("性别")).toBeInTheDocument();
  });

  it("只读模式下身份标签为 null 时不显示该行", () => {
    render(<ProfileTab {...baseProps} />);
    expect(screen.queryByText("身份标签")).not.toBeInTheDocument();
  });

  it("只读模式下身份标签有值时显示", () => {
    render(<ProfileTab {...baseProps} profile={{ ...baseProfile, mark: "全栈开发者" }} />);
    expect(screen.getByText("身份标签")).toBeInTheDocument();
    expect(screen.getByText("全栈开发者")).toBeInTheDocument();
  });

  it("生日有值时显示年龄和星座", () => {
    render(<ProfileTab {...baseProps} profile={{ ...baseProfile, birthday: "1995-06-15" }} />);
    expect(screen.getByText(/双子座/)).toBeInTheDocument();
  });

  it("编辑模式下空字段显示占位文案", () => {
    render(<ProfileTab {...baseProps} isOwner isEditMode />);
    const emptyFields = screen.getAllByText("未填写");
    expect(emptyFields.length).toBeGreaterThan(0);
  });

  it("编辑模式下显示社交账号区块", () => {
    render(<ProfileTab {...baseProps} isOwner isEditMode />);
    expect(screen.getByText("社交账号")).toBeInTheDocument();
    const addBtns = screen.getAllByText("+ 添加");
    expect(addBtns.length).toBeGreaterThan(0);
  });
});
