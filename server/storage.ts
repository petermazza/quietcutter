import { db } from "./db";
import {
  projects,
  contactMessages,
  type Project,
  type UpdateProjectRequest,
  type InsertContactMessage,
  type ContactMessage,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getProjects(userId?: string | null): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: {
    name: string;
    originalFileName: string;
    originalFilePath?: string;
    userId?: string | null;
    silenceThreshold?: number;
    minSilenceDuration?: number;
  }): Promise<Project>;
  updateProject(id: number, updates: UpdateProjectRequest): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  getFavorites(userId?: string | null): Promise<Project[]>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(userId?: string | null): Promise<Project[]> {
    if (userId) {
      return await db.select().from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.createdAt));
    }
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: {
    name: string;
    originalFileName: string;
    originalFilePath?: string;
    userId?: string | null;
    silenceThreshold?: number;
    minSilenceDuration?: number;
  }): Promise<Project> {
    const [created] = await db.insert(projects).values({
      name: project.name,
      originalFileName: project.originalFileName,
      originalFilePath: project.originalFilePath,
      userId: project.userId,
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

  async getFavorites(userId?: string | null): Promise<Project[]> {
    if (userId) {
      return await db.select().from(projects)
        .where(and(eq(projects.isFavorite, true), eq(projects.userId, userId)))
        .orderBy(desc(projects.createdAt));
    }
    return await db.select().from(projects)
      .where(eq(projects.isFavorite, true))
      .orderBy(desc(projects.createdAt));
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db.insert(contactMessages).values(message).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
