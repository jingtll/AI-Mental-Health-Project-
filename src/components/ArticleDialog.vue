<script setup lang="ts">
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules, UploadRequestOptions } from "element-plus";
import { ref, reactive, computed, nextTick, watch } from "vue";
import { uploadFile, createArticle, updateArticle } from "@/api/admin";
import { fileBaseUrl } from "@/config/index";
import RichEditor from "@/components/RichTextEditor.vue";

interface CategoryOption {
  label: string;
  value: number;
}

interface ArticleDetail {
  id: number | string;
  title?: string;
  content?: string;
  coverImage?: string;
  categoryId?: number;
  summary?: string;
  tags?: string;
  [key: string]: unknown;
}

interface ArticleForm {
  title: string;
  content: string;
  coverImage: string;
  categoryId: number;
  summary: string;
  tagArray: string[];
  tags: string;
  id: string | number;
}

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    categories?: CategoryOption[];
    article?: ArticleDetail | null;
  }>(),
  {
    modelValue: false,
    categories: () => [],
    article: null,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  success: [];
}>();

const formRef = ref<FormInstance>();
const businessID = ref<string | number | null>(null);
const imgUrl = ref("");
const editorInstance = ref<{ setHtml?: (html: string) => void } | null>(null);
const btnPreview = ref(false);
const loading = ref(false);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => {
    emit("update:modelValue", val);
  },
});

const isEdit = computed(() => !!props.article?.id);

const formData = reactive<ArticleForm>({
  title: "",
  content: "",
  coverImage: "",
  categoryId: 1,
  summary: "",
  tagArray: [],
  tags: "",
  id: "",
});

const rules = reactive<FormRules>({
  title: [
    { required: true, message: "请输入文章标题", trigger: "blur" },
    { max: 200, message: "文章标题最多200个字符", trigger: "blur" },
  ],
  categoryId: [
    { required: true, message: "请选择文章分类", trigger: "change" },
  ],
  content: [
    { required: true, message: "请输入文章内容", trigger: "blur" },
    { max: 5000, message: "文章内容最多5000个字符", trigger: "blur" },
  ],
});

const commonTags = [
  "情绪管理",
  "焦虑",
  "抑郁",
  "压力",
  "睡眠",
  "冥想",
  "正念",
  "放松",
  "心理健康",
  "自我成长",
  "人际关系",
  "工作压力",
  "学习方法",
  "生活技巧",
];

const handleRemove = () => {
  imgUrl.value = "";
  formData.coverImage = "";
};

const handleClose = () => {
  formRef.value?.resetFields();
  businessID.value = null;
  handleRemove();
  formData.tagArray = [];
  emit("update:modelValue", false);
};

watch(
  () => props.article,
  (newVal) => {
    if (newVal) {
      nextTick(() => {
        Object.assign(formData, {
          title: newVal.title ?? "",
          content: newVal.content ?? "",
          coverImage: newVal.coverImage ?? "",
          categoryId: newVal.categoryId ?? 1,
          summary: newVal.summary ?? "",
          tags: newVal.tags ?? "",
          id: newVal.id,
        });
        businessID.value = newVal.id;
        imgUrl.value = fileBaseUrl + (newVal.coverImage ?? "");
      });
    }
  },
);

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith("image/");
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isImage) {
    ElMessage.error("上传封面图片，请选择图片文件");
    return false;
  }
  if (!isLt5M) {
    ElMessage.error("上传封面图片大小不能超过 5MB");
    return false;
  }
  return true;
};

const handleUploadRequest = async (options: UploadRequestOptions) => {
  businessID.value = crypto.randomUUID();
  const fileRes = await uploadFile(options.file as File, {
    businessId: businessID.value,
  });
  imgUrl.value = `${fileBaseUrl}${fileRes.filePath}`;
  formData.coverImage = fileRes.filePath;
};

const handleContentChange = (data: { html?: string; text?: string }) => {
  if (data.html != null) {
    formData.content = data.html;
  }
};

const handleEditorCreated = (editor: { setHtml?: (html: string) => void }) => {
  editorInstance.value = editor;
  if (formData.content && editor?.setHtml) {
    nextTick(() => {
      editor.setHtml?.(formData.content);
    });
  }
};

const handleSubmit = () => {
  formRef.value?.validate((valid) => {
    if (!valid) return;
    loading.value = true;
    const submitData: Record<string, unknown> = {
      ...formData,
      tags: formData.tagArray.join(","),
    };
    delete submitData.tagArray;

    if (!isEdit.value) {
      submitData.id = businessID.value;
      createArticle(submitData).then(() => {
        loading.value = false;
        emit("success");
      });
    } else if (props.article?.id != null) {
      updateArticle(props.article.id, submitData).then(() => {
        loading.value = false;
        emit("success");
      });
    } else {
      loading.value = false;
    }
  });
};
</script>

<template>
  <el-dialog
    :title="isEdit ? '编辑文章' : '新增文章'"
    v-model="dialogVisible"
    width="50%"
    @close="handleClose"
  >
    <el-form :model="formData" :rules="rules" ref="formRef" label-width="120px">
      <el-form-item label="文章标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入文章标题"
          maxlength="200"
          show-word-limit
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item label="所属分类" prop="categoryId">
        <el-select v-model="formData.categoryId" placeholder="请选择文章分类">
          <el-option
            v-for="category in props.categories"
            :key="category.value"
            :label="category.label"
            :value="category.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="文章摘要" prop="summary">
        <el-input
          type="textarea"
          v-model="formData.summary"
          placeholder="请输入文章摘要（可选）"
          maxlength="1000"
          show-word-limit
          rows="4"
          clearable
        ></el-input>
      </el-form-item>
      <el-form-item label="标签" prop="tags">
        <el-select
          v-model="formData.tagArray"
          placeholder="请输入文章标签，多个标签用逗号分隔（可选）"
          multiple
          filterable
          allow-create
          style="width: 100%"
        >
          <el-option
            v-for="tag in commonTags"
            :key="tag"
            :label="tag"
            :value="tag"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="封面图片">
        <div class="cover-upload">
          <el-upload
            class="avatar-uploader"
            action="#"
            :before-upload="beforeUpload"
            :http-request="handleUploadRequest"
            :show-file-list="false"
            accept="image/*"
          >
            <div v-if="!imgUrl" class="cover-placeholder">
              <p>点击上传封面</p>
            </div>
            <img v-else :src="imgUrl" class="cover-image" alt="封面图片" />
          </el-upload>
          <div v-if="imgUrl" class="cover-remove">
            <el-button type="danger" size="mini" @click="handleRemove"
              >移除封面</el-button
            >
          </div>
        </div>
      </el-form-item>
      <el-form-item label="文章内容" prop="content">
        <RichEditor
          v-model="formData.content"
          placeholder="请输入文章内容，支持富文本格式\n\n可以使用加粗，斜体，列表，标题等格式来丰富文章内容"
          :maxCharCount="5000"
          @change="handleContentChange"
          @created="handleEditorCreated"
          min-height="400px"
        />
      </el-form-item>
    </el-form>
    <div v-if="btnPreview">
      <h3>内容预览</h3>
      <div v-html="formData.content"></div>
    </div>
    <template #footer>
      <el-button @click="btnPreview = !btnPreview">{{
        btnPreview ? "隐藏预览" : "预览效果"
      }}</el-button>
      <el-button @click="handleClose">取消</el-button>
      <el-button @click="handleSubmit" :loading="loading" type="primary">{{
        isEdit ? "更新文章" : "创建文章"
      }}</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.cover-placeholder {
  width: 200px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8b949e;
  background: #f6f8fa;
}
.cover-image {
  width: 200px;
  height: 120px;
  display: block;
}
</style>
