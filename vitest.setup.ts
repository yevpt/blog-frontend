import "@testing-library/jest-dom/vitest";

// 告知 React 测试环境支持 act()，消除 "not configured to support act" 警告
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

process.env.BLOG_USER_ID = "1";

// Node.js ≥22 adds an experimental `localStorage` to globalThis, which causes
// Vitest's `populateGlobal` to skip injecting the jsdom/happy-dom storage
// (the key already exists in globalThis, and it's not in the hardcoded KEYS list).
// Detect browser-like environments and restore a working storage implementation.
// 检测 jsdom 环境时将 globalThis.localStorage 重定向到 jsdom 实例；happy-dom 则安装内存 polyfill
// (Node.js v22 兼容性 Bug：Node.js v22 将 localStorage 作为实验性特性加入 globalThis，
// 触发警告 localStorage is not available because --localstorage-file was not provided。
// Vitest 的 populateGlobal 逻辑遇到 globalThis 中已存在且不在硬编码 KEYS 列表的 key 时会跳过，导致 jsdom/happy-dom 的 localStorage 无法注入。)
if (typeof window !== "undefined") {
  const g = globalThis as Record<string, unknown>;
  type JsdomWindow = { localStorage: unknown; sessionStorage: unknown };
  const jsdomInstance = g.jsdom as { window: JsdomWindow } | undefined;
  if (jsdomInstance?.window) {
    // jsdom environment: proxy to the real jsdom window storage
    Object.defineProperty(globalThis, "localStorage", {
      get: () => jsdomInstance.window.localStorage,
      configurable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      get: () => jsdomInstance.window.sessionStorage,
      configurable: true,
    });
  } else {
    // happy-dom or other browser-like env: install an in-memory fallback
    const makeStore = () => {
      const s: Record<string, string> = {};
      return {
        getItem: (k: string) => (k in s ? s[k] : null),
        setItem: (k: string, v: string) => {
          s[k] = String(v);
        },
        removeItem: (k: string) => {
          delete s[k];
        },
        clear: () => {
          Object.keys(s).forEach((k) => delete s[k]);
        },
        get length() {
          return Object.keys(s).length;
        },
        key: (i: number) => Object.keys(s)[i] ?? null,
      };
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: makeStore(),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: makeStore(),
      configurable: true,
      writable: true,
    });
  }
}
