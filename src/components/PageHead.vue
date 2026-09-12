<script setup lang="ts">
/**
 * 后台页面标题条
 * 新增 subtitle（辅助说明）与默认插槽（筛选区等），保持 title / buttons 插槽兼容。
 */
const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
  }>(),
  {
    title: "页面标题",
    subtitle: "",
  },
)
</script>

<template>
  <div class="page-head">
    <div class="page-head__text">
      <h2 class="page-head__title">{{ props.title }}</h2>
      <p v-if="props.subtitle" class="page-head__subtitle">{{ props.subtitle }}</p>
    </div>
    <div class="page-head__actions">
      <slot name="buttons"></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--xy-space-4);
  margin-bottom: var(--xy-space-5);

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__title {
    font-size: var(--xy-text-xl);
    font-weight: 600;
    color: var(--xy-ink-900);
  }

  &__subtitle {
    font-size: var(--xy-text-sm);
    color: var(--xy-ink-500);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--xy-space-2);
    flex-shrink: 0;

    :deep(.el-button + .el-button) {
      margin-left: 0;
    }
  }
}
</style>
