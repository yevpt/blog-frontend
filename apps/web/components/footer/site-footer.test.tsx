import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteFooter } from "./site-footer";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("./site-uptime", () => ({
  SiteUptime: () => <p>已运行 0 天 0 小时 0 分钟</p>,
}));

describe("SiteFooter", () => {
  it("渲染不崩溃", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("展示版权、Powered by 与备案信息", () => {
    render(<SiteFooter />);

    const nav = screen.getByRole("navigation", { name: "站点信息" });
    expect(nav.className).toContain("flex-row");

    expect(screen.getByText("© 2026 yevpt.com")).toHaveAttribute("href", "https://www.yevpt.com");
    expect(screen.getByText("鲁公网安备 37011202000953号").closest("a")).toHaveAttribute(
      "href",
      "http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=37011202000953",
    );
    expect(screen.getByText("京ICP备2023025236")).toHaveAttribute(
      "href",
      "https://beian.miit.gov.cn/",
    );
    expect(screen.getByText("Next")).toHaveAttribute("href", "https://nextjs.org");
    expect(screen.getByText("Gin")).toHaveAttribute("href", "https://gin-gonic.com");
  });

  it("Powered by 排在公安备案之前", () => {
    render(<SiteFooter />);

    const nav = screen.getByRole("navigation", { name: "站点信息" });
    const text = nav.textContent ?? "";

    expect(text.indexOf("Powered by")).toBeLessThan(text.indexOf("鲁公网安备"));
  });

  it("公安备案使用盾牌图标", () => {
    render(<SiteFooter />);

    const beianLink = screen.getByText("鲁公网安备 37011202000953号").closest("a");
    expect(beianLink?.querySelector('[data-testid="icon-shield"]')).toBeTruthy();
  });

  it("提供 RSS 入口，指向站内 /feed.xml 且在新窗口打开", () => {
    render(<SiteFooter />);

    const rssLink = screen.getByText("RSS").closest("a");
    expect(rssLink).toHaveAttribute("href", "/feed.xml");
    expect(rssLink).toHaveAttribute("target", "_blank");
    expect(rssLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(rssLink?.querySelector('[data-testid="icon-rss"]')).toBeTruthy();
  });

  it("RSS 与版权同组内联，排在备案信息之前", () => {
    render(<SiteFooter />);

    const nav = screen.getByRole("navigation", { name: "站点信息" });
    const text = nav.textContent ?? "";

    expect(text.indexOf("yevpt.com")).toBeLessThan(text.indexOf("RSS"));
    expect(text.indexOf("RSS")).toBeLessThan(text.indexOf("鲁公网安备"));
  });

  it("外链在新窗口打开", () => {
    render(<SiteFooter />);

    for (const label of ["鲁公网安备 37011202000953号", "Next", "Gin"]) {
      const link = screen.getByText(label);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
