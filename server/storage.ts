import { db } from "./db";
import {
  projects,
  customPresets,
  contactMessages,
  type Project,
  type UpdateProjectRequest,
  type CustomPreset,
  type InsertCustomPreset,
  type InsertContactMessage,
  type ContactMessage,
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  getProjects(userId?: string | null): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectCount(userId: string): Promise<number>;
  getOldestProject(userId: string): Promise<Project | undefined>;
  createProject(project: {
    name: string;
    originalFileName: string;
    originalFilePath?: string;
    userId?: string | null;
    silenceThreshold?: number;
    minSilenceDuration?: number;
    outputFormat?: string;
  }): Promise<Project>;
  updateProject(id: number, updates: UpdateProjectRequest): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  getFavorites(userId?: string | null): Promise<Project[]>;
  getCustomPresets(userId: string): Promise<CustomPreset[]>;
  createCustomPreset(preset: InsertCustomPreset): Promise<CustomPreset>;
  deleteCustomPreset(id: number, userId: string): Promise<boolean>;
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

  async getProjectCount(userId: string): Promise<number> {
    const result = await db.select().from(projects)
      .where(eq(projects.userId, userId));
    return result.length;
  }

  async getOldestProject(userId: string): Promise<Project | undefined> {
    const [oldest] = await db.select().from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(asc(projects.createdAt))
      .limit(1);
    return oldest;
  }

  async createProject(project: {
    name: string;
    originalFileName: string;
    originalFilePath?: string;
    userId?: string | null;
    silenceThreshold?: number;
    minSilenceDuration?: number;
    outputFormat?: string;
  }): Promise<Project> {
    const [created] = await db.insert(projects).values({
      name: project.name,
      originalFileName: project.originalFileName,
      originalFilePath: project.originalFilePath,
      userId: project.userId,
      status: "pending",
      silenceThreshold: project.silenceThreshold ?? -40,
      minSilenceDuration: project.minSilenceDuration ?? 500,
      outputFormat: project.outputFormat ?? "mp3",
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

  async getCustomPresets(userId: string): Promise<CustomPreset[]> {
    return await db.select().from(customPresets)
      .where(eq(customPresets.userId, userId))
      .orderBy(desc(customPresets.createdAt));
  }

  async createCustomPreset(preset: InsertCustomPreset): Promise<CustomPreset> {
    const [created] = await db.insert(customPresets).values(preset).returning();
    return created;
  }

  async deleteCustomPreset(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(customPresets)
      .where(and(eq(customPresets.id, id), eq(customPresets.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db.insert(contactMessages).values(message).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
