import { spawn } from "node:child_process";

import { chooseDemoDevPort } from "./dev-port";

async function main() {
  const port = await chooseDemoDevPort();
  console.log(`Starting LexNet demo dev server at http://localhost:${port}`);

  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-p", String(port)],
    { stdio: "inherit" },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 0;
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
