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
 */
import { brand } from "@/config"
import BrandLogo from "@/components/BrandLogo.vue"

const robotUrl = new URL("@/assets/images/robot-fill.png", import.meta.url).href
</script>

<template>
  <div class="auth-layout">
    <aside class="auth-layout__brand">
      <div class="brand-panel">
        <span class="brand-panel__glow brand-panel__glow--a" aria-hidden="true" />
        <span class="brand-panel__glow brand-panel__glow--b" aria-hidden="true" />

        <BrandLogo :size="46" :subtitle="brand.fullName" :on-dark="true" to="/" />

        <div class="brand-panel__body">
          <h1 class="brand-panel__title">
            {{ brand.slogan }}<br />
            <span class="brand-panel__highlight">{{ brand.sloganHighlight }}</span>
          </h1>
          <p class="brand-panel__text">{{ brand.description }}</p>

          <div class="assistant-orb">
            <el-image :src="robotUrl" class="assistant-orb__image" alt="" />
          </div>
          <p class="brand-panel__status">
            <span class="brand-panel__dot" aria-hidden="true" />
            {{ brand.assistantName }} 在线陪伴
          </p>
        </div>
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
// 左侧品牌叙事区
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
  gap: var(--xy-space-10);
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: var(--xy-space-10) var(--xy-space-8);

  &__glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    pointer-events: none;

    &--a {
      top: -80px;
      right: -60px;
      width: 320px;
      height: 320px;
      background: rgba(255, 255, 255, 0.22);
      animation: xy-halo 9s var(--xy-ease) infinite;
    }

    &--b {
      bottom: -100px;
      left: -80px;
      width: 360px;
      height: 360px;
      background: rgba(233, 194, 134, 0.28);
      animation: xy-halo 11s var(--xy-ease) infinite reverse;
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--xy-space-5);
    margin-top: auto;
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
    max-width: 40ch;
    font-size: var(--xy-text-md);
    line-height: var(--xy-leading-relaxed);
    color: rgba(255, 255, 255, 0.86);
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-2);
    font-size: var(--xy-text-sm);
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #a8e6c9;
    box-shadow: 0 0 0 4px rgba(168, 230, 201, 0.24);
    animation: xy-pulse 2.4s var(--xy-ease) infinite;
  }
}

.assistant-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132px;
  height: 132px;
  margin-top: var(--xy-space-2);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2) 0%,
    rgba(255, 255, 255, 0.06) 100%
  );
  box-shadow:
    var(--xy-shadow-lg),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  // 补齐原先全程缺失的关键帧
  animation: xy-breathing 5s var(--xy-ease) infinite;

  &__image {
    width: 64px;
    height: 64px;
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
