import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const workerRoot = resolve(import.meta.dirname, "..");
const tsxCli = resolve(workerRoot, "../node_modules/tsx/dist/cli.mjs");
const tests = [
  "src/runtime-config-test.ts",
  "tests/native-mcp-client-test.ts",
  "tests/connector-driver-compliance-test.ts",
  "tests/connector-failure-boundaries-test.ts",
  "tests/oauth-client-test.ts",
  "tests/integration-execution-test.ts",
  "tests/microsoft-graph-connector-driver-test.ts",
  "tests/google-workspace-connector-driver-test.ts",
  "tests/integration-oauth-repository-date-test.ts",
  "tests/integration-health-repository-date-test.ts",
  "tests/integration-tool-call-repository-date-test.ts",
  "tests/second-batch-connectors-test.ts",
  "tests/wecom-connector-driver-test.ts",
  "tests/integration-webhook-event-test.ts",
  "tests/integration-webhook-lease-test.ts"
];

for (const test of tests) {
  const result = spawnSync(process.execPath, [tsxCli, test], {
    cwd: workerRoot,
    env: { ...process.env, NODE_ENV: "test" },
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
