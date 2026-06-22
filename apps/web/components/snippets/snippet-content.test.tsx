import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { SnippetContent } from "./snippet-content";

vi.mock("@repo/hooks", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

describe("SnippetContent", () => {
  it("standalone 正文按 Markdown 渲染加粗和列表", () => {
    const { container } = render(
      <SnippetContent
        collapsible={false}
        content={"**333 434**\n\n- 后端: Java->Go (节省点内存，虽然并不缺)"}
      />,
    );

    expect(container.querySelector("strong")?.textContent).toBe("333 434");
    expect(screen.getByText("后端: Java->Go (节省点内存，虽然并不缺)").tagName).toBe("LI");
    expect(container.textContent).not.toContain("**333 434**");
  });

  it("embedded 长正文展开后仍按 Markdown 渲染", async () => {
    const user = userEvent.setup();
    const longContent = `**333 434** ${"长文本".repeat(70)}`;

    const { container } = render(<SnippetContent content={longContent} />);
    await user.click(screen.getByText("snippet.expand"));

    expect(container.querySelector("strong")?.textContent).toBe("333 434");
  });
});
