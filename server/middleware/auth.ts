import { Request, Response, NextFunction } from "express";

// Middleware to require authentication
export function requireAuth(req: any, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Authentication required" });
}

// Middleware to optionally get user (doesn't fail if not authenticated)
export function optionalAuth(req: any, res: Response, next: NextFunction) {
  // Just continue - user will be in req.user if authenticated
  next();
}

// Middleware to check if user is Pro
export async function requirePro(req: any, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const userId = req.user?.id || req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Invalid user session" });
  }

  try {
    const { db } = await import("../db");
    const { sql } = await import("drizzle-orm");
    
    const result = await db.execute(
      sql`SELECT s.status FROM stripe.subscriptions s
          JOIN stripe.customers c ON s.customer = c.id
          WHERE c.metadata->>'userId' = ${userId}
          AND s.status = 'active'
          LIMIT 1`
    );
    
    const isPro = (result.rows?.length ?? 0) > 0;
    if (!isPro) {
      return res.status(403).json({ message: "Pro subscription required" });
    }
    
    next();
  } catch (err) {
    console.error("Error checking Pro status:", err);
    return res.status(500).json({ message: "Failed to verify subscription" });
  }
}
