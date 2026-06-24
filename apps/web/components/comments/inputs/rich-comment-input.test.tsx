import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichCommentInput } from "./rich-comment-input";

const useEditorImageUploadMock = vi.fn();

vi.mock("@repo/hooks", () => ({
  useEditorImageUpload: (options: unknown) => useEditorImageUploadMock(options),
}));

vi.mock("@repo/editor", () => ({
  RichEditor: ({
    onInsertImage,
    onInsertLink,
  }: {
    onInsertImage?: (handlers: {
      insert: (url: string, alt?: string) => void;
      insertLoading: (options: { uploadId: string; aspectRatio: number; alt?: string }) => void;
      resolveLoading: (uploadId: string, url: string, alt?: string) => void;
      removeLoading: (uploadId: string) => void;
    }) => void;
    onInsertLink?: (insert: (url: string, title?: string) => void) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onInsertImage?.({
            insert: () => undefined,
            insertLoading: () => undefined,
            resolveLoading: () => undefined,
            removeLoading: () => undefined,
          })
        }
      >
        插入图片
      </button>
      <button type="button" onClick={() => onInsertLink?.(() => undefined)}>
        插入链接
      </button>
    </div>
  ),
  LinkDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="link-dialog" /> : null),
}));

describe("RichCommentInput", () => {
  const inlineUpload = {
    inputRef: { current: null },
    handleInsertImageRequest: vi.fn(),
    handleFileChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useEditorImageUploadMock.mockReturnValue(inlineUpload);
  });

  it("使用 comment 场景的上传 hook", () => {
    render(<RichCommentInput value="" onChange={() => {}} onSubmit={() => {}} isLoggedIn />);

    expect(useEditorImageUploadMock).toHaveBeenCalledWith(
      expect.objectContaining({ scene: "comment" }),
    );
  });

  it("未登录点插入图片时触发 onLoginRequired", async () => {
    const user = userEvent.setup();
    const onLoginRequired = vi.fn();
    render(
      <RichCommentInput
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        isLoggedIn={false}
        onLoginRequired={onLoginRequired}
      />,
    );

    await user.click(screen.getByRole("button", { name: "插入图片" }));
    expect(onLoginRequired).toHaveBeenCalled();
    expect(inlineUpload.handleInsertImageRequest).not.toHaveBeenCalled();
  });

  it("已登录点插入图片时打开文件选择流程", async () => {
    const user = userEvent.setup();
    render(<RichCommentInput value="" onChange={() => {}} onSubmit={() => {}} isLoggedIn />);

    await user.click(screen.getByRole("button", { name: "插入图片" }));
    expect(inlineUpload.handleInsertImageRequest).toHaveBeenCalled();
  });

  it("不再使用 ImageDialog", () => {
    render(<RichCommentInput value="" onChange={() => {}} onSubmit={() => {}} isLoggedIn />);
    expect(screen.queryByTestId("image-dialog")).not.toBeInTheDocument();
  });
});
