<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import type { FormInstance } from "element-plus";

export interface SearchFormOption {
  label: string;
  value: string | number;
}

export interface SearchFormItem {
  comp: "input" | "select";
  prop: string;
  label: string;
  placeholder?: string;
  options?: SearchFormOption[];
  col?: Record<string, number>;
}

const props = withDefaults(
  defineProps<{
    formItem?: SearchFormItem[];
  }>(),
  {
    formItem: () => [],
  },
);

const emit = defineEmits<{
  search: [payload: Record<string, unknown>];
}>();

const formData = reactive<Record<string, unknown>>({});

const isComp = (comp: SearchFormItem["comp"]) => {
  const map = { input: "el-input", select: "el-select" } as const;
  return map[comp];
};
const handleSearch = () => {
  emit("search", formData);
};
const handleReset = (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  formEl.resetFields();
  emit("search", formData);
};
const formItemAttrs = computed(() => {
  return props.formItem.map((item) => ({
    ...item,
    col: { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 },
  }));
});
const ruleFormRef = ref<FormInstance>();
</script>

<template>
  <el-form ref="ruleFormRef" :model="formData">
    <el-row :gutter="24">
      <template v-for="item in formItemAttrs" :key="item.prop">
        <el-col v-bind="item.col">
          <el-form-item :label="item.label" :prop="item.prop">
            <component
              v-model="formData[item.prop]"
              :is="isComp(item.comp)"
              :placeholder="item.placeholder"
            >
              <template v-if="item.comp === 'select'">
                <el-option
                  v-for="opt in item.options"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                ></el-option> </template
            ></component>
          </el-form-item>
        </el-col> </template
    ></el-row>
    <el-row>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset(ruleFormRef)">重置</el-button>
    </el-row>
  </el-form>
</template>

<style scoped></style>
