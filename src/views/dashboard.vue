<script setup lang="ts">
/**
 * 后台数据看板
 *
 * 相对改造前修了什么（逐条对应）：
 *  1. 样式与模板类名不一致：样式写 `.info .value`，模板用的是 `class="number"`，
 *     4 个统计数字的 24px 加粗样式从未生效 → 选择器统一为 `.number`。
 *  2. `echarts.init` 后没有任何尺寸监听，侧边栏折叠 / 窗口缩放后 canvas 错位
 *     → ResizeObserver 观察三个图表容器，`onUnmounted` 里 disconnect + dispose。
 *  3. 接口返回前统计卡片与图表全是空白 → 补 `.xy-skeleton` 骨架（含 role="status" 文字说明）。
 *  4. 接口返回空数组时图表是空白板 → 图表区域补 `.xy-empty` 空状态。
 *  5. 图表配色是 zrender 旧色板且散落 10 余处裸 hex → 收敛为 CHART_COLORS 品牌色常量
 *     （青绿 / 暖砂 / 语义色），文字色与网格线同源，字体走全站中文栈。
 *  6. `el-card` 的 `#header` 与 option.title 重复渲染标题（如「情绪趋势分析」出现两次）
 *     → 删掉 option.title，并把 legend.top / grid.top 上移补偿。
 *  7. 4 个统计卡图标底色是 4 组高饱和 AI 渐变 → 换成品牌浅色底 + 主色图标。
 *  8. 窄屏 `:span="6"` 的 4 列挤成一团 → `:xs="24" :sm="12" :lg="6"`，图表行 `:xs="24" :lg="12"`。
 *  9. 删掉 `.chart-content canvas { width/height: 100% !important }` 这条与 ECharts 自身
 *     尺寸计算打架的硬覆盖；卡片内联 `style="margin-top/width"` 改为类名（用间距令牌）。
 * 10. 接口失败时没有任何兜底 → catch 后仍结束 loading，由空状态提示接管。
 */
import { getAnalyticsOverview } from "@/api/admin";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import * as echarts from "echarts";

interface TrendPoint {
  date?: string;
  avgMoodScore?: number;
  recordCount?: number;
  sessionCount?: number;
  userCount?: number;
  activeUsers?: number;
  newUsers?: number;
  diaryUsers?: number;
  consultationUsers?: number;
  [key: string]: unknown;
}

interface AnalyticsOverview {
  systemOverview?: {
    totalUsers?: number;
    activeUsers?: number;
    totalDiaries?: number;
    todayNewDiaries?: number;
    totalSessions?: number;
    todayNewSessions?: number;
    avgMoodScore?: number;
    [key: string]: unknown;
  };
  emotionTrend?: TrendPoint[];
  consultationStats?: {
    totalSessions?: number;
    avgDurationMinutes?: number;
    dailyTrend?: TrendPoint[];
    [key: string]: unknown;
  };
  userActivity?: TrendPoint[];
  [key: string]: unknown;
}

const aiData = ref<AnalyticsOverview>({});
const loading = ref(true);

// -----------------------------------------------------------------------------
// ECharts 内部读不到 CSS 变量，这里登记一组与 src/styles/_tokens.scss 同值的品牌色常量。
// 改配色时请同步令牌，避免图表与全站品牌色脱节。
// -----------------------------------------------------------------------------
const CHART_FONT_FAMILY =
  '"Noto Sans SC", -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

const CHART_COLORS = {
  // 品牌青绿
  primary: "#2f7d6d",
  primarySoft: "#3d8a7a",
  primaryLight: "#7fbbab",
  primaryPale: "#add5ca",
  // 暖砂强调
  accent: "#b9822c",
  accentSoft: "#d69e45",
  accentLight: "#e5b972",
  // 语义色
  danger: "#a8413c",
  info: "#55707f",
  violet: "#8a5a9e",
  // 文字 / 网格 / 提示层
  inkStrong: "#1b2624",
  inkMuted: "#5f6e6a",
  gridLine: "#eaf1ee",
  axisLine: "#d6eae4",
  tooltipBg: "rgba(255, 255, 255, 0.96)",
  tooltipBorder: "#e4ebe8",
  areaPrimary: "rgba(47, 125, 109, 0.14)",
} as const;

/** 兜底调色板：未显式指定颜色的系列按此顺序取色 */
const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.accentSoft,
  CHART_COLORS.info,
  CHART_COLORS.violet,
  CHART_COLORS.primaryLight,
  CHART_COLORS.accentLight,
  CHART_COLORS.danger,
];

const baseTextStyle = {
  fontFamily: CHART_FONT_FAMILY,
  color: CHART_COLORS.inkStrong,
};

const axisTextStyle = { color: CHART_COLORS.inkMuted };

const tooltipStyle = {
  backgroundColor: CHART_COLORS.tooltipBg,
  borderColor: CHART_COLORS.tooltipBorder,
  borderWidth: 1,
  textStyle: baseTextStyle,
};

//情绪趋势
const emotionChartRef = ref<HTMLDivElement | null>(null);
const consultationChartRef = ref<HTMLDivElement | null>(null);
const userActiveChartRef = ref<HTMLDivElement | null>(null);

let emotionChart: echarts.EChartsType | null = null;
let consultationChart: echarts.EChartsType | null = null;
let userActiveChart: echarts.EChartsType | null = null;

/** 平均情绪：缺数据时只显示占位符，避免出现「—/10」这种半截文案 */
const avgMoodScoreText = computed(() => {
  const score = aiData.value.systemOverview?.avgMoodScore;
  return score === null || score === undefined ? "—" : `${score}/10`;
});

/** 图表空数据判定：用于把空白画布换成空状态提示 */
const hasEmotionTrend = computed(
  () => (aiData.value.emotionTrend ?? []).length > 0,
);
const hasConsultationTrend = computed(
  () => (aiData.value.consultationStats?.dailyTrend ?? []).length > 0,
);
const hasUserActivity = computed(
  () => (aiData.value.userActivity ?? []).length > 0,
);

//初始化图表
const initCharts = () => {
  initEmotionChart();
  initConsultationChart();
  initUserActiveChart();
};
//情绪趋势
const initEmotionChart = () => {
  if (!emotionChartRef.value) return;
  //销毁现有图表
  emotionChart?.dispose();
  //创建echarts实例
  emotionChart = echarts.init(emotionChartRef.value);
  //获取情绪趋势的数据
  const trendData = aiData.value.emotionTrend ?? [];
  //配置项（标题交给 el-card 的 #header，这里不再重复渲染）
  const option: echarts.EChartsOption = {
    color: CHART_PALETTE,
    textStyle: baseTextStyle,
    tooltip: {
      trigger: "axis",
      ...tooltipStyle,
    },
    legend: {
      data: ["平均情绪评分", "记录数量"],
      top: 8,
      textStyle: axisTextStyle,
    },
    grid: {
      //控制容器样式
      left: "3%",
      right: "4%",
      top: 52,
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: trendData.map((item) => item.date ?? ""),
      axisLine: {
        lineStyle: {
          color: CHART_COLORS.axisLine,
        },
      },
      axisLabel: axisTextStyle,
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: "value",
        name: "情绪评分",
        position: "left",
        nameTextStyle: axisTextStyle,
        axisLabel: axisTextStyle,
        axisLine: {
          lineStyle: {
            color: CHART_COLORS.axisLine,
          },
        },
        splitLine: {
          lineStyle: {
            color: CHART_COLORS.gridLine,
          },
        },
      },
      {
        type: "value",
        name: "记录数量",
        position: "right",
        nameTextStyle: axisTextStyle,
        axisLabel: axisTextStyle,
        axisLine: {
          lineStyle: {
            color: CHART_COLORS.axisLine,
          },
        },
        // 双轴只保留一侧网格线，避免出现两套错位横线
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "平均情绪评分",
        type: "line",
        data: trendData.map((item) => item.avgMoodScore),
        smooth: true,
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: CHART_COLORS.primary,
        },
        itemStyle: {
          color: CHART_COLORS.primary,
          // 主色节点压一圈极浅青绿外环，避免纯色圆点显得生硬
          borderColor: CHART_COLORS.primaryPale,
          borderWidth: 2,
        },
        areaStyle: {
          color: CHART_COLORS.areaPrimary,
        },
      },
      {
        name: "记录数量",
        type: "line",
        data: trendData.map((item) => item.recordCount),
        smooth: true,
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: CHART_COLORS.accentSoft,
        },
        itemStyle: {
          color: CHART_COLORS.accentSoft,
        },
      },
    ],
  };

  emotionChart.setOption(option);
};
//咨询会话统计
const initConsultationChart = () => {
  if (!consultationChartRef.value) return;
  //销毁现有图表
  consultationChart?.dispose();
  //创建echarts实例
  consultationChart = echarts.init(consultationChartRef.value);
  //获取数据
  const dailyTrend = aiData.value.consultationStats?.dailyTrend ?? [];
  const option: echarts.EChartsOption = {
    color: CHART_PALETTE,
    textStyle: baseTextStyle,
    tooltip: {
      trigger: "axis",
      ...tooltipStyle,
    },
    legend: {
      data: ["会话数量", "参与用户数"],
      top: 8,
      textStyle: axisTextStyle,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: 52,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dailyTrend.map((item) => item.date ?? ""),
      axisLine: {
        lineStyle: {
          color: CHART_COLORS.axisLine,
        },
      },
      axisLabel: axisTextStyle,
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: axisTextStyle,
      axisLine: {
        lineStyle: {
          color: CHART_COLORS.axisLine,
        },
      },
      splitLine: {
        lineStyle: {
          color: CHART_COLORS.gridLine,
        },
      },
    },
    series: [
      {
        name: "会话数量",
        type: "bar",
        data: dailyTrend.map((item) => item.sessionCount),
        itemStyle: {
          color: CHART_COLORS.primary,
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: "40%",
      },
      {
        name: "参与用户数",
        type: "bar",
        data: dailyTrend.map((item) => item.userCount),
        itemStyle: {
          color: CHART_COLORS.accent,
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: "40%",
      },
    ],
  };
  consultationChart.setOption(option);
};
//用户活跃度分析
const initUserActiveChart = () => {
  if (!userActiveChartRef.value) return;
  //销毁现有图表
  userActiveChart?.dispose();
  //创建echarts实例
  userActiveChart = echarts.init(userActiveChartRef.value);
  //获取数据
  const activityData = aiData.value.userActivity ?? [];
  const option: echarts.EChartsOption = {
    color: CHART_PALETTE,
    textStyle: baseTextStyle,
    tooltip: {
      trigger: "axis",
      ...tooltipStyle,
    },
    legend: {
      data: ["活跃用户", "新增用户", "日记用户", "咨询用户"],
      top: 8,
      textStyle: axisTextStyle,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      // 四条图例占两行时留出更多顶部空间
      top: 64,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: activityData.map((item) => item.date ?? ""),
      axisLine: {
        lineStyle: {
          color: CHART_COLORS.axisLine,
        },
      },
      axisLabel: axisTextStyle,
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: axisTextStyle,
      axisLine: {
        lineStyle: {
          color: CHART_COLORS.axisLine,
        },
      },
      splitLine: {
        lineStyle: {
          color: CHART_COLORS.gridLine,
        },
      },
    },
    series: [
      {
        name: "活跃用户",
        type: "line",
        data: activityData.map((item) => item.activeUsers),
        smooth: true,
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: CHART_COLORS.primarySoft,
        },
        itemStyle: {
          color: CHART_COLORS.primarySoft,
        },
        areaStyle: {
          color: CHART_COLORS.areaPrimary,
        },
      },
      {
        name: "新增用户",
        type: "line",
        data: activityData.map((item) => item.newUsers),
        smooth: true,
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: CHART_COLORS.accentSoft,
        },
        itemStyle: {
          color: CHART_COLORS.accentSoft,
        },
      },
      {
        name: "日记用户",
        type: "line",
        data: activityData.map((item) => item.diaryUsers),
        smooth: true,
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: CHART_COLORS.violet,
        },
        itemStyle: {
          color: CHART_COLORS.violet,
        },
      },
      {
        name: "咨询用户",
        type: "line",
        data: activityData.map((item) => item.consultationUsers),
        smooth: true,
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: CHART_COLORS.info,
        },
        itemStyle: {
          color: CHART_COLORS.info,
        },
      },
    ],
  };
  userActiveChart.setOption(option);
};

// -----------------------------------------------------------------------------
// 尺寸自适应：侧边栏折叠 / 窗口缩放时 ECharts 不会自己变形，必须显式 resize
// -----------------------------------------------------------------------------
let resizeObserver: ResizeObserver | null = null;

const chartElements = (): HTMLDivElement[] =>
  [
    emotionChartRef.value,
    consultationChartRef.value,
    userActiveChartRef.value,
  ].filter((el): el is HTMLDivElement => el !== null);

const resizeCharts = () => {
  emotionChart?.resize();
  consultationChart?.resize();
  userActiveChart?.resize();
};

const observeChartResize = () => {
  if (typeof ResizeObserver === "undefined") return;
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(resizeCharts);
  }
  chartElements().forEach((el) => resizeObserver?.observe(el));
};

onMounted(async () => {
  try {
    const res = await getAnalyticsOverview();
    aiData.value = res as AnalyticsOverview;
  } catch {
    // 接口失败：保持空数据，由空状态提示兜底，绝不让 loading 卡住
    aiData.value = {};
  } finally {
    loading.value = false;
    await nextTick();
    initCharts();
    observeChartResize();
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  emotionChart?.dispose();
  consultationChart?.dispose();
  userActiveChart?.dispose();
  emotionChart = null;
  consultationChart = null;
  userActiveChart = null;
});
</script>

<template>
  <div class="dashboard-container">
    <el-row :gutter="20" class="dashboard-row">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card">
          <div v-if="loading" class="stat-skeleton" role="status">
            <span class="visually-hidden">统计数据加载中</span>
            <div class="xy-skeleton stat-skeleton__block"></div>
          </div>
          <div v-else class="card-content">
            <div class="avatar">
              <el-icon aria-hidden="true"><User /></el-icon>
            </div>
            <div class="info">
              <p class="title">总用户数</p>
              <p class="number">{{ aiData.systemOverview?.totalUsers ?? "—" }}</p>
              <p class="subtitle-title">
                活跃用户：{{ aiData.systemOverview?.activeUsers ?? "—" }}
              </p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card">
          <div v-if="loading" class="stat-skeleton" role="status">
            <span class="visually-hidden">统计数据加载中</span>
            <div class="xy-skeleton stat-skeleton__block"></div>
          </div>
          <div v-else class="card-content">
            <div class="avatar">
              <el-icon aria-hidden="true"><Notebook /></el-icon>
            </div>
            <div class="info">
              <p class="title">情绪日志</p>
              <p class="number">
                {{ aiData.systemOverview?.totalDiaries ?? "—" }}
              </p>
              <p class="subtitle-title">
                今日新增：{{ aiData.systemOverview?.todayNewDiaries ?? "—" }}
              </p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card">
          <div v-if="loading" class="stat-skeleton" role="status">
            <span class="visually-hidden">统计数据加载中</span>
            <div class="xy-skeleton stat-skeleton__block"></div>
          </div>
          <div v-else class="card-content">
            <div class="avatar">
              <el-icon aria-hidden="true"><ChatDotRound /></el-icon>
            </div>
            <div class="info">
              <p class="title">咨询会话</p>
              <p class="number">
                {{ aiData.systemOverview?.totalSessions ?? "—" }}
              </p>
              <p class="subtitle-title">
                今日新增：{{ aiData.systemOverview?.todayNewSessions ?? "—" }}
              </p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card">
          <div v-if="loading" class="stat-skeleton" role="status">
            <span class="visually-hidden">统计数据加载中</span>
            <div class="xy-skeleton stat-skeleton__block"></div>
          </div>
          <div v-else class="card-content">
            <div class="avatar">
              <el-icon aria-hidden="true"><Sunny /></el-icon>
            </div>
            <div class="info">
              <p class="title">平均情绪</p>
              <p class="number">{{ avgMoodScoreText }}</p>
              <p class="subtitle-title">情绪健康指数</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="dashboard-row">
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">情绪趋势分析</div>
          </template>
          <div class="chart-content">
            <div class="chart-body">
              <div
                ref="emotionChartRef"
                class="chart-canvas chart-canvas--tall"
              ></div>
              <div v-if="loading" class="chart-overlay" role="status">
                <span class="visually-hidden">情绪趋势图表加载中</span>
                <div class="xy-skeleton chart-overlay__block"></div>
              </div>
              <div v-else-if="!hasEmotionTrend" class="chart-overlay">
                <div class="xy-empty">
                  <el-icon class="xy-empty__icon"><DataLine /></el-icon>
                  <p class="xy-empty__text">
                    暂无情绪趋势数据<br />用户写下情绪日记后会在这里汇总
                  </p>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">咨询会话统计</div>
          </template>
          <div class="chart-content">
            <div v-if="loading" class="stats-skeleton" role="status">
              <span class="visually-hidden">咨询会话统计加载中</span>
              <div class="xy-skeleton stats-skeleton__block"></div>
            </div>
            <div v-else class="consultation-stats">
              <div class="stat-item">
                <div class="stat-label">总会话数</div>
                <div class="stat-value">
                  {{ aiData.consultationStats?.totalSessions ?? "—" }}
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-label">平均时长</div>
                <div class="stat-value">
                  {{ aiData.consultationStats?.avgDurationMinutes ?? "—" }}
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-label">活跃用户</div>
                <div class="stat-value">
                  {{ aiData.systemOverview?.activeUsers ?? "—" }}
                </div>
              </div>
            </div>
            <div class="chart-body">
              <div
                ref="consultationChartRef"
                class="chart-canvas chart-canvas--short"
              ></div>
              <div v-if="loading" class="chart-overlay" role="status">
                <span class="visually-hidden">咨询会话图表加载中</span>
                <div class="xy-skeleton chart-overlay__block"></div>
              </div>
              <div v-else-if="!hasConsultationTrend" class="chart-overlay">
                <div class="xy-empty">
                  <el-icon class="xy-empty__icon"><ChatDotRound /></el-icon>
                  <p class="xy-empty__text">暂无咨询会话数据</p>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row class="dashboard-row">
      <el-card class="chart-card">
        <template #header>
          <div class="card-header">用户活跃度趋势</div>
        </template>
        <div class="chart-content">
          <div class="chart-body">
            <div
              ref="userActiveChartRef"
              class="chart-canvas chart-canvas--tall"
            ></div>
            <div v-if="loading" class="chart-overlay" role="status">
              <span class="visually-hidden">用户活跃度图表加载中</span>
              <div class="xy-skeleton chart-overlay__block"></div>
            </div>
            <div v-else-if="!hasUserActivity" class="chart-overlay">
              <div class="xy-empty">
                <el-icon class="xy-empty__icon"><Histogram /></el-icon>
                <p class="xy-empty__text">暂无用户活跃度数据</p>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-container {
  // el-row 是 flex 容器，用 row-gap 处理换行后的纵向间距（窄屏堆叠时不再粘连）
  .dashboard-row {
    row-gap: var(--xy-space-5);

    & + .dashboard-row {
      margin-top: var(--xy-space-5);
    }
  }

  .stat-card {
    height: 100%;
  }

  .stat-skeleton {
    height: 60px;
    border-radius: var(--xy-radius-sm);

    &__block {
      width: 100%;
      height: 100%;
    }
  }

  .card-content {
    display: flex;
    align-items: center;
    gap: var(--xy-space-4);

    .avatar {
      flex-shrink: 0;
      width: 60px;
      height: 60px;
      border-radius: var(--xy-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      // 品牌克制的浅色底 + 主色图标（原先是 4 组高饱和 AI 渐变）
      background: var(--xy-primary-50);
      border: 1px solid var(--xy-primary-100);
      color: var(--xy-primary-500);
      font-size: 26px;

      .el-icon {
        color: inherit;
      }
    }

    .info {
      min-width: 0;

      .title {
        font-size: var(--xy-text-base);
        color: var(--xy-ink-500);
        margin-bottom: var(--xy-space-1);
      }

      // 原先选择器写的是 .value，与模板 class="number" 不匹配，样式从未生效
      .number {
        font-size: 24px;
        font-weight: 700;
        line-height: var(--xy-leading-tight);
        color: var(--xy-ink-900);
        margin-bottom: var(--xy-space-1);
      }

      .subtitle-title {
        font-size: var(--xy-text-xs);
        color: var(--xy-ink-400);
      }
    }
  }

  .card-header {
    font-size: var(--xy-text-md);
    font-weight: 600;
    color: var(--xy-ink-900);
  }

  .chart-card {
    width: 100%;
  }

  .chart-content {
    padding: var(--xy-space-5);

    @media (max-width: 900px) {
      padding: var(--xy-space-4);
    }
  }

  // 骨架 / 空状态覆盖在画布之上：图表容器始终保留尺寸，init 不会拿到 0 宽
  .chart-body {
    position: relative;
  }

  .chart-canvas {
    width: 100%;
    height: 300px;

    &--short {
      height: 260px;
    }

    &--tall {
      height: 320px;
    }
  }

  .chart-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--xy-surface);
    border-radius: var(--xy-radius-md);

    &__block {
      width: 100%;
      height: 100%;
    }

    .xy-empty {
      padding: var(--xy-space-6) var(--xy-space-4);
    }
  }

  .stats-skeleton {
    height: 56px;
    margin-bottom: var(--xy-space-4);
    border-radius: var(--xy-radius-sm);

    &__block {
      width: 100%;
      height: 100%;
    }
  }

  .consultation-stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
    gap: var(--xy-space-3);
    margin-bottom: var(--xy-space-4);

    .stat-item {
      text-align: center;

      .stat-label {
        font-size: var(--xy-text-xs);
        color: var(--xy-ink-500);
        margin-bottom: var(--xy-space-1);
      }

      .stat-value {
        font-size: var(--xy-text-lg);
        font-weight: 600;
        color: var(--xy-ink-900);
      }
    }
  }
}
</style>
