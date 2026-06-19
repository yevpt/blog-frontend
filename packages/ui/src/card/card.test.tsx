import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

describe("Card", () => {
  it("渲染组合结构不崩溃且内容可见", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>标题</CardTitle>
          <CardDescription>描述</CardDescription>
        </CardHeader>
        <CardContent>正文</CardContent>
      </Card>,
    );
    expect(screen.getByText("标题")).toBeTruthy();
    expect(screen.getByText("描述")).toBeTruthy();
    expect(screen.getByText("正文")).toBeTruthy();
  });

  it("className 透传到 root", () => {
    const { container } = render(<Card className="custom-card">x</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("custom-card");
  });

  it("保留默认令牌样式类", () => {
    const { container } = render(<Card>x</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-card");
    expect(el.className).toContain("text-card-foreground");
  });

  it("CardTitle 渲染为 h3", () => {
    render(<CardTitle>标题</CardTitle>);
    expect(screen.getByRole("heading", { level: 3, name: "标题" })).toBeTruthy();
  });
});
