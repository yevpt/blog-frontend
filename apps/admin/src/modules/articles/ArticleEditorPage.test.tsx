import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastRegion } from "@repo/ui";
import { ApiError } from "@repo/api";
import { ArticleEditorPage } from "./ArticleEditorPage";
import { apiClient } from "../../lib/api";
import { toastQueue } from "../../lib/toast";
import { getArticleEditorAutosaveKey } from "./hooks/use-article-editor-autosave";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@repo/editor", () => ({
  readImageAspectRatio: vi.fn().mockResolvedValue(16 / 9),
  RichEditor: ({
    value,
    onChange,
    placeholder,
    onInsertImage,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onInsertImage?: (handlers: {
      insert: (url: string, alt?: string) => void;
      insertLoading: (options: { uploadId: string; aspectRatio: number; alt?: string }) => void;
      resolveLoading: (uploadId: string, url: string, alt?: string) => void;
      removeLoading: (uploadId: string) => void;
    }) => void;
  }) => (
    <div>
      <textarea
        aria-label="文章内容编辑器"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {onInsertImage ? (
        <button
          type="button"
          aria-label="插入图片"
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
      ) : null}
    </div>
  ),
  LinkDialog: () => null,
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    categories: { listTabs: vi.fn() },
    tags: { list: vi.fn() },
    music: { list: vi.fn() },
    articles: { getAdminDetail: vi.fn(), saveAdmin: vi.fn() },
    uploads: { tempImage: vi.fn() },
  },
}));

const mockCategories = {
  list: [{ id: 1, name: "前端", seq: 0, article_count: 2 }],
};
const mockTags = {
  list: [
    { id: 10, name: "React", seq: 0, article_count: 1 },
    { id: 11, name: "后台", seq: 1, article_count: 1 },
    { id: 12, name: "体验设计", seq: 2, article_count: 1 },
    { id: 13, name: "TypeScript", seq: 3, article_count: 1 },
    { id: 14, name: "编辑器", seq: 4, article_count: 1 },
  ],
};
const mockMusic = {
  list: [
    {
      id: 21,
      name: "Midnight Drafts",
      artist_display_name: "Luma",
      artists: [],
      album: { id: 1, name: "A" },
      album_track_no: 1,
      audio_url: "https://cdn.example.com/midnight.mp3",
      duration: 222,
      is_public: true,
      seq: 0,
    },
    {
      id: 22,
      name: "Quiet Rain",
      artist_display_name: "Paperroom",
      artists: [],
      album: { id: 2, name: "B" },
      album_track_no: 1,
      audio_url: "https://cdn.example.com/rain.mp3",
      duration: 258,
      is_public: true,
      seq: 1,
    },
  ],
};

const mockDetail = {
  id: 12,
  title: "已有文章",
  content: "正文内容",
  short_content: "摘要",
  cover_img_url: "https://cdn.example.com/cover.jpg",
  user_id: 1,
  status: 0,
  comment_status: 1,
  read_count: 0,
  like_count: 0,
  comment_count: 0,
  is_recommended: false,
  passworded: false,
  category_ids: [1],
  tags: [{ id: 10, name: "React" }],
  music_ids: [21],
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

function renderEditorPage(route = "/articles/new") {
  window.history.pushState({}, "", route);

  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          path="/articles/new"
          element={
            <>
              <ArticleEditorPage />
              <ToastRegion queue={toastQueue} />
            </>
          }
        />
        <Route
          path="/articles/:articleId/edit"
          element={
            <>
              <ArticleEditorPage />
              <ToastRegion queue={toastQueue} />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ArticleEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    toastQueue.clear();
    vi.mocked(apiClient.categories.listTabs).mockResolvedValue(mockCategories);
    vi.mocked(apiClient.tags.list).mockResolvedValue(mockTags);
    vi.mocked(apiClient.music.list).mockResolvedValue(mockMusic);
    vi.mocked(apiClient.articles.getAdminDetail).mockResolvedValue(mockDetail);
    vi.mocked(apiClient.articles.saveAdmin).mockResolvedValue({
      ...mockDetail,
      id: 99,
      status: 0,
    });
    vi.mocked(apiClient.uploads.tempImage).mockResolvedValue({
      key: "temp/cover.png",
      url: "https://cdn.example.com/temp/cover.png",
    });
  });

  it("新建页加载完成后展示空白表单", async () => {
    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "文章标题" })).toHaveValue("");
    });

    expect(screen.getByText("新建文章")).toBeInTheDocument();
    expect(screen.getByLabelText("文章分类")).toBeInTheDocument();
  });

  it("桌面端主区域可拉伸铺满视口，并在右栏更高时允许页面滚动", async () => {
    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "文章标题" })).toBeInTheDocument();
    });

    const layout = screen.getByTestId("article-editor-layout");
    expect(layout).toHaveClass("xl:min-h-[calc(100dvh-1.5rem)]");
    expect(layout).not.toHaveClass("xl:overflow-visible");

    const main = screen.getByTestId("article-editor-main");
    expect(main).toHaveClass("flex-1");
    expect(main).toHaveClass("xl:items-stretch");
    expect(main).toHaveClass("overflow-hidden");
  });

  it("编辑页加载详情并回填", async () => {
    renderEditorPage("/articles/12/edit");

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "文章标题" })).toHaveValue("已有文章");
    });

    expect(apiClient.articles.getAdminDetail).toHaveBeenCalledWith(12);
    expect(screen.getByText("Midnight Drafts")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "文章描述" })).toHaveValue("摘要");
  });

  it("编辑页仅在本机备份比远端更新时恢复", async () => {
    localStorage.setItem(
      getArticleEditorAutosaveKey(12),
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-06-24T08:10:00.000Z",
        form: {
          title: "本机恢复标题",
          description: "本机摘要",
          content: "本机正文",
          coverUrl: "",
          categoryId: 1,
          selectedTags: [],
          musicId: null,
          commentStatus: 1,
        },
      }),
    );
    vi.mocked(apiClient.articles.getAdminDetail).mockResolvedValue({
      ...mockDetail,
      updated_at: "2026-06-24T08:00:00.000Z",
    });

    renderEditorPage("/articles/12/edit");

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "文章标题" })).toHaveValue("本机恢复标题");
    });
    expect(screen.getByText("已恢复意外关闭前的内容")).toBeInTheDocument();
  });

  it("远端更新时间比本机备份更新时不恢复并清理本机备份", async () => {
    const key = getArticleEditorAutosaveKey(12);
    localStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-06-24T08:00:00.000Z",
        form: {
          title: "较旧本机标题",
          description: "",
          content: "",
          coverUrl: "",
          categoryId: 1,
          selectedTags: [],
          musicId: null,
          commentStatus: 1,
        },
      }),
    );
    vi.mocked(apiClient.articles.getAdminDetail).mockResolvedValue({
      ...mockDetail,
      title: "远端较新标题",
      updated_at: "2026-06-24T08:30:00.000Z",
    });

    renderEditorPage("/articles/12/edit");

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "文章标题" })).toHaveValue("远端较新标题");
    });
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("非法 articleId 显示错误", async () => {
    renderEditorPage("/articles/abc/edit");

    await waitFor(() => {
      expect(screen.getByText(/文章 ID 无效/)).toBeInTheDocument();
    });
  });

  it("存草稿调用 saveAdmin 并跳转编辑页", async () => {
    const user = userEvent.setup();
    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "存草稿" })).toBeEnabled();
    });

    await user.type(screen.getByRole("textbox", { name: "文章标题" }), "新文章");
    await user.type(screen.getByRole("textbox", { name: "文章描述" }), "摘要");
    await user.type(screen.getByRole("textbox", { name: "文章内容编辑器" }), "正文");
    await user.click(screen.getByRole("button", { name: "存草稿" }));

    await waitFor(() => {
      expect(apiClient.articles.saveAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "新文章",
          status: 0,
          category_ids: [1],
          cover_img_url: undefined,
        }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith("/articles/99/edit", { replace: true });
    expect(screen.getByText("草稿已保存")).toBeInTheDocument();
    expect(localStorage.getItem(getArticleEditorAutosaveKey(undefined))).toBeNull();
  });

  it("主动返回文章列表时清理本机备份", async () => {
    const user = userEvent.setup();
    const key = getArticleEditorAutosaveKey(undefined);
    localStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-06-24T08:00:00.000Z",
        form: {
          title: "待放弃标题",
          description: "",
          content: "",
          coverUrl: "",
          categoryId: 1,
          selectedTags: [],
          musicId: null,
          commentStatus: 1,
        },
      }),
    );
    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "返回文章列表" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "返回文章列表" }));

    expect(localStorage.getItem(key)).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/articles");
  });

  it("发布使用 status 1", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.articles.saveAdmin).mockResolvedValue({
      ...mockDetail,
      id: 12,
      status: 1,
    });

    renderEditorPage("/articles/12/edit");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "发布" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "发布" }));

    await waitFor(() => {
      expect(apiClient.articles.saveAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 12,
          status: 1,
        }),
      );
    });
  });

  it("保存失败时展示 ApiError 消息", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.articles.saveAdmin).mockRejectedValue(new ApiError(400, "标题不能为空"));

    renderEditorPage("/articles/12/edit");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "存草稿" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "存草稿" }));

    await waitFor(() => {
      expect(screen.getByText("标题不能为空")).toBeInTheDocument();
    });
  });

  it("封面上传后保存请求不使用 blob URL", async () => {
    const user = userEvent.setup();
    renderEditorPage("/articles/12/edit");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "更换" })).toBeEnabled();
    });

    const file = new File(["cover"], "cover.png", { type: "image/png" });
    const inputs = document.querySelectorAll('input[type="file"][accept="image/*"]');
    const coverInput = inputs[1] as HTMLInputElement;
    await user.upload(coverInput, file);

    await waitFor(() => {
      expect(apiClient.uploads.tempImage).toHaveBeenCalledWith(file, {
        dir: "covers",
        scene: "article",
      });
    });

    await user.click(screen.getByRole("button", { name: "存草稿" }));

    await waitFor(() => {
      expect(apiClient.articles.saveAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          cover_img_url: "https://cdn.example.com/temp/cover.png",
        }),
      );
    });
  });

  it("插入正文图片时调用上传 API", async () => {
    const user = userEvent.setup();
    renderEditorPage("/articles/12/edit");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "插入图片" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "插入图片" }));

    const inputs = document.querySelectorAll('input[type="file"][accept="image/*"]');
    const contentInput = inputs[0] as HTMLInputElement;
    const file = new File(["inline"], "inline.png", { type: "image/png" });
    await user.upload(contentInput, file);

    await waitFor(() => {
      expect(apiClient.uploads.tempImage).toHaveBeenCalledWith(file, {
        dir: "images",
        scene: "article",
      });
    });
  });

  it("加密文章禁用保存并展示说明", async () => {
    vi.mocked(apiClient.articles.getAdminDetail).mockResolvedValue({
      ...mockDetail,
      status: 2,
      passworded: true,
    });

    renderEditorPage("/articles/12/edit");

    await waitFor(() => {
      expect(screen.getByText("加密")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "存草稿" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "发布" })).toBeDisabled();
    expect(screen.getByText(/当前为加密文章/)).toBeInTheDocument();
  });

  it("背景音乐卡片支持移除与替换", async () => {
    const user = userEvent.setup();
    renderEditorPage("/articles/12/edit");

    await waitFor(() => {
      expect(screen.getByText("Midnight Drafts")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "移除背景音乐" }));
    expect(screen.queryByText("Midnight Drafts")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加背景音乐" }));
    await user.type(screen.getByRole("searchbox", { name: "搜索音乐" }), "quiet");
    await user.click(screen.getByRole("button", { name: /Quiet Rain/ }));
    expect(screen.getByText("Quiet Rain")).toBeInTheDocument();
  });

  it("背景音乐卡片支持试听播放", async () => {
    const user = userEvent.setup();
    const playMock = vi.fn().mockResolvedValue(undefined);
    HTMLAudioElement.prototype.play = playMock;

    renderEditorPage("/articles/12/edit");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "播放 Midnight Drafts" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "播放 Midnight Drafts" }));

    expect(playMock).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "暂停 Midnight Drafts" })).toBeInTheDocument();
    expect(screen.getByLabelText("播放进度")).toBeInTheDocument();
  });

  it("通过 Autocomplete 追加标签", async () => {
    const user = userEvent.setup();
    renderEditorPage("/articles/12/edit");

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
    });

    const tagRegion = screen.getByRole("group", { name: "文章标签" });
    await user.click(within(tagRegion).getByRole("button", { name: "增加标签" }));
    await user.type(screen.getByRole("searchbox", { name: "搜索标签" }), "编辑");
    await user.click(screen.getByRole("menuitem", { name: "编辑器" }));

    expect(within(tagRegion).getByText("编辑器")).toBeInTheDocument();
  });
});
