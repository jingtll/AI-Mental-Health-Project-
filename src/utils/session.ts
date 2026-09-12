import type { UserInfo } from "@/types/api"

/**
 * 登录态的读写唯一入口。
 *
 * 背景：原实现里 FrontendLayout 用 `userInfo`、Navbar 登出时却删 `userinfo`
 * （小写），大小写不一致导致后台登出后 `userInfo` 残留在 localStorage 里。
 * 所有读写登录态的地方统一走这里，杜绝再次写错键名。
 */

const TOKEN_KEY = "token"
const USER_INFO_KEY = "userInfo"

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)

export const isLoggedIn = (): boolean => getToken() !== null

/** userInfo 缺失或 JSON 损坏时返回 null（不抛错） */
export const getUserInfo = (): UserInfo | null => {
  const raw = localStorage.getItem(USER_INFO_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserInfo
  } catch {
    return null
  }
}

export const setSession = (token: string, userInfo: UserInfo): void => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
}

export const clearSession = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_INFO_KEY)
}

/** 展示名：优先昵称，其次用户名，最后兜底文案 */
export const getDisplayName = (fallback = "我的账户"): string => {
  const info = getUserInfo()
  return info?.nickName || info?.username || fallback
}

/** 头像占位文字：取展示名首字 */
export const getAvatarText = (fallback = "我"): string =>
  getDisplayName(fallback).slice(0, 1).toUpperCase()
