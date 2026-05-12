<script setup>
import { ElAside } from "element-plus";
import { useRouter } from "vue-router";
import { useAdminStore } from "@/stores/admin";
import { computed } from "vue";
const router = useRouter();
console.log(router, "router");
const iconUrl = new URL("@/assets/images/机器人.png", import.meta.url).href;
const selectMenu = (key) => {
  console.log(key, "key");
  const currentRoute = router.options.routes[0];
  router.push(`${currentRoute.path}/${key.index}`);
};
const isCollapse = computed(() => useAdminStore().isCollapse);
</script>

<template>
  <el-aside :width="isCollapse ? '64px' : '264px'">
    <el-menu
      :collapse="isCollapse"
      :collapse-transition="false"
      default-active="2"
      class="menu-style"
    >
      <div class="brand">
        <el-image
          style="width: 50px; height: 50px; margin-right: 10px"
          :src="iconUrl"
          alt="logo"
        />
        <div v-show="!isCollapse" class="info-card">
          <h1 class="brand-title">心理健康AI助手</h1>
          <p class="branch-subtitle">管理后台</p>
        </div>
      </div>
      <el-menu-item
        @click="selectMenu"
        v-for="item in router.options.routes[0].children"
        :key="item.path"
        :index="item.path"
      >
        <el-icon><component :is="item.meta.icon" /></el-icon>
        <span>{{ item.meta.title }}</span>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>
<style lang="scss" scoped>
.menu-style {
  height: 100%;
  .brand {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    background-color: #fff;
    border-bottom: 1px solid #e4e7ed;
    .info-card {
      .brand-title {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 5px;
        color: #1f2937;
      }
      .branch-subtitle {
        font-size: 14px;
        color: #6b7280;
      }
    }
  }
}
</style>
