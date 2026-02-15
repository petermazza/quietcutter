import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  console.log(`Serving static files from: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(`ERROR: Build directory not found: ${distPath}`);
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  console.log(`Static files found, serving...`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // BUT don't intercept /api routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
