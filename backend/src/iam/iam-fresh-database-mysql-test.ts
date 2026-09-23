import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";
import { createMysqlStore } from "../mysql-store.js";

function connectionOptions(databaseUrl: URL) {
  return {
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password)
  };
}

async function main() {
  const configuredUrl = process.env.MYSQL_TEST_ADMIN_URL;
  if (!configuredUrl) {
    throw new Error("Fresh-database IAM test requires MYSQL_TEST_ADMIN_URL");
  }

  const adminUrl = new URL(configuredUrl);
  const databaseName = `goodjob_iam_fresh_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const admin = await mysql.createConnection(connectionOptions(adminUrl));
  let databaseCreated = false;
  let store: Awaited<ReturnType<typeof createMysqlStore>> | undefined;

  try {
    await admin.query(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    databaseCreated = true;
    const testUrl = new URL(configuredUrl);
    testUrl.pathname = `/${databaseName}`;
    process.env.DATABASE_URL = testUrl.toString();
    delete process.env.MYSQL_URL;
    process.env.CRM_SEED_DEVELOPMENT_DATA = "true";

    store = await createMysqlStore();

    const [membershipRows] = await admin.query<Array<RowDataPacket>>(
      `SELECT u.id AS user_id, u.role, u.team_id, tm.id AS membership_id,
              tm.status, ou.id AS org_unit_id, mra.id AS role_assignment_id
       FROM \`${databaseName}\`.users u
       LEFT JOIN \`${databaseName}\`.tenant_memberships tm
         ON tm.user_id = u.id AND tm.tenant_id = u.team_id
       LEFT JOIN \`${databaseName}\`.organization_units ou
         ON ou.id = tm.primary_org_unit_id AND ou.tenant_id = tm.tenant_id
       LEFT JOIN \`${databaseName}\`.member_role_assignments mra
         ON mra.membership_id = tm.id AND mra.tenant_id = tm.tenant_id
       WHERE u.role <> 'super_admin'
       ORDER BY u.id`
    );
    assert.equal(membershipRows.length, 4);
    for (const row of membershipRows) {
      assert.equal(row.team_id, "europe");
      assert.equal(row.status, "active");
      assert.ok(row.membership_id, `missing tenant membership for ${row.user_id}`);
      assert.ok(row.org_unit_id, `missing primary organization unit for ${row.user_id}`);
      assert.ok(row.role_assignment_id, `missing role assignment for ${row.user_id}`);
    }

    const [tenantRows] = await admin.query<Array<RowDataPacket>>(
      `SELECT id, status FROM \`${databaseName}\`.tenants ORDER BY id`
    );
    assert.deepEqual(
      tenantRows.map((row) => ({ id: row.id, status: row.status })),
      [{ id: "europe", status: "active" }]
    );

    const [platformRows] = await admin.query<Array<RowDataPacket>>(
      `SELECT po.user_id, pora.role_id
       FROM \`${databaseName}\`.platform_operators po
       JOIN \`${databaseName}\`.platform_operator_role_assignments pora
         ON pora.operator_id = po.id
       JOIN \`${databaseName}\`.users u ON u.id = po.user_id
       WHERE u.role = 'super_admin'`
    );
    assert.equal(platformRows.length, 1);
    assert.equal(platformRows[0]?.role_id, "platform_owner");

    console.log(JSON.stringify({
      ok: true,
      singleStartup: true,
      tenants: tenantRows.length,
      memberships: membershipRows.length,
      platformOperators: platformRows.length
    }, null, 2));
  } finally {
    await store?.close?.();
    if (databaseCreated) {
      await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    }
    await admin.end();
  }
}

await main();
