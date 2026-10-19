import { describe, expect, it } from "vitest";
import fs from "fs";
import { TestClient, uniqueEmail, waitForFileStatus } from "../helpers/http";
import {
  audioDuration,
  formWithFile,
  makeAudioWithBriefPause,
  makeAudioWithSilence,
  makeOversizedFile,
  makeVideoWithAudio,
  tmpFile,
} from "../helpers/media";

// The server allows 10 uploads per 15 minutes per IP — keep this suite's total
// upload requests comfortably under that.
describe("upload and silence processing", () => {
  it("removes silence from an audio file end to end", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("e2e"));
    const wav = await makeAudioWithSilence(tmpFile("speech.wav"));
    const inputDuration = await audioDuration(wav);
    expect(inputDuration).toBeCloseTo(4, 0);

    const res = await client.postForm(
      "/api/upload",
      formWithFile("audio", wav, { silenceThreshold: "-40", minSilenceDuration: "800" })
    );
    expect(res.status).toBe(201);
    expect(res.body.files.length).toBe(1);

    const file = res.body.files[0];
    const done = await waitForFileStatus(client, res.body.id, file.id, "completed");
    expect(done.processedDurationSec).toBeLessThan(done.originalDurationSec - 1);
    expect(done.processedFilePath).toMatch(/_processed\.mp3$/);

    const download = await client.get(`/api/files/${file.id}/download`);
    expect(download.status).toBe(200);
    expect(download.headers.get("content-disposition")).toContain("_processed.mp3");
  });

  it("uses the 500ms default silence duration when settings are omitted", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("defaults"));
    const wav = await makeAudioWithBriefPause(tmpFile("brief-pause.wav"));

    const res = await client.postForm("/api/upload", formWithFile("audio", wav));
    expect(res.status).toBe(201);

    const file = res.body.files[0];
    const done = await waitForFileStatus(client, res.body.id, file.id, "completed");
    expect(done.minSilenceDuration).toBe(500);
    // The 300ms pause is shorter than the 500ms default, so it must not be cut.
    expect(done.processedDurationSec).toBeGreaterThanOrEqual(2.2);
  });

  it("rejects unsupported file types", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("badtype"));
    const txt = tmpFile("notes.txt");
    fs.writeFileSync(txt, "not audio");

    const res = await client.postForm("/api/upload", formWithFile("audio", txt));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("not a supported file type");
  });

  it("rejects files over the 100MB free limit", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("toobig"));
    const big = makeOversizedFile(tmpFile("big.wav"), 101 * 1024 * 1024);

    const res = await client.postForm("/api/upload", formWithFile("audio", big));
    expect(res.status).toBe(413);
    expect(res.body.message).toContain("100MB");
  });

  it("blocks multi-file upload for free users", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("batch"));

    const wav = await makeAudioWithSilence(tmpFile("a.wav"));
    const form = new FormData();
    const data = fs.readFileSync(wav);
    form.append("audio", new Blob([data]), "one.wav");
    form.append("audio", new Blob([data]), "two.wav");

    const res = await client.postForm("/api/upload", form);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("Pro");
  });

  it("adds uploads to a named project and reprocesses with new settings", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("named"));

    const wav = await makeAudioWithSilence(tmpFile("named.wav"));
    const res = await client.postForm(
      "/api/upload",
      formWithFile("audio", wav, {
        projectName: "Named Upload Test",
        silenceThreshold: "-40",
        minSilenceDuration: "800",
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Named Upload Test");

    const file = res.body.files[0];
    await waitForFileStatus(client, res.body.id, file.id, "completed");

    // Raise the minimum silence length so nothing is cut, then reprocess.
    await client.patch(`/api/projects/${res.body.id}`, { minSilenceDuration: 10000 });
    const reprocess = await client.post(`/api/projects/${res.body.id}/reprocess`, {});
    expect(reprocess.status).toBe(200);

    const redone = await waitForFileStatus(client, res.body.id, file.id, "completed");
    expect(redone.minSilenceDuration).toBe(10000);
    expect(redone.processedDurationSec).toBeGreaterThanOrEqual(3.5);
  });

  it("extracts audio from a video file and processes it", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("vidextract"));
    const mp4 = await makeVideoWithAudio(tmpFile("clip.mp4"));

    const res = await client.postForm("/api/upload", formWithFile("audio", mp4));
    expect(res.status).toBe(201);

    const file = res.body.files[0];
    expect(file.fileType).toBe("video");
    const done = await waitForFileStatus(client, res.body.id, file.id, "completed");
    expect(done.processedFilePath).toMatch(/_processed\.mp3$/);
  });

  it("protects files: stranger blocked, free owner cannot preview, owner can delete", async () => {
    const owner = new TestClient();
    await owner.register(uniqueEmail("fileowner"));
    const wav = await makeAudioWithSilence(tmpFile("private.wav"));

    const res = await owner.postForm("/api/upload", formWithFile("audio", wav, { projectName: "Owner Files" }));
    const file = res.body.files[0];
    await waitForFileStatus(owner, res.body.id, file.id, "completed");

    const stranger = new TestClient();
    await stranger.register(uniqueEmail("filestranger"));
    expect((await stranger.get(`/api/files/${file.id}/download`)).status).toBe(403);
    expect((await stranger.delete(`/api/files/${file.id}`)).status).toBe(403);

    // Preview is Pro-only, so the free owner is blocked too.
    expect((await owner.get(`/api/files/${file.id}/preview`)).status).toBe(403);

    expect((await owner.delete(`/api/files/${file.id}`)).status).toBe(204);
    expect((await owner.get(`/api/files/${file.id}/download`)).status).toBe(404);
  });
});
