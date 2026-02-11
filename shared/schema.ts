import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, timestamp, varchar, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  isFavorite: boolean("is_favorite").notNull().default(false),
  silenceThreshold: integer("silence_threshold").notNull().default(-40),
  minSilenceDuration: integer("min_silence_duration").notNull().default(500),
  outputFormat: text("output_format").notNull().default("mp3"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  originalFileName: text("original_file_name").notNull(),
  originalFilePath: text("original_file_path"),
  processedFilePath: text("processed_file_path"),
  status: text("status").notNull().default("pending"),
  silenceThreshold: integer("silence_threshold").notNull().default(-40),
  minSilenceDuration: integer("min_silence_duration").notNull().default(500),
  outputFormat: text("output_format").notNull().default("mp3"),
  fileType: text("file_type").default("audio"),
  fileSizeBytes: integer("file_size_bytes"),
  originalDurationSec: real("original_duration_sec"),
  processedDurationSec: real("processed_duration_sec"),
  processingTimeMs: integer("processing_time_ms"),
  processingProgress: integer("processing_progress").default(0),
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

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;

export type UpdateProjectFileRequest = Partial<InsertProjectFile>;

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
