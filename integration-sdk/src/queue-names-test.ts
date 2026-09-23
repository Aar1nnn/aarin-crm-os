import assert from "node:assert/strict";
import { INTEGRATION_QUEUE_NAMES } from "./queue-names.js";

const queueNames = Object.values(INTEGRATION_QUEUE_NAMES);

assert.deepEqual(queueNames, [
  "goodjob-integration-control",
  "goodjob-integration-tool-calls",
  "goodjob-integration-events"
]);
assert.equal(new Set(queueNames).size, queueNames.length);
for (const queueName of queueNames) {
  assert.match(queueName, /^[a-z0-9][a-z0-9-]*$/u);
  assert.doesNotMatch(queueName, /:/u);
}

console.log(JSON.stringify({
  ok: true,
  bullMqCompatible: true,
  unique: true,
  queueNames
}, null, 2));
