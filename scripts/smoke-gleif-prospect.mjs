import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";

function readEnv(path) {
  const result = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/u)) {
    const match = line.match(/^([^#=]+)=(.*)$/u);
    if (!match) continue;
    result[match[1].trim()] = match[2].trim().replace(/^["']|["']$/gu, "");
  }
  return result;
}

const environment = readEnv(process.argv[2] || ".env.development.local");
if (!environment.DATABASE_URL || !environment.JWT_SECRET) {
  throw new Error("DATABASE_URL and JWT_SECRET are required");
}

const database = await mysql.createConnection(environment.DATABASE_URL);
let actor;
try {
  const [rows] = await database.query(
    `SELECT id,auth_version FROM users
     WHERE status='active' AND role<>'super_admin'
     ORDER BY FIELD(role,'admin','manager','sales'),created_at LIMIT 1`
  );
  actor = rows[0];
} finally {
  await database.end();
}
if (!actor) throw new Error("No active CRM business user is available for the smoke test");

const token = jwt.sign(
  { ver: Number(actor.auth_version || 1), mfa: false },
  environment.JWT_SECRET,
  {
    subject: actor.id,
    issuer: "goodjob-crm",
    audience: "goodjob-crm-web",
    expiresIn: 10 * 60,
    jwtid: randomBytes(16).toString("hex"),
    algorithm: "HS256"
  }
);

const requestBody = {
  goal: "Verify the legal entity for Siemens Aktiengesellschaft",
  productKeywords: "Siemens Aktiengesellschaft",
  countries: "",
  industry: "",
  customerType: "",
  excludeKeywords: "",
  sources: ["gleif"],
  useAi: false,
  limit: 5
};

async function search() {
  const startedAt = Date.now();
  const rawBody = JSON.stringify(requestBody);
  const { statusCode, text } = await new Promise((resolve, reject) => {
    const request = http.request({
      hostname: "127.0.0.1",
      port: 4190,
      path: "/api/lead-finder/search",
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(rawBody)
      }
    }, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { responseBody += chunk; });
      response.on("end", () => resolve({ statusCode: response.statusCode || 500, text: responseBody }));
    });
    request.once("error", reject);
    request.end(rawBody);
  });
  const payload = JSON.parse(text);
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`GLEIF smoke test failed with HTTP ${statusCode}: ${JSON.stringify(payload)}`);
  }
  return { payload, durationMs: Date.now() - startedAt };
}

const first = await search();
const second = await search();
const summarize = ({ payload, durationMs }) => ({
  requestedAt: new Date().toISOString(),
  durationMs,
  runId: payload.runId,
  sourceStats: payload.sourceStats,
  incrementalStats: payload.incrementalStats,
  opportunities: (payload.opportunities || []).map((item) => ({
    id: item.id,
    company: item.company,
    country: item.country,
    status: item.status,
    source: item.source,
    confidence: item.confidence,
    providerRecordId: item.sourceEvidence?.[0]?.providerRecordId || "",
    sourceUrl: item.sourceEvidence?.[0]?.sourceUrl || ""
  }))
});
const firstSummary = summarize(first);
const secondSummary = summarize(second);
console.log(JSON.stringify({
  first: firstSummary,
  second: secondSummary,
  duplicatePrevented: firstSummary.opportunities.some((left) =>
    secondSummary.opportunities.some((right) => left.id === right.id)
  )
}, null, 2));
