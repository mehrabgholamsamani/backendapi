import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const readJsonArray = async <T>(filePath: string): Promise<T[]> => {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
};

export const writeJsonArray = async <T>(filePath: string, items: T[]) => {
  await mkdir(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(items, null, 2)}\n`);
  await rename(tempPath, filePath);
};
