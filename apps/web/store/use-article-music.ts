import { create } from "zustand";

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
  audioEl: HTMLAudioElement | null;
  bindAudio: (el: HTMLAudioElement | null) => void;
  init: (track: ArticleMusicTrack) => void;
  clear: () => void;
  patchTrack: (patch: Partial<ArticleMusicTrack>) => void;
  setPlaybackState: (state: ArticleMusicPlaybackState) => void;
  setProgress: (progress: number) => void;
  /** commit 为 true 时（点击/拖拽结束/键盘），暂停态会自动续播 */
  seek: (ratio: number, commit?: boolean) => Promise<void>;
  toggle: () => Promise<void>;
  retry: () => Promise<void>;
}

function pauseAndReset(audio: HTMLAudioElement | null) {
  audio?.pause();
  if (audio) {
    audio.currentTime = 0;
  }
}

export const useArticleMusic = create<ArticleMusicStore>((set, get) => ({
  track: null,
  playbackState: "idle",
  progress: 0,
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

    pauseAndReset(audioEl);
    set({
      track,
      playbackState: "idle",
      progress: 0,
    });
  },

  clear: () => {
    const { audioEl } = get();
    pauseAndReset(audioEl);
    set({
      track: null,
      playbackState: "idle",
      progress: 0,
    });
  },

  patchTrack: (patch) => {
    const { track } = get();
    if (!track) return;
    set({ track: { ...track, ...patch } });
  },

  setPlaybackState: (playbackState) => set({ playbackState }),

  setProgress: (progress) => set({ progress }),

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
      set({ playbackState: "loading" });
      try {
        await audioEl.play();
        set({ playbackState: "playing" });
      } catch {
        set({ playbackState: "error" });
      }
    }
  },

  toggle: async () => {
    const { audioEl, playbackState, track } = get();
    if (!audioEl || !track?.url || playbackState === "loading") return;

    if (playbackState === "playing") {
      audioEl.pause();
      set({ playbackState: "paused" });
      return;
    }

    set({ playbackState: "loading" });
    try {
      await audioEl.play();
      set({ playbackState: "playing" });
    } catch {
      set({ playbackState: "error" });
    }
  },

  retry: async () => {
    const { audioEl, track } = get();
    if (!audioEl || !track?.url) return;

    set({ playbackState: "loading", progress: 0 });
    audioEl.load();
    try {
      await audioEl.play();
      set({ playbackState: "playing" });
    } catch {
      set({ playbackState: "error" });
    }
  },
}));
