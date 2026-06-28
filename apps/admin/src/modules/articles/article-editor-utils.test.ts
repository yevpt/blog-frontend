import { describe, expect, it } from "vitest";
import type { AdminArticleDetailResp, MusicItemResp } from "@repo/api";
import {
  buildArticleSaveReq,
  formatMusicDuration,
  mapDetailToFormState,
  mapMusicItemToEditorOption,
  resolveEditorMusicOption,
  resolveMusicArtistLabel,
  statusToLabel,
} from "./article-editor-utils";

describe("article-editor-utils", () => {
  it("formatMusicDuration 格式化为 mm:ss", () => {
    expect(formatMusicDuration(222)).toBe("03:42");
  });

  it("statusToLabel 映射文章状态", () => {
    expect(statusToLabel(0)).toBe("隐藏");
    expect(statusToLabel(1)).toBe("已发布");
    expect(statusToLabel(2)).toBe("加密");
    expect(statusToLabel(3)).toBe("草稿");
  });

  it("mapDetailToFormState 回填详情字段", () => {
    const detail: AdminArticleDetailResp = {
      id: 12,
      title: "标题",
      content: "正文",
      short_content: "摘要",
      cover_img_url: "https://cdn.example.com/cover.jpg",
      user_id: 1,
      status: 1,
      comment_status: 1,
      read_count: 0,
      like_count: 0,
      comment_count: 0,
      is_recommended: false,
      passworded: false,
      category_ids: [3],
      tags: [{ id: 5, name: "React" }],
      music_ids: [7],
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };

    expect(mapDetailToFormState(detail)).toEqual({
      title: "标题",
      description: "摘要",
      content: "正文",
      coverUrl: "https://cdn.example.com/cover.jpg",
      categoryId: 3,
      selectedTags: [{ id: 5, label: "React" }],
      musicId: 7,
      articleStatus: 1,
      commentStatus: 1,
      isRecommended: false,
      isPassworded: false,
      savedArticleId: 12,
    });
  });

  it("resolveMusicArtistLabel 优先 artist_display_name，其次 artists，最后 singer", () => {
    const withDisplay: MusicItemResp = {
      id: 1,
      name: "曲",
      artist_display_name: "Aimer / milet",
      duration: 100,
      seq: 0,
    };
    const withArtists: MusicItemResp = {
      id: 2,
      name: "曲",
      artists: [
        { id: 1, name: "Aimer", display_name: "Aimer" },
        { id: 2, name: "milet", display_name: "milet" },
      ],
      duration: 100,
      seq: 0,
    };
    const legacy: MusicItemResp = {
      id: 3,
      name: "曲",
      singer: "Yevpt",
      duration: 100,
      seq: 0,
    };

    expect(resolveMusicArtistLabel(withDisplay)).toBe("Aimer / milet");
    expect(resolveMusicArtistLabel(withArtists)).toBe("Aimer / milet");
    expect(resolveMusicArtistLabel(legacy)).toBe("Yevpt");
  });

  it("resolveEditorMusicOption 在公开列表缺失时用详情 music 兜底", () => {
    const hiddenTrack: MusicItemResp = {
      id: 99,
      name: "Hidden Song",
      artists: [{ id: 5, name: "Luma", display_name: "Luma" }],
      audio_url: "https://cdn.example.com/hidden.mp3",
      duration: 180,
      is_public: false,
      seq: 0,
    };

    expect(resolveEditorMusicOption(99, [], [hiddenTrack])).toEqual(
      mapMusicItemToEditorOption(hiddenTrack),
    );
    expect(resolveEditorMusicOption(99, [], undefined)).toBeNull();
  });

  it("mapDetailToFormState 回填推荐状态", () => {
    const detail: AdminArticleDetailResp = {
      id: 12,
      title: "标题",
      content: "正文",
      user_id: 1,
      status: 1,
      comment_status: 1,
      read_count: 0,
      like_count: 0,
      comment_count: 0,
      is_recommended: true,
      passworded: false,
      category_ids: [3],
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };

    expect(mapDetailToFormState(detail).isRecommended).toBe(true);
  });

  it("buildArticleSaveReq 构造保存请求", () => {
    expect(
      buildArticleSaveReq({
        title: "标题",
        description: "摘要",
        content: "正文",
        coverUrl: "https://cdn.example.com/cover.jpg",
        categoryId: 1,
        selectedTags: [{ id: 2, label: "Go" }],
        musicId: 9,
        targetStatus: 0,
        commentStatus: 1,
        isRecommended: true,
        articleId: 12,
      }),
    ).toEqual({
      id: 12,
      title: "标题",
      cover_img_url: "https://cdn.example.com/cover.jpg",
      short_content: "摘要",
      content: "正文",
      status: 0,
      comment_status: 1,
      category_ids: [1],
      tags: [{ tag_id: 2, seq: 0 }],
      music_ids: [9],
      recommend: true,
    });
  });
});
