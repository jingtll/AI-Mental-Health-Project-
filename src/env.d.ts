/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue"
  // 业务页面本轮仍为 JS SFC，组件类型放宽为通用 DefineComponent
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
