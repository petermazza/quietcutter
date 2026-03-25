import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

const { Pool } = pg;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return url;
}

export const pool = new Pool({ connectionString: getDatabaseUrl() });
export const db = drizzle(pool, { schema });

// Create admin user if it doesn't exist
export async function ensureAdminUser() {
  try {
    const adminEmail = "admin@quietcutter.dev";
    
    // Check if admin user already exists
    const [existingAdmin] = await db.select().from(users).where(eq(users.email, adminEmail));
    
    if (!existingAdmin) {
      // Create admin user
      const [newAdmin] = await db.insert(users).values({
        email: adminEmail,
        firstName: "Admin",
        lastName: "User",
        isAdmin: true,
      }).returning();
      
      console.log("Admin user created:", newAdmin.email);
    } else {
      // Ensure existing admin user has admin flag set
      if (!existingAdmin.isAdmin) {
        const [updatedAdmin] = await db.update(users)
          .set({ isAdmin: true })
          .where(eq(users.email, adminEmail))
          .returning();
        console.log("Admin user updated with admin privileges:", updatedAdmin.email);
      } else {
        console.log("Admin user already exists:", existingAdmin.email);
      }
    }
  } catch (error) {
    console.error("Error ensuring admin user:", error);
  }
}
