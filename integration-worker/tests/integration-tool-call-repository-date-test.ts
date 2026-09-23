import assert from "node:assert/strict";
import type { Pool } from "mysql2/promise";
import { IntegrationWorkerRepository } from "../src/repository.js";

const executions: Array<{ sql: string; values: unknown[] }> = [];
const execute = async (sql: string, values: unknown[] = []) => {
  executions.push({ sql, values });
  return [{ affectedRows: 1 }, []];
};

const manifest = {
  schemaVersion: "1.0",
  stage: "available",
  driver: "native_mcp",
  endpoint: "https://connector.example.test/",
  approvedHosts: ["connector.example.test"],
  allowedPorts: [443],
  authentication: "none",
  maxTools: 10
};

const callRow = {
  call_id: "call_calendar_list",
  request_id: "request_calendar_list",
  team_id: "team_a",
  owner_id: "sales_a",
  actor_id: "sales_a",
  actor_auth_version: 1,
  risk_level: 2,
  connection_id: "connection_google_workspace",
  connector_id: "connector_google_workspace",
  connection_status: "active",
  connector_status: "active",
  manifest_json: manifest,
  tool_snapshot_id: "tool_calendar_list",
  remote_name: "calendar.list_events",
  schema_hash: "a".repeat(64),
  tool_status: "active",
  permission_code: "calendar.list.events.read",
  input_artifact_id: "artifact_input",
  encrypted_value: "encrypted",
  review_json: {},
  user_role: "sales",
  user_status: "active",
  current_auth_version: 1,
  grant_count: 1,
  created_at: new Date("2026-09-22T14:36:33.809Z")
};

const connection = {
  beginTransaction: async () => undefined,
  execute,
  query: async (sql: string) => {
    if (sql.includes("FROM integration_tool_calls c")) return [[callRow], []];
    if (sql.includes("FROM integration_circuit_states")) {
      return [[{ circuit_state: "closed", consecutive_failures: 0 }], []];
    }
    return [[], []];
  },
  commit: async () => undefined,
  rollback: async () => undefined,
  release: () => undefined
};

const pool = {
  getConnection: async () => connection,
  query: async () => [[{ input_hash: "b".repeat(64) }], []]
} as unknown as Pool;

const repository = new IntegrationWorkerRepository(pool);
const claimed = await repository.claimCall(callRow.call_id);
await repository.completeCallSuccess({
  call: claimed,
  outputHash: "c".repeat(64),
  outputSummary: { structuredKeys: ["events"] },
  externalReceipt: "google-workspace://calendar/events",
  evidence: { source: "google-workspace://calendar/events", observedAt: "2026-09-22T14:36:34.000Z" },
  outputBytes: 42,
  artifact: {
    id: "artifact_output",
    encryptedValue: "encrypted-output",
    contentHash: "c".repeat(64),
    keyVersion: "v1",
    expiresAt: "2026-09-29T14:36:34.000Z"
  }
});
await repository.completeCallFailure(claimed, new Error("INTEGRATION_REMOTE_UNAVAILABLE: test"));
await repository.completeCallUnknownOutcome(claimed, new Error("test unknown"));

const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
for (const execution of executions) {
  assert.equal(
    execution.values.some((value) => typeof value === "string" && isoTimestamp.test(value)),
    false,
    `工具调用 MySQL DATETIME 参数不能直接使用 ISO 字符串：${execution.sql}`
  );
}

console.log(JSON.stringify({
  ok: true,
  toolCallTimestampsUseMysqlDates: true,
  statementsChecked: executions.length
}, null, 2));
