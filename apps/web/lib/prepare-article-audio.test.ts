import { beforeEach, describe, expect, it, vi } from "vitest";
import * as prepareArticleAudioModule from "./prepare-article-audio";

type AudioStub = HTMLAudioElement & { emit: (type: string) => void };

function createAudioStub(): AudioStub {
  const listeners = new Map<string, Set<() => void>>();
  const stub = {
    pause: vi.fn(),
    load: vi.fn(),
    currentTime: 0,
    readyState: 0,
    networkState: 0,
    src: "",
    crossOrigin: "",
    removeAttribute: vi.fn((name: string) => {
      if (name === "src") stub.src = "";
      if (name === "crossorigin") stub.crossOrigin = "";
    }),
    addEventListener: vi.fn((type: string, handler: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(handler);
    }),
    removeEventListener: vi.fn((type: string, handler: () => void) => {
      listeners.get(type)?.delete(handler);
    }),
    emit(type: string) {
      listeners.get(type)?.forEach((handler) => handler());
    },
  };

  return stub as unknown as AudioStub;
}

describe("prepareArticleAudioElement", () => {
  let audio: AudioStub;

  beforeEach(() => {
    audio = createAudioStub();
  });

  it("首次播放前设置 src 与 crossOrigin 并触发 load", () => {
    prepareArticleAudioModule.prepareArticleAudioElement(audio, "https://example.com/a.mp3");

    expect(audio.src).toBe("https://example.com/a.mp3");
    expect(audio.crossOrigin).toBe("anonymous");
    expect(audio.load).toHaveBeenCalledOnce();
  });

  it("src 已匹配时不再重复 load", () => {
    const resolvedUrl = new URL("https://example.com/a.mp3", window.location.href).href;
    audio.src = resolvedUrl;

    prepareArticleAudioModule.prepareArticleAudioElement(audio, "https://example.com/a.mp3");

    expect(audio.load).not.toHaveBeenCalled();
  });
});

describe("resetArticleAudioElement", () => {
  it("暂停并卸载 src", () => {
    const audio = createAudioStub();
    audio.src = "https://example.com/a.mp3";
    audio.currentTime = 12;

    prepareArticleAudioModule.resetArticleAudioElement(audio);

    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.currentTime).toBe(0);
    expect(audio.removeAttribute).toHaveBeenCalledWith("src");
    expect(audio.load).toHaveBeenCalledOnce();
  });
});
