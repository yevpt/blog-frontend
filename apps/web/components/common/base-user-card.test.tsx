import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BaseUserCard } from "./base-user-card";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("BaseUserCard", () => {
  const mockUser = {
    id: "user-1",
    nickname: "Test User",
    avatar_url: "/avatar.png",
    last_login_at: new Date().toISOString(),
    roles: ["user"],
  };

  it("renders user information correctly in normal variant", () => {
    render(<BaseUserCard user={mockUser} variant="normal" />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("在线")).toBeInTheDocument();
  });

  it("renders user information correctly in compact variant", () => {
    render(<BaseUserCard user={mockUser} variant="compact" />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("在线")).toBeInTheDocument();
  });

  it("renders roles correctly in normal variant", () => {
    render(<BaseUserCard user={{ ...mockUser, roles: ["admin", "vip"] }} variant="normal" />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("does not render roles in compact variant", () => {
    render(<BaseUserCard user={{ ...mockUser, roles: ["admin", "vip"] }} variant="compact" />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("VIP")).not.toBeInTheDocument();
  });

  it("shows time ago if offline", () => {
    const offlineDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
    render(<BaseUserCard user={{ ...mockUser, last_login_at: offlineDate.toISOString() }} />);
    expect(screen.queryByText("在线")).not.toBeInTheDocument();
    expect(screen.getByText(/来过/)).toBeInTheDocument();
  });
});
