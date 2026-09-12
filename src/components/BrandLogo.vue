<script setup lang="ts">
/**
 * 心耘品牌标识（图形 + 中文标准字）
 *
 * 图形：public/logo.png（统一站点品牌图，替代原内联幼苗 SVG）。
 * 三个布局壳（FrontendLayout / AuthLayout / Sidebar）共用此组件，
 * 品牌名与副标一律取 config 的 brand，禁止各页面自行拼写。
 */
import { brand } from "@/config"

const props = withDefaults(
  defineProps<{
    /** 图形尺寸（px） */
    size?: number
    /** 是否显示中文标准字 */
    showText?: boolean
    /** 标准字下方的副标；不传则不渲染 */
    subtitle?: string
    /** 深色底上使用（标准字转白） */
    onDark?: boolean
    /** 点击后跳转的路由；传空字符串则不包 router-link */
    to?: string
  }>(),
  {
    size: 40,
    showText: true,
    subtitle: "",
    onDark: false,
    to: "/",
  },
)

const logoSrc = "/logo.png"
const glyphSize = `${props.size}px`
</script>

<template>
  <component
    :is="props.to ? 'router-link' : 'div'"
    :to="props.to || undefined"
    class="brand-logo"
    :class="{ 'brand-logo--dark': props.onDark }"
    :aria-label="props.showText ? undefined : `${brand.name} · ${brand.fullName}`"
  >
    <span class="brand-logo__glyph" :style="{ width: glyphSize, height: glyphSize }">
      <img :src="logoSrc" class="brand-logo__image" :alt="`${brand.name} logo`" />
    </span>
    <span v-if="props.showText" class="brand-logo__text">
      <span class="brand-logo__name">{{ brand.name }}</span>
      <span v-if="props.subtitle" class="brand-logo__subtitle">
        {{ props.subtitle }}
      </span>
    </span>
  </component>
</template>

<style lang="scss" scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: var(--xy-space-3);
  // 作为跳转入口，命中区域不低于 44px（图形本身仍是传入尺寸）
  min-height: 44px;
  color: inherit;

  &__glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: var(--xy-radius-full);
    background: var(--xy-primary-50);
    box-shadow: inset 0 0 0 1px var(--xy-border);
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__text {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }

  &__name {
    font-size: var(--xy-text-xl);
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--xy-ink-900);
  }

  &__subtitle {
    margin-top: 2px;
    font-size: var(--xy-text-xs);
    font-weight: 500;
    letter-spacing: 0.14em;
    color: var(--xy-ink-500);
  }

  &--dark {
    .brand-logo__name {
      color: #fff;
    }

    .brand-logo__subtitle {
      color: rgba(255, 255, 255, 0.78);
    }

    .brand-logo__glyph {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.28);
      box-shadow: none;
      backdrop-filter: blur(6px);
    }
  }
}
</style>
