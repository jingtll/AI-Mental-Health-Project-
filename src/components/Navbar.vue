<script setup lang="ts">
/**
 * 后台顶栏
 *
 * 相对改造前的修复：
 *  - 登出时删的是小写 `userinfo`，而登录存的是 `userInfo` → 后台登出后 userInfo
 *    残留；现统一走 utils/session 的 clearSession()
 *  - 头像写死 element CDN 图片、用户名写死 "admin" → 改为读取真实登录信息
 *  - 折叠按钮图标恒定不变 → 随折叠状态在 Fold / Expand 间切换
 *  - 登出缺少失败兜底：后端不可达时用户会卡在登录态
 */
import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ElMessage, ElMessageBox } from "element-plus"
import { logout } from "@/api/admin"
import { useAdminStore } from "@/stores/admin"
import { brand } from "@/config"
import {
  clearSession,
  getAvatarText,
  getDisplayName,
  getUserInfo,
} from "@/utils/session"

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const isCollapse = computed(() => adminStore.isCollapse)
const pageTitle = computed(() => (route.meta.title as string | undefined) ?? "")
const userInfo = getUserInfo()
const displayName = ref(getDisplayName("管理员"))
const avatarText = ref(getAvatarText("管"))
const loggingOut = ref(false)

const handleCollapse = () => {
  adminStore.toggleCollapse()
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm("确定退出当前管理账号吗？", "退出登录", {
      confirmButtonText: "确定退出",
      cancelButtonText: "取消",
      type: "warning",
    })
  } catch {
    return
  }
  loggingOut.value = true
  try {
    await logout()
  } catch {
    ElMessage.warning("服务端登出未成功，本地登录状态已清除")
  } finally {
    clearSession()
    loggingOut.value = false
    router.push("/auth/login")
  }
}

const handleCommand = (command: string | number | object) => {
  if (command === "logout") handleLogout()
}
</script>

<template>
  <header class="navbar">
    <div class="navbar__left">
      <button
        class="navbar__collapse"
        type="button"
        :aria-label="isCollapse ? '展开侧边导航' : '收起侧边导航'"
        :aria-expanded="!isCollapse"
        @click="handleCollapse"
      >
        <el-icon>
          <component :is="isCollapse ? 'Expand' : 'Fold'" />
        </el-icon>
      </button>

      <div class="navbar__titles">
        <p class="navbar__crumb">{{ brand.name }} · {{ brand.adminSubtitle }}</p>
        <h1 class="navbar__title">{{ pageTitle }}</h1>
      </div>
    </div>

    <div class="navbar__right">
      <el-dropdown trigger="click" @command="handleCommand">
        <button class="admin-chip" type="button">
          <el-avatar :size="34">{{ avatarText }}</el-avatar>
          <span class="admin-chip__meta">
            <span class="admin-chip__name">{{ displayName }}</span>
            <span class="admin-chip__role">管理员</span>
          </span>
          <el-icon class="admin-chip__caret"><ArrowDown /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>
              {{ userInfo?.email || userInfo?.username || "已登录" }}
            </el-dropdown-item>
            <el-dropdown-item divided @click="router.push('/')">
              返回用户端
            </el-dropdown-item>
            <el-dropdown-item command="logout" :disabled="loggingOut">
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--xy-space-4);
  height: 100%;
  padding: 0 var(--xy-space-5);
  background: var(--xy-surface);
  border-bottom: 1px solid var(--xy-border);

  @media (max-width: 640px) {
    padding: 0 var(--xy-space-3);
  }

  &__left,
  &__right {
    display: flex;
    align-items: center;
    gap: var(--xy-space-4);
  }

  &__collapse {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    // 窄屏下不加 flex-shrink:0 会被压缩到 31px，达不到触控目标
    flex-shrink: 0;
    border: 1px solid var(--xy-border);
    border-radius: var(--xy-radius-sm);
    background: var(--xy-surface);
    color: var(--xy-ink-700);
    font-size: 17px;
    transition:
      color var(--xy-dur-fast) var(--xy-ease),
      border-color var(--xy-dur-fast) var(--xy-ease),
      background-color var(--xy-dur-fast) var(--xy-ease);

    &:hover {
      color: var(--xy-primary-600);
      border-color: var(--xy-primary-300);
      background: var(--xy-primary-50);
    }
  }

  &__titles {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
  }

  &__crumb {
    font-size: var(--xy-text-xs);
    font-weight: 500;
    letter-spacing: 0.1em;
    color: var(--xy-ink-400);

    @media (max-width: 640px) {
      display: none;
    }
  }

  &__title {
    font-size: var(--xy-text-lg);
    font-weight: 600;
    color: var(--xy-ink-900);

    @media (max-width: 640px) {
      font-size: var(--xy-text-md);
    }
  }
}

.admin-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--xy-space-2);
  padding: 4px 10px 4px 4px;
  border: 1px solid var(--xy-border);
  border-radius: var(--xy-radius-full);
  background: var(--xy-surface);
  color: var(--xy-ink-700);
  font-family: inherit;
  transition:
    border-color var(--xy-dur-fast) var(--xy-ease),
    box-shadow var(--xy-dur-fast) var(--xy-ease);

  &:hover {
    border-color: var(--xy-primary-300);
    box-shadow: var(--xy-shadow-xs);
  }

  &__meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.2;

    @media (max-width: 640px) {
      display: none;
    }
  }

  &__name {
    font-size: var(--xy-text-base);
    font-weight: 600;
    color: var(--xy-ink-900);
  }

  &__role {
    font-size: 11px;
    color: var(--xy-ink-400);
  }

  &__caret {
    color: var(--xy-ink-400);
    font-size: 12px;
  }
}
</style>
