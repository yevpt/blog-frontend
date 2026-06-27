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

function waitForCanPlay(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const onCanPlay = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("audio load failed"));
    };
    const cleanup = () => {
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
    };
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);
  });
}

/** 首次播放前挂载 src 并等待可播放；已就绪则直接返回。 */
export function prepareArticleAudioElement(audio: HTMLAudioElement, url: string): Promise<void> {
  const targetSrc = resolveAudioSrc(url);
  if (audio.src !== targetSrc) {
    const crossOrigin = resolveAudioCrossOrigin(url);
    if (crossOrigin) {
      audio.crossOrigin = crossOrigin;
    } else {
      audio.removeAttribute("crossorigin");
    }
    audio.src = targetSrc;
  }

  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }

  // preload=none 时赋值 src 不会自动拉流，需显式 load；若浏览器已在加载则跳过以免重复请求
  const networkLoading = HTMLMediaElement.NETWORK_LOADING ?? 2;
  if (audio.networkState !== networkLoading) {
    audio.load();
  }

  return waitForCanPlay(audio);
}
