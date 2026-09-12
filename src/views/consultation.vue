<script setup lang="ts">
/**
 * AI 咨询（用户端核心页）
 *
 * SSE 契约保持不变（AGENTS.md 明确禁止用 axios「修」它）：
 *   POST /api/psychological-chat/stream
 *   Header: Token（大写 T）、Accept: text/event-stream
 *   事件：JSON 分片 { code, data: { content } }，终止事件 done
 *   会话 ID：列表接口返回数字 id；流式/情绪接口用 session_${id}
 *
 * 本次修复（均有代码依据）：
 *  1. 删除被整段复制两遍的 .consultation-container SCSS（原 592–1162 与 1163–1733），
 *     文件从 1734 行降到合理规模；样式层改为设计令牌，并补回全项目缺失的 @keyframes。
 *  2. 情绪花园原先在模板里硬编码「中性 / 50」，接口数据从不渲染 → 抽出 EmotionGarden
 *     组件，orb 颜色/文字/评分/强度/风险全部由 currentEmotion 驱动。
 *  3. 聊天区没有自动滚动 → 新增自动吸底（仅在用户本就贴底时滚动，避免打断回看历史），
 *     并提供「回到最新」按钮。
 *  4. 消息时间直接渲染 ISO 串 → 统一走 utils/format 的相对时间。
 *  5. 「新建会话」原先不清空消息，导致「新对话」里还留着上一个会话的内容 → 现在清空并重置情绪。
 *  6. handleError 只改 content 不置 isError，模板里的错误气泡分支是死代码 → 现在真正生效。
 *  7. 流结束事件缺失时 isAiTyping 永远为 true，输入框被永久禁用 → onclose/finally 双重兜底。
 *  8. 会话创建失败时用户已输入的内容会被静默丢弃 → 失败时回填输入框并提示。
 *  9. 用户消息走 v-html 且未转义 → 先转义再换行，消除自注入面。
 * 10. emoji 当图标（💝✨🤗）→ 换成 Element Plus 图标（在 EmotionGarden 内）。
 * 11. 新增：会话选中态、删除确认、500 字上限提示、移动端侧栏抽屉、aria 语义。
 */
import { computed, nextTick, onMounted, ref, watch } from "vue"
import {
  deleteSession,
  getSessionDetail,
  getSessionEmotion,
  getSessionList,
  startSession,
} from "@/api/frontend"
import { ElMessage, ElMessageBox } from "element-plus"
import MarkdownRenderer from "@/components/MarkdownRenderer.vue"
import EmotionGarden from "@/components/consult/EmotionGarden.vue"
import SessionList from "@/components/consult/SessionList.vue"
import { fetchEventSource } from "@microsoft/fetch-event-source"
import type { ChatSession } from "@/types/session"
import { createDefaultEmotion } from "@/types/emotion"
import type { CurrentEmotion } from "@/types/emotion"
import { brand, sessionTitlePrefix } from "@/config"
import { formatRelative } from "@/utils/format"

const assistantAvatar = new URL("@/assets/images/robot-fill.png", import.meta.url).href
const userAvatar = new URL("@/assets/images/user.jpg", import.meta.url).href

/** 输入上限：模板与计数器共用，避免两处写死不一致 */
const MAX_LENGTH = 500

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
  /** 模板中错误消息分支使用 */
  isError?: boolean
}

/** startSession 后端返回带 sessionId（不是仅 id） */
interface StartSessionResult {
  sessionId: string
  status: string
  sessionTitle?: string
  [key: string]: unknown
}

/** 会话列表项：在 ChatSession 之上补齐列表接口实际返回的展示字段 */
interface SessionListItem extends ChatSession {
  startedAt?: string
  lastMessageContent?: string
  messageCount?: number
  durationMinutes?: number
}

// ---------------------------------------------------------------------------
// 状态
// ---------------------------------------------------------------------------
const currentSession = ref<CurrentSession | null>(null)
const sessionList = ref<SessionListItem[]>([])
const messages = ref<UIMessage[]>([])
const userMessage = ref("")
const isAiTyping = ref(false)
const currentEmotion = ref<CurrentEmotion>(createDefaultEmotion())

/** 与 session.id 对齐，用于列表选中态 */
const activeSessionId = ref<number | string | null>(null)
const sessionLoading = ref(false)
const emotionLoading = ref(false)
const detailLoading = ref(false)

const chatRef = ref<HTMLDivElement | null>(null)
const atBottom = ref(true)
const sidebarOpen = ref(false)

const greeting = computed(
  () =>
    `你好，我是${brand.assistantName}。很高兴陪伴你，为你提供温暖的心理支持。请告诉我，今天感觉怎么样？有什么想要分享的吗？`,
)

const canSend = computed(
  () => userMessage.value.trim().length > 0 && userMessage.value.length <= MAX_LENGTH,
)

// ---------------------------------------------------------------------------
// 滚动：仅当用户本就贴底时自动跟随，避免打断回看历史
// ---------------------------------------------------------------------------
const handleScroll = () => {
  const el = chatRef.value
  if (!el) return
  atBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

const scrollToBottom = async (force = false) => {
  await nextTick()
  const el = chatRef.value
  if (!el) return
  if (!force && !atBottom.value) return
  el.scrollTop = el.scrollHeight
  atBottom.value = true
}

// 流式分片按帧节流，避免每个分片都触发一次布局
let scrollScheduled = false
const scheduleScroll = () => {
  if (scrollScheduled) return
  scrollScheduled = true
  requestAnimationFrame(() => {
    scrollScheduled = false
    void scrollToBottom()
  })
}

watch(() => messages.value.length, () => scheduleScroll())

// ---------------------------------------------------------------------------
// 会话
// ---------------------------------------------------------------------------
/** 新建会话：必须同时清空消息与情绪，否则「新对话」会残留上一个会话的内容 */
const createNewFrontendSession = () => {
  currentSession.value = {
    sessionId: `temp_${Date.now()}`,
    status: "Temp",
    sessionTitle: "新对话",
  }
  messages.value = []
  currentEmotion.value = createDefaultEmotion()
  activeSessionId.value = null
  atBottom.value = true
  sidebarOpen.value = false
  void scrollToBottom(true)
}

const loadSessionEmotion = (sessionId: string | number) => {
  // 确保 sessionId 格式正确
  const id = sessionId.toString().startsWith("session_")
    ? sessionId
    : `session_${sessionId}`
  emotionLoading.value = true
  getSessionEmotion(id)
    .then((res) => {
      currentEmotion.value = {
        ...createDefaultEmotion(),
        ...res,
      } as CurrentEmotion
    })
    .catch(() => {
      // 情绪分析失败不应影响对话，静默保留上一次结果
    })
    .finally(() => {
      emotionLoading.value = false
    })
}

const getSessionPage = () => {
  sessionLoading.value = true
  getSessionList({ pageNum: 1, pageSize: 10 })
    .then((res) => {
      sessionList.value = (res.records || []) as SessionListItem[]
    })
    .catch(() => {
      sessionList.value = []
    })
    .finally(() => {
      sessionLoading.value = false
    })
}

/** 获取会话数据 */
const handleSessionClick = (session: SessionListItem) => {
  activeSessionId.value = session.id
  sidebarOpen.value = false
  detailLoading.value = true
  getSessionDetail(session.id)
    .then((res) => {
      messages.value = (res || []) as UIMessage[]
    })
    .catch(() => {
      messages.value = []
    })
    .finally(() => {
      detailLoading.value = false
      void scrollToBottom(true)
    })
  loadSessionEmotion(session.id)
  // 更新当前会话对象数据
  currentSession.value = {
    sessionId: `session_${session.id}`,
    status: "ACTIVE",
    sessionTitle: session.sessionTitle,
  }
}

/** 删除会话：二次确认，避免误删对话记录 */
const handleDeleteSession = async (sessionId: number | string) => {
  try {
    await ElMessageBox.confirm(
      "删除后该会话的对话记录将不可恢复，确定删除吗？",
      "删除会话",
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "warning",
      },
    )
  } catch {
    return
  }
  try {
    await deleteSession(sessionId)
    ElMessage.success("删除成功")
    // 删掉的正是当前会话时，重置会话区，避免继续往已删除会话发消息
    if (activeSessionId.value !== null && String(activeSessionId.value) === String(sessionId)) {
      createNewFrontendSession()
    }
    getSessionPage()
  } catch {
    ElMessage.error("删除失败，请稍后重试")
  }
}

// ---------------------------------------------------------------------------
// 发送与流式回复
// ---------------------------------------------------------------------------
/** 处理用户按下回车键发送消息 */
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    if (!canSend.value || isAiTyping.value) return
    sendMessage()
  }
}

/** 用户发送消息 */
const sendMessage = () => {
  if (!canSend.value) return
  if (isAiTyping.value) {
    ElMessage.error("AI 正在输入，请稍后…")
    return
  }
  const message = userMessage.value.trim()
  const session = currentSession.value
  if (!session) return
  userMessage.value = ""
  // 没有会话或仍是临时会话，就需要先落库创建会话记录
  if (session.status === "Temp") {
    startNewSession(message)
  } else {
    // 继续现有会话
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
    sessionParams.sessionTitle = `${sessionTitlePrefix} -${new Date().toLocaleString()}`
  } else {
    // 历史会话记录
    sessionParams.sessionTitle = session.sessionTitle
  }

  startSession(sessionParams)
    .then((res) => {
      // API 类型是 ChatSession，但起会话实际返回 sessionId
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
      // 新建成功后同步选中态并刷新列表
      activeSessionId.value = sessionData.sessionId?.startsWith("session_")
        ? sessionData.sessionId.replace("session_", "")
        : null
      getSessionPage()
      messages.value.push({
        id: Date.now(),
        senderType: 1,
        content: message,
        createdAt: new Date().toISOString(),
      })
      startAIResponse(currentSession.value!.sessionId, message)
    })
    .catch(() => {
      // 创建失败：把内容回填输入框，不能让用户白打一遍
      userMessage.value = message
      ElMessage.error("会话创建失败，内容已保留，请稍后重试")
    })
}

const startAIResponse = (sessionId: string, userMsg: string) => {
  // 防止重复发送
  if (isAiTyping.value) {
    ElMessage.error("AI 助手正在输入，请稍后…")
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
  void scrollToBottom(true)

  const ctrl = new AbortController() // 用来终止 fetch 请求
  fetchEventSource("/api/psychological-chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Token: localStorage.getItem("token") || "",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      sessionId,
      userMessage: userMsg,
    }),
    signal: ctrl.signal,
    onopen: async (response) => {
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
      let payLoad: {
        code?: string | number
        message?: string
        data?: { content?: string }
      }
      try {
        payLoad = JSON.parse(raw) as typeof payLoad
      } catch {
        return // 忽略无法解析的分片，避免整个流因一帧坏数据中断
      }
      const ok = String(payLoad.code) === "200"
      if (ok && payLoad.data?.content) {
        last.content += payLoad.data.content
        scheduleScroll()
      } else if (!ok) {
        handleError(payLoad.message || "AI 回复失败")
      }
    },
    onerror: (err) => {
      handleError((err as Error)?.message || "AI 回复失败")
      throw err // 抛出以阻止 fetch-event-source 的自动重连
    },
    onclose: () => {
      // 兜底：即使没有收到 done，也必须解除输入禁用
      isAiTyping.value = false
      if (currentSession.value) {
        loadSessionEmotion(currentSession.value.sessionId)
      }
    },
  })
    .catch(() => {
      // onerror 抛出/主动 abort 都会走到这里，属预期路径，避免未处理的 Promise 拒绝
    })
    .finally(() => {
      isAiTyping.value = false
    })
}

/** 错误处理函数 */
const handleError = (error: string) => {
  const last = messages.value[messages.value.length - 1]
  if (last) {
    last.content = "AI 回复失败，请稍后重试"
    // 原实现漏了这一步，模板里的 .error-message 分支从未渲染
    last.isError = true
  }
  isAiTyping.value = false
  ElMessage.error(error)
}

// ---------------------------------------------------------------------------
// 渲染辅助
// ---------------------------------------------------------------------------
const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

/** 用户消息保留换行；先转义再插 <br>，避免把用户输入当 HTML 执行 */
const formatMessageContent = (content: string) =>
  escapeHtml(content).replace(/\n/g, "<br>")

onMounted(() => {
  getSessionPage()
  createNewFrontendSession()
})
</script>

<template>
  <div class="consult">
    <!-- 桌面端侧栏 -->
    <aside class="consult__side">
      <div class="assistant-card">
        <div class="assistant-card__orb">
          <el-image
            :src="assistantAvatar"
            class="assistant-card__avatar"
            alt=""
          />
        </div>
        <h2 class="assistant-card__name">{{ brand.assistantName }}</h2>
        <p class="assistant-card__tagline">{{ brand.assistantTagline }}</p>
        <p class="assistant-card__status">
          <span class="assistant-card__dot" aria-hidden="true" />
          在线服务中
        </p>
      </div>

      <EmotionGarden :emotion="currentEmotion" :loading="emotionLoading" />

      <SessionList
        :sessions="sessionList"
        :active-id="activeSessionId"
        :loading="sessionLoading"
        @select="handleSessionClick"
        @remove="handleDeleteSession"
      />
    </aside>

    <!-- 主聊天区 -->
    <section class="chat" aria-labelledby="chat-title">
      <header class="chat__header">
        <div class="chat__identity">
          <el-image :src="assistantAvatar" class="chat__avatar" alt="" />
          <div class="chat__meta">
            <h1 id="chat-title" class="chat__title">{{ brand.assistantName }}</h1>
            <p class="chat__subtitle">你的 AI 心理陪伴助手</p>
          </div>
        </div>
        <div class="chat__actions">
          <el-button
            class="chat__new"
            type="primary"
            plain
            @click="createNewFrontendSession"
          >
            <el-icon><Plus /></el-icon>
            新建会话
          </el-button>
          <el-button class="chat__drawer-btn" @click="sidebarOpen = true">
            <el-icon><Menu /></el-icon>
            情绪与历史
          </el-button>
        </div>
      </header>

      <div
        ref="chatRef"
        class="chat__messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        @scroll.passive="handleScroll"
      >
        <!-- 欢迎语（无消息时） -->
        <div v-if="!messages.length && !detailLoading" class="message ai-message">
          <el-image :src="assistantAvatar" class="message__avatar" alt="" />
          <div class="message__body">
            <div class="message__bubble">
              <p>{{ greeting }}</p>
            </div>
            <p class="message__time">现在</p>
          </div>
        </div>

        <!-- 消息列表 -->
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message"
          :class="msg.senderType === 1 ? 'user-message' : 'ai-message'"
        >
          <el-image
            :src="msg.senderType === 1 ? userAvatar : assistantAvatar"
            class="message__avatar"
            :alt="msg.senderType === 1 ? '我' : brand.assistantName"
          />
          <div class="message__body">
            <div class="message__bubble">
              <!-- AI 正在思考中 -->
              <div
                v-if="msg.senderType === 2 && isAiTyping && !msg.content"
                class="typing"
                aria-label="AI 正在输入"
              >
                <span class="typing__dot" />
                <span class="typing__dot" />
                <span class="typing__dot" />
              </div>
              <!-- AI 错误提示 -->
              <div v-else-if="msg.isError" class="error-bubble" role="alert">
                <el-icon><WarningFilled /></el-icon>
                <span>{{ msg.content }}</span>
              </div>
              <!-- AI 正常返回消息 -->
              <MarkdownRenderer
                v-else-if="msg.senderType === 2"
                :content="msg.content"
                :is-ai-message="true"
              />
              <p v-else-if="msg.content" v-html="formatMessageContent(msg.content)" />
            </div>
            <p class="message__time">
              {{
                msg.senderType === 2 && isAiTyping && !msg.content
                  ? "正在输入中"
                  : formatRelative(msg.createdAt)
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- 回到底部 -->
      <Transition name="fade">
        <button
          v-if="!atBottom && messages.length"
          class="chat__to-bottom"
          type="button"
          @click="scrollToBottom(true)"
        >
          <el-icon><ArrowDown /></el-icon>
          回到最新
        </button>
      </Transition>

      <!-- 输入区 -->
      <footer class="chat__composer">
        <div class="composer">
          <label class="visually-hidden" for="chat-input">输入你想说的话</label>
          <el-input
            id="chat-input"
            v-model="userMessage"
            placeholder="请输入你想要分享的内容…（Enter 发送，Shift + Enter 换行）"
            type="textarea"
            :rows="3"
            :maxlength="MAX_LENGTH"
            :disabled="isAiTyping"
            resize="none"
            @keydown="handleKeyDown"
          />
          <div class="composer__footer">
            <span class="composer__hint">
              <el-icon><InfoFilled /></el-icon>
              AI 回复仅供参考，不替代专业诊断
            </span>
            <span
              class="composer__count"
              :class="{ 'is-over': userMessage.length > MAX_LENGTH }"
            >
              {{ userMessage.length }}/{{ MAX_LENGTH }}
            </span>
          </div>
        </div>
        <el-button
          type="primary"
          class="composer__send"
          :disabled="!canSend || isAiTyping"
          :loading="isAiTyping"
          aria-label="发送消息"
          @click="sendMessage"
        >
          <el-icon v-if="!isAiTyping"><Promotion /></el-icon>
          <span class="composer__send-text">发送</span>
        </el-button>
      </footer>
    </section>

    <!-- 移动端侧栏抽屉 -->
    <el-drawer
      v-model="sidebarOpen"
      direction="rtl"
      size="86%"
      :with-header="false"
    >
      <div class="consult__drawer">
        <EmotionGarden :emotion="currentEmotion" :loading="emotionLoading" />
        <SessionList
          :sessions="sessionList"
          :active-id="activeSessionId"
          :loading="sessionLoading"
          @select="handleSessionClick"
          @remove="handleDeleteSession"
        />
      </div>
    </el-drawer>
  </div>
</template>

<style lang="scss" scoped>
.consult {
  display: flex;
  gap: var(--xy-space-5);
  width: 100%;
  max-width: var(--xy-content-width);
  margin: 0 auto;
  padding: var(--xy-space-5);

  @media (max-width: 900px) {
    padding: var(--xy-space-4);
  }
}

// -----------------------------------------------------------------------------
// 侧栏
// -----------------------------------------------------------------------------
.consult__side {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-4);
  flex: 0 0 320px;
  min-width: 0;

  @media (max-width: 900px) {
    display: none;
  }
}

.consult__drawer {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-4);
}

.assistant-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--xy-space-1);
  padding: var(--xy-space-5);
  border: 1px solid var(--xy-border);
  border-radius: var(--xy-radius-lg);
  background: var(--xy-surface);
  box-shadow: var(--xy-shadow-sm);
  text-align: center;

  &__orb {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 58px;
    height: 58px;
    margin-bottom: var(--xy-space-2);
    border-radius: 50%;
    background: var(--xy-gradient-brand);
    // 原实现的 breathing 动画因缺少 @keyframes 从未生效
    animation: xy-breathing 5s var(--xy-ease) infinite;
  }

  &__avatar {
    width: 26px;
    height: 26px;
  }

  &__name {
    font-size: var(--xy-text-md);
    font-weight: 700;
    color: var(--xy-primary-700);
  }

  &__tagline {
    font-size: var(--xy-text-sm);
    color: var(--xy-ink-500);
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-2);
    margin-top: var(--xy-space-2);
    font-size: var(--xy-text-xs);
    font-weight: 600;
    color: var(--xy-primary-600);
  }

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--xy-primary-500);
    box-shadow: 0 0 0 3px var(--xy-primary-100);
    animation: xy-pulse 2.4s var(--xy-ease) infinite;
  }
}

// -----------------------------------------------------------------------------
// 聊天区
// -----------------------------------------------------------------------------
.chat {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--xy-border);
  border-radius: var(--xy-radius-lg);
  background: var(--xy-surface);
  box-shadow: var(--xy-shadow-sm);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--xy-space-4);
    flex-shrink: 0;
    padding: var(--xy-space-4) var(--xy-space-5);
    border-bottom: 1px solid var(--xy-border);
    background: var(--xy-gradient-brand-soft);

    @media (max-width: 640px) {
      padding: var(--xy-space-3) var(--xy-space-4);
    }
  }

  &__identity {
    display: flex;
    align-items: center;
    gap: var(--xy-space-3);
    min-width: 0;
  }

  &__avatar {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: var(--xy-radius-md);
    background: var(--xy-surface);
    box-shadow: var(--xy-shadow-xs);
  }

  &__title {
    font-size: var(--xy-text-lg);
    font-weight: 700;
    color: var(--xy-ink-900);
  }

  &__subtitle {
    font-size: var(--xy-text-sm);
    color: var(--xy-ink-500);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--xy-space-2);
    flex-shrink: 0;

    :deep(.el-button + .el-button) {
      margin-left: 0;
    }

    // 窄屏下这两个是主要触控入口，低于 44px 不好点
    @media (max-width: 900px) {
      :deep(.el-button) {
        min-height: 44px;
        padding-inline: var(--xy-space-4);
      }
    }
  }

  &__drawer-btn {
    display: none;

    @media (max-width: 900px) {
      display: inline-flex;
    }
  }

  &__new {
    @media (max-width: 640px) {
      span {
        display: none;
      }
    }
  }

  &__messages {
    flex: 1;
    min-height: 0;
    max-height: calc(100vh - 320px);
    overflow-y: auto;
    padding: var(--xy-space-5);
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-5);

    @media (max-width: 640px) {
      padding: var(--xy-space-4);
      max-height: calc(100vh - 280px);
    }
  }

  &__to-bottom {
    position: absolute;
    left: 50%;
    bottom: 148px;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-1);
    padding: 6px 14px;
    border: 1px solid var(--xy-border);
    border-radius: var(--xy-radius-full);
    background: var(--xy-surface);
    color: var(--xy-primary-600);
    font-family: inherit;
    font-size: var(--xy-text-sm);
    font-weight: 600;
    box-shadow: var(--xy-shadow-md);
    transform: translateX(-50%);
    transition: background-color var(--xy-dur-fast) var(--xy-ease);

    &:hover {
      background: var(--xy-primary-50);
    }
  }

  &__composer {
    display: flex;
    align-items: flex-end;
    gap: var(--xy-space-3);
    flex-shrink: 0;
    padding: var(--xy-space-4) var(--xy-space-5);
    border-top: 1px solid var(--xy-border);

    @media (max-width: 640px) {
      padding: var(--xy-space-3) var(--xy-space-4);
    }
  }
}

// -----------------------------------------------------------------------------
// 消息
// -----------------------------------------------------------------------------
.message {
  display: flex;
  align-items: flex-start;
  gap: var(--xy-space-3);

  &__avatar {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border-radius: var(--xy-radius-sm);
    background: var(--xy-surface-alt);
    object-fit: cover;
  }

  &__body {
    min-width: 0;
    max-width: 76%;
  }

  &__bubble {
    padding: var(--xy-space-3) var(--xy-space-4);
    border-radius: var(--xy-radius-lg);
    animation: xy-fade-in-up var(--xy-dur-slow) var(--xy-ease-out);
    line-height: var(--xy-leading-relaxed);
    word-break: break-word;
  }

  &__time {
    margin-top: var(--xy-space-1);
    font-size: var(--xy-text-xs);
    color: var(--xy-ink-400);
  }

  &.ai-message {
    .message__bubble {
      border: 1px solid var(--xy-border);
      border-top-left-radius: var(--xy-radius-xs);
      background: var(--xy-surface-alt);
      color: var(--xy-ink-900);
    }
  }

  // 用户消息靠右，形成明确的空间对话关系
  &.user-message {
    flex-direction: row-reverse;

    .message__body {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .message__bubble {
      border-top-right-radius: var(--xy-radius-xs);
      background: var(--xy-primary-500);
      color: #fff;
    }
  }
}

// 打字指示器
.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--xy-primary-400);
    animation: xy-typing 1.4s var(--xy-ease) infinite;

    &:nth-child(2) {
      animation-delay: 0.18s;
    }

    &:nth-child(3) {
      animation-delay: 0.36s;
    }
  }
}

.error-bubble {
  display: flex;
  align-items: center;
  gap: var(--xy-space-2);
  padding: var(--xy-space-3) var(--xy-space-4);
  border: 1px solid rgba(168, 65, 60, 0.28);
  border-radius: var(--xy-radius-md);
  background: var(--xy-danger-bg);
  color: var(--xy-danger);
  font-weight: 500;
}

// -----------------------------------------------------------------------------
// 输入区
// -----------------------------------------------------------------------------
.composer {
  flex: 1;
  min-width: 0;
}

.composer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--xy-space-3);
  margin-top: var(--xy-space-2);
  font-size: var(--xy-text-xs);
  color: var(--xy-ink-500);
}

.composer__hint {
  display: inline-flex;
  align-items: center;
  gap: var(--xy-space-1);

  @media (max-width: 640px) {
    display: none;
  }
}

.composer__count {
  margin-left: auto;
  font-variant-numeric: tabular-nums;

  &.is-over {
    color: var(--xy-danger);
    font-weight: 700;
  }
}

.composer__send {
  flex-shrink: 0;
  height: 46px;
  min-width: 46px;
  border-radius: var(--xy-radius-md);

  &-text {
    @media (max-width: 640px) {
      display: none;
    }
  }
}

// 「回到最新」过渡
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--xy-dur) var(--xy-ease);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
