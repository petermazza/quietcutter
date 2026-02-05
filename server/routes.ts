import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
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

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/ogg", "audio/flac", "audio/m4a", "audio/x-m4a"];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|flac|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 },
});

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

  app.post("/api/upload", upload.single("audio"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const userId = req.user?.claims?.sub || null;
      const { silenceThreshold, minSilenceDuration } = req.body;
      
      const project = await storage.createProject({
        name: req.file.originalname.replace(/\.[^/.]+$/, ""),
        originalFileName: req.file.originalname,
        originalFilePath: req.file.path,
        userId,
        silenceThreshold: parseInt(silenceThreshold) || -40,
        minSilenceDuration: parseInt(minSilenceDuration) || 500,
      });
      
      processAudio(project.id, req.file.path, parseInt(silenceThreshold) || -40, parseInt(minSilenceDuration) || 500);
      
      res.status(201).json(project);
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
      
      res.download(project.processedFilePath, `${project.name}_processed.mp3`);
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

async function processAudio(projectId: number, inputPath: string, threshold: number, minDuration: number) {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);
  
  try {
    await storage.updateProject(projectId, { status: "processing" });
    
    const outputPath = inputPath.replace(/\.[^/.]+$/, "_processed.mp3");
    
    const silenceDetect = `silencedetect=noise=${threshold}dB:d=${minDuration / 1000}`;
    const silenceRemove = `silenceremove=start_periods=1:start_duration=0:start_threshold=${threshold}dB:detection=peak,aformat=sample_fmts=s16:sample_rates=44100,silenceremove=start_periods=0:start_duration=0:stop_periods=-1:stop_duration=${minDuration / 1000}:stop_threshold=${threshold}dB:detection=peak`;
    
    const command = `ffmpeg -i "${inputPath}" -af "${silenceRemove}" -y "${outputPath}"`;
    
    await execAsync(command, { timeout: 600000 });
    
    await storage.updateProject(projectId, { 
      status: "completed",
      processedFilePath: outputPath
    });
  } catch (err) {
    console.error("Error processing audio:", err);
    await storage.updateProject(projectId, { status: "failed" });
  }
}
