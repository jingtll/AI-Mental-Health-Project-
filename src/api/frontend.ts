import service from "@/utils/request"
import type { PageQuery, PageResult } from "@/types/api"
import type {
  ChatMessage,
  ChatSession,
  StartSessionPayload,
} from "@/types/session"
import type { EmotionDiaryPayload, SessionEmotion } from "@/types/emotion"

export const register = (data: Record<string, unknown>) => {
  return service.post<string | null>("/user/add", data)
}

export const startSession = (data: StartSessionPayload) => {
  return service.post<ChatSession>("/psychological-chat/session/start", data)
}

export const getSessionList = (params: PageQuery) => {
  return service.get<PageResult<ChatSession>>("/psychological-chat/sessions", {
    params,
  })
}

export const deleteSession = (sessionId: number | string) => {
  return service.delete<null>(`/psychological-chat/sessions/${sessionId}`)
}

export const getSessionDetail = (sessionId: number | string) => {
  return service.get<ChatMessage[]>(
    `/psychological-chat/sessions/${sessionId}/messages`,
  )
}

export const getSessionEmotion = (sessionId: number | string) => {
  return service.get<SessionEmotion>(
    `/psychological-chat/session/${sessionId}/emotion`,
  )
}

export const addEmotionDiary = (data: EmotionDiaryPayload) => {
  return service.post<null>("/emotion-diary", data)
}

export const getKnowledgeList = (params: PageQuery) => {
  return service.get<PageResult<Record<string, unknown>>>(
    "/knowledge/article/page",
    { params },
  )
}

export const getKnowledgeDetail = (id: number | string) => {
  return service.get<Record<string, unknown>>(`/knowledge/article/${id}`)
}
