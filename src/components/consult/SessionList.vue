<script setup lang="ts">
/**
 * 会话列表（AI 咨询侧栏）
 *
 * 纯展示组件：接收列表与选中项，通过事件把「选中 / 删除」交回页面处理。
 *
 * 相对改造前的修复：
 *  - 原实现没有任何地方给 .session-item 加 active 类，选中态样式形同虚设；
 *    现在由 activeId 驱动，并补上 aria-current。
 *  - 删除按钮嵌在整行点击区内，点击会冒泡同时触发「切换到该会话」；
 *    现在 @click.stop 阻止冒泡，并向父级 emit remove。
 *  - 时间直接渲染接口原始串（如 2026-01-27T12:34:56.789Z）
 *    → 统一走 utils/format 的相对时间。
 *  - 补齐加载骨架与空状态。
 */
import type { ChatSession } from "@/types/session"
import { formatRelative } from "@/utils/format"

interface SessionListItem extends ChatSession {
  startedAt?: string
  lastMessageContent?: string
  messageCount?: number
  durationMinutes?: number
}

const props = withDefaults(
  defineProps<{
    sessions: SessionListItem[]
    /** 当前选中会话的 id；与 session.id 同类型比较 */
    activeId?: number | string | null
    loading?: boolean
  }>(),
  {
    activeId: null,
    loading: false,
  },
)

const emit = defineEmits<{
  select: [session: SessionListItem]
  remove: [id: number | string]
}>()

const isActive = (session: SessionListItem) =>
  props.activeId !== null && String(props.activeId) === String(session.id)
</script>

<template>
  <section class="session-panel" aria-labelledby="session-list-title">
    <header class="session-panel__header">
      <h3 id="session-list-title" class="session-panel__title">
        <el-icon><ChatLineSquare /></el-icon>
        会话列表
      </h3>
      <span v-if="sessions.length" class="session-panel__count">
        {{ sessions.length }}
      </span>
    </header>

    <!-- 加载骨架 -->
    <div v-if="loading" class="session-panel__skeleton" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="xy-skeleton session-panel__skeleton-row" />
    </div>

    <!-- 空状态 -->
    <div v-else-if="!sessions.length" class="xy-empty">
      <el-icon class="xy-empty__icon"><ChatDotRound /></el-icon>
      <p class="xy-empty__text">还没有历史会话<br />说出此刻的心情，就会自动保存</p>
    </div>

    <!-- 列表 -->
    <ul v-else class="session-panel__list">
      <li v-for="session in sessions" :key="session.id">
        <div
          class="session-item"
          :class="{ 'is-active': isActive(session) }"
          role="button"
          tabindex="0"
          :aria-current="isActive(session) ? 'true' : undefined"
          @click="emit('select', session)"
          @keydown.enter.prevent="emit('select', session)"
          @keydown.space.prevent="emit('select', session)"
        >
          <div class="session-item__main">
            <p class="session-item__title">{{ session.sessionTitle }}</p>
            <p v-if="session.lastMessageContent" class="session-item__preview">
              {{ session.lastMessageContent }}
            </p>
            <div class="session-item__stats">
              <span>
                <el-icon><ChatRound /></el-icon>
                {{ session.messageCount ?? 0 }} 条
              </span>
              <span>
                <el-icon><Timer /></el-icon>
                {{ session.durationMinutes ?? 0 }} 分钟
              </span>
              <span v-if="session.startedAt">
                <el-icon><Clock /></el-icon>
                {{ formatRelative(session.startedAt) }}
              </span>
            </div>
          </div>

          <button
            class="session-item__delete"
            type="button"
            :aria-label="`删除会话 ${session.sessionTitle}`"
            title="删除会话"
            @click.stop="emit('remove', session.id)"
          >
            <el-icon><Delete /></el-icon>
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.session-panel {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-3);
  padding: var(--xy-space-5);
  border: 1px solid var(--xy-border);
  border-radius: var(--xy-radius-lg);
  background: var(--xy-surface);
  box-shadow: var(--xy-shadow-sm);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: var(--xy-space-2);
    font-size: var(--xy-text-base);
    font-weight: 600;
    color: var(--xy-ink-900);

    .el-icon {
      color: var(--xy-primary-500);
    }
  }

  &__count {
    padding: 1px 8px;
    border-radius: var(--xy-radius-full);
    background: var(--xy-primary-50);
    color: var(--xy-primary-600);
    font-size: var(--xy-text-xs);
    font-weight: 600;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-2);
    max-height: 260px;
    overflow-y: auto;
  }

  &__skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-3);
  }

  &__skeleton-row {
    height: 58px;
  }
}

.session-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--xy-space-3);
  padding: var(--xy-space-3);
  padding-right: var(--xy-space-10);
  border: 1px solid transparent;
  border-radius: var(--xy-radius-md);
  cursor: pointer;
  transition:
    background-color var(--xy-dur-fast) var(--xy-ease),
    border-color var(--xy-dur-fast) var(--xy-ease);

  &:hover {
    background: var(--xy-surface-alt);
    border-color: var(--xy-border);
  }

  // 选中态：底色 + 左侧指示条 + 边框，不靠单一颜色维度区分
  &.is-active {
    background: var(--xy-primary-50);
    border-color: var(--xy-primary-200);

    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      width: 3px;
      height: 60%;
      border-radius: var(--xy-radius-full);
      background: var(--xy-primary-500);
      transform: translateY(-50%);
    }

    .session-item__title {
      color: var(--xy-primary-700);
      font-weight: 600;
    }
  }

  &__main {
    min-width: 0;
    flex: 1;
  }

  &__title {
    font-size: var(--xy-text-base);
    font-weight: 500;
    color: var(--xy-ink-900);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__preview {
    margin-top: var(--xy-space-1);
    font-size: var(--xy-text-sm);
    line-height: var(--xy-leading-normal);
    color: var(--xy-ink-500);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--xy-space-3);
    margin-top: var(--xy-space-2);

    span {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: var(--xy-text-xs);
      color: var(--xy-ink-400);
    }
  }

  // 删除按钮：hover / 键盘聚焦时显现，触屏始终可见
  &__delete {
    position: absolute;
    top: var(--xy-space-2);
    right: var(--xy-space-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: var(--xy-radius-sm);
    background: transparent;
    color: var(--xy-ink-400);
    font-size: 14px;
    opacity: 0;
    transition:
      opacity var(--xy-dur-fast) var(--xy-ease),
      color var(--xy-dur-fast) var(--xy-ease),
      background-color var(--xy-dur-fast) var(--xy-ease);

    &:hover,
    &:focus-visible {
      color: var(--xy-danger);
      background: var(--xy-danger-bg);
    }

    @media (hover: none) {
      opacity: 1;
    }
  }

  &:hover &__delete,
  &:focus-within &__delete {
    opacity: 1;
  }
}
</style>
