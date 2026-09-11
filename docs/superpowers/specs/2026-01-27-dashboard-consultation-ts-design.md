# TypeScript 最后两页迁移设计（dashboard / consultation）

- 日期：2026-01-27
- 状态：已确认
- 前置：核心层、组件层、其余 9 个 views 已 TS

## 目标

将仅剩的 `dashboard.vue` 与 `consultation.vue` 迁到 TypeScript，完成后项目 `src/**` 业务代码全部使用 TS。

验收：

1. 两页各自 `npm run typecheck` 通过
2. `npm run build` 通过
3. `/back/dashboard` 图表可渲染；`/consultation` 列表与发消息 UI 正常（后端 SSE 失败不计入前端迁移失败）

## 非目标

- 不升级 echarts / 不重写图表配置
- 不改 SSE 协议、URL、header、`session_${id}` 规则
- 不抽 composables、不改 API 契约

## 范围与顺序

| 批次 | 文件 | 体量 | 要点 |
|------|------|------|------|
| 1 | `src/views/dashboard.vue` | ~600 行 | echarts 实例类型 + overview 数据类型 |
| 2 | `src/views/consultation.vue` | ~1660 行 | 会话/消息/SSE/情绪面板类型 |

先 dashboard，后 consultation；每批结束后 typecheck。

## 批次 1：dashboard

- `<script setup lang="ts">`
- `import * as echarts from "echarts"`；实例用 `echarts.EChartsType | null`
- `emotionChartRef` 等：`ref<HTMLDivElement | null>(null)`
- 本地 `AnalyticsOverview`：

```ts
interface AnalyticsOverview {
  systemOverview?: {
    totalUsers?: number
    activeUsers?: number
    [key: string]: unknown
  }
  emotionTrend?: Array<{
    date?: string
    avgMoodScore?: number
    recordCount?: number
    [key: string]: unknown
  }>
  [key: string]: unknown
}
```

- `aiData = ref<AnalyticsOverview>({})`
- `TrendData`：`const TrendData = aiData.value.emotionTrend ?? []`，避免 map 空值
- `getAnalyticsOverview()` 已是 `Promise<Record<string, unknown>>`，赋值时 `as AnalyticsOverview`
- `dispose` / `setOption` 逻辑不变；option 对象保持原字面量

## 批次 2：consultation

### 本地类型（写在组件内）

```ts
interface CurrentSession {
  sessionId: string
  status: "Temp" | "ACTIVE" | string
  sessionTitle?: string
  id?: number | string
  [key: string]: unknown
}

interface UIMessage {
  id: number | string
  senderType: 1 | 2
  content: string
  createdAt: string
}
```

`currentEmotion` 可复用 `SessionEmotion`（`@/types/emotion`）并补默认字段。

### 关键标注

- `currentSession = ref<CurrentSession | null>(null)`
- `sessionList = ref<ChatSession[]>([])` 或本地宽类型
- `messages = ref<UIMessage[]>([])`
- `userMessage = ref("")`
- `isAiTyping = ref(false)`
- `handleKeyDown = (e: KeyboardEvent) => { ... }`
- `loadSessionEmotion(sessionId: string | number)`：保留 `session_` 前缀逻辑
- `createNewFrontendSession`：`temp_${Date.now()}` 与 `status: "Temp"` 不变

### SSE（禁止改协议）

```ts
fetchEventSource("/api/psychological-chat/stream", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Token: localStorage.getItem("token") ?? "",
    Accept: "text/event-stream",
  },
  body: JSON.stringify({ sessionId, userMessage }),
  signal: ctrl.signal,
  onopen: (response) => { /* content-type 检查不变 */ },
  onmessage: (event) => {
    const raw = event.data.trim()
    const eventName = event.event
    // done → 结束 isAiTyping + abort
    // JSON.parse 后按 code "200" 追加 content
  },
  onerror / onclose: 与现实现一致
})
```

若 `fetchEventSource` 回调类型不全，局部标注 `event: { data: string; event?: string }` 或包自带类型。

### 清理

- 删除未使用 import：`ROOT_PICKER_IS_DEFAULT_FORMAT_INJECTION_KEY`
- 模板/样式不改

## 验收流程

1. Task dashboard → `npm run typecheck`
2. Task consultation → `npm run typecheck`
3. `npm run build`
4. 浏览器：`/back/dashboard`、`/consultation`（登录后）
5. 更新 `AGENTS.md`：业务代码已全部 TS

## 风险

| 风险 | 缓解 |
|------|------|
| echarts option 与类型摩擦 | option 保持 `object` 字面量传入 `setOption`，不强行完整 `EChartsOption` |
| consultation 状态多 | 只标 ref/函数签名，不重写流程 |
| SSE onmessage 动态 JSON | `JSON.parse` 后收窄 `code` 字符串判断，与现实现一致 |
