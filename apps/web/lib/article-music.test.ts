import { describe, expect, it } from "vitest";
import type { MusicItemResp } from "@repo/api";
import { mapArticleMusicToSyncInput, pickPrimaryArticleMusic } from "./article-music";

const sampleMusic: MusicItemResp = {
  id: 2,
  name: "春夏秋冬",
  artist_display_name: "GILLE",
  artists: [{ id: 2, name: "GILLE", display_name: "GILLE" }],
  album: {
    id: 2,
    name: "The Best of “I AM GILLE.”~Amazing J-POP Covers~",
    artist: { id: 2, name: "GILLE", display_name: "GILLE" },
    cover_url:
      "https://blog-dev-oss.yevpt.com/blog/music/albums/2/cover/e2d6ea28fdc0f2bb5f43ac6491a75904.jpg",
    release_date: "2015-06-10",
  },
  album_track_no: 0,
  audio_url:
    "https://blog-dev-oss.yevpt.com/blog/music/audio/2/eb898fad9328ebf457b97dd8337f68ca.m4a?a=4f525b28",
  cover_url:
    "https://blog-dev-oss.yevpt.com/blog/music/albums/2/cover/e2d6ea28fdc0f2bb5f43ac6491a75904.jpg",
  duration: 307,
  is_public: true,
  seq: 0,
};

describe("pickPrimaryArticleMusic", () => {
  it("按 seq 取最小曲目", () => {
    const later: MusicItemResp = { ...sampleMusic, id: 3, seq: 2 };
    const earlier: MusicItemResp = { ...sampleMusic, id: 4, seq: 1, name: "另一首" };

    expect(pickPrimaryArticleMusic([later, earlier])?.name).toBe("另一首");
  });
});

describe("mapArticleMusicToSyncInput", () => {
  it("映射新版文章详情 music 字段", () => {
    expect(mapArticleMusicToSyncInput([sampleMusic])).toEqual({
      musicUrl: sampleMusic.audio_url,
      musicName: "春夏秋冬",
      musicArtist: "GILLE",
      musicCoverUrl: sampleMusic.cover_url,
      musicDurationSeconds: 307,
    });
  });

  it("兼容旧版 url / singer / cover_img_url 字段", () => {
    const legacy: MusicItemResp = {
      id: 1,
      name: "雨夜",
      singer: "Yevpt",
      album: "夜读",
      url: "https://example.com/a.mp3",
      cover_img_url: "https://example.com/cover.jpg",
      duration: 200,
      seq: 0,
    };

    expect(mapArticleMusicToSyncInput([legacy])).toEqual({
      musicUrl: "https://example.com/a.mp3",
      musicName: "雨夜",
      musicArtist: "Yevpt",
      musicCoverUrl: "https://example.com/cover.jpg",
      musicDurationSeconds: 200,
    });
  });

  it("无配乐时返回 undefined", () => {
    expect(mapArticleMusicToSyncInput()).toBeUndefined();
    expect(mapArticleMusicToSyncInput([])).toBeUndefined();
  });
});
