# Vue 页面层 TypeScript 迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将除 `dashboard`/`consultation` 外的 9 个页面迁到 TypeScript，并修 `register` 对拆包返回值的错误用法。

**Architecture:** 3 批：认证/首页 → 管理列表页 → 前台内容/日记。复用 `http`（`Promise<T>`）、`src/types/*`、组件类型。每批 typecheck，结束 build。

**Tech Stack:** Vue 3、Element Plus、vue-router、`http` 封装；`vue-tsc`。

**Spec:** `docs/superpowers/specs/2026-01-27-vue-sfc-pages-ts-design.md`

## Global Constraints

- 不迁 `dashboard.vue`、`consultation.vue`
- 不改路由 / API 契约 / 业务主流程
- `defineProps` 类型式；表单用 `FormInstance`/`FormRules`
- `http` 成功路径已是业务 `T`，禁止再写 `.then(({ data }) => ...)`
- 第三方缺口：局部 `as` + 注释
- 验收：`npm run typecheck`、`npm run build`
- 不 commit 除非用户要求

## File Structure

| 文件 | Task |
|------|------|
| `src/views/login.vue` / `register.vue` / `home.vue` | 1 |
| `src/views/knowledge.vue` / `consultations.vue` / `emotional.vue` | 2 |
| `src/views/frontendKnowledge.vue` / `articleDetail.vue` / `emotionDairy.vue` | 3 |

---

### Task 1: login / register / home

**Files:**
- Modify: `src/views/login.vue`, `src/views/register.vue`, `src/views/home.vue`

**Interfaces:**
- Consumes: `login` → `LoginResult`；`register` → `Promise<string | null>`
- Produces: 无跨文件导出

- [ ] **Step 1: `home.vue`**

`<script setup>` → `<script setup lang="ts">`。脚本体保持：

```ts
const iconUrl = new URL("@/assets/images/robot-fill.png", import.meta.url).href
```

- [ ] **Step 2: `login.vue` script 整块替换**

```vue
<script setup lang="ts">
import { ref, reactive } from "vue"
import type { FormInstance, FormRules } from "element-plus"
import { login } from "@/api/admin"
import { useRouter } from "vue-router"

const router = useRouter()
const formData = reactive({
  username: "",
  password: "",
})
const rules = reactive<FormRules>({
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
})
const ruleFormRef = ref<FormInstance>()

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate((valid) => {
    if (!valid) return
    login(formData).then((data) => {
      if (!data.token) {
        console.error("登录失败")
        return
      }
      localStorage.setItem("token", data.token)
      localStorage.setItem("userInfo", JSON.stringify(data.userInfo))
      if (data.userInfo.userType === 2) {
        router.push("/back/dashboard")
      } else {
        router.push("/")
      }
    })
  })
}
</script>
```

- [ ] **Step 3: `register.vue` script 整块替换（含契约修正）**

```vue
<script setup lang="ts">
import { ref, reactive } from "vue"
import type { FormInstance, FormRules } from "element-plus"
import { register } from "@/api/frontend"
import { ElMessage } from "element-plus"
import { useRouter } from "vue-router"

const formData = reactive({
  username: "",
  email: "",
  nickname: "",
  phone: "",
  password: "",
  confirmPassword: "",
  gender: 0,
  userType: 1 as 1 | 2,
})

const rules = reactive<FormRules>({
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  email: [{ required: true, message: "请输入邮箱", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
  confirmPassword: [
    { required: true, message: "请确认密码", trigger: "blur" },
  ],
})

const router = useRouter()
const submitFormRef = ref<FormInstance>()

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate((valid) => {
    if (!valid) return
    // http 已拆包：成功常见 resolve 为 null/空；错误由拦截器 reject
    register(formData).then((data) => {
      if (data == null || data === "") {
        ElMessage.success("注册成功")
        router.push("/auth/login")
        return
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "code" in data &&
        (data as { code?: string }).code === "BUSINESS_ERROR"
      ) {
        ElMessage.error(
          String((data as { message?: string }).message || "注册失败"),
        )
      }
    })
  })
}
</script>
```

**必须删除** `register(formData).then(({ data }) => ...)` 旧写法。

- [ ] **Step 4: typecheck**

```bash
npm run typecheck
```

Expected: exit 0。

---

### Task 2: knowledge / consultations / emotional

**Files:**
- Modify: `src/views/knowledge.vue`, `src/views/consultations.vue`, `src/views/emotional.vue`

**Interfaces:**
- Consumes: `PageResult`、`SearchFormItem`、`ChatMessage`/`ChatSession`、`ArticleDialog` `modelValue`
- Produces: 无跨文件导出

- [ ] **Step 1: `knowledge.vue` script 整块替换**

```vue
<script setup lang="ts">
import { onMounted, ref, reactive } from "vue"
import PageHead from "@/components/PageHead.vue"
import TableSearch from "@/components/TableSearch.vue"
import type { SearchFormItem } from "@/components/TableSearch.vue"
import {
  categoryTree,
  articlePage,
  getArticleDetail,
  changeArticleStatus,
  deleteArticle,
} from "@/api/admin"
import ArticleDialog from "@/components/ArticleDialog.vue"
import { ElMessageBox, ElMessage } from "element-plus"

interface ArticleRow {
  id: number | string
  title?: string
  categoryId?: number
  authorName?: string
  readCount?: number
  updatedAt?: string
  status?: number
  [key: string]: unknown
}

const formItem = ref<SearchFormItem[]>([
  {
    comp: "input",
    prop: "title",
    label: "文章标题",
    placeholder: "请输入文章标题",
  },
  {
    comp: "select",
    prop: "categoryId",
    label: "分类",
    placeholder: "请选择分类",
  },
  {
    comp: "select",
    prop: "status",
    label: "状态",
    placeholder: "请选择状态",
    options: [
      { label: "草稿", value: 0 },
      { label: "已发布", value: 1 },
      { label: "已下线", value: 2 },
    ],
  },
])

const pagination = reactive({
  currentPage: 1,
  size: 10,
  total: 0,
})

const tableData = ref<ArticleRow[]>([])

const handleSearch = async (formData?: Record<string, unknown>) => {
  const params = {
    ...pagination,
    ...(formData || {}),
  }
  const { records, total } = await articlePage(params)
  tableData.value = records as ArticleRow[]
  pagination.total = total
}

const handleChange = (page: number) => {
  pagination.currentPage = page
  handleSearch()
}

const categoryMaps = reactive<Record<number, string>>({})
const categories = ref<Array<{ label: string; value: number }>>([])

onMounted(async () => {
  const data = await categoryTree()
  categories.value = data.map((item) => {
    categoryMaps[item.id] = item.categoryName
    return { label: item.categoryName, value: item.id }
  })
  formItem.value[1].options = categories.value
  handleSearch()
})

const dialogVisible = ref(false)
const currentArticle = ref<ArticleRow | null>(null)

const handleSuccess = () => {
  dialogVisible.value = false
  handleSearch()
}

const handleEdit = (row: Partial<ArticleRow>) => {
  if (!row.id) {
    currentArticle.value = null
    dialogVisible.value = true
    return
  }
  getArticleDetail(row.id).then((res) => {
    currentArticle.value = res as ArticleRow
    dialogVisible.value = true
  })
}

const handlePublish = (row: ArticleRow) => {
  ElMessageBox.confirm(`确认发布文章${row.title}吗？`, "确认", {
    confirmButtonText: "确定发布",
    cancelButtonText: "取消",
    type: "info",
  }).then(() => {
    changeArticleStatus(row.id, { status: 1 }).then(() => {
      ElMessage.success("发布成功")
      handleSearch()
    })
  })
}

const handleUnpublish = (row: ArticleRow) => {
  ElMessageBox.confirm(`确认下线文章${row.title}吗？`, "确认", {
    confirmButtonText: "确定下线",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    changeArticleStatus(row.id, { status: 2 }).then(() => {
      ElMessage.success("下线成功")
      handleSearch()
    })
  })
}

const handleDelete = (row: ArticleRow) => {
  ElMessageBox.confirm(`确认删除文章${row.title}吗？`, "确认", {
    confirmButtonText: "确定删除",
    cancelButtonText: "取消",
    type: "danger",
  }).then(() => {
    deleteArticle(row.id).then(() => {
      ElMessage.success("删除成功")
      handleSearch()
    })
  })
}
</script>
```

Template 保持 `v-model:modelValue="dialogVisible"`。

- [ ] **Step 2: `consultations.vue` script 整块替换**

```vue
<script setup lang="ts">
import PageHead from "@/components/PageHead.vue"
import { ref, onMounted, reactive } from "vue"
import { getConsultationPage, getSessionDetail } from "@/api/admin"
import type { ChatMessage, ChatSession } from "@/types/session"

interface ConsultationRow extends ChatSession {
  userNickname?: string
  lastMessageContent?: string
  messageCount?: number
  lastMessageTime?: string
  startedAt?: string
}

const tableData = ref<ConsultationRow[]>([])
const pagination = reactive({
  currentPage: 1,
  size: 10,
  total: 0,
})

const sessionDetail = ref<Partial<ConsultationRow>>({})
const sessionMessages = ref<ChatMessage[]>([])
const loadingMessages = ref(false)
const showDetailDialog = ref(false)

const viewSessionDetail = (row: ConsultationRow) => {
  loadingMessages.value = true
  showDetailDialog.value = true
  getSessionDetail(row.id).then((res) => {
    loadingMessages.value = false
    sessionMessages.value = res
    sessionDetail.value = row
  })
}

const handleChange = (page: number) => {
  pagination.currentPage = page
  handleSearch()
}

const handleSearch = () => {
  getConsultationPage(pagination).then((res) => {
    tableData.value = res.records as ConsultationRow[]
    pagination.total = res.total
  })
}

onMounted(() => {
  handleSearch()
})
</script>
```

原 `pagination` 缺 `currentPage` 却被赋值；TS 版补上。

- [ ] **Step 3: `emotional.vue` script**

保留全部 emotion/risk 映射函数与详情弹窗；只加类型。**必须补 `ElMessage` import**（原文件使用了但未 import）。

骨架（映射函数体从原文件原样复制）：

```vue
<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import PageHead from "@/components/PageHead.vue"
import TableSearch from "@/components/TableSearch.vue"
import type { SearchFormItem } from "@/components/TableSearch.vue"
import { getEmotionalPage, deleteEmotional } from "@/api/admin"
import { ElMessageBox, ElMessage } from "element-plus"

interface EmotionalRow {
  id: number | string
  nickname?: string
  diaryDate?: string
  moodScore?: number
  sleep?: number
  stressLevel?: number
  emotionTriggers?: string
  diaryContent?: string
  aiEmotionAnalysis?: string
  [key: string]: unknown
}

// getEmotionTagType / getAiEmotionTagType / getEmotionScoreColor /
// getRiskLevelTagType / getRiskLevelText —— 从原文件原样迁移，参数加 string|number

const formItem = ref<SearchFormItem[]>([
  {
    comp: "input",
    prop: "userId",
    label: "用户ID",
    placeholder: "请输入用户ID",
  },
  {
    comp: "select",
    prop: "moodScreRange",
    label: "情绪评分",
    placeholder: "请选择评分范围",
    options: [
      { label: "低分（1-3）", value: "1-3" },
      { label: "中分（4-6）", value: "4-6" },
      { label: "高分（7-10）", value: "7-10" },
    ],
  },
])

const tableData = ref<EmotionalRow[]>([])
const pagination = reactive({ currentPage: 1, size: 10, total: 0 })

const handleSearch = async (formData?: Record<string, unknown>) => {
  const params = { ...pagination, ...(formData || {}) }
  const { records, total } = await getEmotionalPage(params)
  tableData.value = records as EmotionalRow[]
  pagination.total = total
}

const handleChange = (page: number) => {
  pagination.currentPage = page
  handleSearch()
}

const detailDialogVisible = ref(false)
const currentDetail = ref<EmotionalRow | null>(null)
const aiData = ref<Record<string, unknown> | null>(null)

const viewSessionDetail = (row: EmotionalRow) => {
  currentDetail.value = row
  if (row.aiEmotionAnalysis) {
    try {
      aiData.value = JSON.parse(row.aiEmotionAnalysis) as Record<string, unknown>
    } catch {
      aiData.value = {}
    }
  } else {
    aiData.value = {}
  }
  detailDialogVisible.value = true
}

const handleDelete = (row: EmotionalRow) => {
  ElMessageBox.confirm("确认删除该条记录吗？", "删除确认", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "danger",
  }).then(() => {
    deleteEmotional(row.id).then(() => {
      ElMessage.success("删除成功")
      handleSearch()
    })
  })
}

onMounted(() => {
  handleSearch()
})
</script>
```

详情弹窗 template 与原文件一致；`aiData` 字段在 template 可用可选链。

- [ ] **Step 4: typecheck**

```bash
npm run typecheck
```

Expected: exit 0。若无法 `import type { SearchFormItem }`，在页面内复制同等 interface。

---

### Task 3: frontendKnowledge / articleDetail / emotionDairy + 验收

**Files:**
- Modify: `src/views/frontendKnowledge.vue`, `articleDetail.vue`, `emotionDairy.vue`, `AGENTS.md`

- [ ] **Step 1: `frontendKnowledge.vue` script**

```vue
<script setup lang="ts">
import { getKnowledgeList } from "@/api/frontend"
import { dayjs } from "element-plus"
import { ref, reactive, onMounted } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const iconUrl = new URL("@/assets/images/book.png", import.meta.url).href

interface ArticleItem {
  id: number | string
  title?: string
  coverImage?: string
  categoryName?: string
  authorName?: string
  updatedAt?: string
  readCount?: number
  [key: string]: unknown
}

const recommendList = ref<ArticleItem[]>([])
const articleList = ref<ArticleItem[]>([])
const pagination = reactive({
  currentPage: 1,
  size: 10,
  total: 0,
})

const getPageList = () => {
  const params = {
    sortField: "publishedAt",
    SortDirection: "desc",
    ...pagination,
  }
  getKnowledgeList(params).then((res) => {
    articleList.value = res.records as ArticleItem[]
    pagination.total = res.total
  })
}

// getImage：base64 占位符从原文件完整复制，不要截断
const getImage = (url?: string) => {
  if (url) return "http://159.75.169.224:1235" + url
  // 复制原文件 data:image/webp;base64,... 完整字符串
  return "data:image/webp;base64,PLACEHOLDER_COPY_FROM_SOURCE"
}

const handleChange = (page: number) => {
  pagination.currentPage = page
  getPageList()
}

const goToArticle = (id: number | string) => {
  router.push(`/knowledge/article/${id}`)
}

onMounted(() => {
  const params = {
    sortField: "readCount",
    SortDirection: "desc",
    currentPage: 1,
    size: 5,
  }
  getPageList()
  getKnowledgeList(params).then((res) => {
    recommendList.value = res.records as ArticleItem[]
  })
})
</script>
```

删除未使用的 `Platform` icon import 若存在（模板用全局图标即可）。

- [ ] **Step 2: `articleDetail.vue` script 整块替换**

```vue
<script setup lang="ts">
import { getKnowledgeDetail } from "@/api/frontend"
import { dayjs } from "element-plus"
import { ref, onMounted } from "vue"

const props = defineProps<{
  id?: string
}>()

const iconUrl = new URL("@/assets/images/book.png", import.meta.url).href

interface ArticleDetailData {
  id?: number | string
  title?: string
  content?: string
  summary?: string
  categoryName?: string
  authorName?: string
  updatedAt?: string
  readCount?: number
  tagArray?: string[]
  [key: string]: unknown
}

const articleDetail = ref<ArticleDetailData>({})

const formatContent = (content?: string) => {
  if (!content) return ""
  return content
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
}

onMounted(() => {
  if (!props.id) return
  getKnowledgeDetail(props.id).then((res) => {
    articleDetail.value = res as ArticleDetailData
  })
})
</script>
```

- [ ] **Step 3: `emotionDairy.vue` script**

```vue
<script setup lang="ts">
import { reactive } from "vue"
import { dayjs, ElMessage } from "element-plus"
import { addEmotionDiary } from "@/api/frontend"

const iconUrl = new URL("@/assets/images/like.png", import.meta.url).href

interface DiaryForm {
  diaryDate: string
  moodScore: number | null
  dominantEmotion: string
  emotionTriggers: string
  diaryContent: string
  sleepQuality: number | null
  stressLevel: number | null
}

const diaryForm = reactive<DiaryForm>({
  diaryDate: dayjs().format("YYYY-MM-DD"),
  moodScore: null,
  dominantEmotion: "",
  emotionTriggers: "",
  diaryContent: "",
  sleepQuality: null,
  stressLevel: null,
})

// emotionStatus 10 项、emotionOptions 8 项从原文件完整复制
const emotionStatus = [
  "绝望崩溃",
  "消沉抑郁",
  "焦虑烦躁",
  "低落不悦",
  "平静淡然",
  "轻松惬意",
  "愉悦舒心",
  "欢欣满足",
  "兴奋欣喜",
  "极致幸福",
]

const emotionOptions = [
  { name: "开心", url: new URL("@/assets/images/开心.png", import.meta.url).href },
  { name: "平静", url: new URL("@/assets/images/平静.png", import.meta.url).href },
  { name: "焦虑", url: new URL("@/assets/images/焦虑.png", import.meta.url).href },
  { name: "悲伤", url: new URL("@/assets/images/悲伤.png", import.meta.url).href },
  { name: "兴奋", url: new URL("@/assets/images/兴奋.png", import.meta.url).href },
  { name: "疲惫", url: new URL("@/assets/images/疲惫.png", import.meta.url).href },
  { name: "惊讶", url: new URL("@/assets/images/惊讶.png", import.meta.url).href },
  { name: "困惑", url: new URL("@/assets/images/困惑.png", import.meta.url).href },
]

const selectEmotion = (emotion: string) => {
  diaryForm.dominantEmotion = emotion
}

const resetForm = () => {
  Object.assign(diaryForm, {
    diaryDate: dayjs().format("YYYY-MM-DD"),
    moodScore: null,
    dominantEmotion: "",
    emotionTriggers: "",
    diaryContent: "",
    sleepQuality: null,
    stressLevel: null,
  })
}

const submitForm = () => {
  if (!diaryForm.moodScore) {
    ElMessage.error("请选择您的情绪评分")
    return
  }
  addEmotionDiary(diaryForm).then(() => {
    ElMessage.success("提交成功")
    resetForm()
  })
}
</script>
```

import 路径改为 `@/api/frontend`（原为相对路径）。

- [ ] **Step 4: 全量 typecheck + build**

```bash
npm run typecheck
npm run build
```

Expected: exit 0。

- [ ] **Step 5: 更新 `AGENTS.md`**

将页面仍为 JS 的表述改为：已迁 TS，**除** `dashboard.vue` 与 `consultation.vue`。

- [ ] **Step 6: 冒烟（dev 存在时）**

登录 → `/` `/knowledge` `/emotion-diary`；管理端 `/back/knowledge` `/back/consultations` `/back/emotional`。

---

## Self-Review 记录

1. **Spec 覆盖**：9 页均在 Task 1–3；register 契约修正已编码。
2. **占位符**：`getImage` base64 注明从源文件复制；emotion 数组已写全。
3. **类型一致性**：行类型在各 Task 内自洽；`SearchFormItem` 与组件一致或本地复制。
