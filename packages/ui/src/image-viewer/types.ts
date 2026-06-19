/** 单张可预览图片。结构保持最小，预留 caption/downloadUrl/srcSet 等未来字段。 */
export interface ImageItem {
  src: string;
  alt?: string;
}

/** 预览器内部的变换状态。 */
export interface ViewerTransform {
  scale: number;
  x: number;
  y: number;
  /** 旋转角度，90° 步进。 */
  rotation: number;
}

/** `ImageViewer` 受控 props。 */
export interface ImageViewerProps {
  images: ImageItem[];
  index: number;
  isOpen: boolean;
  onClose: () => void;
  /** 画廊切换回调；未提供则隐藏左右切换。 */
  onIndexChange?: (index: number) => void;
}
