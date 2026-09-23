# Real Integrations Demo Execution Plan

## Current objective

Deliver and verify a real-connection demonstration for the existing GoodJob/Aarin CRM mainline, now limited by the user's latest instruction to DeepSeek, GLEIF/Prospect Worker, Gmail, Google Calendar, and one WhatsApp account. Preserve all existing user changes and require explicit user confirmation before any external send or calendar/message write.

## Scope and non-goals

In scope:

- Integration Worker runtime, queue naming, retries, idempotency, receipts, and health verification.
- DeepSeek through the existing OpenAI-compatible AI provider architecture.
- Real credential-free GLEIF search and Prospect persistence flow.
- Existing Google OAuth connector for Gmail and Google Calendar only.
- One real WhatsApp account through the existing plugin.
- Tests, secret scan, acceptance evidence, reproducible SOP, and recovery instructions.

Out of scope:

- n8n, Feishu, Google Drive, Microsoft 365, WeCom, ERPNext, EasyPost, paid Prospect providers, multi-account WhatsApp, old-project code, bulk messaging, automatic quotation/commitment, and automatic deal closure.

## Baseline and assumptions

- Repository root: `D:\AI-Workspace\projects\goodjob-sales-os`.
- Current branch: `master`.
- Current HEAD is newer than the requested historical expectation and must be recorded rather than reset.
- The working tree already contains 29 user-requested Aarin branding modifications; they must be preserved.
- Local runtime uses development MySQL and Redis. No database reset, destructive migration, or data deletion is authorized.
- No real Cloudflare, Google, Gemini, or WhatsApp credential will be requested in chat. Credentials must enter through ignored local environment files, the existing encrypted credential vault, interactive OAuth, or QR scan.
- External writes remain blocked until the user explicitly confirms the final send/create action.

## Observable done criteria

- Integration Worker responds on its configured health endpoint and real queues initialize without invalid names.
- Queue naming, retry/failure boundaries, OAuth state/error paths, idempotency, and receipt behavior have automated verification.
- DeepSeek configuration uses the existing provider model and exposes real status/errors without mock fallback.
- A real GLEIF request is recorded with source and observation time; conversion remains user-confirmed and deduplicated.
- Google OAuth configuration exactly matches the existing source variables, callbacks, scopes, encrypted storage, refresh, and revoke behavior.
- One WhatsApp account can reach a real QR/connected state when the runtime has network access; session state is encrypted and restart behavior is tested.
- Acceptance documentation distinguishes PASS, PARTIAL, BLOCKED, and NOT STARTED with timestamps and redacted evidence.

## Current decisions

- Reuse existing connector, AI, approval, credential-vault, Prospect, and WhatsApp implementations; do not rewrite them.
- Verify whether the historical BullMQ defect is already fixed in the current HEAD before editing it.
- Use the current official DeepSeek OpenAI-compatible endpoint/model and retain real error reporting; never claim a connection before a key-backed request succeeds.
- Use a single Google OAuth connector for Gmail and Calendar; do not enable Google Drive.
- Use one WhatsApp account only and do not send to any number until explicit confirmation.
- Cloudflare and Gemini work stopped when the user replaced the connection list; completed safe templates remain unactivated.

## Progress

- [x] Read the full user request and project working rules.
- [x] Read `feature-delivery` and `project-context-maintainer` instructions.
- [x] Confirmed the repository has existing uncommitted Aarin branding changes that must be preserved.
- [x] Verify repository version and live service/process/container state.
- [x] Verify Integration Worker queue-name fix, tests, and live startup.
- [x] Prepare (but do not activate) Tunnel/public-origin templates from the superseded scope.
- [x] Verify GLEIF through the real business API and repeat-run deduplication.
- [x] Update DeepSeek preset to the current official endpoint/model and add JSON Output regression coverage.
- [x] Prepare Google OAuth credentials, callbacks, and browser authorization boundary.
- [x] Fix MySQL `DATETIME(3)` handling across Google connection creation, OAuth token exchange, and tool discovery.
- [x] Fix MySQL `DATETIME(3)` handling for integration tool review and team grant creation.
- [x] Complete Google OAuth, approve all nine Gmail/Calendar tools, create all nine team grants, and pass a real read-only Gmail health check.
- [x] Fix MySQL `DATETIME(3)` handling for Google health-check scheduling and success/failure state writes.
- [x] Support approved team-scoped Google Workspace tools in Gmail/Calendar business APIs while preserving personal-first selection and grant checks.
- [x] Correct legacy `pageToken`/`nextPageToken` egress classification without weakening credential-token blocking.
- [x] Fix MySQL `DATETIME(3)` handling across read-call creation and Worker claim/completion/failure paths.
- [x] Complete a real governed Google Calendar read through Backend, BullMQ, Integration Worker, encrypted artifact storage, and evidence verification.
- [x] Restore one WhatsApp QR/connected flow, complete scan, and verify encrypted-session restart recovery.
- [x] Save the DeepSeek credential through the encrypted AI configuration flow and pass a real key-backed model request.
- [x] Classify local `EACCES`/`EPERM` outbound failures as network errors instead of generic adapter failures.
- [ ] Run quality gates, secret scan, restart/idempotency checks, and final diff review.
- [ ] Complete acceptance record and demo/recovery SOP.

## Modified files

- `docs/exec-plans/active/real-integrations-demo.md` — durable execution state for this task.
- `backend/src/integrations/integration-repository.ts` — bind connection timestamps as MySQL-compatible `Date` values.
- `backend/src/integrations/integration-control-repository.ts` — bind OAuth transaction timestamps as MySQL-compatible `Date` values.
- `backend/src/integrations/integration-service.ts` — resolve personal or team-scoped Workspace tools and safely classify provider pagination tokens.
- `backend/src/integrations/integration-service-test.ts` — regress team Workspace selection and legacy pagination-token policy compatibility.
- `backend/src/integrations/integration-repository-test.ts` — regress connection, OAuth, team Workspace lookup, and tool-call timestamp binding.
- `integration-worker/src/repository.ts` — bind OAuth credential and discovery timestamps as MySQL-compatible `Date` values.
- `integration-worker/tests/integration-oauth-repository-date-test.ts` — regress the Worker OAuth/discovery timestamp path.
- `integration-worker/tests/integration-health-repository-date-test.ts` — regress health scheduling and success/failure timestamp binding.
- `integration-worker/tests/integration-tool-call-repository-date-test.ts` — regress Worker tool-call claim/completion/failure timestamp binding.
- `integration-worker/tests/run-tests.mjs` — include the new Worker regression test.
- `backend/src/provider-contract.ts` — classify OS-level network access denials as provider network errors.
- `backend/src/ai-model-runtime-test.ts` — regress `EACCES` network-error normalization.
- `backend/src/ai-config-persistence.ts` — persist AI test outcomes inside the MySQL serialized mutation queue so refreshes cannot restore stale status.
- `backend/src/server.ts` — use the atomic AI test-outcome persistence path.

## Test status

- Integration Worker full test runner passed, including OAuth/discovery and health-check timestamp regressions.
- Backend AI runtime focused test passed with `NODE_ENV=test`.
- Backend TypeScript build passed.
- Backend OAuth security test and integration repository timestamp regression passed.
- Backend integration service test and tool-review timestamp regression passed.
- A real development-MySQL review/grant write probe passed and was rolled back; the Calendar tool remained `pending_review`.
- Integration Worker full suite and TypeScript build passed after the timestamp repair.
- A real development-MySQL transaction accepted the repaired connection timestamps and was rolled back without leaving test data.
- Real GLEIF search returned five candidates; repeat run returned `newCount=0`, `unchangedCount=5`.
- WhatsApp reached `connected`, persisted 2904 encrypted session keys, and reconnected after restart without a QR.
- Google Workspace OAuth credential is active; nine discovered tools and nine team grants are active.
- A real Google health job completed through BullMQ and `mail.list_accounts`; connection is `active`, circuit is `closed`, errors/warnings are empty, and measured latency was 705 ms at `2026-09-22T14:12:16.620Z`.
- A real governed `calendar.list_events` call completed with call ID `icl_3354e860-2bbe-49b0-b515-947397092e00`, source `google-workspace://calendar/events`, observed at `2026-09-22T14:39:59.166Z`; the seven-day window contained zero events and no external write occurred.
- DeepSeek configuration `ai_u_admin_1790100128732` is enabled with encrypted credential storage; a real `deepseek-flash` request passed at `2026-09-22T18:19:55Z` after the backend was relaunched with outbound HTTPS access, and the persisted status remained `passed` after a delayed readback.
- AI runtime focused regression test passed, including the new `EACCES` classification assertion.

## Known issues and blockers

- Google token refresh is implemented but has not yet been observed across an actual access-token expiry boundary.
- Real Gmail send, Calendar creation, and WhatsApp outbound actions require explicit user confirmation.

## Next task

Run the remaining quality gates and acceptance documentation. Stop again for explicit confirmation before Gmail send, Calendar create, or WhatsApp outbound.

## Uncertain items

- Whether `aarinaishop.com` is already managed in the intended Cloudflare account and whether the proposed subdomains already have DNS records.
- Which user-controlled Gmail test mailbox and WhatsApp test number will be used for final external-write acceptance.
- Whether the host network can reach WhatsApp WebSocket endpoints without a dedicated proxy when the service is launched outside the restricted execution sandbox.
