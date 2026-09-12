<script setup lang="ts">
/**
 * 情绪花园（AI 咨询侧栏）
 *
 * 纯展示组件：只接收 emotion，不发请求、不改状态。
 *
 * 相对改造前的重要修复：原实现在模板里把「中性 / 50」写死，接口返回的
 * currentEmotion.primaryEmotion / emotionScore 从未被渲染，情绪花园永远是假数据。
 * 现在 orb 的颜色、文字、评分、强度圆点、风险标签全部由 emotion 驱动。
 *
 * 另外把 💝 / ✨ / 🤗 三个 emoji 换成 Element Plus 图标（项目已全局注册），
 * 避免跨平台 emoji 字形不一致、无法继承主题色、屏幕阅读器朗读为「爱心」等问题。
 */
import { computed } from "vue"
import type { CurrentEmotion } from "@/types/emotion"
import {
  INTENSITY_TEXT,
  getEmotionColorVar,
  getIntensityLevel,
  getRiskBgVar,
  getRiskColorVar,
  getRiskLevelText,
} from "@/utils/emotion"

const props = withDefaults(
  defineProps<{
    emotion: CurrentEmotion
    /** 情绪分析请求进行中 */
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

const emotionColor = computed(() => getEmotionColorVar(props.emotion.primaryEmotion))
const intensityLevel = computed(() => getIntensityLevel(props.emotion.emotionScore))
const intensityText = computed(() => INTENSITY_TEXT[intensityLevel.value])
const riskColor = computed(() => getRiskColorVar(props.emotion.riskLevel))
const riskBg = computed(() => getRiskBgVar(props.emotion.riskLevel))
const riskText = computed(() => getRiskLevelText(props.emotion.riskLevel))

const actions = computed(() => props.emotion.improvementSuggestions ?? [])

/** 仅在「负面情绪且风险 ≥ 预警」时提示，避免正常对话被打扰 */
const showRiskNotice = computed(
  () => props.emotion.isNegative && props.emotion.riskLevel > 1,
)
</script>

<template>
  <section class="garden" aria-labelledby="garden-title">
    <header class="garden__header">
      <h3 id="garden-title" class="garden__title">
        <el-icon><Sunny /></el-icon>
        情绪花园
      </h3>
      <el-tag
        v-if="loading"
        size="small"
        type="info"
        effect="plain"
        class="garden__loading"
      >
        分析中
      </el-tag>
    </header>

    <!-- 情绪球：颜色 / 名称 / 评分都是真实数据 -->
    <div
      class="emotion-orb"
      :style="{ '--orb-color': emotionColor }"
      role="img"
      :aria-label="`当前主要情绪 ${emotion.primaryEmotion}，评分 ${emotion.emotionScore}`"
    >
      <span class="emotion-orb__name">{{ emotion.primaryEmotion }}</span>
      <span class="emotion-orb__score">{{ emotion.emotionScore }}</span>
    </div>

    <dl class="garden__metrics">
      <div class="garden__metric">
        <dt>情绪强度</dt>
        <dd>
          <span class="dots" :aria-label="`强度 ${intensityText}`">
            <span
              v-for="dot in 3"
              :key="dot"
              class="dots__dot"
              :class="{ 'is-on': intensityLevel >= dot }"
              :style="{ '--orb-color': emotionColor }"
            />
          </span>
          <span class="garden__metric-text">{{ intensityText }}</span>
        </dd>
      </div>
      <div class="garden__metric">
        <dt>风险等级</dt>
        <dd>
          <span
            class="risk-chip"
            :style="{ color: riskColor, background: riskBg }"
          >
            {{ riskText }}
          </span>
        </dd>
      </div>
      <div class="garden__metric">
        <dt>情绪性质</dt>
        <dd>
          <el-tag
            size="small"
            :type="emotion.isNegative ? 'danger' : 'success'"
            effect="light"
          >
            {{ emotion.isNegative ? "需要关注" : "状态良好" }}
          </el-tag>
        </dd>
      </div>
    </dl>

    <!-- 小建议 -->
    <div v-if="emotion.suggestion" class="garden__card">
      <el-icon class="garden__card-icon"><MagicStick /></el-icon>
      <div class="garden__card-body">
        <p class="garden__card-title">给你的小建议</p>
        <p class="garden__card-text">{{ emotion.suggestion }}</p>
      </div>
    </div>

    <!-- 治愈小行动（原模板 class 拼写为 acitons-title，与样式 .actions-title 不匹配，标题从未生效） -->
    <div v-if="actions.length" class="garden__actions">
      <p class="garden__actions-title">
        <el-icon><Star /></el-icon>
        治愈小行动
      </p>
      <ul class="garden__actions-list">
        <li v-for="action in actions" :key="action" class="garden__action">
          <el-icon class="garden__action-icon"><Check /></el-icon>
          <span>{{ action }}</span>
        </li>
      </ul>
    </div>

    <!-- 风险提示 -->
    <div v-if="showRiskNotice" class="garden__notice" role="status">
      <el-icon class="garden__notice-icon"><WarningFilled /></el-icon>
      <div class="garden__card-body">
        <p class="garden__notice-title">温馨提示</p>
        <p class="garden__notice-text">
          {{ emotion.riskDescription || "这段时间你承受得比较多，如果持续感到难受，建议和可信任的人聊聊，或寻求专业心理支持。" }}
        </p>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.garden {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-4);
  padding: var(--xy-space-5);
  border: 1px solid var(--xy-border);
  border-radius: var(--xy-radius-lg);
  background: var(--xy-gradient-warm);
  box-shadow: var(--xy-shadow-sm);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--xy-space-2);
  }

  &__title {
    display: flex;
    align-items: center;
    gap: var(--xy-space-2);
    font-size: var(--xy-text-base);
    font-weight: 600;
    color: var(--xy-accent-700);

    .el-icon {
      color: var(--xy-accent-500);
    }
  }

  &__metrics {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-3);
    margin: 0;
  }

  &__metric {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--xy-space-3);

    dt {
      font-size: var(--xy-text-sm);
      color: var(--xy-ink-500);
    }

    dd {
      display: flex;
      align-items: center;
      gap: var(--xy-space-2);
      margin: 0;
    }
  }

  &__metric-text {
    font-size: var(--xy-text-sm);
    font-weight: 600;
    color: var(--xy-ink-700);
  }

  &__card,
  &__notice {
    display: flex;
    align-items: flex-start;
    gap: var(--xy-space-3);
    padding: var(--xy-space-4);
    border-radius: var(--xy-radius-md);
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.9);
    box-shadow: var(--xy-shadow-xs);
  }

  &__card-icon {
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 18px;
    color: var(--xy-accent-500);
  }

  &__card-body {
    min-width: 0;
  }

  &__card-title {
    margin-bottom: var(--xy-space-1);
    font-size: var(--xy-text-sm);
    font-weight: 600;
    color: var(--xy-ink-900);
  }

  &__card-text {
    font-size: var(--xy-text-sm);
    line-height: var(--xy-leading-relaxed);
    color: var(--xy-ink-700);
  }

  &__actions-title {
    display: flex;
    align-items: center;
    gap: var(--xy-space-2);
    margin-bottom: var(--xy-space-3);
    font-size: var(--xy-text-sm);
    font-weight: 600;
    color: var(--xy-accent-700);

    .el-icon {
      color: var(--xy-accent-500);
    }
  }

  &__actions-list {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-2);
  }

  &__action {
    display: flex;
    align-items: flex-start;
    gap: var(--xy-space-2);
    padding: var(--xy-space-3);
    border-radius: var(--xy-radius-sm);
    background: rgba(255, 255, 255, 0.72);
    font-size: var(--xy-text-sm);
    line-height: var(--xy-leading-normal);
    color: var(--xy-ink-700);
  }

  &__action-icon {
    flex-shrink: 0;
    margin-top: 3px;
    color: var(--xy-primary-500);
  }

  &__notice {
    background: var(--xy-risk-2-bg);
    border-color: rgba(168, 88, 34, 0.24);
  }

  &__notice-icon {
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 18px;
    color: var(--xy-risk-2);
  }

  &__notice-title {
    margin-bottom: var(--xy-space-1);
    font-size: var(--xy-text-sm);
    font-weight: 600;
    color: var(--xy-risk-2);
  }

  &__notice-text {
    font-size: var(--xy-text-sm);
    line-height: var(--xy-leading-relaxed);
    color: var(--xy-ink-700);
  }
}

// 情绪球
.emotion-orb {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-self: center;
  gap: 2px;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.85);
  color: #fff;
  background: var(--orb-color);
  box-shadow: 0 8px 20px rgba(27, 38, 36, 0.14);

  &__name {
    font-size: var(--xy-text-md);
    font-weight: 700;
    line-height: 1;
  }

  &__score {
    font-size: var(--xy-text-sm);
    font-weight: 600;
    opacity: 0.9;
  }
}

// 强度圆点
.dots {
  display: inline-flex;
  gap: 4px;

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--xy-ink-200);
    transition:
      background-color var(--xy-dur) var(--xy-ease),
      transform var(--xy-dur) var(--xy-ease-out);

    &.is-on {
      background: var(--orb-color);
      transform: scale(1.15);
    }
  }
}

.risk-chip {
  padding: 2px 10px;
  border-radius: var(--xy-radius-full);
  font-size: var(--xy-text-xs);
  font-weight: 600;
}
</style>
