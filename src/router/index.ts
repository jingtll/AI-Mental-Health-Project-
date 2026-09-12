import { createRouter, createWebHistory } from "vue-router"
import type { RouteRecordRaw } from "vue-router"
import BackenLayout from "@/components/BackenLayout.vue"
import AuthLayout from "@/components/AuthLayout.vue"
import FrontendLayout from "@/components/FrontendLayout.vue"
import type { UserInfo } from "@/types/api"

const backendRoutes: RouteRecordRaw[] = [
  {
    path: "/back",
    redirect: "/back/dashboard",
    component: BackenLayout,
    children: [
      {
        path: "dashboard",
        component: () => import("@/views/dashboard.vue"),
        meta: { title: "数据分析", icon: "PieChart" },
      },
      {
        path: "knowledge",
        component: () => import("@/views/knowledge.vue"),
        meta: { title: "知识文章", icon: "ChatLineSquare" },
      },
      {
        path: "consultations",
        component: () => import("@/views/consultations.vue"),
        meta: { title: "咨询记录", icon: "Message" },
      },
      {
        path: "emotional",
        component: () => import("@/views/emotional.vue"),
        meta: { title: "情绪日志", icon: "User" },
      },
    ],
  },
  {
    path: "/auth",
    component: AuthLayout,
    children: [
      {
        path: "login",
        component: () => import("@/views/login.vue"),
        meta: { title: "登录" },
      },
      {
        path: "register",
        component: () => import("@/views/register.vue"),
        meta: { title: "注册" },
      },
    ],
  },
]

const frontendRoutes: RouteRecordRaw[] = [
  {
    path: "/",
    component: FrontendLayout,
    children: [
      { path: "", component: () => import("@/views/home.vue") },
      {
        path: "consultation",
        component: () => import("@/views/consultation.vue"),
      },
      {
        path: "emotion-diary",
        component: () => import("@/views/emotionDairy.vue"),
      },
      {
        path: "knowledge",
        component: () => import("@/views/frontendKnowledge.vue"),
      },
      {
        path: "knowledge/article/:id",
        component: () => import("@/views/articleDetail.vue"),
        props: true,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes: [...backendRoutes, ...frontendRoutes],
  /**
   * 切换路由时回到页面顶部。
   * 原先没有 scrollBehavior：从知识库翻到文章详情、或从长列表进入咨询页时，
   * 会继承上一页的滚动位置，用户看到的是页面中段。浏览器前进/后退时恢复原位置。
   */
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem("token")
  if (token) {
    const raw = localStorage.getItem("userInfo")
    let userInfo: UserInfo | null = null
    try {
      userInfo = raw ? (JSON.parse(raw) as UserInfo) : null
    } catch {
      userInfo = null
    }
    if (userInfo && userInfo.userType == 2) {
      if (to.path.startsWith("/back")) {
        next()
      } else {
        next("/back/dashboard")
      }
    } else if (userInfo && userInfo.userType == 1) {
      if (to.path.startsWith("/back") || to.path.startsWith("/auth")) {
        next("/")
      } else {
        next()
      }
    } else {
      // token 存在但 userInfo 缺失/损坏：清掉无效会话，避免对 /auth/login 无限重定向
      localStorage.removeItem("token")
      localStorage.removeItem("userInfo")
      if (to.path.startsWith("/auth")) {
        next()
      } else {
        next("/auth/login")
      }
    }
  } else {
    if (to.path.startsWith("/back")) {
      next("/auth/login")
    } else {
      next()
    }
  }
})

export default router
