import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, HttpStatus } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { AuthGuard, Roles, RolesGuard, type AuthedUser } from "./common/guards";
import { apiError } from "./common/errors";
import { ALL_SUBJECTS, SECTION_LEVELS, getClassLevelLabel, getSubjectsForNiveauSection, subjectFromSlug } from "./lib/education-config";

function hasFullAccess(features: any) {
  return Boolean(features?.questionBank);
}

function normalizeForComparison(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-\s]+/g, " ")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .toLowerCase();
}

function getEquivalentValues(input: string | null | undefined, allowedValues: readonly string[]): string[] {
  const base = (input ?? "").trim();
  if (!base) return [];

  const normalizedTarget = normalizeForComparison(base);
  const matches = new Set<string>();
  matches.add(base);

  for (const value of allowedValues) {
    if (normalizeForComparison(value) === normalizedTarget) {
      matches.add(value);
    }
  }

  const resolvedSlug = subjectFromSlug(base) ?? subjectFromSlug(base.toLowerCase()) ?? subjectFromSlug(base.replace(/\s+/g, "-"));
  if (resolvedSlug) matches.add(resolvedSlug);

  return [...matches];
}

@Controller()
export class CatalogController {
  constructor(private prisma: PrismaService) { }

  @Get("plans")
  async plans() {
    return this.prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  }

  @Get("subscriptions/me")
  @UseGuards(AuthGuard)
  async mySub(@Req() req: FastifyRequest & { user: AuthedUser }) {
    const now = new Date();
    const sub = await this.prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ["trialing", "active", "granted", "past_due"] },
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return sub;
  }

  @Post("discounts/validate")
  @UseGuards(AuthGuard)
  async validateDiscount(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: { code: string; planId: string }) {
    return this.checkDiscount(body.code, req.user.id, body.planId);
  }

  @Post("checkout")
  @UseGuards(AuthGuard)
  checkout() {
    apiError(HttpStatus.NOT_IMPLEMENTED, "PAYMENTS_OFF", "Le paiement en ligne n'est pas encore ouvert. Un administrateur peut t'attribuer un abonnement.");
  }

  async checkDiscount(codeRaw: string, userId: string, planId: string) {
    const code = codeRaw?.trim().toUpperCase();
    if (!code) apiError(HttpStatus.BAD_REQUEST, "DISCOUNT_INVALID", "Code requis.");
    const dc = await this.prisma.discountCode.findUnique({ where: { code } });
    if (!dc || !dc.isActive) apiError(HttpStatus.UNPROCESSABLE_ENTITY, "DISCOUNT_INVALID", "Code invalide.");
    const now = new Date();
    if (dc!.startsAt && dc!.startsAt > now) apiError(HttpStatus.UNPROCESSABLE_ENTITY, "DISCOUNT_EXPIRED", "Code pas encore actif.");
    if (dc!.expiresAt && dc!.expiresAt < now) apiError(HttpStatus.UNPROCESSABLE_ENTITY, "DISCOUNT_EXPIRED", "Code expiré.");
    if (dc!.applicablePlanIds.length && !dc!.applicablePlanIds.includes(planId)) {
      apiError(HttpStatus.UNPROCESSABLE_ENTITY, "DISCOUNT_INVALID", "Code non applicable à ce plan.");
    }
    const used = await this.prisma.discountRedemption.count({ where: { codeId: dc!.id } });
    if (dc!.maxRedemptions != null && used >= dc!.maxRedemptions) {
      apiError(HttpStatus.UNPROCESSABLE_ENTITY, "DISCOUNT_EXHAUSTED", "Ce code a atteint sa limite.");
    }
    const mine = await this.prisma.discountRedemption.count({ where: { codeId: dc!.id, userId } });
    if (dc!.perUserLimit != null && mine >= dc!.perUserLimit) {
      apiError(HttpStatus.UNPROCESSABLE_ENTITY, "DISCOUNT_USER_LIMIT", "Vous avez déjà utilisé ce code.");
    }
    return { valid: true, percentOff: dc!.percentOff, amountOffTnd: dc!.amountOffTnd, code: dc!.code };
  }

  @Get("curriculum/my")
  @UseGuards(AuthGuard)
  async myCurriculum(@Req() req: FastifyRequest & { user: AuthedUser }) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile || !profile.gradeLevel) apiError(HttpStatus.UNPROCESSABLE_ENTITY, "ONBOARDING", "Choisis ton niveau d'abord.");
    const gradeLevel = profile.gradeLevel;
    const sectionKey = profile.educationSection || "";
    const subjects = getSubjectsForNiveauSection(gradeLevel, sectionKey || null);
    const chapters = await this.prisma.curriculumChapter.findMany({
      where: {
        isActive: true,
        levelCode: gradeLevel,
        OR: [{ sectionKey: "" }, { sectionKey }],
      },
      orderBy: { sortOrder: "asc" },
    });
    const label = getClassLevelLabel(gradeLevel, sectionKey || null);
    return { gradeLevel, educationSection: sectionKey, label, subjects, chapters };
  }

  @Get("revision/questions")
  @UseGuards(AuthGuard)
  async questions(
    @Req() req: FastifyRequest & { user: AuthedUser },
    @Query("subject") subject?: string,
    @Query("topic") topic?: string,
  ) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile?.gradeLevel) return [];
    const sectionKey = profile.educationSection || "";

    const matchingSections = getEquivalentValues(sectionKey, Object.keys(SECTION_LEVELS).flatMap((level) => Object.keys(SECTION_LEVELS[level as keyof typeof SECTION_LEVELS].sections)));
    const matchingSubjects = subject ? getEquivalentValues(subject, ALL_SUBJECTS) : [];

    const where: Prisma.QuestionWhereInput = {
      status: "published",
      origin: { in: ["manual", "ai_admin"] },
      ownerUserId: null,
      deletedAt: null,
      gradeLevel: profile.gradeLevel,
      ...(sectionKey
        ? { sectionKey: { in: ["", ...matchingSections] } }
        : { sectionKey: "" }),
    };
    if (matchingSubjects.length) {
      where.OR = matchingSubjects.map((value) => ({ subject: { equals: value, mode: "insensitive" } }));
    }
    if (topic) where.topic = topic;
    const items = await this.prisma.question.findMany({
      where,
      include: { parts: { orderBy: { orderIndex: "asc" } }, markSchemes: { orderBy: { orderIndex: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    console.log('items', items)
    return items;
  }

  @Get("revision/flashcards")
  @UseGuards(AuthGuard)
  async flashcards(@Req() req: FastifyRequest & { user: AuthedUser }, @Query("subject") subject?: string) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile?.gradeLevel) return [];
    const sectionKey = profile.educationSection || "";
    const matchingSections = getEquivalentValues(sectionKey, Object.keys(SECTION_LEVELS).flatMap((level) => Object.keys(SECTION_LEVELS[level as keyof typeof SECTION_LEVELS].sections)));
    const matchingSubjects = subject ? getEquivalentValues(subject, ALL_SUBJECTS) : [];
    const items = await this.prisma.flashcard.findMany({
      where: {
        status: "live",
        gradeLevel: profile.gradeLevel,
        ...(sectionKey
          ? { sectionKey: { in: ["", ...matchingSections] } }
          : { sectionKey: "" }),
        ...(matchingSubjects.length ? { subject: { in: matchingSubjects } } : {}),
      },
      take: 80,
    });
    return items;
  }

  @Get("revision/annales")
  @UseGuards(AuthGuard)
  async annales(@Req() req: FastifyRequest & { user: AuthedUser }, @Query("subject") subject?: string) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile?.gradeLevel) return [];
    const sectionKey = profile.educationSection || "";
    const matchingSections = getEquivalentValues(sectionKey, Object.keys(SECTION_LEVELS).flatMap((level) => Object.keys(SECTION_LEVELS[level as keyof typeof SECTION_LEVELS].sections)));
    const matchingSubjects = subject ? getEquivalentValues(subject, ALL_SUBJECTS) : [];
    const items = await this.prisma.annale.findMany({
      where: {
        status: "live",
        gradeLevel: profile.gradeLevel,
        ...(sectionKey
          ? { sectionKey: { in: ["", ...matchingSections] } }
          : { sectionKey: "" }),
        ...(matchingSubjects.length ? { subject: { in: matchingSubjects } } : {}),
      },
    });
    return items;
  }

  @Post("revision/attempts")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("student")
  async attempt(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    const totalMarks = Number(body.totalMarks ?? 0);
    const marksAwarded = Number(body.marksAwarded ?? 0);
    const gradeOutOf20 = totalMarks > 0 ? (marksAwarded / totalMarks) * 20 : null;
    return this.prisma.revisionAttempt.create({
      data: {
        studentId: req.user.id,
        type: body.type ?? "practice",
        subject: body.subject ?? "Mathématiques",
        gradeLevel: profile?.gradeLevel ?? "bac",
        sectionKey: profile?.educationSection ?? "",
        topic: body.topic ?? null,
        totalMarks,
        marksAwarded,
        gradeOutOf20,
        questionsCount: Number(body.questionsCount ?? 0),
        correctCount: Number(body.correctCount ?? 0),
      },
    });
  }

  @Get("progress/overview")
  @UseGuards(AuthGuard)
  async progress(@Req() req: FastifyRequest & { user: AuthedUser }) {
    const attempts = await this.prisma.revisionAttempt.findMany({
      where: { studentId: req.user.id },
      orderBy: { completedAt: "desc" },
    });
    const graded = attempts.filter((a) => a.gradeOutOf20 != null);
    const overallAverage = graded.length
      ? graded.reduce((s, a) => s + (a.gradeOutOf20 ?? 0), 0) / graded.length
      : null;
    const bySubject: Record<string, { count: number; avg: number }> = {};
    for (const a of graded) {
      const cur = bySubject[a.subject] ?? { count: 0, avg: 0 };
      cur.avg = (cur.avg * cur.count + (a.gradeOutOf20 ?? 0)) / (cur.count + 1);
      cur.count += 1;
      bySubject[a.subject] = cur;
    }
    return {
      totalAttempts: attempts.length,
      overallAverage,
      bySubject,
      recent: attempts.slice(0, 8),
    };
  }

  @Get("documents")
  @UseGuards(AuthGuard)
  documents(@Req() req: FastifyRequest & { user: AuthedUser }) {
    return this.prisma.studentDocument.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
  }

  @Post("documents")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("student")
  async uploadDoc(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: { fileName: string; storageKey?: string }) {
    const sub = await this.currentSub(req.user.id);
    const quota = Number((sub?.plan.features as any)?.pdfQuotaMonth ?? 0);
    if (quota <= 0) apiError(HttpStatus.PAYMENT_REQUIRED, "PDF_QUOTA_EXCEEDED", "Passe à Plus pour envoyer des PDF.");
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const used = await this.prisma.studentDocument.count({
      where: { userId: req.user.id, createdAt: { gte: monthStart } },
    });
    if (used >= quota) apiError(HttpStatus.PAYMENT_REQUIRED, "PDF_QUOTA_EXCEEDED", "Quota PDF du mois atteint.");
    return this.prisma.studentDocument.create({
      data: {
        userId: req.user.id,
        fileName: body.fileName || "document.pdf",
        storageKey: body.storageKey || `local/${Date.now()}`,
        status: "ready",
        questionsCount: 0,
        processedAt: new Date(),
      },
    });
  }

  @Get("documents/:id/questions")
  @UseGuards(AuthGuard)
  async docQuestions(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
    const doc = await this.prisma.studentDocument.findFirst({ where: { id, userId: req.user.id } });
    if (!doc) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Document introuvable.");
    return this.prisma.question.findMany({
      where: { studentDocId: id, ownerUserId: req.user.id },
      include: { parts: true, markSchemes: true },
    });
  }

  @Get("notifications")
  @UseGuards(AuthGuard)
  notifications(@Req() req: FastifyRequest & { user: AuthedUser }) {
    return this.prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  }

  private currentSub(userId: string) {
    const now = new Date();
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ["trialing", "active", "granted"] },
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: { plan: true },
    });
  }
}
