/**
 * Content Extractor — downloads uploaded files from storage and extracts
 * raw text for AI processing.
 *
 * OCR provider priority:
 *   1. Gemini  (if GEMINI_API_KEY is set)
 *   2. Anthropic Claude (if ANTHROPIC_API_KEY is set)
 *   3. Error — neither key present
 */

import { join } from "path";
import { readFile } from "fs/promises";
import { ObjectStorageService } from "../lib/objectStorage";

const LOCAL_UPLOAD_DIR = join(process.cwd(), "local-uploads");
const storageService = new ObjectStorageService();

// ── File buffer fetcher ───────────────────────────────────────────────────────

async function getFileBuffer(fileUrl: string): Promise<Buffer> {
  if (fileUrl.startsWith("/local/")) {
    const filename = fileUrl.slice("/local/".length);
    return readFile(join(LOCAL_UPLOAD_DIR, filename));
  }
  if (fileUrl.startsWith("/objects/")) {
    const file = await storageService.getObjectEntityFile(fileUrl);
    const [buffer] = await file.download();
    return buffer as Buffer;
  }
  if (fileUrl.startsWith("/neon/")) {
    // File bytes stored in Neon's file_data bytea column
    const { pool } = await import("@workspace/db");
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ file_data: Buffer }>(
        "SELECT file_data FROM knowledge_base_files WHERE file_url = $1 LIMIT 1",
        [fileUrl],
      );
      if (!rows[0]?.file_data) throw new Error(`No file_data found in Neon for ${fileUrl}`);
      return rows[0].file_data;
    } finally {
      client.release();
    }
  }
  throw new Error(`Unsupported storage path format: ${fileUrl}`);
}

// ── OCR: PDF ──────────────────────────────────────────────────────────────────

async function ocrPdfWithGemini(buffer: Buffer): Promise<string> {
  const apiKey = process.env["GEMINI_API_KEY"]!;
  const base64 = buffer.toString("base64");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: "application/pdf", data: base64 } },
            { text: "Extract ALL text from this educational document exactly as it appears. Preserve mathematical notation, tables, exercise numbers, question sub-parts and mark allocations. Return only the raw text — no commentary." },
          ],
        }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0 },
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini PDF OCR error ${response.status}: ${(err as any).error?.message ?? ""}`);
  }
  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

async function ocrPdfWithAnthropic(buffer: Buffer): Promise<string> {
  const apiKey = process.env["ANTHROPIC_API_KEY"]!;
  const base64 = buffer.toString("base64");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: "Extract ALL text from this educational document exactly as it appears. Preserve mathematical notation, tables, exercise numbers, question sub-parts and mark allocations. Return only the raw text — no commentary." },
        ],
      }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude PDF OCR error ${response.status}: ${(err as any).error?.message ?? ""}`);
  }
  const data = await response.json() as { content: { text: string }[] };
  return (data.content?.[0]?.text ?? "").trim();
}

async function ocrPdf(buffer: Buffer): Promise<string> {
  if (process.env["GEMINI_API_KEY"]) {
    console.log("[contentExtractor] Using Gemini for PDF OCR");
    return ocrPdfWithGemini(buffer);
  }
  if (process.env["ANTHROPIC_API_KEY"]) {
    console.log("[contentExtractor] Using Anthropic for PDF OCR");
    return ocrPdfWithAnthropic(buffer);
  }
  throw new Error("No AI API key set — add GEMINI_API_KEY or ANTHROPIC_API_KEY to use PDF OCR");
}

async function extractPdf(fileUrl: string): Promise<string> {
  const { default: pdfParse } = await import("pdf-parse") as any;
  const buffer = await getFileBuffer(fileUrl);
  const result = await pdfParse(buffer);
  const text   = (result.text as string).trim();
  if (text.length < 200) {
    console.log("[contentExtractor] pdf-parse returned sparse text — falling back to AI OCR");
    return ocrPdf(buffer);
  }
  return text;
}

// ── OCR: Image ────────────────────────────────────────────────────────────────

async function ocrImageWithGemini(buffer: Buffer, mediaType: string): Promise<string> {
  const apiKey = process.env["GEMINI_API_KEY"]!;
  const base64 = buffer.toString("base64");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: mediaType, data: base64 } },
            { text: "Extract ALL text from this educational document image exactly as it appears. Preserve mathematical notation, tables, and exercise numbers. Return only the raw text content." },
          ],
        }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0 },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini Vision OCR error ${response.status}: ${(err as any).error?.message ?? ""}`);
  }
  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

async function ocrImageWithAnthropic(buffer: Buffer, mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"): Promise<string> {
  const apiKey = process.env["ANTHROPIC_API_KEY"]!;
  const base64 = buffer.toString("base64");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Extract ALL text from this educational document image exactly as it appears. Preserve mathematical notation, tables, and exercise numbers. Return only the raw text content." },
        ],
      }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Anthropic Vision OCR error ${response.status}: ${(err as any).error?.message ?? ""}`);
  }
  const data = await response.json() as { content: { text: string }[] };
  return (data.content?.[0]?.text ?? "").trim();
}

async function extractImage(fileUrl: string, fileType: string | null): Promise<string> {
  const buffer = await getFileBuffer(fileUrl);
  const mime = (fileType ?? "").toLowerCase();
  const ext  = fileUrl.split(".").pop()?.toLowerCase() ?? "";
  const mediaType =
    mime.includes("png") || ext === "png"   ? "image/png"  :
    mime.includes("webp") || ext === "webp" ? "image/webp" :
    mime.includes("gif")  || ext === "gif"  ? "image/gif"  :
    "image/jpeg";

  if (process.env["GEMINI_API_KEY"]) return ocrImageWithGemini(buffer, mediaType);
  if (process.env["ANTHROPIC_API_KEY"]) return ocrImageWithAnthropic(buffer, mediaType as any);
  throw new Error("No AI API key set — add GEMINI_API_KEY or ANTHROPIC_API_KEY to use image OCR");
}

// ── DOCX / PPTX ───────────────────────────────────────────────────────────────

async function extractDocx(fileUrl: string): Promise<string> {
  const { default: mammoth } = await import("mammoth") as any;
  const buffer = await getFileBuffer(fileUrl);
  const result = await mammoth.extractRawText({ buffer });
  return (result.value as string).trim();
}

async function extractPptx(fileUrl: string): Promise<string> {
  const { default: officeParser } = await import("officeparser") as any;
  const buffer = await getFileBuffer(fileUrl);
  const text: string = await officeParser.parseOfficeAsync(buffer, { outputErrorToConsole: false });
  return text.trim();
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function extractText(fileUrl: string, fileType: string | null): Promise<string> {
  const t   = (fileType ?? "").toLowerCase();
  const ext = fileUrl.split(".").pop()?.toLowerCase() ?? "";

  if (t.includes("text/plain") || t === "text" || ext === "txt") {
    return (await getFileBuffer(fileUrl)).toString("utf-8").trim();
  }
  if (t.includes("pdf") || ext === "pdf")              return extractPdf(fileUrl);
  if (t.includes("wordprocessingml") || t.includes("docx") || ext === "docx") return extractDocx(fileUrl);
  if (t.includes("presentationml")  || t.includes("pptx") || ext === "pptx") return extractPptx(fileUrl);
  if (t.includes("image/") || ["jpeg","jpg","png","webp","gif"].includes(ext)) return extractImage(fileUrl, fileType);

  throw new Error(`Unsupported file type for text extraction: ${fileType ?? ext ?? "unknown"}`);
}
