import type { Express } from "express";
import passport from "passport";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { hashPassword } from "./setup";

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

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
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

  // Auth0 callback — creates session from Auth0 tokens
  app.post("/api/auth/auth0-callback", async (req: any, res: any) => {
    try {
      const { user } = req.body;

      if (!user || !user.email) {
        return res.status(400).json({ message: "Invalid user data" });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.email, user.email));

      let dbUser;
      if (existingUser) {
        dbUser = existingUser;
      } else {
        const [newUser] = await db.insert(users).values({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
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
      // Create fallback admin user that always works
      const admin = {
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
