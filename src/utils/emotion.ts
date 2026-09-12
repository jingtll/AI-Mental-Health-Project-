/**
 * 情绪 / 风险 映射的唯一来源。
 *
 * 说明：
 * - 标签类型（success/info/warning/danger）与风险文案沿用 `课件.md` 的既有映射，
 *   不做语义改动，避免与后端取值对不上。
 * - 新增的是「颜色」维度：原实现里 consultation.vue 与 emotional.vue 各自维护
 *   一份映射，且用的是 Element Plus 默认色与亮绿/亮金，在白底上对比度不足。
 *   这里统一返回设计令牌变量名，颜色由 src/styles/_tokens.scss 定义并已验证对比度。
 */

export type EpTagType = "primary" | "success" | "warning" | "info" | "danger"

// -----------------------------------------------------------------------------
// 风险等级
// -----------------------------------------------------------------------------
export const RISK_LEVEL_TEXT: Record<number, string> = {
  0: "正常",
  1: "关注",
  2: "预警",
  3: "危机",
}

const RISK_LEVEL_TAG: Record<number, EpTagType> = {
  0: "success",
  1: "info",
  2: "warning",
  3: "danger",
}

export const getRiskLevelText = (riskLevel: number | string): string =>
  RISK_LEVEL_TEXT[Number(riskLevel)] ?? "未知风险等级"

export const getRiskLevelTagType = (riskLevel: number | string): EpTagType =>
  RISK_LEVEL_TAG[Number(riskLevel)] ?? "info"

/** 风险等级主色（文字/图标） */
export const getRiskColorVar = (riskLevel: number | string): string =>
  `var(--xy-risk-${[0, 1, 2, 3].includes(Number(riskLevel)) ? Number(riskLevel) : 0})`

/** 风险等级浅底色（卡片背景） */
export const getRiskBgVar = (riskLevel: number | string): string =>
  `var(--xy-risk-${[0, 1, 2, 3].includes(Number(riskLevel)) ? Number(riskLevel) : 0}-bg)`

// -----------------------------------------------------------------------------
// 情绪标签类型
// -----------------------------------------------------------------------------
const EMOTION_TAG: Record<string, EpTagType> = {
  快乐: "success",
  平静: "info",
  兴奋: "warning",
  愤怒: "danger",
  悲伤: "info",
  焦虑: "warning",
}

export const getEmotionTagType = (emotion?: string): EpTagType =>
  (emotion && EMOTION_TAG[emotion]) || "info"

const AI_EMOTION_TAG: Record<string, EpTagType> = {
  快乐: "success",
  平静: "success",
  兴奋: "warning",
  满足: "success",
  愤怒: "danger",
  悲伤: "info",
  焦虑: "warning",
  恐惧: "danger",
  沮丧: "info",
  压力: "warning",
}

export const getAiEmotionTagType = (emotion?: string): EpTagType =>
  (emotion && AI_EMOTION_TAG[emotion]) || "info"

// -----------------------------------------------------------------------------
// 情绪强度色（沿用课件阈值：≥80 高、≥60 偏高、≥40 中性、其余偏低）
// -----------------------------------------------------------------------------
export const getEmotionScoreColor = (score: number): string => {
  if (score >= 80) return "var(--xy-risk-3)"
  if (score >= 60) return "var(--xy-risk-2)"
  if (score >= 40) return "var(--xy-risk-1)"
  return "var(--xy-risk-0)"
}

/** 情绪强度档位：1 低 / 2 中 / 3 高（情绪花园的圆点） */
export const getIntensityLevel = (score: number): 1 | 2 | 3 => {
  if (score >= 61) return 3
  if (score >= 31) return 2
  return 1
}

export const INTENSITY_TEXT: Record<1 | 2 | 3, string> = {
  1: "轻微",
  2: "中等",
  3: "强烈",
}

// -----------------------------------------------------------------------------
// 八种主要情绪：名称 + 视觉资源 + 令牌色
// 与 src/assets/images/*.png 一一对应，情绪日记与聊天侧栏共用同一份定义
// -----------------------------------------------------------------------------
export interface EmotionOption {
  name: string
  url: string
  /** 对应设计令牌变量 */
  colorVar: string
}

const emotionImage = (file: string) =>
  new URL(`../assets/images/${file}.png`, import.meta.url).href

export const EMOTION_OPTIONS: EmotionOption[] = [
  { name: "开心", url: emotionImage("开心"), colorVar: "var(--xy-emotion-happy)" },
  { name: "平静", url: emotionImage("平静"), colorVar: "var(--xy-emotion-calm)" },
  { name: "焦虑", url: emotionImage("焦虑"), colorVar: "var(--xy-emotion-anxious)" },
  { name: "悲伤", url: emotionImage("悲伤"), colorVar: "var(--xy-emotion-sad)" },
  { name: "兴奋", url: emotionImage("兴奋"), colorVar: "var(--xy-emotion-excited)" },
  { name: "疲惫", url: emotionImage("疲惫"), colorVar: "var(--xy-emotion-tired)" },
  { name: "惊讶", url: emotionImage("惊讶"), colorVar: "var(--xy-emotion-surprised)" },
  { name: "困惑", url: emotionImage("困惑"), colorVar: "var(--xy-emotion-confused)" },
]

const EMOTION_COLOR: Record<string, string> = {
  ...EMOTION_OPTIONS.reduce(
    (acc, item) => {
      acc[item.name] = item.colorVar
      return acc
    },
    {} as Record<string, string>,
  ),
  // 接口可能返回的其它情绪名：没有对应渐变图片，但情绪球需要一个说得通的颜色，
  // 否则会全部落到中性灰，看起来像「没有数据」。
  中性: "var(--xy-info)", // 平静的蓝灰
  快乐: "var(--xy-emotion-happy)",
  满足: "var(--xy-emotion-happy)",
  愤怒: "var(--xy-risk-3)",
  恐惧: "var(--xy-emotion-tired)",
  沮丧: "var(--xy-emotion-sad)",
  压力: "var(--xy-emotion-anxious)",
}

/** 情绪名 → 令牌色；未收录的情绪回落到中性色 */
export const getEmotionColorVar = (emotion?: string): string =>
  (emotion && EMOTION_COLOR[emotion]) || "var(--xy-ink-500)"

/** 情绪图片地址；未收录时返回 undefined，交由调用方显示兜底 */
export const getEmotionImage = (emotion?: string): string | undefined =>
  EMOTION_OPTIONS.find((item) => item.name === emotion)?.url

/**
 * 情绪日记的 1–10 分档位文案（沿用课件原文，不做改写）
 */
export const MOOD_SCORE_TEXTS = [
  "绝望崩溃",
  "消沉抑郁",
  "焦虑烦躁",
  "低落不悦",
  "平静淡然",
  "轻松惬意",
  "愉悦舒心",
  "欢欣满足",
  "兴奋欣喜",
  "极致幸福",
]
