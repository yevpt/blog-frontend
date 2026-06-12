import { SPRITE_CONTENT } from "./generated/sprite";

export function SvgSprite() {
  return (
    <div
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: SPRITE_CONTENT }}
      suppressHydrationWarning
    />
  );
}
