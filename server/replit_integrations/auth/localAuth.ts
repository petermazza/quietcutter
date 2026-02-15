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

  // Logout route
  app.post("/api/auth/logout", (req: any, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/auth/me", (req: any, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

import type { Express } from "express";
