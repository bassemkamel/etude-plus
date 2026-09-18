import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";
import { AuthGuard, Roles, RolesGuard, type AuthedUser } from "../common/guards";
import { accessCookieOpts, refreshCookieOpts } from "../common/jwt";

function setAuthCookies(res: FastifyReply, tokens: { access: string; refresh: string }) {
  res.setCookie("etude_access", tokens.access, accessCookieOpts);
  res.setCookie("etude_refresh", tokens.refresh, refreshCookieOpts);
}

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register")
  register(@Body() body: { firstName: string; email: string; password: string; termsAccepted: boolean }) {
    return this.auth.register(body);
  }

  @Post("otp/send")
  sendOtp(@Body() body: { email: string }) {
    return this.auth.sendOtp(body.email);
  }

  @Post("otp/verify")
  async verify(@Body() body: { email: string; code: string }, @Res({ passthrough: true }) res: FastifyReply) {
    const out = await this.auth.verifyOtp(body.email, body.code);
    setAuthCookies(res, out.tokens);
    return out.user;
  }

  @Post("login")
  async login(@Body() body: { email: string; password: string }, @Res({ passthrough: true }) res: FastifyReply) {
    const out = await this.auth.login(body.email, body.password);
    setAuthCookies(res, out.tokens);
    return out.user;
  }

  @Post("logout")
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    await this.auth.logout((req.cookies as any)?.etude_refresh);
    res.clearCookie("etude_access", { path: "/" });
    res.clearCookie("etude_refresh", { path: "/api/v1/auth" });
    return { ok: true };
  }

  @Post("refresh")
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const out = await this.auth.refresh((req.cookies as any)?.etude_refresh);
    setAuthCookies(res, out.tokens);
    return out.user;
  }

  @Post("password/forgot")
  forgot(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email);
  }

  @Post("password/reset")
  reset(@Body() body: { email: string; code: string; newPassword: string }) {
    return this.auth.resetPassword(body.email, body.code, body.newPassword);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() req: FastifyRequest & { user: AuthedUser }) {
    return this.auth.me(req.user.id);
  }

  @Post("password/change")
  @UseGuards(AuthGuard)
  changePassword(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.auth.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }
}

@Controller("users")
export class UsersController {
  constructor(private auth: AuthService) {}

  @Patch("me")
  @UseGuards(AuthGuard)
  updateMe(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
    return this.auth.updateMe(req.user.id, body);
  }

  @Post("me/password")
  @UseGuards(AuthGuard)
  password(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.auth.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }
}

@Controller("students")
export class StudentsController {
  constructor(private auth: AuthService) {}

  @Patch("me/profile")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("student")
  profile(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
    return this.auth.updateStudentProfile(req.user.id, body);
  }
}
