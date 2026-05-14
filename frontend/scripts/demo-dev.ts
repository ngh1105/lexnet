import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import { chooseDemoDevPort } from "./dev-port";

export function buildDemoDevEnv(env: Record<string, string | undefined>): Record<string, string | undefined> {
  return {
    ...env,
    LEXNET_ENABLE_DEMO_PRIVATE_API: env.LEXNET_ENABLE_DEMO_PRIVATE_API ?? "true",
  };
}

async function main() {
  const port = await chooseDemoDevPort();
  console.log(`Starting LexNet demo dev server at http://localhost:${port}`);

  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-p", String(port)],
    { env: buildDemoDevEnv(process.env) as NodeJS.ProcessEnv, stdio: "inherit" },
  );

  child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 0;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
