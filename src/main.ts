import { createApp } from "vue"
import ElementPlus from "element-plus"
import "element-plus/dist/index.css"
import "./style.css"
// 心耘设计令牌 + 全局动效 + Element Plus 主题覆盖；必须排在 element-plus 之后
import "./styles/index.scss"
import App from "./App.vue"
import router from "./router"
import * as ElementPlusIconsVue from "@element-plus/icons-vue"
import { createPinia } from "pinia"

const pinia = createPinia()
const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.use(ElementPlus).use(router).use(pinia).mount("#app")
