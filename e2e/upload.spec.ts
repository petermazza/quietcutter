import { expect, test } from "@playwright/test";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import { signInWithOtp } from "./helpers";

const execFileAsync = promisify(execFile);

async function makeTestWav(): Promise<string> {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "qc-e2e-")), "e2e.wav");
  await execFileAsync("ffmpeg", [
    "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono:d=2",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
    "-filter_complex", "[0][1][2]concat=n=3:v=0:a=1",
    "-ar", "44100", "-ac", "1",
    file,
  ]);
  return file;
}

test("a signed-in user can upload audio and see it processed", async ({ page }) => {
  await page.goto("/");

  await signInWithOtp(page, `e2e-upload-${Date.now()}@test.quietcutter.dev`);

  const wav = await makeTestWav();
  await page.getByTestId("input-file").setInputFiles(wav);

  // The file card appears, then the processed duration fills in once ffmpeg finishes.
  await expect(page.locator('[data-testid^="card-file-"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid^="text-processed-duration-"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-testid^="button-delete-file-"]')).toBeVisible();
});
