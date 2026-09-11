/** 业务用户类型：1 前台用户，2 管理员 */
export type UserType = 1 | 2

export interface UserInfo {
  id?: number
  username: string
  userType: UserType
  nickName?: string
  email?: string
  /** 其他后端字段按页面实际使用再补，禁止臆造必填 */
  [key: string]: unknown
}

/** 后端业务包装：code 为字符串 "200" | "-1"，不是 number */
export interface ApiResponse<T = unknown> {
  code: string
  msg?: string
  data: T
}

export interface LoginResult {
  token: string
  userInfo: UserInfo
}

export interface PageQuery {
  pageNum?: number
  pageSize?: number
  currentPage?: number
  size?: number
  [key: string]: unknown
}

/** 拦截器成功时返回 data.data，分页接口通常就是该结构 */
export interface PageResult<T = unknown> {
  records: T[]
  total: number
}
