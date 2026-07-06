import { create } from "zustand";
import {
  prepareArticleAudioElement,
  reloadArticleAudioElement,
  resetArticleAudioElement,
} from "@/lib/prepare-article-audio";

/** CDN 冷缓存时音频首次加载易失败，失败后间隔重试次数（不含首次播放） */
const AUDIO_MAX_RETRIES = 3;
/** 指数退避基数：第 n 次重试间隔 = base * 2^(n-1)，如 1500 → 3000 → 6000，总预算约 10.5s */
const AUDIO_RETRY_BASE_DELAY_MS = 1500;

function getRetryDelay(attempt: number): number {
  return AUDIO_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
}

let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
/** 同一次播放尝试内避免 play() 拒绝与 audio onError 重复触发重试 */
let failureHandled = false;

function cancelPlaybackRetry() {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function resetPlaybackRetryState() {
  cancelPlaybackRetry();
  retryAttempt = 0;
  failureHandled = false;
}

export type ArticleMusicPlaybackState = "idle" | "loading" | "playing" | "paused" | "error";

export interface ArticleMusicTrack {
  url: string;
  name: string;
  artist?: string;
  coverUrl?: string;
  durationSeconds?: number;
}

interface ArticleMusicStore {
  track: ArticleMusicTrack | null;
  playbackState: ArticleMusicPlaybackState;
  progress: number;
  /** 是否曾成功开始播放（用于控制进度环显隐） */
  hasPlayedOnce: boolean;
  /** 配乐条是否在视口内（浮动区音乐钮仅在不可见时显示） */
  isMusicBarInView: boolean;
  audioEl: HTMLAudioElement | null;
  bindAudio: (el: HTMLAudioElement | null) => void;
  init: (track: ArticleMusicTrack) => void;
  clear: () => void;
  patchTrack: (patch: Partial<ArticleMusicTrack>) => void;
  setPlaybackState: (state: ArticleMusicPlaybackState) => void;
  setProgress: (progress: number) => void;
  setMusicBarInView: (inView: boolean) => void;
  /** commit 为 true 时（点击/拖拽结束/键盘），暂停态会自动续播 */
  seek: (ratio: number, commit?: boolean) => Promise<void>;
  toggle: () => Promise<void>;
  retry: () => Promise<void>;
  /** audio 元素 onError：加载/播放过程中失败时触发自动重试 */
  handleAudioError: () => void;
  /** audio 元素 onPlaying：成功开始播放后复位重试计数 */
  onPlaybackSuccess: () => void;
}

function pauseAndReset(audio: HTMLAudioElement | null) {
  audio?.pause();
  if (audio) {
    audio.currentTime = 0;
  }
}

export const useArticleMusic = create<ArticleMusicStore>((set, get) => {
  const handlePlaybackFailure = () => {
    if (failureHandled) return;
    failureHandled = true;

    const { audioEl, track } = get();
    if (!audioEl || !track?.url) {
      set({ playbackState: "error" });
      return;
    }

    if (retryAttempt < AUDIO_MAX_RETRIES) {
      retryAttempt += 1;
      set({ playbackState: "loading" });
      cancelPlaybackRetry();
      retryTimer = setTimeout(() => {
        retryTimer = null;
        failureHandled = false;
        void startPlayback(true);
      }, getRetryDelay(retryAttempt));
      return;
    }

    set({ playbackState: "error" });
  };

  const startPlayback = async (fromAutoRetry: boolean) => {
    const { audioEl, track } = get();
    if (!audioEl || !track?.url) return;

    if (!fromAutoRetry) {
      resetPlaybackRetryState();
    }
    failureHandled = false;
    set({ playbackState: "loading" });

    try {
      if (fromAutoRetry) {
        // 重试只重新 load 发请求，不 pause/不清 src，避免触发 pause 事件污染 loading 态、
        // 也避免打断 CDN 进行中的回源（见 reloadArticleAudioElement 注释）。
        reloadArticleAudioElement(audioEl);
      }
      prepareArticleAudioElement(audioEl, track.url);
      await audioEl.play();
      resetPlaybackRetryState();
      set({ playbackState: "playing", hasPlayedOnce: true });
    } catch {
      handlePlaybackFailure();
    }
  };

  return {
    track: null,
    playbackState: "idle",
    progress: 0,
    hasPlayedOnce: false,
    isMusicBarInView: true,
    audioEl: null,

    bindAudio: (el) => set({ audioEl: el }),

    init: (track) => {
      const { track: current, audioEl } = get();
      if (
        current?.url === track.url &&
        current.name === track.name &&
        current.artist === track.artist &&
        current.coverUrl === track.coverUrl &&
        current.durationSeconds === track.durationSeconds
      ) {
        return;
      }

      resetPlaybackRetryState();
      pauseAndReset(audioEl);
      if (audioEl) resetArticleAudioElement(audioEl);
      set({
        track,
        playbackState: "idle",
        progress: 0,
        hasPlayedOnce: false,
        isMusicBarInView: true,
      });
    },

    clear: () => {
      const { audioEl } = get();
      resetPlaybackRetryState();
      pauseAndReset(audioEl);
      if (audioEl) resetArticleAudioElement(audioEl);
      set({
        track: null,
        playbackState: "idle",
        progress: 0,
        hasPlayedOnce: false,
        isMusicBarInView: true,
      });
    },

    patchTrack: (patch) => {
      const { track } = get();
      if (!track) return;
      set({ track: { ...track, ...patch } });
    },

    setPlaybackState: (playbackState) => set({ playbackState }),

    setProgress: (progress) => set({ progress }),

    setMusicBarInView: (isMusicBarInView) => set({ isMusicBarInView }),

    // 拖拽/点击进度条切歌位置：ratio 为 0..1，直接写 audio.currentTime 并同步进度
    seek: async (ratio, commit = false) => {
      const { audioEl, playbackState, track } = get();
      const clamped = Math.min(1, Math.max(0, ratio));
      if (audioEl && Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
        audioEl.currentTime = clamped * audioEl.duration;
      }
      set({ progress: clamped });

      if (!commit || !audioEl || !track?.url) return;
      if (playbackState === "playing" || playbackState === "loading") return;

      if (playbackState === "paused" || playbackState === "idle") {
        await startPlayback(false);
      }
    },

    toggle: async () => {
      const { audioEl, playbackState, track } = get();
      if (!audioEl || !track?.url || playbackState === "loading") return;

      if (playbackState === "playing") {
        cancelPlaybackRetry();
        audioEl.pause();
        set({ playbackState: "paused" });
        return;
      }

      await startPlayback(false);
    },

    retry: async () => {
      const { audioEl, track } = get();
      if (!audioEl || !track?.url) return;

      set({ progress: 0 });
      await startPlayback(false);
    },

    handleAudioError: () => {
      const { playbackState } = get();
      if (playbackState !== "loading" && playbackState !== "playing") return;
      handlePlaybackFailure();
    },

    onPlaybackSuccess: () => {
      resetPlaybackRetryState();
    },
  };
});
