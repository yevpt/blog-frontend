import { hashAvatarSeed } from "./avatar-hash";

export const MOCK_PORTRAIT_MARKER = "mock-portrait";

const SKINS = [
  "#f8d9c4",
  "#f0c9a0",
  "#e8b896",
  "#d4a574",
  "#c68642",
  "#8d5524",
  "#f5d0b5",
  "#e0ac69",
];
const HAIR_COLORS = [
  "#1f2937",
  "#2c1810",
  "#3b2314",
  "#5c3d2e",
  "#6b4423",
  "#4a3728",
  "#78350f",
  "#92400e",
  "#374151",
  "#713f12",
];
const SHIRTS = [
  "#64748b",
  "#7c3aed",
  "#0f766e",
  "#b45309",
  "#6366f1",
  "#e11d48",
  "#0891b2",
  "#9333ea",
  "#65a30d",
  "#ea580c",
  "#4338ca",
  "#0d9488",
];
const BG_GRADIENTS: readonly (readonly [string, string])[] = [
  ["#e0f2fe", "#7dd3fc"],
  ["#fce7f3", "#f9a8d4"],
  ["#dcfce7", "#86efac"],
  ["#fef3c7", "#fcd34d"],
  ["#ede9fe", "#c4b5fd"],
  ["#ffe4e6", "#fda4af"],
  ["#cffafe", "#67e8f9"],
  ["#f3e8ff", "#d8b4fe"],
  ["#ecfccb", "#bef264"],
  ["#ffedd5", "#fdba74"],
  ["#e0e7ff", "#a5b4fc"],
  ["#ccfbf1", "#5eead4"],
  ["#faf5ff", "#e9d5ff"],
  ["#f0fdf4", "#bbf7d0"],
  ["#fff1f2", "#fecdd3"],
  ["#f8fafc", "#cbd5e1"],
];

function pickByHash<T>(items: readonly T[], hash: number, shift: number): T {
  const index = (hash >> shift) % items.length;
  return items[index]!;
}

function hairPath(style: number, hair: string): string {
  switch (style) {
    case 0:
      return `<path d="M17 30 Q18 12 32 10 Q46 12 47 30 Q45 18 32 16 Q19 18 17 30 Z" fill="${hair}"/>`;
    case 1:
      return `<path d="M15 34 Q14 8 32 7 Q50 8 49 34 L47 28 Q32 14 17 28 Z" fill="${hair}"/><path d="M16 28 Q18 38 22 48 L20 50 Q14 38 15 28 Z" fill="${hair}"/><path d="M48 28 Q46 38 42 48 L44 50 Q50 38 49 28 Z" fill="${hair}"/>`;
    case 2:
      return `<path d="M18 32 Q20 10 32 9 Q44 10 46 32 Q40 20 32 17 Q24 20 18 32 Z" fill="${hair}"/><circle cx="20" cy="24" r="4" fill="${hair}"/><circle cx="44" cy="24" r="4" fill="${hair}"/><circle cx="32" cy="14" r="5" fill="${hair}"/>`;
    case 3:
      return `<path d="M20 30 Q22 14 32 12 Q42 14 44 30 Q40 22 32 20 Q24 22 20 30 Z" fill="${hair}"/><ellipse cx="32" cy="9" rx="7" ry="6" fill="${hair}"/>`;
    case 4:
      return `<path d="M16 31 Q18 13 32 11 Q46 13 48 31 L44 26 Q32 18 20 26 Z" fill="${hair}"/><path d="M44 20 Q52 24 50 34 L46 30 Q48 24 44 20 Z" fill="${hair}"/>`;
    case 5:
      return `<path d="M19 28 L22 16 L26 24 L30 14 L34 24 L38 15 L42 25 L45 28 Q43 18 32 16 Q21 18 19 28 Z" fill="${hair}"/>`;
    case 6:
      return `<ellipse cx="32" cy="22" rx="18" ry="16" fill="${hair}"/>`;
    case 7:
      return `<path d="M22 30 Q24 18 32 17 Q40 18 42 30 Q40 24 32 22 Q24 24 22 30 Z" fill="${hair}"/>`;
    default:
      return `<path d="M17 30 Q18 12 32 10 Q46 12 47 30 Q45 18 32 16 Q19 18 17 30 Z" fill="${hair}"/>`;
  }
}

function accessoryMarkup(hash: number, skin: string): string {
  const kind = (hash >> 20) % 5;
  if (kind === 0) {
    return `<rect x="21" y="31.5" width="22" height="5" rx="2.5" fill="none" stroke="#334155" stroke-width="1.2" opacity="0.75"/>`;
  }
  if (kind === 1) {
    return `<path d="M27 41 Q32 44 37 41" fill="none" stroke="#9a3412" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/><path d="M29 43.5 Q32 46 35 43.5" fill="${skin}" opacity="0.35"/>`;
  }
  if (kind === 2) {
    return `<ellipse cx="32" cy="41" rx="3.5" ry="2" fill="#fda4af" opacity="0.45"/>`;
  }
  if (kind === 3) {
    return `<path d="M24 39 Q32 42 40 39" fill="none" stroke="#334155" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>`;
  }
  return "";
}

/** 按 userId 哈希生成差异化自托管肖像 SVG */
export function generateMockPortraitSvg(seed: string | number): string {
  const hash = hashAvatarSeed(seed);
  const gradient = BG_GRADIENTS[hash % BG_GRADIENTS.length]!;
  const bg1 = gradient[0];
  const bg2 = gradient[1];
  const skin = pickByHash(SKINS, hash, 4);
  const hairColor = pickByHash(HAIR_COLORS, hash, 7);
  const shirt = pickByHash(SHIRTS, hash, 10);
  const hairStyle = (hash >> 13) % 8;
  const faceRx = 11 + ((hash >> 16) % 5);
  const faceRy = 13 + ((hash >> 19) % 4);
  const eyeOffset = (hash >> 23) % 3;
  const mouthStyle = (hash >> 25) % 4;

  const leftEyeX = 26 + eyeOffset * 0.5;
  const rightEyeX = 38 - eyeOffset * 0.5;
  const mouthPaths = [
    `M28.5 40.5 Q32 43 35.5 40.5`,
    `M28 40 Q32 42.5 36 40`,
    `M29 41 L35 41`,
    `M27.5 40.8 Q32 43.8 36.5 40.8`,
  ];
  const mouth = mouthPaths[mouthStyle];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-hidden="true" data-mock-portrait="1">
  <defs>
    <clipPath id="clip"><circle cx="32" cy="32" r="32"/></clipPath>
    <linearGradient id="bg" x1="32" y1="0" x2="32" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#clip)">
    <rect width="64" height="64" fill="url(#bg)"/>
    <ellipse cx="32" cy="60" rx="23" ry="15" fill="${shirt}"/>
    <path d="M28 44 L36 44 L35.5 52 L28.5 52 Z" fill="${skin}"/>
    <ellipse cx="32" cy="35" rx="${faceRx}" ry="${faceRy}" fill="${skin}"/>
    ${hairPath(hairStyle, hairColor)}
    <ellipse cx="${leftEyeX}" cy="33.5" rx="2" ry="2.3" fill="#1f2937" opacity="0.72"/>
    <ellipse cx="${rightEyeX}" cy="33.5" rx="2" ry="2.3" fill="#1f2937" opacity="0.72"/>
    <path d="${mouth}" fill="none" stroke="#c08072" stroke-width="1.1" stroke-linecap="round" opacity="0.5"/>
    ${accessoryMarkup(hash, skin)}
  </g>
</svg>`;
}

export function encodeMockPortraitDataUrl(seed: string | number): string {
  return `data:image/svg+xml,${encodeURIComponent(generateMockPortraitSvg(seed))}`;
}

export function isMockPortraitDataUrl(url: string | undefined): boolean {
  if (!url?.startsWith("data:image/svg+xml,")) return false;
  try {
    return decodeURIComponent(url.slice("data:image/svg+xml,".length)).includes(
      'data-mock-portrait="1"',
    );
  } catch {
    return false;
  }
}
