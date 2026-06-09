// jsdom 环境下确保 React 19 能正确检测 act 环境
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
