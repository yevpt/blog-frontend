import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { resolve, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgDir = resolve(__dirname, "../svg");
const generatedDir = resolve(__dirname, "../src/generated");
const omittedSvgAttributes = new Set([
  "xmlns",
  "viewBox",
  "width",
  "height",
  "id",
  "class",
  "style",
  "role",
  "aria-hidden",
  "focusable",
]);

function getSvgAttributes(content) {
  const svgAttributes = content.match(/<svg\b([^>]*)>/i)?.[1] ?? "";

  return [...svgAttributes.matchAll(/\s+([\w:-]+)="([^"]*)"/g)]
    .filter(([, key]) => !omittedSvgAttributes.has(key))
    .map(([, key, value]) => `${key}="${value}"`)
    .join(" ");
}

mkdirSync(generatedDir, { recursive: true });

const files = readdirSync(svgDir)
  .filter((f) => f.endsWith(".svg"))
  .sort();

let symbols = "";
const names = [];

for (const file of files) {
  const name = basename(file, ".svg");
  names.push(name);

  const content = readFileSync(resolve(svgDir, file), "utf-8");

  const viewBox = content.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24";
  const svgAttributes = getSvgAttributes(content);
  const symbolAttributes = svgAttributes ? ` ${svgAttributes}` : "";

  // 剥离 XML 声明、DOCTYPE 声明、空 style 标签（含 <defs> 包裹）和外层 <svg> 标签
  const inner = content
    .replace(/<\?xml[^?]*\?>/g, "")
    .replace(/<!DOCTYPE[^>]*>/g, "")
    .replace(/<defs><style[^>]*><\/style><\/defs>/g, "")
    .replace(/<svg[^>]*>/g, "")
    .replace(/<\/svg>/g, "")
    .trim();

  symbols += `  <symbol id="icon-${name}" viewBox="${viewBox}"${symbolAttributes}>\n    ${inner}\n  </symbol>\n`;
}

const spriteContent = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols}</svg>`;

writeFileSync(
  resolve(generatedDir, "sprite.ts"),
  `// 此文件由 scripts/build.mjs 自动生成，请勿手动修改\nexport const SPRITE_CONTENT = ${JSON.stringify(spriteContent)};\n`,
);

writeFileSync(
  resolve(generatedDir, "types.ts"),
  `// 此文件由 scripts/build.mjs 自动生成，请勿手动修改\nexport type IconName =\n${names.map((n) => `  | '${n}'`).join("\n")};\n`,
);

console.log(`✓ 生成雪碧图：${names.length} 个图标 [${names.join(", ")}]`);
