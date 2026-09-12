<script setup lang="ts">
/**
 * 用户端布局壳
 *
 * 相对改造前的修复：
 *  - 品牌由「心理健康AI助手」收敛为 config 的 brand（心耘 / 心灵耕耘）
 *  - 页脚原先 `margin-top:auto` 但父级不是 flex，页脚根本不吸底 → 改为纵向 flex
 *  - `isLoggedIn` 原先只在 onMounted 取一次，路由切换/登出后状态不同步 → 改为 watch 路由
 *  - 登录态昵称、退出二次确认、当前页高亮、移动端抽屉导航均为新增
 */
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ElMessage, ElMessageBox } from "element-plus"
import { logout } from "@/api/admin"
import { brand } from "@/config"
import BrandLogo from "@/components/BrandLogo.vue"
import type { UserInfo } from "@/types/api"

const route = useRoute()
const router = useRouter()

interface NavItem {
  path: string
  label: string
  requiresAuth: boolean
}

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "首页", requiresAuth: false },
  { path: "/consultation", label: "AI 咨询", requiresAuth: true },
  { path: "/emotion-diary", label: "情绪日记", requiresAuth: true },
  { path: "/knowledge", label: "知识库", requiresAuth: false },
]

const isLoggedIn = ref(false)
const userInfo = ref<UserInfo | null>(null)
const mobileNavOpen = ref(false)
const loggingOut = ref(false)

const readSession = () => {
  isLoggedIn.value = localStorage.getItem("token") !== null
  const raw = localStorage.getItem("userInfo")
  if (!raw) {
    userInfo.value = null
    return
  }
  try {
    userInfo.value = JSON.parse(raw) as UserInfo
  } catch {
    userInfo.value = null
  }
}

readSession()
// 路由变化即重新读取会话：登出、登录跳转后导航区能立刻同步
watch(() => route.fullPath, readSession)

const displayName = computed(
  () => userInfo.value?.nickName || userInfo.value?.username || "我的账户",
)

const avatarText = computed(() => displayName.value.slice(0, 1).toUpperCase())

const navItems = computed(() =>
  NAV_ITEMS.filter((item) => isLoggedIn.value || !item.requiresAuth),
)

/** "/" 必须精确匹配，否则首页永远高亮 */
const isActive = (path: string) =>
  path === "/" ? route.path === "/" : route.path.startsWith(path)

const closeMobileNav = () => {
  mobileNavOpen.value = false
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm("退出后需要重新登录才能继续对话，确定退出吗？", "退出登录", {
      confirmButtonText: "确定退出",
      cancelButtonText: "再想想",
      type: "warning",
    })
  } catch {
    return // 用户取消
  }
  loggingOut.value = true
  try {
    await logout()
  } catch {
    // 后端登出失败也应清掉本地会话，否则用户被困在登录态
    ElMessage.warning("服务端登出未成功，本地登录状态已清除")
  } finally {
    localStorage.removeItem("token")
    localStorage.removeItem("userInfo")
    loggingOut.value = false
    readSession()
    closeMobileNav()
    router.push("/auth/login")
  }
}

const handleUserCommand = (command: string | number | object) => {
  if (command === "logout") handleLogout()
}
</script>

<template>
  <div class="frontend-layout">
    <a class="skip-to-content" href="#main-content">跳到主要内容</a>

    <header class="site-header">
      <div class="site-header__inner">
        <BrandLogo :size="42" :subtitle="brand.fullName" to="/" />

        <!-- 桌面导航 -->
        <nav class="site-nav" aria-label="主导航">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="site-nav__link"
            :class="{ 'is-active': isActive(item.path) }"
            :aria-current="isActive(item.path) ? 'page' : undefined"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <div class="site-actions">
          <template v-if="isLoggedIn">
            <el-dropdown trigger="click" @command="handleUserCommand">
              <button class="user-chip" type="button">
                <el-avatar :size="34" class="user-chip__avatar">
                  {{ avatarText }}
                </el-avatar>
                <span class="user-chip__name">{{ displayName }}</span>
                <el-icon class="user-chip__caret"><ArrowDown /></el-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>
                    {{ userInfo?.email || "已登录" }}
                  </el-dropdown-item>
                  <el-dropdown-item divided command="logout" :disabled="loggingOut">
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <router-link to="/auth/login" class="site-nav__link">登录</router-link>
            <el-button type="primary" @click="router.push('/auth/register')">
              免费注册
            </el-button>
          </template>

          <!-- 移动端菜单按钮 -->
          <button
            class="nav-toggle"
            type="button"
            aria-label="打开导航菜单"
            :aria-expanded="mobileNavOpen"
            @click="mobileNavOpen = true"
          >
            <el-icon><Menu /></el-icon>
          </button>
        </div>
      </div>
    </header>

    <main id="main-content" class="main-container">
      <router-view />
    </main>

    <footer class="site-footer">
      <div class="site-footer__inner">
        <BrandLogo :size="34" :subtitle="brand.fullName" :on-dark="true" to="" />
        <p class="site-footer__note">
          {{ brand.name }}提供的是情绪陪伴与自助参考，不替代专业医疗诊断与治疗。若您正经历强烈痛苦或有伤害自己的念头，请立即联系身边可信任的人或当地心理援助热线。
        </p>
        <p class="site-footer__copyright">{{ brand.copyright }}</p>
      </div>
    </footer>

    <!-- 移动端导航抽屉 -->
    <el-drawer
      v-model="mobileNavOpen"
      direction="rtl"
      size="78%"
      :with-header="false"
    >
      <div class="mobile-nav">
        <BrandLogo :size="38" :subtitle="brand.fullName" to="/" @click="closeMobileNav" />
        <nav class="mobile-nav__links" aria-label="移动端导航">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="mobile-nav__link"
            :class="{ 'is-active': isActive(item.path) }"
            @click="closeMobileNav"
          >
            {{ item.label }}
            <el-icon><ArrowRight /></el-icon>
          </router-link>
        </nav>
        <div class="mobile-nav__footer">
          <el-button
            v-if="isLoggedIn"
            class="mobile-nav__logout"
            :loading="loggingOut"
            @click="handleLogout"
          >
            退出登录
          </el-button>
          <template v-else>
            <el-button class="mobile-nav__logout" @click="router.push('/auth/login')">
              登录
            </el-button>
            <el-button
              type="primary"
              class="mobile-nav__logout"
              @click="router.push('/auth/register')"
            >
              免费注册
            </el-button>
          </template>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style lang="scss" scoped>
.frontend-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--xy-bg);
}

// -----------------------------------------------------------------------------
// 顶部导航：吸顶 + 毛玻璃
// -----------------------------------------------------------------------------
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--xy-z-nav);
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--xy-border);

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--xy-space-6);
    width: 100%;
    max-width: var(--xy-content-width);
    margin: 0 auto;
    padding: var(--xy-space-3) var(--xy-space-5);

    @media (max-width: 900px) {
      padding: var(--xy-space-3) var(--xy-space-4);
    }
  }
}

.site-nav {
  display: flex;
  align-items: center;
  gap: var(--xy-space-2);

  @media (max-width: 900px) {
    display: none;
  }

  &__link {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 var(--xy-space-4);
    border-radius: var(--xy-radius-sm);
    color: var(--xy-ink-700);
    font-size: var(--xy-text-base);
    font-weight: 500;
    transition:
      color var(--xy-dur-fast) var(--xy-ease),
      background-color var(--xy-dur-fast) var(--xy-ease);

    &:hover {
      color: var(--xy-primary-600);
      background: var(--xy-primary-50);
    }

    // 当前页：底部指示条，不依赖颜色单一维度
    &.is-active {
      color: var(--xy-primary-600);
      font-weight: 600;

      &::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: 2px;
        width: 18px;
        height: 2px;
        border-radius: var(--xy-radius-full);
        background: var(--xy-primary-500);
        transform: translateX(-50%);
      }
    }
  }
}

.site-actions {
  display: flex;
  align-items: center;
  gap: var(--xy-space-3);

  // 窄屏下导航区按钮是主要触控入口，统一抬到 44px
  @media (max-width: 900px) {
    gap: var(--xy-space-2);

    :deep(.el-button) {
      min-height: 44px;
      padding-inline: var(--xy-space-4);
    }
  }
}

.user-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--xy-space-2);
  padding: 4px 10px 4px 4px;
  border: 1px solid var(--xy-border);
  border-radius: var(--xy-radius-full);
  background: var(--xy-surface);
  color: var(--xy-ink-700);
  font-family: inherit;
  font-size: var(--xy-text-base);
  font-weight: 500;
  transition:
    border-color var(--xy-dur-fast) var(--xy-ease),
    box-shadow var(--xy-dur-fast) var(--xy-ease);

  &:hover {
    border-color: var(--xy-primary-300);
    box-shadow: var(--xy-shadow-xs);
  }

  &__avatar {
    flex-shrink: 0;
  }

  &__name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (max-width: 640px) {
      display: none;
    }
  }

  &__caret {
    color: var(--xy-ink-400);
    font-size: 12px;
  }
}

.nav-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  // 不加 flex-shrink:0 时，窄屏下这个按钮会被 flex 压缩到 38px，达不到 44px 触控目标
  flex-shrink: 0;
  border: 1px solid var(--xy-border);
  border-radius: var(--xy-radius-sm);
  background: var(--xy-surface);
  color: var(--xy-ink-700);
  font-size: 18px;

  @media (max-width: 900px) {
    display: inline-flex;
  }
}

// -----------------------------------------------------------------------------
// 主体：撑满剩余高度，页脚自然吸底
// -----------------------------------------------------------------------------
.main-container {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
}

// -----------------------------------------------------------------------------
// 页脚
// -----------------------------------------------------------------------------
.site-footer {
  flex-shrink: 0;
  background: var(--xy-primary-900);
  color: rgba(255, 255, 255, 0.82);

  &__inner {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-4);
    width: 100%;
    max-width: var(--xy-content-width);
    margin: 0 auto;
    padding: var(--xy-space-8) var(--xy-space-5);

    @media (max-width: 900px) {
      padding: var(--xy-space-6) var(--xy-space-4);
    }
  }

  &__note {
    max-width: 62ch;
    font-size: var(--xy-text-sm);
    line-height: var(--xy-leading-relaxed);
    color: rgba(255, 255, 255, 0.62);
  }

  &__copyright {
    padding-top: var(--xy-space-4);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    font-size: var(--xy-text-xs);
    color: rgba(255, 255, 255, 0.5);
  }
}

// -----------------------------------------------------------------------------
// 移动端抽屉
// -----------------------------------------------------------------------------
.mobile-nav {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-6);
  height: 100%;

  &__links {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-1);
  }

  &__link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
    padding: 0 var(--xy-space-4);
    border-radius: var(--xy-radius-sm);
    color: var(--xy-ink-700);
    font-size: var(--xy-text-md);
    font-weight: 500;
    transition: background-color var(--xy-dur-fast) var(--xy-ease);

    &:hover,
    &.is-active {
      background: var(--xy-primary-50);
      color: var(--xy-primary-600);
      font-weight: 600;
    }
  }

  &__footer {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-3);
    margin-top: auto;
  }

  &__logout {
    width: 100%;
    margin-left: 0 !important;
  }
}
</style>
