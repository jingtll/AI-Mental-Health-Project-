/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue"
  // 业务页面本轮仍为 JS SFC，组件类型放宽为通用 DefineComponent
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// 包内 d.ts 存在，但 package.json exports 无法被 moduleResolution 解析
declare module "@wangeditor/editor-for-vue" {
  import type { Component } from "vue"
  export const Editor: Component
  export const Toolbar: Component
}
