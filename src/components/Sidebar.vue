<script setup lang="ts">
/**
 * 后台侧边导航
 *
 * 相对改造前的修复：
 *  - 品牌「心理健康AI助手」→ config 的 brand（含 BrandLogo 图形标识）
 *  - `default-active="2"` 是硬编码死值，菜单项从不跟随路由高亮
 *    → 改为绑定 route.path，并开启 el-menu 的 router 模式（index 直接用完整路径）
 *  - 菜单项点击原先依赖 el-menu-item 内部 emit 出的事件对象取 index，脆弱
 *    → 交给 el-menu 的 router 模式处理，去掉手写 push
 */
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useAdminStore } from "@/stores/admin"
import { brand } from "@/config"
import BrandLogo from "@/components/BrandLogo.vue"

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const isCollapse = computed(() => adminStore.isCollapse)

interface BackendMenuItem {
  path: string
  meta?: { title?: string; icon?: string }
}

/** 与路由表同源：/back 的子路由即后台菜单 */
const backendChildren = computed<BackendMenuItem[]>(() => {
  const backendRoute = router.options.routes.find((r) => r.path === "/back")
  const children = (backendRoute?.children ?? []) as BackendMenuItem[]
  return children.map((item) => ({
    ...item,
    path: `/back/${item.path}`,
  }))
})

/** 当前高亮项：用完整路径精确匹配，刷新后也能正确高亮 */
const activeIndex = computed(() => route.path)
</script>

<template>
  <el-aside :width="isCollapse ? '68px' : '248px'" class="sidebar">
    <div class="sidebar__brand">
      <BrandLogo
        :size="38"
        :show-text="!isCollapse"
        :subtitle="brand.adminSubtitle"
        to="/back/dashboard"
      />
    </div>

    <el-menu
      :collapse="isCollapse"
      :collapse-transition="false"
      :default-active="activeIndex"
      router
      class="sidebar__menu"
    >
      <el-menu-item
        v-for="item in backendChildren"
        :key="item.path"
        :index="item.path"
      >
        <el-icon><component :is="item.meta?.icon" /></el-icon>
        <template #title>{{ item.meta?.title }}</template>
      </el-menu-item>
    </el-menu>

    <div class="sidebar__footer">
      <router-link v-if="!isCollapse" to="/" class="sidebar__link">
        <el-icon><Back /></el-icon>
        <span>返回用户端</span>
      </router-link>
      <router-link v-else to="/" class="sidebar__link sidebar__link--icon" title="返回用户端">
        <el-icon><Back /></el-icon>
      </router-link>
    </div>
  </el-aside>
</template>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  // 固定轨道宽度，不被内容挤压缩窄（窄屏下由 BackenLayout 自动切到折叠态）
  flex-shrink: 0;
  height: 100vh;
  background: var(--xy-surface);
  border-right: 1px solid var(--xy-border);
  transition: width var(--xy-dur) var(--xy-ease);
  overflow: hidden;

  &__brand {
    display: flex;
    align-items: center;
    padding: var(--xy-space-4);
    border-bottom: 1px solid var(--xy-border);

    :deep(.brand-logo__glyph) {
      border-radius: var(--xy-radius-sm);
    }

    :deep(.brand-logo__name) {
      font-size: var(--xy-text-lg);
    }

    :deep(.brand-logo__subtitle) {
      letter-spacing: 0.1em;
    }
  }

  &__menu {
    flex: 1;
    padding-top: var(--xy-space-2);
    overflow-y: auto;
    overflow-x: hidden;
  }

  &__footer {
    flex-shrink: 0;
    padding: var(--xy-space-3);
    border-top: 1px solid var(--xy-border);
  }

  &__link {
    display: flex;
    align-items: center;
    gap: var(--xy-space-2);
    min-height: 44px;
    padding: 0 var(--xy-space-3);
    border-radius: var(--xy-radius-sm);
    color: var(--xy-ink-500);
    font-size: var(--xy-text-sm);
    font-weight: 500;
    transition:
      color var(--xy-dur-fast) var(--xy-ease),
      background-color var(--xy-dur-fast) var(--xy-ease);

    &:hover {
      color: var(--xy-primary-600);
      background: var(--xy-primary-50);
    }

    &--icon {
      justify-content: center;
      padding: 0;
    }
  }
}
</style>
