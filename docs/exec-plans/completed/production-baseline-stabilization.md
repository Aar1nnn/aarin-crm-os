# GoodJob Production Baseline Stabilization

## Status

Completed on 2026-09-21. All nine acceptance defects have root-cause evidence, minimal scoped changes, regression coverage, CI-verifiable commands, and independent fix commits. No feature-development phase was started.

## Current objective

Turn the nine installation-acceptance defects into confirmed root causes, minimal fixes, regression coverage, CI-verifiable commands, and durable documentation. This phase adds no product feature and does not change UI, branding, business entity names, or external CRM integration scope.

## Done criteria

For every issue:

1. Reproduce or otherwise prove the pre-fix failure.
2. Separate symptom, impact, and root cause.
3. Apply the smallest compatible fix.
4. Add a regression test that would fail before the fix.
5. Run the focused test and the complete relevant suite.
6. Review the diff for unrelated changes.
7. Create one issue-specific commit and record its SHA.

## Commit policy

- One preliminary documentation-only commit records the prior installation baseline and this plan.
- Each numbered issue receives exactly one independent fix commit.
- No dependency upgrade, test expectation weakening, force push, or remote push.
- Local ignored environment files and database volumes remain uncommitted.

## Work queue

| ID | Priority | Issue | Status | Commit |
| --- | --- | --- | --- | --- |
| STAB-001 | P0 | Integration Worker BullMQ queue names contain `:` | completed | `0556cc0` |
| STAB-002 | P0 | Fresh database IAM / tenant-membership initialization order | completed | `bafc6ba` |
| STAB-003 | P1 | Prospect-execution MySQL cancellation checkpoint failure | completed | `812ee67` |
| STAB-004 | P1 | Provider trade-observation visibility failure | completed | `ad887b6` |
| STAB-005 | P1 | WhatsApp lifecycle timeout | completed | `d0162cb` |
| STAB-006 | P2 | Windows E2E webServer inline environment incompatibility | completed | `efda451` |
| STAB-007 | P2 | CRM E2E strict locator collision | completed | `c6de43e` |
| STAB-008 | P2 | goodjob-runner Windows CDP readiness / libuv assertion | completed | `e737e41` |
| STAB-009 | P2 | Wikidata enrichment authorization error classification | completed | `8a72a2e` |

## Baseline evidence

- Repository HEAD before stabilization: `19d5bd3b77d727ce787009fb470b5e11446c3b78`.
- Installation acceptance: `docs/exec-plans/completed/goodjob-installation-acceptance.md`.
- Tracked product-source changes before stabilization: none.
- Core MySQL, Redis, Backend, Frontend, Prospect Worker, and WhatsApp local services were healthy.
- Root build passed; the known failing commands and exact symptoms are preserved in the installation record.
- The repository currently has no CI workflow file.

## Current decisions

- Diagnose issues in requested priority order.
- Do not share one implementation commit across issues even when the same suite covers several fixes.
- Tests must exercise public behavior or the narrow internal contract implicated by the root cause.
- Do not replace real infrastructure tests with mocks when the defect is specifically MySQL, Redis/BullMQ, browser, or process-platform behavior.
- A full related suite may remain red only for a separately listed, not-yet-fixed issue; that distinction must be recorded before moving on.

## Progress log

- 2026-09-20: Stabilization phase opened; prior acceptance record and required skills reviewed.
- 2026-09-20: STAB-001 reproduced directly against BullMQ 5.80.3. `QueueBase` rejects `:` before Redis connection. Backend and worker duplicated the same invalid literals. Fix uses one SDK-owned, hyphenated queue-name contract; regression coverage checks exact names, uniqueness, and BullMQ-compatible characters.
- 2026-09-20: STAB-001 verified. The real Integration Worker reached `/healthz` with queue `ready`, and the real Backend dispatcher connected to Redis and reported producer readiness. No BullMQ or other dependency version changed.
- 2026-09-20: STAB-002 root cause confirmed. `ensureIamFoundationSchema()` projects IAM rows before an empty store writes development users. The same startup later persists users but never refreshes the projection, so the second process start appears to fix it. A fresh isolated MySQL single-start regression test now captures the required tenant, membership, organization, role, and platform-operator rows.
- 2026-09-21: STAB-002 fixed by exporting the existing idempotent legacy-IAM sync and invoking it only when startup persisted new users, followed by the existing business-tenant projection validation. No migration or schema design changed.
- 2026-09-21: STAB-003 initially could not reproduce the reported checkpoint mutation after four sequential isolated runs, including the pre-STAB-002 commit. Two concurrent isolated runs instead reached MySQL `max_connections` because the monolithic test retains many store pools. That pressure-test artifact did not explain the original terminal-checkpoint validation error, so no CAS rule was weakened at that point; later entries record the deterministic reproduction and fix.
- 2026-09-21: STAB-004 root cause confirmed as a stale pre-IAM test contract. An unannotated `super_admin` is intentionally classified as a platform identity, and platform operators are denied tenant business data by `canSeeOwner`. The regression now explicitly proves both sides of the current contract: platform access returns no trade observations, while an IAM tenant-wide actor sees all three same-tenant observations and no cross-tenant observation.
- 2026-09-21: STAB-005 reproduced at the configured 20-second timeout. Stage timing showed that real file-backed PGlite startup and migration take 14–23 seconds on this Windows/Node 24 host, while the cleanup assertions complete in milliseconds. The lifecycle file now has a local 45-second integration-test budget, and the former combined dry-run/unmigrated scenario is split into two independent safety regressions. Global Vitest timeouts, database behavior, migrations, and assertions are unchanged.
- 2026-09-21: STAB-006 reproduced directly under `cmd.exe` as `'NODE_ENV' is not recognized`. Playwright 1.61 already supports per-server `env`, so Unix inline assignments were removed without adding a dependency. The launch commands now call the repository-local `tsx` and Vite CLIs directly, avoiding nested npm/watch process trees, and Windows startup budgets reflect measured Backend readiness. A config contract test is part of the Frontend test chain.
- 2026-09-21: STAB-007 root cause confirmed as an E2E navigation-contract defect. The product intentionally has two customer buttons sharing `data-view="customers"`, distinguished by `data-customer-outcome="open|won"`; two copied helpers and one direct locator discarded that second dimension, so Playwright strict mode correctly rejected them. A shared test helper now defaults customer navigation to the open outcome while allowing an explicit won outcome. No product DOM, UI, or business behavior changed.
- 2026-09-21: STAB-008 reproduced with the Windows-equivalent test environment: `isBrowserCdpReady()` failed at `runner-test.ts:112`, followed by Node 24's `src\win\async.c` `UV_HANDLE_CLOSING` assertion. Chrome-only diagnostics proved the MCP service was not causal: Chrome's GPU children exited with Windows `0xC0000022` (`Access Denied`), then Chrome terminated with `GPU process isn't usable`. The local test command also used Unix inline environment syntax and could not run under npm's default `cmd.exe` shell.
- 2026-09-21: STAB-008 uses `--no-sandbox` only for Windows test-mode Chrome, whose disposable profile and ports remain local; production Chrome remains sandboxed. The test now owns `NODE_ENV=test`, waits through GPU initialization, and always stops MCP/Chrome in `finally`, preventing the assertion path from abandoning active libuv child-process handles.
- 2026-09-21: STAB-009 root cause confirmed in the shared error normalizer. Every upstream HTTP `401/403` became `PROVIDER_AUTH_FAILED` even though the runtime had already resolved the authoritative catalog/provider `requiresKey` policy. The acceptance path is the Prospect worker's credential-free Wikidata official-website fallback, not a credentialed contact-enrichment adapter.
- 2026-09-21: STAB-009 passes the resolved `requiresKey` policy into runtime error classification. An anonymous public source rejected with `401/403` is now `PROVIDER_UNAVAILABLE`, non-retryable, and explicitly says no connection credential is required; credentialed providers retain `PROVIDER_AUTH_FAILED`. Provider adapters, request behavior, catalog policy, and credentials are unchanged.
- 2026-09-21: STAB-003 was reproduced deterministically with a real MySQL transaction-ordering regression. `requestCancel(runId, now)` can observe cancellation time before waiting for the run advisory lock; if an in-flight request persists a later checkpoint while cancellation waits, the cancellation transaction reloads that newer checkpoint and then attempted to overwrite `updatedAt` with its older observation time. The checkpoint validator correctly rejected that timestamp rollback.
- 2026-09-21: STAB-003 now preserves monotonic checkpoint time with the existing `latestIso()` helper while retaining cancellation terminalization, versions, CAS, and late-response rules. The regression covers the exact advisory-lock serialization order and verifies both the in-flight `CANCELLED_BY_USER` checkpoint and the final cancelled run after a late provider response.

## Modified files

- `docs/exec-plans/completed/production-baseline-stabilization.md` — durable phase completion record.
- STAB-001: `integration-sdk/src/queue-names.ts`, its test/export/package script, Backend queue producer, and Integration Worker runtime config/test.
- STAB-002: `backend/src/iam/iam-foundation.ts`, `backend/src/mysql-store.ts`, `backend/src/iam/iam-fresh-database-mysql-test.ts`, and `backend/package.json` — refresh the existing idempotent IAM projection after first-start seed persistence, prove fresh-database membership readiness, and add the regression to the MySQL suite entry point.
- STAB-003: `backend/src/prospect-execution-kernel.ts` and `backend/src/prospect-execution-mysql-test.ts` — preserve checkpoint timestamp monotonicity when cancellation waits behind an in-flight request and cover the real MySQL serialization order.
- STAB-004: `backend/src/market-trade-observations-test.ts` — align the visibility regression with the enforced IAM platform/tenant boundary; no production authorization code changed.
- STAB-005: `whatsapp-plugin/tests/data-lifecycle.test.ts` — scope a 45-second budget to the real-PGlite lifecycle suite and separate migrated dry-run from unmigrated refusal coverage.
- STAB-006: `frontend/playwright.config.ts`, `frontend/src/playwright-config-test.ts`, and `frontend/package.json` — use Playwright-native environments, direct local CLIs, measured readiness budgets, and CI-visible config coverage.
- STAB-007: `frontend/tests/navigation.ts`, `frontend/tests/crm.spec.ts`, and `frontend/tests/customer-pool-whatsapp.spec.ts` — centralize outcome-aware E2E navigation, remove ambiguous selectors, and add a real-browser regression.
- STAB-008: `goodjob-runner/src/browser-service.ts`, `goodjob-runner/src/runner-test.ts`, and `goodjob-runner/package.json` — stabilize restricted Windows test Chrome, guarantee child cleanup, and make the official test script cross-platform without a dependency.
- STAB-009: `backend/src/provider-contract.ts`, `backend/src/provider-runtime.ts`, and `backend/src/provider-runtime-test.ts` — classify upstream access rejection using the existing credential policy and cover real Wikidata plus credentialed-provider behavior.

## Test status

- STAB-001 before: `new Queue("goodjob:integration:control", ...)` throws `Queue name cannot contain :`.
- STAB-001 focused after: SDK queue-name regression test, Backend build, Integration Worker build, and runtime-config test passed.
- STAB-001 related suites after: complete Integration Worker test suite and Backend integration pretest suite passed.
- STAB-001 live after: actual worker `/healthz` returned `{ ok: true, worker: "integration", queue: "ready" }`; actual Backend dispatcher connected all three queues to local Redis.
- STAB-002 before: regression test added; expected to fail before the production fix because all four seeded tenant memberships are missing after the first `createMysqlStore()` call.
- STAB-002 observed before: isolated fresh database failed on the first startup with `null !== 'active'` for the seeded users' tenant memberships.
- STAB-002 focused after: fresh-database MySQL regression passed with 1 tenant, 4 memberships, and 1 platform operator; IAM unit test and Backend build passed.
- STAB-002 related suite after: the complete Backend MySQL suite passed all 11 scripts, including identity, campaign, coverage, execution, bootstrap, conversion, qualification, run, strategy, and provider persistence.
- STAB-003 before: the real-MySQL serialization regression failed in `validateProspectCheckpointMutation()` with the reported checkpoint-time rollback after cancellation captured `now` before waiting for the advisory lock and an in-flight request persisted a later timestamp.
- STAB-003 focused after: the complete `prospect-execution-mysql-test.ts` passed persistence, CAS, recovery, settlement, immutability, isolation, and the new cancellation serialization regression. `prospect-execution-kernel-test.ts` and `prospect-worker-test.ts` also passed.
- STAB-003 related suite after: all 11 real-MySQL Backend scripts passed sequentially, including fresh IAM, organization identity, campaign, coverage, execution, identity bootstrap, conversion, qualification, run, strategy, and provider persistence. Backend production build and `git diff --check` passed.
- STAB-004 before: `test:provider-trade-observations` failed at the legacy global-super-admin assertion with `0 !== 4`.
- STAB-004 focused after: `test:provider-trade-observations` passed, including platform denial, tenant-wide same-tenant access, and cross-tenant exclusion.
- STAB-004 related suites after: Backend build, IAM capability test, IAM custom-role/default-deny test, Provider runtime test, trade runtime test, and trade-observation list API test all passed.
- STAB-005 before: the isolated cleanup safety test completed in about 22–24 seconds but failed the file's inherited 20-second timeout; the full suite reproduced the same boundary failure in three lifecycle cases under load.
- STAB-005 focused after: `data-lifecycle.test.ts` passed all 9 tests with real PGlite, migration, seed, cleanup, rollback, protected-data, and unmigrated-database checks.
- STAB-005 related suite after: WhatsApp Vitest passed 72 tests with 9 conditional integration tests skipped (10 files passed, 2 skipped); WhatsApp typecheck and web/server production build passed.
- STAB-006 before: the official Backend command failed immediately under Windows `cmd.exe` because `NODE_ENV=e2e` was interpreted as an executable name.
- STAB-006 focused after: the config contract test passed; a DEBUG Playwright launch started the real memory Backend and Vite Frontend and received HTTP 200 from 4288 and 5288.
- STAB-006 related suites after: the complete Frontend unit/integration/config chain and Frontend production build passed. The managed host denied Playwright's Windows `taskkill` during teardown, independently reproduced as `Access denied`; Ctrl+C removed the exact E2E listener processes.
- STAB-007 before: the customer test failed because `.nav button[data-view="customers"]` resolved to both open and won controls. A post-fix full-suite attempt exposed the same stale contract in `customer-pool-whatsapp.spec.ts` and one direct CRM sidebar locator, confirming the defect was duplicated at the test-helper layer.
- STAB-007 focused after: the new outcome-specific navigation regression and the lead-drawer navigation regression passed 2/2 against the real memory Backend, Vite Frontend, and Chrome.
- STAB-007 related suite after: `customer-pool-whatsapp.spec.ts` passed 4/5. All customer navigation paths crossed the former strict-mode boundary; the remaining test independently timed out after navigation because `#whatsapp` did not become active. No current error artifact contains a customer-navigation strict-mode violation. The official 62-test run still produced widespread pre-existing interaction timeouts and stalled during the already-documented Windows webServer teardown, so it did not emit a trustworthy aggregate summary.
- STAB-008 before: the official package command failed under `cmd.exe` at the Unix inline assignment; the equivalent PowerShell environment reproduced `false !== true` at the CDP assertion and then the Node/libuv Windows assertion. Chrome stderr captured repeated GPU child exits with status `0xC0000022` followed by a fatal unusable-GPU shutdown.
- STAB-008 focused and related suite after: the official `npm test --workspace @goodjob/local-runner` passed three consecutive real Chrome/CDP/MCP runs with the delayed readiness regression, and `npm run build --workspace @goodjob/local-runner` passed. No 8931/8933 listener remained and no libuv assertion occurred.
- STAB-008 root-suite boundary: root `npm test` was attempted and passed the SDK suite, but Backend's separate pretest still uses Unix inline `NODE_ENV=test` commands and stopped under Windows `cmd.exe` before the runner workspace. That newly observed Backend script portability defect was not folded into the runner commit.
- STAB-009 before: the new real-Wikidata runtime regression received a mocked upstream HTTP 403 and failed because the result was `PROVIDER_AUTH_FAILED` with “数据源授权已失效，请检查连接配置”.
- STAB-009 focused after: the Provider runtime contract suite passed. The regression proves Wikidata HTTP 403 becomes non-retryable `PROVIDER_UNAVAILABLE` without a credential prompt, while credentialed providers preserve non-retryable `PROVIDER_AUTH_FAILED` for both HTTP 401 and 403.
- STAB-009 related suites after: the Wikidata website fallback plus 14 Provider, trade, cache, observation, market-analysis, and Prospect-worker test files passed. Backend TypeScript production build and `git diff --check` passed.

## Residual risks and verification boundaries

- The nine requested stabilization issues are closed, but the official 62-test Playwright run does not yet have a clean Windows aggregate result. Its remaining failures are broader pre-existing interaction timeouts plus the managed host's `taskkill` denial during webServer teardown, not the repaired strict customer locator.
- `customer-pool-whatsapp.spec.ts` still has one independent active-tab timeout after customer navigation; the four customer-navigation paths affected by STAB-007 pass.
- Root `npm test` still stops before the runner workspace because separate Backend package scripts use Unix inline environment assignment under Windows `cmd.exe`. That newly observed portability defect was recorded but was not one of the nine requested fixes and was not folded into another issue's commit.
- Credentialed third-party integrations were not exercised with real enterprise credentials during this stabilization phase.

## Next task

No listed stabilization issue remains open. Perform no feature work in this phase; the next phase requires a separate user decision after reviewing this completion record and its documented residual risks.
