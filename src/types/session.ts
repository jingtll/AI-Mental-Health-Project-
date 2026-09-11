export interface ChatSession {
  id: number
  sessionTitle: string
  status?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface ChatMessage {
  id: number | string
  senderType: 1 | 2
  content: string
  createdAt: string
  [key: string]: unknown
}

export interface StartSessionPayload {
  sessionTitle?: string
  userMessage?: string
  [key: string]: unknown
}
