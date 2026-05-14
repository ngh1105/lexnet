import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  DEFAULT_PLATFORM_STORE_PATH,
  readPlatformStore,
  writePlatformStore,
} from "./store";
import type { PlatformStore } from "./types";

export type BackupPlatformStoreOptions = {
  storePath?: string;
  backupPath?: string;
  createdAt?: string;
};

export type RestorePlatformStoreOptions = {
  storePath?: string;
  backupPath: string;
};

export async function backupPlatformStore({
  storePath = DEFAULT_PLATFORM_STORE_PATH,
  backupPath,
  createdAt = new Date().toISOString(),
}: BackupPlatformStoreOptions = {}): Promise<{ backupPath: string; store: PlatformStore }> {
  const store = await readPlatformStore(storePath);
  const targetPath = backupPath ?? buildDefaultBackupPath(storePath, createdAt);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  return { backupPath: targetPath, store };
}

export async function restorePlatformStore({
  storePath = DEFAULT_PLATFORM_STORE_PATH,
  backupPath,
}: RestorePlatformStoreOptions): Promise<PlatformStore> {
  const raw = await readFile(backupPath, "utf8");
  let parsed: PlatformStore;
  try {
    parsed = JSON.parse(raw) as PlatformStore;
  } catch (error) {
    throw new Error(`Invalid backup JSON at ${backupPath}`, { cause: error });
  }

  const tempPath = `${storePath}.restore-validate-${Date.now()}`;
  try {
    await writePlatformStore(parsed, tempPath);
    const validated = await readPlatformStore(tempPath);
    await writePlatformStore(validated, storePath);
    return validated;
  } finally {
    await rm(tempPath, { force: true });
  }
}

function buildDefaultBackupPath(storePath: string, createdAt: string): string {
  const stamp = createdAt.replace(/\D/g, "").slice(0, 14);
  return join(dirname(storePath), "backups", `store-${stamp}.json`);
}
