import { MD_IMAGE_FALLBACK_CLASS } from "./image-fallback";
import { PROSE_BLOCKQUOTE_QUOTELESS_CLASSES } from "./prose-blockquote-classes";

const IMAGE_FALLBACK_VARIANT_CLASSES = [
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:inline-flex`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:items-center`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:justify-center`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:size-12`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:rounded-md`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:border`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:border-dashed`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:border-border/80`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:bg-muted/80`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:text-muted-foreground`,
  `[&_.${MD_IMAGE_FALLBACK_CLASS}]:align-middle`,
].join(" ");

const ARTICLE_PROSE_RHYTHM_CLASSES = [
  "prose-p:leading-[1.85]",
  "prose-h1:mt-[1.25em] prose-h1:mb-[0.65em]",
  "prose-h2:mt-[1.35em] prose-h2:mb-[0.65em]",
  "prose-h3:mt-[1.25em] prose-h3:mb-[0.55em]",
  "[&_.md-code-wrapper]:my-8 [&_.md-code-wrapper:first-child]:mt-0 [&_.md-code-wrapper:last-child]:mb-0",
].join(" ");

export const MARKDOWN_VARIANT_CLASSES: Record<"article" | "comment", string> = {
  article: [
    "prose prose-neutral max-w-none dark:prose-invert",
    ARTICLE_PROSE_RHYTHM_CLASSES,
    PROSE_BLOCKQUOTE_QUOTELESS_CLASSES,
    "[&_.md-image-wrapper--article]:overflow-hidden [&_.md-image-wrapper--article]:rounded-2xl",
    "[&_.md-image-wrapper--article_img]:rounded-2xl",
  ].join(" "),
  comment: [
    "prose prose-sm dark:prose-invert max-w-none",
    PROSE_BLOCKQUOTE_QUOTELESS_CLASSES,
    "prose-p:my-0.5 prose-p:leading-relaxed",
    "prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-0.5",
    "prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
    "prose-blockquote:my-2 prose-code:text-xs",
    "[&_.md-code-wrapper]:my-2.5 [&_.md-code-wrapper:first-child]:mt-0.5 [&_.md-code-wrapper:last-child]:mb-0.5",
    "prose-img:max-w-[240px] prose-img:rounded-md",
    IMAGE_FALLBACK_VARIANT_CLASSES,
    "prose-pre:bg-[var(--md-code-bg)] prose-pre:text-[var(--editor-code-fg)]",
    "prose-pre:border prose-pre:border-[var(--md-code-border)] prose-pre:rounded-lg",
    "prose-code:text-[var(--editor-code-fg)]",
  ].join(" "),
};
