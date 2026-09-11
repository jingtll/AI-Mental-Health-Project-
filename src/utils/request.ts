import axios from "axios"
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

export default service
