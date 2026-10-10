import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);

export function tmpFile(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qc-test-"));
  return path.join(dir, name);
}

// 1s tone + 2s silence + 1s tone = 4s of audio with a known silence in the middle.
export async function makeAudioWithSilence(filePath: string): Promise<string> {
  await execFileAsync("ffmpeg", [
    "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono:d=2",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
    "-filter_complex", "[0][1][2]concat=n=3:v=0:a=1",
    "-ar", "44100", "-ac", "1",
    filePath,
  ]);
  return filePath;
}

// A tiny mp4 with a 1s tone — used to exercise the video path.
export async function makeVideoWithAudio(filePath: string): Promise<string> {
  await execFileAsync("ffmpeg", [
    "-y", "-f", "lavfi", "-i", "testsrc=duration=1:size=160x120:rate=10",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
    "-shortest", "-pix_fmt", "yuv420p",
    filePath,
  ]);
  return filePath;
}

// A dummy file full of zeros — used to test size limits, never processed.
export function makeOversizedFile(filePath: string, bytes: number): string {
  const fd = fs.openSync(filePath, "w");
  fs.writeSync(fd, Buffer.alloc(1024 * 1024), 0, 1024 * 1024, 0);
  fs.closeSync(fd);
  fs.truncateSync(filePath, bytes);
  return filePath;
}

export async function audioDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", filePath,
  ]);
  return parseFloat(stdout.trim());
}

export function formWithFile(fieldName: string, filePath: string, extraFields: Record<string, string> = {}): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(extraFields)) form.append(k, v);
  const data = fs.readFileSync(filePath);
  form.append(fieldName, new Blob([data]), path.basename(filePath));
  return form;
}
