import { cn } from "@repo/ui";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-[26px] w-[26px]", className)}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g transform="translate(256, 256) rotate(-45)">
        <path
          className="fill-primary"
          d="M 20 -180 A 180 180 0 0 1 20 180 C -120 180 160 -180 20 -180 Z"
        />
        <path
          className="fill-foreground"
          d="M -20 180 A 180 180 0 0 1 -20 -180 C 120 -180 -160 180 -20 180 Z"
        />
      </g>
    </svg>
  );
}
