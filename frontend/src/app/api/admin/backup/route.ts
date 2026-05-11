import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { checksum, createId, now, readStore, writeStore } from "@/lib/platform/store";
import { ensurePlatformDefaults } from "@/lib/platform/ops";

export async function POST() {
  const store = await readStore();
  ensurePlatformDefaults(store);
  const backupDir = path.join(process.cwd(), ".lexnet-data", "backups");
  await mkdir(backupDir, { recursive: true });
  const id = createId("backup");
  const filePath = path.join(backupDir, `${id}.json`);
  const content = JSON.stringify(store, null, 2);
  await writeFile(filePath, content, "utf8");
  const backup = { id, path: filePath, checksum: checksum(content), createdAt: now() };
  store.backups.push(backup);
  store.security.lastBackupAt = backup.createdAt;
  await writeStore(store);
  return NextResponse.json({ backup }, { status: 201 });
}
