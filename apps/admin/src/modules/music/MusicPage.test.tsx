import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastRegion } from "@repo/ui";
import { apiClient } from "../../lib/api";
import { toastQueue } from "../../lib/toast";
import { MusicPage } from "./MusicPage";
import { useMusicCatalog } from "./hooks/use-music-catalog";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import type { MusicRow } from "./model";

const mockRows: MusicRow[] = [
  {
    id: "1",
    name: "Ref:rain",
    artistDisplayName: "Aimer",
    artists: [{ id: 2, name: "Aimer", display_name: "Aimer" }],
    album: { id: 3, name: "Sleepless Nights" },
    albumName: "Sleepless Nights",
    albumTrackNo: 1,
    audioUrl: "https://cdn.example.com/ref.mp3",
    coverUrl: "https://cdn.example.com/cover.jpg",
    duration: 270,
    isPublic: true,
    seq: 0,
  },
  {
    id: "2",
    name: "Midnight",
    artistDisplayName: "milet",
    artists: [{ id: 4, name: "milet", display_name: "milet" }],
    album: { id: 5, name: "eyes" },
    albumName: "eyes",
    albumTrackNo: 2,
    audioUrl: "https://cdn.example.com/midnight.mp3",
    coverUrl: "https://cdn.example.com/eyes.jpg",
    duration: 210,
    isPublic: false,
    seq: 1,
  },
];

const mockRefetch = vi.fn();

vi.mock("./hooks/use-music-catalog", () => ({
  useMusicCatalog: vi.fn(),
}));

vi.mock("../tags/hooks/use-is-md-screen", () => ({
  useIsMdScreen: vi.fn(() => true),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    music: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createArtist: vi.fn(),
      updateArtist: vi.fn(),
      deleteArtist: vi.fn(),
      createAlbum: vi.fn(),
      updateAlbum: vi.fn(),
      deleteAlbum: vi.fn(),
      uploadAudio: vi.fn(),
      uploadArtistAvatar: vi.fn(),
      uploadAlbumCover: vi.fn(),
    },
  },
}));

function renderMusicPage() {
  return render(
    <>
      <MusicPage />
      <ToastRegion queue={toastQueue} />
    </>,
  );
}

describe("MusicPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    mockRefetch.mockResolvedValue(undefined);
    vi.mocked(useMusicCatalog).mockReturnValue({
      musicItems: [
        {
          id: 1,
          name: "Ref:rain",
          artist_display_name: "Aimer",
          artists: [{ id: 2, name: "Aimer", display_name: "Aimer" }],
          album: { id: 3, name: "Sleepless Nights" },
          album_track_no: 1,
          audio_url: "https://cdn.example.com/ref.mp3",
          cover_url: "https://cdn.example.com/cover.jpg",
          duration: 270,
          is_public: true,
          seq: 0,
        },
        {
          id: 2,
          name: "Midnight",
          artist_display_name: "milet",
          artists: [{ id: 4, name: "milet", display_name: "milet" }],
          album: { id: 5, name: "eyes" },
          album_track_no: 2,
          audio_url: "https://cdn.example.com/midnight.mp3",
          cover_url: "https://cdn.example.com/eyes.jpg",
          duration: 210,
          is_public: false,
          seq: 1,
        },
      ],
      rows: mockRows,
      artists: [
        { id: 2, name: "Aimer", display_name: "Aimer", description: "Japanese singer" },
        { id: 4, name: "milet", display_name: "milet" },
      ],
      albums: [
        {
          id: 3,
          name: "Sleepless Nights",
          artist: { id: 2, name: "Aimer", display_name: "Aimer" },
        },
        { id: 5, name: "eyes", artist: { id: 4, name: "milet", display_name: "milet" } },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it("渲染歌曲管理列表与摘要", () => {
    renderMusicPage();

    expect(screen.getByRole("heading", { name: "音乐管理" })).toBeInTheDocument();
    expect(screen.getByText("Ref:rain")).toBeInTheDocument();
    expect(screen.getByText("公开 1 · 隐藏 1 · 有音频 2")).toBeInTheDocument();
  });

  it("移动端资料库与分组切换不撑破视口宽度", () => {
    vi.mocked(useIsMdScreen).mockReturnValue(false);

    renderMusicPage();

    expect(screen.getByRole("region", { name: "音乐资料库" })).toHaveClass("min-w-0", "max-w-full");
    expect(screen.getByRole("navigation", { name: "音乐管理分组" })).toHaveClass(
      "min-w-0",
      "max-w-full",
    );
  });

  it("空列表时显示音乐空态", () => {
    vi.mocked(useMusicCatalog).mockReturnValue({
      musicItems: [],
      rows: [],
      artists: [],
      albums: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderMusicPage();

    expect(screen.getByText("还没有音乐")).toBeInTheDocument();
  });

  it("点击新建音乐打开歌曲表单", async () => {
    const user = userEvent.setup();
    renderMusicPage();

    await user.click(screen.getAllByRole("button", { name: /新建音乐/i })[0]!);

    expect(await screen.findByRole("dialog", { name: "新建音乐" })).toBeInTheDocument();
  });

  it("点击歌手标签后可打开歌手表单", async () => {
    const user = userEvent.setup();
    renderMusicPage();

    await user.click(screen.getByRole("button", { name: "歌手" }));
    expect(screen.getByText("Aimer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /新建歌手/i }));

    expect(await screen.findByRole("dialog", { name: "新建歌手" })).toBeInTheDocument();
  });

  it("点击专辑标签后可打开专辑表单", async () => {
    const user = userEvent.setup();
    renderMusicPage();

    await user.click(screen.getByRole("button", { name: "专辑" }));
    expect(screen.getByText("Sleepless Nights")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /新建专辑/i }));

    expect(await screen.findByRole("dialog", { name: "新建专辑" })).toBeInTheDocument();
  });

  it("歌手和专辑管理支持搜索并打开详情", async () => {
    const user = userEvent.setup();
    renderMusicPage();

    await user.click(screen.getByRole("button", { name: "歌手" }));
    await user.type(screen.getByRole("searchbox", { name: "搜索歌手" }), "milet");
    expect(screen.getByText("milet")).toBeInTheDocument();
    expect(screen.queryByText("Aimer")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "查看 milet 详情" }));
    expect(await screen.findByRole("dialog", { name: "歌手详情" })).toHaveTextContent("Midnight");

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "专辑" }));
    await user.type(screen.getByRole("searchbox", { name: "搜索专辑" }), "eyes");
    expect(screen.getByText("eyes")).toBeInTheDocument();
    expect(screen.queryByText("Sleepless Nights")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "查看 eyes 详情" }));
    expect(await screen.findByRole("dialog", { name: "专辑详情" })).toHaveTextContent("Midnight");
  });

  it("歌曲试听使用内联播放器而不是下载链接", () => {
    renderMusicPage();

    expect(screen.getByRole("button", { name: "播放 Ref:rain" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "试听" })).not.toBeInTheDocument();
  });

  it("音乐表单使用搜索式歌手选择并展示音频摘要", async () => {
    const user = userEvent.setup();
    renderMusicPage();

    await user.click(screen.getAllByRole("button", { name: "编辑" })[0]!);
    const dialog = await screen.findByRole("dialog", { name: "编辑音乐" });

    expect(within(dialog).getByRole("combobox", { name: "搜索并添加歌手" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("checkbox", { name: "Aimer" })).not.toBeInTheDocument();
    expect(within(dialog).getByText("当前音频")).toBeInTheDocument();
    expect(within(dialog).getByText("https://cdn.example.com/ref.mp3")).toBeInTheDocument();
  });

  it("结构化歌手和专辑为空时从歌曲列表派生展示", async () => {
    const user = userEvent.setup();
    vi.mocked(useMusicCatalog).mockReturnValue({
      musicItems: [],
      rows: [
        {
          ...mockRows[0]!,
          artistDisplayName: "Supper Moment",
          artists: [],
          album: undefined,
          albumName: "Legacy",
        },
      ],
      artists: [],
      albums: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderMusicPage();

    await user.click(screen.getByRole("button", { name: "歌手" }));
    expect(screen.getByText("Supper Moment")).toBeInTheDocument();
    expect(screen.getByText(/1\s*首歌曲/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "专辑" }));
    expect(screen.getByText("Legacy")).toBeInTheDocument();
  });

  it("删除歌曲时调用接口并刷新", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.music.delete).mockResolvedValue(undefined);
    renderMusicPage();

    await user.click(screen.getAllByRole("button", { name: "删除" })[0]!);
    const dialog = await screen.findByRole("dialog", { name: "删除音乐" });
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    expect(apiClient.music.delete).toHaveBeenCalledWith(1);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("加载失败时显示错误信息", () => {
    vi.mocked(useMusicCatalog).mockReturnValue({
      musicItems: [],
      rows: [],
      artists: [],
      albums: [],
      isLoading: false,
      error: new Error("加载音乐失败"),
      refetch: mockRefetch,
    });

    renderMusicPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载音乐失败");
  });
});
