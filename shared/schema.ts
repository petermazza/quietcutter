import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  status: text("status").notNull().default("pending"),
  silenceThreshold: integer("silence_threshold").notNull().default(-40),
  minSilenceDuration: integer("min_silence_duration").notNull().default(500),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type CreateProjectRequest = {
  name: string;
  originalFileName: string;
  silenceThreshold?: number;
  minSilenceDuration?: number;
};

export type UpdateProjectRequest = Partial<InsertProject>;
export type ProjectResponse = Project;
