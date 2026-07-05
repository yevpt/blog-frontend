import type { MomentImageItem } from "./types";

/**
 * 把碎语图片数组打包进 multipart FormData：
 * 本地新增图片走 images / image_order=file:i；已有远程图片走 image_urls / image_order=url:i。
 * 两类图片按传入顺序交替 append，`image_order` 用于后端还原最终排序。
 */
export function packMomentImagesFormData(form: FormData, images: MomentImageItem[]): void {
  images.forEach((image) => {
    if (image.file) {
      form.append("images", image.file, image.file.name);
      form.append("image_order", `file:${form.getAll("images").length - 1}`);
    } else if (image.remoteUrl) {
      form.append("image_urls", image.remoteUrl);
      form.append("image_order", `url:${form.getAll("image_urls").length - 1}`);
    }
  });
}
