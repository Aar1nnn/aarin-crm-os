import { spawn } from "node:child_process";
import process from "node:process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const definitions = [
  {
    name: "crm-api",
    args: ["run", "dev", "--workspace", "backend"],
    env: { CRM_STORE: "mysql" }
  },
  {
    name: "crm-web",
    args: ["run", "dev", "--workspace", "frontend"]
  },
  {
    name: "integration-worker",
    args: ["run", "dev", "--workspace", "integration-worker"]
  },
  {
    name: "whatsapp",
    args: ["--prefix", "whatsapp-plugin", "run", "dev"],
    env: { DATABASE_CLIENT: "mysql", PORT: "3100" }
  }
];

const children = new Map();
let shuttingDown = false;

function stopAll(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children.values()) {
    if (!child.killed) child.kill(signal);
  }
}

for (const definition of definitions) {
  const child = spawn(npm, definition.args, {
    cwd: process.cwd(),
    env: { ...process.env, ...definition.env },
    shell: process.platform === "win32",
    stdio: "inherit"
  });
  children.set(definition.name, child);
  child.once("error", (error) => {
    console.error(`[${definition.name}] ${error.message}`);
    process.exitCode = 1;
    stopAll();
  });
  child.once("exit", (code, signal) => {
    children.delete(definition.name);
    if (shuttingDown) {
      if (!children.size) process.exit(process.exitCode || 0);
      return;
    }
    console.error(`[${definition.name}] exited (${signal || code || 0})`);
    process.exitCode = code || 1;
    stopAll();
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopAll(signal);
  });
}
