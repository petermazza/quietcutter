import { db } from "./db";
import {
  projects,
  type Project,
  type CreateProjectRequest,
  type UpdateProjectRequest,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: CreateProjectRequest): Promise<Project>;
  updateProject(id: number, updates: UpdateProjectRequest): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(projects.createdAt);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: CreateProjectRequest): Promise<Project> {
    const [created] = await db.insert(projects).values({
      name: project.name,
      originalFileName: project.originalFileName,
      status: "pending",
      silenceThreshold: project.silenceThreshold ?? -40,
      minSilenceDuration: project.minSilenceDuration ?? 500,
    }).returning();
    return created;
  }

  async updateProject(id: number, updates: UpdateProjectRequest): Promise<Project | undefined> {
    const [updated] = await db.update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
