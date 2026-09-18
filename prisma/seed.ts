import { PrismaClient, Role, BillingInterval, SubscriptionStatus, SubscriptionSource, QuestionOrigin, QuestionStatus, QuestionType, Difficulty } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = "EtudePlus!2026";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "super@etudeplus.local" },
    update: {},
    create: {
      email: "super@etudeplus.local",
      passwordHash,
      role: Role.super_admin,
      firstName: "Super",
      lastName: "Admin",
      fullName: "Super Admin",
      emailVerified: true,
      termsAcceptedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@etudeplus.local" },
    update: {},
    create: {
      email: "admin@etudeplus.local",
      passwordHash,
      role: Role.admin,
      firstName: "Admin",
      lastName: "Étude+",
      fullName: "Admin Étude+",
      emailVerified: true,
      termsAcceptedAt: new Date(),
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "eleve@etudeplus.local" },
    update: {},
    create: {
      email: "eleve@etudeplus.local",
      passwordHash,
      role: Role.student,
      firstName: "Amine",
      lastName: "Ben Ali",
      fullName: "Amine Ben Ali",
      emailVerified: true,
      termsAcceptedAt: new Date(),
      city: "Tunis",
      student: {
        create: {
          gradeLevel: "bac",
          educationSection: "mathematiques",
          schoolName: "Lycée pilote",
          onboardingDoneAt: new Date(),
        },
      },
    },
  });

  const featuresPlus = {
    questionBank: true,
    practiceExams: true,
    pastPapers: true,
    flashcards: true,
    pdfQuotaMonth: 5,
    previewLimit: 0,
  };

  await prisma.plan.upsert({
    where: { code: "FREE" },
    update: {},
    create: {
      code: "FREE",
      nameFr: "Gratuit",
      nameEn: "Free",
      nameAr: "مجاني",
      descriptionJson: { fr: "Aperçu 3 questions / module / jour" },
      priceTnd: 0,
      interval: BillingInterval.monthly,
      features: {
        questionBank: false,
        practiceExams: false,
        pastPapers: false,
        flashcards: false,
        pdfQuotaMonth: 0,
        previewLimit: 3,
      },
      sortOrder: 0,
    },
  });

  await prisma.plan.upsert({
    where: { code: "PLUS_MONTHLY" },
    update: {},
    create: {
      code: "PLUS_MONTHLY",
      nameFr: "Plus — Mensuel",
      nameEn: "Plus — Monthly",
      nameAr: "بلس — شهري",
      descriptionJson: { fr: "Accès complet, 5 PDF / mois" },
      priceTnd: 29.9,
      interval: BillingInterval.monthly,
      features: featuresPlus,
      sortOrder: 1,
    },
  });

  const yearly = await prisma.plan.upsert({
    where: { code: "PLUS_YEARLY" },
    update: {},
    create: {
      code: "PLUS_YEARLY",
      nameFr: "Plus — Annuel",
      nameEn: "Plus — Yearly",
      nameAr: "بلس — سنوي",
      descriptionJson: { fr: "Accès complet, 2 mois offerts" },
      priceTnd: 249.0,
      interval: BillingInterval.yearly,
      features: featuresPlus,
      sortOrder: 2,
    },
  });

  const startsAt = new Date();
  const endsAt = new Date();
  endsAt.setFullYear(endsAt.getFullYear() + 1);

  const existingSub = await prisma.subscription.findFirst({
    where: { userId: student.id, status: { in: ["active", "granted", "trialing"] } },
  });
  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        userId: student.id,
        planId: yearly.id,
        status: SubscriptionStatus.granted,
        source: SubscriptionSource.admin_grant,
        startsAt,
        endsAt,
        grantedById: superAdmin.id,
        grantReason: "Compte de démonstration seed",
      },
    });
  }

  await prisma.discountCode.upsert({
    where: { code: "FIRST50" },
    update: {},
    create: {
      code: "FIRST50",
      type: "percent",
      percentOff: 30,
      maxRedemptions: 50,
      isActive: true,
      createdById: superAdmin.id,
    },
  });

  const try2Expires = new Date();
  try2Expires.setDate(try2Expires.getDate() + 30);
  await prisma.discountCode.upsert({
    where: { code: "TRY2" },
    update: {},
    create: {
      code: "TRY2",
      type: "percent",
      percentOff: 20,
      perUserLimit: 2,
      expiresAt: try2Expires,
      isActive: true,
      createdById: superAdmin.id,
    },
  });

  await prisma.curriculumSubject.upsert({
    where: { code: "mathematiques" },
    update: {},
    create: { code: "mathematiques", name: "Mathématiques", icon: "calculator", colorClass: "bg-blue-500/10 border-blue-200", sortOrder: 1 },
  });
  await prisma.curriculumSubject.upsert({
    where: { code: "francais" },
    update: {},
    create: { code: "francais", name: "Français", icon: "book", colorClass: "bg-amber-500/10 border-amber-200", sortOrder: 2 },
  });

  const chapters = [
    { levelCode: "7eme", sectionKey: "", subject: "Mathématiques", name: "Nombres entiers et décimaux", slug: "nombres-entiers-decimaux", sortOrder: 1 },
    { levelCode: "7eme", sectionKey: "", subject: "Mathématiques", name: "Fractions", slug: "fractions", sortOrder: 2 },
    { levelCode: "7eme", sectionKey: "", subject: "Français", name: "La phrase", slug: "la-phrase", sortOrder: 1 },
    { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Vecteurs du plan", slug: "vecteurs-du-plan", sortOrder: 1 },
    { levelCode: "2eme", sectionKey: "sciences", subject: "Mathématiques", name: "Géométrie analytique", slug: "geometrie-analytique", sortOrder: 2 },
    { levelCode: "bac", sectionKey: "mathematiques", subject: "Mathématiques", name: "Nombres complexes", slug: "nombres-complexes", sortOrder: 1 },
    { levelCode: "bac", sectionKey: "mathematiques", subject: "Mathématiques", name: "Dérivation", slug: "derivation", sortOrder: 2 },
    { levelCode: "bac", sectionKey: "mathematiques", subject: "Mathématiques", name: "Intégration", slug: "integration", sortOrder: 3 },
  ];

  for (const ch of chapters) {
    await prisma.curriculumChapter.upsert({
      where: {
        levelCode_sectionKey_subject_slug: {
          levelCode: ch.levelCode,
          sectionKey: ch.sectionKey,
          subject: ch.subject,
          slug: ch.slug,
        },
      },
      update: {},
      create: ch,
    });
  }

  const existingQ = await prisma.question.count({ where: { origin: QuestionOrigin.manual } });
  if (existingQ === 0) {
    const samples = [
      {
        topic: "Nombres complexes",
        text: "Soit z = 1 + i. Calculer |z| et arg(z).",
        answer: "|z| = √2, arg(z) = π/4",
      },
      {
        topic: "Nombres complexes",
        text: "Écrire z = √3 + i sous forme trigonométrique.",
        answer: "z = 2 (cos(π/6) + i sin(π/6))",
      },
      {
        topic: "Dérivation",
        text: "Dériver f(x) = x² e^x.",
        answer: "f'(x) = e^x (x² + 2x)",
      },
    ];

    for (const [i, s] of samples.entries()) {
      await prisma.question.create({
        data: {
          origin: QuestionOrigin.manual,
          status: QuestionStatus.published,
          createdById: superAdmin.id,
          gradeLevel: "bac",
          sectionKey: "mathematiques",
          subject: "Mathématiques",
          topic: s.topic,
          type: QuestionType.Exercice,
          difficulty: i === 2 ? Difficulty.moyen : Difficulty.facile,
          language: "Français",
          questionText: s.text,
          totalMarks: 4,
          estimatedTimeMinutes: 8,
          publishedAt: new Date(),
          parts: {
            create: [{ label: "a", text: s.text, marks: 4, orderIndex: 0 }],
          },
          markSchemes: {
            create: [{ partLabel: "a", answer: s.answer, marksBreakdown: "4 pts", orderIndex: 0 }],
          },
        },
      });
    }

    await prisma.flashcard.createMany({
      data: [
        { gradeLevel: "bac", sectionKey: "mathematiques", subject: "Mathématiques", topic: "Nombres complexes", front: "Module de z = a+ib ?", back: "|z| = √(a²+b²)" },
        { gradeLevel: "bac", sectionKey: "mathematiques", subject: "Mathématiques", topic: "Nombres complexes", front: "Conjugué de z = a+ib ?", back: "z̄ = a−ib" },
        { gradeLevel: "bac", sectionKey: "mathematiques", subject: "Mathématiques", topic: "Dérivation", front: "(uv)' = ?", back: "u'v + uv'" },
        { gradeLevel: "7eme", sectionKey: "", subject: "Mathématiques", topic: "Fractions", front: "Fraction irréductible ?", back: "pgcd(numérateur, dénominateur) = 1" },
        { gradeLevel: "2eme", sectionKey: "sciences", subject: "Mathématiques", topic: "Vecteurs du plan", front: "Vecteurs colinéaires ?", back: "Il existe k tel que u = k v" },
      ],
    });

    await prisma.annale.create({
      data: {
        gradeLevel: "bac",
        sectionKey: "mathematiques",
        subject: "Mathématiques",
        topic: "Nombres complexes",
        year: 2024,
        content: JSON.stringify([{ q: "Résoudre z² + 1 = 0 dans C." }]),
        solution: JSON.stringify([{ a: "z = i ou z = −i" }]),
      },
    });
  }

  console.log("Seed OK");
  console.log("  super@etudeplus.local / EtudePlus!2026");
  console.log("  admin@etudeplus.local  / EtudePlus!2026");
  console.log("  eleve@etudeplus.local  / EtudePlus!2026  (Bac — Mathématiques, PLUS annuel)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
