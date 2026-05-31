import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteFooter } from "./site-footer";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => <img src={src} alt={alt} width={width} height={height} />,
}));

describe("SiteFooter", () => {
  it("渲染不崩溃", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("展示版权与备案信息链接", () => {
    render(<SiteFooter />);

    expect(screen.getByText("© 2026 yevpt.com All Rights Reserved.")).toHaveAttribute(
      "href",
      "https://www.yevpt.com",
    );
    expect(screen.getByText("鲁公网安备 37011202000953号").closest("a")).toHaveAttribute(
      "href",
      "http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=37011202000953",
    );
    expect(screen.getByText("京ICP备2023025236")).toHaveAttribute(
      "href",
      "https://beian.miit.gov.cn/",
    );
  });

  it("图床与监控在同一行展示并在新窗口打开", () => {
    render(<SiteFooter />);

    const imageHostLink = screen.getByText("图床");
    const monitorLink = screen.getByText("监控");
    const toolRow = imageHostLink.parentElement;

    expect(toolRow).toBe(monitorLink.parentElement);
    expect(toolRow?.className).toContain("flex");

    expect(imageHostLink).toHaveAttribute("href", "https://tc.yevpt.com");
    expect(imageHostLink).toHaveAttribute("target", "_blank");
    expect(imageHostLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(monitorLink).toHaveAttribute("href", "https://vps.yevpt.com");
    expect(monitorLink).toHaveAttribute("target", "_blank");
    expect(monitorLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("公安备案链接展示备案图标", () => {
    render(<SiteFooter />);

    const beianLink = screen.getByText("鲁公网安备 37011202000953号").closest("a");
    expect(beianLink?.querySelector("img")).toHaveAttribute("src", "/image/beian110.png");
  });
});
