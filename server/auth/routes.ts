import type { Express } from "express";
import passport from "passport";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { hashPassword } from "./setup";
import { verifyAuth0IdToken } from "./auth0";

export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", (req: any, res: any) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Email/password login
  app.post("/api/auth/login", (req: any, res: any, next: any) => {
    if (typeof req.body?.email !== "string" || typeof req.body?.password !== "string") {
      return res.status(400).json({ message: "Email and password required" });
    }
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err: any) => {
        if (err) {
          return next(err);
        }
        return res.json({ success: true, user });
      });
    })(req, res, next);
  });

  // Email/password registration
  app.post("/api/auth/register", async (req: any, res: any) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);

      const [user] = await db.insert(users).values({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: null,
      }).returning();

      req.login(user, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        return res.json({ success: true, user });
      });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Auth0 callback — creates a session only from a verified Auth0 ID token.
  app.post("/api/auth/auth0-callback", async (req: any, res: any) => {
    if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID) {
      return res.status(503).json({ message: "Auth0 is not configured" });
    }
    const { idToken, nonce } = req.body ?? {};
    if (typeof idToken !== "string" || !idToken ||
        typeof nonce !== "string" || !nonce) {
      return res.status(401).json({ message: "Auth0 token required" });
    }

    let claims;
    try {
      claims = await verifyAuth0IdToken(idToken, nonce);
    } catch {
      return res.status(401).json({ message: "Invalid Auth0 token" });
    }

    const email = typeof claims.email === "string" ? claims.email : null;
    if (!email) {
      return res.status(400).json({ message: "Auth0 token has no email" });
    }
    // Reject unverified emails when Auth0 reports them — otherwise an
    // unverified signup could take over an existing account with that email.
    if (claims.email_verified === false) {
      return res.status(403).json({ message: "Email address is not verified" });
    }

    try {
      const [existingUser] = await db.select().from(users).where(eq(users.email, email));

      let dbUser;
      if (existingUser) {
        dbUser = existingUser;
      } else {
        const name = typeof claims.name === "string" ? claims.name.split(" ") : [];
        const given = typeof claims.given_name === "string" ? claims.given_name : null;
        const family = typeof claims.family_name === "string" ? claims.family_name : null;
        const picture = typeof claims.picture === "string" ? claims.picture : null;
        const [newUser] = await db.insert(users).values({
          email,
          firstName: given || name[0] || null,
          lastName: family || name.slice(1).join(" ") || null,
          profileImageUrl: picture,
        }).returning();
        dbUser = newUser;
      }

      req.login(dbUser, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session", error: err.message });
        }
        res.json({ user: dbUser });
      });
    } catch (error: any) {
      console.error("Auth0 callback error:", error);
      res.status(500).json({ message: "Authentication failed", error: error.message });
    }
  });

  // Admin login (no authentication required)
  app.post("/api/auth/admin-login", async (req: any, res: any) => {
    try {
      // Prefer the real admin row so isAdmin checks (e.g. Pro gating) work
      const [dbAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.email, "admin@quietcutter.dev"))
        .limit(1);

      const admin = dbAdmin || {
        id: "admin-fallback-id",
        email: "admin@quietcutter.dev",
        firstName: "Admin",
        lastName: "User",
        isAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log("Admin login requested - creating admin session");
      
      // Create session for admin user
      req.login(admin, (err: any) => {
        if (err) {
          console.error("Failed to create admin session:", err);
          return res.status(500).json({ message: "Failed to create admin session" });
        }
        console.log("Admin session created successfully");
        return res.json({ success: true, user: admin });
      });
    } catch (error: any) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Admin login failed" });
    }
  });

  // Logout (POST for API)
  app.post("/api/auth/logout", (req: any, res: any) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Logout (GET for redirect)
  app.get("/api/logout", (req: any, res: any) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  // Login redirect (GET for compatibility)
  app.get("/api/login", (_req: any, res: any) => {
    res.redirect("/");
  });
}
