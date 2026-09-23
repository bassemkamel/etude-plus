import { createHash, randomInt, randomBytes } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma.service";
import { MailService } from "../mail.service";
import { apiError } from "../common/errors";
import { signAccessToken, signRefreshToken } from "../common/jwt";
import { isSectionLevel, isSimpleLevel, isValidNiveauKey, getSectionsForNiveau } from "../lib/education-config";

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) { }

  private async issueTokens(userId: string, role: string) {
    const jti = randomBytes(16).toString("hex");
    const tokenHash = createHash("sha256").update(jti).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
    return {
      access: signAccessToken({ sub: userId, role }),
      refresh: signRefreshToken({ sub: userId, jti }),
    };
  }

  async register(body: { firstName: string; email: string; password: string; termsAccepted: boolean }) {
    const firstName = body.firstName?.trim() ?? "";
    const email = body.email?.toLowerCase().trim() ?? "";
    const password = body.password ?? "";
    if (firstName.length < 2) apiError(HttpStatus.BAD_REQUEST, "INVALID_NAME", "Prénom trop court.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) apiError(HttpStatus.BAD_REQUEST, "INVALID_EMAIL", "Email invalide.");
    if (password.length < 8) apiError(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "Mot de passe : 8 caractères minimum.");
    if (!body.termsAccepted) apiError(HttpStatus.BAD_REQUEST, "TERMS", "Vous devez accepter les CGU.");

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) apiError(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Cet email est déjà utilisé.");

    await this.sendOtp(email, { firstName, email, password, termsAccepted: true });
    return { ok: true };
  }

  async sendOtp(emailRaw: string, payload?: Record<string, unknown>) {
    const email = emailRaw.toLowerCase().trim();
    const recent = await this.prisma.emailOtp.count({
      where: { email, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
    });
    if (recent >= 3) apiError(HttpStatus.TOO_MANY_REQUESTS, "OTP_RATE", "Trop de codes envoyés. Réessayez dans 10 minutes.");

    const last = await this.prisma.emailOtp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });
    const payloadToStore = payload ?? (last?.payload as Record<string, unknown>) ?? { email };
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await this.prisma.emailOtp.create({
      data: {
        email,
        codeHash: hashCode(code),
        payload: payloadToStore as object,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    await this.mail.sendOtp(email, code);
    return { ok: true };
  }

  async verifyOtp(emailRaw: string, code: string) {
    const email = emailRaw.toLowerCase().trim();
    const otp = await this.prisma.emailOtp.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp || otp.codeHash !== hashCode(code)) {
      apiError(HttpStatus.UNPROCESSABLE_ENTITY, "OTP_INVALID", "Code incorrect ou expiré.");
    }

    await this.prisma.emailOtp.update({ where: { id: otp!.id }, data: { usedAt: new Date() } });
    const payload = otp!.payload as { firstName?: string; email: string; password?: string };

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      if (!payload.password) apiError(HttpStatus.BAD_REQUEST, "OTP_INVALID", "Inscription incomplète. Recommencez.");
      const passwordHash = await bcrypt.hash(payload.password, 12);
      const firstName = payload.firstName?.trim() || "Élève";
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "student",
          firstName,
          lastName: "",
          fullName: firstName,
          emailVerified: true,
          termsAcceptedAt: new Date(),
          student: { create: { educationSection: "" } },
        },
      });
    } else if (user.status !== "active") {
      apiError(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "Compte désactivé.");
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), emailVerified: true } });
    const tokens = await this.issueTokens(user.id, user.role);
    return { user: await this.me(user.id), tokens };
  }

  async login(emailRaw: string, password: string) {
    const email = emailRaw.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) apiError(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email ou mot de passe incorrect.");
    if (user!.status !== "active") apiError(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "Compte désactivé.");
    const ok = await bcrypt.compare(password, user!.passwordHash);
    if (!ok) apiError(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email ou mot de passe incorrect.");
    await this.prisma.user.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } });
    const tokens = await this.issueTokens(user!.id, user!.role);
    return { user: await this.me(user!.id), tokens };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 8 },
      },
    });
    if (!user) apiError(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Session invalide.");
    const now = new Date();
    const current = user!.subscriptions.find((s) =>
      ["trialing", "active", "granted", "past_due"].includes(s.status) && s.endsAt >= now && s.startsAt <= now,
    ) ?? null;
    const { passwordHash: _, ...safe } = user!;
    return {
      ...safe,
      studentProfile: user!.student,
      subscription: current
        ? {
          id: current.id,
          status: current.status,
          startsAt: current.startsAt,
          endsAt: current.endsAt,
          plan: {
            id: current.plan.id,
            code: current.plan.code,
            nameFr: current.plan.nameFr,
            nameEn: current.plan.nameEn,
            nameAr: current.plan.nameAr,
            priceTnd: current.plan.priceTnd,
            interval: current.plan.interval,
            features: current.plan.features,
          },
        }
        : null,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Utilisateur introuvable.");
    if (!(await bcrypt.compare(currentPassword, user!.passwordHash))) {
      apiError(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PASSWORD", "Mot de passe actuel incorrect.");
    }
    if (newPassword.length < 8) apiError(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "Nouveau mot de passe trop court.");
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    return { ok: true };
  }

  async updateMe(userId: string, body: { firstName?: string; lastName?: string; city?: string; profilePhoto?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Utilisateur introuvable.");
    const firstName = body.firstName?.trim() ?? user!.firstName;
    const lastName = body.lastName?.trim() ?? user!.lastName;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        city: body.city ?? user!.city,
        profilePhoto: body.profilePhoto ?? user!.profilePhoto,
      },
    });
    return this.me(userId);
  }

  async updateStudentProfile(userId: string, body: { gradeLevel?: string; educationSection?: string; schoolName?: string | null }) {
    const gradeLevel = body.gradeLevel;
    if (gradeLevel && !isValidNiveauKey(gradeLevel)) {
      apiError(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_LEVEL_SECTION", "Niveau invalide.");
    }
    let educationSection = body.educationSection ?? "";
    if (gradeLevel && isSimpleLevel(gradeLevel)) educationSection = "";
    if (gradeLevel && isSectionLevel(gradeLevel)) {
      const sections = getSectionsForNiveau(gradeLevel);
      if (!educationSection || !sections[educationSection]) {
        apiError(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_LEVEL_SECTION", "Spécialité obligatoire pour ce niveau.");
      }
    }
    await this.prisma.studentProfile.upsert({
      where: { userId },
      create: {
        userId,
        gradeLevel: gradeLevel ?? null,
        educationSection,
        schoolName: body.schoolName ?? null,
        onboardingDoneAt: gradeLevel ? new Date() : null,
      },
      update: {
        gradeLevel: gradeLevel ?? undefined,
        educationSection,
        schoolName: body.schoolName === undefined ? undefined : body.schoolName,
        onboardingDoneAt: gradeLevel ? new Date() : undefined,
      },
    });
    return this.me(userId);
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) apiError(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Session expirée.");
    try {
      const { sub, jti } = (await import("./../common/jwt")).verifyRefresh(refreshToken!);
      const tokenHash = createHash("sha256").update(jti).digest("hex");
      const stored = await this.prisma.refreshToken.findFirst({
        where: { tokenHash, userId: sub, revokedAt: null, expiresAt: { gt: new Date() } },
      });
      if (!stored) apiError(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Session expirée.");
      await this.prisma.refreshToken.update({ where: { id: stored!.id }, data: { revokedAt: new Date() } });
      const user = await this.prisma.user.findUnique({ where: { id: sub } });
      if (!user || user.deletedAt || user.status !== "active") {
        apiError(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Session invalide.");
      }
      const tokens = await this.issueTokens(user!.id, user!.role);
      return { user: await this.me(user!.id), tokens };
    } catch (e) {
      if ((e as any)?.status) throw e;
      apiError(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Session expirée.");
    }
  }

  async forgotPassword(emailRaw: string) {
    const email = emailRaw?.toLowerCase().trim();
    if (!email) return { ok: true };
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.status === "active" && !user.deletedAt) {
      await this.sendOtp(email, { email, type: "reset" });
    }
    return { ok: true };
  }

  async resetPassword(emailRaw: string, code: string, newPassword: string) {
    const email = emailRaw.toLowerCase().trim();
    if (!newPassword || newPassword.length < 8) {
      apiError(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "Mot de passe : 8 caractères minimum.");
    }
    const otp = await this.prisma.emailOtp.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp || otp.codeHash !== hashCode(code)) {
      apiError(HttpStatus.UNPROCESSABLE_ENTITY, "OTP_INVALID", "Code incorrect ou expiré.");
    }
    const payload = otp!.payload as { type?: string };
    if (payload?.type !== "reset") apiError(HttpStatus.UNPROCESSABLE_ENTITY, "OTP_INVALID", "Code invalide.");
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Utilisateur introuvable.");
    await this.prisma.emailOtp.update({ where: { id: otp!.id }, data: { usedAt: new Date() } });
    await this.prisma.user.update({
      where: { id: user!.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    await this.prisma.refreshToken.updateMany({ where: { userId: user!.id }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      try {
        const { jti } = (await import("./../common/jwt")).verifyRefresh(refreshToken);
        const tokenHash = createHash("sha256").update(jti).digest("hex");
        await this.prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
      } catch {
        /* ignore */
      }
    }
    return { ok: true };
  }
}
