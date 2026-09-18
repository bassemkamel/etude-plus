import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma.service";
import { verifyAccess } from "./jwt";

export type AuthedUser = {
  id: string;
  email: string;
  role: "student" | "admin" | "super_admin";
  status: string;
  firstName: string;
  lastName: string;
  fullName: string;
};

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

function readAccess(req: any): string | null {
  const cookie = req.cookies?.etude_access;
  if (cookie) return cookie;
  const h = req.headers?.authorization as string | undefined;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const token = readAccess(req);
    if (!token) throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Connexion requise." });
    try {
      const payload = verifyAccess(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.deletedAt) throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Session invalide." });
      if (user.status !== "active") throw new ForbiddenException({ code: "ACCOUNT_DISABLED", message: "Compte désactivé." });
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
      } satisfies AuthedUser;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException || e instanceof ForbiddenException) throw e;
      throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Session expirée." });
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest().user as AuthedUser | undefined;
    if (!user) throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Connexion requise." });
    if (!roles.includes(user.role)) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Accès insuffisant." });
    }
    return true;
  }
}
