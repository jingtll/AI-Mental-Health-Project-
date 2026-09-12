<script setup lang="ts">
/**
 * 心耘品牌标识（图形 + 中文标准字）
 *
 * 图形语义：一株破土的幼苗 —— 对应「耘」即耕耘心田、陪伴生长。
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
      <svg viewBox="0 0 32 32" role="img" aria-hidden="true" focusable="false">
        <!-- 破土的茎 -->
        <path
          d="M16 28V12.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
        />
        <!-- 左叶 -->
        <path
          d="M16 21C11.2 21 8.4 18.1 8.4 13.6C13.4 13.6 16 16.5 16 21Z"
          fill="currentColor"
          opacity="0.92"
        />
        <!-- 右叶 -->
        <path
          d="M16 17.6C16 12.6 18.8 9.8 23.6 9.8C23.6 14.8 20.8 17.6 16 17.6Z"
          fill="currentColor"
        />
      </svg>
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
    border-radius: var(--xy-radius-md);
    background: var(--xy-gradient-brand);
    color: #fff;
    box-shadow: var(--xy-shadow-brand);

    svg {
      width: 66%;
      height: 66%;
    }
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
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.28);
      box-shadow: none;
      backdrop-filter: blur(6px);
    }
  }
}
</style>
