# TypeScript 核心层迁移设计（方案 A）

- 日期：2026-01-27
- 状态：已确认
- 范围：脚手架 + 基础设施/核心层；本轮不迁 `.vue` 业务页面

## 目标

在不改动 `.vue` 业务页面的前提下，将基础设施层迁到 TypeScript，并使 `npm run build` 强制通过类型检查。

验收：

1. `npm run typecheck` 通过
2. `npm run build` 通过（`vue-tsc --noEmit && vite build`）
3. `npm run dev` 可启动；路由与页面资源正常加载
4. 运行时行为与现状一致（token、userType、`/api` 代理、SSE、`session_${id}`）

## 非目标（本轮刻意不做）

- 不给任何 `.vue` 加 `lang="ts"`
- 不重写咨询流 / SSE
- 不新增 ESLint / 测试
- 不升级业务依赖大版本
- 不改后端契约

## 约束与决策

| 项 | 决策 |
|----|------|
| 严格度 | `strict: true`；无法立刻收敛处局部放宽并注明原因 |
| 构建 | `build` 强制类型检查：`vue-tsc --noEmit && vite build` |
| 迁移粒度 | 一次迁完核心层，`.vue` 后续再做 |
| 包管理 | npm（已有 `package-lock.json`） |
| 后端依赖 | 类型不依赖运行时后端可达；仅启动/联调需要网络 |

## 新增依赖

devDependencies：

- `typescript`
- `vue-tsc`

可选：若后续把 `vite.config` 迁成 `.ts` 且需要 `node` 类型，再补 `@types/node`。本轮保持 `vite.config.js` 不变。

## 配置变更

### `tsconfig.json`（新建）

- `strict: true`
- `noEmit: true`
- `paths`: `@/*` → `src/*`
- 对齐 Vite + Vue 3 官方模板的 module / moduleResolution / target
- 包含 `src/**/*.ts` 与入口声明；`.vue` 内仍为 JS script，不强制改写

### `src/env.d.ts`（新建）

`/// <reference types="vite/client" />`

### `package.json` scripts

- `dev`: `vite`
- `build`: `vue-tsc --noEmit && vite build`
- `preview`: `vite preview`
- `typecheck`: `vue-tsc --noEmit`

### `vite.config.js`

本轮不改。`@` 别名、`/api` 代理目标保持原样。

## 核心文件迁移清单

| 现路径 | 目标 | 要点 |
|--------|------|------|
| `src/config/index.js` | `src/config/index.ts` | `fileBaseUrl` 常量 |
| `src/utils/request.js` | `src/utils/request.ts` | 拦截器 + `ApiResponse<T>`；成功返回业务 `T` |
| `src/api/frontend.js` | `src/api/frontend.ts` | 用户端 API 泛型 |
| `src/api/admin.js` | `src/api/admin.ts` | 管理端 API 泛型 |
| `src/router/index.js` | `src/router/index.ts` | `userType` 类型；守卫逻辑不变 |
| `src/stores/admin.js` | `src/stores/admin.ts` | setup store |
| `src/main.js` | `src/main.ts` | 入口；`index.html` 引用需同步改 |

改名后删除对应 `.js`，避免双份入口。

## 新建类型目录 `src/types/`

最小可用集，不一次写死全量后端 DTO。

### `src/types/api.ts`

- `UserType = 1 | 2`
- `UserInfo`：至少包含 `username`、`userType`，按现有页面实际用到的字段补齐
- `ApiResponse<T>`：`code: string`（后端使用 `"200" | "-1"` 字符串，不是 number）、`msg?`、`data: T`
- `LoginResult`：`token` + `userInfo`

### `src/types/session.ts` / `src/types/emotion.ts`

按 `api/frontend`、`consultation`、`emotionDairy` 实际消费字段抽最小 interface（session 列表项、消息、情绪分析结果）。字段未知处用可选属性，禁止臆造。

## `request.ts` 类型契约（关键）

现状行为必须保留：

- `baseURL` = `/api`，timeout 5000
- 请求头 `token` 来自 `localStorage`
- `code === "200"` → 返回 `response.data.data`
- `code === "-1"`：
  - 非 `/login`：提示 + 清 token + 跳转 `/auth/login`
  - `/login`：提示 + `Promise.reject`
- 其他 code：当前实现返回完整 `response`（行为不理想）

类型化目标：

- 对外 API 函数声明为 `Promise<T>`（业务 data）
- 成功路径 `return data.data as T`
- 其他 code：保持 reject 或与调用方约定的错误处理；**不要**再返回完整 `AxiosResponse` 却假装是业务数据。若必须兼容旧行为，在迁移时给不成功路径明确 `Promise` rejection，并检查调用方是否依赖“非 200 仍 resolve”的异常分支。

## 架构不变项

```text
index.html
  → src/main.ts
      → router (FrontendLayout / BackenLayout / AuthLayout)
      → pinia
      → Element Plus（全局）
页面 .vue（仍 JS）
  → @/api/*.ts
  → @/utils/request.ts
  → /api/*  (dev proxy → http://159.75.169.224:1235)
consultation.vue
  → @microsoft/fetch-event-source（不经 axios）
```

- 登录态：`localStorage` 的 `token` + `userInfo`
- `userType`：`1` 前台用户，`2` 管理员；`/back/*` 守卫逻辑不变
- 文件 URL：`src/config` 的 `fileBaseUrl` 前缀拼接封面路径
- SSE：`POST /api/psychological-chat/stream`，Header `Token`；会话情绪接口使用 `session_${id}` 前缀

## 错误处理与放宽策略

- 类型一时过不去：局部 `// @ts-expect-error` 或在该文件 `as` 旁注释原因；禁止全局关掉 `strict`
- 第三方类型缺口：允许在调用点 `as` 收窄，不引入整个包的 `any` 传播
- `vue-tsc` 对未迁移 `.vue` 的噪音：优先保证 `.ts` 与 typecheck 命令绿；必要时收窄 tsconfig `include` 至 `src/**/*.ts` + `env.d.ts`，并在文档注明「后续迁 `.vue` 时再扩大 include」

## 后续阶段（不在本轮）

1. 布局与小组件加 `<script setup lang="ts">`
2. 管理页（knowledge / dashboard / emotional / consultations）
3. 前台页（home / knowledge / emotion diary / login / register）
4. 最后处理 `consultation.vue`（体量大、SSE + 临时会话）

## 风险

| 风险 | 缓解 |
|------|------|
| `request` 拦截器成功/失败返回值不一致 | 先写 `ApiResponse`/`T`，调用方按 `.then(res => res.xxx)` 假设校验 |
| `build` 强制类型导致中途无法出包 | 开发过程用 `npm run typecheck` 频繁跑；merge 前 build 必绿 |
| `index.html` 仍指向 `main.js` | 与 `main.ts` 同步改 |
| 后端字段与手写类型漂移 | 类型保持最小集，字段可选；以后以 Apifox 为准补全 |
