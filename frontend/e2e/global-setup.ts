import { execSync } from "node:child_process";
import path from "node:path";

export default async function globalSetup() {
  // Seed demo store so passport and case pages have data
  execSync("npm run demo:seed", {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
  });
}
