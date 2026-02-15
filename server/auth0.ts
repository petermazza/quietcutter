import { auth, requiredScopes } from "express-oauth2-jwt-bearer";
import { Express, Request, Response, NextFunction } from "express";

// Auth0 JWT validation middleware
export const validateAuth0Token = (req: Request, res: Response, next: NextFunction) => {
  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE || `https://${domain}/api/v2/`;
  
  if (!domain) {
    // Skip Auth0 validation if not configured
    return next();
  }

  try {
    const jwtCheck = auth({
      issuerBaseURL: `https://${domain}`,
      audience: audience,
    });
    jwtCheck(req, res, next);
  } catch (error) {
    // If JWT validation fails, continue to next auth method
    next();
  }
};

// Middleware to extract user from Auth0 token
export const extractAuth0User = async (req: any, res: Response, next: NextFunction) => {
  if (req.auth && req.auth.sub) {
    // Auth0 token found, extract user info
    req.auth0User = {
      id: req.auth.sub,
      email: req.auth.email,
      name: req.auth.name,
      picture: req.auth.picture,
    };
  }
  next();
};

// Combined auth middleware - tries Auth0 first, then falls back to session
export const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  // Check if already authenticated via session (local auth)
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Try Auth0 JWT validation
  const domain = process.env.AUTH0_DOMAIN;
  if (domain) {
    try {
      const { auth } = await import("express-oauth2-jwt-bearer");
      const audience = process.env.AUTH0_AUDIENCE || `https://${domain}/api/v2/`;
      const jwtCheck = auth({
        issuerBaseURL: `https://${domain}`,
        audience: audience,
      });
      
      jwtCheck(req, res, (err: any) => {
        if (!err && req.auth) {
          // Auth0 authentication successful
          req.user = {
            id: req.auth.sub,
            email: req.auth.email || req.auth.sub,
            firstName: req.auth.name?.split(' ')[0] || null,
            lastName: req.auth.name?.split(' ').slice(1).join(' ') || null,
            profileImageUrl: req.auth.picture || null,
          };
          return next();
        }
        // Auth0 failed, check if local auth is available
        if (req.isAuthenticated && req.isAuthenticated()) {
          return next();
        }
        return res.status(401).json({ message: "Authentication required" });
      });
    } catch (error) {
      // Auth0 not available, check local auth
      if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
      }
      return res.status(401).json({ message: "Authentication required" });
    }
  } else {
    // No Auth0 configured, require local auth
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ message: "Authentication required" });
  }
};
