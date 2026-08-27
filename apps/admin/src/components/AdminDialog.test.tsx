import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogFrame,
  AdminDialogHeader,
} from "./AdminDialog";

describe("AdminDialog", () => {
  it("统一渲染有说明层的页头、可滚动正文与分隔底栏", () => {
    render(
      <AdminDialogFrame data-testid="frame">
        <AdminDialogHeader
          title="文本试跑"
          eyebrow="规则校验"
          description="预览命中结果"
          action={<button type="button">关闭</button>}
        />
        <AdminDialogBody data-testid="body">正文</AdminDialogBody>
        <AdminDialogFooter data-testid="footer">操作</AdminDialogFooter>
      </AdminDialogFrame>,
    );

    expect(screen.getByTestId("frame")).toHaveClass("flex-col", "overflow-hidden");
    expect(screen.getByRole("heading", { name: "文本试跑" })).toHaveClass(
      "tracking-tight",
      "text-lg",
    );
    expect(screen.getByText("预览命中结果")).toHaveClass("text-xs", "leading-5");
    expect(screen.getByTestId("body")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("footer")).toHaveClass("border-t", "bg-muted/15");
  });

  it("正文允许关闭内边距与滚动行为", () => {
    render(
      <AdminDialogBody inset={false} scrollable={false} data-testid="body">
        正文
      </AdminDialogBody>,
    );

    expect(screen.getByTestId("body")).not.toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("body").firstElementChild).toBeNull();
  });
});
