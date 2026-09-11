# TypeScript 核心层迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Vue 3 + Vite 基础设施层迁到 TypeScript（strict），`npm run build` 强制 `vue-tsc`，本轮不改任何 `.vue` 业务页面。

**Architecture:** 先加 TS 脚手架与共享类型，再迁 `config`/`request`/`api`/`router`/`stores`/`main`，同步改 `index.html` 入口。运行时行为保持不变：token 存取、`/api` 代理、字符串业务码、SSE 不经 axios。

**Tech Stack:** Vue 3 + Vite 8 + Element Plus + Pinia + axios + `@microsoft/fetch-event-source`；新增 `typescript`、`vue-tsc`。

**Spec:** `docs/superpowers/specs/2026-01-27-typescript-core-migration-design.md`

## Global Constraints

- 本轮禁止修改任何 `.vue` 文件（含 `<script lang="ts">`）
- 不重写咨询流 / SSE，不改后端契约，不加 ESLint/测试框架
- `strict: true`；局部放宽须写注释原因；禁止全局关 strict
- 业务成功码是字符串 `"200"` / `"-1"`，不是 number
- 请求头为 `token`；SSE 头为 `Token`（在 `consultation.vue`，本轮不动）
- `sessionId`：列表返回数字 id；情绪/流式用 `session_${id}` 前缀（逻辑在 `.vue`，本轮不动）
- 使用 npm；不 commit 除非用户明确要求
- 验收命令：`npm run typecheck`、`npm run build` 均通过；`npm run dev` 可启动

## File Structure

| 路径 | 职责 |
|------|------|
| `package.json` | 增加 TS 依赖与 scripts |
| `tsconfig.json` | strict、paths `@/*` |
| `src/env.d.ts` | Vite client 类型 |
| `src/types/api.ts` | `ApiResponse`、`UserInfo`、`PageResult`、`LoginResult` |
| `src/types/session.ts` | 会话列表项 / 消息 / 起会话请求 |
| `src/types/emotion.ts` | 情绪日记提交 / 会话情绪分析 |
| `src/config/index.ts` | `fileBaseUrl` |
| `src/utils/request.ts` | axios 实例与拦截器 |
| `src/api/frontend.ts` | 前台 API |
| `src/api/admin.ts` | 管理端 API + login |
| `src/router/index.ts` | 路由与登录守卫 |
| `src/stores/admin.ts` | 侧栏折叠 store |
| `src/main.ts` | 应用入口 |
| `index.html` | script 指向 `/src/main.ts` |
| `AGENTS.md` | 同步命令与结构说明 |

删除：上述对应 `.js`（避免双入口）。

---

### Task 1: 安装 TS 依赖并搭脚手架

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `src/env.d.ts`

**Interfaces:**
- Consumes: 现有 npm 项目
- Produces: `npm run typecheck`、`npm run build` 脚本入口

- [ ] **Step 1: 安装依赖**

```bash
npm install -D typescript vue-tsc
```

Expected: `package.json` devDependencies 出现 `typescript`、`vue-tsc`。

- [ ] **Step 2: 写入 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "src/env.d.ts"]
}
```

说明：`include` 含 `src/**/*.vue` 是为后续阶段预留；若 `vue-tsc` 对仍为 JS 的 SFC 产生噪音，收窄为 `["src/**/*.ts", "src/env.d.ts"]` 并在 AGENTS 注明。

- [ ] **Step 3: 写入 `src/env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 4: 更新 `package.json` scripts**

将 `scripts` 改为：

```json
{
  "dev": "vite",
  "build": "vue-tsc --noEmit && vite build",
  "preview": "vite preview",
  "typecheck": "vue-tsc --noEmit"
}
```

- [ ] **Step 5: 验证脚手架**

```bash
npm run typecheck
```

Expected: 命令可执行。完整 build 在 Task 6 验收。

---

### Task 2: 新建共享类型

**Files:**
- Create: `src/types/api.ts`
- Create: `src/types/session.ts`
- Create: `src/types/emotion.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `ApiResponse<T>`、`UserInfo`、`UserType`、`PageResult<T>`、`LoginResult`、`PageQuery`
  - `ChatSession`、`ChatMessage`、`StartSessionPayload`
  - `EmotionDiaryPayload`、`SessionEmotion`

- [ ] **Step 1: 创建 `src/types/api.ts`**

```ts
/** 业务用户类型：1 前台用户，2 管理员 */
export type UserType = 1 | 2

export interface UserInfo {
  id?: number
  username: string
  userType: UserType
  nickName?: string
  email?: string
  /** 其他后端字段按页面实际使用再补，禁止臆造必填 */
  [key: string]: unknown
}

/** 后端业务包装：code 为字符串 "200" | "-1"，不是 number */
export interface ApiResponse<T = unknown> {
  code: string
  msg?: string
  data: T
}

export interface LoginResult {
  token: string
  userInfo: UserInfo
}

export interface PageQuery {
  pageNum?: number
  pageSize?: number
  currentPage?: number
  size?: number
  [key: string]: unknown
}

/** 拦截器成功时返回 data.data，分页接口通常就是该结构 */
export interface PageResult<T = unknown> {
  records: T[]
  total: number
}
```

- [ ] **Step 2: 创建 `src/types/session.ts`**

```ts
export interface ChatSession {
  id: number
  sessionTitle: string
  status?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface ChatMessage {
  id: number | string
  senderType: 1 | 2
  content: string
  createdAt: string
  [key: string]: unknown
}

export interface StartSessionPayload {
  sessionTitle?: string
  userMessage?: string
  [key: string]: unknown
}
```

- [ ] **Step 3: 创建 `src/types/emotion.ts`**

```ts
export interface EmotionDiaryPayload {
  moodScore: number | null
  content?: string
  tags?: string[]
  [key: string]: unknown
}

/** 会话情绪分析；字段以实际接口为准，未知可选 */
export interface SessionEmotion {
  primaryEmotion?: string
  emotionScore?: number
  isNegative?: boolean
  suggestion?: string
  riskLevel?: number
  improvementSuggestions?: string[]
  [key: string]: unknown
}
```

- [ ] **Step 4: 验证**

```bash
npm run typecheck
```

Expected: `src/types/*.ts` 无报错。

---

### Task 3: 迁移 `config` 与 `request`（关键）

**Files:**
- Create: `src/config/index.ts`
- Create: `src/utils/request.ts`
- Delete: `src/config/index.js`、`src/utils/request.js`

**Interfaces:**
- Consumes: `ApiResponse`（Task 2）
- Produces: default export `service: AxiosInstance`；调用方仍写 `service.get<T>(...)` 并假设 resolve 值为业务 `data`

- [ ] **Step 1: 创建 `src/config/index.ts`**

```ts
export const fileBaseUrl = "http://159.75.169.224:1235"
```

- [ ] **Step 2: 创建 `src/utils/request.ts`**

```ts
import axios from "axios"
import { ElMessage } from "element-plus"
import type { ApiResponse } from "@/types/api"

const service = axios.create({
  baseURL: `/api`,
  timeout: 5000,
})

service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers["token"] = token
    }
    return config
  },
  (error) => Promise.reject(error),
)

service.interceptors.response.use(
  (response) => {
    const { data, config } = response as {
      data: ApiResponse
      config: { url?: string }
    }
    if (data.code === "200") {
      return data.data as never
    }
    if (data.code === "-1") {
      if (!config.url?.includes("/login")) {
        ElMessage.error(data.msg || "登录过期，请重新登录")
        localStorage.removeItem("token")
        localStorage.removeItem("userInfo")
        window.location.href = "/auth/login"
      } else {
        ElMessage.error(data.msg || "登录过期，请重新登录")
        return Promise.reject("网络请求失败")
      }
    }
    // 其他业务码：reject，避免把完整 AxiosResponse 当业务数据 resolve
    return Promise.reject(data.msg || "业务处理失败")
  },
  (error) => Promise.reject(error),
)

export default service
```

注意：相对 JS 版，非 `"200"` 且非 `"-1"` 的路径从「return response」改为 **reject**。这是设计文档约定的类型安全修正；若某页面依赖旧的「非 200 仍 resolve」行为，会在联调时暴露。

- [ ] **Step 3: 删除旧 `.js`**

删除 `src/config/index.js`、`src/utils/request.js`。

- [ ] **Step 4: 验证**

```bash
npm run typecheck
```

Expected: `src/utils/request.ts`、`src/config/index.ts` 无 error。若 `data as never` 引发调用方类型问题，在 Task 4 的 API 层用泛型声明收敛。

---

### Task 4: 迁移 API 层

**Files:**
- Create: `src/api/frontend.ts`
- Create: `src/api/admin.ts`
- Delete: `src/api/frontend.js`、`src/api/admin.js`

**Interfaces:**
- Consumes: `service`、`PageResult`、session/emotion 类型
- Produces: 与现 JS **同名**导出，避免改任何 `.vue` import：
  - frontend: `register`, `startSession`, `getSessionList`, `deleteSession`, `getSessionDetail`, `getSessionEmotion`, `addEmotionDiary`, `getKnowledgeList`, `getKnowledgeDetail`
  - admin: `login`, `categoryTree`, `articlePage`, `uploadFile`, `createArticle`, `getArticleDetail`, `updateArticle`, `changeArticleStatus`, `deleteArticle`, `getConsultationPage`, `getSessionDetail`, `getEmotionalPage`, `deleteEmotional`, `getAnalyticsOverview`, `logout`

- [ ] **Step 1: 创建 `src/api/frontend.ts`**

```ts
import service from "@/utils/request"
import type { PageQuery, PageResult } from "@/types/api"
import type {
  ChatMessage,
  ChatSession,
  StartSessionPayload,
} from "@/types/session"
import type { EmotionDiaryPayload, SessionEmotion } from "@/types/emotion"

export const register = (data: Record<string, unknown>) => {
  return service.post<string | null>("/user/add", data)
}

export const startSession = (data: StartSessionPayload) => {
  return service.post<ChatSession>("/psychological-chat/session/start", data)
}

export const getSessionList = (params: PageQuery) => {
  return service.get<PageResult<ChatSession>>("/psychological-chat/sessions", {
    params,
  })
}

export const deleteSession = (sessionId: number | string) => {
  return service.delete<null>(`/psychological-chat/sessions/${sessionId}`)
}

export const getSessionDetail = (sessionId: number | string) => {
  return service.get<ChatMessage[]>(
    `/psychological-chat/sessions/${sessionId}/messages`,
  )
}

export const getSessionEmotion = (sessionId: number | string) => {
  return service.get<SessionEmotion>(
    `/psychological-chat/session/${sessionId}/emotion`,
  )
}

export const addEmotionDiary = (data: EmotionDiaryPayload) => {
  return service.post<null>("/emotion-diary", data)
}

export const getKnowledgeList = (params: PageQuery) => {
  return service.get<PageResult<Record<string, unknown>>>(
    "/knowledge/article/page",
    { params },
  )
}

export const getKnowledgeDetail = (id: number | string) => {
  return service.get<Record<string, unknown>>(`/knowledge/article/${id}`)
}
```

- [ ] **Step 2: 创建 `src/api/admin.ts`**

```ts
import service from "@/utils/request"
import type { LoginResult, PageQuery, PageResult } from "@/types/api"
import type { ChatMessage, ChatSession } from "@/types/session"

export const login = (data: { username: string; password: string }) => {
  return service.post<LoginResult>("/user/login", data)
}

export const categoryTree = () => {
  return service.get<Array<{ id: number; categoryName: string }>>(
    "/knowledge/category/tree",
  )
}

export const articlePage = (params: PageQuery) => {
  return service.get<PageResult<Record<string, unknown>>>(
    "/knowledge/article/page",
    { params },
  )
}

export const uploadFile = (
  file: File,
  businessInfo: { businessId: number | string },
) => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("businessType", "ARTICLE")
  formData.append("businessId", String(businessInfo.businessId))
  formData.append("businessField", "cover")
  return service.post<{ filePath: string }>("/file/upload", formData, {
    headers: {
      "content-type": "multipart/form-data",
    },
  })
}

export const createArticle = (data: Record<string, unknown>) => {
  return service.post<null>("/knowledge/article", data)
}

export const getArticleDetail = (id: number | string) => {
  return service.get<Record<string, unknown>>(`/knowledge/article/${id}`)
}

export const updateArticle = (
  id: number | string,
  data: Record<string, unknown>,
) => {
  return service.put<null>(`/knowledge/article/${id}`, data)
}

export const changeArticleStatus = (
  id: number | string,
  data: { status: number },
) => {
  return service.put<null>(`/knowledge/article/${id}/status`, data)
}

export const deleteArticle = (id: number | string) => {
  return service.delete<null>(`/knowledge/article/${id}`)
}

export const getConsultationPage = (params: PageQuery) => {
  return service.get<PageResult<ChatSession>>("/psychological-chat/sessions", {
    params,
  })
}

export const getSessionDetail = (sessionId: number | string) => {
  return service.get<ChatMessage[]>(
    `/psychological-chat/sessions/${sessionId}/messages`,
  )
}

export const getEmotionalPage = (params: PageQuery) => {
  return service.get<PageResult<Record<string, unknown>>>(
    "/emotion-diary/admin/page",
    { params },
  )
}

export const deleteEmotional = (id: number | string) => {
  return service.delete<null>(`/emotion-diary/admin/${id}`)
}

export const getAnalyticsOverview = () => {
  return service.get<Record<string, unknown>>("/data-analytics/overview")
}

export const logout = () => {
  return service.post<null>("/user/logout")
}
```

- [ ] **Step 3: 删除旧 `.js`**

删除 `src/api/frontend.js`、`src/api/admin.js`。

- [ ] **Step 4: 验证**

```bash
npm run typecheck
```

Expected: `src/api/**/*.ts` 无 error。

---

### Task 5: 迁移 router / stores / main / index.html

**Files:**
- Create: `src/router/index.ts`
- Create: `src/stores/admin.ts`
- Create: `src/main.ts`
- Modify: `index.html`
- Delete: `src/router/index.js`、`src/stores/admin.js`、`src/main.js`

**Interfaces:**
- Consumes: `UserInfo`、`UserType`
- Produces: default `router`；`useAdminStore`；入口模块 `/src/main.ts`

- [ ] **Step 1: 创建 `src/router/index.ts`**

在原 JS 基础上加类型，守卫逻辑与分支保持一致：

```ts
import { createRouter, createWebHistory } from "vue-router"
import type { RouteRecordRaw } from "vue-router"
import BackenLayout from "@/components/BackenLayout.vue"
import AuthLayout from "@/components/AuthLayout.vue"
import FrontendLayout from "@/components/FrontendLayout.vue"
import type { UserInfo } from "@/types/api"

const backendRoutes: RouteRecordRaw[] = [
  {
    path: "/back",
    redirect: "/back/dashboard",
    component: BackenLayout,
    children: [
      {
        path: "dashboard",
        component: () => import("@/views/dashboard.vue"),
        meta: { title: "数据分析", icon: "PieChart" },
      },
      {
        path: "knowledge",
        component: () => import("@/views/knowledge.vue"),
        meta: { title: "知识文章", icon: "ChatLineSquare" },
      },
      {
        path: "consultations",
        component: () => import("@/views/consultations.vue"),
        meta: { title: "咨询记录", icon: "Message" },
      },
      {
        path: "emotional",
        component: () => import("@/views/emotional.vue"),
        meta: { title: "情绪日志", icon: "User" },
      },
    ],
  },
  {
    path: "/auth",
    component: AuthLayout,
    children: [
      {
        path: "login",
        component: () => import("@/views/login.vue"),
        meta: { title: "登录" },
      },
      {
        path: "register",
        component: () => import("@/views/register.vue"),
        meta: { title: "注册" },
      },
    ],
  },
]

const frontendRoutes: RouteRecordRaw[] = [
  {
    path: "/",
    component: FrontendLayout,
    children: [
      { path: "", component: () => import("@/views/home.vue") },
      {
        path: "consultation",
        component: () => import("@/views/consultation.vue"),
      },
      {
        path: "emotion-diary",
        component: () => import("@/views/emotionDairy.vue"),
      },
      {
        path: "knowledge",
        component: () => import("@/views/frontendKnowledge.vue"),
      },
      {
        path: "knowledge/article/:id",
        component: () => import("@/views/articleDetail.vue"),
        props: true,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes: [...backendRoutes, ...frontendRoutes],
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem("token")
  if (token) {
    const raw = localStorage.getItem("userInfo")
    let userInfo: UserInfo | null = null
    try {
      userInfo = raw ? (JSON.parse(raw) as UserInfo) : null
    } catch {
      userInfo = null
    }
    if (userInfo && userInfo.userType == 2) {
      if (to.path.startsWith("/back")) {
        next()
      } else {
        next("/back/dashboard")
      }
    } else if (userInfo && userInfo.userType == 1) {
      if (to.path.startsWith("/back") || to.path.startsWith("/auth")) {
        next("/")
      } else {
        next()
      }
    } else {
      next("/auth/login")
    }
  } else {
    if (to.path.startsWith("/back")) {
      next("/auth/login")
    } else {
      next()
    }
  }
})

export default router
```

注意：原 JS 在 `userInfo` 为 null/损坏时会直接访问 `userInfo.userType` 抛错；TS 版用 try/catch + null 判断，损坏时回登录页。这是安全修正，不改变正常路径。

- [ ] **Step 2: 创建 `src/stores/admin.ts`**

```ts
import { defineStore } from "pinia"
import { ref } from "vue"

export const useAdminStore = defineStore("admin", () => {
  const isCollapse = ref(false)
  const toggleCollapse = () => {
    isCollapse.value = !isCollapse.value
  }
  return {
    isCollapse,
    toggleCollapse,
  }
})
```

- [ ] **Step 3: 创建 `src/main.ts`**

```ts
import { createApp } from "vue"
import ElementPlus from "element-plus"
import "element-plus/dist/index.css"
import "./style.css"
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
```

- [ ] **Step 4: 修改 `index.html`**

将

```html
<script type="module" src="/src/main.js"></script>
```

改为

```html
<script type="module" src="/src/main.ts"></script>
```

- [ ] **Step 5: 删除旧入口 `.js`**

删除 `src/router/index.js`、`src/stores/admin.js`、`src/main.js`。

- [ ] **Step 6: 验证 typecheck**

```bash
npm run typecheck
```

Expected: 无 TS error。若 `vue-tsc` 扫 `.vue`（仍 JS script）报错，收窄 `tsconfig.include` 为 `["src/**/*.ts", "src/env.d.ts"]` 后重跑。

---

### Task 6: 全量验收与文档同步

**Files:**
- Modify: `tsconfig.json`（仅当 Task 5 未收窄 include）
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Task 1–5 产物
- Produces: 可 typecheck、可 build、可 dev 的 TS 核心层

- [ ] **Step 1: 运行 typecheck**

```bash
npm run typecheck
```

Expected: exit code 0。

- [ ] **Step 2: 运行 build**

```bash
npm run build
```

Expected: `vue-tsc` 通过后 `vite build` 产出 `dist/`。

- [ ] **Step 3: 启动 dev（冒烟）**

```bash
npm run dev
```

Expected: Vite 启动无编译错误；打开首页/登录路由资源正常（后端接口失败不视为本轮失败）。结束进程。

- [ ] **Step 4: 更新 `AGENTS.md`**

在 Commands 增加：

```text
npm run typecheck   # vue-tsc --noEmit
npm run build       # vue-tsc --noEmit && vite build
```

Architecture 表将 `main.js` 等路径改为 `.ts`；注明「核心层已 TS；`.vue` 业务页面仍为 JS，后续阶段再迁」；保留 `session_${id}`、字符串 `"200"`、token 头等既有说明。

- [ ] **Step 5: 确认无残留 JS 核心文件**

```powershell
Test-Path src/main.js
Test-Path src/router/index.js
Test-Path src/api/admin.js
Test-Path src/api/frontend.js
Test-Path src/utils/request.js
Test-Path src/config/index.js
Test-Path src/stores/admin.js
```

Expected: 全部为 `False`。

- [ ] **Step 6: （仅当用户要求时）提交**

用户未要求则跳过 git commit。

---

## Self-Review 记录

1. **Spec 覆盖**：脚手架（T1）、类型（T2）、request/config（T3）、api（T4）、router/stores/main/html（T5）、验收+AGENTS（T6）。`.vue` 迁移明确为后续，不在本 plan。
2. **占位符**：无 TBD；每步含可粘贴代码或明确命令。
3. **类型一致性**：`PageResult.records/total`、`LoginResult.token/userInfo`、`ChatSession.id`、API 函数名与现有 `.vue` import 一致；`getSessionDetail` 在 frontend/admin 均保留（与现状重复导出相同）。
