import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { getUncachableStripeClient } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { runMigrations } from './migrate';
import { ensureAdminUser } from './db';
import { logger } from './lib/logger';
import { validateAuth0Config } from './lib/auth0-validation';

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  
  if (!stripeSecretKey || !stripePublishableKey) {
    logger.warn('STRIPE_SECRET_KEY or STRIPE_PUBLISHABLE_KEY not set, skipping Stripe initialization', 'stripe');
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 1 });
    
    if (products.data.length === 0) {
      console.log('No Stripe products found, creating QuietCutter Pro...');
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
      console.log('QuietCutter Pro product created');
    }
    
    logger.info('Stripe initialized');
  } catch (error) {
    logger.error('Failed to initialize Stripe', 'stripe', { stripeSecretKey: !!stripeSecretKey }, error as Error);
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
        logger.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer', 'stripe');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Webhook error', 'stripe', { signature: !!signature }, error as Error);
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
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.stripe.com https://checkout.stripe.com ws://localhost:5000 wss://localhost:5000",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  next();
});

export function log(message: string, source = "express") {
  logger.info(message, source);
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
    logger.info('Starting server initialization');
    
    // Validate Auth0 configuration early
    try {
      validateAuth0Config();
    } catch (error: any) {
      logger.error('Auth0 validation failed', 'auth0', {}, error);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
    
    // Skip database migrations in development if no local database
    if (process.env.NODE_ENV !== 'development' || !process.env.DATABASE_URL?.includes('localhost')) {
      logger.info('Running database migrations');
      await runMigrations();
      logger.info('Database migrations completed');
      
      // Ensure admin user exists after migrations
      await ensureAdminUser();
    } else {
      logger.info('Skipping database migrations in development');
      // Still try to ensure admin user exists in development
      try {
        await ensureAdminUser();
      } catch (error) {
        logger.warn('Could not create admin user in development', 'server', {}, error as Error);
      }
    }
    
    await initStripe();
    
    await registerRoutes(httpServer, app);
    logger.info('Routes registered');

    // File cleanup cron job - runs daily
    const startFileCleanup = async () => {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      
      const cleanupOldFiles = async () => {
        try {
          const { db } = await import('./db');
          const { sql } = await import('drizzle-orm');
          const { promises: fs } = await import('fs');
          
          const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
          logger.info('Running file cleanup job');
          
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
            logger.info('Cleanup job: Deleted old files', 'cleanup', { deletedCount });
          }
        } catch (err) {
          logger.error('File cleanup job failed', 'cleanup', {}, err as Error);
        }
      };
      
      // Run immediately on startup
      await cleanupOldFiles();
      
      // Then run daily
      setInterval(cleanupOldFiles, 24 * 60 * 60 * 1000);
      logger.info('File cleanup cron job started (runs daily)');
    };
    
    startFileCleanup();

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      logger.error('Express error handler', 'express', {}, err as Error);
      if (res.headersSent) {
        return next(err);
      }
      return res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production") {
      logger.info('Setting up static file serving');
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    logger.info('Starting HTTP server', 'server', { port });
    
    httpServer.listen(
      { port, host: process.env.HOST || "localhost" },
      () => {
      logger.info('Server started', 'server', { port, host: process.env.HOST || "localhost" });
      },
    );
  } catch (err: any) {
    logger.error('FATAL STARTUP ERROR', 'server', {}, err as Error);
    process.exit(1);
  }
})();
