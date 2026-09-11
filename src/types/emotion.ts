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
