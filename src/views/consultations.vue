<script setup lang="ts">
/**
 * 咨询会话记录
 *
 * 相对改造前修了什么（逐条对应）：
 *  1. 表头第一列 label 是「会话ID」，单元格渲染的却是 el-avatar + userNickname
 *     → label 改为「用户」，并同时显示昵称（原来只有一个头像，信息也不完整）。
 *  2. 时间列 `prop="lastMessageTime"` 直接渲染原始值 → 改用 `formatDateTime`；
 *     详情弹窗里的 `startedAt` 同理；消息时间 `createdAt` 也一并格式化。
 *  3. `.message-content` 的样式被错误地嵌套在 `.message-header`（flex 布局）内部，
 *     消息正文继承了对齐与间距导致排版错乱 → 选择器层级移到 `.message-item` 下，
 *     与「头部一行、正文一块」的真实 DOM 层级对齐。
 *  4. `getSessionDetail(row.id)` 没有 catch，接口失败时 `loadingMessages` 永远为 true，
 *     弹窗一直转圈 → 补 catch/finally，并给出失败提示。
 *  5. 弹窗消息列表 `max-height: 400px` 写死 → 改为 `min(60vh, 520px)` 跟随视口。
 *  6. 会话没有消息时是空白框 → 补 `.xy-empty` 空状态。
 *  7. 表格与分页没有 loading、窄屏会被 6 列撑破、空表格无引导
 *     → `v-loading` + `.table-scroll` 横向滚动容器 + `#empty` 插槽。
 *  8. `el-avatar` 直接塞整个昵称，长昵称会撑破头像 → 取首字 `slice(0, 1)` 并固定 `:size`。
 *  9. 全部裸 hex（#333 / #f8f9fa / #e8f4fd / #f0f9f0 …）改为 `var(--xy-*)` 令牌；
 *     `.detail-row` / `.message-item` 里写错的 `:last-child`（编译成后代选择器，
 *     从未生效）改为 `&:last-child`。
 * 10. 弹窗宽度 `70%` 在 375px 视口下过窄 → `min(880px, 92vw)`；`PageHead` 补 `subtitle`。
 */
import PageHead from "@/components/PageHead.vue";
import { ref, onMounted, reactive } from "vue";
import { getConsultationPage, getSessionDetail } from "@/api/admin";
import { formatDateTime } from "@/utils/format";
import { ElMessage } from "element-plus";
import type { ChatMessage, ChatSession } from "@/types/session";

interface ConsultationRow extends ChatSession {
  userNickname?: string;
  lastMessageContent?: string;
  messageCount?: number;
  lastMessageTime?: string;
  startedAt?: string;
}

const tableData = ref<ConsultationRow[]>([]);
const pagination = reactive({
  currentPage: 1,
  size: 10,
  total: 0,
});
//列表请求状态
const loading = ref(false);
//会话详情
const sessionDetail = ref<Partial<ConsultationRow>>({});
const sessionMessages = ref<ChatMessage[]>([]);
const loadingMessages = ref(false);
//详情
const showDetailDialog = ref(false);

/** 头像只放昵称首字，避免长昵称把圆形头像撑破 */
const avatarInitial = (nickname?: string): string => {
  const text = (nickname ?? "").trim();
  return text.length > 0 ? text.slice(0, 1) : "匿";
};

const viewSessionDetail = (row: ConsultationRow) => {
  sessionDetail.value = row;
  sessionMessages.value = [];
  loadingMessages.value = true;
  showDetailDialog.value = true;
  getSessionDetail(row.id)
    .then((res) => {
      sessionMessages.value = Array.isArray(res) ? res : [];
    })
    .catch(() => {
      // 接口失败必须结束 loading，否则弹窗会一直转圈
      sessionMessages.value = [];
      ElMessage.error("会话消息加载失败，请稍后重试");
    })
    .finally(() => {
      loadingMessages.value = false;
    });
};

const handleChange = (page: number) => {
  pagination.currentPage = page;
  handleSearch();
};

const handleSearch = async () => {
  loading.value = true;
  try {
    const res = await getConsultationPage(pagination);
    tableData.value = res.records as ConsultationRow[];
    pagination.total = res.total;
  } catch {
    // 请求失败：清空列表并结束 loading，由空状态插槽兜底
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  handleSearch();
});
</script>

<template>
  <div class="consultations-page">
    <PageHead
      title="咨询记录"
      subtitle="查看用户与 AI 助手的心理咨询会话，点「详情」可回看完整对话记录。"
    />
    <div class="table-scroll">
      <el-table v-loading="loading" :data="tableData">
        <el-table-column label="用户" width="180">
          <template #default="scope">
            <div class="user-cell">
              <el-avatar :size="32">{{ avatarInitial(scope.row.userNickname) }}</el-avatar>
              <span class="user-cell__name" :title="scope.row.userNickname">
                {{ scope.row.userNickname || "匿名用户" }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="情绪日志" min-width="220">
          <template #default="scope">
            <div class="session-title">{{ scope.row.sessionTitle || "未命名会话" }}</div>
            <div class="session-preview">
              {{ scope.row.lastMessageContent || "暂无消息内容" }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="messageCount" label="消息数" width="100" />
        <el-table-column label="时间" width="170">
          <template #default="scope">
            {{ formatDateTime(scope.row.lastMessageTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="scope">
            <el-button text type="primary" @click="viewSessionDetail(scope.row)">
              详情
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="xy-empty">
            <el-icon class="xy-empty__icon"><ChatDotRound /></el-icon>
            <p class="xy-empty__text">
              还没有咨询会话<br />用户发起咨询后会在这里留下记录
            </p>
          </div>
        </template>
      </el-table>
    </div>
    <div class="table-pager">
      <el-pagination
        :page-size="pagination.size"
        layout="prev,pager,next"
        :total="pagination.total"
        @change="handleChange"
      />
    </div>
    <el-dialog
      v-model="showDetailDialog"
      title="咨询会话详情"
      width="min(880px, 92vw)"
      :close-on-click-modal="false"
    >
      <div class="session-detail">
        <div class="detail-header">
          <div class="detail-row">
            <div class="detail-label">用户：</div>
            <div class="detail-value">
              {{ sessionDetail.userNickname || "匿名用户" }}
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-label">开始时间：</div>
            <div class="detail-value">
              {{ formatDateTime(sessionDetail.startedAt) }}
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-label">消息数：</div>
            <div class="detail-value">{{ sessionDetail.messageCount ?? "—" }}</div>
          </div>
        </div>
        <div class="messages-container">
          <div class="messages-header">
            <h4>对话记录</h4>
          </div>

          <div class="messages-list" v-loading="loadingMessages">
            <div
              v-if="!loadingMessages && sessionMessages.length === 0"
              class="xy-empty"
            >
              <el-icon class="xy-empty__icon"><ChatLineSquare /></el-icon>
              <p class="xy-empty__text">该会话没有对话记录</p>
            </div>
            <div
              v-for="message in sessionMessages"
              :key="message.id"
              class="message-item"
              :class="message.senderType === 1 ? 'user-message' : 'ai-message'"
            >
              <div class="message-header">
                <span class="sender">
                  {{ message.senderType === 1 ? "用户" : "AI助手" }}
                </span>
                <span class="time">{{ formatDateTime(message.createdAt) }}</span>
              </div>
              <div class="message-content">{{ message.content }}</div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.consultations-page {
  .table-scroll {
    // 窄屏横向滚动兜底：el-table 列宽总和超出容器时自身会横向滚动，
    // 这里再包一层，确保表格永远不会把卡片撑破
    overflow-x: auto;

    :deep(.el-table) {
      width: 100%;
    }
  }

  .table-pager {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--xy-space-5);
    overflow-x: auto;

    :deep(.el-pagination) {
      flex-wrap: wrap;
      justify-content: flex-end;
    }
  }

  .user-cell {
    display: flex;
    align-items: center;
    gap: var(--xy-space-2);
    min-width: 0;

    .el-avatar {
      flex-shrink: 0;
      background: var(--xy-primary-100);
      color: var(--xy-primary-700);
      font-weight: 600;
    }

    &__name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--xy-ink-900);
    }
  }

  .session-title {
    font-weight: 500;
    color: var(--xy-ink-900);
    margin-bottom: var(--xy-space-1);
  }

  .session-preview {
    font-size: var(--xy-text-sm);
    color: var(--xy-ink-500);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .session-detail {
    max-height: 70vh;
    overflow-y: auto;

    .detail-header {
      margin-bottom: var(--xy-space-5);
      padding: var(--xy-space-4);
      background: var(--xy-surface-alt);
      border: 1px solid var(--xy-border);
      border-radius: var(--xy-radius-md);
    }

    .detail-row {
      display: flex;
      align-items: center;
      margin-bottom: var(--xy-space-2);

      // 原先写作后代选择器 `:last-child`，从未命中，最后一行始终多 8px
      &:last-child {
        margin-bottom: 0;
      }

      .detail-label {
        flex-shrink: 0;
        min-width: 80px;
        margin-right: var(--xy-space-2);
        font-weight: 500;
        color: var(--xy-ink-700);
      }

      .detail-value {
        min-width: 0;
        color: var(--xy-ink-900);
        word-break: break-word;
      }
    }
  }

  .messages-container {
    margin-top: var(--xy-space-5);

    .messages-header {
      margin-bottom: var(--xy-space-4);

      h4 {
        margin: 0;
        font-size: var(--xy-text-md);
        font-weight: 600;
        color: var(--xy-ink-900);
      }
    }

    .messages-list {
      // 跟随视口，不再写死 400px
      max-height: min(60vh, 520px);
      overflow-y: auto;
      padding: var(--xy-space-4);
      background: var(--xy-surface);
      border: 1px solid var(--xy-border);
      border-radius: var(--xy-radius-md);

      .message-item {
        margin-bottom: var(--xy-space-3);
        padding: var(--xy-space-3);
        background: var(--xy-surface-alt);
        border: 1px solid var(--xy-border);
        border-radius: var(--xy-radius-md);

        &:last-child {
          margin-bottom: 0;
        }

        &.user-message {
          background: var(--xy-info-bg);
        }

        &.ai-message {
          background: var(--xy-primary-50);
        }
      }

      .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--xy-space-3);

        .sender {
          font-weight: 500;
          color: var(--xy-ink-900);
        }

        .time {
          flex-shrink: 0;
          font-size: var(--xy-text-xs);
          color: var(--xy-ink-500);
        }
      }

      // 正文与头部是兄弟节点：原先嵌在 .message-header 里，继承了对齐与间距导致错位
      .message-content {
        margin-top: var(--xy-space-2);
        font-size: var(--xy-text-base);
        line-height: var(--xy-leading-normal);
        color: var(--xy-ink-700);
        white-space: pre-wrap;
        word-break: break-word;
      }
    }
  }
}
</style>
