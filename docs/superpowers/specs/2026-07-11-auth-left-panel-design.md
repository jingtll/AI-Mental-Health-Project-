# 登录/注册左侧品牌区 · 温层叙事改版

- 日期：2026-07-11
- 范围：仅 `src/components/AuthLayout.vue` 左侧品牌区（登录/注册共用壳层）
- 不改：右侧表单（`login.vue` / `register.vue`）、API、路由

## 目标

在「叙事重构 + 陪伴感 + 弱化助手」前提下，把左侧从「渐变底 + 小圆球头像」升级为可读的三层品牌叙事，提升登录/注册第一眼的品牌温度与层次。

## 用户已确认

- 方向：叙事重构（非轻量打磨）
- 内容重点：陪伴感为主
- 主视觉：弱化助手（不做大头像球）
- 版式：三层叙事（推荐 A · 温层叙事）
- 工作区：主工作区直接改

## 设计

### 信息架构（上→中→下）

1. **顶层：** `BrandLogo`（`on-dark`）+ 副标题 `brand.fullName`
2. **中层：** 主标语 `brand.slogan` + `brand.sloganHighlight`；副句继续用 `brand.description`，语气强调「被听见 / 陪伴」
3. **底层：** 三枚价值点（替代现有 `assistant-orb` 大圆球）：
   - 倾听对话
   - 情绪日记
   - 温柔成长  
   每枚：小图标 + 短标签；可选一行极短说明（若挤则不写）
4. **助手弱化：** 保留 `brand.assistantName` + 在线状态点，改为标语旁或顶栏的 **小徽章**（小头像或纯圆点 + 文案），不再用 132px 呼吸球

### 视觉

- 保留 `--xy-gradient-brand` 青绿渐变底
- 暖砂光晕更克制（沿用/微调现有 glow，减少大块模糊团）
- 文案层与价值点用半透明 surface 描边/轻底，保证 ≥4.5:1 可读
- 动效：仅轻量呼吸/淡入；尊重 `prefers-reduced-motion`（已有全局降级）

### 布局

- 仍 `@media (max-width: 900px)` 隐藏左侧
- 左栏 `max-width` 可略放宽（约 560–600px）以容纳三枚价值点一行或 wrap
- 价值点用 flex wrap，窄屏桌面不挤爆

### 实现约束

- 仅用设计令牌 `var(--xy-*)`，不写裸 hex（深底白字可用既有 rgba 白）
- 图标优先 Element Plus icons（全局已注册）或现有素材；不新增依赖
- 品牌文案一律来自 `src/config/index.ts` 的 `brand`，不硬编码产品名
- 不改 `emotionDairy` 等拼写；不碰右侧表单逻辑

## 验收

- 登录 `/auth/login` 与注册 `/auth/register` 左侧一致，结构为三层
- 助手不再以大圆球主视觉出现
- `npm run typecheck` 通过
- 视觉与「心耘」青绿 + 暖砂一致，无裸 hex 新色
