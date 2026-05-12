import { restorePlatformStore } from "../src/lib/platform/backup";

async function main() {
  const backupPath = process.argv[2];
  if (!backupPath) {
    throw new Error("Usage: npm run demo:restore -- <backup-path>");
  }

  const store = await restorePlatformStore({ backupPath });
  console.log(`Restored .lexnet-data/store.json from ${backupPath}`);
  console.log(`Restored ${store.cases.length} cases and ${store.publishedPassports.length} passports.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
