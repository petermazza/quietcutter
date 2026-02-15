import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { runMigrations as runDbMigrations } from './migrate';

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  
  if (!stripeSecretKey || !stripePublishableKey) {
    console.log('STRIPE_SECRET_KEY or STRIPE_PUBLISHABLE_KEY not set, skipping Stripe initialization');
    console.log('Add these variables to enable Stripe payments');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
    const webhookBaseUrl = railwayDomain 
      ? `https://${railwayDomain}` 
      : replitDomain 
        ? `https://${replitDomain}` 
        : null;
    
    if (!webhookBaseUrl) {
      console.log('No domain configured, skipping webhook setup');
    } else {
      try {
        const result = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        if (result?.webhook?.url) {
          console.log(`Webhook configured: ${result.webhook.url}`);
        } else {
          console.log('Webhook setup completed (no URL returned)');
        }
      } catch (webhookError) {
        console.log('Webhook setup skipped (may already exist or not available in test mode)');
      }
    }

    await stripeSync.syncBackfill().then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));

    const { db } = await import('./db');
    const { sql } = await import('drizzle-orm');
    const existingProducts = await db.execute(sql`SELECT id FROM stripe.products WHERE active = true LIMIT 1`);
    if (existingProducts.rows.length === 0) {
      console.log('No Stripe products found, creating QuietCutter Pro...');
      try {
        const stripe = await getUncachableStripeClient();
        const product = await stripe.products.create({
          name: 'QuietCutter Pro',
          description: 'Unlimited audio processing, priority support, and advanced features',
          metadata: { tier: 'pro', features: 'unlimited_processing,priority_support,batch_processing,advanced_settings' }
        });
        await stripe.prices.create({
          product: product.id,
          unit_amount: 999,
          currency: 'usd',
          recurring: { interval: 'month' },
          metadata: { plan: 'monthly' }
        });
        await stripe.prices.create({
          product: product.id,
          unit_amount: 7999,
          currency: 'usd',
          recurring: { interval: 'year' },
          metadata: { plan: 'yearly' }
        });
        console.log('QuietCutter Pro product created, syncing...');
        await stripeSync.syncBackfill();
        console.log('Products synced to database');
      } catch (seedErr) {
        console.error('Error seeding Stripe products:', seedErr);
      }
    }
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// CORS configuration
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://quietcutter.com',
    'https://quietcutter-production-f345.up.railway.app',
    'http://localhost:3000',
    'http://localhost:5000'
  ];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('Starting server initialization...');
    
    // Run database migrations first
    console.log('Running database migrations...');
    await runDbMigrations();
    console.log('Database migrations completed');
    
    await initStripe();
    console.log('Stripe initialized');
    
    await registerRoutes(httpServer, app);
    console.log('Routes registered');

    // File cleanup cron job - runs daily
    const startFileCleanup = async () => {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      
      const cleanupOldFiles = async () => {
        try {
          const { db } = await import('./db');
          const { sql } = await import('drizzle-orm');
          const { promises: fs } = await import('fs');
          
          const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
          console.log('Running file cleanup job...');
          
          const result = await db.execute(sql`
            SELECT id, processed_file_path, original_file_path 
            FROM project_files 
            WHERE created_at < ${sevenDaysAgo}
            AND (processed_file_path IS NOT NULL OR original_file_path IS NOT NULL)
          `);
          
          let deletedCount = 0;
          for (const file of result.rows as any[]) {
            if (file.processed_file_path) {
              try {
                await fs.unlink(file.processed_file_path);
                deletedCount++;
              } catch (err) {
                // File may already be deleted
              }
            }
            if (file.original_file_path) {
              try {
                await fs.unlink(file.original_file_path);
                deletedCount++;
              } catch (err) {
                // File may already be deleted
              }
            }
          }
          
          if (deletedCount > 0) {
            console.log(`Cleanup job: Deleted ${deletedCount} old files`);
          }
        } catch (err) {
          console.error('File cleanup job failed:', err);
        }
      };
      
      // Run immediately on startup
      await cleanupOldFiles();
      
      // Then run daily
      setInterval(cleanupOldFiles, 24 * 60 * 60 * 1000);
      console.log('File cleanup cron job started (runs daily)');
    };
    
    startFileCleanup();

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Express error handler:", err);
      if (res.headersSent) {
        return next(err);
      }
      return res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production") {
      console.log('Setting up static file serving...');
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    console.log(`Starting HTTP server on port ${port}...`);
    
    httpServer.listen(
      { port, host: "0.0.0.0", reusePort: true },
      () => {
        log(`serving on port ${port}`);
      },
    );
  } catch (err: any) {
    console.error('FATAL STARTUP ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
