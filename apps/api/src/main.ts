import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(__dirname, "../../../.env") });

import cookie from "@fastify/cookie";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, bodyLimit: 25 * 1024 * 1024 }),
  );

  await app.register(cookie as any);

  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  app.setGlobalPrefix("api/v1", { exclude: ["healthz"] });

  const swagger = new DocumentBuilder()
    .setTitle("Étude+ API")
    .setDescription("Cahier des charges v1 — contrat /api/v1")
    .setVersion("1.0")
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  console.log(`Étude+ API http://localhost:${port}  docs: /api/docs  health: /healthz`);
}

bootstrap();
