import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModulePlaceholder } from "./ModulePlaceholder";

describe("ModulePlaceholder", () => {
  it("渲染模块标题、描述与建设中占位区", () => {
    render(
      <ModulePlaceholder title="分类管理" icon="folder" description="维护内容分类与展示顺序。" />,
    );

    expect(screen.getByRole("heading", { name: "分类管理" })).toBeInTheDocument();
    expect(screen.getByText("维护内容分类与展示顺序。")).toBeInTheDocument();
    expect(screen.getByText("功能建设中")).toBeInTheDocument();
    expect(screen.getByText("等待接入真实管理能力")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /新建/ })).toBeInTheDocument();
  });
});
