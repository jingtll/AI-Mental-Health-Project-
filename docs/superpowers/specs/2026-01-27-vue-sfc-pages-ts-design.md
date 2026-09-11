# Vue 页面层 TypeScript 迁移设计（第二轮）

- 日期：2026-01-27
- 状态：已确认
- 前置：核心层 + 组件层已 TS；`http` 返回 `Promise<T>`（拦截器已拆包）

## 目标

将除 `dashboard` / `consultation` 外的 9 个页面迁到 TypeScript，运行时行为保持可用。

验收：

1. `npm run typecheck` 通过
2. `npm run build` 通过
3. 登录、注册跳转、知识库列表/详情、情绪日记表单、管理端三页表格可渲染

## 非目标

- 不迁 `dashboard.vue`、`consultation.vue`
- 不新增 composables 大重构、不改路由与 API 契约
- 不升级 echarts / Element Plus 大版本
- 不新增测试框架

## 范围

| 批次 | 文件 | 要点 |
|------|------|------|
| 1 | `login.vue` / `register.vue` / `home.vue` | `FormInstance`、`LoginResult`；修 register 对拆包返回值的用法 |
| 2 | `knowledge.vue` / `consultations.vue` / `emotional.vue` | `PageResult`、`SearchFormItem`、ArticleDialog `modelValue` |
| 3 | `frontendKnowledge.vue` / `articleDetail.vue` / `emotionDairy.vue` | 列表/详情/日记表单 |

## 已知必须修的类型/契约问题

### `register.vue` 成功回调写错

现状：

```js
register(formData).then(({ data }) => {
  if (!data) { ElMessage.success("注册成功") }
  if (data.code === "BUSINESS_ERROR") { ... }
})
```

`register` 已是 `http.post<string | null>`，resolve 的是业务 `data`（成功时常见为 `null` 或字符串），**不是** `{ data, code }` 包装。

迁移时改为：

```ts
register(formData).then((data) => {
  if (data == null || data === "") {
    ElMessage.success("注册成功")
    router.push("/auth/login")
    return
  }
  // 若后端成功路径返回其它非错误值，按实际接口处理；错误路径依赖拦截器 reject + ElMessage
})
```

不要保留对 `data.code` / `data.message` 的解构（那是旧未拆包假设）。

### `login.vue`

`login` 返回 `LoginResult`：`{ token, userInfo }`。用 `FormInstance`；`userType === 2` 判断保留。

### `ArticleDialog` 已改为 `v-model` / `modelValue`

`knowledge.vue` 若仍传 `:visible`，本轮改为 `v-model`（与组件契约一致）。

## 类型化约定

1. `<script setup lang="ts">`
2. `import type { FormInstance, FormRules } from "element-plus"` 等
3. 列表：`PageResult<T>` / 现有 `ChatSession`、`Record<string, unknown>` 等
4. 搜索：复用 `@/components/TableSearch.vue` 导出的 `SearchFormItem`（若 import 困难则本地复制同名 interface，字段一致）
5. `defineProps` 类型式（`articleDetail` 的 `id`）
6. `ref`/`reactive` 对表单、分页、列表显式标注
7. 第三方缺口：调用点 `as` + 注释；禁止全局 any
8. 模板与样式默认不动；仅类型/契约必需时最小改

## 执行策略

- 批次 1/2/3 各跑一次 `npm run typecheck`；结束跑 `npm run build`
- 浏览器冒烟：登录 → 前台三页；管理端三页（可用现有 token）
- 不 commit 除非用户要求

## 架构不变项

```text
views (TS)
  → api/*.ts → http → /api proxy
  → components/* (已 TS)
  → types/* 
consultation.vue / dashboard.vue 仍 JS
```

## 后续阶段（不在本轮）

1. `dashboard.vue`（echarts 大配置）
2. `consultation.vue`（SSE + 临时会话，约 1650 行）
