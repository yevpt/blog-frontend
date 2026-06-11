import { markdownToHtml } from "./apps/web/lib/markdown";

markdownToHtml("Hello **world**").then(console.log).catch(console.error);
