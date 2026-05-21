import fs from "fs";
import path from "path";

function databaseFileIsWritable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    const fd = fs.openSync(filePath, "r+");
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves a writable SQLite file URL. If the seeded db is read-only (e.g.
 * owned by root after docker seed), copies it to data/greenroom.local.db.
 */
export function resolveDatabaseUrl(): string {
  const configured = process.env.DATABASE_URL;
  if (configured && !configured.startsWith("file:")) {
    return configured;
  }

  const defaultPath = path.resolve(
    process.cwd(),
    configured?.replace(/^file:/, "") ?? "data/greenroom.db",
  );

  if (databaseFileIsWritable(defaultPath)) {
    return `file:${defaultPath}`;
  }

  const localPath = path.resolve(process.cwd(), "data/greenroom.local.db");
  if (!fs.existsSync(localPath)) {
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.copyFileSync(defaultPath, localPath);
    console.warn(
      `[greenroom] Primary database is read-only; using writable copy at ${localPath}`,
    );
  } else if (!databaseFileIsWritable(localPath)) {
    throw new Error(
      `Database is not writable. Fix permissions on ${defaultPath} or ${localPath}.`,
    );
  }

  return `file:${localPath}`;
}
