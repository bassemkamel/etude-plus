import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { mkdir, writeFile, readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../lib/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
]);

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

// Directory for local-mode uploads (used when Replit object storage is unavailable)
const LOCAL_UPLOAD_DIR = join(process.cwd(), "local-uploads");

async function ensureLocalUploadDir() {
  if (!existsSync(LOCAL_UPLOAD_DIR)) {
    await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  }
}

// Check whether the Replit object-storage sidecar is reachable
async function isReplitStorageAvailable(): Promise<boolean> {
  if (!process.env["PRIVATE_OBJECT_DIR"]) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    const res = await fetch("http://127.0.0.1:1106/health", { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * POST /storage/uploads/request-url
 * Returns a presigned GCS URL when on Replit, or a local-mode signal otherwise.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body ?? {};

  if (!name || !contentType) {
    res.status(400).json({ error: "Missing required fields: name, contentType" });
    return;
  }

  if (typeof name !== "string" || name.length > 255) {
    res.status(400).json({ error: "Invalid file name" });
    return;
  }

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    res.status(400).json({ error: "Unsupported file type" });
    return;
  }

  if (size !== undefined && (typeof size !== "number" || size > MAX_UPLOAD_BYTES || size < 0)) {
    res.status(400).json({ error: `File size must not exceed ${MAX_UPLOAD_BYTES / 1024 / 1024}MB` });
    return;
  }

  // Try GCS / Replit object storage first
  const replitAvailable = await isReplitStorageAvailable();
  if (replitAvailable) {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
      return;
    } catch (error) {
      console.error("GCS upload URL generation failed, falling back to local storage:", error);
    }
  }

  // Local fallback
  const ext = name.split(".").pop() ?? "bin";
  const id = randomUUID();
  const objectPath = `/local/${id}.${ext}`;
  res.json({ uploadURL: null, objectPath, local: true, metadata: { name, size, contentType } });
});

/**
 * POST /storage/uploads/direct
 * Local-mode upload: accepts base64-encoded file content and saves to disk.
 */
router.post("/storage/uploads/direct", requireAuth, async (req: Request, res: Response) => {
  const { objectPath, content, contentType } = req.body ?? {};

  if (!objectPath || !content || !contentType) {
    res.status(400).json({ error: "Missing required fields: objectPath, content, contentType" });
    return;
  }

  if (!objectPath.startsWith("/local/")) {
    res.status(400).json({ error: "Invalid object path for local upload" });
    return;
  }

  // content is a data URL: "data:<type>;base64,<data>" or raw base64
  let base64Data = content as string;
  if (base64Data.includes(",")) {
    base64Data = base64Data.split(",")[1];
  }

  try {
    const buffer = Buffer.from(base64Data, "base64");
    await ensureLocalUploadDir();
    const filename = objectPath.replace("/local/", "");
    await writeFile(join(LOCAL_UPLOAD_DIR, filename), buffer);
    res.json({ objectPath });
  } catch (error) {
    console.error("Local upload failed:", error);
    res.status(500).json({ error: "Failed to save file locally" });
  }
});

/**
 * GET /storage/local/:filename
 * Serve locally stored files. Requires auth — UUIDs are hard to guess but not a security boundary.
 */
router.get("/storage/local/:filename", requireAuth, async (req: Request, res: Response) => {
  const filename = String(req.params.filename);
  if (!filename || filename.includes("..") || filename.includes("/")) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const filePath = join(LOCAL_UPLOAD_DIR, filename);
  try {
    await stat(filePath); // throws if not found
    const data = await readFile(filePath);
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      mp4: "video/mp4",
      webm: "video/webm",
      mp3: "audio/mpeg",
    };
    const contentType = mimeMap[ext ?? ""] ?? "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", "inline"); // never execute as HTML
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(data);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

/**
 * GET /storage/public-objects/*
 * Serve public assets unconditionally (no auth required).
 */
router.get("/storage/public-objects/*splat", async (req: Request, res: Response) => {
  const objectStorageService = new ObjectStorageService();
  const filePath = (req.params as any).splat as string;
  try {
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    const response = await objectStorageService.downloadObject(file);
    const headers = Object.fromEntries(response.headers.entries());
    res.set(headers);
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.status(204).end();
    }
  } catch (error) {
    console.error("Error serving public object:", error);
    res.status(500).json({ error: "Failed to serve object" });
  }
});

/**
 * GET /storage/neon/:fileUrl
 * Serve files stored as bytea in Neon knowledge_base_files.file_data.
 * fileUrl is the /neon/... path stored in the file_url column.
 */
router.get("/storage/neon/*splat", requireAuth, async (req: Request, res: Response) => {
  const splat = (req.params as any).splat as string;
  const fileUrl = `/neon/${splat}`;
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ file_data: Buffer; file_type: string | null; file_name: string }>(
      "SELECT file_data, file_type, file_name FROM knowledge_base_files WHERE file_url = $1 LIMIT 1",
      [fileUrl],
    );
    if (!rows[0]?.file_data) {
      res.status(404).json({ error: "File not found in Neon storage" });
      return;
    }
    const { file_data, file_type, file_name } = rows[0];
    const contentType = file_type ?? "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file_name)}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(file_data);
  } catch (err) {
    console.error("[storage/neon] error:", err);
    res.status(500).json({ error: "Failed to serve file" });
  } finally {
    client.release();
  }
});

/**
 * GET /storage/objects/*
 * Serve private uploaded objects. Requires authentication.
 */
router.get("/storage/objects/*splat", requireAuth, async (req: Request, res: Response) => {
  const objectStorageService = new ObjectStorageService();
  const objectPath = `/objects/${(req.params as any).splat}`;
  try {
    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(file);
    const headers = Object.fromEntries(response.headers.entries());
    res.set(headers);
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.status(204).end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
    } else {
      console.error("Error serving object:", error);
      res.status(500).json({ error: "Failed to serve object" });
    }
  }
});

export default router;
