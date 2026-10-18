import type { Express } from "express";
import { db } from "../db";
import { users, otpCodes } from "@shared/models/auth";
import { and, desc, eq, isNull } from "drizzle-orm";
import { verifyAuth0IdToken } from "./auth0";
import { otpSendLimiter, otpVerifyLimiter } from "../middleware/rateLimiter";
import {
  OTP_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  generateOtpCode,
  hashOtpCode,
  isValidEmail,
  normalizeEmail,
  sendOtpEmail,
  verifyOtpCodeHash,
} from "./otp";

export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", (req: any, res: any) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Passwordless sign-in, step 1: email a one-time code.
  app.post("/api/auth/otp/send", otpSendLimiter, async (req: any, res: any) => {
    try {
      if (typeof req.body?.email !== "string") {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }
      const email = normalizeEmail(req.body.email);
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }

      const [existing] = await db
        .select()
        .from(otpCodes)
        .where(and(eq(otpCodes.email, email), isNull(otpCodes.usedAt)))
        .orderBy(desc(otpCodes.createdAt))
        .limit(1);

      if (
        existing?.createdAt &&
        Date.now() - existing.createdAt.getTime() < OTP_COOLDOWN_MS
      ) {
        return res.status(429).json({
          message: "Please wait 30 seconds before requesting another code",
        });
      }

      // Invalidate any previous unused codes so only the newest one works.
      await db
        .update(otpCodes)
        .set({ usedAt: new Date() })
        .where(and(eq(otpCodes.email, email), isNull(otpCodes.usedAt)));

      const code = generateOtpCode();
      await db.insert(otpCodes).values({
        email,
        codeHash: hashOtpCode(email, code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      });

      try {
        await sendOtpEmail(email, code);
      } catch (err) {
        console.error("Failed to send OTP email:", err);
        return res.status(503).json({ message: "Email service is not configured" });
      }

      res.json({ success: true, message: "Verification code sent" });
    } catch (err) {
      console.error("OTP send error:", err);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Passwordless sign-in, step 2: verify the code and create the session.
  // Unknown emails create an account automatically.
  app.post("/api/auth/otp/verify", otpVerifyLimiter, async (req: any, res: any) => {
    try {
      if (typeof req.body?.email !== "string" || typeof req.body?.code !== "string") {
        return res.status(400).json({ message: "Valid email and 6-digit code are required" });
      }
      const email = normalizeEmail(req.body.email);
      const code = req.body.code.trim();
      if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ message: "Valid email and 6-digit code are required" });
      }

      const [record] = await db
        .select()
        .from(otpCodes)
        .where(and(eq(otpCodes.email, email), isNull(otpCodes.usedAt)))
        .orderBy(desc(otpCodes.createdAt))
        .limit(1);

      if (!record || record.expiresAt.getTime() < Date.now()) {
        return res.status(401).json({ message: "Invalid or expired verification code" });
      }

      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        return res.status(401).json({
          message: "Too many incorrect attempts. Please request a new code.",
        });
      }

      if (!verifyOtpCodeHash(email, code, record.codeHash)) {
        const nextAttempts = record.attempts + 1;
        await db
          .update(otpCodes)
          .set({
            attempts: nextAttempts,
            ...(nextAttempts >= OTP_MAX_ATTEMPTS ? { usedAt: new Date() } : {}),
          })
          .where(eq(otpCodes.id, record.id));

        if (nextAttempts >= OTP_MAX_ATTEMPTS) {
          return res.status(401).json({
            message: "Too many incorrect attempts. Please request a new code.",
          });
        }
        return res.status(401).json({ message: "Invalid or expired verification code" });
      }

      await db
        .update(otpCodes)
        .set({ usedAt: new Date() })
        .where(eq(otpCodes.id, record.id));

      const [existingUser] = await db.select().from(users).where(eq(users.email, email));
      let dbUser = existingUser;
      if (!dbUser) {
        const [newUser] = await db
          .insert(users)
          .values({ email })
          .returning();
        dbUser = newUser;
      }

      req.login(dbUser, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session" });
        }
        res.json({ success: true, user: dbUser });
      });
    } catch (err) {
      console.error("OTP verify error:", err);
      res.status(500).json({ message: "Verification failed" });
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

    const email = typeof claims.email === "string" ? normalizeEmail(claims.email) : null;
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

  // Admin login (no authentication required) — dev and test only.
  app.post("/api/auth/admin-login", async (req: any, res: any) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Admin login is disabled in production" });
    }
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
