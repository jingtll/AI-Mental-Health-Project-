# dashboard / consultation TypeScript 迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将最后两个 JS 页面 `dashboard.vue`、`consultation.vue` 迁到 TypeScript，使 `src/**` 业务代码全部为 TS。

**Architecture:** 先 dashboard（echarts 类型），再 consultation（SSE 行为不变）。不改协议、不抽 composables。

**Tech Stack:** Vue 3、echarts 6、`@microsoft/fetch-event-source`、已有 `http`/`types`。

**Spec:** `docs/superpowers/specs/2026-01-27-dashboard-consultation-ts-design.md`

## Global Constraints

- 不改 SSE URL / header / `done` 事件 / `session_${id}` 规则
- 不升级 echarts、不重写图表 option 结构
- `lang="ts"` + 语义化类型 + 小步改动
- 验收：`npm run typecheck`、`npm run build`
- 不 commit 除非用户要求

---

### Task 1: dashboard.vue

**Files:**
- Modify: `src/views/dashboard.vue`（仅 script 块；template/style 不动）

**Interfaces:**
- Consumes: `getAnalyticsOverview` → `Promise<Record<string, unknown>>`
- Produces: 无跨文件导出

- [ ] **Step 1: 读入原 script 全文**

打开 `src/views/dashboard.vue`，保留全部 `initEmotionChart` / `initConsultationChart` / `initUserActiveChart` 的 **option 字面量**，只改类型标注与空值防护。

- [ ] **Step 2: 替换 script 头部与状态（在原 option 之前）**

```vue
<script setup lang="ts">
import { getAnalyticsOverview } from "@/api/admin"
import { onMounted, ref } from "vue"
import * as echarts from "echarts"

const iconUrl1 = new URL("@/assets/images/users.png", import.meta.url).href
const iconUrl2 = new URL("@/assets/images/like.png", import.meta.url).href
const iconUrl3 = new URL("@/assets/images/comments.png", import.meta.url).href
const iconUrl4 = new URL("@/assets/images/smile.png", import.meta.url).href

interface TrendPoint {
  date?: string
  avgMoodScore?: number
  recordCount?: number
  sessionCount?: number
  userCount?: number
  [key: string]: unknown
}

interface AnalyticsOverview {
  systemOverview?: {
    totalUsers?: number
    activeUsers?: number
    [key: string]: unknown
  }
  emotionTrend?: TrendPoint[]
  consultationStats?: {
    dailyTrend?: TrendPoint[]
    [key: string]: unknown
  }
  userActivity?: TrendPoint[]
  [key: string]: unknown
}

const aiData = ref<AnalyticsOverview>({})

const emotionChartRef = ref<HTMLDivElement | null>(null)
const consultationChartRef = ref<HTMLDivElement | null>(null)
const userActiveChartRef = ref<HTMLDivElement | null>(null)

let emotionChart: echarts.EChartsType | null = null
let consultationChart: echarts.EChartsType | null = null
let userActiveChart: echarts.EChartsType | null = null

const initCharts = () => {
  initEmotionChart()
  initConsultationChart()
  initUserActiveChart()
}
```

- [ ] **Step 3: 三个 init 图表函数加空值防护（option 原样保留）**

每个函数的数据取值改为：

```ts
// 情绪趋势
const TrendData = aiData.value.emotionTrend ?? []
```

```ts
// 咨询统计
const dailyTrend = aiData.value.consultationStats?.dailyTrend ?? []
```

```ts
// 用户活跃
const activityData = aiData.value.userActivity ?? []
```

`echarts.init(el)` 保持；`dispose` 逻辑保持：

```ts
if (emotionChart) emotionChart.dispose()
emotionChart = echarts.init(emotionChartRef.value)
// ... setOption(option) 原字面量
```

**不要**把 option 改成完整 `EChartsOption` 严格对象；传 `setOption(option)` 即可。

- [ ] **Step 4: onMounted 赋值加收窄**

```ts
onMounted(() => {
  getAnalyticsOverview().then((res) => {
    aiData.value = res as AnalyticsOverview
    initCharts()
  })
})
</script>
```

template 中 `aiData.systemOverview` 等绑定保持；若 typecheck 报可选，改 `aiData.systemOverview?.xxx`（仅 template 可选链）。

- [ ] **Step 5: typecheck**

```bash
npm run typecheck
```

Expected: exit 0。

---

### Task 2: consultation.vue

**Files:**
- Modify: `src/views/consultation.vue`（仅 script）

**Interfaces:**
- Consumes: `startSession`、`getSessionList`、`deleteSession`、`getSessionDetail`、`getSessionEmotion`、`SessionEmotion`、`ChatSession`
- Produces: 无跨文件导出

- [ ] **Step 1: 删除无用 import**

移除 `ROOT_PICKER_IS_DEFAULT_FORMAT_INJECTION_KEY`。

- [ ] **Step 2: script 头部类型与状态（替换现 script 前 ~90 行）**

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue"
import {
  startSession,
  getSessionList,
  deleteSession,
  getSessionDetail,
  getSessionEmotion,
} from "@/api/frontend"
import { ElMessage } from "element-plus"
import MarkdownRenderer from "@/components/MarkdownRenderer.vue"
import { fetchEventSource } from "@microsoft/fetch-event-source"
import type { ChatSession } from "@/types/session"
import type { SessionEmotion } from "@/types/emotion"

const iconUrl = new URL("@/assets/images/robot-fill.png", import.meta.url).href
const iconUrl1 = new URL("@/assets/images/like.png", import.meta.url).href
const iconUrl2 = new URL("@/assets/images/users.png", import.meta.url).href

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

/** startSession 后端返回带 sessionId（不是仅 id） */
interface StartSessionResult {
  sessionId: string
  status: string
  sessionTitle?: string
  [key: string]: unknown
}

const defaultEmotion = (): SessionEmotion & {
  primaryEmotion: string
  emotionScore: number
  isNegative: boolean
  suggestion: string
  riskLevel: number
  improvementSuggestions: string[]
} => ({
  primaryEmotion: "中性",
  emotionScore: 50,
  isNegative: false,
  suggestion: "情绪状态平稳",
  riskLevel: 0,
  improvementSuggestions: [],
})

const currentSession = ref<CurrentSession | null>(null)
const sessionList = ref<ChatSession[]>([])
const messages = ref<UIMessage[]>([])
const userMessage = ref("")
const isAiTyping = ref(false)
const currentEmotion = ref(defaultEmotion())

const createNewFrontendSession = () => {
  currentSession.value = {
    sessionId: `temp_${Date.now()}`,
    status: "Temp",
    sessionTitle: "新对话",
  }
}

const loadSessionEmotion = (sessionId: string | number) => {
  const id = sessionId.toString().startsWith("session_")
    ? sessionId
    : `session_${sessionId}`
  getSessionEmotion(id).then((res) => {
    currentEmotion.value = {
      ...defaultEmotion(),
      ...res,
    }
  })
}

const getIntensityClass = (score: number) => {
  if (score >= 61) return 3
  if (score >= 31) return 2
  return 1
}

const getRiskText = (level: number) => {
  switch (level) {
    case 0:
      return "正常"
    case 1:
      return "关注"
    case 2:
      return "预警"
    case 3:
      return "危机"
    default:
      return "正常"
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    if (userMessage.value.trim() === "") return
    sendMessage()
  }
}
```

- [ ] **Step 3: 发送 / 起会话 / SSE（保留全部业务分支）**

```ts
const sendMessage = () => {
  if (!userMessage.value.trim()) return
  if (isAiTyping.value) {
    ElMessage.error("AI正在输入，请稍后...")
    return
  }
  const message = userMessage.value.trim()
  userMessage.value = ""
  const session = currentSession.value
  if (!session) return
  if (session.status === "Temp") {
    startNewSession(message)
  } else {
    messages.value.push({
      id: Date.now(),
      senderType: 1,
      content: message,
      createdAt: new Date().toISOString(),
    })
    startAIResponse(session.sessionId, message)
  }
}

const startNewSession = (message: string) => {
  const session = currentSession.value
  if (!session) return
  const sessionParams: {
    initialMessage: string
    sessionTitle?: string
  } = {
    initialMessage: message,
  }
  if (session.sessionTitle === "新对话") {
    sessionParams.sessionTitle = `宁渡AI助手 -${new Date().toLocaleString()}`
  } else {
    sessionParams.sessionTitle = session.sessionTitle
  }
  startSession(sessionParams).then((res) => {
    const data = res as unknown as StartSessionResult
    const sessionData: CurrentSession = {
      sessionId: data.sessionId,
      status: data.status,
      sessionTitle: sessionParams.sessionTitle,
    }
    if (currentSession.value && currentSession.value.status === "Temp") {
      Object.assign(currentSession.value, sessionData)
    } else {
      currentSession.value = sessionData
    }
    getSessionPage()
    messages.value.push({
      id: Date.now(),
      senderType: 1,
      content: message,
      createdAt: new Date().toISOString(),
    })
    startAIResponse(currentSession.value!.sessionId, message)
  })
}

const startAIResponse = (sessionId: string, userMsg: string) => {
  if (isAiTyping.value) {
    ElMessage.error("AI助手正在输入，请稍后...")
    return
  }
  isAiTyping.value = true

  const aiMessage: UIMessage = {
    id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    senderType: 2,
    content: "",
    createdAt: new Date().toISOString(),
  }
  messages.value.push(aiMessage)

  const ctrl = new AbortController()
  fetchEventSource("/api/psychological-chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Token: localStorage.getItem("token") ?? "",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      sessionId,
      userMessage: userMsg,
    }),
    signal: ctrl.signal,
    onopen: (response) => {
      if (response.headers.get("content-type") !== "text/event-stream") {
        ElMessage.error("服务器返回的不是流式格式")
      }
    },
    onmessage: (event) => {
      const raw = event.data.trim()
      if (!raw) return
      const eventName = event.event
      const last = messages.value[messages.value.length - 1]
      if (!last) return
      if (eventName === "done") {
        isAiTyping.value = false
        ctrl.abort()
        if (currentSession.value) {
          loadSessionEmotion(currentSession.value.sessionId)
        }
        return
      }
      const payLoad = JSON.parse(raw) as {
        code?: string | number
        message?: string
        data?: { content?: string }
      }
      const ok = String(payLoad.code) === "200"
      if (ok && payLoad.data && payLoad.data.content) {
        last.content += payLoad.data.content
      } else if (!ok) {
        handleError(payLoad.message || "AI回复失败")
      }
    },
    onerror: (err) => {
      handleError((err as Error)?.message || "AI回复失败")
      throw err
    },
    onclose: () => {
      if (currentSession.value) {
        loadSessionEmotion(currentSession.value.sessionId)
      }
    },
  })
}

const handleError = (error: string) => {
  const last = messages.value[messages.value.length - 1]
  if (last) {
    last.content = "AI回复失败，请重试"
  }
  isAiTyping.value = false
  ElMessage.error(error)
}

const getSessionPage = () => {
  getSessionList({ pageNum: 1, pageSize: 10 }).then((res) => {
    sessionList.value = res.records || []
  })
}

const handleSessionClick = (session: ChatSession) => {
  getSessionDetail(session.id).then((res) => {
    messages.value = (res || []) as UIMessage[]
  })
  loadSessionEmotion(session.id)
  currentSession.value = {
    sessionId: `session_${session.id}`,
    status: "ACTIVE",
    sessionTitle: session.sessionTitle,
  }
}

const handleDeletSession = (sessionId: number | string) => {
  deleteSession(sessionId).then(() => {
    ElMessage.success("删除成功")
    getSessionPage()
  })
}

const formatMessageContent = (content: string) => {
  return content.replace(/\n/g, "<br>")
}

onMounted(() => {
  getSessionPage()
  createNewFrontendSession()
})
</script>
```

**执行注意：**
1. 原文件 `onMounted` 之后若还有逻辑，全部保留并只加类型。
2. SSE 的 URL、`Token` 头、`done`、`session_` 前缀 **禁止改**。
3. `startSession` 的 `res` 用 `as unknown as StartSessionResult` 是因 API 声明为 `ChatSession`（含 `id`）而后端起会话返回 `sessionId`；注释说明即可，不要改 `api/frontend.ts` 除非 typecheck 逼迫。
4. template/样式整段不动。

- [ ] **Step 4: typecheck**

```bash
npm run typecheck
```

Expected: exit 0。若 template 对 `currentSession` 判空报错，仅在 template 使用可选链（如 `currentSession?.status`），逻辑分支保持。

---

### Task 3: 全量验收与文档

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: typecheck + build**

```bash
npm run typecheck
npm run build
```

Expected: 两者 exit 0。

- [ ] **Step 2: 更新 AGENTS.md**

将「除 dashboard/consultation 外」改为：**全部 `src/**` 业务代码已 TypeScript**（`.vue` 均 `lang="ts"`）。

- [ ] **Step 3: 冒烟（dev 存在时）**

- `/back/dashboard`：统计卡片与图表容器渲染
- `/consultation`：会话列表、新对话输入框；发送消息依赖后端 SSE

---

## Self-Review 记录

1. **Spec 覆盖**：dashboard 与 consultation 均有完整 Task；AGENTS 同步在 Task 3。
2. **占位符**：图表 option「原样保留」指打开源文件复制，不是未实现逻辑。
3. **类型一致性**：`CurrentSession`/`UIMessage`/`StartSessionResult` 在 Task 2 内自洽；dashboard 的 `TrendPoint` 覆盖三类数组字段。
