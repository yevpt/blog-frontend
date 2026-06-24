/** 第三方平台展示元信息：中文名、图标短码、品牌色 */
export interface ProviderMeta {
  label: string;
  short: string;
  color: string;
}

/** 已知平台映射，key 为后端 `/oauth/providers` 返回的 source */
const PROVIDER_MAP: Record<string, ProviderMeta> = {
  github: { label: "GitHub", short: "GH", color: "#24292f" },
  gitee: { label: "Gitee", short: "Ge", color: "#c71d23" },
  qq: { label: "QQ", short: "QQ", color: "#12b7f5" },
  weibo: { label: "微博", short: "Wb", color: "#e6162d" },
  baidu: { label: "百度", short: "Bd", color: "#2932e1" },
};

/** 已知平台返回中文名/短码/颜色；未知 source 兜底用 source 自身 */
export function getProviderMeta(source: string): ProviderMeta {
  return (
    PROVIDER_MAP[source] ?? {
      label: source,
      short: source.slice(0, 2).toUpperCase(),
      color: "#555",
    }
  );
}
