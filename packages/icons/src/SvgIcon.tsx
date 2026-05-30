import type { IconName } from "./generated/types";

export interface SvgIconProps {
  name: IconName;
  className?: string;
  size?: number;
}

export function SvgIcon({ name, className, size = 24 }: SvgIconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true">
      <use href={`#icon-${name}`} />
    </svg>
  );
}
