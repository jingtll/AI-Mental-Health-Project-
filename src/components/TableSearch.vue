<script setup>
import { ref, reactive, computed } from "vue";
const props = defineProps({
  formItem: {
    type: Array,
    default: () => [],
  },
});
const emit = defineEmits(["search"]);
//表单数据
const formData = reactive({});

const isComp = (comp) => {
  return { input: "el-input", select: "el-select" }[comp];
};
const handleSearch = () => {
  // console.log(formData);
  emit("search", formData);
};
const handleReset = (formEl) => {
  // 如果没有传入表单实例 → 直接退出，避免代码报错
  if (!formEl) return;
  // 调用 Element Plus 表单自带的方法：重置所有表单项
  formEl.resetFields();
  //核心业务逻辑：重置后，自动触发搜索，把清空后的表单数据传给父组件
  emit("search", formData);
};
const formItemAttrs = computed(() => {
  const { formItem } = props;
  formItem.forEach((item) => {
    item.col = { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 };
  });
  return formItem;
});
const ruleFormRef = ref();
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
