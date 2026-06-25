import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TagNameCell } from "./TagNameCell";
import type { TagRow } from "../model";

const tag: TagRow = {
  id: "1",
  name: "Go",
  seq: 0,
  articleCount: 3,
};

describe("TagNameCell", () => {
  it("渲染标签名称 chip", () => {
    render(<TagNameCell tag={tag} />);
    expect(screen.getByText("Go")).toBeInTheDocument();
  });

  it("有图标时渲染预览图", () => {
    const { container } = render(
      <TagNameCell tag={{ ...tag, icon: "https://cdn.example.com/go.svg" }} />,
    );
    expect(container.querySelector("img")).toBeTruthy();
  });
});
