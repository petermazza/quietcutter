import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { TEST_DATABASE_URL } from "../env";
import { insertProjectFile, getProjectFilePaths } from "../helpers/db";

// server/db reads DATABASE_URL when first imported, so point it at the test
// database before cleanup.ts pulls it in.
process.env.DATABASE_URL = TEST_DATABASE_URL;

describe("file cleanup job", () => {
  it("deletes week-old files, clears their paths, and never rescans them", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qc-cleanup-"));
    const orig = path.join(dir, "orig.mp3");
    const proc = path.join(dir, "proc.mp3");
    fs.writeFileSync(orig, "x");
    fs.writeFileSync(proc, "y");

    const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), "qc-cleanup-fresh-"));
    const fresh = path.join(freshDir, "fresh.mp3");
    fs.writeFileSync(fresh, "z");

    const oldId = await insertProjectFile(orig, proc, "8 days");
    const freshId = await insertProjectFile(fresh, fresh, "0 days");

    const { cleanupOldFiles } = await import("../../server/cleanup");

    const first = await cleanupOldFiles();
    expect(first).toBeGreaterThanOrEqual(2);
    expect(fs.existsSync(orig)).toBe(false);
    expect(fs.existsSync(proc)).toBe(false);
    expect(fs.existsSync(fresh)).toBe(true);

    const paths = await getProjectFilePaths(oldId);
    expect(paths.original_file_path).toBeNull();
    expect(paths.processed_file_path).toBeNull();

    // The cleaned row is not picked up again — before the fix, the same rows
    // were scanned on every daily run forever.
    expect(await cleanupOldFiles()).toBe(0);

    const freshPaths = await getProjectFilePaths(freshId);
    expect(freshPaths.original_file_path).toBe(fresh);
  });
});
