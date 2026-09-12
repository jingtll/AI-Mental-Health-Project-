<script setup lang="ts">
/**
 * 情绪日志（后台）
 *
 * 相对改造前修了什么（逐条对应）：
 *  1. 表头 label 与 prop 严重错配：「用户ID」对应 `id`、「会话ID」对应 `moodScore`
 *     （单元格内容却是头像）、「情绪评分」和「生活指标」两列都标着 `createdAt`
 *     → 逐列纠正：记录ID→`id`、用户→`nickname`（头像）、情绪评分→`moodScore`、
 *     生活指标列去掉 prop（一格同时展示睡眠与压力）。
 *  2. 生活指标读 `row.sleep`，详情弹窗读 `currentDetail.sleepQuality`，同一语义两个字段名
 *     → 统一走 `readSleepQuality()` 做兼容读取（详见该函数注释）。
 *  3. 详情弹窗的 `createdAt` / `updatedAt` 直接渲染原始 ISO 串 → 改用 `formatDateTime`。
 *  4. 文件内重复定义了一份 `getEmotionTagType` / `getAiEmotionTagType` /
 *     `getEmotionScoreColor` / `getRiskLevelTagType` / `getRiskLevelText` 与本地 `EpTagType`
 *     （且颜色是 #f56c6c / #67c23a 等 Element 默认色）→ 全部删除，改为从 `@/utils/emotion`
 *     导入，颜色由设计令牌统一给出。
 *  5. 死样式：`.ai-analysis-status` / `.keywords-container` / `.analysis-time` /
 *     `.ai-analysis-meta` 在模板里完全不存在 → 删除；`.suggestion-content` / `.risk-content`
 *     的裸色 `#f8f9fa` `#ebeef5` `#606266` `#909399` → 改令牌；
 *     `.el-progress__text` 那条带 `!important` 的规则在 scoped 下从未命中（子组件内部元素）
 *     → 一并删除。
 *  6. `el-table` 情绪评分列的 `width="auto"` 不是合法值 → 改为具体宽度。
 *  7. 表格与分页没有 loading、窄屏会被 8 列撑破、空表格无引导
 *     → `v-loading` + `.table-scroll` 横向滚动容器 + `#empty` 插槽。
 *  8. 详情弹窗 `width="800px"` 在窄屏溢出 → `min(800px, 92vw)`；`PageHead` 补 `subtitle`。
 *  9. 情绪性质标签改为 `getPolarityTagType()`，颜色 + 文字双维度表达，不再只靠颜色。
 *
 * 注：`handleSearch` 的 `{...pagination, ...formData}` 展开顺序与 `moodScreRange`
 * （接口约定的拼写）一律保持原样。
 */
import { ref, reactive, onMounted } from "vue";
import PageHead from "@/components/PageHead.vue";
import TableSearch from "@/components/TableSearch.vue";
import type { SearchFormItem } from "@/components/TableSearch.vue";
import { getEmotionalPage, deleteEmotional } from "@/api/admin";
import { formatDate, formatDateTime } from "@/utils/format";
import {
  getAiEmotionTagType,
  getEmotionScoreColor,
  getEmotionTagType,
  getRiskLevelTagType,
  getRiskLevelText,
} from "@/utils/emotion";
import type { EpTagType } from "@/utils/emotion";
import { ElMessageBox, ElMessage } from "element-plus";

interface EmotionalRow {
  id: number | string;
  nickname?: string;
  username?: string;
  userId?: number | string;
  diaryDate?: string;
  moodScore?: number;
  sleep?: number;
  sleepQuality?: number;
  stressLevel?: number;
  dominantEmotion?: string;
  emotionTriggers?: string;
  diaryContent?: string;
  aiEmotionAnalysis?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * 生活指标「睡眠质量」的字段名兼容处理。
 *
 * 接口字段名不一致：列表接口返回 `sleep`，详情弹窗原来读的是 `sleepQuality`，
 * 两者是同一个语义。这里统一按 `sleepQuality ?? sleep` 读取，保证列表与详情显示一致。
 * 后端统一字段名后，直接删掉本函数、改回单一字段即可。
 */
const readSleepQuality = (row: EmotionalRow | null): number | undefined =>
  row?.sleepQuality ?? row?.sleep;

/** 头像只放昵称首字，避免长昵称把圆形头像撑破 */
const avatarInitial = (nickname?: string): string => {
  const text = (nickname ?? "").trim();
  return text.length > 0 ? text.slice(0, 1) : "匿";
};

/** 情绪性质标签：文字与颜色一起表达，避免只靠颜色传达状态 */
const getPolarityTagType = (isNegative: unknown): EpTagType =>
  isNegative ? "danger" : "success";

const formItem = ref<SearchFormItem[]>([
  {
    comp: "input",
    prop: "userId",
    label: "用户ID",
    placeholder: "请输入用户ID",
  },
  {
    comp: "select",
    prop: "moodScreRange",
    label: "情绪评分",
    placeholder: "请选择评分范围",
    options: [
      { label: "低分（1-3）", value: "1-3" },
      { label: "中分（4-6）", value: "4-6" },
      { label: "高分（7-10）", value: "7-10" },
    ],
  },
]);

//列表
const tableData = ref<EmotionalRow[]>([]);
//分页参数
const pagination = reactive({
  currentPage: 1,
  size: 10,
  total: 0,
});
//列表请求状态（驱动 el-table 的 v-loading）
const loading = ref(false);

const handleSearch = async (formData?: Record<string, unknown>) => {
  loading.value = true;
  try {
    const params = {
      ...pagination,
      ...(formData || {}),
    };
    const { records, total } = await getEmotionalPage(params);
    tableData.value = records as EmotionalRow[];
    pagination.total = total;
  } catch {
    // 请求失败：清空列表并结束 loading，由空状态插槽兜底
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const handleChange = (page: number) => {
  pagination.currentPage = page;
  handleSearch();
};

//详情
const detailDialogVisible = ref(false);
const currentDetail = ref<EmotionalRow | null>(null);
const aiData = ref<Record<string, unknown> | null>(null);

const viewSessionDetail = (row: EmotionalRow) => {
  currentDetail.value = row;
  if (row.aiEmotionAnalysis) {
    try {
      aiData.value = JSON.parse(row.aiEmotionAnalysis) as Record<
        string,
        unknown
      >;
    } catch {
      aiData.value = {};
    }
  } else {
    aiData.value = {};
  }
  detailDialogVisible.value = true;
};

//删除
const handleDelete = (row: EmotionalRow) => {
  ElMessageBox.confirm("确认删除该条记录吗？", "删除确认", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "error",
  }).then(() => {
    // 确认删除
    deleteEmotional(row.id).then(() => {
      ElMessage.success("删除成功");
      handleSearch();
    });
  });
};

onMounted(() => {
  handleSearch();
});
</script>

<template>
  <div class="emotional-page">
    <PageHead
      title="情绪日志"
      subtitle="汇总用户提交的情绪日记与 AI 分析结果，可按用户或评分区间筛选、查看详情。"
    />
    <TableSearch :formItem="formItem" @search="handleSearch" />
    <div class="table-scroll">
      <el-table v-loading="loading" :data="tableData">
        <el-table-column prop="id" label="记录ID" width="100" />
        <el-table-column label="用户" width="180">
          <template #default="scope">
            <div class="user-cell">
              <el-avatar :size="32">{{ avatarInitial(scope.row.nickname) }}</el-avatar>
              <span class="user-cell__name" :title="scope.row.nickname">
                {{ scope.row.nickname || "匿名用户" }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="记录日期" width="130">
          <template #default="scope">
            {{ formatDate(scope.row.diaryDate) }}
          </template>
        </el-table-column>
        <el-table-column label="情绪评分" width="210">
          <template #default="scope">
            <div class="score-cell">
              <el-rate :model-value="scope.row.moodScore" :max="10" disabled />
              <span class="score-cell__text">
                {{ scope.row.moodScore ?? "—" }}/10
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="生活指标" width="140">
          <template #default="scope">
            <div class="metric-cell">
              <p>睡眠：{{ readSleepQuality(scope.row) ?? "—" }}/5</p>
              <p>压力：{{ scope.row.stressLevel ?? "—" }}/5</p>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="emotionTriggers"
          label="情绪触发因素"
          width="160"
          show-overflow-tooltip
        />
        <el-table-column label="日记内容" min-width="220">
          <template #default="scope">
            <span class="xy-truncate-2">{{ scope.row.diaryContent || "—" }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="scope">
            <el-button text type="primary" @click="viewSessionDetail(scope.row)">
              详情
            </el-button>
            <el-button text type="danger" @click="handleDelete(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="xy-empty">
            <el-icon class="xy-empty__icon"><Notebook /></el-icon>
            <p class="xy-empty__text">
              还没有情绪日志<br />用户提交情绪日记后会在这里汇总
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
      v-model="detailDialogVisible"
      title="情绪日志详情"
      width="min(800px, 92vw)"
      :close-on-click-modal="false"
    >
      <div class="detail-content" v-if="currentDetail">
        <div class="detail-section">
          <h4>用户信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="用户名">
              {{ currentDetail.username || "—" }}
            </el-descriptions-item>
            <el-descriptions-item label="昵称">
              {{ currentDetail.nickname || "—" }}
            </el-descriptions-item>
            <el-descriptions-item label="用户ID">
              {{ currentDetail.userId ?? "—" }}
            </el-descriptions-item>
            <el-descriptions-item label="记录日期">
              {{ formatDate(currentDetail.diaryDate) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="detail-section">
          <h4>情绪状态</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="情绪评分">
              <el-rate
                :model-value="currentDetail.moodScore"
                :max="10"
                disabled
              />
            </el-descriptions-item>
            <el-descriptions-item label="主要情绪">
              <el-tag :type="getEmotionTagType(currentDetail.dominantEmotion)">
                {{ currentDetail.dominantEmotion || "—" }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="睡眠质量">
              {{ readSleepQuality(currentDetail) ?? "—" }}/5
            </el-descriptions-item>
            <el-descriptions-item label="压力水平">
              {{ currentDetail.stressLevel ?? "—" }}/5
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="detail-section">
          <h4>日记内容</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="情绪触发因素">
              {{ currentDetail.emotionTriggers || "无" }}
            </el-descriptions-item>
            <el-descriptions-item label="日记内容">
              {{ currentDetail.diaryContent || "无" }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="detail-section">
          <h4>AI情绪分析结果</h4>
          <div class="ai-analysis-result">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="主要情绪">
                <el-tag
                  :type="getAiEmotionTagType(String(aiData?.primaryEmotion || ''))"
                >
                  {{ aiData?.primaryEmotion || "—" }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="情绪强度">
                <el-progress
                  :percentage="Number(aiData?.emotionScore || 0)"
                  :color="
                    getEmotionScoreColor(Number(aiData?.emotionScore || 0))
                  "
                  :stroke-width="8"
                />
              </el-descriptions-item>
              <el-descriptions-item label="风险等级">
                <el-tag
                  :type="getRiskLevelTagType(Number(aiData?.riskLevel ?? 0))"
                >
                  {{ getRiskLevelText(Number(aiData?.riskLevel ?? 0)) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="情绪性质">
                <el-tag :type="getPolarityTagType(aiData?.isNegative)">
                  {{ aiData?.isNegative ? "负面情绪" : "正面情绪" }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
            <div class="ai-suggestion-section">
              <h5>专业建议</h5>
              <div class="suggestion-content">
                {{ aiData?.suggestion || "无" }}
              </div>
            </div>
            <div class="ai-risk-section">
              <h5>风险描述</h5>
              <div class="risk-content">
                {{ aiData?.riskDescription || "无" }}
              </div>
            </div>
            <div class="ai-improvements-section">
              <h5>改善建议</h5>
              <ul
                class="improvement-list"
                v-if="(aiData?.improvementSuggestions as string[] | undefined)?.length"
              >
                <li
                  v-for="item in (aiData?.improvementSuggestions as string[])"
                  :key="item"
                >
                  {{ item }}
                </li>
              </ul>
              <div class="risk-content" v-else>无</div>
            </div>
          </div>
        </div>
        <div class="detail-section">
          <h4>时间信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="创建时间">
              {{ formatDateTime(currentDetail.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">
              {{ formatDateTime(currentDetail.updatedAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.emotional-page {
  .table-scroll {
    // 窄屏横向滚动兜底：el-table 列宽总和超出容器时自身会横向滚动（带固定列），
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

  .score-cell {
    display: flex;
    align-items: center;
    gap: var(--xy-space-2);

    &__text {
      flex-shrink: 0;
      font-size: var(--xy-text-xs);
      color: var(--xy-ink-500);
    }
  }

  .metric-cell {
    font-size: var(--xy-text-sm);
    line-height: var(--xy-leading-normal);
    color: var(--xy-ink-700);
  }

  .detail-content {
    .detail-section {
      margin-bottom: var(--xy-space-6);

      &:last-child {
        margin-bottom: 0;
      }

      h4 {
        margin: 0 0 var(--xy-space-4);
        font-size: var(--xy-text-md);
        font-weight: 600;
        color: var(--xy-ink-900);
      }
    }
  }

  // AI 分析结果分区
  .ai-analysis-result {
    .ai-suggestion-section,
    .ai-risk-section,
    .ai-improvements-section {
      margin-top: var(--xy-space-4);
      padding: var(--xy-space-3);
      background: var(--xy-surface-alt);
      border-radius: var(--xy-radius-sm);

      h5 {
        margin: 0 0 var(--xy-space-2);
        font-size: var(--xy-text-base);
        font-weight: 600;
        color: var(--xy-ink-700);
      }
    }

    .suggestion-content,
    .risk-content {
      padding: var(--xy-space-3);
      background: var(--xy-surface);
      border: 1px solid var(--xy-border);
      border-radius: var(--xy-radius-sm);
      line-height: var(--xy-leading-normal);
      color: var(--xy-ink-700);
    }

    .improvement-list {
      margin: 0;
      padding-left: var(--xy-space-5);

      li {
        margin-bottom: var(--xy-space-1);
        line-height: var(--xy-leading-normal);
        color: var(--xy-ink-700);
      }
    }
  }
}
</style>
