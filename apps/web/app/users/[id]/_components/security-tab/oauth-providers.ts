import type { IconName } from "@repo/icons";

/** 第三方平台展示元信息：中文名、品牌图标名、图标短码（兜底）、品牌色 */
export interface ProviderMeta {
  label: string;
  /** @repo/icons 品牌图标名；已知平台有，未知 source 为 undefined（回退短码方块） */
  icon?: IconName;
  short: string;
  color: string;
}

/** 已知平台映射，key 为后端 `/oauth/providers` 返回的 source */
const PROVIDER_MAP: Record<string, ProviderMeta> = {
  github: { label: "GitHub", icon: "github", short: "GH", color: "#24292f" },
  gitee: { label: "Gitee", icon: "gitee", short: "Ge", color: "#c71d23" },
  qq: { label: "QQ", icon: "qq", short: "QQ", color: "#12b7f5" },
  weibo: { label: "微博", icon: "weibo", short: "Wb", color: "#e6162d" },
  baidu: { label: "百度", icon: "baidu", short: "Bd", color: "#2932e1" },
};

/** 已知平台返回中文名/图标/短码/颜色；未知 source 兜底用 source 自身 */
export function getProviderMeta(source: string): ProviderMeta {
  return (
    PROVIDER_MAP[source] ?? {
      label: source,
      short: source.slice(0, 2).toUpperCase(),
      color: "#555",
    }
  );
}
