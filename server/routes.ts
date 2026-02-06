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
import { getStripePublishableKey } from "./stripeClient";

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
      cb(new Error("Only audio and video files are allowed (MP3, WAV, OGG, FLAC, M4A, MP4, MOV, AVI, MKV, WEBM)"));
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
  projectId: number;
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
  await processAudio(item.projectId, item.inputPath, item.threshold, item.minDuration, item.isVideo, item.outputFormat);
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
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (err) {
      console.error("Error fetching projects:", err);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/favorites", async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || null;
      const projects = await storage.getFavorites(userId);
      res.json(projects);
    } catch (err) {
      console.error("Error fetching favorites:", err);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.get(api.projects.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (err) {
      console.error("Error fetching project:", err);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post(api.projects.create.path, async (req, res) => {
    try {
      const input = api.projects.create.input.parse(req.body);
      const project = await storage.createProject({
        name: input.name,
        originalFileName: input.originalFileName,
        silenceThreshold: input.silenceThreshold ?? -40,
        minSilenceDuration: input.minSilenceDuration ?? 500,
      });
      res.status(201).json(project);
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
      const input = api.projects.update.input.parse(req.body);
      const project = await storage.updateProject(id, input);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
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
      
      const deleted = await storage.deleteProject(id);
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

  app.post("/api/upload", upload.array("audio", 3), async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No file uploaded" });
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

      if (!isPro && userId) {
        const projectCount = await storage.getProjectCount(userId);
        if (projectCount >= FREE_PROJECT_LIMIT) {
          const oldest = await storage.getOldestProject(userId);
          if (oldest) {
            if (oldest.originalFilePath) {
              try { fs.unlinkSync(oldest.originalFilePath); } catch {}
            }
            if (oldest.processedFilePath) {
              try { fs.unlinkSync(oldest.processedFilePath); } catch {}
            }
            await storage.deleteProject(oldest.id);
          }
        }
      }

      const { silenceThreshold, minSilenceDuration, outputFormat } = req.body;
      const resolvedFormat = isPro && outputFormat ? outputFormat : "mp3";
      const createdProjects = [];

      for (const file of files) {
        const isVideo = !!file.originalname.match(/\.(mp4|mov|avi|mkv|webm)$/i);
        const project = await storage.createProject({
          name: file.originalname.replace(/\.[^/.]+$/, ""),
          originalFileName: file.originalname,
          originalFilePath: file.path,
          userId,
          silenceThreshold: parseInt(silenceThreshold) || -40,
          minSilenceDuration: parseInt(minSilenceDuration) || 500,
          outputFormat: resolvedFormat,
        });

        enqueueProcessing({
          projectId: project.id,
          inputPath: file.path,
          threshold: parseInt(silenceThreshold) || -40,
          minDuration: parseInt(minSilenceDuration) || 500,
          isVideo,
          outputFormat: resolvedFormat,
          isPro,
        });
        createdProjects.push(project);
      }

      res.status(201).json(createdProjects.length === 1 ? createdProjects[0] : createdProjects);
    } catch (err) {
      console.error("Error uploading file:", err);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/projects/:id/download", async (req, res) => {
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
      
      if (!project.processedFilePath || !fs.existsSync(project.processedFilePath)) {
        return res.status(404).json({ message: "Processed file not found" });
      }
      
      const ext = project.outputFormat || "mp3";
      res.download(project.processedFilePath, `${project.name}_processed.${ext}`);
    } catch (err) {
      console.error("Error downloading file:", err);
      res.status(500).json({ message: "Failed to download file" });
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
      res.json(project);
    } catch (err) {
      console.error("Error updating favorite:", err);
      res.status(500).json({ message: "Failed to update favorite" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      const contactMessage = await storage.createContactMessage({ name, email, subject, message });
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

      const userProjects = await storage.getProjects(userId);
      const completedProjects = userProjects.filter(
        p => p.status === "completed" && p.processedFilePath && fs.existsSync(p.processedFilePath)
      );

      if (completedProjects.length === 0) {
        return res.status(404).json({ message: "No completed projects to download" });
      }

      const archiver = (await import("archiver")).default;
      const archive = archiver("zip", { zlib: { level: 5 } });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=quietcutter_projects.zip");

      archive.pipe(res);

      for (const project of completedProjects) {
        const ext = project.outputFormat || "mp3";
        archive.file(project.processedFilePath!, { name: `${project.name}_processed.${ext}` });
      }

      await archive.finalize();
    } catch (err) {
      console.error("Error creating bulk download:", err);
      res.status(500).json({ message: "Failed to create download" });
    }
  });

  app.get("/api/projects/:id/preview", async (req: any, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = req.user?.claims?.sub || null;
      const project = await storage.getProject(id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.userId && project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const isPro = await checkIsPro(userId);
      if (!isPro) {
        return res.status(403).json({ message: "Audio preview is a Pro feature." });
      }

      if (!project.processedFilePath || !fs.existsSync(project.processedFilePath)) {
        return res.status(404).json({ message: "Processed file not found" });
      }

      const stat = fs.statSync(project.processedFilePath);
      const ext = project.outputFormat || "mp3";
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
        fs.createReadStream(project.processedFilePath, { start, end }).pipe(res);
      } else {
        fs.createReadStream(project.processedFilePath).pipe(res);
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

      res.json({ data: Array.from(productsMap.values()) });
    } catch (err) {
      console.error("Error fetching products:", err);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/stripe/checkout", async (req, res) => {
    try {
      const { priceId } = req.body;
      const user = (req as any).user;
      
      if (!priceId) {
        return res.status(400).json({ message: "Price ID is required" });
      }
      
      let customerId: string;
      
      if (user?.claims?.email) {
        const customer = await stripeService.createCustomer(user.claims.email, user.claims.sub);
        customerId = customer.id;
      } else {
        const customer = await stripeService.createCustomer("guest@quietcutter.com", "guest");
        customerId = customer.id;
      }
      
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
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

async function processAudio(projectId: number, inputPath: string, threshold: number, minDuration: number, isVideo: boolean = false, outputFormat: string = "mp3") {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);
  
  try {
    await storage.updateProject(projectId, { status: "processing" });
    
    let audioInputPath = inputPath;
    
    if (isVideo) {
      const extractedAudioPath = inputPath.replace(/\.[^/.]+$/, "_extracted.wav");
      const extractCmd = `ffmpeg -i "${inputPath}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -y "${extractedAudioPath}"`;
      await execAsync(extractCmd, { timeout: 600000 });
      audioInputPath = extractedAudioPath;
    }
    
    const ext = outputFormat === "wav" ? "wav" : outputFormat === "flac" ? "flac" : "mp3";
    const outputPath = inputPath.replace(/\.[^/.]+$/, `_processed.${ext}`);
    
    const silenceRemove = `silenceremove=start_periods=1:start_duration=0:start_threshold=${threshold}dB:detection=peak,aformat=sample_fmts=s16:sample_rates=44100,silenceremove=start_periods=0:start_duration=0:stop_periods=-1:stop_duration=${minDuration / 1000}:stop_threshold=${threshold}dB:detection=peak`;
    
    let formatArgs = "";
    if (ext === "wav") {
      formatArgs = "-acodec pcm_s16le";
    } else if (ext === "flac") {
      formatArgs = "-acodec flac";
    } else {
      formatArgs = "-ab 320k";
    }
    
    const command = `ffmpeg -i "${audioInputPath}" -af "${silenceRemove}" ${formatArgs} -y "${outputPath}"`;
    
    await execAsync(command, { timeout: 600000 });
    
    if (isVideo && audioInputPath !== inputPath) {
      try { fs.unlinkSync(audioInputPath); } catch {}
    }
    
    await storage.updateProject(projectId, { 
      status: "completed",
      processedFilePath: outputPath
    });
  } catch (err) {
    console.error("Error processing audio:", err);
    await storage.updateProject(projectId, { status: "failed" });
  }
}
