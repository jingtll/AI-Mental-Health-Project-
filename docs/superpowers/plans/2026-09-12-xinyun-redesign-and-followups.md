# 心耘品牌与设计系统 · 完成记录与后续实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务执行第二部分。步骤用 `- [ ]` 复选框跟踪。若本机未安装这两个技能，则用 `subagent` 工具按「一任务一子代理」执行，任务间人工复核；或直接在本会话内联执行，按任务边界设检查点。

**Goal:** 记录本轮「宁渡 → 心耘」品牌替换与设计系统改造的全部交付内容与验证证据，并把尚未完成的工作整理成可直接逐条执行的任务清单。

**Architecture:** 前端单仓（Vue 3 SPA，仅前端，后端为远程服务）。本轮改造把散落在各页面的硬编码色值、品牌名与重复映射，收敛为三层：设计令牌（`src/styles/`）→ 共享工具（`src/utils/`）→ 页面/组件只消费令牌与工具。后续任务延续这一分层：新增能力优先进 `utils` 或抽成展示组件，不在页面里再写第二份实现。

**Tech Stack:** Vue 3.5（`<script setup lang="ts">`）、Vite 8.0.8（构建器为 rolldown 1.0.0-rc.15）、TypeScript 5.x + `vue-tsc` 2.x、Element Plus 2.13、Pinia、Vue Router 4、ECharts 6、wangEditor 5、SCSS、`@microsoft/fetch-event-source`。

---

## Global Constraints

以下约束对**每一个**任务都生效，逐字取自仓库既有约定（`AGENTS.md` / 本轮确立的规范），不得违反。

- **包管理器**：只用 `npm`（仓库含 `package-lock.json`）。可用脚本仅 4 个：`dev` / `build` / `preview` / `typecheck`。
- **TS 工具链**：`typescript` 锁 **5.x**，`vue-tsc` **2.x**。**禁止升到 TypeScript 7**（当前 `vue-tsc` 无法解析 `./lib/tsc`）。
- **`strict: true`**。优先补真实类型而不是 `any`；局部 `as` / 收窄必须写清理由。
- **路径别名**：`@` → `src`。
- **品牌单一来源**：品牌名「心耘」、全称「心灵耕耘平台」、助手名「心耘AI助手」只定义在 `src/config/index.ts` 的 `brand`，界面通过 `<BrandLogo />` 渲染。**禁止**硬编码品牌名，**禁止**再出现已废弃的「宁渡」「小暖」「心理健康AI助手」「心理AI助手」。
- **样式走令牌**：颜色 / 间距 / 圆角 / 阴影 / 时长一律用 `var(--xy-*)`（定义在 `src/styles/_tokens.scss`）。**禁止在 SFC 样式里写裸 hex**。例外仅两类：(a) 品牌渐变上的纯白 `#fff`；(b) `<img src="data:image/svg+xml,...">` 里的颜色——data URI 内的 SVG 拿不到页面 CSS，只能用字面值。
- **关键帧**：全部以 `xy-` 前缀定义在 `src/styles/_keyframes.scss`，引用前必须先定义（本项目历史上出现过引用 4 个未定义动画、全部静默失效的事故）。
- **无障碍底线**：正文文字对比度 ≥ 4.5:1（令牌里每个色值的比值已验算并写在注释中）、`:focus-visible` 焦点环可见、触屏目标 ≥ 44px、状态不得只靠颜色单一维度传达、尊重 `prefers-reduced-motion`。纯图标按钮必须有 `aria-label`。
- **日期时间**：界面上显示的时间必须走 `src/utils/format.ts`，禁止直接渲染接口原始 ISO 串。
- **情绪 / 风险映射**：必须来自 `src/utils/emotion.ts`，禁止在页面里再写一份。语义以 `课件.md` 为准，不臆造。
- **SSE 契约不可动**：`POST /api/psychological-chat/stream`，请求头 `Token`（大写 T）、`Accept: text/event-stream`，分片 `{ code, data: { content } }`，终止事件名 `done`，会话 ID 用 `session_${id}` 前缀。**不要**用 axios「修」它。
- **HTTP 契约**：`baseURL` 为 `/api`；鉴权头是 `token`（不是 `Authorization`）；成功码是**字符串** `"200"`；拦截器成功时已拆包 `data.data`；非 `"200"`/`"-1"` 的业务码会 **reject**。
- **UI 文案与注释为中文。**
- **文件名拼写**：`BackenLayout.vue` 是历史遗留拼写，改名必须同步所有 import。
- **`dist/` 已被 `.gitignore` 忽略**（不是提交产物）。
- **仓库目前没有**测试框架、lint、格式化配置；`.github/` 目录不存在。因此除 Task 1 外，各任务的验证手段是 `npm run typecheck` + `npm run build` + 浏览器断言（见各任务步骤）。
- **后端在本机开发沙箱内不可达**（代理目标 `http://159.75.169.224:1235` 无出网），涉及数据的路径只能验证「加载 / 空态 / 错误态」分支；标注了 `[需后端]` 的验收项必须在能连通后端的环境补做。

---

# 第一部分 · 已完成改动（交付记录）

本部分全部改动位于分支 `refactor/UI`，**尚未提交**（HEAD 仍是 `5c6de2b 完成全部迁移至ts，并更新readme`）。

## 1.1 交付概览

| 指标 | 数值 |
|---|---|
| 修改文件 | 30 个 |
| 新增文件 | 11 个源码文件（另有 1 个 `index.scss` 入口） |
| 代码量变化 | `+5793 / −3393` |
| 构建门禁 | `npm run build`（`vue-tsc --noEmit && vite build`）exit 0 |
| 浏览器实测 | 33 个「路由 × 断点」组合 + 14 个视口高度 |

> 注：`+5793` 包含新增文件的全部行数，不能直接当作「净增复杂度」——`consultation.vue` 单文件同时删掉了 571 行整段重复的 SCSS。

## 1.2 新增文件与职责

| 文件 | 行数 | 职责 |
|---|---|---|
| `src/styles/_tokens.scss` | 184 | 设计令牌唯一来源：品牌青绿十档、暖砂强调、纸白中性、语义色、风险四级、8 种情绪色、字体栈、间距 / 圆角 / 阴影 / 动效；末尾把 `--el-*` 映射到品牌色 |
| `src/styles/_base.scss` | 181 | 全局基础层：排版、`:focus-visible` 焦点环、跳转主内容链接、滚动条、工具类（`.xy-card` / `.xy-empty` / `.xy-skeleton` / `.xy-truncate-*` / `.visually-hidden`） |
| `src/styles/_keyframes.scss` | 89 | 全部 `xy-` 前缀关键帧 + `prefers-reduced-motion` 降级 |
| `src/styles/_element.scss` | 282 | Element Plus 主题覆盖：按钮 / 输入 / 卡片 / 标签 / 表格 / 分页 / 弹窗 / 菜单 / 描述列表；含 ≤900px 触屏目标 44px 与弹窗宽度兜底 |
| `src/styles/index.scss` | 7 | 样式汇总入口，只在 `main.ts` 引入一次 |
| `src/utils/format.ts` | 78 | 空值安全的时间 / 时长格式化（`formatDate` / `formatDateTime` / `formatRelative` / `formatDuration` 等） |
| `src/utils/session.ts` | 35 | 登录态读写唯一入口，杜绝 `userinfo` / `userInfo` 大小写写错 |
| `src/utils/emotion.ts` | 134 | 情绪 / 风险映射唯一来源：标签类型、风险文案与色阶、情绪色、强度档位、8 种情绪资源 |
| `src/components/BrandLogo.vue` | 124 | 品牌标识（内联 SVG 幼苗 + 中文标准字），支持 `size` / `showText` / `subtitle` / `onDark` / `to` |
| `src/components/consult/EmotionGarden.vue` | 327 | 情绪花园（纯展示）：情绪球、强度、风险、建议、治愈行动 |
| `src/components/consult/SessionList.vue` | 259 | 会话列表（纯展示）：选中态、删除、骨架、空态 |

## 1.3 品牌统一

改造前是**四套名字并存**，不是一处遗漏：

| 位置 | 改造前 | 现状 |
|---|---|---|
| `consultation.vue`（3 处） | 宁渡AI助手 | `brand.assistantName` |
| `consultation.vue` 欢迎语 | 自称「小暖」 | 与助手名统一 |
| `FrontendLayout.vue` 导航 + 页脚 | 心理健康AI助手 | `BrandLogo` + `brand.name` |
| `Sidebar.vue` | 心理健康AI助手 | `BrandLogo` + `brand.adminSubtitle` |
| `AuthLayout.vue` | 心理AI助手 | `brand.name` / `brand.fullName` |
| `index.html` `<title>` | `ai-project` | `心耘 · 心灵耕耘平台 \| AI 心理陪伴` |
| `README.md`、`AI-project学习笔记.md`、`docs/.../dashboard-consultation-ts.md` | 宁渡 | 心耘 |

验证：`src/**`、`README.md`、`index.html` 中「宁渡 / 小暖 / 心理健康AI助手 / 心理AI助手」的残留**仅存在于说明注释**（记录「替换了什么」），浏览器实测 33 个组合**零残留**。

## 1.4 修复的真实缺陷

每条都先读到代码证据再动手。

| # | 现象 | 根因 | 修法 |
|---|---|---|---|
| 1 | 呼吸圆圈不呼吸、在线圆点不脉冲、打字点不动、气泡不淡入 | 全项目 **0 个 `@keyframes` 定义**，却引用了 `breathing` / `pulse` / `typing` / `fadeInUp` | 在 `_keyframes.scss` 补齐并统一 `xy-` 前缀 |
| 2 | 情绪花园永远显示「中性 / 50」 | 模板把 `中性` / `50` **硬编码**，接口返回的 `primaryEmotion` / `emotionScore` 从未渲染 | 抽出 `EmotionGarden`，orb 颜色 / 文字 / 评分 / 强度 / 风险全部由 `currentEmotion` 驱动 |
| 3 | 新消息出现在视口外 | 聊天区无自动滚动 | 新增吸底滚动（仅在用户本就贴底时跟随）+「回到最新」按钮 |
| 4 | 回复失败时错误气泡不显示 | `handleError` 只改 `content` 不置 `isError`，模板错误分支是死代码 | 补 `isError = true` |
| 5 | 流结束事件丢失时输入框**永久禁用** | `isAiTyping` 只在 `done` 分支复位 | `onclose` + `finally` 双重兜底 |
| 6 | 会话创建失败时用户输入**静默丢失** | 失败无 catch，`userMessage` 已清空 | 失败回填输入框并提示（已实测） |
| 7 | 「新对话」里残留上一个会话内容 | 新建会话不清 `messages` | 同时清空消息并重置情绪 |
| 8 | `consultation.vue` 1734 行 | 整个 `.consultation-container` SCSS 块**被复制两遍**（571 行重复） | 删除重复块 + 抽出两个展示组件 |
| 9 | 会话列表无选中态 | `.session-item.active` 无任何地方赋值 | 由 `activeSessionId` 驱动，并加 `aria-current` |
| 10 | 点「删除」会同时切到该会话 | 删除按钮嵌在整行点击区内，事件冒泡 | `@click.stop` + 删除二次确认 |
| 11 | 界面直接显示 `2026-01-27T12:34:56.789Z` | 模板裸渲染接口 ISO 串 | 统一走 `utils/format` |
| 12 | 「治愈小行动」标题无样式 | 模板 class 拼写 `acitons-title`，样式选择器是 `.actions-title` | 修正拼写 |
| 13 | 四个统计数字 24px 加粗从未生效 | 样式写 `.info .value`，模板用 `class="number"` | 选择器与模板对齐 |
| 14 | 侧栏折叠后图表错位 | ECharts 无 resize 监听 | `ResizeObserver` + `onUnmounted` 清理（已实测 458→548 重绘） |
| 15 | 后台登出后会话残留 | 登出删小写 `userinfo`，全站存的是 `userInfo` | 统一走 `utils/session.clearSession()` |
| 16 | 侧栏菜单永不跟随路由 | `default-active="2"` 是硬编码死值 | 绑定 `route.path` + `el-menu` router 模式（已实测四项逐一高亮） |
| 17 | 两次密码不同也能注册成功 | 有「确认密码」字段但**无一致性校验** | 新增校验 + 邮箱 / 手机号 / 长度规则（已实测拦截） |
| 18 | 注册长表单在小屏被裁掉且无法滚动 | 左右两侧都写死 `height: 100vh` 且右区垂直居中 | 改 `min-height` + 右区 `overflow-y: auto` |
| 19 | 登录页「返回首页」点了没反应 | 是个无点击事件的 `div` | 移到 `AuthLayout` 作为真实 `router-link` |
| 20 | 首页两个主 CTA 点了没反应 | `el-button` 没有 `@click` | 接线到 AI 咨询 / 情绪日记，未登录先引导登录 |
| 21 | 界面显示 `Invalid Date` | `dayjs(undefined).format(...)` | 统一走 `utils/format` 的空值安全实现 |
| 22 | 后台表格列标签与内容不符 | `consultations.vue` 首列表头「会话ID」但内容是用户头像；`emotional.vue` 多列 `prop` 与 label 错配 | 逐列纠正 |
| 23 | 详情弹窗消息正文排版错乱 | `.message-content` 样式被错误嵌套在 `.message-header`（flex）内部 | 移出到 `.message-item` 下 |
| 24 | 接口失败时弹窗一直转圈 | `getSessionDetail` 无 catch，`loadingMessages` 永远为 true | 补 catch / finally |
| 25 | 五个映射函数在页面里重复实现 | `emotional.vue` 自带一份 `getEmotionTagType` 等，与 `utils/emotion.ts` 重复，且用的是 Element 默认色 | 删本地实现，改从 utils 导入 |
| 26 | 骨架屏 / 空态 / 错误态缺失 | 多数列表页请求期间是空白板 | 统一补 `.xy-skeleton` / `.xy-empty` / catch |
| 27 | 窄屏横向滚动 | `width: 1200px` / `980px` 固定宽度 | 响应式栅格 + 令牌化容器（实测 33 组合零横向滚动） |
| 28 | 后台 375px 下主内容只剩 **51px** | 侧栏固定 248px 无移动端行为 | 按 `matchMedia` 自动折叠到 68px 轨道，状态写入 Pinia 保证视觉与加载态一致 |
| 29 | 触控目标不足 44px | Element Plus 默认输入 32px / 按钮 36px；头部按钮被 flex 压到 38px | 主题层 ≤900px 统一 44px；`flex-shrink: 0`；入口按钮实测 44–50px |
| 30 | emoji 当图标（💝 ✨ 🤗） | 跨平台字形不一致、无法继承主题色、读屏朗读为「爱心」 | 换成 Element Plus 图标 |
| 31 | `404` 文章页白屏 | 无失败 / 空态分支 | 补骨架、错误提示与返回入口 |
| 32 | 非法 CSS 与全局样式打架 | `style.css` 里 `padding: 10px, 0;`（逗号非法）从未生效；全局 `.el-header{height:50px!important}` 与 `BackenLayout` 的 `74px!important` 对打 | 修正声明；header 高度归还布局组件（用 `--el-header-height`） |
| 33 | 登录 `<html lang="en">` 而 UI 全中文 | — | 改 `zh-CN`，补 `description` / `theme-color` |
| 34 | 切页继承上一页滚动位置 | 路由无 `scrollBehavior` | 补 `scrollBehavior`（返回前进恢复原位置） |
| 35 | 后端地址被硬编码 | `frontendKnowledge.vue` 自写 `http://159.75.169.224:1235` | 改引用 `config.fileBaseUrl` |
| 36 | 15KB 行内 base64 占位图写在源码里 | 无封面时的回退图 | 换约 300 字节的品牌色 SVG data URI |
| 37 | `Plain` 不是合法 prop | Vue 不会把 PascalCase 归一化为 `plain`，实际渲染成同名 DOM 属性 | 改 `effect="plain"` |
| 38 | 文章正文 `h2` 比正文还小 | 正文 15px，`h2` 被设成 15px、`h3` 13px，层级颠倒 | 重排字阶，正文提到 16px、行高 1.8、行宽限到约 68 字符 |
| 39 | 富文本正文无任何过滤就 `v-html` | 接口返回内容直出 | 补前端防御性过滤（剔除 script/style/iframe、`on*` 属性、`javascript:`/`data:` 协议）——**注意这只是兜底，见 Task 9** |
| 40 | 后台 4 页零散问题 | 分组不当 / 重复模板 / 缺少 loading 与空态 / ECharts 旧色板与品牌脱节 | 由子代理执行、我逐项复核（含画布像素扫描确认旧色板已归零） |

## 1.5 验证方式与实测结果

因为本模型读不了截图，全部改用 **DOM / computed style / CSS 规则匹配**断言，可复现、可量化。

**A. 33 个「路由 × 断点」组合**（用户端 7 路由 + 后台 4 路由 × 375 / 768 / 1440）

| 检查项 | 结果 |
|---|---|
| 横向溢出 | **0** |
| 裸 ISO 串 / `Invalid Date` / `NaN` / `undefined` 出现在界面 | **0** |
| 已废弃品牌名残留 | **0** |
| emoji（当图标用） | **0** |
| 触屏目标 < 44px（375 / 768 下） | **0**（WCAG 2.5.8 豁免的「句子中的行内链接」除外，已单独标注） |

**B. 首页 100vh 版本**（14 个视口高度，**该方案已被撤销**，见 1.8）

**C. 逐项功能断言**

- 关键帧：6 个 `xy-` 动画经 `CSSRule.KEYFRAMES_RULE` 确认已被浏览器解析；全项目 12 处 `animation:` 引用全部指向已定义动画，**0 处悬空**。
- 聊天发送：输入后计数器 `15/500`、发送按钮启用；点击发送 → 后端不可达 → **输入内容被回填**、未产生幽灵气泡、按钮恢复可用。
- 后台菜单高亮：`/back/dashboard` → 数据分析、`/back/knowledge` → 知识文章、`/back/consultations` → 咨询记录、`/back/emotional` → 情绪日志，四项逐一正确。
- 侧栏折叠 + 图表 resize：`248 → 68 → 248`，画布 `[458,458,1018] → [548,548,1198] → [458,458,1018]`。
- 键盘可访问性：`Tab` 遍历焦点环可见（品牌标识 / 导航 / 按钮 / 功能卡片均获得实心焦点环），`Enter` 可激活导航并跳转。
- 注册校验：用户名长度、邮箱格式、**两次密码不一致**三条错误同时被拦下。
- 移动端弹窗：375px 下声明 `width="800px"` 的弹窗被主题层压到 345px，不溢出。
- 空态 / 错误态：知识库、文章详情、后台各页在后端不可达时落到明确空态，无白屏。

**D. 构建**：`npm run build` → `✓ built in 1.4s`，exit 0（仅有既存的 chunk >500kB 警告）。

## 1.6 局限与两处必须更正的判断

**这一节是上一轮汇报里不够准确的地方，如实记录，避免后续任务建立在错误前提上。**

1. **「全站无裸 hex」的说法过宽。** 准确情况是：本轮**改造过的**页面已令牌化，但
   - `src/components/MarkdownRenderer.vue` —— **22 处**裸 hex 在真实声明里（Tailwind 灰阶 + 蓝色强调 `#3b82f6` / `#1e40af`），AI 回复的引用块 / 代码 / 链接仍是**蓝色**，与品牌青绿不一致；
   - `src/components/RichTextEditor.vue` —— 共 114 处，但**不是同一类问题**，实测分布为：`<style>` 内 **33 处**（真实的令牌缺口，含 `#2563eb !important` 的蓝色选中态）、`<script>` 内 **18 处**（编辑器调色板字面值，属数据而非样式，**应当保留**）。我最初把它整体归为「另一类问题」是**错的**，已据此补进 Task 4；
   - `src/components/ArticleDialog.vue` —— 2 处（`#8b949e` / `#f6f8fa`）；
   - `consultations.vue` / `emotional.vue` 的残留**只在注释里**（已逐行核对：声明中 0 处）。
   → 已分别立为 **Task 1**（含 MarkdownRenderer 令牌化）与 **Task 4**（ArticleDialog + RichTextEditor 的 `<style>`）。

2. **一次误判，已改正。** 我一度判定「跳转主内容链接的 `:focus` 过渡卡在起始值」是 Chrome 不插值百分比位移导致的焦点可见性缺陷，并据此改了实现。进一步实测后**推翻**：把 `transition` 关掉后 `:focus` 规则立刻归位，说明规则本身是生效的；真正原因是**本验证环境的渲染被节流**——`requestAnimationFrame` 约 1 秒才触发一次，一段本该 220ms 完成的探针过渡在 700ms 后仍停在起始值。我把代码里那段误导性注释改成了如实说明。

**由此推论出的验证边界（后续任务必须知道）：**

- 本环境**无法验证任何动画的运动过程**，只能验证「关键帧已定义且被引用」。真实浏览器下的观感需人工确认。
- 同理，**任何依赖过渡完成才能观察到的状态**都不能用「等 N 毫秒后读数」来判定（我后来改用「临时禁用过渡再读目标状态」的方式，见 1.5-C 的折叠 / resize 断言）。
- **未做**：屏幕阅读器实测、真机触控实测、性能剖析（Lighthouse / trace）。
- **`[需后端]` 未做**：所有依赖真实数据的分支（会话列表真实数据、情绪分析真实结果、知识库真实文章、后台真实统计）只验证了「加载 / 空态 / 错误态」，**没有**用真实数据跑通。

## 1.7 本次刻意未做

- 未提交任何 commit（改动全部停在工作区）。
- 未改 `consultation.vue` 的 SSE 契约（`Token` 头、`done` 事件、`session_${id}` 前缀原样保留）。
- 未改路由表结构、API 签名、后端字段名。
- 未新增运行时依赖（`sass` / `element-plus` 等均为既有）。
- 未删除任何文件。

## 1.8 已撤销项

**首页「整体占满 100vh + 去掉重复入口」方案已按你的要求撤销**，涉及 `src/views/home.vue` 与 `src/components/FrontendLayout.vue` 两个文件，做法是精确反向应用该次编辑（因改动未提交，`git` 无法单独回退这一次）。

撤销后现状（已实测）：`hero + 功能卡片 + 收尾行动区` 三段结构恢复；页脚恢复三行布局（含品牌标识，高 246px）；`scrollHeight 1654 > 视口 900`，页面重新按内容自然增长；CTA 接线仍在。

该方案**不作为后续任务**。若将来需要「单屏首页」，另立任务并请先确认：导航与页脚是否也计入那 100vh、以及矮屏是否允许回退为滚动。

---

# 第二部分 · 后续实施计划

按优先级排序。Task 1 是唯一带单元测试的任务，也是最该先做的——它同时修掉一个影响每个 AI 回复的渲染缺陷，并为本仓库建立第一套回归防护。

| 任务 | 优先级 | 一句话 | 影响面 | 依赖 |
|---|---|---|---|---|
| Task 1 重写 Markdown 渲染器 + vitest | **P0** | AI 建议里的有序列表丢编号、链接可注入 | 每一次 AI 回复 | 无 |
| Task 2 favicon 统一 | P1 | 标签页还是机器人，站内已是幼苗 | 品牌一致性 | 无 |
| Task 3 修正 README 的 CI 描述 | P1 | 文档声称存在的工作流实际不存在 | 文档可信度 | 无 |
| Task 4 剩余组件令牌化 | P1 | 富文本编辑器选中态还是蓝色 | 后台每次编辑文章 | 无 |
| Task 5 产物分包 | P1 | 单块 794KB–1097KB | 后台首屏加载 | 无 |
| Task 6 清理孤儿资源 | P2 | 8 个文件 84.4KB | 仓库卫生 | 无 |
| Task 7 后台移动端抽屉导航 | P2 | 窄屏无 hover，折叠轨道提示弹不出来 | 后台窄屏可用性 | 无 |
| Task 8 接口层与遗留小修 | P2 | 分页多传 total、死 prop | 请求正确性 | 部分 `[需后端]` |
| Task 9 富文本服务端净化 | P3 | 前端正则过滤不是安全边界 | 安全 | **需后端** |
| Task 10 暗色模式 | P3（可选） | 令牌已就绪但只有亮色值 | 未定 | 建议先不做 |

---

### Task 1: 重写 Markdown 渲染器（并引入 vitest）

**为什么是 P0：** 现有渲染器把「AI 建议」这类最常见输出渲染错，且存在链接协议注入面。AI 回复中的**有序列表会丢失编号**，多个列表会被合并成一个。

**证据（已逐行核对 `src/components/MarkdownRenderer.vue`）：**

```js
// L50-51：无 g 标志 + 贪婪 .* + s 标志 → 只包一次，且从第一个 <li> 一直包到最后一个 </li>
html = html.replace(/^- (.*)$/gm, '<li>$1</li>')
html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
// L54：有序列表只生成 <li>，从不包 <ol> → 编号丢失
html = html.replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
// L~44：链接无协议校验 → [点我](javascript:alert(1)) 会生成可点击的 javascript: 链接
html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
// L~63：\n → <br> 在所有块级元素之后执行 → 标题/列表周围出现多余 <br>
html = html.replace(/\n/g, '<br>')
```

**Files:**
- Create: `vitest.config.ts`
- Create: `src/components/__tests__/MarkdownRenderer.spec.ts`
- Modify: `src/components/MarkdownRenderer.vue`（`<script setup>` 全量替换 + 样式令牌化）
- Modify: `package.json`（新增 `test` / `test:run` 脚本）

**Interfaces:**
- Consumes: `src/styles/_tokens.scss` 的 `--xy-*` 令牌（Task 0 已完成）
- Produces: 组件对外接口不变——`props: { content: string; isAiMessage?: boolean }`，仅内部渲染实现替换。调用方 `consultation.vue` 无需改动。

- [ ] **Step 1: 安装测试依赖并加上脚本**

```bash
npm i -D vitest jsdom @vue/test-utils
```

在 `package.json` 的 `scripts` 中新增（保留既有 4 个脚本不动）：

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 2: 新建 vitest 配置**

创建 `vitest.config.ts`：

```ts
import { defineConfig } from "vitest/config"
import vue from "@vitejs/plugin-vue"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.ts"],
  },
})
```

> `vite.config.ts` 保持不动。vitest 有独立配置，避免把测试相关字段混进生产构建配置。

- [ ] **Step 3: 写失败测试**

创建 `src/components/__tests__/MarkdownRenderer.spec.ts`：

```ts
import { describe, expect, it } from "vitest"
import { mount } from "@vue/test-utils"
import MarkdownRenderer from "../MarkdownRenderer.vue"

const render = (content: string) =>
  mount(MarkdownRenderer, { props: { content, isAiMessage: true } }).html()

describe("MarkdownRenderer", () => {
  it("连续的无序列表渲染成一个 <ul>，而不是每条各自成列表", () => {
    const html = render("- 第一项\n- 第二项\n- 第三项")
    expect(html.match(/<ul>/g)).toHaveLength(1)
    expect(html.match(/<li>/g)).toHaveLength(3)
  })

  it("有序列表渲染为 <ol>，不出现 <ul>", () => {
    const html = render("1. 第一\n2. 第二")
    expect(html).toContain("<ol>")
    expect(html).not.toContain("<ul>")
    expect(html.match(/<li>/g)).toHaveLength(2)
  })

  it("无序与有序列表相邻时分别成块", () => {
    const html = render("- 甲\n- 乙\n\n1. 一\n2. 二")
    expect(html).toContain("<ul>")
    expect(html).toContain("<ol>")
  })

  it("拒绝 javascript: 协议链接，退化为纯文本", () => {
    const html = render("[点我](javascript:alert(1))")
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("<a ")
    expect(html).toContain("点我")
  })

  it("允许 https 链接且带 noopener", () => {
    const html = render("[官网](https://example.com)")
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it("块级元素之间不插入多余的 <br>", () => {
    expect(render("## 标题\n\n正文")).not.toMatch(/<\/h2><br>/)
    expect(render("- 甲\n- 乙")).not.toMatch(/<\/li><br>/)
  })

  it("转义 HTML，防止注入", () => {
    expect(render("<img src=x onerror=alert(1)>")).not.toContain("<img")
  })

  it("保留加粗、斜体与行内代码", () => {
    const html = render("**重点** 与 *强调* 与 `code`")
    expect(html).toContain("<strong>重点</strong>")
    expect(html).toContain("<em>强调</em>")
    expect(html).toContain('<code class="inline-code">code</code>')
  })

  it("未闭合的代码围栏也能安全闭合，不吞掉后续内容", () => {
    const html = render("```js\nconst a = 1")
    expect(html).toContain('<pre class="code-block">')
    expect(html).toContain("const a = 1")
  })
})
```

- [ ] **Step 4: 运行测试，确认失败**

```bash
npm run test:run
```

预期：FAIL。至少这 4 条会红——`连续的无序列表…`（现在是 3 个独立 `<ul>` 或结构错误）、`有序列表渲染为 <ol>`（现在完全没有 `<ol>`）、`拒绝 javascript: 协议链接`（现在会生成 `<a href="javascript:...">`）、`块级元素之间不插入多余的 <br>`。

- [ ] **Step 5: 替换 `<script setup>` 实现**

把 `src/components/MarkdownRenderer.vue` 的整个 `<script setup lang="ts">` 块替换为：

```vue
<script setup lang="ts">
/**
 * 轻量 Markdown 渲染器（无第三方依赖）
 *
 * 改造要点（原实现的问题见文件顶注释之外的本块说明）：
 *  - 原实现用逐条正则替换，导致：(a) 列表被贪婪正则包成一大坨且只包一次；
 *    (b) 有序列表只生成 <li> 从不包 <ol>，编号丢失；(c) 链接不校验协议，
 *    `javascript:` 可直接注入；(d) \n→<br> 在块级元素之后执行，留下多余换行。
 *  - 现改为「按行扫描的块级状态机 + 行内内联格式化」，块级与行内分层处理。
 */
import { computed } from "vue"

const props = withDefaults(
  defineProps<{
    content: string
    isAiMessage?: boolean
  }>(),
  {
    isAiMessage: false,
  },
)

const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

const escapeHtml = (src: string) => src.replace(/[&<>"']/g, (c) => ESCAPE[c])

/** 只放行这些协议；其余（javascript: / data: / vbscript:）降级为纯文本 */
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/|#)/i

/**
 * 行内格式化。用占位符暂存已生成的 HTML，避免后续的加粗/斜体正则
 * 回头破坏 <a> 或 <code> 内部的内容。
 */
const renderInline = (src: string) => {
  const stash: string[] = []
  const keep = (html: string) => `\u0000${stash.push(html) - 1}\u0000`

  let out = escapeHtml(src)
  out = out.replace(/`([^`]+)`/g, (_m, code: string) =>
    keep(`<code class="inline-code">${code}</code>`),
  )
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (match, text: string, href: string) =>
      SAFE_HREF.test(href)
        ? keep(
            `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`,
          )
        : text,
  )
  out = out.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
  out = out.replace(/\*([^*\n]+)\*/g, "<em>$1</em>")

  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => stash[Number(i)])
}

const renderedContent = computed(() => {
  const lines = props.content.replace(/\r\n?/g, "\n").split("\n")
  const html: string[] = []

  let listTag: "ul" | "ol" | null = null
  let paragraph: string[] = []
  let quote: string[] = []
  let fence: string[] | null = null
  let fenceLang = "text"

  const flushParagraph = () => {
    if (!paragraph.length) return
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`)
    paragraph = []
  }
  const flushQuote = () => {
    if (!quote.length) return
    html.push(`<blockquote>${renderInline(quote.join(" "))}</blockquote>`)
    quote = []
  }
  const closeList = () => {
    if (!listTag) return
    html.push(`</${listTag}>`)
    listTag = null
  }
  const openList = (tag: "ul" | "ol") => {
    if (listTag === tag) return
    closeList()
    html.push(`<${tag}>`)
    listTag = tag
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    // 代码围栏：开 / 关
    const fenceMatch = /^```(\w*)\s*$/.exec(line)
    if (fenceMatch) {
      if (fence === null) {
        flushParagraph()
        flushQuote()
        closeList()
        fence = []
        fenceLang = fenceMatch[1] || "text"
      } else {
        html.push(
          `<pre class="code-block"><code class="language-${fenceLang}">${escapeHtml(fence.join("\n"))}</code></pre>`,
        )
        fence = null
        fenceLang = "text"
      }
      continue
    }
    if (fence !== null) {
      fence.push(raw)
      continue
    }

    // 空行：结束当前所有块
    if (!line.trim()) {
      flushParagraph()
      flushQuote()
      closeList()
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushQuote()
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      continue
    }

    if (/^([-*_])\1{2,}\s*$/.test(line.trim())) {
      flushParagraph()
      flushQuote()
      closeList()
      html.push("<hr>")
      continue
    }

    const quoteLine = /^>\s?(.*)$/.exec(line)
    if (quoteLine) {
      flushParagraph()
      closeList()
      quote.push(quoteLine[1])
      continue
    }
    flushQuote()

    const bullet = /^[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      flushParagraph()
      openList("ul")
      html.push(`<li>${renderInline(bullet[1])}</li>`)
      continue
    }

    const ordered = /^\d+[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      flushParagraph()
      openList("ol")
      html.push(`<li>${renderInline(ordered[1])}</li>`)
      continue
    }

    closeList()
    paragraph.push(line.trim())
  }

  // 收尾：未闭合的代码围栏也要输出，避免内容丢失
  if (fence !== null) {
    html.push(
      `<pre class="code-block"><code class="language-${fenceLang}">${escapeHtml(fence.join("\n"))}</code></pre>`,
    )
  }
  flushParagraph()
  flushQuote()
  closeList()

  return html.join("")
})
</script>
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
npm run test:run
```

预期：PASS，9 个用例全绿。

- [ ] **Step 7: 把该组件样式令牌化（消除 22 处裸 hex）**

替换 `<style scoped>` 的全部颜色声明：`#374151` / `#4b5563` / `#6b7280` → `var(--xy-ink-700)` / `var(--xy-ink-600)` / `var(--xy-ink-500)`；`#e5e7eb` / `#d1d5db` → `var(--xy-border)` / `var(--xy-border-strong)`；`#f9fafb` / `#f3f4f6` → `var(--xy-surface-alt)`；`#1f2937`（代码块底）→ `var(--xy-ink-900)`。

把 `#3b82f6` / `#eff6ff` / `#1e40af` / `#dbeafe` / `#e11d48` 这组「蓝色 / 玫红」强调色全部换成品牌令牌：链接与强调 → `var(--xy-primary-600)`；引用块左边框 → `var(--xy-primary-400)`；引用块底 → `var(--xy-primary-50)`；行内代码文字 → `var(--xy-primary-700)`、底 → `var(--xy-surface-alt)`。

同时删掉 `.ai-markdown` 的整套蓝色覆盖分支（品牌统一后不再需要区分「AI 消息」配色）。`isAiMessage` prop 与模板上 `:class="{ 'ai-markdown': isAiMessage }"` 的绑定**都保留**——prop 是既有对外接口（`consultation.vue` 在传），类名留作将来针对 AI 消息做差异化时的挂载点；此时该类不再对应任何样式规则，是无害的。若倾向彻底清理，也可以把模板的 class 绑定一并删掉，但那属于可选的整洁化，不是本任务必需。

- [ ] **Step 8: 类型检查 + 构建 + 渲染回归**

```bash
npm run typecheck
npm run build
```

预期：均 exit 0。

再启动 `npm run dev`，打开 `/consultation`，在后端不可达的情况下确认欢迎语气泡仍正常渲染（无 `undefined`、无裸露的 `<li>`）：
在浏览器控制台执行
`[...document.querySelectorAll('.markdown-content')].length` 应 ≥ 0 且页面无报错。

- [ ] **Step 9: 提交**

```bash
git add vitest.config.ts package.json package-lock.json src/components/MarkdownRenderer.vue src/components/__tests__/MarkdownRenderer.spec.ts
git commit -m "fix(markdown): 重写渲染器修复列表/协议注入，并引入 vitest 回归防护"
```

---

### Task 2: favicon 与品牌标识统一

**问题：** `index.html` 的 favicon 仍指向 `/robot-fill.png`（机器人），而品牌标识已经是内联 SVG 幼苗（`BrandLogo.vue`）。浏览器标签页上是机器人，站内是幼苗——这是本轮改造**引入的**不一致。

**Files:**
- Create: `public/favicon.svg`
- Modify: `index.html:5`
- Delete: `public/robot-fill.png`（仅当 Step 4 确认无其他引用）

- [ ] **Step 1: 新建 favicon.svg**

创建 `public/favicon.svg`（路径数据与 `BrandLogo.vue` 内的幼苗图形一致；圆角按 32 视口换算为 `rx="7"`，与组件里 40px 图形用 `--xy-radius-md` 的圆角比例接近，小尺寸下观感一致）：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#2f7d6d"/>
  <path d="M16 27V12.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M16 21c-4.8 0-7.6-2.9-7.6-7.4C13.4 13.6 16 16.5 16 21Z" fill="#fff" opacity="0.92"/>
  <path d="M16 17.6c0-5 2.8-7.8 7.6-7.8 0 5-2.8 7.8-7.6 7.8Z" fill="#fff"/>
</svg>
```

- [ ] **Step 2: 改 index.html**

把

```html
<link rel="icon" type="image/png" href="/robot-fill.png" />
```

替换为

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/favicon.svg" />
```

- [ ] **Step 3: 验证**

```bash
npm run build
npm run dev
```

浏览器打开首页 → 标签页图标应为青绿圆角方块 + 白色幼苗；Network 面板确认 `/favicon.svg` 返回 200 且 `content-type` 为 `image/svg+xml`。地址栏图标可能被浏览器缓存，需硬刷新。

- [ ] **Step 4: 确认 `public/robot-fill.png` 是否还有人用**

```bash
git grep -n "robot-fill" -- src index.html
```

预期：只剩 `src/assets/images/robot-fill.png` 的引用（那是**另一个**文件，在 `assets` 下，被助手头像使用）。
若 `public/robot-fill.png` 已无引用 → `git rm public/robot-fill.png`；若有引用则保留并在本任务确认。

- [ ] **Step 5: 提交**

```bash
git add public/favicon.svg index.html
git commit -m "chore(brand): favicon 改用与品牌标识一致的幼苗图形"
```

---

### Task 3: 修正 README 中不存在的 CI 描述

**问题：** `README.md` 有一整节 `## CI`，声称 `.github/workflows/ci.yml` 会在 `main` / `feat/**` 的 push 与对 `main` 的 PR 上跑 `npm ci → typecheck → build` 并上传 `dist`。**实测 `.github/` 目录不存在**——这是仓库文档里的一个事实性错误。二选一：补上工作流，或删掉该节。推荐补上（本仓库的 `build` 已含 `vue-tsc` 门禁，值得自动化）。

**Files:**
- Create: `.github/workflows/ci.yml`（方案 A）
- 或 Modify: `README.md`（方案 B，删掉第 `## CI` 节与「相关文档」表中相关内容）

- [ ] **Step 1: 确认现状**

```bash
ls -a .github 2>/dev/null || echo "NO .github"
grep -n "CI" README.md
```

- [ ] **Step 2（方案 A）: 新建 `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, "feat/**"]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      # Task 1 完成后取消下面这行的注释
      # - run: npm run test:run

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
          retention-days: 7
```

> Node 版本取 `24`，与 README「环境：Node.js **24+**」一致。
> `test:run` 一行刻意先注释掉：Task 1 未完成时该脚本不存在，`npm run test:run` 会失败。

- [ ] **Step 3（方案 B）: 若选择删除描述**

删掉 `README.md` 中整个 `## CI` 小节（从 `## CI` 到下一个 `---`），并检查「相关文档」表格里是否引用了 CI。

- [ ] **Step 4: 验证与本任务无关的改动未被波及**

```bash
npm run typecheck && npm run build
git diff --stat
```

预期：`README.md` 与新增 `.github/workflows/ci.yml`（或仅 `README.md`）。

- [ ] **Step 5: 提交**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "ci: 补上 README 声称存在但实际缺失的 CI 工作流"
```

---

### Task 4: 剩余组件的样式令牌化（`ArticleDialog.vue` + `RichTextEditor.vue` 的 `<style>`）

**问题：** 两个后台富文本相关组件仍有裸 hex 在**真实样式声明**里，且都带**蓝色**配色，与品牌青绿冲突。

**已逐行核对的分部（重要，不要一刀切）：**

| 文件 | `<style>` 内 | `<script>` 内 | 处理 |
|---|---|---|---|
| `src/components/ArticleDialog.vue` | 2（`#8b949e` / `#f6f8fa`） | 0 | 全部换令牌 |
| `src/components/RichTextEditor.vue` | **33**（`#e5e7eb` / `#f9fafb` / `#eaf2ff` / `#2563eb !important` / `#bfdbfe` …） | **18**（`#4A90E2`、`#7ED321`、`#FF6B6B` … 调色板） | **只换 `<style>` 的 33 处；`<script>` 里的调色板字面值必须原样保留** |

> `<script>` 里那 18 处是编辑器给用户提供的**颜色选择数据**——调色板必须给真实颜色值，不能也不该换成 `var(--xy-*)`（用户选的是「红色」，不是「品牌强调色」）。在这里套令牌反而是错的。

**Files:**
- Modify: `src/components/ArticleDialog.vue`
- Modify: `src/components/RichTextEditor.vue`（仅 `<style>` 块，从第 267 行开始）

- [ ] **Step 1: 分别定位两类 hex，确认边界**

```bash
# 只看 <style> 部分（RichTextEditor 的 style 从第 267 行起）
sed -n '267,$p' src/components/RichTextEditor.vue | grep -nE "#[0-9a-fA-F]{3,8}\b"
git grep -n -E "#8b949e|#f6f8fa" -- src/components/ArticleDialog.vue
```

预期：`RichTextEditor` 命中约 33 处、`ArticleDialog` 命中 2 处。若 `RichTextEditor` 命中数远大于 33，说明命令把 `<script>` 也算进去了，收窄范围再数。

- [ ] **Step 2: `ArticleDialog.vue` 换令牌**

- `#8b949e`（次要 / 提示文字）→ `var(--xy-ink-500)`
- `#f6f8fa`（浅底）→ `var(--xy-surface-alt)`

- [ ] **Step 3: `RichTextEditor.vue` 的 `<style>` 换令牌**

按语义映射（先 `git grep` 确认每一处出现的上下文，不要机械替换）：

| 原值 | 令牌 | 语义 |
|---|---|---|
| `#e5e7eb` | `var(--xy-border)` | 边框、分隔线 |
| `#f9fafb` | `var(--xy-surface-alt)` | 浅底 |
| `#eaf2ff` | `var(--xy-primary-50)` | **活动 / 选中项底色**（原为淡蓝） |
| `#2563eb` （带 `!important`） | `var(--xy-primary-600)` | **活动 / 选中项文字**（原为蓝） |
| `#bfdbfe` | `var(--xy-primary-200)` | 选中态描边 |
| 其余灰阶 | `var(--xy-ink-700)` / `var(--xy-ink-500)` | 正文 / 次要文字 |

`:deep()` 覆盖 wangEditor 内部选择器时保留 `!important`（原代码就是用它压住第三方样式，去掉会失效）；只把颜色值换成令牌。

- [ ] **Step 4: 验证**

```bash
npm run typecheck && npm run build
```

```bash
# <style> 内应为 0；<script> 内的调色板字面值应仍是 18 处（保留是正确的）
awk 'NR>=267' src/components/RichTextEditor.vue | grep -cE "#[0-9a-fA-F]{3,8}\b"
awk 'NR<267'  src/components/RichTextEditor.vue | grep -cE "#[0-9a-fA-F]{3,8}\b"
git grep -cE "(^|[^\w])#[0-9a-fA-F]{3,8}\b" -- src/components/ArticleDialog.vue || echo "ArticleDialog: 0"
```

预期：第一条 **0**，第二条 **18**（调色板保留），第三条无输出。

`[需后端]` 浏览器回归：`/back/knowledge` → 点「新增」→ 打开富文本编辑器，确认工具栏、选中态、下拉面板外观正常，**没有残留蓝色**。

- [ ] **Step 5: 提交**

```bash
git add src/components/ArticleDialog.vue src/components/RichTextEditor.vue
git commit -m "style(admin): 富文本相关组件样式改用设计令牌（保留调色板字面值）"
```

---

### Task 5: 产物分包，消除 794KB–1097KB 的单块

**问题：** 构建产物有三个超大 chunk：`dashboard` 1097KB、`_plugin-vue_export-helper` 1070KB、`knowledge` 794KB。原因是重型库被静态引入：（1）`dashboard.vue` 里 `import * as echarts from "echarts"`；（2）wangEditor 通过 `ArticleDialog.vue` → `RichTextEditor.vue` 被 `knowledge.vue` 静态拉入。

**首选做法是动态 `import()`**——它与构建器版本无关，且直接命中的是「首屏不需要这些库」这一真实原因。次选是配置 `rolldownOptions.output.manualChunks`。

**Files:**
- Modify: `src/views/dashboard.vue`
- Modify: `src/components/RichTextEditor.vue`（或 `ArticleDialog.vue`，取决于 wangEditor 的引入位置）

**Interfaces:**
- Produces: `dashboard.vue` 中 `echarts` 的引用方式由命名空间静态导入改为**按需动态导入**，因此所有用到 `echarts.` 的位置必须改为使用本地 `echarts` 变量（见 Step 3）。

- [ ] **Step 1: 量出基线**

```bash
npm run build
```

记录 `dist/assets/*.js` 中最大的 3 个文件名与体积，写进提交信息备查。

- [ ] **Step 2: 确认引入点**

```bash
git grep -n "from \"echarts\"\|from 'echarts'\|@wangeditor" -- src
```

- [ ] **Step 3: 把 echarts 改为动态导入**

`src/views/dashboard.vue` 当前是模块顶层静态导入。改为：

```ts
// 顶部不再静态导入 echarts
type EChartsModule = typeof import("echarts")

/** 模块级缓存：echarts 只在首次用到时下载一次 */
let echartsModule: EChartsModule | null = null

const loadECharts = async (): Promise<EChartsModule> => {
  if (!echartsModule) echartsModule = await import("echarts")
  return echartsModule
}
```

然后把 `initCharts()` 及其三个子函数改为 `async`，在函数内先取到本地别名再用（**局部变量名就叫 `echarts`，与原来 import 的名字一致，这样函数体其余代码无需改动**；模块级持有者特意命名为 `echartsModule`，避免与局部名混淆）：

```ts
const initEmotionChart = async () => {
  if (!emotionChartRef.value) return
  const echarts = await loadECharts()
  // —— 以下为原函数体，无需改动 ——
}
```

图表实例的**类型**引用（原来是 `echarts.EChartsType`）改为：

```ts
type EChartsInstance = ReturnType<EChartsModule["init"]>
let emotionChart: EChartsInstance | null = null
let consultationChart: EChartsInstance | null = null
let userActiveChart: EChartsInstance | null = null
```

`onMounted` 中的调用改为：

```ts
onMounted(async () => {
  try {
    const res = await getAnalyticsOverview()
    aiData.value = res as AnalyticsOverview
  } catch {
    // 统计接口失败时保留空态，不要卡住 loading
  } finally {
    loading.value = false
  }
  await initCharts()
})
```

> 注意：动态导入后 `initCharts` 变异步，`ResizeObserver` 的回调里若调用 `chart.resize()` 不受影响（实例已存在）；但**在图表尚未创建前触发 resize 必须能安全跳过**——现有三个 init 函数都已有 `if (!ref.value) return` 保护，改造时务必保留。

- [ ] **Step 4: 富文本编辑器同样改为动态导入**

`RichTextEditor.vue` 中若在顶层静态引入 `@wangeditor/editor` 与 `@wangeditor/editor-for-vue`，改为在 `onMounted` 内 `await import(...)`，或用 `defineAsyncComponent` 包裹编辑器组件本身，使 `/back/knowledge` 首次加载时不下载编辑器。

- [ ] **Step 5: 验证分包生效**

```bash
npm run build
```

预期：
- 不再出现「Some chunks are larger than 500 kB」警告，或至少 `dashboard` / `knowledge` 两个入口块显著变小；
- 产物中新增独立的 `echarts` / `wangeditor` 块（或它们被并入按需块），且不再位于首屏入口链路上。

- [ ] **Step 6: 功能回归（`[需后端]`）**

```bash
npm run dev
```

- `/back/dashboard`：三张图表正常渲染、侧栏折叠后随之 resize（关掉过渡再量，参见 1.6 的环境说明）；Network 面板确认 `echarts` 块是**异步**加载的。
- `/back/knowledge` → 点「新增」：富文本编辑器正常挂载、可输入、封面上传与提交按钮可用。
- 这两个页面在图表 / 编辑器加载期间**不应**出现白屏或未捕获异常。

- [ ] **Step 7: 提交**

```bash
git add src/views/dashboard.vue src/components/RichTextEditor.vue
git commit -m "perf(build): echarts 与富文本编辑器改为动态导入，拆分超大 chunk"
```

---

### Task 6: 清理 8 个孤儿资源（84.4 KB）

**已精确核对**（判定方式：源码中出现完整文件名，或 `utils/emotion.ts` 的 `emotionImage("<名>")` 动态引用）：

| 文件 | 体积 | 失去引用的原因 |
|---|---|---|
| `src/assets/images/comments.png` | 4.5 KB | 后台「咨询会话」统计图标 → 改为 EP 图标 |
| `src/assets/images/like.png` | 4.5 KB | 后台「情绪日志」图标 → 改为 EP 图标 |
| `src/assets/images/smile.png` | 7.8 KB | 后台「平均情绪」图标 → 改为 EP 图标 |
| `src/assets/images/users.png` | 9 KB | 后台「总用户数」图标 → 改为 EP 图标 |
| `src/assets/images/机器人.png` | 5.7 KB | 导航 / 侧栏品牌标识 → 改为 `BrandLogo` 内联 SVG |
| `src/assets/images/hero.png` | 43.9 KB | **改造前就无人引用** |
| `src/assets/vite.svg` | 8.5 KB | 脚手架遗留，从未引用 |
| `src/assets/vue.svg` | 0.5 KB | 脚手架遗留，从未引用 |

> 这些文件**不在运行时被打包**（Vite 只打包被 import 的资源），所以它们只占仓库体积，不影响产物体积。这是纯粹的仓库卫生问题，优先级不高，但删掉零风险。

**Files:**
- Delete: 上表 8 个文件

- [ ] **Step 1: 删除前再确认一次（防止误判）**

```bash
for n in comments like smile users 机器人 hero; do
  echo "--- $n.png"
  git grep -n "$n\.png" -- src index.html || echo "  无引用"
done
git grep -n "vite\.svg\|vue\.svg" -- src index.html || echo "  svg 无引用"
```

预期：逐条「无引用」。**若任何一条出现引用，跳过该文件并在提交信息里说明。**

- [ ] **Step 2: 不要误删这几个文件**

以下文件**有**引用，删除会破坏页面：
- `开心.png`（情绪日记头部图标 + 情绪选项）、`平静.png`、`焦虑.png`、`悲伤.png`、`兴奋.png`、`疲惫.png`、`惊讶.png`、`困惑.png` —— 后 7 个由 `src/utils/emotion.ts` 的 `emotionImage()` 动态引用，`git grep "平静.png"` **查不到**，因为代码里写的是 `emotionImage("平静")`。
- `robot-fill.png`、`user.jpg`、`book.png`。

- [ ] **Step 3: 删除并验证**

```bash
git rm src/assets/images/comments.png src/assets/images/like.png src/assets/images/smile.png \
       src/assets/images/users.png "src/assets/images/机器人.png" src/assets/images/hero.png \
       src/assets/vite.svg src/assets/vue.svg
npm run typecheck && npm run build
```

预期：构建 exit 0。若构建报「模块找不到」，说明某个文件确有引用，`git checkout` 恢复该文件后重跑。

- [ ] **Step 4: 页面回归**

`npm run dev`，逐个打开 `/`、`/emotion-diary`、`/back/dashboard`，确认情绪图片与助手头像正常显示（`/emotion-diary` 的八个情绪图标是最容易受影响的）。

- [ ] **Step 5: 提交**

```bash
git commit -m "chore: 删除 8 个无引用资源（含品牌替换后的旧图标与脚手架遗留）"
```

---

### Task 7: 后台移动端导航改为抽屉

**问题：** Task 之前的修复让侧栏在 ≤900px 自动折叠到 68px 轨道（否则 375px 视口下主内容只剩 51px）。但折叠轨道在触屏上没有 hover，`el-menu` 的折叠提示气泡**弹不出来**，用户只能看到图标。轨道内元素宽 38–43px，也低于 44px 触控目标。后台是需要实际操作的界面，这个体验不合格。

**目标：** ≤640px 时隐藏轨道，改为由顶栏按钮唤出的抽屉承载同一套菜单，目标 44px。

**Files:**
- Modify: `src/components/BackenLayout.vue`（挂载抽屉）
- Modify: `src/components/Navbar.vue`（新增触发按钮）
- Modify: `src/components/Sidebar.vue`（把菜单抽成可复用内容，或新增 `src/components/AdminNavMenu.vue`）

**Interfaces:**
- Consumes: `useAdminStore()` 的 `isCollapse` / `setCollapse` / `toggleCollapse`；`router.options.routes` 中 `/back` 的子路由（`path` + `meta.title` + `meta.icon`）
- Produces:
  - 新组件 `src/components/AdminNavMenu.vue`，`props: { collapse?: boolean }`（默认 `false`），`emits: { navigate: [] }`——菜单项被点击后发出，由容器决定是否关闭抽屉。
  - `Navbar.vue` 新增 `emits: { "open-nav": [] }`，由 `BackenLayout.vue` 监听并打开抽屉。

> 统一用 **emit** 传递「已导航」，不要用回调 prop——两个容器（轨道 / 抽屉）对同一事件的处理不同，emit 更贴合。

- [ ] **Step 1: 抽出菜单内容**

新建 `src/components/AdminNavMenu.vue`，把 `Sidebar.vue` 里 `el-menu` 及其菜单项的计算逻辑（与路由表同源、`index` 用完整路径 `/back/${item.path}`、`router` 模式、`default-active` 绑定 `route.path`）整体搬过来。`Sidebar.vue` 改为渲染 `<AdminNavMenu :collapse="isCollapse" />`。

这一步必须保证 `/back/*` 四个路由的高亮仍正确——这是之前刚修好的，不能退回去。

- [ ] **Step 2: Navbar 增加触发按钮**

在 `Navbar.vue` 的 `__left` 区，折叠按钮**之前**插入一个仅在 ≤640px 显示的按钮：

```html
<button
  class="navbar__nav-trigger"
  type="button"
  aria-label="打开后台导航"
  @click="emit('open-nav')"
>
  <el-icon><Menu /></el-icon>
</button>
```

样式：`display: none;`，在 `@media (max-width: 640px)` 内 `display: inline-flex`，`width: 44px; height: 44px; flex-shrink: 0;`（`flex-shrink: 0` 不能漏，否则会被压缩到 40px 以下）。

并用 `const emit = defineEmits<{ "open-nav": [] }>()` 声明。

同时：≤640px 时**隐藏**原折叠按钮（`navbar__collapse`），因为轨道已经不存在了。用 `@media (max-width: 640px) { .navbar__collapse { display: none } }`。

- [ ] **Step 3: BackenLayout 挂抽屉**

```html
<el-drawer v-model="navOpen" direction="ltr" size="72%" :with-header="false">
  <AdminNavMenu @navigate="navOpen = false" />
</el-drawer>
```

并在 `Navbar` 上监听 `<Navbar @open-nav="navOpen = true" />`。

`AdminNavMenu` 的菜单项点击后要 `emit("navigate")`，让抽屉自动关闭。

- [ ] **Step 4: 同步折叠状态的断点**

`BackenLayout.vue` 里的 `matchMedia` 当前是 `(max-width: 900px)`。改为：≤640px 用抽屉（此时轨道隐藏，`setCollapse(true)` 仍可保留以维持状态一致），641–900px 用折叠轨道。最简单可靠的做法是保留单一 `matchMedia("(max-width: 900px)")` 驱动 `setCollapse`，另加一条 `matchMedia("(max-width: 640px)")` 只用于控制抽屉入口的显示——两者互不干扰。

- [ ] **Step 5: 验证**

```bash
npm run typecheck && npm run build && npm run dev
```

用注入管理员会话的方式（在浏览器控制台执行
`localStorage.setItem('token','t'); localStorage.setItem('userInfo', JSON.stringify({username:'a',nickName:'A',userType:2}))`
后刷新）进入 `/back/*`，逐项断言：

| 视口 | 期望 |
|---|---|
| 375px | 轨道不显示；顶栏有 44×44 的抽屉按钮；点开抽屉 → 四个菜单项可见可点；点任一项 → 路由跳转且抽屉关闭；无横向滚动 |
| 641–900px | 轨道显示且为 68px 折叠态；无抽屉按钮 |
| ≥901px | 轨道 248px 展开态 |

并确认四个后台路由的菜单高亮仍逐一正确。

- [ ] **Step 6: 提交**

```bash
git add src/components/AdminNavMenu.vue src/components/Sidebar.vue src/components/Navbar.vue src/components/BackenLayout.vue
git commit -m "feat(admin): 后台窄屏改用抽屉导航，轨道内 <44px 触控目标问题一并解决"
```

---

### Task 8: 接口层与遗留小修

**问题（已核对）：**

1. `knowledge.vue` / `emotional.vue` 的 `handleSearch` 用 `{ ...pagination, ...(formData || {}) }` 展开，把 `total` 也发给了接口——分页参数不该带 `total`。`frontendKnowledge.vue` 同样把 `total` 带上了（其 `pagination` 含 `total`）。
2. `TableSearch.vue` 有 `loading` prop，但**两个调用方都没传**（它们各自用 `el-table v-loading`）→ 目前是无人使用的接口面。要么接上（让「查询」按钮进入 loading），要么删掉该 prop。
3. `emotional.vue` 与 `consultations.vue` 的搜索参数里 `moodScreRange` 拼写可疑（应为 `moodScoreRange`），但这是**接口约定**，改之前必须与后端确认。
4. 睡眠质量字段在列表接口叫 `sleep`、详情接口叫 `sleepQuality`，`emotional.vue` 目前用 `row.sleepQuality ?? row.sleep` 兼容。**需后端统一**，前端兼容只是临时手段。

**Files:**
- Modify: `src/views/knowledge.vue`、`src/views/emotional.vue`、`src/views/frontendKnowledge.vue`
- Modify: `src/components/TableSearch.vue`（若选择接线）
- Modify: `src/views/emotional.vue`（`[需后端]` 字段统一后清理兼容代码）

- [ ] **Step 1: 分页不传 total**

把三处请求参数构造改为显式只传分页需要的字段。例如 `knowledge.vue`：

```ts
const params = {
  currentPage: pagination.currentPage,
  size: pagination.size,
  ...(formData || {}),
}
```

`frontendKnowledge.vue` 同理（其 `getPageList` 中的 `...pagination` 要拆开写）。

- [ ] **Step 2: 验证请求体**

`npm run dev`（`[需后端]`），打开 `/knowledge` 与 `/back/knowledge`，在 Network 面板看请求 Query String：**不应**出现 `total` 参数。

后端不可达时至少断言参数构造正确：可在控制台临时打印，或直接代码 review。

- [ ] **Step 3: 处理 `TableSearch` 的 `loading` prop**

推荐接线（查询期间给用户反馈，符合「操作 >300ms 必须有反馈」）。两个调用方**已经有** `loading` ref（`el-table` 的 `v-loading` 正在用它），所以只需把它一并传给 `TableSearch`：

```html
<TableSearch :formItem="formItem" :loading="loading" @search="handleSearch" />
```

并确认 `handleSearch` 的 `try/finally` 里已经在置位 / 复位 `loading`（Task 之前的改造已加上，核对即可，不要重复加）。若判定不需要，则从 `TableSearch.vue` 删掉 `loading` prop 与相关 `:loading` / `:disabled` 绑定，避免留一个死接口。

- [ ] **Step 4: `moodScreRange` 与 `sleep`/`sleepQuality` 的处理**

**先与后端确认**（Apifox：https://xsl1e23zpk.apifox.cn/）：

- 若后端字段确为 `moodScoreRange` → 前端改字段名（1 行），并在 `src/api/admin.ts` 的类型里固化。
- 若后端字段确为 `sleepQuality`（列表也返回）→ 去掉 `emotional.vue` 的 `?? row.sleep` 兼容分支。
- 若无法确认 → **保持现状**，并在 `emotional.vue` 该兼容函数上方补一句注释说明「待后端统一后删除」。不要凭猜测改接口参数。

- [ ] **Step 5: 验证**

```bash
npm run typecheck && npm run build
```

`[需后端]` 回归：后台四页的筛选、分页、详情弹窗各点一遍。

- [ ] **Step 6: 提交**

```bash
git add src/views/knowledge.vue src/views/emotional.vue src/views/frontendKnowledge.vue src/components/TableSearch.vue
git commit -m "fix(api): 分页不再上报 total；TableSearch loading 接线"
```

---

### Task 9: 文章正文的服务端净化（跨端，需后端配合）

**问题：** `articleDetail.vue` 目前用一段前端正则过滤（剔除 `script`/`style`/`iframe`、`on*` 属性、`javascript:`/`data:` 协议）后才 `v-html`。这是**兜底**，不是安全边界：正则过滤可被绕过，而且任何直接调用同一接口的客户端都没有这层保护。富文本正文由 wangEditor 生产、经后端存储与返回，正确的位置是**写入时在后端做白名单净化**。

**Files（前端侧）:**
- Modify: `src/views/articleDetail.vue`（在当前过滤函数上方补注释，标明这是兜底而非安全边界）
- 后端：另立需求，不在本仓库范围内

- [ ] **Step 1: 与后端确认净化策略**

需要确认并落地：
- 入库前是否对富文本做白名单净化（允许的标签与属性列表）；
- 是否允许 `<a href>` 的 `javascript:` / `data:` 协议；
- 图片 `src` 是否限制域名（当前封面走 `fileBaseUrl`）。

- [ ] **Step 2: 前端补注释，避免误以为是安全边界**

在 `articleDetail.vue` 的 `sanitizeHtml` 上方写清：

```ts
/**
 * 防御性过滤：只拦掉最常见的高危载体（script/style/iframe、on* 事件属性、
 * javascript:/data: 协议）。**这不是安全边界**——正则过滤存在绕过可能，
 * 富文本的正确净化位置是后端写入时的白名单校验（见任务计划 Task 9）。
 * 保留此函数是为了在服务端修复前缩小暴露面。
 */
```

- [ ] **Step 3: 验证**

后端修复上线后，用一条包含 `<script>`、`<img onerror=...>`、`[x](javascript:...)` 的文章做端到端确认：存进库里的应该是已净化的内容，前端的过滤函数应当**不再需要兜底任何东西**（可在函数内临时 `console.warn` 观察是否还有命中）。

- [ ] **Step 4: 提交**

```bash
git add src/views/articleDetail.vue
git commit -m "docs(security): 标明前端富文本过滤仅为兜底，净化归属后端"
```

---

### Task 10（可选）: 暗色模式

**现状：** 令牌层结构已经适合扩展（语义层 `--xy-surface*` / `--xy-ink-*` / `--xy-border*` 已与原始色阶分离），但**只提供了亮色值**，没有任何 `prefers-color-scheme` 或主题切换机制。`_element.scss` 也只在亮色前提下覆盖。

**这是可选任务**——完成后需重新验算全部对比度，工作量大且与当前产品定位无关。**建议先不做**，除非有明确需求。

- [ ] **Step 1:** 在 `_tokens.scss` 末尾新增 `@media (prefers-color-scheme: dark)` 块，只覆盖语义层变量（`--xy-bg` / `--xy-surface` / `--xy-surface-alt` / `--xy-ink-900..500` / `--xy-border*` / 各语义色的 `-bg`），**不要**重定义色阶与 `--el-*` 映射（后者会自动跟随）。
- [ ] **Step 2:** 逐个验算暗色下的文字对比度，把比值写进注释（与亮色部分同一标准）。
- [ ] **Step 3:** 检查 8 种情绪色与 4 级风险色在暗色底上的对比度——当前取值是按**白底**验算的，暗色下很可能不达标，需要各给一组暗色值。
- [ ] **Step 4:** 浏览器验证 `emulate` 暗色偏好，逐页看是否存在「亮色底 + 暗色文字」的漏网元素。

---

## 附录 · 验收清单

**已完成部分（回归用）**

- [ ] `npm run typecheck` exit 0
- [ ] `npm run build` exit 0
- [ ] 11 个路由 × 375 / 768 / 1440 无横向滚动
- [ ] 界面上无裸 ISO 时间串、无 `Invalid Date` / `NaN` / `undefined`
- [ ] 全仓库无「宁渡 / 小暖 / 心理健康AI助手 / 心理AI助手」（说明注释除外）
- [ ] 渲染出的界面里无 emoji 当图标
- [ ] 375 / 768 下无 < 44px 的触控目标（行内文本链接按 WCAG 2.5.8 豁免）
- [ ] 后台四路由的侧栏菜单高亮逐一正确
- [ ] 侧栏折叠 248→68→248，且图表画布随之 resize
- [ ] 键盘 `Tab` 可达所有交互元素，焦点环可见

**Task 1–8 完成后追加**

- [ ] `npm run test:run` 全绿（Task 1 建立）
- [ ] `MarkdownRenderer`：连续无序列表 → 单个 `<ul>`；有序列表 → `<ol>`；`javascript:` 链接降级为纯文本
- [ ] `src/components/MarkdownRenderer.vue`、`src/components/ArticleDialog.vue` 中裸 hex 为 **0**；`src/components/RichTextEditor.vue` 的 `<style>` 内为 **0**、`<script>` 内仍为 **18**（调色板按设计保留）
- [ ] 标签页 favicon 为幼苗图形（Task 2）
- [ ] `.github/` 存在且 CI 跑通，或 README 已不再声称 CI 存在（Task 3）
- [ ] 构建无 >500kB chunk 警告（Task 5）
- [ ] 8 个孤儿资源已删除，且 `/emotion-diary` 的八个情绪图标仍正常（Task 6）
- [ ] 375px 下后台有抽屉导航，四个菜单项可点且高亮正确；641–900px 仍是 68px 折叠轨道（Task 7）
- [ ] 后台页请求的 Query String 不含 `total`（Task 8）

**必须在能连通后端的环境补做**

- [ ] 会话列表、会话详情、情绪分析全部用**真实数据**跑通（本轮只验证了空态 / 错误态）
- [ ] 知识库列表与文章详情用真实富文本渲染
- [ ] 后台三张列表的筛选、分页、详情弹窗用真实数据
- [ ] Task 8 的分页参数在真实请求中的 Query String 核对
- [ ] `moodScreRange` 与 `sleep` / `sleepQuality` 的字段名与后端确认

**必须在真实浏览器 / 真机补做（本验证环境渲染被节流，无法判定）**

- [ ] 四组动画的实际运动观感（呼吸、脉冲、打字点、气泡淡入）
- [ ] 屏幕阅读器走查（本轮完全未做）
- [ ] 真机触控手感与安全区（本轮只做了尺寸断言）
- [ ] 性能剖析：首屏 LCP、动态导入前后的加载瀑布对比
