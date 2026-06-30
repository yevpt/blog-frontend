"use client";

import { useEffect, useState } from "react";
import {
  computeMomentSingleImageDisplaySize,
  type MomentSingleImageDisplaySize,
} from "@/components/moments/moment-image-display";

/** 远程探测原图尺寸，用于单图骨架与最终 object-contain 展示尺寸对齐。 */
export function useMomentSingleImageDisplaySize(src: string): MomentSingleImageDisplaySize | null {
  const [size, setSize] = useState<MomentSingleImageDisplaySize | null>(null);

  useEffect(() => {
    setSize(null);

    if (!src) {
      return;
    }

    const probe = new window.Image();
    probe.decoding = "async";

    const finalize = (naturalWidth: number, naturalHeight: number) => {
      setSize(computeMomentSingleImageDisplaySize(naturalWidth, naturalHeight));
    };

    probe.onload = () => finalize(probe.naturalWidth, probe.naturalHeight);
    probe.onerror = () => finalize(0, 0);
    probe.src = src;

    return () => {
      probe.onload = null;
      probe.onerror = null;
    };
  }, [src]);

  return size;
}
