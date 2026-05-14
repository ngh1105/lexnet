import { backupPlatformStore } from "../src/lib/platform/backup";

async function main() {
  const result = await backupPlatformStore();
  console.log(`Backed up .lexnet-data/store.json to ${result.backupPath}`);
  console.log(`Snapshot includes ${result.store.cases.length} cases and ${result.store.publishedPassports.length} passports.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
