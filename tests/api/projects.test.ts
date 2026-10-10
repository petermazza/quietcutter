import { describe, expect, it } from "vitest";
import { TestClient, uniqueEmail } from "../helpers/http";

describe("projects", () => {
  it("returns an empty list for anonymous visitors", async () => {
    const client = new TestClient();
    const res = await client.get("/api/projects");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("creates, reads, updates and deletes a project", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("crud"));

    const created = await client.post("/api/projects", { name: "My Podcast" });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const fetched = await client.get(`/api/projects/${id}`);
    expect(fetched.body.name).toBe("My Podcast");
    expect(fetched.body.files).toEqual([]);

    const renamed = await client.patch(`/api/projects/${id}`, { name: "Renamed" });
    expect(renamed.body.name).toBe("Renamed");

    const deleted = await client.delete(`/api/projects/${id}`);
    expect(deleted.status).toBe(204);
    const gone = await client.get(`/api/projects/${id}`);
    expect(gone.status).toBe(404);
  });

  it("saves per-project processing settings", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("settings"));

    const created = await client.post("/api/projects", {
      name: "Settings Test",
      silenceThreshold: -35,
      minSilenceDuration: 600,
      outputFormat: "wav",
    });
    expect(created.status).toBe(201);
    expect(created.body.silenceThreshold).toBe(-35);
    expect(created.body.minSilenceDuration).toBe(600);
    expect(created.body.outputFormat).toBe("wav");
  });

  it("toggles favorite status and lists favorites", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("fav"));

    const created = await client.post("/api/projects", { name: "Fav Me" });
    const id = created.body.id;

    const fav = await client.patch(`/api/projects/${id}/favorite`, { isFavorite: true });
    expect(fav.body.isFavorite).toBe(true);

    const favs = await client.get("/api/projects/favorites");
    expect(favs.body.map((p: any) => p.id)).toContain(id);

    await client.patch(`/api/projects/${id}/favorite`, { isFavorite: false });
    const favsAfter = await client.get("/api/projects/favorites");
    expect(favsAfter.body.map((p: any) => p.id)).not.toContain(id);
  });

  it("blocks other users from reading, changing, or deleting a project", async () => {
    const owner = new TestClient();
    await owner.register(uniqueEmail("owner"));
    const created = await owner.post("/api/projects", { name: "Private" });
    const id = created.body.id;

    const stranger = new TestClient();
    await stranger.register(uniqueEmail("stranger"));

    expect((await stranger.get(`/api/projects/${id}`)).status).toBe(403);
    expect((await stranger.patch(`/api/projects/${id}`, { name: "Hacked" })).status).toBe(403);
    expect((await stranger.delete(`/api/projects/${id}`)).status).toBe(403);

    const list = await stranger.get("/api/projects");
    expect(list.body.map((p: any) => p.id)).not.toContain(id);
  });

  it("requires sign-in for the default project but creates 'My Uploads' for users", async () => {
    const anon = new TestClient();
    expect((await anon.get("/api/projects/default")).status).toBe(401);

    const user = new TestClient();
    await user.register(uniqueEmail("default"));
    const res = await user.get("/api/projects/default");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("My Uploads");

    const again = await user.get("/api/projects/default");
    expect(again.body.id).toBe(res.body.id);
  });

  it("enforces the 1-project limit for free accounts", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("limit"));

    await client.post("/api/projects", { name: "First" });
    const second = await client.post("/api/projects", { name: "Second" });
    expect(second.status).toBe(201);

    const list = await client.get("/api/projects");
    expect(list.body.length).toBe(1);
    expect(list.body[0].name).toBe("Second");
  });
});
