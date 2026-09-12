/**
 * 时间格式化工具。
 *
 * 改造前多个页面直接把接口返回的 ISO 串渲染到界面上，用户看到的是
 * `2026-01-27T12:34:56.789Z` 这种原始值。此处统一收敛。
 * 所有函数对空值/非法值都返回占位符，绝不抛错、绝不返回 "Invalid Date"。
 */

const PLACEHOLDER = "—"

const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === "") return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "number") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value !== "string") return null
  // 兼容 "2026-01-27 12:34:56"（Safari 不接受空格分隔）与纯日期
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)
    ? value.replace(" ", "T")
    : value
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

const pad = (n: number) => String(n).padStart(2, "0")

/** 2026-09-12 */
export const formatDate = (value: unknown): string => {
  const d = toDate(value)
  if (!d) return PLACEHOLDER
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 14:30 */
export const formatClock = (value: unknown): string => {
  const d = toDate(value)
  if (!d) return PLACEHOLDER
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 2026-09-12 14:30 */
export const formatDateTime = (value: unknown): string => {
  const d = toDate(value)
  if (!d) return PLACEHOLDER
  return `${formatDate(d)} ${formatClock(d)}`
}

/** 09-12 14:30（列表用紧凑格式） */
export const formatShortDateTime = (value: unknown): string => {
  const d = toDate(value)
  if (!d) return PLACEHOLDER
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${formatClock(d)}`
}

/**
 * 聊天气泡/会话列表用的相对时间：
 *   1 分钟内 → 刚刚
 *   1 小时内 → 12 分钟前
 *   当天     → 14:30
 *   今年     → 09-12 14:30
 *   更早     → 2025-09-12
 */
export const formatRelative = (value: unknown): string => {
  const d = toDate(value)
  if (!d) return PLACEHOLDER
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < 0) return formatShortDateTime(d)
  if (diffMs < 60_000) return "刚刚"
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} 分钟前`
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return formatClock(d)
  if (d.getFullYear() === now.getFullYear()) return formatShortDateTime(d)
  return formatDate(d)
}

/** 秒 → "12 分 30 秒" / "45 秒" / "1 小时 5 分" */
export const formatDuration = (seconds?: number | null): string => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return PLACEHOLDER
  }
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total} 秒`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) return `${minutes} 分 ${total % 60} 秒`
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`
}
