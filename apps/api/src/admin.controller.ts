import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, HttpStatus } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { AuthGuard, Roles, RolesGuard, type AuthedUser } from "./common/guards";
import { apiError } from "./common/errors";

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(private prisma: PrismaService) {}

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
  generate(@Body() body: any) {
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
    apiError(HttpStatus.NOT_IMPLEMENTED, "AI_OFF", "Provider IA non branché.");
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
