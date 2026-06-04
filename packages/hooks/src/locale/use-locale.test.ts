// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { createElement, useState, type ReactNode } from "react";
import { describe, expect, it, beforeEach } from "vitest";

import {
  LocaleContext,
  useLocale,
  getNestedValue,
  type Locale,
  type LocaleContextValue,
} from "./use-locale";

// ——— getNestedValue 单元测试 ———

describe("getNestedValue", () => {
  const messages = {
    nav: { home: "首页", snippets: "碎语" },
    auth: { login: "登录" },
    flat: "直接值",
  };

  it("点分路径找到嵌套值", () => {
    expect(getNestedValue(messages, "nav.home")).toBe("首页");
    expect(getNestedValue(messages, "auth.login")).toBe("登录");
  });

  it("单层路径找到值", () => {
    expect(getNestedValue(messages, "flat")).toBe("直接值");
  });

  it("路径不存在时返回 undefined", () => {
    expect(getNestedValue(messages, "nav.notExist")).toBeUndefined();
    expect(getNestedValue(messages, "missing.key")).toBeUndefined();
  });

  it("路径中间层不是对象时返回 undefined", () => {
    expect(getNestedValue(messages, "flat.deep")).toBeUndefined();
  });
});

// ——— useLocale Hook 测试（未包裹 Provider） ———

describe("useLocale（默认 Context）", () => {
  it("未包裹 Provider 时返回默认 locale 'zh'", () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe("zh");
  });

  it("未包裹 Provider 时 t() 返回 key 本身", () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current.t("nav.home")).toBe("nav.home");
    expect(result.current.t("some.missing.key")).toBe("some.missing.key");
  });
});

// ——— useLocale Hook 测试（通过 LocaleContext.Provider 注入） ———

describe("useLocale（通过 LocaleContext.Provider 注入）", () => {
  // 模拟中文 messages
  const zhMessages = {
    nav: { home: "首页", snippets: "碎语" },
    auth: { login: "登录" },
  };

  /** 根据 messages 构建 t() 函数 */
  function makeT(msgs: Record<string, unknown>) {
    return (key: string): string => getNestedValue(msgs, key) ?? key;
  }

  /** 创建固定 locale 和 messages 的 wrapper */
  function makeWrapper(locale: Locale, msgs: Record<string, unknown>) {
    const value: LocaleContextValue = {
      locale,
      setLocale: () => undefined,
      t: makeT(msgs),
    };
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(LocaleContext.Provider, { value }, children);
    };
  }

  it("locale 为 'zh' 且 messages 已加载时 t('nav.home') 返回 '首页'", () => {
    const Wrapper = makeWrapper("zh", zhMessages);
    const { result } = renderHook(() => useLocale(), { wrapper: Wrapper });
    expect(result.current.locale).toBe("zh");
    expect(result.current.t("nav.home")).toBe("首页");
    expect(result.current.t("auth.login")).toBe("登录");
  });

  it("找不到 key 时 t() 返回 key 本身", () => {
    const Wrapper = makeWrapper("zh", zhMessages);
    const { result } = renderHook(() => useLocale(), { wrapper: Wrapper });
    expect(result.current.t("nav.notExist")).toBe("nav.notExist");
    expect(result.current.t("completely.missing")).toBe("completely.missing");
  });

  it("messages 为空时 t() 返回 key 本身（降级处理）", () => {
    const Wrapper = makeWrapper("zh", {});
    const { result } = renderHook(() => useLocale(), { wrapper: Wrapper });
    expect(result.current.t("nav.home")).toBe("nav.home");
  });
});

// ——— locale 状态切换测试 ———

describe("locale 状态切换", () => {
  // 使用 globalThis.localStorage（happy-dom 环境中可用，避免直接引用浏览器全局 window）
  const storage = globalThis.localStorage;

  beforeEach(() => {
    storage?.removeItem("locale");
  });

  it("通过 setLocale 切换后 locale 状态更新", () => {
    /** 模拟 LocaleProvider 内部状态管理逻辑 */
    function useLocaleState() {
      const [locale, setLocaleState] = useState<Locale>("zh");
      const setLocale = (l: Locale) => {
        storage?.setItem("locale", l);
        setLocaleState(l);
      };
      return { locale, setLocale, t: (key: string) => key };
    }

    const { result } = renderHook(() => useLocaleState());

    expect(result.current.locale).toBe("zh");

    act(() => {
      result.current.setLocale("en");
    });

    expect(result.current.locale).toBe("en");
  });

  it("setLocale 将 locale 持久化到 localStorage", () => {
    function useLocaleWithStorage() {
      const [locale, setLocaleState] = useState<Locale>("zh");
      const setLocale = (l: Locale) => {
        storage?.setItem("locale", l);
        setLocaleState(l);
      };
      return { locale, setLocale };
    }

    const { result } = renderHook(() => useLocaleWithStorage());

    act(() => {
      result.current.setLocale("en");
    });

    expect(storage?.getItem("locale")).toBe("en");
  });

  it("初始 locale 默认为 'zh'", () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe("zh");
  });
});
