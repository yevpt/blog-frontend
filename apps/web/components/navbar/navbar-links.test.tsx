import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { NavbarLinks } from "./navbar-links";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@repo/hooks", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("NavbarLinks", () => {
  it("桌面导航按主页、碎语、留言、友邻、圈子的顺序渲染", () => {
    render(<NavbarLinks />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["主页", "碎语", "留言", "友邻", "圈子"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/moments",
      "/guestbook",
      "/friend-links",
      "/circle",
    ]);
  });
});
