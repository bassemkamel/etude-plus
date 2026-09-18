import { db, usersTable, professorsTable, studentProfilesTable, classesTable, liveSessionsTable, enrollmentsTable, materialsTable, quizzesTable, testsTable, assignmentsTable, gradesTable, notificationsTable, transactionsTable, reviewsTable } from "@workspace/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "etude_salt").digest("hex");
}

async function seed() {
  console.log("🌱 Seeding Étude+ database...");

  // Clean existing data
  await db.delete(reviewsTable);
  await db.delete(gradesTable);
  await db.delete(transactionsTable);
  await db.delete(enrollmentsTable);
  await db.delete(assignmentsTable);
  await db.delete(testsTable);
  await db.delete(quizzesTable);
  await db.delete(materialsTable);
  await db.delete(liveSessionsTable);
  await db.delete(classesTable);
  await db.delete(studentProfilesTable);
  await db.delete(professorsTable);
  await db.delete(notificationsTable);
  await db.delete(usersTable);

  // Create Admin
  const [admin] = await db.insert(usersTable).values({
    email: "admin@etude.tn",
    passwordHash: hashPassword("password"),
    role: "admin",
    fullName: "Admin Étude+",
    city: "Tunis",
  }).returning();
  console.log("✅ Admin created");

  // Create Professors
  const [profUser1] = await db.insert(usersTable).values({
    email: "prof@etude.tn",
    passwordHash: hashPassword("password"),
    role: "professor",
    fullName: "Dr. Ahmed Ben Salah",
    profilePhoto: null,
    city: "Tunis",
  }).returning();

  const [profUser2] = await db.insert(usersTable).values({
    email: "prof2@etude.tn",
    passwordHash: hashPassword("password"),
    role: "professor",
    fullName: "Prof. Fatma Chaabane",
    profilePhoto: null,
    city: "Sfax",
  }).returning();

  const [profUser3] = await db.insert(usersTable).values({
    email: "prof3@etude.tn",
    passwordHash: hashPassword("password"),
    role: "professor",
    fullName: "Dr. Karim Mansour",
    profilePhoto: null,
    city: "Sousse",
  }).returning();

  const [pendingProfUser] = await db.insert(usersTable).values({
    email: "pending@etude.tn",
    passwordHash: hashPassword("password"),
    role: "professor",
    fullName: "Mme. Nour Belhaj",
    city: "Nabeul",
  }).returning();

  // Professor profiles
  const [prof1] = await db.insert(professorsTable).values({
    userId: profUser1.id,
    subjects: ["Mathematics", "Physics"],
    gradeLevels: ["Lycée", "Baccalauréat"],
    yearsOfExperience: 12,
    bio: "Docteur en mathématiques de l'Université de Tunis, spécialisé en algèbre et analyse. Passionné par l'enseignement et l'innovation pédagogique.",
    qualifications: "PhD Mathématiques - Université de Tunis El Manar, Agrégé de Mathématiques",
    status: "approved",
    isVerified: true,
    rating: 4.8,
    totalReviews: 47,
    totalStudents: 312,
  }).returning();

  const [prof2] = await db.insert(professorsTable).values({
    userId: profUser2.id,
    subjects: ["Physics", "Chemistry"],
    gradeLevels: ["Collège", "Lycée", "Baccalauréat"],
    yearsOfExperience: 8,
    bio: "Professeure de physique-chimie avec 8 ans d'expérience. Méthode pédagogique claire et structurée pour préparer les élèves au baccalauréat.",
    qualifications: "Maîtrise en Physique - Université de Sfax, Certificat d'Aptitude à l'Enseignement Secondaire",
    status: "approved",
    isVerified: true,
    rating: 4.6,
    totalReviews: 31,
    totalStudents: 189,
  }).returning();

  const [prof3] = await db.insert(professorsTable).values({
    userId: profUser3.id,
    subjects: ["Mathematics", "Computer Science"],
    gradeLevels: ["Primary", "Collège"],
    yearsOfExperience: 5,
    bio: "Ingénieur informaticien reconverti dans l'enseignement. Je rends les maths et l'informatique accessibles et amusants pour les jeunes élèves.",
    qualifications: "Ingénieur en Informatique - ENIT, Master en Sciences de l'Éducation",
    status: "approved",
    isVerified: false,
    rating: 4.4,
    totalReviews: 18,
    totalStudents: 94,
  }).returning();

  const [pendingProf] = await db.insert(professorsTable).values({
    userId: pendingProfUser.id,
    subjects: ["French", "Arabic"],
    gradeLevels: ["Primary", "Collège"],
    yearsOfExperience: 3,
    bio: "Professeure de langues, spécialisée dans l'enseignement du français et de l'arabe pour les primaires et collégiens.",
    qualifications: "Licence en Lettres Françaises - Université de Carthage",
    status: "pending",
    isVerified: false,
    rating: null,
    totalReviews: 0,
    totalStudents: 0,
  }).returning();

  console.log("✅ Professors created");

  // Create Students
  const [studentUser1] = await db.insert(usersTable).values({
    email: "student@etude.tn",
    passwordHash: hashPassword("password"),
    role: "student",
    fullName: "Yasmine Trabelsi",
    city: "Tunis",
  }).returning();

  const [studentUser2] = await db.insert(usersTable).values({
    email: "student2@etude.tn",
    passwordHash: hashPassword("password"),
    role: "student",
    fullName: "Mohamed Khelifi",
    city: "Ariana",
  }).returning();

  const [studentUser3] = await db.insert(usersTable).values({
    email: "student3@etude.tn",
    passwordHash: hashPassword("password"),
    role: "student",
    fullName: "Sarra Ben Amara",
    city: "Sousse",
  }).returning();

  // Student profiles
  await db.insert(studentProfilesTable).values({
    userId: studentUser1.id,
    gradeLevel: "Baccalauréat",
    schoolName: "Lycée Pilote de Tunis",
    preferredSubjects: ["Mathematics", "Physics"],
    parentContact: "+216 98 123 456",
  });

  await db.insert(studentProfilesTable).values({
    userId: studentUser2.id,
    gradeLevel: "Lycée",
    schoolName: "Lycée Ibn Khaldoun Ariana",
    preferredSubjects: ["Mathematics", "Computer Science"],
  });

  await db.insert(studentProfilesTable).values({
    userId: studentUser3.id,
    gradeLevel: "Collège",
    schoolName: "Collège Habib Bourguiba Sousse",
    preferredSubjects: ["Chemistry", "Biology / SVT"],
  });

  console.log("✅ Students created");

  // Create Classes
  // Math 101 - fully featured showcase
  const [math101] = await db.insert(classesTable).values({
    professorId: prof1.id,
    title: "Math 101 – Algèbre et Analyse",
    subject: "Mathematics",
    gradeLevel: "Baccalauréat",
    city: "Tunis",
    description: "Un cours complet de mathématiques pour les élèves du baccalauréat couvrant l'algèbre, l'analyse, les suites numériques, les fonctions et la géométrie analytique. Ce cours prépare les élèves aux examens du baccalauréat avec des exercices pratiques et des révisions intensives.",
    price: 35,
    durationHours: 2,
    isRecurring: true,
    isPublished: true,
    enrolledCount: 28,
  }).returning();

  const [physicsClass] = await db.insert(classesTable).values({
    professorId: prof1.id,
    title: "Physique – Mécanique et Électricité",
    subject: "Physics",
    gradeLevel: "Baccalauréat",
    city: "Tunis",
    description: "Cours de physique axé sur la mécanique newtonienne, l'électricité et les circuits. Préparation intensive aux épreuves du baccalauréat avec exercices corrigés.",
    price: 40,
    durationHours: 2,
    isRecurring: true,
    isPublished: true,
    enrolledCount: 19,
  }).returning();

  const [chemClass] = await db.insert(classesTable).values({
    professorId: prof2.id,
    title: "Chimie – Réactions et Équilibres",
    subject: "Chemistry",
    gradeLevel: "Lycée",
    city: "Sfax",
    description: "Cours de chimie pour lycéens couvrant les réactions chimiques, les équilibres, les acides et bases, et la chimie organique. Exercices pratiques et expériences virtuelles.",
    price: 30,
    durationHours: 1.5,
    isRecurring: false,
    isPublished: true,
    enrolledCount: 15,
  }).returning();

  const [physClass2] = await db.insert(classesTable).values({
    professorId: prof2.id,
    title: "Physique – Optique et Ondes",
    subject: "Physics",
    gradeLevel: "Lycée",
    city: "Sfax",
    description: "Introduction à l'optique géométrique et aux ondes. Cours interactif avec animations et simulations pour mieux comprendre les phénomènes physiques.",
    price: 35,
    durationHours: 2,
    isRecurring: false,
    isPublished: true,
    enrolledCount: 12,
  }).returning();

  const [mathCollege] = await db.insert(classesTable).values({
    professorId: prof3.id,
    title: "Mathématiques Collège – Bases et Fondamentaux",
    subject: "Mathematics",
    gradeLevel: "Collège",
    city: "Sousse",
    description: "Renforcement des bases mathématiques pour collégiens. Fractions, équations, géométrie et probabilités expliqués simplement avec beaucoup d'exemples concrets.",
    price: 25,
    durationHours: 1,
    isRecurring: true,
    isPublished: true,
    enrolledCount: 22,
  }).returning();

  const [csClass] = await db.insert(classesTable).values({
    professorId: prof3.id,
    title: "Informatique – Python pour Débutants",
    subject: "Computer Science",
    gradeLevel: "Collège",
    city: "Sousse",
    description: "Introduction à la programmation avec Python. Apprentissage ludique des concepts fondamentaux: variables, boucles, fonctions et algorithmes simples.",
    price: 30,
    durationHours: 1.5,
    isRecurring: false,
    isPublished: true,
    enrolledCount: 18,
  }).returning();

  const [bioClass] = await db.insert(classesTable).values({
    professorId: prof2.id,
    title: "Biologie – SVT Lycée",
    subject: "Biology / SVT",
    gradeLevel: "Lycée",
    city: "Sfax",
    description: "Cours de sciences de la vie et de la terre pour lycéens. Génétique, écologie, biologie cellulaire et physiologie humaine avec schémas et animations.",
    price: 28,
    durationHours: 1.5,
    isRecurring: true,
    isPublished: true,
    enrolledCount: 14,
  }).returning();

  const [arabicClass] = await db.insert(classesTable).values({
    professorId: prof1.id,
    title: "Mathématiques Avancées – Prépa Concours",
    subject: "Mathematics",
    gradeLevel: "Baccalauréat",
    city: "Tunis",
    description: "Préparation intensive aux concours d'entrée aux grandes écoles d'ingénieurs. Exercices de haut niveau, olympiades et techniques de résolution avancées.",
    price: 55,
    durationHours: 3,
    isRecurring: false,
    isPublished: true,
    enrolledCount: 9,
  }).returning();

  console.log("✅ Classes created");

  // Live Sessions for Math 101
  const futureDate1 = new Date();
  futureDate1.setDate(futureDate1.getDate() + 3);
  futureDate1.setHours(18, 0, 0, 0);

  const futureDate2 = new Date();
  futureDate2.setDate(futureDate2.getDate() + 10);
  futureDate2.setHours(18, 0, 0, 0);

  const pastDate1 = new Date();
  pastDate1.setDate(pastDate1.getDate() - 7);
  pastDate1.setHours(18, 0, 0, 0);

  const [session1] = await db.insert(liveSessionsTable).values({
    classId: math101.id,
    title: "Math 101 – Révision Algèbre : Équations et Fonctions",
    description: "Une session de révision intensive couvrant les équations du second degré, les systèmes d'équations, et les fonctions polynômiales. Exercices pratiques et préparation aux examens.",
    price: 35,
    durationHours: 2,
    scheduledAt: futureDate1,
    status: "scheduled",
    enrolledCount: 18,
  }).returning();

  const [session2] = await db.insert(liveSessionsTable).values({
    classId: math101.id,
    title: "Math 101 – Analyse : Suites et Limites",
    description: "Session dédiée aux suites numériques, aux limites de fonctions et aux techniques de dérivation. Exercices de baccalauréat corrigés en direct.",
    price: 35,
    durationHours: 2,
    scheduledAt: futureDate2,
    status: "scheduled",
    enrolledCount: 21,
  }).returning();

  const [pastSession] = await db.insert(liveSessionsTable).values({
    classId: math101.id,
    title: "Math 101 – Introduction : Nombres Complexes",
    description: "Session d'introduction aux nombres complexes. Module, argument, forme trigonométrique et applications.",
    price: 35,
    durationHours: 2,
    scheduledAt: pastDate1,
    status: "ended",
    enrolledCount: 24,
  }).returning();

  // Live sessions for other classes
  const future3 = new Date();
  future3.setDate(future3.getDate() + 5);
  future3.setHours(16, 0, 0, 0);

  await db.insert(liveSessionsTable).values({
    classId: physicsClass.id,
    title: "Physique – Lois de Newton et Applications",
    description: "Révision des trois lois de Newton avec exercices d'application: pendule, plan incliné, mouvement circulaire.",
    price: 40,
    durationHours: 2,
    scheduledAt: future3,
    status: "scheduled",
    enrolledCount: 15,
  });

  const future4 = new Date();
  future4.setDate(future4.getDate() + 14);
  future4.setHours(17, 0, 0, 0);

  await db.insert(liveSessionsTable).values({
    classId: chemClass.id,
    title: "Chimie – Acides, Bases et pH",
    description: "Comprendre les réactions acide-base, calculer le pH et résoudre des problèmes d'équilibre acide-base.",
    price: 30,
    durationHours: 1.5,
    scheduledAt: future4,
    status: "scheduled",
    enrolledCount: 10,
  });

  console.log("✅ Live sessions created");

  // Materials for Math 101
  await db.insert(materialsTable).values([
    {
      classId: math101.id,
      title: "Cours Complet – Algèbre du Baccalauréat",
      description: "Résumé complet du programme d'algèbre pour le baccalauréat tunisien. Inclut toutes les formules, théorèmes et méthodes de résolution.",
      fileUrl: "/materials/algebre-bac.pdf",
      fileType: "pdf",
    },
    {
      classId: math101.id,
      title: "Exercices Corrigés – Fonctions et Dérivées",
      description: "Série d'exercices progressifs sur les fonctions, dérivées et applications. Corrigés détaillés avec explications étape par étape.",
      fileUrl: "/materials/fonctions-exercices.pdf",
      fileType: "pdf",
    },
    {
      classId: math101.id,
      title: "Formules Essentielles – Aide-mémoire",
      description: "Aide-mémoire des formules indispensables pour le baccalauréat: trigonométrie, analyse, géométrie analytique.",
      fileUrl: "/materials/formules-essentielles.pdf",
      fileType: "pdf",
    },
    {
      classId: physicsClass.id,
      title: "Cours Mécanique Newtonienne",
      description: "Support de cours complet sur la mécanique: cinématique, dynamique, énergie et travail.",
      fileUrl: "/materials/mecanique.pdf",
      fileType: "pdf",
    },
    {
      classId: chemClass.id,
      title: "Tableau Périodique Commenté",
      description: "Tableau périodique annoté avec propriétés principales des éléments et tendances périodiques.",
      fileUrl: "/materials/tableau-periodique.pdf",
      fileType: "pdf",
    },
  ]);

  // Quizzes for Math 101
  const [quiz1] = await db.insert(quizzesTable).values({
    classId: math101.id,
    title: "Quiz 1 – Équations du Second Degré",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isPublished: true,
    questions: [
      {
        id: 1,
        text: "Quelle est la solution de l'équation x² - 5x + 6 = 0 ?",
        type: "multiple_choice",
        options: ["x = 2 et x = 3", "x = -2 et x = -3", "x = 1 et x = 6", "x = -1 et x = -6"],
        correctAnswer: "x = 2 et x = 3",
        points: 2,
      },
      {
        id: 2,
        text: "Le discriminant Δ d'une équation du second degré ax² + bx + c = 0 est calculé par ?",
        type: "multiple_choice",
        options: ["Δ = b² - 4ac", "Δ = b² + 4ac", "Δ = -b² - 4ac", "Δ = 4ac - b²"],
        correctAnswer: "Δ = b² - 4ac",
        points: 2,
      },
      {
        id: 3,
        text: "Calculez la valeur de Δ pour x² - 4x + 3 = 0",
        type: "numeric",
        options: null,
        correctAnswer: "4",
        points: 3,
      },
      {
        id: 4,
        text: "Expliquez quand une équation du second degré a-t-elle deux racines réelles distinctes.",
        type: "short_answer",
        options: null,
        correctAnswer: null,
        points: 3,
      },
    ],
  }).returning();

  // Tests for Math 101
  await db.insert(testsTable).values({
    classId: math101.id,
    title: "Test de Contrôle – Fonctions et Dérivées",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    isPublished: true,
    questions: [
      {
        id: 1,
        text: "Calculez la dérivée de f(x) = 3x³ - 2x² + 5x - 1",
        type: "short_answer",
        options: null,
        correctAnswer: "f'(x) = 9x² - 4x + 5",
        points: 4,
      },
      {
        id: 2,
        text: "Déterminez les extremums de la fonction f(x) = x² - 4x + 3",
        type: "long_answer",
        options: null,
        correctAnswer: null,
        points: 6,
      },
      {
        id: 3,
        text: "La dérivée de f(x) = sin(x) est:",
        type: "multiple_choice",
        options: ["cos(x)", "-cos(x)", "-sin(x)", "tan(x)"],
        correctAnswer: "cos(x)",
        points: 2,
      },
      {
        id: 4,
        text: "Quelle est la valeur de f'(2) pour f(x) = x³ - 3x ?",
        type: "numeric",
        options: null,
        correctAnswer: "9",
        points: 3,
      },
    ],
  });

  // Assignments for Math 101
  await db.insert(assignmentsTable).values([
    {
      classId: math101.id,
      title: "Devoir 1 – Résolution d'Équations",
      instructions: "Résolvez les 10 équations du second degré fournies et présentez vos solutions avec le calcul du discriminant. Montrez toutes les étapes de calcul. Durée estimée: 2 heures.",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      isPublished: true,
    },
    {
      classId: math101.id,
      title: "Devoir 2 – Étude de Fonctions",
      instructions: "Pour chacune des 3 fonctions données, effectuez une étude complète: domaine de définition, limites aux bornes, dérivée, tableau de variations, et tracé de la courbe.",
      dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      isPublished: true,
    },
  ]);

  console.log("✅ Materials, quizzes, tests, assignments created");

  // Enrollments
  const [enrollment1] = await db.insert(enrollmentsTable).values({
    studentId: studentUser1.id,
    classId: math101.id,
    sessionId: session1.id,
    status: "paid",
    paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  }).returning();

  await db.insert(enrollmentsTable).values({
    studentId: studentUser1.id,
    classId: physicsClass.id,
    status: "paid",
    paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  });

  await db.insert(enrollmentsTable).values({
    studentId: studentUser2.id,
    classId: math101.id,
    status: "paid",
    paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });

  await db.insert(enrollmentsTable).values({
    studentId: studentUser2.id,
    classId: csClass.id,
    status: "paid",
    paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  });

  await db.insert(enrollmentsTable).values({
    studentId: studentUser3.id,
    classId: chemClass.id,
    status: "paid",
    paidAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  });

  await db.insert(enrollmentsTable).values({
    studentId: studentUser3.id,
    classId: bioClass.id,
    status: "paid",
    paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  });

  console.log("✅ Enrollments created");

  // Grades
  await db.insert(gradesTable).values([
    {
      studentId: studentUser1.id,
      classId: math101.id,
      assessmentType: "quiz",
      assessmentId: quiz1.id,
      assessmentTitle: "Quiz 1 – Équations du Second Degré",
      score: 18,
      maxScore: 20,
      comment: "Excellent travail! Bonne maîtrise des équations. Continuez ainsi.",
      gradedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      studentId: studentUser1.id,
      classId: physicsClass.id,
      assessmentType: "test",
      assessmentId: 1,
      assessmentTitle: "Test – Lois de Newton",
      score: 15,
      maxScore: 20,
      comment: "Bonne compréhension des lois de Newton. Quelques erreurs dans les calculs vectoriels.",
      gradedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      studentId: studentUser2.id,
      classId: math101.id,
      assessmentType: "quiz",
      assessmentId: quiz1.id,
      assessmentTitle: "Quiz 1 – Équations du Second Degré",
      score: 14,
      maxScore: 20,
      comment: "Des progrès visibles. Revoir les discriminants négatifs.",
      gradedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      studentId: studentUser3.id,
      classId: chemClass.id,
      assessmentType: "assignment",
      assessmentId: 1,
      assessmentTitle: "Devoir – Réactions Acide-Base",
      score: 16,
      maxScore: 20,
      comment: "Très bon travail. La présentation est claire et les calculs sont corrects.",
      gradedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ]);

  // Notifications
  await db.insert(notificationsTable).values([
    {
      userId: studentUser1.id,
      title: "Nouvelle session live disponible",
      message: "Dr. Ahmed Ben Salah a planifié une nouvelle session Math 101 pour le " + futureDate1.toLocaleDateString("fr-TN"),
      type: "info",
      isRead: false,
    },
    {
      userId: studentUser1.id,
      title: "Devoir noté",
      message: "Votre quiz 'Équations du Second Degré' a été noté: 18/20. Excellent travail!",
      type: "success",
      isRead: false,
    },
    {
      userId: studentUser1.id,
      title: "Rappel: Devoir à rendre",
      message: "Le devoir 'Résolution d'Équations' est à rendre dans 2 jours.",
      type: "reminder",
      isRead: true,
    },
    {
      userId: studentUser2.id,
      title: "Bienvenue sur Étude+",
      message: "Bienvenue Mohamed! Commencez à explorer nos cours et trouvez les meilleurs professeurs de Tunisie.",
      type: "info",
      isRead: false,
    },
    {
      userId: profUser1.id,
      title: "Nouveau inscrit",
      message: "3 nouveaux étudiants se sont inscrits à votre cours Math 101 cette semaine.",
      type: "success",
      isRead: false,
    },
    {
      userId: profUser1.id,
      title: "Rappel: Session demain",
      message: "Votre session live 'Révision Algèbre' est programmée pour demain à 18h00.",
      type: "reminder",
      isRead: false,
    },
  ]);

  // Transactions
  await db.insert(transactionsTable).values([
    {
      studentId: studentUser1.id,
      classId: math101.id,
      sessionId: session1.id,
      amount: 35,
      platformFee: 5.25,
      professorAmount: 29.75,
      status: "completed",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      studentId: studentUser1.id,
      classId: physicsClass.id,
      amount: 40,
      platformFee: 6,
      professorAmount: 34,
      status: "completed",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      studentId: studentUser2.id,
      classId: math101.id,
      amount: 35,
      platformFee: 5.25,
      professorAmount: 29.75,
      status: "completed",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      studentId: studentUser2.id,
      classId: csClass.id,
      amount: 30,
      platformFee: 4.5,
      professorAmount: 25.5,
      status: "completed",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      studentId: studentUser3.id,
      classId: chemClass.id,
      amount: 30,
      platformFee: 4.5,
      professorAmount: 25.5,
      status: "completed",
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      studentId: studentUser3.id,
      classId: bioClass.id,
      amount: 28,
      platformFee: 4.2,
      professorAmount: 23.8,
      status: "completed",
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  ]);

  // Reviews
  await db.insert(reviewsTable).values([
    {
      studentId: studentUser1.id,
      professorId: prof1.id,
      classId: math101.id,
      rating: 5,
      comment: "Excellent professeur! Explications très claires et pédagogie exemplaire. Je recommande vivement.",
    },
    {
      studentId: studentUser2.id,
      professorId: prof1.id,
      classId: math101.id,
      rating: 4,
      comment: "Très bon cours. Le professeur est patient et répond bien aux questions. Les exercices sont bien choisis.",
    },
    {
      studentId: studentUser3.id,
      professorId: prof2.id,
      classId: chemClass.id,
      rating: 5,
      comment: "Prof. Chaabane explique la chimie de façon très accessible. Les schémas sont très clairs.",
    },
  ]);

  console.log("✅ Grades, notifications, transactions, reviews created");
  console.log("🎉 Seeding complete!");
  process.exit(0);
}

seed().catch(console.error);
