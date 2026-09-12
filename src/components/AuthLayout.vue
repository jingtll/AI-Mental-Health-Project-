<script setup lang="ts">
/**
 * 登录 / 注册布局壳
 *
 * 相对改造前的修复：
 *  - 品牌「心理AI助手」→ config 的 brand
 *  - 原实现左右两侧都写死 `height:100vh` 且右区垂直居中，而注册表单有 6 个字段，
 *    在 768px 高的屏幕上会被裁掉且无法滚动 → 改为 min-height + 右区 overflow-y:auto
 *  - 补回缺失的 @keyframes：原先 `.robot` 引用的 breathing 动画全项目未定义
 *  - 窄屏隐藏品牌侧栏，避免一半屏幕被占满
 *
 * 左侧品牌区（温层叙事）：
 *  顶层 BrandLogo → 中层主标语/副句 → 底层三枚价值点；
 *  不放置 AI 助手主视觉/徽章。
 */
import { brand } from "@/config"
import BrandLogo from "@/components/BrandLogo.vue"
</script>

<template>
  <div class="auth-layout">
    <aside class="auth-layout__brand">
      <div class="brand-panel">
        <span class="brand-panel__glow brand-panel__glow--a" aria-hidden="true" />
        <span class="brand-panel__glow brand-panel__glow--b" aria-hidden="true" />

        <!-- 顶层：品牌 -->
        <div class="brand-panel__top">
          <BrandLogo :size="52" :subtitle="brand.fullName" :on-dark="true" to="/" />
        </div>

        <!-- 中层：主叙事 -->
        <div class="brand-panel__story">
          <h1 class="brand-panel__title">
            {{ brand.slogan }}<br />
            <span class="brand-panel__highlight">{{ brand.sloganHighlight }}</span>
          </h1>
          <p class="brand-panel__text">{{ brand.description }}</p>
        </div>

        <!-- 底层：三枚价值点 -->
        <ul class="brand-panel__points" aria-label="平台能力">
          <li class="brand-panel__point">
            <span class="brand-panel__point-icon" aria-hidden="true">
              <el-icon><ChatDotRound /></el-icon>
            </span>
            <span class="brand-panel__point-label">倾听对话</span>
          </li>
          <li class="brand-panel__point">
            <span class="brand-panel__point-icon" aria-hidden="true">
              <el-icon><Notebook /></el-icon>
            </span>
            <span class="brand-panel__point-label">情绪日记</span>
          </li>
          <li class="brand-panel__point">
            <span class="brand-panel__point-icon" aria-hidden="true">
              <el-icon><Sunny /></el-icon>
            </span>
            <span class="brand-panel__point-label">温柔成长</span>
          </li>
        </ul>
      </div>
    </aside>

    <section class="auth-layout__form">
      <router-link to="/" class="auth-layout__back">
        <el-icon><Back /></el-icon>
        <span>返回首页</span>
      </router-link>
      <div class="auth-layout__form-inner">
        <router-view />
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.auth-layout {
  display: flex;
  align-items: stretch;
  min-height: 100vh;
  background: var(--xy-surface);
}

// -----------------------------------------------------------------------------
// 左侧品牌叙事区（三层：品牌 / 主标语 / 价值点）
// -----------------------------------------------------------------------------
.auth-layout__brand {
  flex: 1 1 50%;
  display: flex;
  position: relative;
  overflow: hidden;
  background: var(--xy-gradient-brand);

  @media (max-width: 900px) {
    display: none;
  }
}

.brand-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--xy-space-8);
  width: 100%;
  max-width: 560px;
  min-height: 100%;
  margin: 0 auto;
  padding: var(--xy-space-6) var(--xy-space-8);

  &__glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    pointer-events: none;

    &--a {
      top: -100px;
      right: -80px;
      width: 280px;
      height: 280px;
      background: rgba(255, 255, 255, 0.16);
      animation: xy-halo 9s var(--xy-ease) infinite;
    }

    &--b {
      bottom: -120px;
      left: -100px;
      width: 300px;
      height: 300px;
      background: rgba(233, 194, 134, 0.18);
      animation: xy-halo 11s var(--xy-ease) infinite reverse;
    }
  }

  &__top {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    // 放大「心耘」标准字与副标（仅登录页左侧，不改全局 BrandLogo）
    :deep(.brand-logo) {
      gap: var(--xy-space-3);
    }

    :deep(.brand-logo__name) {
      font-size: 36px;
      letter-spacing: 0.12em;
    }

    :deep(.brand-logo__subtitle) {
      margin-top: 4px;
      font-size: var(--xy-text-base);
      letter-spacing: 0.16em;
    }
  }

  &__story {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--xy-space-2);
  }

  &__title {
    font-size: var(--xy-text-4xl);
    font-weight: 700;
    line-height: 1.28;
    letter-spacing: 0.02em;
    color: #fff;
  }

  &__highlight {
    color: #f4d9a4;
  }

  &__text {
    max-width: 42ch;
    margin: 0;
    font-size: var(--xy-text-md);
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.88);
  }

  &__points {
    display: flex;
    flex-wrap: wrap;
    gap: var(--xy-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__point {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-2);
    min-height: 48px;
    padding: 0 var(--xy-space-5);
    border-radius: var(--xy-radius-full);
    background: rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
    color: rgba(255, 255, 255, 0.94);
    font-size: var(--xy-text-md);
    font-weight: 600;
  }

  &__point-label {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  &__point-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.16);
    color: #f4d9a4;
  }
}

// -----------------------------------------------------------------------------
// 右侧表单区：可滚动，避免长表单被 100vh 裁切
// -----------------------------------------------------------------------------
.auth-layout__form {
  position: relative;
  flex: 1 1 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--xy-space-16) var(--xy-space-6) var(--xy-space-10);
  overflow-y: auto;
  background: var(--xy-surface);

  @media (max-width: 900px) {
    padding: var(--xy-space-12) var(--xy-space-5) var(--xy-space-8);
  }
}

.auth-layout__form-inner {
  width: 100%;
  max-width: 384px;
}

.auth-layout__back {
  position: absolute;
  top: var(--xy-space-5);
  left: var(--xy-space-5);
  display: inline-flex;
  align-items: center;
  gap: var(--xy-space-2);
  // 窄屏下这是表单区左上角的触控入口，抬到 44px
  min-height: 44px;
  padding: 0 var(--xy-space-3);
  border-radius: var(--xy-radius-sm);
  color: var(--xy-ink-500);
  font-size: var(--xy-text-base);
  transition:
    color var(--xy-dur-fast) var(--xy-ease),
    background-color var(--xy-dur-fast) var(--xy-ease);

  &:hover {
    color: var(--xy-primary-600);
    background: var(--xy-primary-50);
  }
}
</style>
