# AGENTS.md

Frontend-only Vue 3 SPA: psychology AI assistant (user site + admin). Backend is a remote service; this repo has no server code, tests, lint, or typecheck suite beyond `vue-tsc`.

**TS status:** Core layer, components, and **all** `src/views/**` pages (including `dashboard` and `consultation`) use TypeScript (`lang="ts"`).

## Commands

```bash
npm install
npm run dev        # Vite + /api proxy
npm run typecheck  # vue-tsc --noEmit
npm run build      # vue-tsc --noEmit && vite build
npm run preview
```

- Use **npm** (`package-lock.json` is present). No other scripts exist.
- CI (`.github/workflows/ci.yml`): on push to `main` / `feat/**` and PRs to `main` — `npm ci` → `typecheck` → `build`, then upload `dist/`.
- Path alias: `@` → `src` (see `vite.config.ts` and `tsconfig.json`).
- `strict: true`. Prefer adding real types over `any`; local `as`/narrowing only with a reason.
- TS toolchain: `typescript` 5.x + `vue-tsc` 2.x (do not jump to TypeScript 7 — current vue-tsc cannot resolve `./lib/tsc`).

## Architecture

| Path | Role |
|------|------|
| `src/main.ts` | App entry: Element Plus + all EP icons global + Pinia + router |
| `src/router/index.ts` | Three shells: `FrontendLayout` (`/`), `BackenLayout` (`/back`), `AuthLayout` (`/auth`) |
| `src/api/frontend.ts` | User-site API |
| `src/api/admin.ts` | Admin API + login |
| `src/utils/request.ts` | Shared axios; all normal HTTP goes through this |
| `src/utils/session.ts` | Only reader/writer of `token` + `userInfo` (avoids the old `userinfo` key typo) |
| `src/utils/format.ts` | Null-safe date/time/duration formatting |
| `src/utils/emotion.ts` | Single source of emotion/risk mappings, tag types and emotion colors |
| `src/styles/` | Design tokens + global base/keyframes + Element Plus overrides (imported once in `main.ts`) |
| `src/config/index.ts` | `fileBaseUrl` for file/cover absolute URLs, plus the `brand` constants |
| `src/stores/admin.ts` | Only Pinia store (sidebar collapse) |
| `src/types/` | Shared API/session/emotion types |
| `src/components/consult/` | Presentational components for the chat page (`EmotionGarden`, `SessionList`) |

Auth via `localStorage`: `token` + `userInfo` (`userType` `1`=user, `2`=admin). Router guard in `src/router/index.ts` routes by type; admin is forced into `/back/*`.

## API contract (easy to get wrong)

- Axios `baseURL` is `/api`. Dev proxy → `http://159.75.169.224:1235` (`vite.config.ts`). Same host is hardcoded as `fileBaseUrl` for file paths returned by the backend.
- API docs (Apifox): https://xsl1e23zpk.apifox.cn/
- Auth header is **`token`**, not `Authorization`.
- Success envelope uses **string** codes: `{ code: "200" | "-1", msg, data }`. Interceptor returns `response.data.data` only when `code === "200"`; `"code": 200` (number) will not unwrap.
- Timeout is 5s on the shared axios instance.
- Non-`"200"` non-`"-1"` codes **reject** (do not resolve as business data).

## Chat SSE (do not “fix” via axios)

`src/views/consultation.vue` streams with `@microsoft/fetch-event-source`, **not** axios:

- `POST /api/psychological-chat/stream`
- Header `Token` (capital T), `Accept: text/event-stream`
- Events: JSON chunks with `{ code, data: { content } }`, terminal event name `done`
- Session IDs: list APIs return numeric `id`; stream/emotion calls use **`session_${id}`** prefix. Keep that normalization when touching chat/emotion.

## Conventions

- SFC style: Vue 3 `<script setup lang="ts">` throughout `src/**` (views included).
- HTTP helper: `src/utils/request.ts` exports typed `http` (`get/post/put/delete` → `Promise<T>`); interceptors already unwrap `data.data`. Do not use raw axios for app APIs.
- UI: Element Plus (global). Rich text: wangEditor. Charts: echarts.
- UI copy and comments are Chinese.
- When adding a page: register route under the correct layout shell; admin nav also needs `meta.title` / `meta.icon` (consumed by `Sidebar.vue`).
- **Brand is single-sourced.** Product name「心耘」, full name「心灵耕耘平台」and the assistant name live in `brand` (`src/config/index.ts`) and are rendered via `<BrandLogo />`. Never hardcode a brand name, and never reintroduce the retired names「宁渡」/「小暖」/「心理健康AI助手」.
- **Styling goes through design tokens.** Use `var(--xy-*)` from `src/styles/_tokens.scss` for every color/space/radius/shadow/duration; do not write raw hex in SFC styles. Global helpers live in `src/styles/_base.scss` (`.xy-card`, `.xy-empty`, `.xy-skeleton`, `.xy-visually-hidden`). All `@keyframes` are prefixed `xy-` and defined in `src/styles/_keyframes.scss` — this project previously referenced four animations that were never defined, so always define before referencing.
- **Accessibility floor:** color contrast ≥ 4.5:1 for text (token values are pre-verified, comments record each ratio), visible `:focus-visible` rings, ≥44px touch targets, no color-only status indicators, and respect `prefers-reduced-motion`. Icon-only buttons need `aria-label`.
- Date/time on screen must go through `src/utils/format.ts` (raw ISO strings were previously rendered directly). Emotion/risk mappings must come from `src/utils/emotion.ts` rather than being redefined per page.
- Emotion / risk-tag semantics still reference `课件.md`; prefer those mappings over inventing new ones. `src/项目样式.md` is a **pre-token** style dump kept only for historical comparison — its hardcoded colors, fixed widths and emoji icons are deprecated.
- `AI-project学习笔记.md` is a learning write-up and may lag the code; trust source files over it.
- Filename `BackenLayout.vue` is intentional misspelling—do not rename without updating imports.
- `dist/` is a build output and is **gitignored** (`.gitignore` has `dist/`), so it is not a committed artifact despite what earlier notes said — ignore it unless the user asks to rebuild.

## Backend-dependent features

Dev needs the remote backend reachable (proxy target). Features that call it: login/register, knowledge CRUD, consultation sessions + SSE, emotion diary, analytics overview. Offline or blocked backend → pages fail at request time; no local mock server.
