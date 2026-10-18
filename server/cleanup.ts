import { logger } from "./lib/logger";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Deletes on-disk files for records older than seven days, then clears the
// stored paths so cleaned rows are never scanned again. Returns the number
// of files removed. Exported so tests can run it on demand instead of
// waiting for the daily timer.
export async function cleanupOldFiles(): Promise<number> {
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const { promises: fs } = await import("fs");

    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
    logger.info("Running file cleanup job");

    const result = await db.execute(sql`
      SELECT id, processed_file_path, original_file_path 
      FROM project_files 
      WHERE created_at < ${sevenDaysAgo}
      AND (processed_file_path IS NOT NULL OR original_file_path IS NOT NULL)
    `);

    let deletedCount = 0;
    for (const file of result.rows as any[]) {
      for (const filePath of [file.processed_file_path, file.original_file_path]) {
        if (filePath) {
          try {
            await fs.unlink(filePath);
            deletedCount++;
          } catch {
            // File may already be deleted
          }
        }
      }
      // Clear the stored paths so this row is never scanned again.
      await db.execute(sql`
        UPDATE project_files
        SET processed_file_path = NULL, original_file_path = NULL
        WHERE id = ${file.id}
      `);
    }

    if (deletedCount > 0) {
      logger.info("Cleanup job: Deleted old files", "cleanup", { deletedCount });
    }
    return deletedCount;
  } catch (err) {
    logger.error("File cleanup job failed", "cleanup", {}, err as Error);
    return 0;
  }
}
