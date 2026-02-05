import { type Project, type InsertProject } from "@shared/schema";
import { projects } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, status: string, outputUrl?: string): Promise<Project>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, status: string, outputUrl?: string): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ status, outputUrl })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }
}

export const storage = new DatabaseStorage();
