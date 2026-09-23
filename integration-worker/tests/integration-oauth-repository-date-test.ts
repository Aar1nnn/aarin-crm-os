import assert from "node:assert/strict";
import type { Pool } from "mysql2/promise";
import {
  IntegrationWorkerRepository,
  type WorkerAuthTransaction
} from "../src/repository.js";

const executions: Array<{ sql: string; values: unknown[] }> = [];
const execute = async (sql: string, values: unknown[] = []) => {
  executions.push({ sql, values });
  return [{ affectedRows: 1 }, []];
};
const connection = {
  beginTransaction: async () => undefined,
  query: async () => [[], []],
  execute,
  commit: async () => undefined,
  rollback: async () => undefined,
  release: () => undefined
};
const pool = {
  execute,
  getConnection: async () => connection
} as unknown as Pool;
const repository = new IntegrationWorkerRepository(pool);
const transaction: WorkerAuthTransaction = {
  transactionId: "transaction_google_workspace",
  transactionStatus: "created",
  encryptedContext: "encrypted",
  redirectUri: "http://127.0.0.1:4190/api/integrations/oauth/callback/google-workspace",
  issuer: "https://accounts.google.com",
  resourceUri: "https://www.googleapis.com",
  expiresAt: "2026-09-22T13:30:44.415Z",
  connectionId: "connection_google_workspace",
  connectorId: "connector_google_workspace",
  connectorCode: "google-workspace",
  teamId: "team_a",
  ownerId: "sales_a",
  status: "authorizing",
  manifest: {} as never
};

await repository.markAuthorizationReady({
  transaction,
  encryptedContext: "prepared",
  issuer: "https://accounts.google.com",
  resourceUri: "https://www.googleapis.com"
});
await repository.completeAuthorization({
  transaction: { ...transaction, transactionStatus: "callback_received" },
  encryptedTransactionContext: "completed",
  encryptedCredential: "credential",
  tokenFingerprint: "a".repeat(64),
  expiresAt: "2026-09-22T14:20:44.415Z",
  accountSummary: { email: "user@example.com" }
});
await repository.applyDiscovery(transaction, {
  protocolVersion: "1",
  serverName: "Google Workspace",
  serverVersion: "1",
  capabilities: {},
  tools: []
}, "initial");

const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
for (const execution of executions) {
  assert.equal(
    execution.values.some((value) => typeof value === "string" && isoTimestamp.test(value)),
    false,
    `MySQL DATETIME 参数不能直接使用 ISO 字符串：${execution.sql}`
  );
}

console.log(JSON.stringify({
  ok: true,
  oauthAndDiscoveryTimestampsUseMysqlDates: true,
  statementsChecked: executions.length
}, null, 2));
