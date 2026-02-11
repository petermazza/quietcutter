import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { api } from "@shared/routes";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { stripeService } from "./stripeService";
import { getStripePublishableKey, getUncachableStripeClient, getStripeSync } from "./stripeClient";
import { getUncachableResendClient } from "./resendClient";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedAudioTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/ogg", "audio/flac", "audio/m4a", "audio/x-m4a"];
const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"];
const allowedExtensions = /\.(mp3|wav|ogg|flac|m4a|mp4|mov|avi|mkv|webm)$/i;

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
  fileFilter: (req, file, cb) => {
    if ([...allowedAudioTypes, ...allowedVideoTypes].includes(file.mimetype) || file.originalname.match(allowedExtensions)) {
      cb(null, true);
    } else {
      const ext = file.originalname.split('.').pop()?.toLowerCase() || 'unknown';
      cb(new Error(`".${ext}" is not a supported file type. Please upload an audio file (MP3, WAV, OGG, FLAC, M4A) or video file (MP4, MOV, AVI, MKV, WEBM).`));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 },
});

const FREE_FILE_SIZE_LIMIT = 100 * 1024 * 1024;
const PRO_FILE_SIZE_LIMIT = 500 * 1024 * 1024;
const FREE_PROJECT_LIMIT = 1;

async function checkIsPro(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const result = await db.execute(
      sql`SELECT s.status FROM stripe.subscriptions s
          JOIN stripe.customers c ON s.customer = c.id
          WHERE c.metadata->>'userId' = ${userId}
          AND s.status = 'active'
          LIMIT 1`
    );
    return (result.rows?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

const processingQueue: Array<{
  fileId: number;
  inputPath: string;
  threshold: number;
  minDuration: number;
  isVideo: boolean;
  outputFormat: string;
  isPro: boolean;
}> = [];
let isProcessing = false;

async function enqueueProcessing(item: typeof processingQueue[0]) {
  if (item.isPro) {
    const firstFreeIndex = processingQueue.findIndex(q => !q.isPro);
    if (firstFreeIndex >= 0) {
      processingQueue.splice(firstFreeIndex, 0, item);
    } else {
      processingQueue.push(item);
    }
  } else {
    processingQueue.push(item);
  }
  if (!isProcessing) {
    processNext();
  }
}

async function processNext() {
  if (processingQueue.length === 0) {
    isProcessing = false;
    return;
  }
  isProcessing = true;
  const item = processingQueue.shift()!;
  await processAudio(item.fileId, item.inputPath, item.threshold, item.minDuration, item.isVideo, item.outputFormat);
  processNext();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get(api.projects.list.path, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || null;
      if (!userId) return res.json([]);
      const projectList = await storage.getProjects(userId);
      const projectsWithFiles = await Promise.all(
        projectList.map(async (project) => {
          const files = await storage.getProjectFiles(project.id);
          return { ...project, files };
        })
      );
      res.json(projectsWithFiles);
    } catch (err) {
      console.error("Error fetching projects:", err);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/favorites", async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || null;
      if (!userId) return res.json([]);
      const favs = await storage.getFavorites(userId);
      const favsWithFiles = await Promise.all(
        favs.map(async (project) => {
          const files = await storage.getProjectFiles(project.id);
          return { ...project, files };
        })
      );
      res.json(favsWithFiles);
    } catch (err) {
      console.error("Error fetching favorites:", err);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.get("/api/projects/default", async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || null;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const defaultProject = await storage.getDefaultProject(userId);
      const files = await storage.getProjectFiles(defaultProject.id);
      res.json({ ...defaultProject, files });
    } catch (err) {
      console.error("Error fetching default project:", err);
      res.status(500).json({ message: "Failed to fetch default project" });
    }
  });

  app.get(api.projects.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = (req as any).user?.claims?.sub || null;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId && project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const files = await storage.getProjectFiles(id);
      res.json({ ...project, files });
    } catch (err) {
      console.error("Error fetching project:", err);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post(api.projects.create.path, async (req, res) => {
    try {
      const input = api.projects.create.input.parse(req.body);
      const userId = (req as any).user?.claims?.sub || null;
      const project = await storage.createProject({
        name: input.name,
        userId,
        silenceThreshold: input.silenceThreshold,
        minSilenceDuration: input.minSilenceDuration,
        outputFormat: input.outputFormat,
      });
      res.status(201).json({ ...project, files: [] });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Error creating project:", err);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch(api.projects.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = (req as any).user?.claims?.sub || null;
      const existingProject = await storage.getProject(id);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (existingProject.userId && existingProject.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const input = api.projects.update.input.parse(req.body);
      const project = await storage.updateProject(id, input);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const files = await storage.getProjectFiles(id);
      res.json({ ...project, files });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Error updating project:", err);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete(api.projects.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = (req as any).user?.claims?.sub || null;
      
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.userId && project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const files = await storage.getProjectFiles(id);
      for (const file of files) {
        if (file.originalFilePath) try { fs.unlinkSync(file.originalFilePath); } catch {}
        if (file.processedFilePath) try { fs.unlinkSync(file.processedFilePath); } catch {}
      }
      
      await storage.deleteProject(id);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting project:", err);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.get("/api/subscription/status", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || null;
      const isPro = await checkIsPro(userId);
      res.json({ isPro });
    } catch (err) {
      console.error("Error checking subscription:", err);
      res.json({ isPro: false });
    }
  });

  app.post("/api/upload", (req: any, res: any, next: any) => {
    upload.array("audio", 3)(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: "File is too large. Free users can upload files up to 100MB, Pro users up to 500MB." });
        }
        return res.status(400).json({ message: err.message || "Upload failed. Please check your file and try again." });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No file was uploaded. Please select an audio or video file to upload." });
      }

      const userId = req.user?.claims?.sub || null;
      const isPro = await checkIsPro(userId);

      const fileSizeLimit = isPro ? PRO_FILE_SIZE_LIMIT : FREE_FILE_SIZE_LIMIT;
      for (const file of files) {
        if (file.size > fileSizeLimit) {
          for (const f of files) {
            try { fs.unlinkSync(f.path); } catch {}
          }
          const limitMB = Math.round(fileSizeLimit / (1024 * 1024));
          return res.status(413).json({ message: `File "${file.originalname}" exceeds the ${limitMB}MB limit. ${isPro ? "" : "Upgrade to Pro for 500MB uploads."}` });
        }
      }

      if (files.length > 1 && !isPro) {
        for (const file of files) {
          try { fs.unlinkSync(file.path); } catch {}
        }
        return res.status(403).json({ message: "Batch upload is a Pro feature. Upgrade to upload up to 3 files at once." });
      }

      const { silenceThreshold, minSilenceDuration, outputFormat, projectId: existingProjectId, projectName } = req.body;
      const resolvedFormat = isPro && outputFormat ? outputFormat : "mp3";

      let projectId: number;

      if (existingProjectId) {
        const existingProject = await storage.getProject(parseInt(existingProjectId, 10));
        if (!existingProject) {
          for (const file of files) { try { fs.unlinkSync(file.path); } catch {} }
          return res.status(404).json({ message: "Project not found" });
        }
        if (existingProject.userId && existingProject.userId !== userId) {
          for (const file of files) { try { fs.unlinkSync(file.path); } catch {} }
          return res.status(403).json({ message: "Access denied" });
        }
        projectId = existingProject.id;
      } else if (projectName) {
        if (!isPro && userId) {
          const projectCount = await storage.getProjectCount(userId);
          if (projectCount >= FREE_PROJECT_LIMIT) {
            const oldest = await storage.getOldestProject(userId);
            if (oldest) {
              const oldFiles = await storage.getProjectFiles(oldest.id);
              for (const f of oldFiles) {
                if (f.originalFilePath) try { fs.unlinkSync(f.originalFilePath); } catch {}
                if (f.processedFilePath) try { fs.unlinkSync(f.processedFilePath); } catch {}
              }
              await storage.deleteProject(oldest.id);
            }
          }
        }
        const project = await storage.createProject({ name: projectName, userId });
        projectId = project.id;
      } else {
        if (userId) {
          const defaultProject = await storage.getDefaultProject(userId);
          projectId = defaultProject.id;
        } else {
          const name = files[0].originalname.replace(/\.[^/.]+$/, "");
          const project = await storage.createProject({ name, userId });
          projectId = project.id;
        }
      }

      const createdFiles = [];
      for (const file of files) {
        const isVideo = !!file.originalname.match(/\.(mp4|mov|avi|mkv|webm)$/i);
        const projectFile = await storage.createProjectFile({
          projectId,
          originalFileName: file.originalname,
          originalFilePath: file.path,
          silenceThreshold: parseInt(silenceThreshold) || -40,
          minSilenceDuration: parseInt(minSilenceDuration) || 500,
          outputFormat: resolvedFormat,
          fileType: isVideo ? "video" : "audio",
          fileSizeBytes: file.size,
        });

        enqueueProcessing({
          fileId: projectFile.id,
          inputPath: file.path,
          threshold: parseInt(silenceThreshold) || -40,
          minDuration: parseInt(minSilenceDuration) || 500,
          isVideo,
          outputFormat: resolvedFormat,
          isPro,
        });
        createdFiles.push(projectFile);
      }

      const project = await storage.getProject(projectId);
      const allFiles = await storage.getProjectFiles(projectId);
      res.status(201).json({ ...project, files: allFiles });
    } catch (err) {
      console.error("Error uploading file:", err);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/files/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = (req as any).user?.claims?.sub || null;
      const file = await storage.getProjectFile(id);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const project = await storage.getProject(file.projectId);
      if (project?.userId && project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!file.processedFilePath || !fs.existsSync(file.processedFilePath)) {
        return res.status(404).json({ message: "Processed file not found" });
      }
      
      const ext = file.outputFormat || "mp3";
      const name = file.originalFileName.replace(/\.[^/.]+$/, "");
      res.download(file.processedFilePath, `${name}_processed.${ext}`);
    } catch (err) {
      console.error("Error downloading file:", err);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = (req as any).user?.claims?.sub || null;
      const file = await storage.getProjectFile(id);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const project = await storage.getProject(file.projectId);
      if (project?.userId && project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (file.originalFilePath) try { fs.unlinkSync(file.originalFilePath); } catch {}
      if (file.processedFilePath) try { fs.unlinkSync(file.processedFilePath); } catch {}
      
      await storage.deleteProjectFile(id);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting file:", err);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  app.patch("/api/projects/:id/favorite", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = (req as any).user?.claims?.sub || null;
      const { isFavorite } = req.body;
      
      const existingProject = await storage.getProject(id);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (existingProject.userId && existingProject.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const project = await storage.updateProject(id, { isFavorite });
      const files = await storage.getProjectFiles(id);
      res.json({ ...project, files });
    } catch (err) {
      console.error("Error updating favorite:", err);
      res.status(500).json({ message: "Failed to update favorite" });
    }
  });

  app.post("/api/projects/:id/reprocess", async (req: any, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = req.user?.claims?.sub || null;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId && project.userId !== userId) return res.status(403).json({ message: "Access denied" });

      const isPro = await checkIsPro(userId);
      const files = await storage.getProjectFiles(id);
      const filesToReprocess = files.filter(f => f.originalFilePath && fs.existsSync(f.originalFilePath));

      if (filesToReprocess.length === 0) {
        return res.status(400).json({ message: "No files available to reprocess" });
      }

      const resolvedFormat = isPro && project.outputFormat ? project.outputFormat : "mp3";

      for (const file of filesToReprocess) {
        if (file.processedFilePath) {
          try { fs.unlinkSync(file.processedFilePath); } catch {}
        }

        await storage.updateProjectFile(file.id, {
          status: "pending",
          processedFilePath: null,
          silenceThreshold: project.silenceThreshold,
          minSilenceDuration: project.minSilenceDuration,
          outputFormat: resolvedFormat,
          originalDurationSec: null,
          processedDurationSec: null,
          processingTimeMs: null,
        });

        const isVideo = file.fileType === "video";
        enqueueProcessing({
          fileId: file.id,
          inputPath: file.originalFilePath!,
          threshold: project.silenceThreshold,
          minDuration: project.minSilenceDuration,
          isVideo,
          outputFormat: resolvedFormat,
          isPro,
        });
      }

      const updatedFiles = await storage.getProjectFiles(id);
      res.json({ ...project, files: updatedFiles });
    } catch (err) {
      console.error("Error reprocessing project:", err);
      res.status(500).json({ message: "Failed to reprocess project files" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      const contactMessage = await storage.createContactMessage({ name, email, subject, message });

      try {
        const { client: resend, fromEmail } = await getUncachableResendClient();
        await resend.emails.send({
          from: fromEmail || "QuietCutter <noreply@quietcutter.com>",
          to: "support@quietcutter.com",
          replyTo: email,
          subject: `[QuietCutter Contact] ${subject}`,
          html: `
            <h2>New Contact Form Message</h2>
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr />
            <p>${message.replace(/\n/g, "<br />")}</p>
            <hr />
            <p style="color: #888; font-size: 12px;">Reply directly to this email to respond to ${name}.</p>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send contact email via Resend:", emailErr);
      }

      res.status(201).json({ success: true, message: "Message sent successfully" });
    } catch (err) {
      console.error("Error saving contact message:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/presets", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Sign in to view presets" });
      }
      const presets = await storage.getCustomPresets(userId);
      res.json(presets);
    } catch (err) {
      console.error("Error fetching presets:", err);
      res.status(500).json({ message: "Failed to fetch presets" });
    }
  });

  app.post("/api/presets", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Sign in to save presets" });
      }

      const isPro = await checkIsPro(userId);
      if (!isPro) {
        return res.status(403).json({ message: "Custom presets are a Pro feature." });
      }

      const { name, silenceThreshold, minSilenceDuration } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Preset name is required" });
      }

      const preset = await storage.createCustomPreset({
        userId,
        name,
        silenceThreshold: silenceThreshold ?? -40,
        minSilenceDuration: minSilenceDuration ?? 500,
      });
      res.status(201).json(preset);
    } catch (err) {
      console.error("Error creating preset:", err);
      res.status(500).json({ message: "Failed to create preset" });
    }
  });

  app.delete("/api/presets/:id", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Sign in required" });
      }
      const id = parseInt(req.params.id as string, 10);
      const deleted = await storage.deleteCustomPreset(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Preset not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting preset:", err);
      res.status(500).json({ message: "Failed to delete preset" });
    }
  });

  app.get("/api/projects/bulk-download", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Sign in required" });
      }

      const isPro = await checkIsPro(userId);
      if (!isPro) {
        return res.status(403).json({ message: "Bulk download is a Pro feature." });
      }

      const allFiles = await storage.getAllUserFiles(userId);
      const completedFiles = allFiles.filter(
        f => f.status === "completed" && f.processedFilePath && fs.existsSync(f.processedFilePath)
      );

      if (completedFiles.length === 0) {
        return res.status(404).json({ message: "No completed files to download" });
      }

      const archiver = (await import("archiver")).default;
      const archive = archiver("zip", { zlib: { level: 5 } });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=quietcutter_projects.zip");

      archive.pipe(res);

      for (const file of completedFiles) {
        const ext = file.outputFormat || "mp3";
        const name = file.originalFileName.replace(/\.[^/.]+$/, "");
        archive.file(file.processedFilePath!, { name: `${name}_processed.${ext}` });
      }

      await archive.finalize();
    } catch (err) {
      console.error("Error creating bulk download:", err);
      res.status(500).json({ message: "Failed to create download" });
    }
  });

  app.get("/api/files/:id/preview", async (req: any, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = req.user?.claims?.sub || null;
      const file = await storage.getProjectFile(id);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const project = await storage.getProject(file.projectId);
      if (project?.userId && project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const isPro = await checkIsPro(userId);
      if (!isPro) {
        return res.status(403).json({ message: "Audio preview is a Pro feature." });
      }

      if (!file.processedFilePath || !fs.existsSync(file.processedFilePath)) {
        return res.status(404).json({ message: "Processed file not found" });
      }

      const stat = fs.statSync(file.processedFilePath);
      const ext = file.outputFormat || "mp3";
      const mimeTypes: Record<string, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        flac: "audio/flac",
      };

      res.setHeader("Content-Type", mimeTypes[ext] || "audio/mpeg");
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Accept-Ranges", "bytes");

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
        res.setHeader("Content-Length", end - start + 1);
        fs.createReadStream(file.processedFilePath, { start, end }).pipe(res);
      } else {
        fs.createReadStream(file.processedFilePath).pipe(res);
      }
    } catch (err) {
      console.error("Error streaming preview:", err);
      res.status(500).json({ message: "Failed to stream audio" });
    }
  });

  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (err) {
      console.error("Error getting publishable key:", err);
      res.status(500).json({ message: "Failed to get Stripe key" });
    }
  });

  app.get("/api/stripe/products", async (req, res) => {
    try {
      const products = await stripeService.listProductsWithPrices();
      
      const productsMap = new Map();
      for (const row of products as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
          });
        }
      }

      if (productsMap.size > 0) {
        return res.json({ data: Array.from(productsMap.values()) });
      }

      console.log("No products in database, fetching from Stripe API directly...");
      const stripe = await getUncachableStripeClient();
      const stripeProducts = await stripe.products.list({ active: true });
      let quietCutterPro = stripeProducts.data.find(p => p.name === 'QuietCutter Pro');

      if (!quietCutterPro) {
        console.log("Creating QuietCutter Pro product in Stripe...");
        quietCutterPro = await stripe.products.create({
          name: 'QuietCutter Pro',
          description: 'Unlimited audio processing, priority support, and advanced features',
          metadata: { tier: 'pro' }
        });
        await stripe.prices.create({
          product: quietCutterPro.id,
          unit_amount: 999,
          currency: 'usd',
          recurring: { interval: 'month' },
        });
        await stripe.prices.create({
          product: quietCutterPro.id,
          unit_amount: 7999,
          currency: 'usd',
          recurring: { interval: 'year' },
        });
      }

      const prices = await stripe.prices.list({ product: quietCutterPro.id, active: true });
      const result = {
        id: quietCutterPro.id,
        name: quietCutterPro.name,
        description: quietCutterPro.description,
        active: quietCutterPro.active,
        metadata: quietCutterPro.metadata,
        prices: prices.data.map(p => ({
          id: p.id,
          unit_amount: p.unit_amount,
          currency: p.currency,
          recurring: p.recurring,
          active: p.active,
        })),
      };

      res.json({ data: [result] });
    } catch (err) {
      console.error("Error fetching stripe products:", err);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/stripe/checkout", async (req: any, res) => {
    try {
      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ message: "Price ID is required" });
      }

      const userId = req.user?.claims?.sub || null;
      let customerId: string;
      
      if (userId) {
        const existingResult = await db.execute(
          sql`SELECT id FROM stripe.customers WHERE metadata->>'userId' = ${userId} LIMIT 1`
        );
        if (existingResult.rows?.length > 0) {
          customerId = existingResult.rows[0].id as string;
        } else {
          const email = req.user?.claims?.email || `${userId}@quietcutter.app`;
          const customer = await stripeService.createCustomer(email, userId);
          customerId = customer.id;
        }
      } else {
        const customer = await stripeService.createCustomer("guest@quietcutter.com", "guest");
        customerId = customer.id;
      }
      
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'] || req.hostname;
      const baseUrl = `${protocol}://${host}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/?success=true`,
        `${baseUrl}/?canceled=true`
      );

      res.json({ url: session.url });
    } catch (err) {
      console.error("Error creating checkout session:", err);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  return httpServer;
}

async function getAudioDuration(filePath: string): Promise<number | null> {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const { stdout } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`, { timeout: 30000 });
    const dur = parseFloat(stdout.trim());
    return isNaN(dur) ? null : dur;
  } catch {
    return null;
  }
}

function spawnFFmpeg(args: string[], totalDuration: number | null, fileId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");
    const proc = spawn("ffmpeg", args);
    let lastProgressUpdate = 0;

    proc.stderr.on("data", (data: Buffer) => {
      const line = data.toString();
      if (totalDuration && totalDuration > 0) {
        const timeMatch = line.match(/time=(\d+):(\d+):(\d+)\.(\d+)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseInt(timeMatch[3]);
          const hundredths = parseInt(timeMatch[4]);
          const currentTime = hours * 3600 + minutes * 60 + seconds + hundredths / 100;
          const progress = Math.min(Math.round((currentTime / totalDuration) * 100), 99);
          const now = Date.now();
          if (now - lastProgressUpdate > 500) {
            lastProgressUpdate = now;
            storage.updateProjectFile(fileId, { processingProgress: progress }).catch(() => {});
          }
        }
      }
    });

    proc.on("close", (code: number) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });

    proc.on("error", (err: Error) => reject(err));

    setTimeout(() => {
      try { proc.kill(); } catch {}
      reject(new Error("FFmpeg timeout after 10 minutes"));
    }, 600000);
  });
}

async function processAudio(fileId: number, inputPath: string, threshold: number, minDuration: number, isVideo: boolean = false, outputFormat: string = "mp3") {
  const startTime = Date.now();
  
  try {
    await storage.updateProjectFile(fileId, { status: "processing", processingProgress: 0 });
    
    let audioInputPath = inputPath;
    
    if (isVideo) {
      const extractedAudioPath = inputPath.replace(/\.[^/.]+$/, "_extracted.wav");
      await spawnFFmpeg(["-i", inputPath, "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2", "-y", extractedAudioPath], null, fileId);
      audioInputPath = extractedAudioPath;
    }
    
    const originalDuration = await getAudioDuration(audioInputPath);
    
    const ext = outputFormat === "wav" ? "wav" : outputFormat === "flac" ? "flac" : "mp3";
    const outputPath = inputPath.replace(/\.[^/.]+$/, `_processed.${ext}`);
    
    const silenceRemove = `silenceremove=start_periods=1:start_duration=0:start_threshold=${threshold}dB:detection=peak,aformat=sample_fmts=s16:sample_rates=44100,silenceremove=start_periods=0:start_duration=0:stop_periods=-1:stop_duration=${minDuration / 1000}:stop_threshold=${threshold}dB:detection=peak`;
    
    const formatArgs: string[] = [];
    if (ext === "wav") {
      formatArgs.push("-acodec", "pcm_s16le");
    } else if (ext === "flac") {
      formatArgs.push("-acodec", "flac");
    } else {
      formatArgs.push("-ab", "320k");
    }
    
    await spawnFFmpeg(["-i", audioInputPath, "-af", silenceRemove, ...formatArgs, "-y", outputPath], originalDuration, fileId);
    
    const processedDuration = await getAudioDuration(outputPath);
    const processingTime = Date.now() - startTime;
    
    if (isVideo && audioInputPath !== inputPath) {
      try { fs.unlinkSync(audioInputPath); } catch {}
    }
    
    await storage.updateProjectFile(fileId, { 
      status: "completed",
      processedFilePath: outputPath,
      originalDurationSec: originalDuration,
      processedDurationSec: processedDuration,
      processingTimeMs: processingTime,
      processingProgress: 100,
    });
  } catch (err) {
    console.error("Error processing audio:", err);
    const processingTime = Date.now() - startTime;
    await storage.updateProjectFile(fileId, { status: "failed", processingTimeMs: processingTime, processingProgress: 0 });
  }
}
