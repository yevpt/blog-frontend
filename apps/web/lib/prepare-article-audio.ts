import { resolveAudioCrossOrigin } from "./audio-cross-origin";

/** 切歌或离开文章页时卸载音频源，避免首屏预加载配乐文件。 */
export function resetArticleAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.currentTime = 0;
  audio.removeAttribute("src");
  audio.load();
}

/**
 * 自动重试时重新发请求：仅 load，不 pause（避免触发 pause 事件污染 loading 态）、
 * 不清 src（避免打断 CDN 进行中的回源）。浏览器会基于当前 src 重新拉取。
 */
export function reloadArticleAudioElement(audio: HTMLAudioElement): void {
  audio.load();
}

function resolveAudioSrc(url: string): string {
  return new URL(url, window.location.href).href;
}

/** 首次播放前挂载 src。注意：不要在这里等待 canplay，否则会丢失用户手势，导致部分浏览器静音。 */
export function prepareArticleAudioElement(audio: HTMLAudioElement, url: string): void {
  const targetSrc = resolveAudioSrc(url);
  if (audio.src !== targetSrc) {
    const crossOrigin = resolveAudioCrossOrigin(url);
    if (crossOrigin) {
      audio.crossOrigin = crossOrigin;
    } else {
      audio.removeAttribute("crossorigin");
    }
    audio.src = targetSrc;
    // 设置 src 后隐式开始加载，为了兼容性显式 load 一下
    audio.load();
  }
}
