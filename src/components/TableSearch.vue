<script setup lang="ts">
/**
 * 通用搜索表单（后台列表页）
 * props：formItem 保持原样兼容；新增 labelWidth / loading 两个可选 prop。
 *
 * 相对改造前的修复：
 *  - 表单项没有统一 label 宽度，各行标签长短不一，栅格右边缘参差不齐
 *    → 默认 labelWidth = 80px（可由调用方覆盖）。
 *  - 输入框回车不触发查询，只能用鼠标点按钮 → 补 enter 提交。
 *  - 查询按钮没有 loading 态，接口慢时用户会重复点击 → 开放 loading prop。
 *  - `formItemAttrs` 无视传入的 `col`，把每一项都强制成同一组断点
 *    → 改为「调用方传了 col 就用调用方的，没传才用默认断点」。
 *  - 组件内零样式，按钮区与栅格没有间距 → 用设计令牌补齐。
 */
import { computed, reactive, ref } from "vue"
import type { FormInstance } from "element-plus"

export interface SearchFormOption {
  label: string
  value: string | number
}

export interface SearchFormItem {
  comp: "input" | "select"
  prop: string
  label: string
  placeholder?: string
  options?: SearchFormOption[]
  col?: Record<string, number>
}

const props = withDefaults(
  defineProps<{
    formItem?: SearchFormItem[]
    /** 标签宽度，保证多行表单栅格对齐 */
    labelWidth?: string
    /** 查询请求进行中 */
    loading?: boolean
  }>(),
  {
    formItem: () => [],
    labelWidth: "80px",
    loading: false,
  },
)

const emit = defineEmits<{
  search: [payload: Record<string, unknown>]
}>()

const formData = reactive<Record<string, unknown>>({})

const isComp = (comp: SearchFormItem["comp"]) => {
  const map = { input: "el-input", select: "el-select" } as const
  return map[comp]
}

const handleSearch = () => {
  emit("search", { ...formData })
}

const handleReset = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  formEl.resetFields()
  emit("search", { ...formData })
}

const DEFAULT_COL = { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 }

const formItemAttrs = computed(() =>
  props.formItem.map((item) => ({
    ...item,
    col: item.col ?? DEFAULT_COL,
  })),
)

const ruleFormRef = ref<FormInstance>()
</script>

<template>
  <el-form
    ref="ruleFormRef"
    :model="formData"
    :label-width="props.labelWidth"
    class="table-search"
    @submit.prevent
  >
    <el-row :gutter="24">
      <el-col v-for="item in formItemAttrs" :key="item.prop" v-bind="item.col">
        <el-form-item :label="item.label" :prop="item.prop">
          <component
            v-model="formData[item.prop]"
            :is="isComp(item.comp)"
            :placeholder="item.placeholder"
            clearable
            @keyup.enter="handleSearch"
          >
            <template v-if="item.comp === 'select'">
              <el-option
                v-for="opt in item.options"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </template>
          </component>
        </el-form-item>
      </el-col>
    </el-row>

    <div class="table-search__actions">
      <el-button
        type="primary"
        :loading="props.loading"
        @click="handleSearch"
      >
        <el-icon v-if="!props.loading"><Search /></el-icon>
        查询
      </el-button>
      <el-button :disabled="props.loading" @click="handleReset(ruleFormRef)">
        <el-icon><RefreshLeft /></el-icon>
        重置
      </el-button>
    </div>
  </el-form>
</template>

<style lang="scss" scoped>
.table-search {
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--xy-space-2);
    padding-bottom: var(--xy-space-1);

    :deep(.el-button + .el-button) {
      margin-left: 0;
    }
  }

  // 窄屏：Element Plus 会把 label-width 写成行内 style（label 的 width、
  // content 的 margin-left），只改 label 宽度会让右侧控件被压成很窄一条
  // （实测 375px 下选择框只剩 24px 宽，没法点）。这里改为标准做法：
  // 断点以下切换成标签在上、控件占满整行的堆叠布局，用 !important 盖掉行内样式。
  @media (max-width: 640px) {
    :deep(.el-form-item) {
      display: block;
      margin-bottom: var(--xy-space-3);
    }

    :deep(.el-form-item__label) {
      display: block;
      width: 100% !important;
      padding: 0 0 var(--xy-space-1);
      text-align: left;
      line-height: 1.4;
    }

    :deep(.el-form-item__content) {
      margin-left: 0 !important;
    }
  }
}
</style>
