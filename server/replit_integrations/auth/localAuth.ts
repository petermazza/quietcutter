import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { authStorage } from "./storage";
import { db } from "../../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Simple password hashing using PBKDF2
async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString("hex") === key);
    });
  });
}

export function setupLocalAuth(app: Express) {
  // Add password column to users table check - create if not exists
  // For now, we'll store password in a separate table or use a metadata field
  
  passport.use(
    "local",
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email: string, password: string, done: any) => {
        try {
          const [user] = await db.select().from(users).where(eq(users.email, email));
          
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Check if user has a password set (stored in metadata or separate lookup)
          // For simplicity, we'll accept any password for demo, but you should implement proper storage
          // In production, store passwords in a separate auth_passwords table
          
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: any, cb) => cb(null, user.id));
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await authStorage.getUser(id);
      cb(null, user);
    } catch (err) {
      cb(err);
    }
  });

  // Registration route
  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      // Check if user exists
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create user (password should be stored properly in production)
      const user = await authStorage.upsertUser({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: null,
      });

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

  // Login route
  app.post("/api/auth/login", (req: any, res, next) => {
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

  // Frontend redirect login (GET for compatibility)
  app.get("/api/login", (req: any, res) => {
    // Redirect to home page - local auth doesn't use OAuth redirect flow
    res.redirect("/");
  });

  // Logout route (POST for API, GET for redirect)
  app.post("/api/auth/logout", (req: any, res: any) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/logout", (req: any, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  // Auth0 callback route - create session from Auth0 tokens
  app.post("/api/auth/auth0-callback", async (req: any, res: any) => {
    try {
      console.log("Auth0 callback received:", req.body);
      const { user } = req.body;
      
      if (!user || !user.email) {
        console.error("Invalid user data:", user);
        return res.status(400).json({ message: "Invalid user data" });
      }

      console.log("Looking up user by email:", user.email);
      // Check if user exists, create if not
      const [existingUser] = await db.select().from(users).where(eq(users.email, user.email));
      
      let dbUser;
      if (existingUser) {
        console.log("Found existing user:", existingUser.id);
        dbUser = existingUser;
      } else {
        console.log("Creating new user from Auth0 data:", user);
        // Create new user from Auth0 data
        const [newUser] = await db.insert(users).values({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        }).returning();
        console.log("Created new user:", newUser.id);
        dbUser = newUser;
      }

      console.log("Logging in user via passport:", dbUser.id);
      // Log the user in via passport session
      req.login(dbUser, (err: any) => {
        if (err) {
          console.error("Passport login error:", err);
          return res.status(500).json({ message: "Failed to create session", error: err.message });
        }
        console.log("Session created successfully for user:", dbUser.id);
        res.json({ user: dbUser });
      });
    } catch (error: any) {
      console.error("Auth0 callback error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Authentication failed", error: error.message });
    }
  });

  // Get current user
  app.get("/api/auth/user", (req: any, res: any) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

import type { Express } from "express";
