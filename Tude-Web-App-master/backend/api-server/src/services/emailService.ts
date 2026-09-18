/**
 * Email service — uses Resend when RESEND_API_KEY is set,
 * otherwise logs to console (dev mode). All functions are fire-and-forget.
 */

import { Resend } from "resend";

const APP_URL = process.env["APP_URL"] ?? "http://localhost:5173";
const IS_DEV  = process.env["NODE_ENV"] !== "production";
// Resend free tier only allows sending from onboarding@resend.dev without domain verification.
// In production, set RESEND_FROM to your verified domain sender (e.g. "Étude+ <noreply@etude-plus.com>").
const FROM = IS_DEV
  ? "onboarding@resend.dev"
  : (process.env["RESEND_FROM"] ?? "Étude+ <noreply@etude-plus.com>");

// ─── Resend client ────────────────────────────────────────────────────────────

function getResend(): Resend | null {
  const key = process.env["RESEND_API_KEY"];
  return key ? new Resend(key) : null;
}

export function isEmailConfigured(): boolean {
  return !!process.env["RESEND_API_KEY"];
}

// ─── Dev-mode console fallback ────────────────────────────────────────────────

function devLog(to: string, subject: string, body: string) {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  [EMAIL DEV MODE]`);
  console.log(`║  To:      ${to}`);
  console.log(`║  Subject: ${subject}`);
  const text = body.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
  console.log(`║  Preview: ${text}`);
  console.log(`╚══════════════════════════════════════════╝\n`);
}

// ─── Shared HTML template ─────────────────────────────────────────────────────

function buildEmailHtml(
  title: string,
  bodyHtml: string,
  ctaText?: string,
  ctaUrl?: string,
): string {
  const cta = ctaText && ctaUrl
    ? `<div style="text-align:center;margin:32px 0">
         <a href="${ctaUrl}"
            style="display:inline-block;background:#FBBF24;color:#1a1a2e;text-decoration:none;
                   padding:14px 32px;border-radius:10px;font-weight:700;font-size:16px;
                   letter-spacing:0.01em">
           ${ctaText}
         </a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border-radius:16px;
                    box-shadow:0 2px 12px rgba(0,0,0,0.07);overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="padding:28px 40px 20px;text-align:center;border-bottom:2px solid #FBBF24">
            <span style="font-size:28px;font-weight:800;color:#1a1a2e;letter-spacing:-0.5px">
              Étude<span style="color:#FBBF24">+</span>
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 8px">
            <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1a1a2e">${title}</h2>
            <div style="font-size:15px;line-height:1.7;color:#374151">
              ${bodyHtml}
            </div>
            ${cta}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6">
              &copy; 2025 Étude+ | Tunisie<br>
              <a href="mailto:support@etude-plus.tn"
                 style="color:#FBBF24;text-decoration:none">support@etude-plus.tn</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Internal send helper ─────────────────────────────────────────────────────

function send(to: string, subject: string, html: string): void {
  const resend = getResend();
  if (!resend) {
    devLog(to, subject, html);
    return;
  }
  resend.emails.send({ from: FROM, to, subject, html })
    .catch(err => console.error(`[emailService] Failed to send "${subject}" to ${to}:`, err));
}

// ─── 1. OTP verification code (combined with welcome message) ────────────────
// Sends a single email with the OTP code + welcome copy.
// The separate sendAccountVerificationEmail is NOT sent after registration
// so this is the only email a new user receives during signup.

export function sendOtpEmail(to: string, code: string): void {
  if (IS_DEV) {
    console.log("================================");
    console.log("DEV OTP for", to, ":", code);
    console.log("================================");
  }
  const subject = "Bienvenue sur Étude+ — votre code de vérification";
  const html = buildEmailHtml(
    "Bienvenue sur Étude+ !",
    `<p>Merci de rejoindre Étude+, la plateforme de cours particuliers en Tunisie.</p>
     <p>Utilisez le code ci-dessous pour confirmer votre adresse email et activer votre compte :</p>
     <div style="background:#fefce8;border:1px solid #fbbf24;border-radius:12px;
                 padding:24px;text-align:center;margin:20px 0">
       <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#1a1a2e;
                    font-family:monospace">${code}</span>
     </div>
     <p style="color:#6b7280;font-size:13px">
       Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.
     </p>`,
  );
  send(to, subject, html);
}

// ─── 2. Account email-link verification (24h token) ──────────────────────────

export function sendAccountVerificationEmail(
  user: { email: string; fullName: string; merchantId?: string | null },
  token: string,
): void {
  const link = `${APP_URL}/verify-email?token=${token}`;
  if (IS_DEV) {
    console.log("================================");
    console.log("DEV VERIFY LINK for", user.email, ":");
    console.log(link);
    console.log("================================");
  }
  const subject = "Confirmez votre adresse email — Étude+";
  const html = buildEmailHtml(
    `Bonjour ${user.fullName} !`,
    `<p>Bienvenue sur Étude+ ! Veuillez confirmer votre adresse email pour activer votre compte.</p>
     <p style="color:#6b7280;font-size:13px;margin-top:24px">
       Ce lien expire dans <strong>24 heures</strong>. Si vous n'avez pas créé de compte, ignorez cet email.
     </p>
     <p style="color:#9ca3af;font-size:12px;word-break:break-all">
       Lien direct : <a href="${link}" style="color:#FBBF24">${link}</a>
     </p>`,
    "Confirmer mon email",
    link,
  );
  send(user.email, subject, html);
}

// ─── 3. KYC submitted confirmation ───────────────────────────────────────────

export function sendKycSubmittedEmail(
  teacher: { email: string; fullName: string; merchantId?: string | null },
  declaredSubjects: Array<{ niveauKey: string; sectionKey: string | null; subjects: string[] }>,
): void {
  const subjectItems = declaredSubjects
    .flatMap(e => e.subjects.map(s =>
      e.sectionKey ? `${s} — ${e.niveauKey} / ${e.sectionKey}` : `${s} — ${e.niveauKey}`,
    ))
    .map(s => `<li style="margin:4px 0;color:#374151">${s}</li>`)
    .join("") || "<li style='color:#6b7280'>Aucune matière déclarée</li>";

  const merchantRow = teacher.merchantId
    ? `<div style="background:#eff6ff;border-radius:8px;padding:12px 16px;margin:16px 0">
         <p style="margin:0;font-size:13px;color:#1d4ed8">
           Votre Merchant ID : <strong style="font-family:monospace">${teacher.merchantId}</strong>
         </p>
       </div>`
    : "";

  const subject = "📋 Dossier reçu — en cours d'examen";
  const html = buildEmailHtml(
    `Dossier reçu, ${teacher.fullName} !`,
    `<p>Nous avons bien reçu votre dossier de vérification KYC. Voici un récapitulatif :</p>
     <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0">
       <p style="margin:0 0 10px;font-weight:600;color:#1a1a2e">Documents reçus :</p>
       <p style="margin:6px 0;color:#374151">✅ CIN (recto + verso)</p>
       <p style="margin:6px 0;color:#374151">✅ Diplôme universitaire</p>
       <p style="margin:6px 0;color:#374151">✅ Documents soumis</p>
       <p style="margin:12px 0 6px;font-weight:600;color:#1a1a2e">Matières déclarées :</p>
       <ul style="margin:0;padding-left:20px">${subjectItems}</ul>
     </div>
     ${merchantRow}
     <p>Notre équipe examinera votre dossier et vous contactera dans les <strong>48 heures</strong>.</p>`,
  );
  send(teacher.email, subject, html);
}

// ─── 4. KYC approved ─────────────────────────────────────────────────────────

export function sendKycApprovedEmail(
  teacher: { email: string; fullName: string; merchantId?: string | null },
  approvedSubjects: Array<{ niveauKey: string; sectionKey: string | null; subject: string }>,
): void {
  const subjectItems = approvedSubjects
    .map(s => s.sectionKey
      ? `${s.subject} — ${s.niveauKey} / ${s.sectionKey}`
      : `${s.subject} — ${s.niveauKey}`,
    )
    .map(s => `<li style="margin:4px 0;color:#374151">${s}</li>`)
    .join("") || "<li style='color:#6b7280'>Compte vérifié</li>";

  const merchantRow = teacher.merchantId
    ? `<div style="background:#eff6ff;border-radius:8px;padding:12px 16px;margin:16px 0">
         <p style="margin:0;font-size:13px;color:#1d4ed8">
           Votre Merchant ID : <strong style="font-family:monospace">${teacher.merchantId}</strong>
         </p>
       </div>`
    : "";

  const subject = "✅ Compte vérifié — Bienvenue sur Étude+ !";
  const html = buildEmailHtml(
    `Félicitations, ${teacher.fullName} !`,
    `<p>Votre compte a été <strong>vérifié avec succès</strong>. Vous pouvez maintenant publier vos cours sur Étude+.</p>
     <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0">
       <p style="margin:0 0 10px;font-weight:600;color:#1a1a2e">Matières approuvées :</p>
       <ul style="margin:0;padding-left:20px">${subjectItems}</ul>
     </div>
     ${merchantRow}`,
    "Créer mon premier cours",
    `${APP_URL}/professor/classes`,
  );
  send(teacher.email, subject, html);
}

// ─── 5. KYC rejected ─────────────────────────────────────────────────────────

export function sendKycRejectedEmail(
  teacher: { email: string; fullName: string },
  reasons: string[],
): void {
  const reasonItems = reasons.length
    ? reasons.map(r => `<li style="margin:6px 0;color:#374151">${r}</li>`).join("")
    : "<li style='color:#6b7280'>Aucune raison spécifiée — contactez le support</li>";

  const subject = "Votre dossier nécessite des corrections";
  const html = buildEmailHtml(
    `Dossier à corriger, ${teacher.fullName}`,
    `<p>Après examen de votre dossier, notre équipe a identifié des points à corriger avant de pouvoir approuver votre compte.</p>
     <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:20px 0">
       <p style="margin:0 0 10px;font-weight:600;color:#dc2626">Corrections demandées :</p>
       <ul style="margin:0;padding-left:20px">${reasonItems}</ul>
     </div>
     <p>Corrigez les points mentionnés et soumettez à nouveau votre dossier depuis votre espace professeur.</p>`,
    "Soumettre à nouveau",
    `${APP_URL}/professor/kyc`,
  );
  send(teacher.email, subject, html);
}

// ─── 6. Password reset ────────────────────────────────────────────────────────

export function sendPasswordResetEmail(
  user: { email: string; fullName: string },
  resetToken: string,
): void {
  const link = `${APP_URL}/reset-password?token=${resetToken}`;
  const subject = "Réinitialisation de votre mot de passe";
  const html = buildEmailHtml(
    "Réinitialisation du mot de passe",
    `<p>Bonjour ${user.fullName},</p>
     <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Étude+.</p>
     <p style="color:#6b7280;font-size:13px">
       Ce lien est valide pendant <strong>1 heure</strong>.
       Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
     </p>`,
    "Réinitialiser mon mot de passe",
    link,
  );
  send(user.email, subject, html);
}

// ─── 7. Welcome email (after email verified) ─────────────────────────────────

export function sendWelcomeEmail(
  user: { email: string; fullName: string; role: string },
): void {
  const isTeacher = user.role === "professor";
  const ctaText = isTeacher ? "Compléter mon profil" : "Explorer les cours";
  const ctaUrl  = isTeacher ? `${APP_URL}/professor/kyc` : `${APP_URL}/student/browse`;

  const subject = "Bienvenue sur Étude+ 🎓";
  const html = buildEmailHtml(
    `Bienvenue, ${user.fullName} !`,
    `<p>Votre adresse email a été confirmée avec succès. Votre compte Étude+ est maintenant actif.</p>
     <p>${isTeacher
       ? "Pour commencer à publier des cours, complétez votre vérification KYC afin que les élèves puissent vous trouver."
       : "Découvrez nos cours et trouvez le professeur qui correspond à vos besoins scolaires."
     }</p>`,
    ctaText,
    ctaUrl,
  );
  send(user.email, subject, html);
}

// ─── 8. Enrollment confirmation ──────────────────────────────────────────────

export function sendEnrollmentConfirmationEmail(
  student: { email: string; fullName: string },
  classInfo: { title: string; teacherName: string; amountPaid: number },
): void {
  const subject = `Inscription confirmée — ${classInfo.title}`;
  const html = buildEmailHtml(
    "Inscription confirmée !",
    `<p>Bonjour ${student.fullName},</p>
     <p>Votre inscription au cours suivant a été confirmée :</p>
     <div style="background:#fefce8;border:1px solid #fbbf24;border-radius:12px;padding:20px;margin:20px 0">
       <p style="margin:0 0 8px;font-weight:700;color:#1a1a2e;font-size:17px">${classInfo.title}</p>
       <p style="margin:4px 0;color:#374151">👨‍🏫 Professeur : <strong>${classInfo.teacherName}</strong></p>
       <p style="margin:4px 0;color:#374151">💳 Montant payé : <strong>${classInfo.amountPaid} TND</strong></p>
     </div>
     <p>Vous pouvez accéder à votre cours depuis votre espace élève à tout moment.</p>`,
    "Accéder au cours",
    `${APP_URL}/student/classes`,
  );
  send(student.email, subject, html);
}

// ─── 9. Admin password reset ──────────────────────────────────────────────────

export function sendPasswordResetByAdminEmail(
  user: { email: string; fullName: string },
  tempPassword: string,
): void {
  const subject = "Votre mot de passe a été réinitialisé";
  const html = buildEmailHtml(
    "Mot de passe réinitialisé",
    `<p>Bonjour ${user.fullName},</p>
     <p>Un administrateur Étude+ a réinitialisé votre mot de passe. Voici votre mot de passe temporaire :</p>
     <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;
                 padding:20px;text-align:center;margin:20px 0">
       <span style="font-size:22px;font-weight:800;font-family:monospace;
                    letter-spacing:4px;color:#1a1a2e">${tempPassword}</span>
     </div>
     <p style="color:#dc2626;font-size:13px;font-weight:600">
       &#9888;&#65039; Changez ce mot de passe dès votre première connexion.
     </p>`,
    "Se connecter",
    `${APP_URL}/login`,
  );
  send(user.email, subject, html);
}
