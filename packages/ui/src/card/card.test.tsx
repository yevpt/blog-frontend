import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

describe("Card", () => {
  it("渲染组合结构不崩溃且内容可见", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>标题</CardTitle>
          <CardDescription>描述</CardDescription>
        </CardHeader>
        <CardContent>正文</CardContent>
        <CardFooter>底部</CardFooter>
      </Card>,
    );
    expect(screen.getByText("标题")).toBeTruthy();
    expect(screen.getByText("描述")).toBeTruthy();
    expect(screen.getByText("正文")).toBeTruthy();
    expect(screen.getByText("底部")).toBeTruthy();
  });

  it("className 透传到 root", () => {
    const { container } = render(<Card className="custom-card">x</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("custom-card");
  });

  it("默认使用 rounded-xl + shadow-card", () => {
    const { container } = render(<Card>x</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("rounded-xl");
    expect(el.className).toContain("bg-card");
    expect(el.className).toContain("text-card-foreground");
    expect(el.className).toContain("shadow-card");
    expect(el.className).not.toMatch(/(^|\s)border(\s|$)/);
  });

  it("interactive 开启 hover 浮起", () => {
    const { container } = render(<Card interactive>x</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("hover:shadow-card-hover");
    expect(el.className).toContain("hover:-translate-y-0.5");
  });

  it("默认（非 interactive）不带 hover 浮起", () => {
    const { container } = render(<Card>x</Card>);
    expect((container.firstChild as HTMLElement).className).not.toContain(
      "hover:shadow-card-hover",
    );
  });

  it("CardTitle 渲染为 h3", () => {
    render(<CardTitle>标题</CardTitle>);
    expect(screen.getByRole("heading", { level: 3, name: "标题" })).toBeTruthy();
  });
});
