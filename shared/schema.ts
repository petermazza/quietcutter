import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  originalFilePath: text("original_file_path"),
  processedFilePath: text("processed_file_path"),
  status: text("status").notNull().default("pending"),
  silenceThreshold: integer("silence_threshold").notNull().default(-40),
  minSilenceDuration: integer("min_silence_duration").notNull().default(500),
  isFavorite: boolean("is_favorite").notNull().default(false),
  outputFormat: text("output_format").notNull().default("mp3"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customPresets = pgTable("custom_presets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  silenceThreshold: integer("silence_threshold").notNull().default(-40),
  minSilenceDuration: integer("min_silence_duration").notNull().default(500),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
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

export const insertCustomPresetSchema = createInsertSchema(customPresets).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomPreset = z.infer<typeof insertCustomPresetSchema>;
export type CustomPreset = typeof customPresets.$inferSelect;

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
