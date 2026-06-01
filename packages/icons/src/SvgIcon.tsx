import type { IconName } from "./generated/types";

export interface SvgIconProps {
  name: IconName;
  className?: string;
  size?: number;
}

export function SvgIcon({ name, className, size = 24 }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={["pointer-events-none", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <use href={`#icon-${name}`} />
    </svg>
  );
}
