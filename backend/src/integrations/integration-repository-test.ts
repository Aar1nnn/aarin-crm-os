import assert from "node:assert/strict";
import type { Pool } from "mysql2/promise";
import { MysqlIntegrationControlRepository } from "./integration-control-repository.js";
import { MysqlIntegrationRepository } from "./integration-repository.js";

const rows = [
  {
    id: "connection_a",
    connector_id: "connector_fake",
    team_id: "team_a",
    owner_id: "sales_a",
    connection_scope: "personal",
    scope_id: "sales_a",
    connection_status: "active",
    display_name: "Team A personal connection",
    revision_no: 1,
    last_health_at: null,
    last_error_code: "",
    last_error_message: "",
    created_at: new Date("2026-08-07T00:00:00.000Z"),
    updated_at: new Date("2026-08-07T00:00:00.000Z"),
    disconnected_at: null
  },
  {
    id: "connection_b",
    connector_id: "connector_fake",
    team_id: "team_b",
    owner_id: "sales_b",
    connection_scope: "personal",
    scope_id: "sales_b",
    connection_status: "active",
    display_name: "Team B personal connection",
    revision_no: 1,
    last_health_at: null,
    last_error_code: "",
    last_error_message: "",
    created_at: new Date("2026-08-07T00:00:00.000Z"),
    updated_at: new Date("2026-08-07T00:00:00.000Z"),
    disconnected_at: null
  }
];

const observedQueries: Array<{ sql: string; values: unknown[] }> = [];
const observedExecutions: Array<{ sql: string; values: unknown[] }> = [];
const pool = {
  query: async (sql: string, values: unknown[] = []) => {
    observedQueries.push({ sql, values });
    let visible = rows.slice();
    const readsById = sql.includes("WHERE id = ?");
    if (sql.includes("team_id = ?")) visible = visible.filter((row) => row.team_id === values[readsById ? 1 : 0]);
    if (sql.includes("owner_id = ?")) visible = visible.filter((row) => row.owner_id === values[readsById ? 2 : 1]);
    if (readsById) visible = visible.filter((row) => row.id === values[0]);
    return [visible, []];
  },
  execute: async (sql: string, values: unknown[] = []) => {
    observedExecutions.push({ sql, values });
    return [{ affectedRows: 1 }, []];
  }
} as unknown as Pool;

const repository = new MysqlIntegrationRepository(pool);
const personalA = await repository.listConnections({ type: "personal", teamId: "team_a", ownerId: "sales_a" });
assert.deepEqual(personalA.map((item) => item.id), ["connection_a"]);
const teamA = await repository.listConnections({ type: "team", teamId: "team_a" });
assert.deepEqual(teamA.map((item) => item.id), ["connection_a"]);
const platform = await repository.listConnections({ type: "platform" });
assert.deepEqual(platform.map((item) => item.id), ["connection_a", "connection_b"]);
assert.equal(await repository.getConnection("connection_b", { type: "team", teamId: "team_a" }), null);
assert.ok(observedQueries.every((query) => !query.sql.includes("SELECT * FROM integration_connections WHERE 1=1") || query.values.length === 2));

const connectionExecutions: Array<{ sql: string; values: unknown[] }> = [];
const connectionPool = {
  query: pool.query,
  getConnection: async () => ({
    beginTransaction: async () => undefined,
    execute: async (sql: string, values: unknown[] = []) => {
      connectionExecutions.push({ sql, values });
      return [{ affectedRows: 1 }, []];
    },
    commit: async () => undefined,
    rollback: async () => undefined,
    release: () => undefined
  })
} as unknown as Pool;
const connectionRepository = new MysqlIntegrationRepository(connectionPool);
await connectionRepository.createConnection({
  id: "connection_a",
  connectorId: "connector_fake",
  teamId: "team_a",
  ownerId: "sales_a",
  scope: "personal",
  scopeId: "sales_a",
  status: "authorizing",
  displayName: "Google Workspace",
  createdAt: "2026-09-22T13:20:44.415Z"
});
const connectionInsert = connectionExecutions.find((item) => item.sql.includes("INSERT INTO integration_connections"));
assert.ok(connectionInsert);
assert.ok(connectionInsert.values.at(-2) instanceof Date);
assert.ok(connectionInsert.values.at(-1) instanceof Date);

const controlRepository = new MysqlIntegrationControlRepository(pool);
await controlRepository.upsertConnector({
  id: "connector_google_workspace",
  code: "google-workspace",
  version: "1.0.0",
  type: "official_api",
  trust: "system",
  status: "active",
  teamId: "",
  name: "Google Workspace",
  description: "Gmail and Calendar",
  manifestJson: "{}",
  manifestHash: "a".repeat(64),
  createdBy: "system",
  createdAt: "2026-09-22T09:00:13.299Z",
  updatedAt: "2026-09-22T09:00:13.299Z"
});
const connectorInsert = observedExecutions.find((item) => item.sql.includes("INSERT INTO integration_connectors"));
assert.ok(connectorInsert);
assert.ok(connectorInsert.values.at(-2) instanceof Date);
assert.ok(connectorInsert.values.at(-1) instanceof Date);

await controlRepository.createAuthTransaction({
  id: "transaction_google_workspace",
  connectionId: "connection_a",
  teamId: "team_a",
  ownerId: "sales_a",
  status: "created",
  stateHash: "b".repeat(64),
  nonceHash: "c".repeat(64),
  encryptedContext: "encrypted",
  redirectUri: "http://127.0.0.1:4190/api/integrations/oauth/callback/google-workspace",
  issuer: "",
  resourceUri: "https://www.googleapis.com",
  expiresAt: "2026-09-22T13:30:44.415Z",
  consumedAt: "",
  createdAt: "2026-09-22T13:20:44.415Z",
  updatedAt: "2026-09-22T13:20:44.415Z"
});
const authTransactionInsert = observedExecutions.find((item) => item.sql.includes("INSERT INTO integration_auth_transactions"));
assert.ok(authTransactionInsert);
assert.ok(authTransactionInsert.values.at(-3) instanceof Date);
assert.ok(authTransactionInsert.values.at(-2) instanceof Date);
assert.ok(authTransactionInsert.values.at(-1) instanceof Date);

const reviewExecutions: Array<{ sql: string; values: unknown[] }> = [];
const reviewQueries: Array<{ sql: string; values: unknown[] }> = [];
const pendingToolRow = {
  id: "tool_calendar_create",
  connection_id: "connection_a",
  team_id: "team_a",
  remote_name: "calendar.create_event",
  stable_alias: "",
  display_name: "创建 Google Calendar 会议",
  description: "",
  input_schema_json: { type: "object", properties: {} },
  output_schema_json: null,
  schema_hash: "d".repeat(64),
  risk_level: 1,
  tool_status: "pending_review",
  revision_no: 1,
  discovered_at: new Date("2026-09-22T13:50:33.214Z"),
  reviewed_at: null,
  reviewed_by: "",
  permission_code: "",
  review_json: {},
  created_at: new Date("2026-09-22T13:50:33.214Z"),
  updated_at: new Date("2026-09-22T13:50:33.214Z")
};
const reviewExecute = async (sql: string, values: unknown[] = []) => {
  reviewExecutions.push({ sql, values });
  return [{ affectedRows: 1 }, []];
};
const reviewPool = {
  query: async (sql: string, values: unknown[] = []) => {
    reviewQueries.push({ sql, values });
    return [sql.includes("integration_tool_snapshots") ? [pendingToolRow] : [], []];
  },
  execute: reviewExecute,
  getConnection: async () => ({
    beginTransaction: async () => undefined,
    execute: reviewExecute,
    commit: async () => undefined,
    rollback: async () => undefined,
    release: () => undefined
  })
} as unknown as Pool;
const reviewRepository = new MysqlIntegrationControlRepository(reviewPool);
const reviewedTool = await reviewRepository.reviewTool(
  pendingToolRow.id,
  { type: "team", teamId: "team_a" },
  {
    status: "active",
    stableAlias: "calendar.create_event",
    riskLevel: 4,
    permissionCode: "calendar.create_event",
    review: { approvalPolicy: "always" },
    reviewerId: "admin_a"
  }
);
await reviewRepository.replaceGrants(reviewedTool, "admin_a", [{
  subjectType: "team",
  subjectId: "team_a",
  permissionCode: "calendar.create_event",
  constraints: { dailyCallLimit: 100 }
}]);
const toolReviewUpdate = reviewExecutions.find((item) => item.sql.includes("reviewed_at=?"));
assert.ok(toolReviewUpdate);
assert.ok(toolReviewUpdate.values.at(6) instanceof Date);
assert.ok(toolReviewUpdate.values.at(7) instanceof Date);
const grantInsert = reviewExecutions.find((item) => item.sql.includes("INSERT INTO integration_tool_grants"));
assert.ok(grantInsert);
assert.ok(grantInsert.values.at(-2) instanceof Date);
assert.ok(grantInsert.values.at(-1) instanceof Date);

const teamWorkspaceTool = await reviewRepository.findActiveWorkspaceToolByRemoteName(
  "calendar.list_events",
  { id: "sales_a", teamId: "team_a" } as never,
  "google-workspace"
);
assert.ok(teamWorkspaceTool);
const workspaceLookup = reviewQueries.find((item) => item.sql.includes("JOIN integration_connectors d"));
assert.ok(workspaceLookup);
assert.match(workspaceLookup.sql, /c\.connection_scope='team'/u);
assert.match(workspaceLookup.sql, /c\.connection_scope='personal'/u);
assert.deepEqual(workspaceLookup.values.slice(0, 4), ["calendar.list_events", "team_a", "sales_a", "google-workspace"]);

const callExecutions: Array<{ sql: string; values: unknown[] }> = [];
const callExecute = async (sql: string, values: unknown[] = []) => {
  callExecutions.push({ sql, values });
  return [{ affectedRows: 1 }, []];
};
const callPool = {
  query: async () => [[], []],
  getConnection: async () => ({
    beginTransaction: async () => undefined,
    query: async () => [[], []],
    execute: callExecute,
    commit: async () => undefined,
    rollback: async () => undefined,
    release: () => undefined
  })
} as unknown as Pool;
const callRepository = new MysqlIntegrationControlRepository(callPool);
await callRepository.createReadCall({
  id: "call_calendar_list",
  requestId: "request_calendar_list",
  teamId: "team_a",
  ownerId: "sales_a",
  actorId: "sales_a",
  actorAuthVersion: 1,
  connectionId: "connection_google_workspace",
  toolSnapshotId: "tool_calendar_list",
  riskLevel: 2,
  inputHash: "e".repeat(64),
  inputSummary: { fields: ["pageSize"] },
  dailyCallLimit: 100,
  inputBytes: 20,
  idempotencyKeyHash: "f".repeat(64),
  artifact: {
    id: "artifact_calendar_list",
    encryptedValue: "encrypted",
    contentHash: "e".repeat(64),
    keyVersion: "v1",
    expiresAt: "2026-09-29T14:31:50.280Z"
  },
  createdAt: "2026-09-22T14:31:50.280Z"
});
const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
for (const execution of callExecutions) {
  assert.equal(
    execution.values.some((value) => typeof value === "string" && isoTimestamp.test(value)),
    false,
    `工具调用 MySQL DATETIME 参数不能直接使用 ISO 字符串：${execution.sql}`
  );
}

console.log(JSON.stringify({
  ok: true,
  personalScope: personalA.length,
  teamScope: teamA.length,
  platformScopeRequiresExplicitDecision: platform.length,
  crossTeamConnectionHidden: true,
  connectionTimestampsUseMysqlDates: true,
  connectorTimestampsUseMysqlDates: true,
  oauthTimestampsUseMysqlDates: true,
  toolReviewTimestampsUseMysqlDates: true,
  workspaceTeamScopeSupported: true,
  toolCallTimestampsUseMysqlDates: true
}, null, 2));
