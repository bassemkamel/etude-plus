import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AdminService } from "./admin.service";
import { AuthGuard, Roles, RolesGuard, type AuthedUser } from "../common/guards";

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
    constructor(private adminService: AdminService) { }

    @Get("users")
    @Roles("admin", "super_admin")
    users(
        @Query("q") q?: string,
        @Query("role") role?: string,
        @Query("status") status?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
    ) {
        return this.adminService.users(q, role, status, page, limit);
    }

    @Post("users")
    @Roles("super_admin")
    createUser(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
        return this.adminService.createUser(req.user, req.ip, body);
    }

    @Patch("users/:id")
    @Roles("super_admin")
    editUser(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string, @Body() body: any) {
        return this.adminService.editUser(req.user, req.ip, id, body);
    }

    @Post("users/:id/suspend")
    @Roles("admin", "super_admin")
    suspend(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
        return this.adminService.suspend(req.user, req.ip, id);
    }

    @Post("users/:id/activate")
    @Roles("admin", "super_admin")
    activate(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
        return this.adminService.activate(req.user, req.ip, id);
    }

    @Post("users/:id/archive")
    @Roles("super_admin")
    archive(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
        return this.adminService.archive(req.user, req.ip, id);
    }

    @Delete("users/:id")
    @Roles("super_admin")
    softDelete(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
        return this.adminService.softDelete(req.user, req.ip, id);
    }

    @Post("users/:id/restore")
    @Roles("super_admin")
    restore(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
        return this.adminService.restore(req.user, req.ip, id);
    }

    @Get("plans")
    @Roles("super_admin")
    listPlans() {
        return this.adminService.listPlans();
    }

    @Post("plans")
    @Roles("super_admin")
    createPlan(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
        return this.adminService.createPlan(req.user, req.ip, body);
    }

    @Patch("plans/:id")
    @Roles("super_admin")
    patchPlan(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string, @Body() body: any) {
        return this.adminService.patchPlan(req.user, req.ip, id, body);
    }

    @Get("subscriptions")
    @Roles("super_admin")
    subscriptions() {
        return this.adminService.subscriptions();
    }

    @Post("subscriptions/grant")
    @Roles("super_admin")
    grant(
        @Req() req: FastifyRequest & { user: AuthedUser },
        @Body() body: { userId: string; planId: string; startsAt: string; endsAt: string; reason: string },
    ) {
        return this.adminService.grant(req.user, req.ip, body);
    }

    @Get("discounts")
    @Roles("admin", "super_admin")
    discounts() {
        return this.adminService.discounts();
    }

    @Post("discounts")
    @Roles("admin", "super_admin")
    createDiscount(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
        return this.adminService.createDiscount(req.user, req.ip, body);
    }

    @Patch("discounts/:id")
    @Roles("admin", "super_admin")
    patchDiscount(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string, @Body() body: any) {
        return this.adminService.patchDiscount(req.user, req.ip, id, body);
    }

    @Get("questions")
    @Roles("admin", "super_admin")
    questions(@Query("status") status?: string) {
        return this.adminService.questions(status);
    }

    @Post("questions")
    @Roles("admin", "super_admin")
    createQuestion(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
        return this.adminService.createQuestion(req.user, req.ip, body);
    }

    @Post("questions/generate")
    @Roles("admin", "super_admin")
    generate(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
        return this.adminService.startQuestionGeneration(req.user, req.ip, body);
    }

    @Get("questions/generate/:jobId")
    @Roles("admin", "super_admin")
    generationStatus(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("jobId") jobId: string) {
        return this.adminService.generationStatus(req.user, jobId);
    }

    @Post("questions/:id/publish")
    @Roles("admin", "super_admin")
    publish(@Req() req: FastifyRequest & { user: AuthedUser }, @Param("id") id: string) {
        return this.adminService.publish(req.user, req.ip, id);
    }

    @Get("curriculum/chapters")
    @Roles("admin", "super_admin")
    chapters() {
        return this.adminService.chapters();
    }

    @Post("curriculum/chapters")
    @Roles("admin", "super_admin")
    createChapter(@Body() body: any) {
        return this.adminService.createChapter(body);
    }

    @Get("courses")
    @Roles("admin", "super_admin")
    courses() {
        return this.adminService.courses();
    }

    @Post("courses")
    @Roles("admin", "super_admin")
    createCourse(@Req() req: FastifyRequest & { user: AuthedUser }, @Body() body: any) {
        return this.adminService.createCourse(req.user, body);
    }

    @Get("kb/files")
    @Roles("admin", "super_admin")
    kb() {
        return this.adminService.kb();
    }

    @Get("analytics/overview")
    @Roles("super_admin")
    overview() {
        return this.adminService.overview();
    }

    @Get("audit")
    @Roles("super_admin")
    auditLogs() {
        return this.adminService.auditLogs();
    }
}
