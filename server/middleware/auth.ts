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
  next();
}

// Middleware to check if user is Pro
export async function requirePro(req: any, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Invalid user session" });
  }

  try {
    const { db } = await import("../db");
    const { subscriptions } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const result = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    
    const isPro = result.length > 0 && result[0].status === 'active';
    if (!isPro) {
      return res.status(403).json({ message: "Pro subscription required" });
    }
    
    next();
  } catch (err) {
    console.error("Error checking Pro status:", err);
    return res.status(500).json({ message: "Failed to verify subscription" });
  }
}
