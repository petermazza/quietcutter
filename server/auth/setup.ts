import passport from "passport";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express } from "express";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET environment variable is required. Please set a strong, random secret.');
  }

  let sessionStore;

  // Try to use PostgreSQL store, fallback to memory store in development
  if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'development') {
    try {
      const pgStore = connectPg(session);
      sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: false,
        ttl: sessionTtl,
        tableName: "sessions",
      });
      console.log("Using PostgreSQL session store");
    } catch (error) {
      console.warn("Failed to create PostgreSQL session store, falling back to memory store:", error);
      sessionStore = new session.MemoryStore();
    }
  } else {
    console.log("Using memory session store for development");
    sessionStore = new session.MemoryStore();
  }

  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, cb) => {
    cb(null, user.id);
  });

  passport.deserializeUser(async (id: string, cb) => {
    try {
      // Check if this is the admin fallback user
      if (id === "admin-fallback-id") {
        const adminUser = {
          id: "admin-fallback-id",
          email: "admin@quietcutter.dev",
          firstName: "Admin",
          lastName: "User",
          isAdmin: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return cb(null, adminUser);
      }

      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) {
        return cb(new Error("User not found"));
      }
      cb(null, user);
    } catch (err) {
      cb(err);
    }
  });
}
