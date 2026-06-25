import { describe, expect, it } from "vitest";
import {
  countFriendLinksByStatus,
  createEmptyFriendLinkForm,
  createRemoteLogoValue,
  filterAndSortFriendLinkRows,
  hasFriendLinkLogo,
  mapFriendLinkToFormValues,
  mapFriendLinkToRow,
  matchFriendLinkSearch,
  suggestNextSeq,
  toFriendLinkCreateReq,
  toFriendLinkUpdateReq,
  validateFriendLinkForm,
} from "./model";

describe("links model", () => {
  const sample = {
    id: 1,
    name: "VPT",
    description: "个人博客",
    email: "hello@example.com",
    phone: "13800138000",
    site: "https://vpt.im",
    avatar_url: "https://cdn.example.com/avatar/link/a.jpg",
    seq: 0,
    status: 1 as const,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  };

  const logoFile = new File(["logo"], "logo.jpg", { type: "image/jpeg" });
  const localLogo = { file: logoFile, previewUrl: "blob:logo" };

  it("mapFriendLinkToRow 映射展示字段", () => {
    expect(mapFriendLinkToRow(sample)).toEqual(
      expect.objectContaining({
        id: "1",
        name: "VPT",
        site: "https://vpt.im",
        seq: 0,
        status: 1,
      }),
    );
  });

  it("mapFriendLinkToFormValues 回填表单", () => {
    expect(mapFriendLinkToFormValues(sample)).toEqual({
      name: "VPT",
      site: "https://vpt.im",
      seq: "0",
      status: "1",
      description: "个人博客",
      email: "hello@example.com",
      phone: "13800138000",
    });
  });

  it("createRemoteLogoValue 保留远程预览", () => {
    expect(createRemoteLogoValue("https://cdn.example.com/logo.jpg")).toEqual({
      remoteUrl: "https://cdn.example.com/logo.jpg",
      previewUrl: "https://cdn.example.com/logo.jpg",
    });
  });

  it("validateFriendLinkForm 创建必须上传 logo", () => {
    const errors = validateFriendLinkForm(
      { ...createEmptyFriendLinkForm(), name: "VPT", site: "https://vpt.im", seq: "0" },
      null,
      "create",
    );
    expect(errors.logo).toBeTruthy();
  });

  it("validateFriendLinkForm 编辑允许仅保留远程 logo", () => {
    const errors = validateFriendLinkForm(
      { ...createEmptyFriendLinkForm(), name: "VPT", site: "https://vpt.im", seq: "0" },
      createRemoteLogoValue("https://cdn.example.com/logo.jpg"),
      "edit",
    );
    expect(errors.logo).toBeUndefined();
    expect(hasFriendLinkLogo(createRemoteLogoValue("https://cdn.example.com/logo.jpg"))).toBe(true);
  });

  it("toFriendLinkUpdateReq 无新文件时不附带 logo", () => {
    expect(
      toFriendLinkUpdateReq(
        {
          ...createEmptyFriendLinkForm(),
          name: "VPT",
          site: "https://vpt.im",
          seq: "1",
          status: "1",
        },
        createRemoteLogoValue("https://cdn.example.com/logo.jpg"),
      ),
    ).toEqual({
      name: "VPT",
      site: "https://vpt.im",
      seq: 1,
      status: 1,
      description: "",
      email: "",
      phone: "",
    });
  });

  it("toFriendLinkCreateReq 附带 logo 文件", () => {
    expect(
      toFriendLinkCreateReq(
        {
          ...createEmptyFriendLinkForm(),
          name: "VPT",
          site: "https://vpt.im",
          seq: "0",
          status: "1",
        },
        localLogo,
      ),
    ).toEqual({
      name: "VPT",
      site: "https://vpt.im",
      seq: 0,
      status: 1,
      logo: logoFile,
    });
  });

  it("filterAndSortFriendLinkRows 支持状态筛选", () => {
    const rows = [
      mapFriendLinkToRow({ ...sample, id: 1, status: 1 }),
      mapFriendLinkToRow({ ...sample, id: 2, status: 0, name: "Hidden" }),
    ];
    const filtered = filterAndSortFriendLinkRows(rows, {
      searchValue: "",
      filters: { status: "0" },
      sort: { column: "seq", direction: "ascending" },
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe("Hidden");
  });

  it("countFriendLinksByStatus 统计各状态数量", () => {
    const rows = [
      mapFriendLinkToRow({ ...sample, id: 1, status: 1 }),
      mapFriendLinkToRow({ ...sample, id: 2, status: 0 }),
      mapFriendLinkToRow({ ...sample, id: 3, status: 2 }),
    ];
    expect(countFriendLinksByStatus(rows)).toEqual({
      total: 3,
      visible: 1,
      hidden: 1,
      disconnected: 1,
    });
  });

  it("matchFriendLinkSearch 匹配名称与站点", () => {
    const row = mapFriendLinkToRow(sample);
    expect(matchFriendLinkSearch(row, "vpt")).toBe(true);
    expect(matchFriendLinkSearch(row, "missing")).toBe(false);
  });

  it("suggestNextSeq 取最大 seq + 1", () => {
    expect(suggestNextSeq([sample, { ...sample, id: 2, seq: 3 }])).toBe(4);
    expect(suggestNextSeq([])).toBe(0);
  });
});
