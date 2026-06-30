const DEFAULT_ASPECT_RATIO = 16 / 9;

/** 从远程 URL 探测宽高比，供编辑器 CDN 加载占位；失败回退 16:9。 */
export async function readRemoteImageAspectRatio(src: string): Promise<number> {
  try {
    const ratio = await loadImageAspectRatio(src);
    return ratio > 0 ? ratio : DEFAULT_ASPECT_RATIO;
  } catch {
    return DEFAULT_ASPECT_RATIO;
  }
}

/** 从本地文件读取宽高比，供上传占位块撑开布局；读失败时回退 16:9。 */
export async function readImageAspectRatio(file: File): Promise<number> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const ratio = await loadImageAspectRatio(objectUrl);
    return ratio > 0 ? ratio : DEFAULT_ASPECT_RATIO;
  } catch {
    return DEFAULT_ASPECT_RATIO;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImageAspectRatio(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const { naturalWidth, naturalHeight } = image;
      if (naturalWidth <= 0 || naturalHeight <= 0) {
        reject(new Error("invalid image dimensions"));
        return;
      }
      resolve(naturalWidth / naturalHeight);
    };
    image.onerror = () => reject(new Error("failed to load image"));
    image.src = src;
  });
}
