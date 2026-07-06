/**
 * 清洗后端返回的 SVG，供 <img> / data URL 预览。
 * 重复 xmlns 与子节点 xmlns 会导致 Chromium 拒绝渲染。
 */
export function sanitizeSvgForPreview(svgText: string): string {
  const trimmed = svgText.trim();
  if (!trimmed.startsWith("<svg")) {
    return trimmed;
  }

  let svg = trimmed.replace(/<svg([^>]*)>/i, (_match, attrs: string) => {
    let nextAttrs = attrs.replace(/\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/gi, "");
    nextAttrs = ` xmlns="http://www.w3.org/2000/svg"${nextAttrs}`;
    if (/currentColor/i.test(trimmed) && !/\bstyle=/i.test(nextAttrs)) {
      nextAttrs += ' style="color:#334155"';
    }
    return `<svg${nextAttrs}>`;
  });

  svg = svg.replace(
    /<(path|g|circle|rect|ellipse|line|polyline|polygon|defs|clipPath|mask|linearGradient|radialGradient|stop|use)\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/gi,
    "<$1",
  );

  return svg;
}

export function toSvgPreviewDataUrl(svgText: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitizeSvgForPreview(svgText))}`;
}
