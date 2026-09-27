import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, HttpStatus } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { PrismaService } from "./prisma.service";
import { AuthGuard, Roles, RolesGuard, type AuthedUser } from "./common/guards";
import { apiError } from "./common/errors";

type AiSourceFile = {
  name: string;
  mimeType: string;
  data: string;
};

type AiGeneratedQuestion = {
  question?: string;
  question_text?: string;
  options?: string[];
  answer?: string;
  marks_breakdown?: string;
  topic?: string;
  difficulty?: string;
  type?: string;
};

type AiSourceChunk = {
  file: AiSourceFile;
  pageRange?: string;
  source?: PDFDocument;
  startPage?: number;
  endPage?: number;
};

type AiGenerationJob = {
  userId: string;
  status: "preparing" | "reading" | "generating" | "saving" | "completed" | "failed";
  progress: number;
  message: string;
  currentChunk: number;
  totalChunks: number;
  updatedAt: number;
  result?: unknown;
  error?: string;
};

const aiGenerationJobs = new Map<string, AiGenerationJob>();

function cleanExpiredAiJobs() {
  const expiry = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of aiGenerationJobs) {
    if (job.updatedAt < expiry) aiGenerationJobs.delete(id);
  }
}

function isTransientAiError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as any;
  const statuses = [
    value.status,
    value.statusCode,
    value.code,
    value.error?.code,
    value.error?.status,
    value.response?.status,
    value.cause?.status,
  ];
  if (statuses.some((status) => {
    const code = Number(status);
    return code === 429 || (code >= 500 && code <= 599);
  })) return true;
  return /high demand|temporar(?:ily|y) unavailable|overload|unavailable|resource_exhausted/i.test(value.message ?? "");
}

async function splitPdfIntoChunks(file: AiSourceFile, pagesPerChunk: number): Promise<AiSourceChunk[]> {
  let source: PDFDocument;
  try {
    source = await PDFDocument.load(Buffer.from(file.data, "base64"));
  } catch {
    apiError(HttpStatus.BAD_REQUEST, "PDF_INVALID", `Impossible de lire le PDF ${file.name}.`);
  }

  const pageCount = source!.getPageCount();
  if (!pageCount) apiError(HttpStatus.BAD_REQUEST, "PDF_EMPTY", `Le PDF ${file.name} ne contient aucune page.`);

  const chunks: AiSourceChunk[] = [];
  for (let start = 0; start < pageCount; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, pageCount);
    chunks.push({
      file,
      pageRange: `${start + 1}-${end}`,
      source: source!,
      startPage: start,
      endPage: end,
    });
  }
  return chunks;
}

async function createPdfChunk(chunk: AiSourceChunk): Promise<AiSourceFile> {
  const document = await PDFDocument.create();
  const pages = await document.copyPages(
    chunk.source!,
    Array.from({ length: chunk.endPage! - chunk.startPage! }, (_, index) => chunk.startPage! + index),
  );
  pages.forEach((page) => document.addPage(page));
  const bytes = await document.save();
  return {
    ...chunk.file,
    mimeType: "application/pdf",
    data: Buffer.from(bytes).toString("base64"),
  };
}

function stripJsonFences(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseAiQuestions(text: string): AiGeneratedQuestion[] {
  const parsed = JSON.parse(stripJsonFences(text));
  const items = Array.isArray(parsed) ? parsed : parsed.questions;
  return Array.isArray(items) ? items : [];
}

function formatAiQuestionText(item: AiGeneratedQuestion) {
  const question = String(item.question ?? item.question_text ?? "").trim();
  const options = Array.isArray(item.options) ? item.options.filter(Boolean) : [];
  if (!options.length) return question;
  return `${question}\n\n${options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n")}`;
}

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(private prisma: PrismaService) { }

  private async audit(req: FastifyRequest & { user: AuthedUser }, action: string, entity: string, entityId?: string, metadata: object = {}) {
    await this.prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: metadata as Prisma.InputJsonValue,
        ip: req.ip,
      },
    });
  }

  @Get("users")
  @Roles("admin", "super_admin")
  async users(
    @Query("q") q?: string,
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    const take = Math.min(Number(limit) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const where: Prisma.UserWhereInput = {};
    if (q) where.OR = [{ email: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }];
    if (role) where.role = role as any;
    if (status) where.status = status as any;
    else where.deletedAt = null;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { student: true, subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map(({ passwordHash: _, ...u }) => u),
      total,
      page: Number(page) || 1,
      limit: take,
    };
  }

  @Post("users")
  @Roles("super_admin")
  async createUser(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
    const email = String(body.email ?? "").toLowerCase().trim();
    if (!email || !body.password || !body.firstName) apiError(HttpStatus.BAD_REQUEST, "INVALID", "Champs requis manquants.");
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) apiError(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Email déjà utilisé.");
    const role = body.role ?? "student";
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(body.password, 12),
        role,
        firstName: body.firstName,
        lastName: body.lastName ?? "",
        fullName: `${body.firstName} ${body.lastName ?? ""}`.trim(),
        emailVerified: true,
        student: role === "student" ? { create: { gradeLevel: body.gradeLevel ?? null, educationSection: body.educationSection ?? "" } } : undefined,
      },
    });
    await this.audit(req, "create_user", "user", user.id, { email, role });
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  @Patch("users/:id")
  @Roles("super_admin")
  async editUser(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string, @Body() body: any) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Utilisateur introuvable.");
    const data: Prisma.UserUpdateInput = {};
    if (body.firstName) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.firstName || body.lastName !== undefined) {
      data.fullName = `${body.firstName ?? target!.firstName} ${body.lastName ?? target!.lastName}`.trim();
    }
    if (body.email) data.email = String(body.email).toLowerCase().trim();
    if (body.role) data.role = body.role;
    const user = await this.prisma.user.update({ where: { id }, data });
    if (body.gradeLevel !== undefined) {
      await this.prisma.studentProfile.upsert({
        where: { userId: id },
        create: { userId: id, gradeLevel: body.gradeLevel, educationSection: body.educationSection ?? "" },
        update: { gradeLevel: body.gradeLevel, educationSection: body.educationSection ?? undefined },
      });
    }
    await this.audit(req, "edit_user", "user", id, body);
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  @Post("users/:id/suspend")
  @Roles("admin", "super_admin")
  async suspend(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Utilisateur introuvable.");
    if (target!.role === "super_admin") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Impossible de suspendre un super admin.");
    if (target!.role === "admin" && req.user.role !== "super_admin") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Accès insuffisant.");
    const user = await this.prisma.user.update({ where: { id }, data: { status: "suspended" } });
    await this.audit(req, "suspend_user", "user", id);
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  @Post("users/:id/activate")
  @Roles("admin", "super_admin")
  async activate(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
    const user = await this.prisma.user.update({ where: { id }, data: { status: "active", archivedAt: null } });
    await this.audit(req, "activate_user", "user", id);
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  @Post("users/:id/archive")
  @Roles("super_admin")
  async archive(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
    const user = await this.prisma.user.update({ where: { id }, data: { status: "archived", archivedAt: new Date() } });
    await this.audit(req, "archive_user", "user", id);
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  @Delete("users/:id")
  @Roles("super_admin")
  async softDelete(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
    if (id === req.user.id) apiError(HttpStatus.BAD_REQUEST, "INVALID", "Impossible de supprimer votre compte.");
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Utilisateur introuvable.");
    if (target!.role === "super_admin") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Impossible de supprimer un super admin.");
    const user = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: "archived", archivedAt: new Date(), email: `deleted+${id}@invalid.local` },
    });
    await this.prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
    await this.audit(req, "soft_delete_user", "user", id, { email: target!.email });
    return { ok: true, id: user.id };
  }

  @Post("users/:id/restore")
  @Roles("super_admin")
  async restore(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: null, status: "active", archivedAt: null },
    });
    await this.audit(req, "restore_user", "user", id);
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  @Get("plans")
  @Roles("super_admin")
  listPlans() {
    return this.prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  }

  @Post("plans")
  @Roles("super_admin")
  async createPlan(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
    const plan = await this.prisma.plan.create({
      data: {
        code: String(body.code).toUpperCase(),
        nameFr: body.nameFr,
        nameEn: body.nameEn ?? body.nameFr,
        nameAr: body.nameAr ?? body.nameFr,
        descriptionJson: body.descriptionJson ?? {},
        priceTnd: body.priceTnd ?? 0,
        interval: body.interval ?? "monthly",
        features: body.features ?? {},
        isActive: body.isActive !== false,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    await this.audit(req, "create_plan", "plan", plan.id);
    return plan;
  }

  @Patch("plans/:id")
  @Roles("super_admin")
  async patchPlan(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string, @Body() body: any) {
    const plan = await this.prisma.plan.update({ where: { id }, data: body });
    await this.audit(req, "update_plan", "plan", id);
    return plan;
  }

  @Get("subscriptions")
  @Roles("super_admin")
  subscriptions() {
    return this.prisma.subscription.findMany({ include: { plan: true, user: true }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Post("subscriptions/grant")
  @Roles("super_admin")
  async grant(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: { userId: string; planId: string; startsAt: string; endsAt: string; reason: string }) {
    if (!body.userId || !body.planId || !body.startsAt || !body.endsAt || !body.reason || body.reason.length < 5) {
      apiError(HttpStatus.BAD_REQUEST, "INVALID", "Champs grant incomplets (motif ≥ 5 caractères).");
    }
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (!(startsAt < endsAt)) apiError(HttpStatus.BAD_REQUEST, "INVALID", "startsAt doit précéder endsAt.");
    await this.prisma.subscription.updateMany({
      where: { userId: body.userId, status: { in: ["trialing", "active", "granted", "past_due"] } },
      data: { status: "canceled", canceledAt: new Date() },
    });
    const sub = await this.prisma.subscription.create({
      data: {
        userId: body.userId,
        planId: body.planId,
        status: "granted",
        source: "admin_grant",
        startsAt,
        endsAt,
        grantedById: req.user.id,
        grantReason: body.reason,
      },
      include: { plan: true, user: true },
    });
    await this.audit(req, "grant_subscription", "subscription", sub.id, body);
    return sub;
  }

  @Get("discounts")
  @Roles("admin", "super_admin")
  discounts() {
    return this.prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });
  }

  @Post("discounts")
  @Roles("admin", "super_admin")
  async createDiscount(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
    const dc = await this.prisma.discountCode.create({
      data: {
        code: String(body.code).trim().toUpperCase(),
        type: body.type ?? "percent",
        percentOff: body.percentOff ?? null,
        amountOffTnd: body.amountOffTnd ?? null,
        maxRedemptions: body.maxRedemptions ?? null,
        perUserLimit: body.perUserLimit ?? null,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        applicablePlanIds: body.applicablePlanIds ?? [],
        isActive: body.isActive !== false,
        createdById: req.user.id,
      },
    });
    await this.audit(req, "create_discount", "discount", dc.id);
    return dc;
  }

  @Patch("discounts/:id")
  @Roles("admin", "super_admin")
  async patchDiscount(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string, @Body() body: any) {
    const data: Prisma.DiscountCodeUpdateInput = {};
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.maxRedemptions !== undefined) data.maxRedemptions = body.maxRedemptions;
    const dc = await this.prisma.discountCode.update({ where: { id }, data });
    await this.audit(req, "update_discount", "discount", id);
    return dc;
  }

  @Get("questions")
  @Roles("admin", "super_admin")
  questions(@Query("status") status?: string) {
    return this.prisma.question.findMany({
      where: { deletedAt: null, ...(status ? { status: status as any } : {}) },
      include: { parts: true, markSchemes: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  @Post("questions")
  @Roles("admin", "super_admin")
  async createQuestion(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
    const q = await this.prisma.question.create({
      data: {
        origin: body.origin ?? "manual",
        status: body.status ?? "draft",
        createdById: req.user.id,
        gradeLevel: body.gradeLevel,
        sectionKey: body.sectionKey ?? "",
        subject: body.subject,
        topic: body.topic,
        type: body.type ?? "Exercice",
        difficulty: body.difficulty ?? "moyen",
        language: body.language ?? "Français",
        questionText: body.questionText,
        context: body.context ?? null,
        requiresCalculator: Boolean(body.requiresCalculator),
        totalMarks: body.totalMarks ?? null,
        estimatedTimeMinutes: body.estimatedTimeMinutes ?? null,
        publishedAt: body.status === "published" ? new Date() : null,
        parts: {
          create: (body.parts ?? []).map((p: any, i: number) => ({
            label: p.label ?? String.fromCharCode(97 + i),
            text: p.text,
            marks: Number(p.marks ?? 1),
            orderIndex: i,
          })),
        },
        markSchemes: {
          create: (body.markSchemes ?? body.mark_scheme ?? []).map((m: any, i: number) => ({
            partLabel: m.partLabel ?? m.label ?? "a",
            answer: m.answer,
            marksBreakdown: m.marksBreakdown ?? m.marks_breakdown ?? null,
            orderIndex: i,
          })),
        },
      },
      include: { parts: true, markSchemes: true },
    });
    await this.audit(req, "create_question", "question", q.id);
    return q;
  }

  @Post("questions/generate")
  @Roles("admin", "super_admin")
  async generate(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
    if (process.env.ENABLE_AI !== "true") {
      return {
        persisted: false,
        questions: [
          {
            question_text: `(Brouillon IA — activez ENABLE_AI) ${body.topic ?? "Sujet"} : énoncé à corriger manuellement.`,
            parts: [{ label: "a", text: "Question principale", marks: 4 }],
            mark_scheme: [{ label: "a", answer: "Réponse à compléter", marks_breakdown: "4 pts" }],
            difficulty: body.difficulty ?? "moyen",
            type: body.type ?? "Exercice",
            estimated_time_minutes: 10,
          },
        ],
      };
    }
    const apiKey = process.env.AI_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) apiError(HttpStatus.BAD_REQUEST, "AI_KEY_MISSING", "AI_API_KEY manquant dans .env.");
    const files = Array.isArray(body.files) ? (body.files as AiSourceFile[]) : [];
    if (!files.length) apiError(HttpStatus.BAD_REQUEST, "FILES_REQUIRED", "Ajoutez au moins un fichier PDF.");
    const prompt = String(body.prompt ?? "").trim();
    if (prompt.length < 20) apiError(HttpStatus.BAD_REQUEST, "PROMPT_REQUIRED", "Prompt trop court.");

    cleanExpiredAiJobs();
    const jobId = randomUUID();
    aiGenerationJobs.set(jobId, {
      userId: req.user.id,
      status: "preparing",
      progress: 2,
      message: "Préparation des documents",
      currentChunk: 0,
      totalChunks: 0,
      updatedAt: Date.now(),
    });
    void this.runQuestionGeneration(req, body, jobId, apiKey).catch((error: unknown) => {
      const job = aiGenerationJobs.get(jobId);
      if (!job) return;
      const response = error instanceof Error && "getResponse" in error
        ? (error as any).getResponse()
        : null;
      const responseMessage = response?.message;
      const errorMessage = Array.isArray(responseMessage)
        ? responseMessage.join("; ")
        : typeof responseMessage === "string"
          ? responseMessage
          : error instanceof Error
            ? error.message
            : typeof error === "string" ? error : "Erreur pendant la génération IA.";
      job.status = "failed";
      job.error = errorMessage;
      job.message = "La génération a échoué";
      job.updatedAt = Date.now();
    });
    return { jobId };
  }

  @Get("questions/generate/:jobId")
  @Roles("admin", "super_admin")
  generationStatus(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("jobId") jobId: string) {
    cleanExpiredAiJobs();
    const job = aiGenerationJobs.get(jobId);
    if (!job || job.userId !== req.user.id) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Génération introuvable.");
    return {
      status: job.status,
      progress: job.progress,
      message: job.message,
      currentChunk: job.currentChunk,
      totalChunks: job.totalChunks,
      ...(job.status === "completed" ? { result: job.result } : {}),
      ...(job.status === "failed" ? { error: job.error } : {}),
    };
  }

  private async runQuestionGeneration(req: FastifyRequest & { user: AuthedUser }, body: any, jobId: string, apiKey: string) {
    const updateJob = (updates: Partial<AiGenerationJob>) => {
      const job = aiGenerationJobs.get(jobId);
      if (!job) return;
      Object.assign(job, updates, { updatedAt: Date.now() });
    };
    const files = body.files as AiSourceFile[];
    const prompt = String(body.prompt ?? "").trim();

    const meta = {
      gradeLevel: String(body.gradeLevel ?? "bac"),
      sectionKey: String(body.sectionKey ?? ""),
      subject: String(body.subject ?? "Mathématiques"),
      topic: String(body.topic ?? "Général"),
      difficulty: String(body.difficulty ?? "moyen"),
      status: String(body.status ?? "draft"),
      language: String(body.language ?? "Français"),
    };

    const model = String(body.model ?? process.env.GOOGLE_GENAI_MODEL ?? "gemini-3.8-flash");
    const timeout = Number(process.env.GOOGLE_GENAI_TIMEOUT_MS ?? 600_000);
    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout } } as any);
    let activeModel = model;
    const unavailableModels = new Set<string>();
    let fallbackModelsPromise: Promise<string[]> | undefined;
    const getAvailableFallbackModels = () => {
      fallbackModelsPromise ??= (async () => {
        const available = new Set<string>();
        try {
          const listedModels = await ai.models.list({ config: { pageSize: 100 } });
          for await (const listedModel of listedModels) {
            const name = listedModel.name?.replace(/^models\//, "");
            if (
              name &&
              listedModel.supportedActions?.includes("generateContent") &&
              /^gemini-(?:[3-9]\d*(?:\.\d+)*-flash(?:-lite)?|flash(?:-lite)?-latest)(?:-|$)/i.test(name) &&
              !/(image|audio|tts|live)/i.test(name)
            ) {
              available.add(name);
            }
          }
        } catch (error) {
          console.warn("[Gemini] Could not list available fallback models", {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        const configuredOrder = (process.env.GOOGLE_GENAI_FALLBACK_MODELS ?? "")
          .split(",")
          .map((name) => name.trim().replace(/^models\//, ""))
          .filter((name) => available.has(name));
        const discoveredOrder = [...available].sort((left, right) => {
          const score = (name: string) =>
            (/(preview|experimental|\bexp\b)/i.test(name) ? 2 : 0) + (/flash-lite/i.test(name) ? 1 : 0);
          return score(left) - score(right) || right.localeCompare(left, undefined, { numeric: true });
        });
        return [...new Set([...configuredOrder, ...discoveredOrder])]
          .filter((name) => name !== model && name !== activeModel)
          .slice(0, 3);
      })();
      return fallbackModelsPromise;
    };
    const configuredChunkSize = Number(process.env.GOOGLE_GENAI_PDF_CHUNK_PAGES ?? 20);
    const pagesPerChunk = Number.isInteger(configuredChunkSize) && configuredChunkSize > 0
      ? Math.min(configuredChunkSize, 50)
      : 20;
    const chunks: AiSourceChunk[] = [];
    for (const file of files) {
      const isPdf = file.mimeType?.toLowerCase() === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      chunks.push(...(isPdf ? await splitPdfIntoChunks(file, pagesPerChunk) : [{ file }]));
    }
    updateJob({
      status: "reading",
      progress: 5,
      message: `Lecture de ${chunks.length} segment(s) du document`,
      currentChunk: 0,
      totalChunks: chunks.length,
    });

    const generateContent = async (contents: any[], maxOutputTokens: number, operation: string) => {
      let candidates = [activeModel];
      let candidateIndex = 0;
      let lastFailureWasMissingModel = false;
      while (candidateIndex < candidates.length) {
        const candidateModel = candidates[candidateIndex];
        let shouldFailover = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: candidateModel,
              contents,
              config: { maxOutputTokens, temperature: 0.2 },
            } as any);
            activeModel = candidateModel;
            return response;
          } catch (error) {
            const details = error && typeof error === "object" ? error as any : {};
            const causeCode = details.cause?.code;
            const status = details.status ?? details.statusCode ?? details.error?.code ?? details.response?.status;
            const providerMessage = typeof details.message === "string" ? details.message : String(error);
            console.error("[Gemini] generateContent request failed", {
              model: candidateModel,
              operation,
              attempt,
              maxAttempts: 2,
              name: details.name,
              status,
              code: details.code ?? details.error?.status ?? causeCode,
              message: providerMessage,
              providerError: details.error,
              response: details.response
                ? { status: details.response.status, statusText: details.response.statusText }
                : undefined,
            });
            if (causeCode === "UND_ERR_HEADERS_TIMEOUT" || causeCode === "UND_ERR_BODY_TIMEOUT") {
              apiError(HttpStatus.GATEWAY_TIMEOUT, "AI_TIMEOUT", "Google GenAI a pris trop de temps a repondre. Essayez un nombre de pages par chunk plus petit, ou augmentez GOOGLE_GENAI_TIMEOUT_MS.");
            }
            const modelNotFound =
              Number(status) === 404 ||
              String(status).toUpperCase() === "NOT_FOUND";
            if (modelNotFound) {
              unavailableModels.add(candidateModel);
              lastFailureWasMissingModel = true;
              shouldFailover = true;
              break;
            }
            if (!isTransientAiError(error)) {
              apiError(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_ERROR", (error as Error).message || "Erreur Google GenAI.");
            }
            lastFailureWasMissingModel = false;

            if (attempt === 1) {
              updateJob({ message: `Gemini ${candidateModel} est temporairement indisponible; nouvelle tentative` });
              await new Promise((resolve) => setTimeout(resolve, 10_000));
              continue;
            }

            unavailableModels.add(candidateModel);
            shouldFailover = true;
            break;
          }
        }

        if (shouldFailover) {
          if (candidateIndex === 0) {
            const discovered = await getAvailableFallbackModels();
            candidates = [
              candidateModel,
              ...discovered.filter((fallback) => fallback !== candidateModel && !unavailableModels.has(fallback)),
            ];
          }
          candidateIndex += 1;
          const nextModel = candidates[candidateIndex];
          if (nextModel) {
            activeModel = nextModel;
            console.warn("[Gemini] Switching to an available fallback model", {
              operation,
              fromModel: candidateModel,
              toModel: nextModel,
            });
            updateJob({ message: `Bascule vers le modèle Gemini disponible ${nextModel}` });
            continue;
          }
        }
        break;
      }
      if (lastFailureWasMissingModel) {
        apiError(HttpStatus.BAD_GATEWAY, "AI_MODEL_UNAVAILABLE", "Le modèle Gemini configuré n'est plus accessible et aucun modèle Flash compatible disponible n'a pu prendre le relais.");
      }
      apiError(HttpStatus.SERVICE_UNAVAILABLE, "AI_PROVIDER_BUSY", "Google Gemini est temporairement surchargé. Aucun modèle Flash alternatif disponible; réessayez dans quelques minutes.");
    };

    let documentContext = "";
    for (const [index, chunk] of chunks.entries()) {
      const label = chunk.pageRange ? `${chunk.file.name}, pages ${chunk.pageRange}` : chunk.file.name;
      const chunkFile = chunk.source ? await createPdfChunk(chunk) : chunk.file;
      updateJob({
        status: "reading",
        progress: Math.round(5 + (index / chunks.length) * 75),
        message: `Lecture du segment ${index + 1}/${chunks.length} : ${label}`,
        currentChunk: index + 1,
      });
      const summaryResponse = await generateContent([
        {
          text: `You are analyzing source documents in sequential chunks to prepare educational questions. Read this entire chunk carefully. Maintain comprehensive, factual document notes across chunks: preserve important concepts, definitions, formulas, examples, exercise structure, answers, mark allocations, and page references. Merge the new information with the prior notes; do not discard useful prior facts. Keep the notes compact but sufficiently detailed to cover the whole source, and do not invent missing information.

User's task: ${prompt}
Chunk ${index + 1} of ${chunks.length}: ${label}

Prior consolidated document notes:
${documentContext || "No earlier chunks."}

Return only the updated consolidated notes, not questions or commentary.`,
        },
        {
          inlineData: {
            data: chunkFile.data,
            mimeType: chunkFile.mimeType || "application/pdf",
          },
        },
      ], 4096, `document chunk ${index + 1}/${chunks.length}`);
      documentContext = String(summaryResponse.text ?? "").trim();
      if (!documentContext) apiError(HttpStatus.UNPROCESSABLE_ENTITY, "AI_EMPTY_SUMMARY", `L'IA n'a pas pu analyser ${label}.`);
      updateJob({ progress: Math.round(5 + ((index + 1) / chunks.length) * 75) });
    }

    updateJob({ status: "generating", progress: 84, message: "Génération des questions" });
    const response = await generateContent([{
      text: `${prompt}

Use the following consolidated notes from the complete source document(s). Treat them as the authoritative context across all page ranges. Do not claim details that are not present in the notes.

Complete document notes:
${documentContext}

Return valid JSON only. Use this array shape:
[
  {
    "question": "Question text",
    "options": ["A", "B", "C", "D"],
    "answer": "Correct answer",
    "marks_breakdown": "Short explanation or grading notes"
  }
]
Do not include markdown fences.`,
    }], 8192, "final question generation");

    const raw = response.text ?? "";
    let generated: AiGeneratedQuestion[];
    try {
      generated = parseAiQuestions(raw);
    } catch {
      apiError(HttpStatus.UNPROCESSABLE_ENTITY, "AI_JSON_INVALID", "La reponse IA n'est pas un JSON valide.");
    }

    if (!generated!.length) apiError(HttpStatus.UNPROCESSABLE_ENTITY, "AI_EMPTY", "Aucune question generee.");

    updateJob({ status: "saving", progress: 92, message: "Enregistrement des questions" });
    const saved = [];
    for (const item of generated!) {
      const questionText = formatAiQuestionText(item);
      if (!questionText) continue;
      const answer = String(item.answer ?? "").trim();
      const question = await this.prisma.question.create({
        data: {
          origin: "ai_admin",
          status: meta.status as any,
          createdById: req.user.id,
          gradeLevel: meta.gradeLevel,
          sectionKey: meta.sectionKey,
          subject: meta.subject,
          topic: item.topic ?? meta.topic,
          type: (item.type ?? (Array.isArray(item.options) && item.options.length ? "QCM" : "Exercice")) as any,
          difficulty: (item.difficulty ?? meta.difficulty) as any,
          language: meta.language,
          questionText,
          context: `AI generated from: ${files.map((file) => file.name).join(", ")}`,
          totalMarks: 1,
          estimatedTimeMinutes: 2,
          publishedAt: meta.status === "published" ? new Date() : null,
          parts: {
            create: [{ label: "a", text: questionText, marks: 1, orderIndex: 0 }],
          },
          markSchemes: {
            create: [{ partLabel: "a", answer, marksBreakdown: item.marks_breakdown ?? answer, orderIndex: 0 }],
          },
        },
        include: { parts: true, markSchemes: true },
      });
      saved.push(question);
    }

    for (const file of files) {
      await this.prisma.knowledgeBaseFile.create({
        data: {
          fileName: file.name,
          storageKey: `ai-inline/${Date.now()}-${file.name}`,
          contentType: file.mimeType || "application/pdf",
          subject: meta.subject,
          gradeLevel: meta.gradeLevel,
          sectionKey: meta.sectionKey,
          topic: meta.topic,
          status: "ready",
          questionsCount: saved.length,
          uploadedById: req.user.id,
          processedAt: new Date(),
        },
      });
    }

    await this.audit(req, "ai_generate_questions", "question", saved[0]?.id, {
      model,
      files: files.map((file) => ({ name: file.name, mimeType: file.mimeType })),
      prompt,
      count: saved.length,
    });

    const result = { persisted: true, raw, questions: saved };
    updateJob({ status: "completed", progress: 100, message: "Document lu et questions enregistrees", result });
    return result;
  }

  @Post("questions/:id/publish")
  @Roles("admin", "super_admin")
  async publish(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Question introuvable.");
    if (q!.origin === "ai_student_pdf") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Question privée élève.");
    const updated = await this.prisma.question.update({
      where: { id },
      data: { status: "published", publishedAt: new Date() },
    });
    await this.audit(req, "publish_question", "question", id);
    return updated;
  }

  @Get("curriculum/chapters")
  @Roles("admin", "super_admin")
  chapters() {
    return this.prisma.curriculumChapter.findMany({ orderBy: [{ levelCode: "asc" }, { sortOrder: "asc" }] });
  }

  @Post("curriculum/chapters")
  @Roles("admin", "super_admin")
  createChapter(@Body() body: any) {
    return this.prisma.curriculumChapter.create({
      data: {
        levelCode: body.levelCode,
        sectionKey: body.sectionKey ?? "",
        subject: body.subject,
        name: body.name,
        slug: body.slug,
        sortOrder: body.sortOrder ?? 0,
      },
    });
  }

  @Get("courses")
  @Roles("admin", "super_admin")
  courses() {
    return this.prisma.course.findMany({ orderBy: { createdAt: "desc" } });
  }

  @Post("courses")
  @Roles("admin", "super_admin")
  createCourse(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
    return this.prisma.course.create({
      data: {
        title: body.title,
        levelCode: body.levelCode,
        sectionKey: body.sectionKey ?? "",
        subject: body.subject,
        body: body.body ?? "",
        isPublished: Boolean(body.isPublished),
        createdById: req.user.id,
      },
    });
  }

  @Get("kb/files")
  @Roles("admin", "super_admin")
  kb() {
    return this.prisma.knowledgeBaseFile.findMany({ orderBy: { createdAt: "desc" } });
  }

  @Get("analytics/overview")
  @Roles("super_admin")
  async overview() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      revenueMtd,
      revenue30,
      activeSubs,
      new7,
      students,
      suspended,
      questionsPublished,
      draftsAi,
      pdf7,
      payments,
    ] = await Promise.all([
      this.prisma.payment.aggregate({ _sum: { amountTnd: true }, where: { status: "completed", createdAt: { gte: monthStart } } }),
      this.prisma.payment.aggregate({ _sum: { amountTnd: true }, where: { status: "completed", createdAt: { gte: d30 } } }),
      this.prisma.subscription.count({ where: { status: { in: ["active", "granted", "trialing"] }, endsAt: { gte: now } } }),
      this.prisma.user.count({ where: { role: "student", createdAt: { gte: d7 }, deletedAt: null } }),
      this.prisma.user.count({ where: { role: "student", deletedAt: null, status: { not: "archived" } } }),
      this.prisma.user.count({ where: { status: "suspended" } }),
      this.prisma.question.count({ where: { status: "published", deletedAt: null } }),
      this.prisma.question.count({ where: { origin: "ai_admin", status: "draft" } }),
      this.prisma.studentDocument.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.payment.findMany({ where: { status: "completed", createdAt: { gte: d30 } }, orderBy: { createdAt: "asc" } }),
    ]);

    const activeWithPlan = await this.prisma.subscription.findMany({
      where: { status: { in: ["active", "granted"] }, endsAt: { gte: now } },
      include: { plan: true },
    });
    const mrr = activeWithPlan.reduce((s, sub) => {
      const p = Number(sub.plan.priceTnd);
      return s + (sub.plan.interval === "yearly" ? p / 12 : p);
    }, 0);

    const byLevel = await this.prisma.studentProfile.groupBy({
      by: ["gradeLevel"],
      _count: true,
    });

    const dailyRevenue: Record<string, number> = {};
    for (const p of payments) {
      const key = p.createdAt.toISOString().slice(0, 10);
      dailyRevenue[key] = (dailyRevenue[key] ?? 0) + Number(p.amountTnd);
    }

    return {
      revenueMtd: Number(revenueMtd._sum.amountTnd ?? 0),
      revenue30: Number(revenue30._sum.amountTnd ?? 0),
      mrr,
      activeSubs,
      new7,
      students,
      suspended,
      questionsPublished,
      draftsAi,
      pdf7,
      byLevel,
      dailyRevenue: Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount })),
    };
  }

  @Get("audit")
  @Roles("super_admin")
  auditLogs() {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: true } });
  }
}
