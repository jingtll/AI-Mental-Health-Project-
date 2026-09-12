<script setup lang="ts">
/**
 * 知识库（用户端）
 *
 * 相对改造前的修复：
 *  - `getImage` 里把后端地址 `http://159.75.169.224:1235` 硬编码了一份，
 *    而项目约定是统一取 config 的 fileBaseUrl（AGENTS.md 明确写了）→ 改为引用常量。
 *  - 无封面时回退的是一段 15KB+ 的行内 base64 PNG，直接写死在源码里 → 换成
 *    约 300 字节的品牌色 SVG data URI，源码体积与可读性都回来了。
 *  - `<el-tag Plain type="primary">` 的 `Plain` 不是合法 prop（Vue 不会把
 *    PascalCase 归一化成 plain），实际渲染成同名 DOM 属性、plain 样式从未生效
 *    → 改为 `effect="plain"`。
 *  - `dayjs(item.updatedAt).format(...)`：updatedAt 为空时界面会显示 "Invalid Date"
 *    → 统一走 utils/format 的 formatDate（空值返回占位符）。
 *  - 时间图标用 `List`、阅读量图标用 `Platform`，语义不符 → 换成 Calendar / View。
 *  - 文章卡是可点击 div 但没有 cursor:pointer，也没有 hover 反馈；键盘用户无法聚焦
 *    → 补 role/tabindex/键盘事件与悬停动效。
 *  - 无加载骨架、无空状态、请求无 catch；`width:1200px` 固定宽度窄屏横向溢出
 *    → 补骨架/空态/catch 与响应式栅格。
 *  - 头部「琥珀→紫」渐变与推荐项左侧橙色竖条与全站品牌无关 → 统一品牌令牌。
 */
import { onMounted, reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { getKnowledgeList } from "@/api/frontend"
import { fileBaseUrl } from "@/config"
import { formatDate } from "@/utils/format"

const router = useRouter()
const headerIcon = new URL("@/assets/images/book.png", import.meta.url).href

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

/** 无封面时的占位图：约 300 字节的品牌色 SVG，替代原先 15KB 的行内 base64 */
const PLACEHOLDER_COVER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="150" viewBox="0 0 240 150">
     <rect width="240" height="150" fill="#eef6f3"/>
     <g stroke="#7fbbab" stroke-width="2.5" stroke-linecap="round" fill="none">
       <path d="M120 104V60"/>
     </g>
     <path d="M120 82c-15 0-24-9-24-22 13 0 24 9 24 22Z" fill="#add5ca"/>
     <path d="M120 70c0-13 9-22 24-22 0 13-11 22-24 22Z" fill="#7fbbab"/>
   </svg>`,
)}`

const recommendList = ref<ArticleItem[]>([])
const articleList = ref<ArticleItem[]>([])
const pagination = reactive({
  currentPage: 1,
  size: 10,
  total: 0,
})
const loading = ref(false)
const recommendLoading = ref(false)

/** 封面地址：后端返回相对路径，需要拼 fileBaseUrl */
const resolveCover = (url?: string) =>
  url ? `${fileBaseUrl}${url}` : PLACEHOLDER_COVER

const getPageList = () => {
  loading.value = true
  const params = {
    sortField: "publishedAt",
    SortDirection: "desc",
    ...pagination,
  }
  getKnowledgeList(params)
    .then((res) => {
      articleList.value = (res.records ?? []) as ArticleItem[]
      pagination.total = res.total ?? 0
    })
    .catch(() => {
      articleList.value = []
      pagination.total = 0
    })
    .finally(() => {
      loading.value = false
    })
}

const handleChange = (page: number) => {
  pagination.currentPage = page
  getPageList()
  // 翻页后回到列表顶部，避免停留在页面下方
  window.scrollTo({ top: 0, behavior: "smooth" })
}

const goToArticle = (id: number | string) => {
  router.push(`/knowledge/article/${id}`)
}

onMounted(() => {
  getPageList()

  recommendLoading.value = true
  getKnowledgeList({
    sortField: "readCount",
    SortDirection: "desc",
    currentPage: 1,
    size: 5,
  })
    .then((res) => {
      recommendList.value = (res.records ?? []) as ArticleItem[]
    })
    .catch(() => {
      recommendList.value = []
    })
    .finally(() => {
      recommendLoading.value = false
    })
})
</script>

<template>
  <div class="knowledge">
    <header class="knowledge__hero">
      <div class="knowledge__hero-inner">
        <el-image :src="headerIcon" class="knowledge__hero-icon" alt="" />
        <div>
          <h1 class="knowledge__hero-title">知识库</h1>
          <p class="knowledge__hero-text">
            理解正在发生的感受，是照顾自己的第一步。
          </p>
        </div>
      </div>
    </header>

    <div class="knowledge__body">
      <!-- 推荐阅读 -->
      <aside class="recommend" aria-labelledby="recommend-title">
        <h2 id="recommend-title" class="recommend__title">
          <el-icon><Star /></el-icon>
          推荐阅读
        </h2>

        <div v-if="recommendLoading" class="recommend__skeleton">
          <div v-for="n in 4" :key="n" class="xy-skeleton recommend__skeleton-row" />
        </div>

        <p v-else-if="!recommendList.length" class="recommend__empty">
          暂无推荐文章
        </p>

        <ul v-else class="recommend__list">
          <li v-for="(item, index) in recommendList" :key="item.id">
            <button
              type="button"
              class="recommend__item"
              @click="goToArticle(item.id)"
            >
              <span class="recommend__rank" aria-hidden="true">
                {{ String(index + 1).padStart(2, "0") }}
              </span>
              <span class="recommend__text">
                <span class="recommend__name">{{ item.title }}</span>
                <span class="recommend__meta">
                  <el-icon><View /></el-icon>
                  {{ item.readCount ?? 0 }} 次阅读
                </span>
              </span>
            </button>
          </li>
        </ul>
      </aside>

      <!-- 文章列表 -->
      <section class="articles" aria-label="文章列表">
        <div v-if="loading" class="articles__skeleton">
          <div v-for="n in 3" :key="n" class="xy-skeleton articles__skeleton-card" />
        </div>

        <div v-else-if="!articleList.length" class="xy-empty articles__empty">
          <el-icon class="xy-empty__icon"><Reading /></el-icon>
          <p class="xy-empty__text">
            这里还没有文章<br />内容正在准备中，先去 AI 咨询聊聊吧
          </p>
        </div>

        <template v-else>
          <article
            v-for="item in articleList"
            :key="item.id"
            class="article xy-card xy-card--interactive"
            role="button"
            tabindex="0"
            @click="goToArticle(item.id)"
            @keydown.enter.prevent="goToArticle(item.id)"
            @keydown.space.prevent="goToArticle(item.id)"
          >
            <el-image
              :src="resolveCover(item.coverImage)"
              class="article__cover"
              fit="cover"
              lazy
              alt=""
            >
              <template #error>
                <img :src="PLACEHOLDER_COVER" class="article__cover" alt="" />
              </template>
            </el-image>

            <div class="article__body">
              <div class="article__head">
                <h3 class="article__title">{{ item.title }}</h3>
                <el-tag v-if="item.categoryName" size="small" effect="plain">
                  {{ item.categoryName }}
                </el-tag>
              </div>

              <div class="article__meta">
                <span v-if="item.authorName">
                  <el-icon><Avatar /></el-icon>
                  {{ item.authorName }}
                </span>
                <span>
                  <el-icon><Calendar /></el-icon>
                  {{ formatDate(item.updatedAt) }}
                </span>
                <span>
                  <el-icon><View /></el-icon>
                  {{ item.readCount ?? 0 }} 次阅读
                </span>
              </div>

              <span class="article__more">
                阅读全文
                <el-icon><ArrowRight /></el-icon>
              </span>
            </div>
          </article>

          <nav class="articles__pagination" aria-label="分页">
            <el-pagination
              :page-size="pagination.size"
              :current-page="pagination.currentPage"
              layout="prev, pager, next"
              :total="pagination.total"
              :hide-on-single-page="true"
              @change="handleChange"
            />
          </nav>
        </template>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.knowledge {
  flex: 1;
}

// -----------------------------------------------------------------------------
// 头部
// -----------------------------------------------------------------------------
.knowledge__hero {
  padding: var(--xy-space-10) var(--xy-space-5);
  background: var(--xy-gradient-brand);
  color: #fff;

  @media (max-width: 640px) {
    padding: var(--xy-space-8) var(--xy-space-4);
  }

  &-inner {
    display: flex;
    align-items: center;
    gap: var(--xy-space-4);
    max-width: var(--xy-content-width);
    margin: 0 auto;
  }

  &-icon {
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    padding: var(--xy-space-2);
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: var(--xy-radius-md);
    background: rgba(255, 255, 255, 0.16);
  }

  &-title {
    font-size: var(--xy-text-2xl);
    font-weight: 700;
    color: #fff;
  }

  &-text {
    margin-top: var(--xy-space-1);
    font-size: var(--xy-text-base);
    color: rgba(255, 255, 255, 0.86);
  }
}

// -----------------------------------------------------------------------------
// 主体：桌面两栏 / 窄屏单栏
// -----------------------------------------------------------------------------
.knowledge__body {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: var(--xy-space-5);
  width: 100%;
  max-width: var(--xy-content-width);
  margin: 0 auto;
  padding: var(--xy-space-6) var(--xy-space-5);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding: var(--xy-space-5) var(--xy-space-4);
  }
}

// -----------------------------------------------------------------------------
// 推荐阅读
// -----------------------------------------------------------------------------
.recommend {
  align-self: start;
  position: sticky;
  top: 92px;
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-3);
  padding: var(--xy-space-5);
  border: 1px solid var(--xy-border);
  border-radius: var(--xy-radius-lg);
  background: var(--xy-surface);
  box-shadow: var(--xy-shadow-sm);

  @media (max-width: 900px) {
    position: static;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: var(--xy-space-2);
    font-size: var(--xy-text-base);
    font-weight: 600;
    color: var(--xy-ink-900);

    .el-icon {
      color: var(--xy-accent-500);
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: var(--xy-space-3);
    width: 100%;
    padding: var(--xy-space-3) 0;
    border: none;
    border-bottom: 1px solid var(--xy-border);
    background: transparent;
    font-family: inherit;
    text-align: left;
    transition: color var(--xy-dur-fast) var(--xy-ease);

    &:hover .recommend__name {
      color: var(--xy-primary-600);
    }
  }

  &__rank {
    flex-shrink: 0;
    font-family: var(--xy-font-mono);
    font-size: var(--xy-text-sm);
    font-weight: 700;
    color: var(--xy-primary-300);
  }

  &__text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-1);
  }

  &__name {
    font-size: var(--xy-text-base);
    font-weight: 500;
    line-height: var(--xy-leading-normal);
    color: var(--xy-ink-700);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color var(--xy-dur-fast) var(--xy-ease);
  }

  &__meta {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-1);
    font-size: var(--xy-text-xs);
    color: var(--xy-ink-400);
  }

  &__skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-3);
  }

  &__skeleton-row {
    height: 38px;
  }

  &__empty {
    padding: var(--xy-space-5) 0;
    font-size: var(--xy-text-sm);
    color: var(--xy-ink-400);
    text-align: center;
  }
}

// -----------------------------------------------------------------------------
// 文章列表
// -----------------------------------------------------------------------------
.articles {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-4);
  min-width: 0;

  &__skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-4);
  }

  &__skeleton-card {
    height: 170px;
  }

  &__empty {
    border: 1px dashed var(--xy-border-strong);
    border-radius: var(--xy-radius-lg);
    background: var(--xy-surface);
  }

  &__pagination {
    display: flex;
    justify-content: center;
    padding-top: var(--xy-space-2);

    :deep(.el-pagination) {
      justify-content: center;
    }
  }
}

.article {
  display: flex;
  gap: var(--xy-space-5);
  padding: var(--xy-space-4);

  @media (max-width: 640px) {
    flex-direction: column;
    gap: var(--xy-space-3);
  }

  &__cover {
    flex-shrink: 0;
    width: 240px;
    height: 150px;
    border-radius: var(--xy-radius-md);
    overflow: hidden;
    background: var(--xy-surface-alt);

    @media (max-width: 900px) {
      width: 180px;
      height: 116px;
    }

    @media (max-width: 640px) {
      width: 100%;
      height: 160px;
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-3);
    flex: 1;
    min-width: 0;
    padding: var(--xy-space-1) 0;
  }

  &__head {
    display: flex;
    align-items: flex-start;
    gap: var(--xy-space-3);
  }

  &__title {
    flex: 1;
    min-width: 0;
    font-size: var(--xy-text-lg);
    font-weight: 600;
    line-height: var(--xy-leading-tight);
    color: var(--xy-ink-900);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;

    @media (max-width: 640px) {
      font-size: var(--xy-text-md);
    }
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--xy-space-4);

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

  &__more {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-1);
    margin-top: auto;
    font-size: var(--xy-text-sm);
    font-weight: 600;
    color: var(--xy-primary-600);
  }
}
</style>
