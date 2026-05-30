import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";

// Vite 应用的浏览器入口：把 React 组件挂载到 public/index.html 里的 #root 节点。
createRoot(document.getElementById("root")!).render(
  // StrictMode 只在开发环境帮助发现潜在问题，不会额外渲染真实 DOM。
  <StrictMode>
    <App />
  </StrictMode>,
);
