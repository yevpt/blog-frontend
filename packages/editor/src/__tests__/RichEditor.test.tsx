import { describe, it, expect, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichEditor } from "../RichEditor";

describe("RichEditor", () => {
  it("渲染不崩溃，EditorContent 挂载成功", () => {
    const { container } = render(<RichEditor value="" onChange={() => {}} />);
    // Tiptap EditorContent 会渲染一个 contenteditable div
    expect(container.querySelector("[contenteditable]")).toBeTruthy();
  });

  it("Markdown 初始值被正确解析为段落", async () => {
    const value = "第一段\n\n第二段\n\n第三段";
    const { container } = render(<RichEditor value={value} onChange={() => {}} />);
    await waitFor(() => {
      expect(container.querySelectorAll(".tiptap > p").length).toBe(3);
    });
  });

  it("传入 placeholder 时在空段落上有对应 data-placeholder 属性和空态 class", () => {
    const { container } = render(
      <RichEditor value="" onChange={() => {}} placeholder="写下你的评论..." />,
    );
    const placeholderNode = container.querySelector(".tiptap [data-placeholder]");
    expect(placeholderNode?.getAttribute("data-placeholder")).toBe("写下你的评论...");
    expect(placeholderNode).toHaveClass("is-editor-empty");
  });

  it("disabled=true 时 contenteditable 为 false", () => {
    const { container } = render(<RichEditor value="" onChange={() => {}} disabled />);
    const ce = container.querySelector("[contenteditable]");
    expect(ce?.getAttribute("contenteditable")).toBe("false");
  });

  it("onSubmit 存在时渲染发送按钮", () => {
    render(<RichEditor value="" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "发送评论" })).toBeInTheDocument();
  });

  it("使用语义色令牌的圆角面板，且不会在聚焦时改变边框颜色", () => {
    const { container } = render(<RichEditor value="" onChange={() => {}} onSubmit={() => {}} />);
    const root = container.firstElementChild;
    const editorArea = root?.querySelector("[data-rich-editor-area]");

    expect(root).toHaveClass("rounded-xl", "border", "bg-card");
    expect(root?.className).not.toContain("focus-within:border-primary");
    expect(editorArea).toHaveClass("min-h-[88px]");
    expect(editorArea?.className).toContain("[&_.tiptap]:min-h-[88px]");
    expect(editorArea?.className).toContain("[&_.tiptap]:w-full");
    expect(editorArea?.className).toContain("[&_.tiptap]:!max-w-none");
    expect(editorArea?.className).toContain("[&_.tiptap]:dark:prose-invert");
  });

  it("plain + toolbarPlacement=top 时工具栏在上且无卡片边框", async () => {
    const { container } = render(
      <RichEditor
        value=""
        onChange={() => {}}
        variant="plain"
        toolbarPlacement="top"
        toolbarTrailing={<span>Markdown</span>}
        onInsertImage={() => {}}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector("[data-rich-editor-toolbar]")).toBeTruthy();
    });

    const root = container.firstElementChild;
    expect(root).not.toHaveClass("border");
    expect(root).not.toHaveClass("rounded-xl");
    expect(screen.getByText("Markdown")).toBeInTheDocument();
  });

  it("plain + toolbarPlacement=top 时工具栏左内边距略小于正文，抵消按钮视觉右移", async () => {
    const { container } = render(
      <RichEditor
        value=""
        onChange={() => {}}
        variant="plain"
        toolbarPlacement="top"
        onInsertImage={() => {}}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector("[data-rich-editor-toolbar]")).toBeTruthy();
    });

    const toolbar = container.querySelector("[data-rich-editor-toolbar]");
    const contentInset = container.querySelector("[data-rich-editor-area] > div");

    expect(toolbar?.className).toContain("pl-3");
    expect(toolbar?.className).toContain("sm:pl-8");
    expect(contentInset?.className).toContain("px-5");
    expect(contentInset?.className).toContain("sm:px-10");
  });

  it("card 变体正文图片使用评论同款 240px 限宽", async () => {
    const { container } = render(<RichEditor value="" onChange={() => {}} />);
    await waitFor(() => {
      expect(container.querySelector("[data-rich-editor-area]")).toBeTruthy();
    });
    const editorArea = container.querySelector("[data-rich-editor-area]");
    expect(editorArea?.className).toContain("[&_.tiptap_img]:max-w-[240px]");
  });

  it("plain 变体正文图片不限宽，与文章详情 prose 一致", async () => {
    const { container } = render(
      <RichEditor value="" onChange={() => {}} variant="plain" toolbarPlacement="top" />,
    );
    await waitFor(() => {
      expect(container.querySelector("[data-rich-editor-area]")).toBeTruthy();
    });
    const editorArea = container.querySelector("[data-rich-editor-area]");
    expect(editorArea?.className).not.toContain("[&_.tiptap_img]:max-w-[240px]");
  });

  it("plain 变体使用文章详情同款正文排版节奏", async () => {
    const { container } = render(
      <RichEditor value="" onChange={() => {}} variant="plain" toolbarPlacement="top" />,
    );

    await waitFor(() => {
      expect(container.querySelector("[data-rich-editor-area]")).toBeTruthy();
    });

    const editorArea = container.querySelector("[data-rich-editor-area]");
    const className = editorArea?.className ?? "";
    expect(className).toContain("[&_.tiptap_p]:leading-[1.85]");
    expect(className).toContain("[&_.tiptap_h1]:mt-[1.25em]");
    expect(className).toContain("[&_.rich-editor-code-wrapper]:!my-8");
    expect(className).not.toContain("[&_.tiptap_p]:my-[0.2em]");
    expect(className).not.toContain("[&_.tiptap_h2]:font-serif");
  });

  it("Markdown 标题被解析为 h2 节点", async () => {
    const { container } = render(<RichEditor value="## 二级标题\n\n正文" onChange={() => {}} />);
    await waitFor(() => {
      expect(container.querySelector(".tiptap h2")).toHaveTextContent("二级标题");
    });
  });

  it("外部 value 异步更新后同步到编辑器", async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<RichEditor value="" onChange={onChange} />);

    await waitFor(() => {
      expect(container.querySelector("[contenteditable]")).toBeTruthy();
    });

    rerender(<RichEditor value="## 已有标题\n\n已有正文" onChange={onChange} />);

    await waitFor(() => {
      expect(container.querySelector(".tiptap h2")).toHaveTextContent("已有标题");
      expect(container.querySelector(".tiptap")).toHaveTextContent("已有正文");
    });
  });

  it("showToolbarCharacterCount=false 时不渲染工具栏字数胶囊", () => {
    render(
      <RichEditor
        value="hello"
        onChange={() => {}}
        maxLength={20}
        showToolbarCharacterCount={false}
      />,
    );
    expect(screen.queryByText("5/20")).not.toBeInTheDocument();
  });

  it("提交按钮：内容为空时呈禁用态（bg-primary/50）", () => {
    render(<RichEditor value="" onChange={() => {}} onSubmit={() => {}} />);

    const submitButton = screen.getByRole("button", { name: "发送评论" });
    expect(submitButton).toHaveClass("h-8", "rounded-full");
    expect(submitButton).toHaveTextContent("提交");
    // 空内容时应禁用
    expect(submitButton).toBeDisabled();
    expect(submitButton.className).toContain("bg-primary/50");
  });

  it("传入 maxLength 时在工具栏内渲染字数胶囊", () => {
    render(<RichEditor value="hello" onChange={() => {}} onSubmit={() => {}} maxLength={20} />);

    const counter = screen.getByText("5/20");
    expect(counter).toBeInTheDocument();
    expect(counter).toHaveClass("rounded-full", "text-muted-foreground");
  });

  it("字数超出 maxLength 时计数胶囊使用 destructive 样式", () => {
    render(<RichEditor value="hello!" onChange={() => {}} onSubmit={() => {}} maxLength={5} />);

    const counter = screen.getByText("6/5");
    expect(counter).toHaveClass("text-destructive");
  });

  it("传入 characterCountThreshold 时未接近上限不渲染字数胶囊", () => {
    render(
      <RichEditor
        value="hello"
        onChange={() => {}}
        onSubmit={() => {}}
        maxLength={2000}
        characterCountThreshold={100}
      />,
    );

    expect(screen.queryByText("5/2000")).toBeNull();
  });

  it("达到 maxLength 后阻止继续输入", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <RichEditor value="hello" onChange={onChange} onSubmit={() => {}} maxLength={5} />,
    );
    const editor = screen.getByRole("textbox");

    await user.click(editor);
    await user.type(editor, "!");

    expect(container.querySelector(".tiptap")).toHaveTextContent("hello");
    expect(onChange).not.toHaveBeenCalledWith("hello!");
  });

  it("达到 maxLength 后仍允许删除内容", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <RichEditor value="hello" onChange={onChange} onSubmit={() => {}} maxLength={5} />,
    );
    const editor = screen.getByRole("textbox");

    await user.click(editor);
    await user.keyboard("{Backspace}");

    expect(container.querySelector(".tiptap")).toHaveTextContent("hell");
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith("hell");
    });
  });

  it("按提交的 Markdown 长度限制输入，而不是按纯文本长度", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <RichEditor value={"a\n\nb"} onChange={onChange} onSubmit={() => {}} maxLength={4} />,
    );
    const editor = screen.getByRole("textbox");

    await user.click(editor);
    await user.type(editor, "!");

    expect(container.querySelector(".tiptap")).toHaveTextContent("ab");
    expect(onChange).not.toHaveBeenCalledWith(expect.stringMatching(/!/));
  });

  it("粘贴内容超出 maxLength 时插入可容纳部分", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <RichEditor value="" onChange={onChange} onSubmit={() => {}} maxLength={3} />,
    );
    const editor = screen.getByRole("textbox");

    await user.click(editor);
    await user.paste("hello");

    expect(container.querySelector(".tiptap")).toHaveTextContent("hel");
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith("hel");
    });
  });

  it("超长多行粘贴后删除，提交 Markdown 长度仍不超过 maxLength", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichEditor value="" onChange={onChange} onSubmit={() => {}} maxLength={20} />);
    const editor = screen.getByRole("textbox");

    await user.click(editor);
    await user.paste(Array.from({ length: 20 }, (_, index) => `line-${index}`).join("\n"));
    await user.keyboard("{Backspace}");

    const latestValue = onChange.mock.lastCall?.[0] as string;
    expect(latestValue.length).toBeLessThanOrEqual(20);
  });

  it("未登录时提交区域渲染「请先登录」按钮", () => {
    const onLoginRequired = vi.fn();
    render(
      <RichEditor
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        isLoggedIn={false}
        onLoginRequired={onLoginRequired}
      />,
    );

    expect(screen.queryByRole("button", { name: "发送评论" })).toBeNull();
    expect(screen.getByRole("button", { name: "请先登录后评论" })).toBeInTheDocument();
  });

  it("onInsertImage 未提供时不渲染图片按钮", () => {
    render(<RichEditor value="" onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "插入图片" })).toBeNull();
  });

  it("onInsertImage 提供时渲染图片按钮并注入 handlers", async () => {
    const handler = vi.fn();
    const user = userEvent.setup();
    render(<RichEditor value="" onChange={() => {}} onInsertImage={handler} />);
    const btn = screen.getByRole("button", { name: "插入图片" });
    await user.click(btn);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        insert: expect.any(Function),
        insertLoading: expect.any(Function),
        resolveLoading: expect.any(Function),
        removeLoading: expect.any(Function),
      }),
    );
  });

  it("插入带标题链接时在编辑器内渲染为链接并输出 Markdown 链接", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    let insertLink: ((url: string, title?: string) => void) | undefined;

    const { container } = render(
      <RichEditor
        value=""
        onChange={onChange}
        onInsertLink={(insert) => {
          insertLink = insert;
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "插入链接" }));
    expect(insertLink).toBeTypeOf("function");

    await act(async () => {
      insertLink?.("http://localhost:3000/guestbook", "test");
    });

    const link = container.querySelector(".tiptap a");
    expect(link).toHaveTextContent("test");
    expect(link).toHaveAttribute("href", "http://localhost:3000/guestbook");
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith("[test](http://localhost:3000/guestbook)");
    });
  });

  it("enableBlockquote 时渲染引用按钮", async () => {
    render(
      <RichEditor
        value=""
        onChange={() => {}}
        variant="plain"
        toolbarPlacement="top"
        enableBlockquote
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "引用" })).toBeInTheDocument();
    });
  });

  it("默认不渲染引用按钮", async () => {
    render(<RichEditor value="" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "引用" })).not.toBeInTheDocument();
    });
  });

  it("enableBlockquote 时禁用 blockquote 自动弯引号样式", async () => {
    const { container } = render(
      <RichEditor value="" onChange={() => {}} variant="plain" enableBlockquote />,
    );
    await waitFor(() => {
      const editorArea = container.querySelector("[data-rich-editor-area]");
      expect(editorArea?.className).toContain("[&_.tiptap_blockquote]:quotes-none");
    });
  });

  it("enableBlockquote 时正确加载并序列化 Markdown 引用", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <RichEditor
        value={"> 引用内容\n\n正文"}
        onChange={onChange}
        variant="plain"
        enableBlockquote
      />,
    );

    await waitFor(() => {
      expect(container.querySelector(".tiptap blockquote")).toBeTruthy();
    });

    const user = userEvent.setup();
    const editor = container.querySelector(".tiptap") as HTMLElement;
    await act(async () => {
      await user.click(editor);
      await user.keyboard(" ");
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls.at(-1)?.[0]).toContain("> 引用内容");
    });
  });

  it("外部 value 回填（CRLF + 段间空行）时保留空段落", async () => {
    const apiContent =
      "（为了赚回我的订阅费，只能化身无情监工去消耗Token😂）。\r\n\r\n\r\n\r\n之前都是爬的景区，香山、八大处、凤凰岭之流。";
    const { container, rerender } = render(<RichEditor value="" onChange={() => {}} />);

    rerender(<RichEditor value={apiContent} onChange={() => {}} />);

    await waitFor(() => {
      expect(container.querySelectorAll(".tiptap > p").length).toBeGreaterThanOrEqual(3);
    });
  });
});
