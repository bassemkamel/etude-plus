import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { MailService } from "./mail.service";
import { AuthService } from "./auth/auth.service";
import { AuthController, UsersController, StudentsController } from "./auth/auth.controller";
import { CatalogController } from "./catalog.controller";
import { AdminController } from "./admin.controller";
import { AuthGuard, RolesGuard } from "./common/guards";

@Module({
  controllers: [
    HealthController,
    AuthController,
    UsersController,
    StudentsController,
    CatalogController,
    AdminController,
  ],
  providers: [PrismaService, MailService, AuthService, AuthGuard, RolesGuard],
})
export class AppModule {}
