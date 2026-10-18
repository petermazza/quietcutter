import { Response, NextFunction } from "express";

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
