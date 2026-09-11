# Vue SFC 组件层 TypeScript 迁移设计

- 日期：2026-01-27
- 状态：已确认
- 前置：核心层已 TS（config / request / api / router / stores / main / vite.config）

## 目标

将组件层 `.vue` 迁到 TypeScript：`<script setup lang="ts">` + 类型化 `defineProps` / `defineEmits`，并保持运行时行为不变。

验收：

1. `npm run typecheck` 通过
2. `npm run build` 通过
3. 侧栏折叠、TableSearch 搜索触发、ArticleDialog 开关等组件交互正常

## 非目标

- 不迁 `src/views/*` 页面（含 `consultation.vue`）
- 不重命名文件、不改路由、不改 API 契约
- 不重做样式或 template 结构（类型要求的最小改动除外）
- 不新增 ESLint / 测试框架

## 范围

本轮 **10 个文件**，按依赖顺序分批：

| 批次 | 文件 | 要点 |
|------|------|------|
| 1 | `src/App.vue` | 仅 `router-view` |
| 2 | `src/components/AuthLayout.vue` | 认证布局壳 |
| 2 | `src/components/BackenLayout.vue` | 后台壳；文件名拼写保持 `Backen` |
| 2 | `src/components/FrontendLayout.vue` | 前台壳；用 pinia store |
| 3 | `src/components/PageHead.vue` | options 式 props → 类型式 |
| 3 | `src/components/Navbar.vue` | 顶栏 / 退出登录 |
| 3 | `src/components/Sidebar.vue` | 菜单；读路由 `meta` |
| 3 | `src/components/TableSearch.vue` | 搜索表单 + `search` emit |
| 4 | `src/components/MarkdownRenderer.vue` | markdown 渲染 props |
| 4 | `src/components/ArticleDialog.vue` | 文章弹窗；上传封面 |
| 4 | `src/components/RichTextEditor.vue` | wangEditor；可能需局部 `as` |

**明确不在本轮**：`src/views/**` 全部页面。

## 类型化约定

1. `<script setup>` → `<script setup lang="ts">`
2. `defineProps({ ... })` → `defineProps<{ ... }>()`；需要默认值时用 `withDefaults(defineProps<...>(), { ... })`
3. `defineEmits(["x"])` → `defineEmits<{ x: [...payload] }>()`
4. `defineExpose` 保持现有暴露面，补方法签名
5. `ref` / `reactive`：非显然类型显式标注（列表、表单、Map）
6. 优先复用 `src/types/api.ts`、`session.ts`、`emotion.ts`；组件私有类型写在组件文件内
7. 第三方类型缺口（wangEditor 等）：调用点 `as` 收窄 + 注释原因，禁止全局 `any`

## 执行策略

- 每批次完成后运行 `npm run typecheck`；批次 4 结束后跑 `npm run build`
- 页面仍为 JS SFC；组件加 TS 不强制改页面
- 若 JS 页面对 TS 组件传参不匹配：组件类型保持正确契约；问题记到下一轮页面迁移

## 架构不变项

```text
App.vue
 ├─ AuthLayout      → login/register（页面仍 JS）
 ├─ BackenLayout    → Navbar + Sidebar + router-view
 └─ FrontendLayout  → Navbar + router-view
PageHead / TableSearch ← 管理页调用（仍 JS）
ArticleDialog / RichTextEditor ← knowledge 等页调用
MarkdownRenderer ← 文章详情等
```

- Pinia：仅 `useAdminStore`（`isCollapse`）
- 登录态、token、`userType` 路由守卫逻辑不变
- `BackenLayout.vue` 文件名故意拼错，禁止改名

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| JS 页面对 TS 组件传参不匹配 | 组件侧类型正确；typecheck 会检查 TS 调用方，JS 页面暂不强制 |
| wangEditor 类型不完整 | `RichTextEditor` 局部 `as` + 注释 |
| Sidebar 读 `route.meta` | 扩展 `RouteMeta` 或本地 interface 声明 title/icon |
| ArticleDialog 上传/封面 URL | 对齐 `fileBaseUrl` 与 `uploadFile` 返回 `{ filePath }` |

## 后续阶段（不在本轮）

1. 简单页面：`login` / `register` / `home`
2. 管理页：`knowledge` / `consultations` / `emotional` / `dashboard`
3. 前台页：`frontendKnowledge` / `articleDetail` / `emotionDairy`
4. 最后：`consultation.vue`（SSE + 临时会话，约 1650 行）
