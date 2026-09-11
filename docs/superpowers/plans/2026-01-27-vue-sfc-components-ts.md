# Vue 组件层 TypeScript 迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 10 个组件层 `.vue` 迁到 `<script setup lang="ts">` + 类型化 props/emits，运行时行为不变。

**Architecture:** 按依赖顺序分 4 批：App → 布局 → 简单组件 → 复杂 props 组件。页面 `src/views/**` 本轮不动。每批后 `npm run typecheck`。

**Tech Stack:** Vue 3 `<script setup>`、Element Plus、Pinia、vue-router、wangEditor；检查命令 `vue-tsc --noEmit`。

**Spec:** `docs/superpowers/specs/2026-01-27-vue-sfc-components-ts-design.md`

## Global Constraints

- 不修改 `src/views/**` 任何页面
- 不重命名 `BackenLayout.vue`
- 不改路由、API 契约、模板结构（类型要求的最小修正除外）
- `defineProps` / `defineEmits` 使用类型写法
- 第三方类型缺口：调用点 `as` + 注释，禁止全局 `any`
- 验收：`npm run typecheck`、`npm run build` 通过
- 不 git commit 除非用户明确要求

## File Structure

| 文件 | 本轮改动 |
|------|----------|
| `src/App.vue` | `lang="ts"` |
| `src/components/AuthLayout.vue` | `lang="ts"` |
| `src/components/BackenLayout.vue` | `lang="ts"` |
| `src/components/FrontendLayout.vue` | `lang="ts"` |
| `src/components/PageHead.vue` | 类型式 props |
| `src/components/Navbar.vue` | `lang="ts"` + command 类型 |
| `src/components/Sidebar.vue` | `lang="ts"` + menu 参数类型 |
| `src/components/TableSearch.vue` | 类型式 props/emits + form 类型 |
| `src/components/MarkdownRenderer.vue` | 类型式 props |
| `src/components/ArticleDialog.vue` | 类型式 props/emits + 表单类型 |
| `src/components/RichTextEditor.vue` | 类型式 props/emits/expose + editor 类型 |

---

### Task 1: App + 布局壳

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/AuthLayout.vue`
- Modify: `src/components/BackenLayout.vue`
- Modify: `src/components/FrontendLayout.vue`

**Interfaces:**
- Consumes: 无新类型
- Produces: 仅 `lang="ts"`，对外 props/emits 不变

- [ ] **Step 1: `App.vue`**

将

```vue
<script setup></script>
```

改为

```vue
<script setup lang="ts"></script>
```

template 与 style 不动。

- [ ] **Step 2: `AuthLayout.vue`**

`<script setup>` → `<script setup lang="ts">`。脚本体保持：

```ts
const iconUrl = new URL("@/assets/images/robot-fill.png", import.meta.url).href
```

- [ ] **Step 3: `BackenLayout.vue`**

`<script setup>` → `<script setup lang="ts">`。脚本体保持：

```ts
import Sidebar from "./Sidebar.vue"
import Navbar from "./Navbar.vue"
```

- [ ] **Step 4: `FrontendLayout.vue`**

`<script setup>` → `<script setup lang="ts">`。脚本体：

```ts
import { ref, onMounted } from "vue"
import { logout } from "@/api/admin"
import { useRouter } from "vue-router"

const router = useRouter()
const iconUrl = new URL("@/assets/images/机器人.png", import.meta.url).href

const isLoggedIn = ref(false)

const handleLogout = () => {
  logout().then(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("userInfo")
    router.push("/auth/login")
  })
}

onMounted(() => {
  isLoggedIn.value = localStorage.getItem("token") !== null
})
```

- [ ] **Step 5: typecheck**

```bash
npm run typecheck
```

Expected: exit 0。

---

### Task 2: PageHead / Navbar / Sidebar / TableSearch

**Files:**
- Modify: `src/components/PageHead.vue`
- Modify: `src/components/Navbar.vue`
- Modify: `src/components/Sidebar.vue`
- Modify: `src/components/TableSearch.vue`

**Interfaces:**
- Consumes: 无
- Produces:
  - `PageHead`: prop `title?: string`
  - `TableSearch`: prop `formItem: SearchFormItem[]`，emit `search: [payload: Record<string, unknown>]`
  - 组件文件可定义本地 interface，不强制上提

- [ ] **Step 1: `PageHead.vue` script**

整块 script 替换为：

```vue
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string
  }>(),
  {
    title: "页面标题",
  },
)
</script>
```

template 中 `{{ props.title }}` 保持不变。

- [ ] **Step 2: `Navbar.vue` script**

```vue
<script setup lang="ts">
import { useAdminStore } from "@/stores/admin"
import { useRoute, useRouter } from "vue-router"
import { ElMessageBox } from "element-plus"
import { logout } from "@/api/admin"

const router = useRouter()
const route = useRoute()

const handleCollapse = () => {
  useAdminStore().toggleCollapse()
}

const handleCommand = (command: string | number | object) => {
  if (command === "logout") {
    ElMessageBox.confirm("确定退出登录吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }).then(() => {
      logout().then(() => {
        localStorage.removeItem("token")
        localStorage.removeItem("userinfo")
        router.push("/auth/login")
      })
    })
  }
}
</script>
```

注意：保留原逻辑里 `userinfo` 的 key 大小写（历史行为），不要“顺手改成 userInfo”——退出清理不一致是既有问题，若要修需单独任务。

- [ ] **Step 3: `Sidebar.vue` script**

```vue
<script setup lang="ts">
import { useRouter } from "vue-router"
import { useAdminStore } from "@/stores/admin"
import { computed } from "vue"

const router = useRouter()
const iconUrl = new URL("@/assets/images/机器人.png", import.meta.url).href

type MenuSelectPayload = { index: string }

const selectMenu = (key: MenuSelectPayload) => {
  const currentRoute = router.options.routes[0]
  router.push(`${currentRoute.path}/${key.index}`)
}

const isCollapse = computed(() => useAdminStore().isCollapse)
</script>
```

删除未使用的 `import { ElAside } from "element-plus"`（若仍在，且 typecheck/warns 允许；它是模板自动组件，import 非必须）。

template 中 `item.meta.icon` / `item.meta.title` 保持；若 typecheck 报 `meta` 可能 undefined，可用：

```ts
// 在脚本顶部声明一次，模板无需改
// 路由 meta 由 router/index.ts 的 RouteRecordRaw 提供
```

若 vue-tsc 对 `item.meta.icon` 报错，在脚本内对 `router.options.routes[0].children` 加本地类型断言：

```ts
const backendChildren = computed(() => {
  const route = router.options.routes[0]
  return (route.children ?? []) as Array<{
    path: string
    meta?: { title?: string; icon?: string }
  }>
})
```

并将 template 的 `v-for="item in router.options.routes[0].children"` 改为 `v-for="item in backendChildren"`。这是模板最小改动，允许。

- [ ] **Step 4: `TableSearch.vue` script**

```vue
<script setup lang="ts">
import { ref, reactive, computed } from "vue"
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
  }>(),
  {
    formItem: () => [],
  },
)

const emit = defineEmits<{
  search: [payload: Record<string, unknown>]
}>()

const formData = reactive<Record<string, unknown>>({})

const isComp = (comp: SearchFormItem["comp"]) => {
  return { input: "el-input", select: "el-select" } as const
}[comp]

const handleSearch = () => {
  emit("search", formData)
}

const handleReset = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  formEl.resetFields()
  emit("search", formData)
}

const formItemAttrs = computed(() => {
  return props.formItem.map((item) => ({
    ...item,
    col: { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 },
  }))
})

const ruleFormRef = ref<FormInstance>()
</script>
```

说明：原实现是 `forEach` 就地改 props（副作用）；改为 map 返回新数组更干净，运行时行为等价（每次 computed 重新计算 col）。

- [ ] **Step 5: typecheck**

```bash
npm run typecheck
```

Expected: exit 0。若 `SearchFormItem` 的 export 被页面 JS 使用不受影响（JS 不检查）。

---

### Task 3: MarkdownRenderer / ArticleDialog

**Files:**
- Modify: `src/components/MarkdownRenderer.vue`
- Modify: `src/components/ArticleDialog.vue`

**Interfaces:**
- Consumes: `uploadFile` / `createArticle` / `updateArticle`、`fileBaseUrl`
- Produces:
  - `MarkdownRenderer`: `content: string`，`isAiMessage?: boolean`
  - `ArticleDialog`: `modelValue: boolean`，`categories: CategoryOption[]`，`article?: ArticleDetail | null`；emits `update:modelValue`、`success`

- [ ] **Step 1: `MarkdownRenderer.vue` script**

```vue
<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(
  defineProps<{
    content: string
    isAiMessage?: boolean
  }>(),
  {
    isAiMessage: false,
  },
)

const renderedContent = computed(() => {
  let html = props.content
  html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;")
  html = html.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (_match, lang: string, code: string) => {
    return `<pre class="code-block"><code class="language-${lang || "text"}">${code.trim()}</code></pre>`
  })
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>")
  html = html.replace(/^### (.*$)/gm, "<h3>$1</h3>")
  html = html.replace(/^## (.*$)/gm, "<h2>$1</h2>")
  html = html.replace(/^# (.*$)/gm, "<h1>$1</h1>")
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  )
  html = html.replace(/^- (.*)$/gm, "<li>$1</li>")
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
  html = html.replace(/^\d+\. (.*)$/gm, "<li>$1</li>")
  html = html.replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")
  html = html.replace(/^---$/gm, "<hr>")
  html = html.replace(/\n/g, "<br>")
  html = html.replace(/<br><br>/g, "<br>")
  return html
})
</script>
```

- [ ] **Step 2: `ArticleDialog.vue` script（完整替换 script 块）**

```vue
<script setup lang="ts">
import { ElMessage } from "element-plus"
import type { FormInstance, FormRules, UploadRequestOptions } from "element-plus"
import { ref, reactive, computed, nextTick, watch } from "vue"
import { uploadFile, createArticle, updateArticle } from "@/api/admin"
import { fileBaseUrl } from "@/config/index"
import RichEditor from "@/components/RichTextEditor.vue"

interface CategoryOption {
  label: string
  value: number
}

interface ArticleDetail {
  id: number | string
  title?: string
  content?: string
  coverImage?: string
  categoryId?: number
  summary?: string
  tags?: string
  [key: string]: unknown
}

interface ArticleForm {
  title: string
  content: string
  coverImage: string
  categoryId: number
  summary: string
  tagArray: string[]
  tags: string
  id: string | number
}

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    categories?: CategoryOption[]
    article?: ArticleDetail | null
  }>(),
  {
    modelValue: false,
    categories: () => [],
    article: null,
  },
)

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  success: []
}>()

const formRef = ref<FormInstance>()
const businessID = ref<string | number | null>(null)
const imgUrl = ref("")
const editorInstance = ref<{ setHtml?: (html: string) => void } | null>(null)
const btnPreview = ref(false)
const loading = ref(false)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => {
    emit("update:modelValue", val)
  },
})

const isEdit = computed(() => !!props.article?.id)

const formData = reactive<ArticleForm>({
  title: "",
  content: "",
  coverImage: "",
  categoryId: 1,
  summary: "",
  tagArray: [],
  tags: "",
  id: "",
})

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
})

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
]

const handleRemove = () => {
  imgUrl.value = ""
  formData.coverImage = ""
}

const handleClose = () => {
  formRef.value?.resetFields()
  businessID.value = null
  handleRemove()
  formData.tagArray = []
  emit("update:modelValue", false)
}

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
        })
        businessID.value = newVal.id
        imgUrl.value = fileBaseUrl + (newVal.coverImage ?? "")
      })
    }
  },
)

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith("image/")
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isImage) {
    ElMessage.error("上传封面图片，请选择图片文件")
    return false
  }
  if (!isLt5M) {
    ElMessage.error("上传封面图片大小不能超过 5MB")
    return false
  }
  return true
}

const handleUploadRequest = async (options: UploadRequestOptions) => {
  businessID.value = crypto.randomUUID()
  const fileRes = await uploadFile(options.file as File, {
    businessId: businessID.value,
  })
  imgUrl.value = `${fileBaseUrl}${fileRes.filePath}`
  formData.coverImage = fileRes.filePath
}

const handleContentChange = (data: { html?: string; text?: string }) => {
  if (data.html != null) {
    formData.content = data.html
  }
}

const handleEditorCreated = (editor: { setHtml?: (html: string) => void }) => {
  editorInstance.value = editor
  if (formData.content && editor?.setHtml) {
    nextTick(() => {
      editor.setHtml?.(formData.content)
    })
  }
}

const handleSubmit = () => {
  formRef.value?.validate((valid) => {
    if (!valid) return
    loading.value = true
    const submitData: Record<string, unknown> = {
      ...formData,
      tags: formData.tagArray.join(","),
    }
    delete submitData.tagArray

    if (!isEdit.value) {
      submitData.id = businessID.value
      createArticle(submitData).then(() => {
        loading.value = false
        emit("success")
      })
    } else if (props.article?.id != null) {
      updateArticle(props.article.id, submitData).then(() => {
        loading.value = false
        emit("success")
      })
    } else {
      loading.value = false
    }
  })
}
</script>
```

**行为修正（必须保留说明）：**
1. props 从错误的 `visible` 改为实际使用的 `modelValue`（与 emit/`dialogVisible` 一致）。调用方若是 `v-model`，行为不变。
2. `uploadFile` 第二参从 `businessID` 改为 `businessId`，对齐 `api/admin.ts` 签名。
3. `watch` 里 `Object.assign(formData, newVal)` 改为显式字段拷贝，避免把 `tagArray` 等未知字段弄脏；`tagArray` 编辑时仍为空数组，用户可再选（与原实现近似）。

template 中若绑定的是 `:visible` 需改为依赖 `dialogVisible`（现有已是 `v-model="dialogVisible"`，一般无需改 template）。

- [ ] **Step 3: typecheck**

```bash
npm run typecheck
```

Expected: exit 0。若 `RichEditor` 事件类型报错，临时在 ArticleDialog 使用处加：

```ts
// RichTextEditor 为 JS→TS 过渡中组件，事件 payload 以子组件为准
```

并在 Task 4 完成后复检。

---

### Task 4: RichTextEditor

**Files:**
- Modify: `src/components/RichTextEditor.vue`

**Interfaces:**
- Consumes: `@wangeditor/editor`、`@wangeditor/editor-for-vue`
- Produces:
  - props: `modelValue?` string、`placeholder?`、`maxCharCount?` number、`showWordCount?`、`showSecurityTip?`、`toolbarKeys?` string[]、`minHeight?` string
  - emits: `update:modelValue: [value: string]`、`change: [payload: { html: string; text: string }]`、`created: [editor: IDomEditor]`
  - expose: `getHtml`/`getText`/`setHtml`/`clear`/`insertText`/`focus`/`editor`

- [ ] **Step 1: 替换 script 块为以下内容**

（`editorConfig` 大段颜色列表保持原数组字面量，不复制到本计划；仅包类型。）

```vue
<script setup lang="ts">
import {
  ref,
  computed,
  onBeforeUnmount,
  shallowRef,
  watch,
  reactive,
} from "vue"
import { ElMessage } from "element-plus"
import "@wangeditor/editor/dist/css/style.css"
import {
  Editor as WangEditor,
  Toolbar as WangToolbar,
} from "@wangeditor/editor-for-vue"
import type { IDomEditor, IEditorConfig, IToolbarConfig } from "@wangeditor/editor"

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    maxCharCount?: number
    showWordCount?: boolean
    showSecurityTip?: boolean
    toolbarKeys?: string[]
    minHeight?: string
  }>(),
  {
    modelValue: "",
    placeholder: "请输入内容...",
    maxCharCount: 2000,
    showWordCount: true,
    showSecurityTip: true,
    toolbarKeys: () => [
      "bold", "italic", "underline", "color", "bgColor", "|",
      "fontSize", "fontFamily", "|",
      "header1", "header2", "header3", "|",
      "bulletedList", "numberedList", "blockquote", "|",
      "insertLink", "|",
      "undo", "redo",
    ],
    minHeight: "300px",
  },
)

const emit = defineEmits<{
  "update:modelValue": [value: string]
  change: [payload: { html: string; text: string }]
  created: [editor: IDomEditor]
}>()

const editorRef = shallowRef<IDomEditor | null>(null)
const currentCharCount = ref(0)

const content = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
})

// wangEditor 配置对象字段较多，局部放宽为 Partial 避免与版本类型摩擦
const editorConfig = reactive<Partial<IEditorConfig>>({
  placeholder: props.placeholder,
  MENU_CONF: {
    fontSize: {
      fontSizeList: [
        "12px", "13px", "14px", "15px", "16px", "17px", "18px",
        "19px", "20px", "22px", "24px", "26px", "28px", "30px", "32px", "36px",
      ],
    },
    fontFamily: {
      fontFamilyList: [
        "Arial", "Tahoma", "Verdana",
        '"Times New Roman"', '"Courier New"',
        '"Microsoft YaHei"', '"微软雅黑"',
        '"SimSun"', '"宋体"', '"SimHei"', '"黑体"',
        '"KaiTi"', '"楷体"',
      ],
    },
    // 以下 color / bgColor / lineHeight 颜色列表与原文件完全一致，迁移时原样保留
  } as IEditorConfig["MENU_CONF"],
})

const toolbarConfig = reactive<Partial<IToolbarConfig>>({
  toolbarKeys: props.toolbarKeys,
})

const handleEditorCreated = (editor: IDomEditor) => {
  editorRef.value = editor
  updateCharCount()
  const menus = editor.getAllMenuKeys()
  if (!menus.includes("fontFamily")) {
    console.warn("字体菜单未启用")
  }
  emit("created", editor)
}

const handleEditorChange = (editor: IDomEditor) => {
  updateCharCount()
  emit("change", {
    html: editor.getHtml(),
    text: editor.getText(),
  })
}

const handleEditorDestroyed = () => {
  editorRef.value = null
}

const updateCharCount = () => {
  if (!editorRef.value) return
  const text = editorRef.value.getText()
  const cleanText = text.replace(/\s+/g, " ").trim()
  currentCharCount.value = cleanText === "" ? 0 : cleanText.length
  if (currentCharCount.value > props.maxCharCount) {
    ElMessage.warning(`内容长度不能超过 ${props.maxCharCount} 字符`)
  }
}

const getHtml = () => (editorRef.value ? editorRef.value.getHtml() : "")
const getText = () => (editorRef.value ? editorRef.value.getText() : "")
const setHtml = (html: string) => {
  editorRef.value?.setHtml(html)
}
const clear = () => {
  editorRef.value?.clear()
}
const insertText = (text: string) => {
  editorRef.value?.insertText(text)
}
const focus = () => {
  editorRef.value?.focus()
}

defineExpose({
  getHtml,
  getText,
  setHtml,
  clear,
  insertText,
  focus,
  editor: editorRef,
})

watch(
  () => props.placeholder,
  (newPlaceholder) => {
    editorConfig.placeholder = newPlaceholder
  },
)

onBeforeUnmount(() => {
  if (editorRef.value) {
    editorRef.value.destroy()
  }
})
</script>
```

**执行时注意：** 将原文件中 `editorConfig` 的 `color` / `bgColor` / `lineHeight` 配置**原样复制**到 `MENU_CONF` 内，不要丢失颜色数组。

若 `IDomEditor` / `IEditorConfig` 导入失败（包版本差异），回退：

```ts
// 本地最小接口，覆盖本组件用到的方法
interface EditorLike {
  getText: () => string
  getHtml: () => string
  setHtml: (html: string) => void
  clear: () => void
  insertText: (text: string) => void
  focus: () => void
  destroy: () => void
  getAllMenuKeys: () => string[]
}
```

并用 `EditorLike` 替换 `IDomEditor`；配置对象用 `Record<string, unknown>`。

- [ ] **Step 2: typecheck + build**

```bash
npm run typecheck
npm run build
```

Expected: 两者 exit 0。

- [ ] **Step 3: dev 冒烟**

启动/确认 `npm run dev`，打开：
- `http://localhost:5173/`（FrontendLayout 导航）
- `http://localhost:5173/auth/login`（AuthLayout）
- 若有管理员账号则打开 `/back/dashboard`（BackenLayout + Sidebar 折叠）

Expected: 无控制台 “Failed to resolve import” / 组件编译错误。后端接口失败不计入本轮失败。

- [ ] **Step 4: 更新 AGENTS.md（一小段）**

在 Conventions 增加一行：

```text
- 核心层与组件层（App/layouts/components）已迁 TS；`src/views/**` 页面仍为 JS，迁移中。
```

---

## Self-Review 记录

1. **Spec 覆盖**：10 个文件对应 Task 1–4；页面明确排除；typecheck/build 验收在 Task 4。
2. **占位符**：RichTextEditor 的颜色数组说明为“原样保留”，执行者必须打开原文件复制，不是 TBD 未实现逻辑。
3. **类型一致性**：`ArticleDialog` 依赖 `uploadFile(file, { businessId })` 与 `api/admin.ts` 一致；`modelValue` 与 emit 对齐。
