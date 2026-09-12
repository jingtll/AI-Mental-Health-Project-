<script setup lang="ts">
/**
 * 首页
 *
 * 相对改造前的修复：
 *  - 两个主 CTA 原先是「没有 @click 的 el-button」，点了完全没有反应；
 *    现在分别接到 AI 咨询与情绪日记，未登录时先引导登录。
 *  - `height: calc(100vh - 285px)` 是写死的魔法值，头部/页脚一改就错位 → 改为内容驱动高度。
 *  - 品牌文案硬编码「一次温暖的对话」等 → 统一取 config 的 brand。
 *  - 从「只有一个 hero」补成完整落地结构：hero + 三个功能入口 + 收尾行动区，
 *    让首页真正承担导航职责，而不是一个装饰页。
 */
import { computed } from "vue"
import { useRouter } from "vue-router"
import { ElMessage } from "element-plus"
import { brand } from "@/config"

const router = useRouter()
const assistantAvatar = new URL("@/assets/images/robot-fill.png", import.meta.url).href

const isLoggedIn = computed(() => localStorage.getItem("token") !== null)

interface FeatureItem {
  key: string
  title: string
  description: string
  icon: string
  to: string
  requiresAuth: boolean
}

const features: FeatureItem[] = [
  {
    key: "chat",
    title: "AI 咨询",
    description: "随时说出此刻的心情，得到不评判的倾听与回应，并看到情绪的变化轨迹。",
    icon: "ChatDotRound",
    to: "/consultation",
    requiresAuth: true,
  },
  {
    key: "diary",
    title: "情绪日记",
    description: "用一分钟记录今天的情绪评分、主要情绪与生活指标，慢慢看清自己的节奏。",
    icon: "Notebook",
    to: "/emotion-diary",
    requiresAuth: true,
  },
  {
    key: "knowledge",
    title: "知识库",
    description: "焦虑、睡眠、压力、自我成长——用可靠的心理科普，理解正在发生的感受。",
    icon: "Reading",
    to: "/knowledge",
    requiresAuth: false,
  },
]

const go = (item: Pick<FeatureItem, "to" | "requiresAuth">) => {
  if (item.requiresAuth && !isLoggedIn.value) {
    ElMessage.info("登录后即可开始记录与对话")
    router.push("/auth/login")
    return
  }
  router.push(item.to)
}
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <span class="hero__glow hero__glow--a" aria-hidden="true" />
      <span class="hero__glow hero__glow--b" aria-hidden="true" />

      <div class="hero__inner">
        <div class="hero__text">
          <p class="hero__badge">
            <span class="hero__badge-dot" aria-hidden="true" />
            {{ brand.assistantName }} 在线陪伴
          </p>
          <h1 class="hero__title">
            {{ brand.slogan }}<br />
            <span class="hero__highlight">{{ brand.sloganHighlight }}</span>
          </h1>
          <p class="hero__description">{{ brand.description }}</p>

          <div class="hero__actions">
            <el-button
              type="primary"
              size="large"
              class="hero__cta"
              @click="go({ to: '/consultation', requiresAuth: true })"
            >
              <el-icon><ChatDotRound /></el-icon>
              开始倾诉，获得陪伴
            </el-button>
            <el-button
              size="large"
              class="hero__cta hero__cta--ghost"
              @click="go({ to: '/emotion-diary', requiresAuth: true })"
            >
              <el-icon><EditPen /></el-icon>
              记录心情，释放情感
            </el-button>
          </div>

          <ul class="hero__facts">
            <li><el-icon><Clock /></el-icon>随时可用，不必等待</li>
            <li><el-icon><ChatLineRound /></el-icon>不评判的倾听</li>
            <li><el-icon><TrendCharts /></el-icon>情绪变化看得见</li>
          </ul>
        </div>

        <div class="hero__visual">
          <div class="orb">
            <el-image :src="assistantAvatar" class="orb__image" alt="" />
          </div>
        </div>
      </div>
    </section>

    <!-- 功能入口 -->
    <section class="features" aria-labelledby="features-title">
      <div class="features__inner">
        <h2 id="features-title" class="features__title">从这里开始</h2>
        <p class="features__subtitle">三种方式，陪你一点点把心安放好</p>

        <div class="features__grid">
          <article
            v-for="item in features"
            :key="item.key"
            class="feature-card xy-card xy-card--interactive"
            role="button"
            tabindex="0"
            @click="go(item)"
            @keydown.enter.prevent="go(item)"
            @keydown.space.prevent="go(item)"
          >
            <span class="feature-card__icon">
              <el-icon><component :is="item.icon" /></el-icon>
            </span>
            <h3 class="feature-card__title">{{ item.title }}</h3>
            <p class="feature-card__text">{{ item.description }}</p>
            <span class="feature-card__link">
              去看看
              <el-icon><ArrowRight /></el-icon>
            </span>
          </article>
        </div>
      </div>
    </section>

    <!-- 收尾行动区 -->
    <section class="closing">
      <div class="closing__inner">
        <h2 class="closing__title">今天的心情，值得被认真对待</h2>
        <p class="closing__text">
          {{ brand.description }}
        </p>
        <el-button
          type="primary"
          size="large"
          @click="go({ to: isLoggedIn ? '/consultation' : '/auth/register', requiresAuth: false })"
        >
          {{ isLoggedIn ? "继续说点什么" : "免费注册，开始记录" }}
        </el-button>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.home {
  flex: 1;
}

// -----------------------------------------------------------------------------
// Hero
// -----------------------------------------------------------------------------
.hero {
  position: relative;
  overflow: hidden;
  padding: var(--xy-space-20) var(--xy-space-5);
  background: var(--xy-gradient-brand);
  color: #fff;

  @media (max-width: 900px) {
    padding: var(--xy-space-12) var(--xy-space-5);
  }

  &__glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
    pointer-events: none;

    &--a {
      top: -120px;
      right: 8%;
      width: 380px;
      height: 380px;
      background: rgba(255, 255, 255, 0.2);
      animation: xy-halo 10s var(--xy-ease) infinite;
    }

    &--b {
      bottom: -140px;
      left: 4%;
      width: 420px;
      height: 420px;
      background: rgba(233, 194, 134, 0.26);
      animation: xy-halo 12s var(--xy-ease) infinite reverse;
    }
  }

  &__inner {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--xy-space-12);
    max-width: var(--xy-content-width);
    margin: 0 auto;

    @media (max-width: 900px) {
      flex-direction: column-reverse;
      gap: var(--xy-space-8);
      text-align: center;
    }
  }

  &__text {
    max-width: 560px;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-2);
    margin-bottom: var(--xy-space-5);
    padding: 6px 14px;
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: var(--xy-radius-full);
    background: rgba(255, 255, 255, 0.14);
    font-size: var(--xy-text-sm);
    font-weight: 600;
    color: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(6px);
  }

  &__badge-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #a8e6c9;
    animation: xy-pulse 2.4s var(--xy-ease) infinite;
  }

  &__title {
    font-size: var(--xy-text-4xl);
    font-weight: 700;
    line-height: 1.28;
    letter-spacing: 0.02em;
    color: #fff;

    @media (max-width: 640px) {
      font-size: var(--xy-text-2xl);
    }
  }

  &__highlight {
    color: #f4d9a4;
  }

  &__description {
    margin-top: var(--xy-space-5);
    max-width: 46ch;
    font-size: var(--xy-text-md);
    line-height: var(--xy-leading-relaxed);
    color: rgba(255, 255, 255, 0.86);

    @media (max-width: 900px) {
      margin-inline: auto;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--xy-space-3);
    margin-top: var(--xy-space-8);

    @media (max-width: 900px) {
      justify-content: center;
    }
  }

  &__cta {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-2);
    height: 50px;
    padding: 0 var(--xy-space-6);
    font-size: var(--xy-text-md);
    font-weight: 600;
    border-radius: var(--xy-radius-md);
  }

  // 在品牌渐变上，主按钮改为白底青绿字，对比度远高于青绿底白字
  &__cta.el-button--primary {
    background: #fff;
    border-color: #fff;
    color: var(--xy-primary-700);
    box-shadow: 0 8px 24px rgba(20, 51, 45, 0.22);

    &:hover,
    &:focus {
      background: #f3f8f6;
      border-color: #f3f8f6;
      color: var(--xy-primary-800);
    }
  }

  &__cta--ghost {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.5);
    color: #fff;

    &:hover,
    &:focus {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.8);
      color: #fff;
    }
  }

  &__facts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--xy-space-5);
    margin-top: var(--xy-space-8);

    @media (max-width: 900px) {
      justify-content: center;
      gap: var(--xy-space-4);
    }

    li {
      display: inline-flex;
      align-items: center;
      gap: var(--xy-space-2);
      font-size: var(--xy-text-sm);
      color: rgba(255, 255, 255, 0.8);
    }
  }

  &__visual {
    flex-shrink: 0;
  }
}

.orb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 260px;
  height: 260px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2) 0%,
    rgba(255, 255, 255, 0.06) 100%
  );
  box-shadow:
    var(--xy-shadow-lg),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  animation: xy-breathing 6s var(--xy-ease) infinite;

  @media (max-width: 900px) {
    width: 180px;
    height: 180px;
  }

  &__image {
    width: 130px;
    height: 130px;

    @media (max-width: 900px) {
      width: 90px;
      height: 90px;
    }
  }
}

// -----------------------------------------------------------------------------
// 功能入口
// -----------------------------------------------------------------------------
.features {
  padding: var(--xy-space-16) var(--xy-space-5);

  @media (max-width: 900px) {
    padding: var(--xy-space-10) var(--xy-space-4);
  }

  &__inner {
    max-width: var(--xy-content-width);
    margin: 0 auto;
  }

  &__title {
    font-size: var(--xy-text-2xl);
    font-weight: 700;
    text-align: center;
    color: var(--xy-ink-900);
  }

  &__subtitle {
    margin-top: var(--xy-space-2);
    margin-bottom: var(--xy-space-10);
    font-size: var(--xy-text-md);
    text-align: center;
    color: var(--xy-ink-500);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--xy-space-5);

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }
}

.feature-card {
  display: flex;
  flex-direction: column;
  gap: var(--xy-space-3);
  padding: var(--xy-space-6);

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    border-radius: var(--xy-radius-md);
    background: var(--xy-primary-50);
    color: var(--xy-primary-600);
    font-size: 22px;
  }

  &__title {
    font-size: var(--xy-text-lg);
    font-weight: 600;
    color: var(--xy-ink-900);
  }

  &__text {
    flex: 1;
    font-size: var(--xy-text-base);
    line-height: var(--xy-leading-relaxed);
    color: var(--xy-ink-500);
  }

  &__link {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-1);
    font-size: var(--xy-text-base);
    font-weight: 600;
    color: var(--xy-primary-600);
  }
}

// -----------------------------------------------------------------------------
// 收尾行动区
// -----------------------------------------------------------------------------
.closing {
  padding: 0 var(--xy-space-5) var(--xy-space-16);

  @media (max-width: 900px) {
    padding: 0 var(--xy-space-4) var(--xy-space-10);
  }

  &__inner {
    max-width: var(--xy-content-width);
    margin: 0 auto;
    padding: var(--xy-space-12) var(--xy-space-8);
    border: 1px solid var(--xy-border);
    border-radius: var(--xy-radius-xl);
    background: var(--xy-gradient-brand-soft);
    text-align: center;

    @media (max-width: 640px) {
      padding: var(--xy-space-8) var(--xy-space-5);
    }
  }

  &__title {
    font-size: var(--xy-text-2xl);
    font-weight: 700;
    color: var(--xy-ink-900);
  }

  &__text {
    max-width: 52ch;
    margin: var(--xy-space-3) auto var(--xy-space-6);
    font-size: var(--xy-text-md);
    line-height: var(--xy-leading-relaxed);
    color: var(--xy-ink-500);
  }
}
</style>
