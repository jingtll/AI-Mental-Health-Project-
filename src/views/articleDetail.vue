<script setup lang="ts">
/**
 * 知识文章详情
 *
 * 相对改造前的修复：
 *  - 正文用 `v-html` 直接渲染接口返回的富文本，没有任何过滤 → 补一层防御性清理
 *    （剔除 script/style/iframe 等标签、on* 事件属性、javascript:/data: 协议）。
 *    注意：这只是前端的兜底，真正的净化应在服务端做。
 *  - 排版层级错乱：正文 15px，而 `h2` 被设成 15px、`h3` 13px —— 二级标题比正文
 *    还小，完全失去层级 → 重排标题字阶，并把行高提到 1.8、正文提到 16px、限制
 *    行宽到约 68 字符，符合长文阅读习惯。
 *  - `dayjs(articleDetail.updatedAt)` 在字段缺失时渲染成 "Invalid Date"
 *    → 统一走 utils/format 的 formatDate。
 *  - 无加载态、无失败/空态：请求失败或 id 不存在时页面是一片空白
 *    → 补骨架、错误提示与返回入口。
 *  - `width: 980px` 固定宽度 + 头部「琥珀→紫」渐变 → 响应式容器与品牌令牌。
 *  - 没有返回知识库的入口，用户只能靠浏览器后退 → 补面包屑返回链接。
 */
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { getKnowledgeDetail } from "@/api/frontend"
import { formatDate } from "@/utils/format"

const props = defineProps<{
  id?: string
}>()

const router = useRouter()
const headerIcon = new URL("@/assets/images/book.png", import.meta.url).href

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
const loading = ref(false)
const loadFailed = ref(false)

/**
 * 防御性清理：不是完整的 XSS 净化器，只拦掉最常见的高危载体。
 * 后端产出的富文本仍应在服务端做白名单净化。
 */
const sanitizeHtml = (html: string) =>
  html
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta|base)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s(href|src)\s*=\s*("|')\s*(?:javascript|vbscript|data):[^"']*\2/gi,
      " $1=$2#$2",
    )

/** 渲染正文：先做换行/粗体等轻量转换，最后统一过一遍清理，保证输出干净 */
const formatContent = (content?: string) => {
  if (!content) return ""
  const formatted = content
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
  return sanitizeHtml(formatted)
}

const goBack = () => {
  router.push("/knowledge")
}

onMounted(() => {
  if (!props.id) {
    loadFailed.value = true
    return
  }
  loading.value = true
  getKnowledgeDetail(props.id)
    .then((res) => {
      articleDetail.value = res as ArticleDetailData
      loadFailed.value = !articleDetail.value?.title
    })
    .catch(() => {
      loadFailed.value = true
    })
    .finally(() => {
      loading.value = false
    })
})
</script>

<template>
  <div class="article-detail">
    <header class="article-detail__hero">
      <div class="article-detail__hero-inner">
        <el-breadcrumb separator="/" class="article-detail__crumb">
          <el-breadcrumb-item :to="{ path: '/knowledge' }">知识库</el-breadcrumb-item>
          <el-breadcrumb-item>文章详情</el-breadcrumb-item>
        </el-breadcrumb>

        <div class="article-detail__hero-head">
          <el-image :src="headerIcon" class="article-detail__hero-icon" alt="" />
          <h1 class="article-detail__hero-title">
            {{ loading ? "加载中…" : articleDetail.title || "文章详情" }}
          </h1>
        </div>
      </div>
    </header>

    <div class="article-detail__body">
      <!-- 加载骨架 -->
      <div v-if="loading" class="xy-card article-detail__card">
        <div class="xy-skeleton article-detail__skeleton-title" />
        <div class="xy-skeleton article-detail__skeleton-meta" />
        <div
          v-for="n in 6"
          :key="n"
          class="xy-skeleton article-detail__skeleton-line"
        />
      </div>

      <!-- 加载失败 / 文章不存在 -->
      <div v-else-if="loadFailed" class="xy-card article-detail__card">
        <div class="xy-empty">
          <el-icon class="xy-empty__icon"><WarningFilled /></el-icon>
          <p class="xy-empty__text">
            没有找到这篇文章，可能已下线或链接有误
          </p>
          <el-button type="primary" @click="goBack">返回知识库</el-button>
        </div>
      </div>

      <template v-else>
        <!-- 文章信息 -->
        <div class="xy-card article-detail__card">
          <div class="article-detail__meta-row">
            <el-tag v-if="articleDetail.categoryName" effect="plain">
              {{ articleDetail.categoryName }}
            </el-tag>
            <span class="article-detail__meta">
              <el-icon><Calendar /></el-icon>
              {{ formatDate(articleDetail.updatedAt) }}
            </span>
          </div>

          <h2 class="article-detail__title">{{ articleDetail.title }}</h2>

          <blockquote v-if="articleDetail.summary" class="article-detail__summary">
            {{ articleDetail.summary }}
          </blockquote>

          <div class="article-detail__byline">
            <span v-if="articleDetail.authorName">
              <el-icon><Avatar /></el-icon>
              {{ articleDetail.authorName }}
            </span>
            <span>
              <el-icon><View /></el-icon>
              {{ articleDetail.readCount ?? 0 }} 次阅读
            </span>
          </div>
        </div>

        <!-- 正文 -->
        <div class="xy-card article-detail__card">
          <div
            class="article-detail__content"
            v-html="formatContent(articleDetail.content)"
          />

          <div
            v-if="articleDetail.tagArray?.length"
            class="article-detail__tags"
          >
            <h3 class="article-detail__tags-title">相关标签</h3>
            <div class="article-detail__tags-list">
              <el-tag
                v-for="tag in articleDetail.tagArray"
                :key="tag"
                type="info"
                effect="light"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>

          <div class="article-detail__actions">
            <el-button @click="goBack">
              <el-icon><Back /></el-icon>
              返回知识库
            </el-button>
            <el-button type="primary" @click="router.push('/consultation')">
              <el-icon><ChatDotRound /></el-icon>
              和心耘聊聊
            </el-button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.article-detail {
  flex: 1;
}

// -----------------------------------------------------------------------------
// 头部
// -----------------------------------------------------------------------------
.article-detail__hero {
  padding: var(--xy-space-8) var(--xy-space-5) var(--xy-space-6);
  background: var(--xy-gradient-brand);
  color: #fff;

  @media (max-width: 640px) {
    padding: var(--xy-space-6) var(--xy-space-4) var(--xy-space-5);
  }

  &-inner {
    max-width: var(--xy-reading-width);
    margin: 0 auto;
  }

  &-head {
    display: flex;
    align-items: center;
    gap: var(--xy-space-4);
    margin-top: var(--xy-space-4);
  }

  &-icon {
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    padding: var(--xy-space-2);
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: var(--xy-radius-md);
    background: rgba(255, 255, 255, 0.16);
  }

  &-title {
    font-size: var(--xy-text-2xl);
    font-weight: 700;
    line-height: var(--xy-leading-tight);
    color: #fff;

    @media (max-width: 640px) {
      font-size: var(--xy-text-xl);
    }
  }
}

// 面包屑在品牌渐变上的配色
.article-detail__crumb {
  :deep(.el-breadcrumb__inner),
  :deep(.el-breadcrumb__separator) {
    color: rgba(255, 255, 255, 0.72);
    font-weight: 500;
  }

  :deep(.el-breadcrumb__inner.is-link:hover) {
    color: #fff;
  }

  :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
    color: #fff;
  }
}

// -----------------------------------------------------------------------------
// 主体：限宽到约 68 字符行宽，长文阅读才不累
// -----------------------------------------------------------------------------
.article-detail__body {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-5);
  width: 100%;
  max-width: var(--xy-reading-width);
  margin: 0 auto;
  padding: var(--xy-space-6) var(--xy-space-5);

  @media (max-width: 640px) {
    padding: var(--xy-space-4);
  }
}

.article-detail__card {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-4);
  padding: var(--xy-space-6);

  @media (max-width: 640px) {
    padding: var(--xy-space-4);
  }
}

.article-detail__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--xy-space-3);
}

.article-detail__meta {
  display: inline-flex;
  align-items: center;
  gap: var(--xy-space-1);
  font-size: var(--xy-text-sm);
  color: var(--xy-ink-500);

  .el-icon {
    color: var(--xy-ink-400);
  }
}

.article-detail__title {
  font-size: var(--xy-text-3xl);
  font-weight: 700;
  line-height: 1.35;
  color: var(--xy-ink-900);

  @media (max-width: 640px) {
    font-size: var(--xy-text-xl);
  }
}

.article-detail__summary {
  padding: var(--xy-space-4) var(--xy-space-5);
  border-left: 3px solid var(--xy-primary-400);
  border-radius: 0 var(--xy-radius-sm) var(--xy-radius-sm) 0;
  background: var(--xy-primary-50);
  font-size: var(--xy-text-base);
  line-height: var(--xy-leading-relaxed);
  color: var(--xy-ink-700);
}

.article-detail__byline {
  display: flex;
  flex-wrap: wrap;
  gap: var(--xy-space-5);
  padding-top: var(--xy-space-3);
  border-top: 1px solid var(--xy-border);

  span {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-1);
    font-size: var(--xy-text-sm);
    color: var(--xy-ink-500);
  }

  .el-icon {
    color: var(--xy-ink-400);
  }
}

// -----------------------------------------------------------------------------
// 正文排版：正文 16px / 行高 1.8，标题字阶必须大于正文
// -----------------------------------------------------------------------------
.article-detail__content {
  font-size: var(--xy-text-md);
  line-height: var(--xy-leading-relaxed);
  color: var(--xy-ink-700);

  :deep(p) {
    margin: 0 0 var(--xy-space-4);
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    margin: var(--xy-space-6) 0 var(--xy-space-3);
    font-weight: 600;
    line-height: var(--xy-leading-tight);
    color: var(--xy-ink-900);
  }

  :deep(h1) {
    font-size: var(--xy-text-2xl);
  }

  :deep(h2) {
    padding-bottom: var(--xy-space-2);
    border-bottom: 1px solid var(--xy-border);
    font-size: var(--xy-text-xl);
  }

  :deep(h3) {
    font-size: var(--xy-text-lg);
  }

  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-size: var(--xy-text-md);
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 var(--xy-space-4);
    padding-left: var(--xy-space-5);
  }

  :deep(li) {
    margin-bottom: var(--xy-space-2);
    list-style: disc;
  }

  :deep(ol li) {
    list-style: decimal;
  }

  :deep(strong) {
    font-weight: 600;
    color: var(--xy-ink-900);
  }

  :deep(a) {
    color: var(--xy-primary-600);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--xy-radius-md);
  }

  :deep(blockquote) {
    margin: var(--xy-space-4) 0;
    padding: var(--xy-space-3) var(--xy-space-5);
    border-left: 3px solid var(--xy-border-strong);
    border-radius: 0 var(--xy-radius-sm) var(--xy-radius-sm) 0;
    background: var(--xy-surface-alt);
    color: var(--xy-ink-500);
  }

  :deep(table) {
    width: 100%;
    margin: var(--xy-space-4) 0;
    border-collapse: collapse;
    font-size: var(--xy-text-base);
  }

  :deep(th),
  :deep(td) {
    padding: var(--xy-space-2) var(--xy-space-3);
    border: 1px solid var(--xy-border);
    text-align: left;
  }

  :deep(th) {
    background: var(--xy-surface-alt);
    font-weight: 600;
    color: var(--xy-ink-900);
  }

  :deep(code) {
    padding: 2px 6px;
    border-radius: var(--xy-radius-xs);
    background: var(--xy-surface-alt);
    font-family: var(--xy-font-mono);
    font-size: 0.9em;
    color: var(--xy-primary-700);
  }
}

.article-detail__tags {
  padding-top: var(--xy-space-4);
  border-top: 1px solid var(--xy-border);

  &-title {
    margin-bottom: var(--xy-space-3);
    font-size: var(--xy-text-base);
    font-weight: 600;
    color: var(--xy-ink-900);
  }

  &-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--xy-space-2);
  }
}

.article-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--xy-space-3);
  padding-top: var(--xy-space-4);
  border-top: 1px solid var(--xy-border);

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }

  // 触屏下这两个是页面主要出口，抬到 44px
  @media (max-width: 900px) {
    :deep(.el-button) {
      flex: 1;
      min-height: 44px;
    }
  }
}

// -----------------------------------------------------------------------------
// 骨架
// -----------------------------------------------------------------------------
.article-detail__skeleton-title {
  height: 32px;
  width: 70%;
}

.article-detail__skeleton-meta {
  height: 18px;
  width: 40%;
}

.article-detail__skeleton-line {
  height: 16px;
}
</style>
