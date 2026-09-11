import axios from "axios"
import type { AxiosRequestConfig } from "axios"
import { ElMessage } from "element-plus"
import type { ApiResponse } from "@/types/api"

const service = axios.create({
  baseURL: `/api`,
  timeout: 5000,
})

service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers["token"] = token
    }
    return config
  },
  (error) => Promise.reject(error),
)

service.interceptors.response.use(
  (response) => {
    const { data, config } = response as {
      data: ApiResponse
      config: { url?: string }
    }
    if (data.code === "200") {
      return data.data as never
    }
    if (data.code === "-1") {
      if (!config.url?.includes("/login")) {
        ElMessage.error(data.msg || "登录过期，请重新登录")
        localStorage.removeItem("token")
        localStorage.removeItem("userInfo")
        window.location.href = "/auth/login"
      } else {
        ElMessage.error(data.msg || "登录过期，请重新登录")
        return Promise.reject("网络请求失败")
      }
    }
    // 其他业务码：reject，避免把完整 AxiosResponse 当业务数据 resolve
    return Promise.reject(data.msg || "业务处理失败")
  },
  (error) => Promise.reject(error),
)

/**
 * 拦截器成功时已把 ApiResponse.data 拆包为 T。
 * axios 声明类型仍是 AxiosResponse<T>，这里统一收敛为 Promise<T>。
 */
const http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, config) as unknown as Promise<T>
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config) as unknown as Promise<T>
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.put(url, data, config) as unknown as Promise<T>
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.delete(url, config) as unknown as Promise<T>
  },
}

export default http
