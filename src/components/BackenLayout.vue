<script setup lang="ts">
/**
 * 后台布局壳（文件名拼写为历史遗留，勿改）
 *
 * 相对改造前的修复：
 *  - 模板写的是 `conten-container`（拼写错误），而样式选择器是 `.content-container`
 *    → 内边距/背景从未生效；现统一为 `.content-container`
 *  - 原先靠全局 `.el-header{height:50px!important}` 与本地 `74px!important` 对打
 *    → 改用 Element Plus 的 --el-header-height 变量，去掉 !important
 *  - 侧栏原先固定 248px：在 375px 视口下会吃掉三分之二屏幕，主内容只剩约 51px 宽
 *    （实测搜索框被压成 51px），等于不可用 → 新增按视口宽度自动折叠侧栏，
 *    状态写入 Pinia，保证菜单视觉与折叠加载态一致
 */
import { onBeforeUnmount, onMounted } from "vue"
import Sidebar from "./Sidebar.vue"
import Navbar from "./Navbar.vue"
import { useAdminStore } from "@/stores/admin"

const adminStore = useAdminStore()

/** 与 _tokens.scss 的 md 断点保持一致：900px 以下视为窄屏 */
const NARROW_QUERY = "(max-width: 900px)"
let mql: MediaQueryList | null = null

const syncCollapseByViewport = (event: MediaQueryList | MediaQueryListEvent) => {
  adminStore.setCollapse(event.matches)
}

onMounted(() => {
  mql = window.matchMedia(NARROW_QUERY)
  syncCollapseByViewport(mql)
  mql.addEventListener("change", syncCollapseByViewport)
})

onBeforeUnmount(() => {
  mql?.removeEventListener("change", syncCollapseByViewport)
})
</script>

<template>
  <div class="backend-layout">
    <el-container class="backend-layout__container">
      <Sidebar />
      <el-container class="backend-layout__body">
        <el-header class="backend-layout__header">
          <Navbar />
        </el-header>
        <el-main class="backend-layout__main">
          <router-view class="content-container" />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style lang="scss" scoped>
.backend-layout {
  height: 100vh;
  overflow: hidden;

  &__container {
    height: 100%;
  }

  &__body {
    // 用组件变量替代 !important 硬改高度
    --el-header-height: 72px;
    min-width: 0;
  }

  &__header {
    padding: 0;
    background: var(--xy-surface);
  }

  &__main {
    flex: 1;
    padding: var(--xy-space-5);
    min-height: 0;
    overflow: auto;
    background: var(--xy-bg);

    @media (max-width: 640px) {
      padding: var(--xy-space-3);
    }
  }
}

.content-container {
  padding: var(--xy-space-5);
  background: var(--xy-surface);
  border: 1px solid var(--xy-border);
  border-radius: var(--xy-radius-lg);
  box-shadow: var(--xy-shadow-xs);
  min-height: 100%;

  @media (max-width: 640px) {
    padding: var(--xy-space-3);
    border-radius: var(--xy-radius-md);
  }
}
</style>
