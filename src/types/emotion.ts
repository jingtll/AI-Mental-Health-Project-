export interface EmotionDiaryPayload {
  moodScore: number | null
  content?: string
  tags?: string[]
  [key: string]: unknown
}

/** 会话情绪分析；字段以实际接口为准，未知可选 */
export interface SessionEmotion {
  primaryEmotion?: string
  emotionScore?: number
  isNegative?: boolean
  suggestion?: string
  riskLevel?: number
  improvementSuggestions?: string[]
  [key: string]: unknown
}

/**
 * 情绪花园的 UI 形态：接口字段全部可选，这里把必填项用默认值补齐，
 * 组件内部就不必到处写 `?? 默认值`。
 */
export type CurrentEmotion = SessionEmotion & {
  primaryEmotion: string
  emotionScore: number
  isNegative: boolean
  suggestion: string
  riskLevel: number
  improvementSuggestions: string[]
}

/** 无分析结果时的中性默认值（数值沿用改造前的 50 / 中性） */
export const createDefaultEmotion = (): CurrentEmotion => ({
  primaryEmotion: "中性",
  emotionScore: 50,
  isNegative: false,
  suggestion: "情绪状态平稳，继续保持属于你的节奏。",
  riskLevel: 0,
  improvementSuggestions: [],
})
