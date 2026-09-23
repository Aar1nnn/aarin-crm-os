# GoodJob Installation Acceptance Record

## Objective and constraints

Install, configure, run, and verify the official GoodJob repository on this Windows host as a clean baseline for later development. Work was restricted to `D:\AI-Workspace\projects\goodjob-sales-os`. Product behavior, UI, branding, database design, business logic, tests, and dependency versions were not changed. No other project was read or modified.

## Repository baseline

- Remote: `https://gitee.com/sendoh-huang/GoodJob.git`
- Branch: `master`
- HEAD: `19d5bd3b77d727ce787009fb470b5e11446c3b78`
- Tree: `9fbe7435d0e9c92035da01fb4c0895552ff4429a`
- Version identified by the repository: `1.7.4`
- Source integrity: the reconstructed Git tree and commit object match the official Gitee API result.
- Retrieval limitation: anonymous Git and archive transport prompted for authentication. Official Gitee tree/raw/blob endpoints were used to reconstruct an exact single-commit shallow checkout. Earlier history was not fetched.

## Runtime topology

Core path:

`Frontend (Vite/React) -> Backend (Express) -> MySQL`

Background path:

`Backend embedded Prospect worker/scheduler -> Redis/BullMQ -> provider runtimes`

Optional paths:

- `Integration Worker -> Redis/BullMQ -> Google Workspace / Microsoft 365 / WeCom / Google Drive / ERPNext / EasyPost / native MCP`
- `WhatsApp web -> WhatsApp API -> its MySQL tables -> Meta/Baileys provider`
- `goodjob-runner -> local browser/Playwright MCP -> Agent execution bridge`

MySQL, Backend, and Frontend are mandatory for the core CRM. Redis is optional for the simplest core startup but is running and used by Prospect queue coordination. Integration Worker, WhatsApp real channels, and goodjob-runner are optional for first CRM acceptance.

## Environment

- Windows: Windows 10 Home China, DisplayVersion 25H2, build 26200.9457, x64
- PowerShell: 7.6.5 Core
- Git: 2.53.0.windows.2
- Node.js: v24.16.0
- npm: 11.13.0 (repository-selected workspace package manager)
- Corepack: 0.35.0
- Docker Desktop: 4.80.0; Engine/client 29.6.1; Compose v5.1.4
- MySQL: `mysql:8.4.6`, project-only container, `127.0.0.1:3306`
- Redis: `redis:7.4-alpine`, project-only container, `127.0.0.1:6379`
- Host MySQL/Redis were not installed or modified. Docker Desktop/WSL settings were not changed.

## Local configuration

Ignored local configuration files were created: `.env`, `.env.development.local`, `.env.test.local`, and `.env.mysql.local`. Random local-only values are used for secrets. No real provider credential is present. Integration control-plane flags remain disabled because enabling them currently triggers the BullMQ queue-name defect described below. `REDIS_URL` is enabled for the Prospect worker.

Required groups: database profile/store and `DATABASE_URL`; backend bind/port and CORS; JWT, encryption, cursor, webhook, and signature secrets; development seed switch.

Optional groups: Redis/queue; integration/OAuth credentials; email/Twilio; WhatsApp Meta/Baileys; provider API keys; backup/docs/update settings. Optional external providers remain unconfigured or disabled rather than mocked.

## Infrastructure, migration, and seed

- Dedicated development database: `goodjob_crm_dev`
- MySQL container: `goodjob-sales-os-mysql`, healthy, restart `unless-stopped`
- Redis container: `goodjob-sales-os-redis`, `PONG`, restart `unless-stopped`
- Empty CRM migration: schema version `1.4.1-document-import-001`; tables `1 -> 194`; columns `8 -> 2925`; protected-row check passed.
- Communication plugin migrations: 12 ledger entries, passed.
- Repeat migration: CRM tables and columns unchanged (`217 -> 217`, `3172 -> 3172` after plugin tables); plugin migration passed again.
- Official development seed after startup: 5 users, 5 customers, 4 leads, 5 deals, 5 todos, and 3 customer activities.
- IAM empty-database bootstrap issue: first backend initialization created users before the tenant foundation was seeded, so tenant memberships were absent. A second normal backend initialization pass created tenant `europe` and 4 active memberships. No schema/data shortcut or source edit was used.
- Official local admin: `admin@goodjob.com`; official development password remains `goodjob123` and must be changed before any non-local use.

## Running services

- Frontend: `http://127.0.0.1:5188` — HTTP 200
- Backend: `http://127.0.0.1:4190` — health HTTP 200, MySQL store, BullMQ queue running and not degraded
- MySQL: `127.0.0.1:3306` — healthy
- Redis: `127.0.0.1:6379` — PONG
- Embedded Prospect worker: running in BullMQ mode
- WhatsApp API: `http://127.0.0.1:3100` — ready, MySQL, zero active real channels, Demo provider disabled
- WhatsApp web: `http://127.0.0.1:5193` — HTTP 200
- Integration Worker: not running; blocked by the queue-name defect
- Temporary memory backend/frontend used for E2E were stopped after testing.

## Live acceptance

Browser/API acceptance passed for login/session, Dashboard, Customer with contact fields, Lead, Deal, Follow-up/Todo, Customer Activity, Lead Finder, Prospect List, AI Agent, Skills, Knowledge, Approval Center, Integration Center, and WhatsApp surfaces. One isolated acceptance Customer, Lead, Todo, Deal, and Prospect campaign were persisted in the dedicated database. No page JavaScript exception occurred.

Prospect processing was real rather than record-only:

- A sandbox-restricted GLEIF run progressed `Campaign -> Strategy -> Run -> Task/Shard -> Worker` and failed with a recorded network error.
- With normal outbound access, retry completed `succeeded_empty` with GLEIF HTTP 200.
- A Siemens campaign completed `succeeded`, returned 2 source records, persisted 1 deduplicated candidate, created organization and tenant-prospect identity records, and generated a scorecard.
- The candidate remained correctly unqualified because verified identity, ICP, and contact evidence were insufficient. Lead conversion and Outreach were not forced. Contact enrichment attempted its official Wikidata path and returned `provider_failed` / “数据源授权已失效”.

Agent runtime, Skills, Knowledge, Memory, Governance, and Approval surfaces load, and their official backend tests passed. Actual model execution remains credential-gated.

## Quality gates

- Install: root `npm ci` passed (637 packages; audit summary 6 moderate and 13 high); WhatsApp `npm ci --workspaces=false` passed (389 packages; 6 moderate and 3 high). No `audit fix` or dependency upgrade was performed.
- Dependency trees: root and WhatsApp `npm ls --depth=0` passed.
- Build: root `npm run build` passed for SDK, backend, frontend, integration-worker, goodjob-runner, and WhatsApp web/server. Frontend emitted non-fatal large-chunk warnings.
- Typecheck: all TypeScript workspaces compiled during build; WhatsApp explicit typecheck passed.
- Lint: no official lint script is provided.
- Root test chain: SDK, backend, frontend, and integration-worker passed. It stopped at goodjob-runner before WhatsApp because the Windows CDP readiness assertion at `goodjob-runner/src/runner-test.ts:112` failed; rerun reproduced it and then hit a Node/libuv Windows assertion.
- Backend MySQL suite: 9 of 10 scripts passed. `test:prospect-execution:mysql` failed reproducibly at the cancellation checkpoint with `搜索执行 checkpoint 发生回退或终态被修改`.
- Provider/worker selection: 17 of 18 commands passed. `test:provider-trade-observations` failed reproducibly because the super-admin visibility expectation was 4 while the result was 0.
- WhatsApp Vitest: 12 files — 9 passed, 2 skipped, 1 failed; 80 tests — 70 passed, 9 skipped, 1 failed. The dry-run read-only lifecycle test timed out; isolated rerun reproduced the timeout.
- Official E2E entry: could not start on Windows because `webServer.command` uses Unix inline environment syntax (`NODE_ENV=...`). With equivalent manually started servers and an ignored Windows-only runner config, 61 tests ran: 11 passed and 50 failed, largely on 30-second interaction timeouts. A single-worker core Customer rerun first exceeded `beforeEach`; at a 120-second test budget it exposed a strict locator defect in `openView`, where `.nav button[data-view="customers"]` resolves to both open and won customer buttons.
- `git diff --check`: passed.

## Confirmed defects and limitations

1. Integration startup is blocked with BullMQ 5.80.3 because repository queue names contain `:` (`goodjob:integration:control`, `goodjob:integration:tool-calls`, `goodjob:integration:events`), which BullMQ rejects.
2. Empty-database IAM foundation requires a second backend initialization pass because of seed/bootstrap ordering.
3. Official Windows profile and Playwright web-server launchers use process/inline-env behavior that does not work in this environment.
4. goodjob-runner CDP readiness test fails on Windows.
5. One MySQL Prospect execution checkpoint test fails.
6. One trade-observation authorization/visibility test fails.
7. One WhatsApp data-lifecycle test times out consistently.
8. The E2E customer navigation helper violates Playwright strict locator rules; the full E2E suite also exceeds the official 30-second budget extensively on this host.
9. The optional Wikidata contact-enrichment path reports an authorization-expired error without a supplied credential.
10. Direct WHATWG `fetch` clients reject port 4190 as a restricted port; PowerShell, the browser through Vite proxy, and ordinary HTTP clients reached the backend normally.

## Source modifications and local artifacts

No official product source, test expectation, migration, lockfile, UI, branding, schema, or business logic was modified. This completed execution record is the only non-ignored Git working-tree addition.

Ignored local artifacts include the four environment files, `.data/mysql`, `.data/redis`, acceptance/diagnostic scripts, the browser acceptance JSON and screenshot, the Windows-only Playwright runner config, and generated test results. They contain no real customer credential.

## Final disposition

The core GoodJob CRM and the credential-free GLEIF Prospect path are operational locally against isolated MySQL/Redis, and the current services are healthy. The repository is usable as a conditional core-CRM development baseline, but it is not an all-green full-platform baseline: Integration Worker, goodjob-runner Windows behavior, several tests, and credential-gated integrations remain unresolved. The next maintenance phase should first correct the Integration BullMQ queue naming with regression coverage, under separate authorization; no such development was started here.
