# AGENTS.md

Frontend-only Vue 3 SPA: psychology AI assistant (user site + admin). Backend is a remote service; this repo has no server code, tests, lint, or typecheck suite beyond `vue-tsc`.

**TS status (core layer):** `config` / `utils/request` / `api` / `router` / `stores` / `main` are TypeScript. Business pages under `src/views/**` are TypeScript **except** `dashboard.vue` and `consultation.vue` (still plain JS). Do not assume `lang="ts"` on those two.

## Commands

```bash
npm install
npm run dev        # Vite + /api proxy
npm run typecheck  # vue-tsc --noEmit
npm run build      # vue-tsc --noEmit && vite build
npm run preview
```

- Use **npm** (`package-lock.json` is present). No other scripts exist.
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
| `src/config/index.ts` | `fileBaseUrl` for file/cover absolute URLs |
| `src/stores/admin.ts` | Only Pinia store (sidebar collapse) |
| `src/types/` | Shared API/session/emotion types |

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

- SFC style: Vue 3 `<script setup>`. Core layer **and component layer** (App + layouts + components) use `lang="ts"`. Pages under `src/views/**` are TypeScript except `dashboard.vue` and `consultation.vue`.
- HTTP helper: `src/utils/request.ts` exports typed `http` (`get/post/put/delete` → `Promise<T>`); interceptors already unwrap `data.data`. Do not use raw axios for app APIs.
- UI: Element Plus (global). Rich text: wangEditor. Charts: echarts.
- UI copy and comments are Chinese.
- When adding a page: register route under the correct layout shell; admin nav also needs `meta.title` / `meta.icon` (consumed by `Sidebar.vue`).
- Emotion / risk-tag helpers and chart styling reference live in `课件.md`; layout CSS snippets in `src/项目样式.md`. Prefer copying those patterns over inventing new mappings.
- `AI-project学习笔记.md` is a learning write-up and may lag the code; trust source files over it.
- Filename `BackenLayout.vue` is intentional misspelling—do not rename without updating imports.
- `dist/` is a committed build output; ignore unless the user asks to rebuild.

## Backend-dependent features

Dev needs the remote backend reachable (proxy target). Features that call it: login/register, knowledge CRUD, consultation sessions + SSE, emotion diary, analytics overview. Offline or blocked backend → pages fail at request time; no local mock server.
