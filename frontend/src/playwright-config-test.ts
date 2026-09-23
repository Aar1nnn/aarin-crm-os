import assert from "node:assert/strict";
import playwrightConfig from "../playwright.config.js";

assert.ok(Array.isArray(playwrightConfig.webServer));
assert.equal(playwrightConfig.webServer.length, 2);

const [backendServer, frontendServer] = playwrightConfig.webServer;
assert.ok(backendServer);
assert.ok(frontendServer);

for (const server of playwrightConfig.webServer) {
  assert.doesNotMatch(
    server.command,
    /^\s*[A-Za-z_][A-Za-z0-9_]*=/u,
    "Playwright webServer commands must not use shell-specific inline environment assignments"
  );
}

assert.equal(
  backendServer.command,
  "node node_modules/tsx/dist/cli.mjs backend/src/server.ts"
);
assert.deepEqual(backendServer.env, {
  NODE_ENV: "e2e",
  CRM_STORE: "memory",
  PORT: "4288"
});
assert.equal(backendServer.timeout, 60_000);
assert.equal(
  frontendServer.command,
  "node node_modules/vite/bin/vite.js frontend --host 127.0.0.1 --port 5288"
);
assert.deepEqual(frontendServer.env, {
  VITE_API_TARGET: "http://127.0.0.1:4288"
});
assert.equal(frontendServer.timeout, 30_000);

console.log("Playwright cross-platform webServer configuration test passed");
