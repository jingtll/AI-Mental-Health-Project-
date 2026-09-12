# 心耘 · 心灵耕耘平台（AI 心理陪伴前端）

面向个人用户的 **心理健康 AI 陪伴与自助** 前端应用：用 AI 流式对话做情绪疏导，用情绪日记做日常记录，并用知识库提供心理科普内容；同时提供管理端做内容运营与数据分析。

本仓库**仅含前端**（Vue 3 SPA）。后端为独立远程服务，开发时通过 Vite `/api` 代理访问。

---

## 项目功能

### 用户端

| 模块 | 说明 |
|------|------|
| **首页** | 品牌介绍与入口引导（开始倾诉 / 记录心情） |
| **AI 咨询** | 与「心耘AI助手」多轮对话；SSE 流式回复；会话列表、新建会话、删除会话；侧边**情绪花园**展示当前会话的主要情绪、评分、风险等级与建议 |
| **情绪日记** | 按日填写：情绪评分（1–10）、主要情绪（开心/平静/焦虑等）、触发因素、今日感想、睡眠质量、压力水平 |
| **知识库** | 推荐阅读 + 文章列表（封面、分类、作者、阅读量、发布时间）；文章详情支持摘要、正文、标签 |
| **登录 / 注册** | 普通用户账号；登录后按角色进入前台或后台 |

**咨询侧特点**

- 实时流式输出（SSE），支持 Enter 发送、Shift+Enter 换行
- 临时会话先展示欢迎语，首条消息后再落库正式会话
- 会话情绪分析：主要情绪、情绪分、是否负面、风险等级（正常/关注/预警/危机）、改善建议
- 消息支持 Markdown 风格渲染（代码块、加粗、列表等）

### 管理端（`/back/*`，需管理员账号）

| 模块 | 说明 |
|------|------|
| **数据分析** | 总用户 / 活跃用户、情绪日志量、咨询会话量、平均情绪；三张图表：情绪趋势、咨询活动、用户活跃度 |
| **知识文章** | 分页列表、标题/分类/状态筛选；新增/编辑（富文本 + 封面上传 + 标签）；发布 / 下线 / 删除 |
| **咨询记录** | 全量会话列表，可查看单会话消息明细 |
| **情绪日志** | 全量日记列表；按用户 ID、情绪分区间筛选；详情与删除 |

**管理端特点**

- 侧边栏可折叠，导航由路由 `meta.title` / `meta.icon` 驱动
- 通用搜索组件（输入框 / 下拉）+ 分页表格
- 数据看板基于 ECharts，接口一次拉取 overview 后本地初始化图表

### 角色与权限

| `userType` | 角色 | 可访问 |
|------------|------|--------|
| `1` | 普通用户 | 前台 `/`；访问 `/back` 会被守卫重定向 |
| `2` | 管理员 | 后台 `/back/*`；访问前台会被引导至后台 |

登录态保存在 `localStorage`（`token` + `userInfo`），由路由守卫按角色分流。

---

## 产品 / 技术特点

- **全量 TypeScript**：核心层、组件层与全部页面均为 `lang="ts"`，`vue-tsc` 参与 `build` 门禁
- **统一 HTTP 层**：`src/utils/request.ts` 导出类型化 `http`，拦截器拆包业务 `data`，调用方直接拿 `Promise<T>`
- **SSE 与 REST 分离**：普通业务走 axios；AI 对话走 `@microsoft/fetch-event-source`，避免被拦截器误处理
- **双端一体**：同一 SPA，三套布局壳（用户端 / 后台 / 认证）按路由切换
- **中文产品文案**：界面、校验提示均为中文，贴合心理健康场景语气（温暖、陪伴）
- **CI 门禁**：GitHub Actions 在 push / PR 上强制 `typecheck` + `build`

---

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3.5（Composition API + `<script setup lang="ts">`） |
| 构建 | Vite 8 |
| 语言 | TypeScript 5.x（`strict`）+ `vue-tsc` 2.x |
| 路由 | Vue Router 4（history 模式） |
| 状态 | Pinia（后台侧栏折叠等） |
| UI | Element Plus + Icons（全局注册） |
| 样式 | Sass（组件内 scoped） |
| HTTP | axios（封装于 `request.ts`） |
| 流式对话 | `@microsoft/fetch-event-source` |
| 图表 | ECharts 6 |
| 富文本 | wangEditor 5 |

---

## 品牌与设计系统

**品牌**：心耘 · 心灵耕耘平台。视觉方向「温润心田」—— 青绿主色（耕耘、生长）+ 暖砂强调（情绪、提示）+ 纸白底。

品牌名、全称、助手名等集中在 `src/config/index.ts` 的 `brand` 常量，界面通过 `<BrandLogo />` 渲染，不散落在各页面。

| 令牌组 | 说明 |
|--------|------|
| `--xy-primary-*` | 品牌青绿十档色阶。`-500` 为交互主色（白字对比度 4.91:1）；`-400` 是原品牌色，对比度 4.1:1，**仅用于渐变与大色块** |
| `--xy-accent-*` | 暖砂强调色，用于情绪与提示，克制使用 |
| `--xy-ink-*` / `--xy-surface*` / `--xy-border*` | 中性文字、容器与边框，带极轻青绿灰调 |
| `--xy-risk-0..3` | 风险等级四级色阶（正常 / 关注 / 预警 / 危机），前后台共用 |
| `--xy-emotion-*` | 8 种主要情绪色，全部 ≥4.5:1，替代原先白底不可读的亮色系 |
| `--xy-space-*` / `--xy-radius-*` / `--xy-shadow-*` | 4px 基准间距、圆角与低饱和投影 |
| `--xy-dur-*` / `--xy-ease*` | 150–320ms 动效时长与缓动；`prefers-reduced-motion` 下自动降级 |

所有令牌在 `src/styles/_tokens.scss` 中定义并已验算对比度（注释里记录了每个色值的比值）；`_element.scss` 通过 `--el-*` 变量把 Element Plus 一并换肤。全局关键帧统一 `xy-` 前缀定义在 `_keyframes.scss`。

---

## 快速开始

**环境**：Node.js **24+**，使用 **npm**（仓库含 `package-lock.json`）。

```bash
npm install

# 开发：默认 http://localhost:5173
# /api 代理到后端（见 vite.config.ts）
npm run dev

# 仅类型检查
npm run typecheck

# 生产构建（vue-tsc 通过后才会执行 vite build）
npm run build

# 预览 dist/
npm run preview
```

> 开发依赖**远程后端可达**。后端不可达时，登录、列表、SSE 等会在请求阶段失败；仓库内**没有**本地 mock 服务。

### 脚本一览

| 命令 | 作用 |
|------|------|
| `npm run dev` | 开发服务器 + `/api` 代理 |
| `npm run typecheck` | `vue-tsc --noEmit` |
| `npm run build` | `vue-tsc --noEmit && vite build` |
| `npm run preview` | 预览构建产物 |

路径别名：`@` → `src`。

---

## 项目结构

```text
src/
  main.ts                 # 入口：Element Plus、全量图标、Pinia、Router、全局样式
  router/index.ts         # 路由、登录守卫、切换路由回到顶部
  api/
    frontend.ts           # 用户端接口
    admin.ts              # 管理端接口 + 登录
  utils/
    request.ts            # axios 实例与拦截器（拆包 data.data）
    session.ts            # 登录态读写唯一入口（token / userInfo）
    format.ts             # 日期时间与时长格式化（空值安全）
    emotion.ts            # 情绪 / 风险映射与情绪色板唯一来源
  styles/
    _tokens.scss          # 设计令牌（颜色 / 字体 / 间距 / 圆角 / 阴影 / 动效）
    _base.scss            # 全局基础层与工具类（.xy-card / .xy-empty / .xy-skeleton）
    _keyframes.scss       # 全局关键帧（含 prefers-reduced-motion 兜底）
    _element.scss         # Element Plus 主题覆盖
    index.scss            # 样式汇总入口（仅 main.ts 引入一次）
  config/index.ts         # fileBaseUrl + brand 品牌常量
  types/                  # ApiResponse / 会话 / 情绪等共享类型
  stores/admin.ts         # 后台侧栏折叠
  components/             # 布局壳与通用组件
    consult/              # AI 咨询页的展示组件（情绪花园 / 会话列表）
  views/                  # 全部页面（前台 + /back）
docs/superpowers/         # 设计文档与实施计划
.github/workflows/ci.yml  # CI
```

---

## 接口约定（容易踩坑）

- 请求前缀：`/api`；鉴权头是 **`token`**，不是 `Authorization`
- 业务成功码是**字符串** `"200"`；数字 `200` **不会**被拦截器识别为成功
- 成功时拦截器返回 `data.data`，业务代码拿到的是已拆包数据
- 非 `"200"` / `"-1"` 的业务码会 **reject**，不会 resolve 成完整响应
- 超时 5 秒

### AI 咨询 SSE

| 项 | 值 |
|----|-----|
| 地址 | `POST /api/psychological-chat/stream` |
| Header | `Token`（大写 T）、`Accept: text/event-stream` |
| 分片 | JSON：`{ code, data: { content } }` |
| 结束事件 | `done` |
| 会话 ID | 列表为数字 `id`；流式 / 情绪接口用 **`session_${id}`** 前缀 |

接口文档（Apifox）：https://xsl1e23zpk.apifox.cn/

---

## TypeScript 与工程约定

- `src/**` 业务代码已全部 TS；新代码保持类型完整，避免全局 `any`
- `typescript` 锁定 **5.x**，勿升到 7.x（与当前 `vue-tsc` 不兼容）
- `BackenLayout.vue` 文件名拼写为历史遗留，改名需同步所有 import
- `课件.md` / `src/项目样式.md` 含情绪映射与样式参考；`AI-project学习笔记.md` 可能滞后，以源码为准

---

## CI

`.github/workflows/ci.yml`：

- 触发：`main`、`feat/**` 的 push；对 `main` 的 Pull Request
- 步骤：`npm ci` → `typecheck` → `build`，并上传 `dist` 构建产物（保留 7 天）

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [AGENTS.md](./AGENTS.md) | Agent / 开发协作说明（架构、契约、注意点） |
| `docs/superpowers/` | TS 迁移等设计与实施记录 |
| `课件.md` | 课程参考：接口地址、情绪映射、图表样式 |
| `src/项目样式.md` | 布局与组件样式摘录 |
