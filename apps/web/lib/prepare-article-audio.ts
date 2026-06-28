import { resolveAudioCrossOrigin } from "./audio-cross-origin";

/** 切歌或离开文章页时卸载音频源，避免首屏预加载配乐文件。 */
export function resetArticleAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.currentTime = 0;
  audio.removeAttribute("src");
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
