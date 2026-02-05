import { db } from "./db";
import {
  users,
  projects,
  type User,
  type InsertUser,
  type Project,
  type CreateProjectRequest,
  type UpdateProjectRequest,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: CreateProjectRequest): Promise<Project>;
  updateProject(id: number, updates: UpdateProjectRequest): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

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
