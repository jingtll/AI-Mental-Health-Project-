import service from "@/utils/request"
import type { LoginResult, PageQuery, PageResult } from "@/types/api"
import type { ChatMessage, ChatSession } from "@/types/session"

export const login = (data: { username: string; password: string }) => {
  return service.post<LoginResult>("/user/login", data)
}

export const categoryTree = () => {
  return service.get<Array<{ id: number; categoryName: string }>>(
    "/knowledge/category/tree",
  )
}

export const articlePage = (params: PageQuery) => {
  return service.get<PageResult<Record<string, unknown>>>(
    "/knowledge/article/page",
    { params },
  )
}

export const uploadFile = (
  file: File,
  businessInfo: { businessId: number | string },
) => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("businessType", "ARTICLE")
  formData.append("businessId", String(businessInfo.businessId))
  formData.append("businessField", "cover")
  return service.post<{ filePath: string }>("/file/upload", formData, {
    headers: {
      "content-type": "multipart/form-data",
    },
  })
}

export const createArticle = (data: Record<string, unknown>) => {
  return service.post<null>("/knowledge/article", data)
}

export const getArticleDetail = (id: number | string) => {
  return service.get<Record<string, unknown>>(`/knowledge/article/${id}`)
}

export const updateArticle = (
  id: number | string,
  data: Record<string, unknown>,
) => {
  return service.put<null>(`/knowledge/article/${id}`, data)
}

export const changeArticleStatus = (
  id: number | string,
  data: { status: number },
) => {
  return service.put<null>(`/knowledge/article/${id}/status`, data)
}

export const deleteArticle = (id: number | string) => {
  return service.delete<null>(`/knowledge/article/${id}`)
}

export const getConsultationPage = (params: PageQuery) => {
  return service.get<PageResult<ChatSession>>("/psychological-chat/sessions", {
    params,
  })
}

export const getSessionDetail = (sessionId: number | string) => {
  return service.get<ChatMessage[]>(
    `/psychological-chat/sessions/${sessionId}/messages`,
  )
}

export const getEmotionalPage = (params: PageQuery) => {
  return service.get<PageResult<Record<string, unknown>>>(
    "/emotion-diary/admin/page",
    { params },
  )
}

export const deleteEmotional = (id: number | string) => {
  return service.delete<null>(`/emotion-diary/admin/${id}`)
}

export const getAnalyticsOverview = () => {
  return service.get<Record<string, unknown>>("/data-analytics/overview")
}

export const logout = () => {
  return service.post<null>("/user/logout")
}
