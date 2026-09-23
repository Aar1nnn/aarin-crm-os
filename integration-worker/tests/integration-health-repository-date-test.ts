import assert from "node:assert/strict";
import type { Pool } from "mysql2/promise";
import { IntegrationWorkerRepository } from "../src/repository.js";

const executions: Array<{ sql: string; values: unknown[] }> = [];
const queries: Array<{ sql: string; values: unknown[] }> = [];

const connection = {
  beginTransaction: async () => undefined,
  query: async (sql: string, values: unknown[] = []) => {
    queries.push({ sql, values });
    if (sql.includes("FROM integration_connections")) {
      return [[{ team_id: "team_a", connection_status: "active" }], []];
    }
    if (sql.includes("FROM integration_circuit_states")) {
      return [[{ circuit_state: "closed", consecutive_failures: 0, consecutive_successes: 0 }], []];
    }
    return [[], []];
  },
  execute: async (sql: string, values: unknown[] = []) => {
    executions.push({ sql, values });
    return [{ affectedRows: 1 }, []];
  },
  commit: async () => undefined,
  rollback: async () => undefined,
  release: () => undefined
};

const pool = {
  query: async (sql: string, values: unknown[] = []) => {
    queries.push({ sql, values });
    return [[], []];
  },
  getConnection: async () => connection
} as unknown as Pool;

const repository = new IntegrationWorkerRepository(pool);
await repository.listHealthCheckConnectionIds();
await repository.recordHealthSuccess("connection_google_workspace", 12);
await repository.recordHealthFailure(
  "connection_google_workspace",
  new Error("INTEGRATION_REMOTE_UNAVAILABLE: test failure"),
  18
);

const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
for (const statement of [...queries, ...executions]) {
  assert.equal(
    statement.values.some((value) => typeof value === "string" && isoTimestamp.test(value)),
    false,
    `MySQL DATETIME 参数不能直接使用 ISO 字符串：${statement.sql}`
  );
}

assert.ok(
  [...queries, ...executions].some((statement) => statement.values.some((value) => value instanceof Date)),
  "健康检查 SQL 应使用 Date 参数"
);

console.log(JSON.stringify({
  ok: true,
  healthCheckTimestampsUseMysqlDates: true,
  statementsChecked: queries.length + executions.length
}, null, 2));
