import { readFileSync } from "node:fs";
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

async function safeQuery(connection, sql) {
  try {
    const [rows] = await connection.query(sql);
    return rows;
  } catch (error) {
    return [{ unavailable: error instanceof Error ? error.message : String(error) }];
  }
}

const environment = readEnv(process.argv[2] || ".env.development.local");
if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is missing");

const database = await mysql.createConnection(environment.DATABASE_URL);
try {
  const [ai, google, whatsapp, whatsappCounts] = await Promise.all([
    safeQuery(database, `SELECT provider,protocol,model,enabled,
      COALESCE(api_key,'')<>'' AS has_key,last_test_status,last_test_at
      FROM ai_model_configs ORDER BY updated_at DESC`),
    safeQuery(database, `SELECT c.code AS connector_code,x.connection_status,
      x.display_name,x.last_health_at,x.last_error_code
      FROM integration_connections x
      JOIN integration_connectors c ON c.id=x.connector_id
      WHERE c.code='google-workspace'
      ORDER BY x.updated_at DESC`),
    safeQuery(database, `SELECT name,provider,status,
      phone<>'' AS has_phone,last_connected_at,last_event_at,
      COALESCE(last_error,'') AS last_error,
      qr_data_url IS NOT NULL AND qr_data_url<>'' AS has_qr
      FROM channel_accounts WHERE provider<>'demo' ORDER BY updated_at DESC`),
    safeQuery(database, `SELECT
      (SELECT COUNT(*) FROM provider_session_keys) AS session_keys,
      (SELECT COUNT(*) FROM contacts) AS contacts,
      (SELECT COUNT(*) FROM conversations) AS conversations,
      (SELECT COUNT(*) FROM messages) AS messages`)
  ]);
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    runtimeFlags: {
      integrationEnabled: environment.INTEGRATION_ENABLED === "true",
      integrationWorkerEnabled: environment.INTEGRATION_WORKER_ENABLED === "true",
      googleClientIdConfigured: Boolean(environment.INTEGRATION_GOOGLE_CLIENT_ID),
      googleClientSecretConfigured: Boolean(environment.INTEGRATION_OAUTH_GOOGLE_CLIENT_SECRET)
    },
    ai,
    google,
    whatsapp,
    whatsappCounts
  }, null, 2));
} finally {
  await database.end();
}
