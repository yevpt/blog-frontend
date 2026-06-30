import type { CdnImagePreset } from "@repo/hooks/cdn-image";

export function resolveDefaultImageOptimizationPreset(
  variant: "card" | "plain",
  explicit?: CdnImagePreset,
): CdnImagePreset {
  if (explicit) return explicit;
  return variant === "plain" ? "article" : "comment";
}
