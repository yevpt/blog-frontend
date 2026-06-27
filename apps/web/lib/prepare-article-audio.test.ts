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

  it("首次播放前设置 src 与 crossOrigin 并等待 canplay", async () => {
    const promise = prepareArticleAudioModule.prepareArticleAudioElement(
      audio,
      "https://example.com/a.mp3",
    );

    expect(audio.src).toBe("https://example.com/a.mp3");
    expect(audio.crossOrigin).toBe("anonymous");
    expect(audio.load).toHaveBeenCalledOnce();

    audio.emit("canplay");
    await expect(promise).resolves.toBeUndefined();
  });

  it("已具备可播放数据时不再等待事件", async () => {
    // happy-dom 中 HTMLMediaElement.HAVE_FUTURE_DATA 为 undefined
    // 使用数值 3 代替
    const HAVE_FUTURE_DATA = 3;

    // 模拟 resolveAudioSrc 的行为: new URL(url, "http://localhost/").href
    const resolvedUrl = new URL("https://example.com/a.mp3", "http://localhost/").href;

    // 设置 audio 状态：src 已匹配，readyState 已足够
    audio.readyState = HAVE_FUTURE_DATA;
    audio.src = resolvedUrl;

    // 由于 resolveAudioSrc 是模块内部函数，无法直接 mock
    // 但我们可以验证：如果 src 匹配且 readyState 足够，load 不应被调用
    // 这里通过 spy 来验证行为
    const originalPrepare = prepareArticleAudioModule.prepareArticleAudioElement;

    // 由于函数内部调用了 resolveAudioSrc，我们需要让 audio.src 匹配解析后的 URL
    // 解析后: "http://localhost/https://example.com/a.mp3"
    // 如果 audio.src 已经是这个值，则不会进入 if (audio.src !== targetSrc) 分支
    // 然后检查 readyState >= HAVE_FUTURE_DATA，应该 resolve

    // 但是 happy-dom 中 HTMLMediaElement.HAVE_FUTURE_DATA 为 undefined
    // 所以 audio.readyState >= undefined 为 false
    // 导致函数进入 Promise 等待 canplay 事件的分支

    // 修复：mock HTMLMediaElement.HAVE_FUTURE_DATA
    const OriginalHTMLMediaElement = globalThis.HTMLMediaElement as typeof HTMLMediaElement | undefined;
    Object.defineProperty(globalThis, "HTMLMediaElement", {
      value: { HAVE_FUTURE_DATA: 3 },
      writable: true,
      configurable: true,
    });

    try {
      await expect(
        originalPrepare(audio, "https://example.com/a.mp3"),
      ).resolves.toBeUndefined();
      expect(audio.load).not.toHaveBeenCalled();
    } finally {
      // 恢复全局
      if (OriginalHTMLMediaElement) {
        Object.defineProperty(globalThis, "HTMLMediaElement", {
          value: OriginalHTMLMediaElement,
          writable: true,
          configurable: true,
        });
      } else {
        delete (globalThis as any).HTMLMediaElement;
      }
    }
  });

  it("加载失败时 reject", async () => {
    const promise = prepareArticleAudioModule.prepareArticleAudioElement(
      audio,
      "https://example.com/broken.mp3",
    );
    audio.emit("error");
    await expect(promise).rejects.toThrow("audio load failed");
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
