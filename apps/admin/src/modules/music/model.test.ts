import { describe, expect, it } from "vitest";
import type { MusicItemResp } from "@repo/api";
import {
  applyAudioUpload,
  countMusicStatus,
  filterAndSortMusicRows,
  formatDuration,
  formatFileSize,
  mapMusicToRow,
  toAlbumSaveReq,
  toArtistSaveReq,
  toMusicSaveReq,
  validateMusicForm,
} from "./model";

const musicItem: MusicItemResp = {
  id: 1,
  name: "Ref:rain",
  artist_display_name: "Aimer",
  artists: [{ id: 2, name: "Aimer", display_name: "Aimer" }],
  album: { id: 3, name: "Sleepless Nights" },
  album_track_no: 4,
  audio_url: "https://cdn.example.com/ref.mp3",
  cover_url: "https://cdn.example.com/cover.jpg",
  duration: 270,
  is_public: true,
  seq: 1,
};

describe("music model", () => {
  it("映射音乐列表行并格式化展示字段", () => {
    const row = mapMusicToRow(musicItem);

    expect(row.artistDisplayName).toBe("Aimer");
    expect(row.album?.name).toBe("Sleepless Nights");
    expect(row.albumName).toBe("Sleepless Nights");
    expect(formatDuration(270)).toBe("4:30");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("兼容旧版公开音乐字段", () => {
    const row = mapMusicToRow({
      id: 7,
      name: "Protect You",
      singer: "Supper Moment",
      album: "Legacy",
      url: "https://cdn.example.com/protect.mp3",
      cover_img_url: "https://cdn.example.com/protect.jpg",
      duration: 100,
      seq: 0,
    });

    expect(row).toMatchObject({
      artistDisplayName: "Supper Moment",
      albumName: "Legacy",
      audioUrl: "https://cdn.example.com/protect.mp3",
      coverUrl: "https://cdn.example.com/protect.jpg",
      isPublic: true,
      albumTrackNo: 0,
    });
  });

  it("校验音乐表单并转换保存请求", () => {
    expect(
      validateMusicForm({
        name: "",
        artistIds: [],
        artistDisplayName: "",
        albumId: "",
        albumTrackNo: "x",
        audioKey: "",
        audioSize: "0",
        audioMime: "",
        audioHash: "",
        lyric: "",
        duration: "-1",
        isPublic: true,
        seq: "0",
      }),
    ).toMatchObject({
      name: "请输入曲名",
      artistIds: "请选择至少一位歌手",
      audioKey: "请上传或填写音频 key",
    });

    expect(
      toMusicSaveReq({
        name: " Ref:rain ",
        artistIds: ["2"],
        artistDisplayName: "",
        albumId: "3",
        albumTrackNo: "4",
        audioKey: "temp/music/1/audio/a.mp3",
        audioSize: "1024",
        audioMime: "audio/mpeg",
        audioHash: "hash",
        lyric: "",
        duration: "270",
        isPublic: false,
        seq: "1",
      }),
    ).toMatchObject({
      name: "Ref:rain",
      artist_ids: [2],
      album_id: 3,
      audio_key: "temp/music/1/audio/a.mp3",
      is_public: false,
    });
  });

  it("转换歌手与专辑保存请求", () => {
    expect(
      toArtistSaveReq({ name: " Aimer ", nameZh: "", avatarKey: "k", description: "" }),
    ).toEqual({
      name: "Aimer",
      avatar_key: "k",
    });
    expect(
      toAlbumSaveReq({
        name: " Album ",
        artistId: "2",
        coverKey: "",
        releaseDate: "2024-01-01",
        description: "",
      }),
    ).toEqual({ name: "Album", artist_id: 2, release_date: "2024-01-01" });
  });

  it("套用上传结果、筛选排序并统计状态", () => {
    const nextValues = applyAudioUpload(
      {
        name: "Song",
        artistIds: ["2"],
        artistDisplayName: "",
        albumId: "",
        albumTrackNo: "0",
        audioKey: "",
        audioSize: "0",
        audioMime: "",
        audioHash: "",
        lyric: "",
        duration: "0",
        isPublic: true,
        seq: "0",
      },
      { key: "temp/key.mp3", url: "https://cdn/key.mp3", size: 10, mime: "audio/mpeg", hash: "h" },
    );
    expect(nextValues.audioKey).toBe("temp/key.mp3");

    const rows = [
      mapMusicToRow(musicItem),
      mapMusicToRow({ ...musicItem, id: 2, name: "Hidden", is_public: false, seq: 0 }),
    ];
    expect(
      filterAndSortMusicRows(rows, {
        searchValue: "",
        filters: { visibility: "hidden" },
        sort: { column: "seq", direction: "ascending" },
      }).map((row) => row.name),
    ).toEqual(["Hidden"]);
    expect(countMusicStatus(rows)).toMatchObject({ total: 2, publicCount: 1, hiddenCount: 1 });
  });
});
