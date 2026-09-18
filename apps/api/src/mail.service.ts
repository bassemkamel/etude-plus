import { Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST ?? "localhost",
    port: Number(process.env.MAIL_PORT ?? 1025),
    secure: false,
  });

  async sendOtp(email: string, code: string) {
    const from = process.env.MAIL_FROM ?? "Étude+ <noreply@etudeplus.local>";
    await this.transport.sendMail({
      from,
      to: email,
      subject: "Votre code Étude+",
      text: `Votre code de vérification est ${code}. Il expire dans 10 minutes.`,
      html: `<p>Votre code de vérification Étude+ :</p><p style="font-size:28px;letter-spacing:8px;font-weight:700">${code}</p><p>Expire dans 10 minutes.</p>`,
    });
  }
}
