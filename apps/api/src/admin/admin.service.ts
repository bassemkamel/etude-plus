import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma.service";
import type { AuthedUser } from "../common/guards";
import { apiError } from "../common/errors";

type AiSourceFile = {
    name: string;
    mimeType: string;
    data: string;
};

type AiQuestionType = "Exercice" | "QCM" | "Probleme" | "Redaction";

const AI_QUESTION_TYPES: readonly AiQuestionType[] = ["Exercice", "QCM", "Probleme", "Redaction"];

type AiGeneratedQuestion = {
    question?: string;
    question_text?: string;
    options?: string[];
    answer?: string;
    marks_breakdown?: string;
    topic?: string;
    difficulty?: string;
    type?: string;
    parts?: Array<{ label?: string; text?: string; marks?: number }>;
    mark_schemes?: Array<{ part_label?: string; partLabel?: string; answer?: string; marks_breakdown?: string; marksBreakdown?: string }>;
};

type AiSourceChunk = {
    file: AiSourceFile;
    pageRange: string;
    text: string;
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
let pdfJsPromise: Promise<any> | undefined;

function loadPdfJs() {
    pdfJsPromise ??= new Function("specifier", "return import(specifier)")("pdfjs-dist/legacy/build/pdf.mjs");
    return pdfJsPromise;
}

function cleanExpiredAiJobs() {
    const expiry = Date.now() - 60 * 60 * 1000;
    for (const [id, job] of aiGenerationJobs) {
        if (job.updatedAt < expiry) aiGenerationJobs.delete(id);
    }
}

// Legacy chunking logic kept as a reference. We are intentionally bypassing it to send the whole PDF text to the model in one request.
// async function splitPdfTextIntoChunks(file: AiSourceFile, pagesPerChunk: number): Promise<AiSourceChunk[]> {
//     const pages: string[] = [];
//     let pageCount: number;
//     try {
//         const pdfjs = await loadPdfJs();
//         const document = await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(file.data, "base64")) }).promise;
//         pageCount = document.numPages;
//         for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
//             const page = await document.getPage(pageNumber);
//             const content = await page.getTextContent();
//             let lastY: number | undefined;
//             const text = content.items.map((item: any) => {
//                 const separator = lastY !== undefined && lastY !== item.transform[5] ? "\n" : "";
//                 lastY = item.transform[5];
//                 return `${separator}${item.str}`;
//             }).join("").trim();
//             pages.push(text);
//             page.cleanup();
//         }
//         await document.destroy();
//     } catch {
//         apiError(HttpStatus.BAD_REQUEST, "PDF_INVALID", `Impossible d'extraire le texte du PDF ${file.name}.`);
//     }
//
//     if (!pageCount!) apiError(HttpStatus.BAD_REQUEST, "PDF_EMPTY", `Le PDF ${file.name} ne contient aucune page.`);
//     if (!pages.some((page) => page.length > 0)) {
//         apiError(HttpStatus.UNPROCESSABLE_ENTITY, "PDF_TEXT_UNAVAILABLE", `Aucun texte extractible dans ${file.name}. Ce PDF semble être un scan; une étape OCR est nécessaire pour Ollama.`);
//     }
//
//     const chunks: AiSourceChunk[] = [];
//     for (let start = 0; start < pages.length; start += pagesPerChunk) {
//         const end = Math.min(start + pagesPerChunk, pages.length);
//         const text = pages
//             .slice(start, end)
//             .map((page, index) => `Page ${start + index + 1}:\n${page}`)
//             .join("\n\n");
//         chunks.push({ file, pageRange: `${start + 1}-${end}`, text });
//     }
//     return chunks;
// }

async function extractFullPdfText(file: AiSourceFile): Promise<string> {
    const pages: string[] = [];
    let document: any;

    try {
        const pdfjs = await loadPdfJs();
        document = await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(file.data, "base64")) }).promise;
    } catch {
        apiError(HttpStatus.BAD_REQUEST, "PDF_INVALID", `Impossible d'extraire le texte du PDF ${file.name}.`);
    }

    if (!document) apiError(HttpStatus.BAD_REQUEST, "PDF_EMPTY", `Le PDF ${file.name} ne contient aucune page.`);

    const pageCount = Number(document.numPages ?? 0);
    if (pageCount === 0) apiError(HttpStatus.BAD_REQUEST, "PDF_EMPTY", `Le PDF ${file.name} ne contient aucune page.`);

    try {
        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
            const page = await document.getPage(pageNumber);
            const content = await page.getTextContent();
            let lastY: number | undefined;
            const text = content.items
                .map((item: any) => {
                    const separator = lastY !== undefined && lastY !== item.transform[5] ? "\n" : "";
                    lastY = item.transform[5];
                    return `${separator}${item.str}`;
                })
                .join("")
                .trim();
            pages.push(text);
            page.cleanup();
        }
    } finally {
        await document.destroy();
    }

    if (!pages.some((page) => page.length > 0)) {
        apiError(HttpStatus.UNPROCESSABLE_ENTITY, "PDF_TEXT_UNAVAILABLE", `Aucun texte extractible dans ${file.name}. Ce PDF semble être un scan; une étape OCR est nécessaire pour Ollama.`);
    }

    return pages
        .map((page, index) => `Page ${index + 1}:\n${page}`)
        .join("\n\n")
        .trim();
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
    const options = Array.isArray(item.options)
        ? item.options
            .map((option) => String(option).trim().replace(/^[A-Z]\s*[.)\-:]\s*/i, ""))
            .filter(Boolean)
        : [];
    if (!options.length) return question;
    return `${question}\n\n${options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n")}`;
}

function normalizeAiQuestionType(type: string | undefined, options: string[]): "Exercice" | "QCM" | "Probleme" | "Redaction" {
    const normalized = (type ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    if (normalized === "qcm" || normalized === "multiple choice") return "QCM";
    if (normalized === "probleme" || normalized === "problem") return "Probleme";
    if (normalized === "redaction" || normalized === "essay") return "Redaction";
    if (normalized === "exercice" || normalized === "exercise") return "Exercice";
    return options.length ? "QCM" : "Exercice";
}

function normalizeAiDifficulty(difficulty: string | undefined, fallback: string): "facile" | "moyen" | "difficile" {
    const normalized = (difficulty ?? fallback).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    if (normalized === "facile" || normalized === "easy") return "facile";
    if (normalized === "difficile" || normalized === "hard") return "difficile";
    return "moyen";
}

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    private async audit(actor: AuthedUser, ip: string, action: string, entity: string, entityId?: string, metadata: object = {}) {
        await this.prisma.auditLog.create({
            data: {
                actorId: actor.id,
                action,
                entity,
                entityId: entityId ?? null,
                metadata: metadata as Prisma.InputJsonValue,
                ip,
            },
        });
    }

    async users(q?: string, role?: string, status?: string, page = "1", limit = "20") {
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
            items: items.map(({ passwordHash: _, ...user }) => user),
            total,
            page: Number(page) || 1,
            limit: take,
        };
    }

    async createUser(actor: AuthedUser, ip: string, body: any) {
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
        await this.audit(actor, ip, "create_user", "user", user.id, { email, role });
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    async editUser(actor: AuthedUser, ip: string, id: string, body: any) {
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
        await this.audit(actor, ip, "edit_user", "user", id, body);
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    async suspend(actor: AuthedUser, ip: string, id: string) {
        const target = await this.prisma.user.findUnique({ where: { id } });
        if (!target) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Utilisateur introuvable.");
        if (target!.role === "super_admin") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Impossible de suspendre un super admin.");
        if (target!.role === "admin" && actor.role !== "super_admin") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Accès insuffisant.");
        const user = await this.prisma.user.update({ where: { id }, data: { status: "suspended" } });
        await this.audit(actor, ip, "suspend_user", "user", id);
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    async activate(actor: AuthedUser, ip: string, id: string) {
        const user = await this.prisma.user.update({ where: { id }, data: { status: "active", archivedAt: null } });
        await this.audit(actor, ip, "activate_user", "user", id);
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    async archive(actor: AuthedUser, ip: string, id: string) {
        const user = await this.prisma.user.update({ where: { id }, data: { status: "archived", archivedAt: new Date() } });
        await this.audit(actor, ip, "archive_user", "user", id);
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    async softDelete(actor: AuthedUser, ip: string, id: string) {
        if (id === actor.id) apiError(HttpStatus.BAD_REQUEST, "INVALID", "Impossible de supprimer votre compte.");
        const target = await this.prisma.user.findUnique({ where: { id } });
        if (!target) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Utilisateur introuvable.");
        if (target!.role === "super_admin") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Impossible de supprimer un super admin.");
        const user = await this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date(), status: "archived", archivedAt: new Date(), email: `deleted+${id}@invalid.local` },
        });
        await this.prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
        await this.audit(actor, ip, "soft_delete_user", "user", id, { email: target!.email });
        return { ok: true, id: user.id };
    }

    async restore(actor: AuthedUser, ip: string, id: string) {
        const user = await this.prisma.user.update({ where: { id }, data: { deletedAt: null, status: "active", archivedAt: null } });
        await this.audit(actor, ip, "restore_user", "user", id);
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    listPlans() {
        return this.prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
    }

    async createPlan(actor: AuthedUser, ip: string, body: any) {
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
        await this.audit(actor, ip, "create_plan", "plan", plan.id);
        return plan;
    }

    async patchPlan(actor: AuthedUser, ip: string, id: string, body: any) {
        const plan = await this.prisma.plan.update({ where: { id }, data: body });
        await this.audit(actor, ip, "update_plan", "plan", id);
        return plan;
    }

    subscriptions() {
        return this.prisma.subscription.findMany({ include: { plan: true, user: true }, orderBy: { createdAt: "desc" }, take: 100 });
    }

    async grant(actor: AuthedUser, ip: string, body: { userId: string; planId: string; startsAt: string; endsAt: string; reason: string }) {
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
                grantedById: actor.id,
                grantReason: body.reason,
            },
            include: { plan: true, user: true },
        });
        await this.audit(actor, ip, "grant_subscription", "subscription", sub.id, body);
        return sub;
    }

    discounts() {
        return this.prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });
    }

    async createDiscount(actor: AuthedUser, ip: string, body: any) {
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
                createdById: actor.id,
            },
        });
        await this.audit(actor, ip, "create_discount", "discount", dc.id);
        return dc;
    }

    async patchDiscount(actor: AuthedUser, ip: string, id: string, body: any) {
        const data: Prisma.DiscountCodeUpdateInput = {};
        if (typeof body.isActive === "boolean") data.isActive = body.isActive;
        if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
        if (body.maxRedemptions !== undefined) data.maxRedemptions = body.maxRedemptions;
        const dc = await this.prisma.discountCode.update({ where: { id }, data });
        await this.audit(actor, ip, "update_discount", "discount", id);
        return dc;
    }

    questions(status?: string) {
        return this.prisma.question.findMany({
            where: { deletedAt: null, ...(status ? { status: status as any } : {}) },
            include: { parts: true, markSchemes: true },
            orderBy: { createdAt: "desc" },
            take: 100,
        });
    }

    async createQuestion(actor: AuthedUser, ip: string, body: any) {
        const q = await this.prisma.question.create({
            data: {
                origin: body.origin ?? "manual",
                status: body.status ?? "draft",
                createdById: actor.id,
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
                    create: (body.parts ?? []).map((part: any, index: number) => ({
                        label: part.label ?? String.fromCharCode(97 + index),
                        text: part.text,
                        marks: Number(part.marks ?? 1),
                        orderIndex: index,
                    })),
                },
                markSchemes: {
                    create: (body.markSchemes ?? body.mark_scheme ?? []).map((scheme: any, index: number) => ({
                        partLabel: scheme.partLabel ?? scheme.label ?? "a",
                        answer: scheme.answer,
                        marksBreakdown: scheme.marksBreakdown ?? scheme.marks_breakdown ?? null,
                        orderIndex: index,
                    })),
                },
            },
            include: { parts: true, markSchemes: true },
        });
        await this.audit(actor, ip, "create_question", "question", q.id);
        return q;
    }

    async startQuestionGeneration(actor: AuthedUser, ip: string, body: any) {
        const gradeLevel = String(body.gradeLevel ?? "bac");
        const sectionKey = String(body.sectionKey ?? "");
        const subject = String(body.subject ?? "Mathématiques");
        const topic = String(body.topic ?? "").trim();
        const count = Number(body.count);
        const submittedTypes: unknown[] = Array.isArray(body.types) ? body.types : [];
        if (!Number.isInteger(count) || count < 1 || count > 50) {
            apiError(HttpStatus.BAD_REQUEST, "QUESTION_COUNT_INVALID", "Le nombre de questions doit être compris entre 1 et 50.");
        }
        if (!submittedTypes.length || submittedTypes.some((type) => typeof type !== "string" || !AI_QUESTION_TYPES.includes(type as AiQuestionType))) {
            apiError(HttpStatus.BAD_REQUEST, "QUESTION_TYPES_INVALID", "Sélectionnez au moins un type de question valide.");
        }
        const types = [...new Set(submittedTypes as AiQuestionType[])];
        if (types.length !== submittedTypes.length) {
            apiError(HttpStatus.BAD_REQUEST, "QUESTION_TYPES_INVALID", "Chaque type de question ne peut être sélectionné qu'une seule fois.");
        }
        if (!topic) apiError(HttpStatus.BAD_REQUEST, "CHAPTER_REQUIRED", "Choisissez un chapitre avant de générer les questions.");
        const chapter = await this.prisma.curriculumChapter.findFirst({
            where: {
                isActive: true,
                levelCode: gradeLevel,
                sectionKey: { in: ["", sectionKey] },
                subject,
                name: topic,
            },
            select: { id: true },
        });
        if (!chapter) apiError(HttpStatus.BAD_REQUEST, "CHAPTER_INVALID", "Le chapitre choisi n'existe pas pour ce niveau, cette section et cette matière.");
        const generationRequest = { ...body, gradeLevel, sectionKey, subject, topic, count, types };

        if (process.env.ENABLE_AI !== "true") {
            return {
                persisted: false,
                questions: [{
                    question_text: `(Brouillon IA — activez ENABLE_AI) ${body.topic ?? "Sujet"} : énoncé à corriger manuellement.`,
                    parts: [{ label: "a", text: "Question principale", marks: 4 }],
                    mark_scheme: [{ label: "a", answer: "Réponse à compléter", marks_breakdown: "4 pts" }],
                    difficulty: body.difficulty ?? "moyen",
                    type: types[0],
                    estimated_time_minutes: 10,
                }],
            };
        }
        const files = Array.isArray(body.files) ? (body.files as AiSourceFile[]) : [];
        if (!files.length) apiError(HttpStatus.BAD_REQUEST, "FILES_REQUIRED", "Ajoutez au moins un fichier PDF.");

        cleanExpiredAiJobs();
        const jobId = randomUUID();
        aiGenerationJobs.set(jobId, {
            userId: actor.id,
            status: "preparing",
            progress: 2,
            message: "Préparation des documents",
            currentChunk: 0,
            totalChunks: 0,
            updatedAt: Date.now(),
        });
        void this.runQuestionGeneration(actor, ip, generationRequest, jobId).catch((error: unknown) => {
            const job = aiGenerationJobs.get(jobId);
            if (!job) return;
            const response = error instanceof Error && "getResponse" in error ? (error as any).getResponse() : null;
            const responseMessage = response?.message;
            job.status = "failed";
            job.error = Array.isArray(responseMessage)
                ? responseMessage.join("; ")
                : typeof responseMessage === "string"
                    ? responseMessage
                    : error instanceof Error ? error.message : typeof error === "string" ? error : "Erreur pendant la génération Ollama.";
            job.message = "La génération a échoué";
            job.updatedAt = Date.now();
        });
        return { jobId };
    }

    generationStatus(actor: AuthedUser, jobId: string) {
        cleanExpiredAiJobs();
        const job = aiGenerationJobs.get(jobId);
        if (!job || job.userId !== actor.id) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Génération introuvable.");
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

    private async runQuestionGeneration(actor: AuthedUser, ip: string, body: any, jobId: string) {
        const updateJob = (updates: Partial<AiGenerationJob>) => {
            const job = aiGenerationJobs.get(jobId);
            if (job) Object.assign(job, updates, { updatedAt: Date.now() });
        };
        const files = body.files as AiSourceFile[];
        const meta = {
            gradeLevel: String(body.gradeLevel ?? "bac"),
            sectionKey: String(body.sectionKey ?? ""),
            subject: String(body.subject ?? "Mathématiques"),
            topic: String(body.topic).trim(),
            count: Number(body.count),
            types: body.types as AiQuestionType[],
            difficulty: String(body.difficulty ?? "moyen"),
            status: String(body.status ?? "draft"),
            language: String(body.language ?? "Français"),
        };
        const model = String(process.env.OLLAMA_MODEL ?? "gemma4:31b-cloud");
        const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(/\/$/, "");
        const timeout = Number(process.env.OLLAMA_TIMEOUT_MS ?? 600_000);

        // Disabled chunking: we intentionally do not split the PDF and we send the full extracted document to the model.
        // const configuredChunkSize = Number(process.env.OLLAMA_PDF_CHUNK_PAGES ?? 20);
        // const pagesPerChunk = Number.isInteger(configuredChunkSize) && configuredChunkSize > 0 ? Math.min(configuredChunkSize, 50) : 20;
        // const chunks: AiSourceChunk[] = [];

        const sourceDocuments: { file: AiSourceFile; text: string }[] = [];
        for (const file of files) {
            const isPdf = file.mimeType?.toLowerCase() === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
            if (!isPdf) apiError(HttpStatus.BAD_REQUEST, "PDF_REQUIRED", "Ollama nécessite des fichiers PDF pour extraire le texte.");
            sourceDocuments.push({ file, text: await extractFullPdfText(file) });
        }

        const documentContext = sourceDocuments
            .map(({ file, text }) => `Document: ${file.name}\n\n${text}`)
            .join("\n\n---\n\n")
            .trim();

        updateJob({
            status: "reading",
            progress: 20,
            message: `Lecture complète du document (${sourceDocuments.length} fichier(s))`,
            currentChunk: 0,
            totalChunks: 1,
        });

        const generateContent = async (instruction: string, maxOutputTokens: number, operation: string, documentText = "", jsonMode = false) => {
            const content = documentText ? `${instruction}\n\nDocument:\n${documentText}` : instruction;
            let response: Response;
            try {
                response = await fetch(`${baseUrl}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: "user", content }],
                        stream: false,
                        ...(jsonMode ? { format: "json" } : {}),
                        options: { temperature: 0.2, num_predict: maxOutputTokens },
                    }),
                    signal: AbortSignal.timeout(timeout),
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error("[Ollama] Could not connect to Ollama", { baseUrl, model, operation, message });
                throw new Error(`Impossible de joindre Ollama à ${baseUrl}: ${message}`);
            }
            const data = await response.json().catch(() => ({})) as any;
            if (!response.ok) {
                const message = data.error ?? `Ollama returned HTTP ${response.status}`;
                console.error("[Ollama] chat request failed", { model, operation, status: response.status, message });
                throw new Error(`Ollama: ${message}`);
            }
            return { text: String(data.message?.content ?? "") };
        };

        updateJob({ status: "generating", progress: 84, message: "Génération des questions" });
        const chapterInstruction = `Generate every question only about the selected chapter "${meta.topic}". Set the topic field of every item to exactly "${meta.topic}". Do not use other chapters.`;
        const typeInstruction = meta.types.length === 1
            ? `Generate all questions as ${meta.types[0]}.`
            : `Use only these requested types: ${meta.types.join(", ")}. Distribute them as evenly as possible; use each type at least once when the requested count allows.`;
        const qcmFormattingInstruction = meta.types.includes("QCM")
            ? "For every QCM, put only the question statement in the question field. Put each answer choice as a separate plain string in the options array; do not include choice labels like A. or B., and do not put choices in the question field. The server will store the statement, a blank line, then one labeled choice per line."
            : "";
        const prompt = `Generate exactly ${meta.count} questions from the source documents. ${typeInstruction}\n\n${chapterInstruction}\n\n${qcmFormattingInstruction}\n\nMandatory output contract: return only a valid JSON array, with no markdown fences or surrounding text. Every item must match this structure:\n{"question":"Question statement","topic":"${meta.topic}","type":"${meta.types[0]}","difficulty":"moyen","parts":[{"label":"a","text":"Question or sub-question","marks":2}],"mark_schemes":[{"part_label":"a","answer":"Expected answer","marks_breakdown":"Grading details"}],"options":["Choice A","Choice B"]}\nThe type field must be exactly one of these values: ${meta.types.map((type) => `"${type}"`).join(", ")}. The type in the example is illustrative only. For QCM, include at least two options and put the correct choice in the matching mark_schemes answer. For Exercice, Probleme, and Redaction, provide meaningful parts and corresponding mark schemes; omit options unless explicitly needed. Each part needs a label, text, and positive numeric marks; each mark scheme needs a matching part_label and answer. Use this difficulty for every question: ${meta.difficulty}. Treat the source documents as authoritative; do not invent content.\n\nSource documents:\n${documentContext}`;
        const response = await generateContent(prompt, 8192, "final question generation", "", true);
        const raw = response.text ?? "";
        let generated: AiGeneratedQuestion[];
        try {
            generated = parseAiQuestions(raw);
        } catch {
            apiError(HttpStatus.UNPROCESSABLE_ENTITY, "AI_JSON_INVALID", "La reponse IA n'est pas un JSON valide.");
        }
        if (!generated!.length) apiError(HttpStatus.UNPROCESSABLE_ENTITY, "AI_EMPTY", "Aucune question generee.");
        if (generated!.length !== meta.count) {
            apiError(HttpStatus.UNPROCESSABLE_ENTITY, "AI_COUNT_MISMATCH", `L'IA a renvoyé ${generated!.length} question(s) au lieu de ${meta.count}.`);
        }

        updateJob({ status: "saving", progress: 92, message: "Enregistrement des questions" });
        const saved = [];
        for (const item of generated!) {
            const questionText = formatAiQuestionText(item);
            if (!questionText) continue;
            const options = Array.isArray(item.options) ? item.options.filter(Boolean) : [];
            const type = normalizeAiQuestionType(item.type, options);
            if (!meta.types.includes(type)) {
                apiError(HttpStatus.UNPROCESSABLE_ENTITY, "AI_TYPE_NOT_SELECTED", `L'IA a renvoyé le type ${type}, qui n'a pas été sélectionné.`);
            }
            const parts = (Array.isArray(item.parts) ? item.parts : [])
                .filter((part) => String(part.text ?? "").trim())
                .map((part, index) => ({
                    label: String(part.label ?? String.fromCharCode(97 + index)),
                    text: String(part.text).trim(),
                    marks: Number.isFinite(Number(part.marks)) && Number(part.marks) > 0 ? Number(part.marks) : 1,
                    orderIndex: index,
                }));
            const savedParts = parts.length ? parts : [{
                label: "a",
                text: options.length ? "Choisissez la bonne réponse." : questionText,
                marks: 1,
                orderIndex: 0,
            }];
            const suppliedMarkSchemes = Array.isArray(item.mark_schemes) ? item.mark_schemes : [];
            const markSchemes = suppliedMarkSchemes
                .map((scheme, index) => ({
                    partLabel: String(scheme.part_label ?? scheme.partLabel ?? savedParts[index]?.label ?? "a"),
                    answer: String(scheme.answer ?? "").trim(),
                    marksBreakdown: scheme.marks_breakdown ?? scheme.marksBreakdown ?? null,
                    orderIndex: index,
                }))
                .filter((scheme) => scheme.answer);
            if (!markSchemes.length) {
                const answer = String(item.answer ?? "").trim();
                if (answer) {
                    markSchemes.push({
                        partLabel: savedParts[0].label,
                        answer,
                        marksBreakdown: item.marks_breakdown ?? null,
                        orderIndex: 0,
                    });
                }
            }
            if (type === "QCM" && options.length < 2) {
                apiError(HttpStatus.UNPROCESSABLE_ENTITY, "AI_QCM_OPTIONS_MISSING", "Une question QCM doit contenir au moins deux choix.");
            }
            const question = await this.prisma.question.create({
                data: {
                    origin: "ai_admin",
                    status: meta.status as any,
                    createdById: actor.id,
                    gradeLevel: meta.gradeLevel,
                    sectionKey: meta.sectionKey,
                    subject: meta.subject,
                    topic: meta.topic,
                    type,
                    difficulty: normalizeAiDifficulty(item.difficulty, meta.difficulty),
                    language: meta.language,
                    questionText,
                    context: `AI generated from: ${files.map((file) => file.name).join(", ")}`,
                    totalMarks: savedParts.reduce((total, part) => total + part.marks, 0),
                    estimatedTimeMinutes: 2,
                    publishedAt: meta.status === "published" ? new Date() : null,
                    parts: { create: savedParts },
                    markSchemes: { create: markSchemes },
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
                    uploadedById: actor.id,
                    processedAt: new Date(),
                },
            });
        }

        await this.audit(actor, ip, "ai_generate_questions", "question", saved[0]?.id, {
            model,
            files: files.map((file) => ({ name: file.name, mimeType: file.mimeType })),
            prompt,
            count: saved.length,
        });
        const result = { persisted: true, raw, questions: saved };
        updateJob({ status: "completed", progress: 100, message: "Document lu et questions enregistrees", result });
        return result;
    }

    async publish(actor: AuthedUser, ip: string, id: string) {
        const q = await this.prisma.question.findUnique({ where: { id } });
        if (!q) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Question introuvable.");
        if (q!.origin === "ai_student_pdf") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Question privée élève.");
        const updated = await this.prisma.question.update({ where: { id }, data: { status: "published", publishedAt: new Date() } });
        await this.audit(actor, ip, "publish_question", "question", id);
        return updated;
    }

    chapters() {
        return this.prisma.curriculumChapter.findMany({ orderBy: [{ levelCode: "asc" }, { sortOrder: "asc" }] });
    }

    createChapter(body: any) {
        return this.prisma.curriculumChapter.create({
            data: { levelCode: body.levelCode, sectionKey: body.sectionKey ?? "", subject: body.subject, name: body.name, slug: body.slug, sortOrder: body.sortOrder ?? 0 },
        });
    }

    courses() {
        return this.prisma.course.findMany({ orderBy: { createdAt: "desc" } });
    }

    createCourse(actor: AuthedUser, body: any) {
        return this.prisma.course.create({
            data: {
                title: body.title,
                levelCode: body.levelCode,
                sectionKey: body.sectionKey ?? "",
                subject: body.subject,
                body: body.body ?? "",
                isPublished: Boolean(body.isPublished),
                createdById: actor.id,
            },
        });
    }

    kb() {
        return this.prisma.knowledgeBaseFile.findMany({ orderBy: { createdAt: "desc" } });
    }

    async overview() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [revenueMtd, revenue30, activeSubs, new7, students, suspended, questionsPublished, draftsAi, pdf7, payments] = await Promise.all([
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
        const activeWithPlan = await this.prisma.subscription.findMany({ where: { status: { in: ["active", "granted"] }, endsAt: { gte: now } }, include: { plan: true } });
        const mrr = activeWithPlan.reduce((sum, sub) => {
            const price = Number(sub.plan.priceTnd);
            return sum + (sub.plan.interval === "yearly" ? price / 12 : price);
        }, 0);
        const byLevel = await this.prisma.studentProfile.groupBy({ by: ["gradeLevel"], _count: true });
        const dailyRevenue: Record<string, number> = {};
        for (const payment of payments) {
            const key = payment.createdAt.toISOString().slice(0, 10);
            dailyRevenue[key] = (dailyRevenue[key] ?? 0) + Number(payment.amountTnd);
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

    auditLogs() {
        return this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: true } });
    }
}
