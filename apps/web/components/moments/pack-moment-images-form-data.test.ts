import { describe, it, expect } from "vitest";
import { packMomentImagesFormData } from "./pack-moment-images-form-data";
import type { MomentImageItem } from "./types";

describe("packMomentImagesFormData", () => {
  it("本地文件走 images/file 顺序，远程图片走 image_urls/url 顺序", () => {
    const form = new FormData();
    const images: MomentImageItem[] = [
      {
        id: "r1",
        remoteUrl: "https://example.com/old.png",
        previewUrl: "https://example.com/old.png",
      },
      {
        id: "f1",
        file: new File([new Uint8Array(1)], "new.png", { type: "image/png" }),
        previewUrl: "blob:new",
      },
    ];

    packMomentImagesFormData(form, images);

    expect(form.getAll("image_urls")).toEqual(["https://example.com/old.png"]);
    expect(form.getAll("images").length).toBe(1);
    expect(form.getAll("image_order")).toEqual(["url:0", "file:0"]);
  });

  it("既无 file 也无 remoteUrl 的图片被跳过", () => {
    const form = new FormData();
    packMomentImagesFormData(form, [{ id: "empty", previewUrl: "blob:empty" }]);

    expect(form.getAll("images").length).toBe(0);
    expect(form.getAll("image_urls").length).toBe(0);
    expect(form.getAll("image_order").length).toBe(0);
  });
});
