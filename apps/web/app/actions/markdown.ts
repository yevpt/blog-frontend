"use server";

import { markdownToHtml } from "@repo/markdown/server";

export async function renderMarkdown(content: string): Promise<string> {
  return await markdownToHtml(content);
}
