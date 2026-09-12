# Auth 左侧温层叙事 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将登录/注册左侧品牌区改为三层叙事（Logo → 主标语 → 价值点），弱化助手为小徽章，去掉大圆球主视觉。

**Architecture:** 只改共享壳层 `src/components/AuthLayout.vue` 模板与 scoped SCSS；文案与品牌常量仍来自 `src/config` 的 `brand`；登录/注册页无需改动。

**Tech Stack:** Vue 3 SFC (`script setup lang="ts"`)、SCSS、Element Plus 全局图标、设计令牌 `--xy-*`。

## Global Constraints

- 仅改：`src/components/AuthLayout.vue`（及必要时极短的品牌常量扩展，优先不改）
- 不改：`login.vue`、`register.vue`、API、路由、`request.ts`
- 品牌名/全称/助手名一律来自 `brand`（`src/config/index.ts`），禁止硬编码「心耘」「小暖」「宁渡」等
- 样式只用 `var(--xy-*)` 令牌或深底可接受的 `rgba(255,255,255,…)`；禁止新增裸 hex
- 响应式：`max-width: 900px` 仍隐藏左侧
- 动效：轻量；已有全局 `prefers-reduced-motion` 降级
- 验证命令：`npm run typecheck`（本仓库无单测/lint）
- 不 commit（用户未要求提交）

---

### Task 1: AuthLayout 左侧三层叙事

**Files:**
- Modify: `src/components/AuthLayout.vue`（模板 + scoped styles 全量更新左侧）
- Reference: `src/config/index.ts`（`brand` 常量，只读）
- Reference: `docs/superpowers/specs/2026-07-11-auth-left-panel-design.md`

**Interfaces:**
- Consumes: `brand.name` / `fullName` / `slogan` / `sloganHighlight` / `description` / `assistantName`；`BrandLogo` 组件；`/AIlogo.png`；`/logo.png`（BrandLogo 内）
- Produces: 登录与注册共用的新左侧 DOM 结构（class 仍在 `.brand-panel*` 命名空间内，便于后续微调）

- [ ] **Step 1: 重写左侧模板结构**

将 `AuthLayout.vue` 的 `<template>` 中 `<aside class="auth-layout__brand">` 内品牌区替换为三层叙事（完整目标结构如下；实现时替换旧的 `assistant-orb` 大球与旧 body）：

```vue
<aside class="auth-layout__brand">
  <div class="brand-panel">
    <span class="brand-panel__glow brand-panel__glow--a" aria-hidden="true" />
    <span class="brand-panel__glow brand-panel__glow--b" aria-hidden="true" />

    <!-- 顶层：品牌 -->
    <div class="brand-panel__top">
      <BrandLogo :size="40" :subtitle="brand.fullName" :on-dark="true" to="/" />
      <span class="brand-panel__badge">
        <el-image :src="robotUrl" class="brand-panel__badge-avatar" alt="" />
        <span class="brand-panel__badge-dot" aria-hidden="true" />
        <span class="brand-panel__badge-text">{{ brand.assistantName }} · 在线</span>
      </span>
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
```

说明：图标 `ChatDotRound` / `Notebook` / `Sunny` 均为 Element Plus 全局注册图标（`main.ts` 已全量注册）。

- [ ] **Step 2: 重写 `.brand-panel` scoped 样式**

替换 `AuthLayout.vue` 中 `.brand-panel` 及删除的 `.assistant-orb` / 旧 `.brand-panel__status` 等样式。目标样式要点（实现时写成完整 SCSS，嵌套在现有 `.auth-layout` 下）：

```scss
.brand-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--xy-space-10);
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: var(--xy-space-10) var(--xy-space-8);
  min-height: 100%;

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
    gap: var(--xy-space-4);
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-2);
    min-height: 36px;
    padding: 4px 12px 4px 4px;
    border-radius: var(--xy-radius-full);
    background: rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.92);
    font-size: var(--xy-text-sm);
    font-weight: 600;
  }

  &__badge-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.18);
  }

  &__badge-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #a8e6c9; // 与既有在线点一致：深底装饰点
    box-shadow: 0 0 0 3px rgba(168, 230, 201, 0.22);
    animation: xy-pulse 2.4s var(--xy-ease) infinite;
  }

  &__story {
    display: flex;
    flex-direction: column;
    gap: var(--xy-space-4);
    align-items: flex-start;
  }

  &__title {
    font-size: var(--xy-text-4xl);
    font-weight: 700;
    line-height: 1.28;
    letter-spacing: 0.02em;
    color: #fff;
  }

  &__highlight {
    color: #f4d9a4; // 暖砂高亮，深底大标题
  }

  &__text {
    max-width: 42ch;
    margin: 0;
    font-size: var(--xy-text-md);
    line-height: var(--xy-leading-relaxed);
    color: rgba(255, 255, 255, 0.88);
  }

  &__points {
    display: flex;
    flex-wrap: wrap;
    gap: var(--xy-space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__point {
    display: inline-flex;
    align-items: center;
    gap: var(--xy-space-2);
    min-height: 44px;
    padding: 0 var(--xy-space-4);
    border-radius: var(--xy-radius-full);
    background: rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
    color: rgba(255, 255, 255, 0.94);
    font-size: var(--xy-text-sm);
    font-weight: 600;
  }

  &__point-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.16);
    color: #f4d9a4;
  }
}
```

同时删除模板与样式中不再使用的：

- `.brand-panel__body`
- `.brand-panel__status`
- `.brand-panel__dot`
- `.assistant-orb` 及其 `__image`

保留 `.auth-layout`、`.auth-layout__brand`（含 900px 隐藏）、`.auth-layout__form` / `__back` 不动。

- [ ] **Step 3: 更新文件头注释**

将 `AuthLayout.vue` 顶部注释中关于 breathing/orb 的过时描述，改为说明「左侧为三层叙事：品牌 / 主标语 / 价值点；助手为小徽章」。

- [ ] **Step 4: 类型检查**

Run: `npm run typecheck`  
Expected: 无错误退出

- [ ] **Step 5: 人工核对要点**

- 登录与注册打开后左侧均为三层，无 132px 大圆球
- 徽章显示「心耘AI助手 · 在线」（文案来自 `brand.assistantName`）
- 900px 以下隐藏左侧
- 未引入新依赖、未改右侧表单

（无自动化 UI 测试；以 typecheck + 视觉核对为准。）

---

## Self-Review

- Spec 覆盖：三层结构、弱化助手、价值点、令牌约束、900px、typecheck — 已映射到 Task 1
- 无 TBD/占位实现步骤
- 无跨任务类型不一致（单任务计划）
