import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("healthz")
  async healthz() {
    let db = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      db = "down";
      console.error("health db", err);
    }
    return {
      status: db === "ok" ? "ok" : "degraded",
      service: "etudeplus-api",
      db,
    };
  }
}
