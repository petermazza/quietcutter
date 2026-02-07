import { db } from "./db";
import {
  projects,
  projectFiles,
  customPresets,
  contactMessages,
  type Project,
  type ProjectFile,
  type UpdateProjectFileRequest,
  type CustomPreset,
  type InsertCustomPreset,
  type InsertContactMessage,
  type ContactMessage,
} from "@shared/schema";
import { eq, and, desc, asc, count } from "drizzle-orm";

export interface IStorage {
  getProjects(userId?: string | null): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectCount(userId: string): Promise<number>;
  getOldestProject(userId: string): Promise<Project | undefined>;
  createProject(project: { name: string; userId?: string | null }): Promise<Project>;
  updateProject(id: number, updates: Partial<{ name: string; isFavorite: boolean }>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  getFavorites(userId?: string | null): Promise<Project[]>;

  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
  getProjectFile(id: number): Promise<ProjectFile | undefined>;
  createProjectFile(file: {
    projectId: number;
    originalFileName: string;
    originalFilePath?: string;
    silenceThreshold?: number;
    minSilenceDuration?: number;
    outputFormat?: string;
    fileType?: string;
    fileSizeBytes?: number;
  }): Promise<ProjectFile>;
  updateProjectFile(id: number, updates: UpdateProjectFileRequest): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: number): Promise<boolean>;
  getProjectFileCount(projectId: number): Promise<number>;
  getAllUserFiles(userId: string): Promise<ProjectFile[]>;

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
    const result = await db.select({ value: count() }).from(projects)
      .where(eq(projects.userId, userId));
    return result[0]?.value ?? 0;
  }

  async getOldestProject(userId: string): Promise<Project | undefined> {
    const [oldest] = await db.select().from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(asc(projects.createdAt))
      .limit(1);
    return oldest;
  }

  async createProject(project: { name: string; userId?: string | null }): Promise<Project> {
    const [created] = await db.insert(projects).values({
      name: project.name,
      userId: project.userId,
    }).returning();
    return created;
  }

  async updateProject(id: number, updates: Partial<{ name: string; isFavorite: boolean }>): Promise<Project | undefined> {
    const [updated] = await db.update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: number): Promise<boolean> {
    await db.delete(projectFiles).where(eq(projectFiles.projectId, id));
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

  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return await db.select().from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.createdAt));
  }

  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, id));
    return file;
  }

  async createProjectFile(file: {
    projectId: number;
    originalFileName: string;
    originalFilePath?: string;
    silenceThreshold?: number;
    minSilenceDuration?: number;
    outputFormat?: string;
    fileType?: string;
    fileSizeBytes?: number;
  }): Promise<ProjectFile> {
    const [created] = await db.insert(projectFiles).values({
      projectId: file.projectId,
      originalFileName: file.originalFileName,
      originalFilePath: file.originalFilePath,
      status: "pending",
      silenceThreshold: file.silenceThreshold ?? -40,
      minSilenceDuration: file.minSilenceDuration ?? 500,
      outputFormat: file.outputFormat ?? "mp3",
      fileType: file.fileType ?? "audio",
      fileSizeBytes: file.fileSizeBytes ?? null,
    }).returning();
    return created;
  }

  async updateProjectFile(id: number, updates: UpdateProjectFileRequest): Promise<ProjectFile | undefined> {
    const [updated] = await db.update(projectFiles)
      .set(updates)
      .where(eq(projectFiles.id, id))
      .returning();
    return updated;
  }

  async deleteProjectFile(id: number): Promise<boolean> {
    const result = await db.delete(projectFiles).where(eq(projectFiles.id, id)).returning();
    return result.length > 0;
  }

  async getProjectFileCount(projectId: number): Promise<number> {
    const result = await db.select({ value: count() }).from(projectFiles)
      .where(eq(projectFiles.projectId, projectId));
    return result[0]?.value ?? 0;
  }

  async getAllUserFiles(userId: string): Promise<ProjectFile[]> {
    const userProjects = await db.select({ id: projects.id }).from(projects)
      .where(eq(projects.userId, userId));
    if (userProjects.length === 0) return [];
    const projectIds = userProjects.map(p => p.id);
    const allFiles: ProjectFile[] = [];
    for (const pid of projectIds) {
      const files = await db.select().from(projectFiles)
        .where(eq(projectFiles.projectId, pid));
      allFiles.push(...files);
    }
    return allFiles;
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
