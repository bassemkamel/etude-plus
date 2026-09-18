/**
 * 3ème année secondaire — local question fallback.
 *
 * Key strategy:
 *   "3eme/Anglais/<chapter>"                                       → truly shared (section=null)
 *   "3eme/lettres/<subject>/<chapter>"                             → Lettres only
 *   "3eme/<track>/<subject>/<chapter>"                             → that track only
 *   "3eme/__non_lettres__/<subject>/<chapter>"                     → seed expands to all 5 non-Lettres tracks
 *   "3eme/__autres__/<subject>/<chapter>"                          → seed expands to all 5 non-Lettres tracks (Philo only)
 *   "3eme/__lettres_eco__/<subject>/<chapter>"                     → seed expands to {lettres, economie_gestion}
 *   "3eme/__sciences__/<subject>/<chapter>"                        → seed expands to {math, sci_exp, sci_tech, sci_info}
 *   "3eme/__non_lettres_non_eco__/<subject>/<chapter>"             → expands to {math, sci_exp, sci_tech} (Informatique)
 *
 * Negative IDs distinguish fallback rows from real DB rows.
 * source = "manual-starter-3eme" identifies the seeded set.
 */

import type { FallbackQuestion } from "./questionsFallback";

// ── Helpers ──────────────────────────────────────────────────────────────────

function mcq(
  id: number, question: string, options: [string, string, string, string],
  correctAnswer: "A" | "B" | "C" | "D", explanation: string,
  opts: { difficulty?: FallbackQuestion["difficulty"]; marks?: number; rtl?: boolean; instruction?: string } = {},
): FallbackQuestion {
  const rtl = opts.rtl ?? false;
  return {
    id, type: "multiple-choice",
    instruction: opts.instruction ?? (rtl ? "اختر الإجابة الصحيحة." : "a) Choisissez la bonne réponse."),
    question,
    options: [
      { label: "A", text: options[0] }, { label: "B", text: options[1] },
      { label: "C", text: options[2] }, { label: "D", text: options[3] },
    ],
    correctAnswer, explanation,
    difficulty: opts.difficulty ?? "facile",
    totalMarks: opts.marks ?? 2,
    estimatedTimeMinutes: 3, requiresCalculator: false,
    direction: rtl ? "rtl" : "ltr", source: "manual-starter-3eme",
  };
}

function problem(
  id: number, question: string, correctAnswer: string, explanation: string,
  opts: { difficulty?: FallbackQuestion["difficulty"]; marks?: number; rtl?: boolean; calc?: boolean } = {},
): FallbackQuestion {
  const rtl = opts.rtl ?? false;
  return {
    id, type: "problem-solving",
    instruction: rtl ? "حلّ المسألة التالية." : "Résolvez le problème suivant.",
    question, correctAnswer, explanation,
    difficulty: opts.difficulty ?? "moyen",
    totalMarks: opts.marks ?? 2,
    estimatedTimeMinutes: 5, requiresCalculator: opts.calc ?? false,
    direction: rtl ? "rtl" : "ltr", source: "manual-starter-3eme",
  };
}

function shortAns(
  id: number, question: string, correctAnswer: string, explanation: string,
  opts: { difficulty?: FallbackQuestion["difficulty"]; marks?: number; rtl?: boolean } = {},
): FallbackQuestion {
  const rtl = opts.rtl ?? false;
  return {
    id, type: "short-answer",
    instruction: rtl ? "أجب عن السؤال التالي." : "Répondez brièvement.",
    question, correctAnswer, explanation,
    difficulty: opts.difficulty ?? "facile",
    totalMarks: opts.marks ?? 2,
    estimatedTimeMinutes: 3, requiresCalculator: false,
    direction: rtl ? "rtl" : "ltr", source: "manual-starter-3eme",
  };
}

function en(id: number, question: string, options: [string, string, string, string],
  correctAnswer: "A" | "B" | "C" | "D", explanation: string): FallbackQuestion {
  return mcq(id, question, options, correctAnswer, explanation, { instruction: "Choose the correct answer." });
}

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Anglais (LTR). Chapter names match the curriculum file exactly.
// ──────────────────────────────────────────────────────────────────────────────
const ANGLAIS_SHARED: Record<string, FallbackQuestion[]> = {
  "3eme/Anglais/Family Relationships": [
    en(-3001, "Which expression is closest in meaning to 'family support'?",
      ["Help and encouragement from family", "Refusing to communicate", "Ignoring relatives", "Avoiding responsibility"],
      "A", "Family support means help, care, and encouragement provided by family members."),
  ],
  "3eme/Anglais/Family roles": [
    en(-3002, "Which role is traditionally associated with parents?",
      ["Voting in elections only", "Providing for and raising the children", "Running large companies", "Driving public transport"],
      "B", "Caring for and educating children is a core family role."),
  ],
  "3eme/Anglais/The generation gap": [
    en(-3003, "'Generation gap' refers to:",
      ["the age between siblings", "differences in values and tastes between younger and older generations", "a hole in the floor", "the gap between two countries"],
      "B", "It describes the cultural and attitudinal differences between generations."),
  ],
  "3eme/Anglais/Values and attitudes": [
    en(-3004, "Which of the following is a personal value?",
      ["Honesty", "A traffic jam", "A weather forecast", "A football match"],
      "A", "Honesty is a personal value. The other items are events or situations."),
  ],
  "3eme/Anglais/Philanthropy": [
    en(-3005, "A philanthropist is a person who:",
      ["loves food only", "donates money or time to help others", "studies plants", "works in finance only"],
      "B", "Philanthropy involves giving generously to social causes."),
  ],
  "3eme/Anglais/Charity": [
    en(-3006, "What does 'donate to charity' usually mean?",
      ["Buying stocks", "Giving money or goods to help people in need", "Working for pay", "Saving for oneself"],
      "B", "Charitable donations support people in need."),
  ],
  "3eme/Anglais/Altruism": [
    en(-3007, "Altruism describes:",
      ["selfish behaviour", "selfless concern for the well-being of others", "competition", "rivalry"],
      "B", "Altruistic actions benefit others without expecting reward."),
  ],
  "3eme/Anglais/Activism": [
    en(-3008, "An activist is a person who:",
      ["does nothing", "campaigns for political, environmental or social change", "writes only fiction", "manages a bank"],
      "B", "Activists work publicly to bring about change."),
  ],
  "3eme/Anglais/Self-sacrifice": [
    en(-3009, "Self-sacrifice means:",
      ["preferring oneself first", "giving up something important for others or a cause", "ignoring responsibility", "avoiding others"],
      "B", "It implies setting aside personal interest for a greater good."),
  ],
  "3eme/Anglais/Volunteerism": [
    en(-3010, "Volunteers usually work:",
      ["for high salaries only", "without expecting financial reward", "in secret", "against their will"],
      "B", "Volunteers donate their time without expecting pay."),
  ],
  "3eme/Anglais/Solidarity": [
    en(-3011, "'Solidarity' best describes:",
      ["unity and support among a group", "isolation", "betrayal", "selfishness"],
      "A", "Solidarity is mutual support, especially in difficult times."),
  ],
  "3eme/Anglais/Generosity": [
    en(-3012, "A generous person is willing to:",
      ["keep everything for themselves", "share their time, money, or resources with others", "lie to others", "compete aggressively"],
      "B", "Generosity is freely sharing what one has."),
  ],
  "3eme/Anglais/Entertainment": [
    en(-3013, "Which is a common form of entertainment?",
      ["Going to the cinema", "Filling out tax forms", "Cleaning a bus", "Compiling C code"],
      "A", "Cinema, music, sport, and theatre are common forms of entertainment."),
  ],
  "3eme/Anglais/Leisure activities": [
    en(-3014, "Leisure activities are done:",
      ["during work hours only", "during free time for pleasure", "as punishment", "without choice"],
      "B", "Leisure time is voluntary and meant to bring enjoyment."),
  ],
  "3eme/Anglais/History and geography of places visited": [
    en(-3015, "Learning a place's history and geography helps a traveller to:",
      ["forget the trip", "appreciate the trip more deeply", "avoid all visits", "spend less time there"],
      "B", "Background knowledge enriches the travel experience."),
  ],
  "3eme/Anglais/Facilities": [
    en(-3016, "Hotel 'facilities' are:",
      ["the rooms only", "amenities and services offered to guests", "the staff hierarchy only", "the construction date"],
      "B", "Facilities include the pool, gym, Wi-Fi, breakfast service, etc."),
  ],
  "3eme/Anglais/Travel": [
    en(-3017, "Which document is required when crossing most borders?",
      ["A diary", "A passport (and possibly a visa)", "A library card", "A receipt"],
      "B", "Passports identify travellers internationally."),
  ],
  "3eme/Anglais/Holidays": [
    en(-3018, "Which sentence correctly expresses a future plan?",
      ["I went to Tunis next week.", "I am going to visit Tunis next week.", "I visit Tunis last week.", "I had visited Tunis tomorrow."],
      "B", "'Be going to + verb' expresses a future plan."),
  ],
  "3eme/Anglais/Eating out": [
    en(-3019, "'Eating out' means:",
      ["cooking at home", "having a meal at a restaurant", "skipping food", "shopping for groceries"],
      "B", "It refers to dining in a restaurant rather than at home."),
  ],
  "3eme/Anglais/Science and inventions": [
    en(-3020, "Which is an example of a scientific invention?",
      ["A folk song", "The light bulb", "An idiom", "A poem"],
      "B", "The light bulb is one of the great scientific inventions."),
  ],
  "3eme/Anglais/Technology": [
    en(-3021, "Which is an example of modern technology?",
      ["A printing press from the 15th century", "A smartphone", "A handwritten letter", "A horse-drawn cart"],
      "B", "Smartphones illustrate today's information technology."),
  ],
  "3eme/Anglais/Inventions": [
    en(-3022, "Who is famous for inventing the telephone?",
      ["Albert Einstein", "Alexander Graham Bell", "Isaac Newton", "Marie Curie"],
      "B", "Bell patented the first practical telephone in 1876."),
  ],
  "3eme/Anglais/Experiments": [
    en(-3023, "A scientific experiment is designed to:",
      ["entertain only", "test a hypothesis under controlled conditions", "rate movies", "make decorations"],
      "B", "Experiments test predictions in controlled settings."),
  ],
  "3eme/Anglais/Medical research and progress": [
    en(-3024, "Medical research helps mostly to:",
      ["increase diseases", "discover new treatments and cures", "reduce hospitals", "stop vaccination"],
      "B", "Medical research finds new therapies and vaccines."),
  ],
  "3eme/Anglais/Computers": [
    en(-3025, "A computer's main role is to:",
      ["produce music only", "process information automatically", "replace humans completely", "decorate rooms"],
      "B", "Computers process data following programmed instructions."),
  ],
  "3eme/Anglais/TV": [
    en(-3026, "Which is a major role of television?",
      ["Repair appliances", "Inform and entertain large audiences", "Print books", "Build roads"],
      "B", "TV broadcasts news, programmes, and entertainment to mass audiences."),
  ],
  "3eme/Anglais/Mobile phones": [
    en(-3027, "Which is a benefit of mobile phones?",
      ["They isolate users completely", "They enable instant communication anywhere", "They replace water", "They produce food"],
      "B", "Mobile phones allow communication on the move."),
  ],
  "3eme/Anglais/Genetic engineering": [
    en(-3028, "Genetic engineering involves:",
      ["building bridges", "modifying the DNA of organisms", "selling phones", "writing poems"],
      "B", "Genetic engineering changes an organism's DNA for desired traits."),
  ],
  "3eme/Anglais/New technology and its impact on our daily life": [
    en(-3029, "New technology mainly:",
      ["never changes daily life", "transforms how we communicate, work, and learn", "limits learning", "ends all sport"],
      "B", "Modern technology reshapes how we live and interact."),
  ],
  "3eme/Anglais/Education": [
    en(-3030, "Why is education considered essential?",
      ["It is decorative", "It builds knowledge, skills and opportunities", "It harms development", "It limits employment"],
      "B", "Education is a key driver of personal and social progress."),
  ],
  "3eme/Anglais/Professional life": [
    en(-3031, "In professional life, 'punctuality' means:",
      ["always being late", "being on time for work or meetings", "ignoring schedules", "avoiding meetings"],
      "B", "Punctuality is the habit of being on time."),
  ],
  "3eme/Anglais/Distance learning": [
    en(-3032, "Distance learning takes place:",
      ["only in classrooms", "remotely via the internet or other media", "underground", "only outside"],
      "B", "Distance learning happens at a distance, often online."),
  ],
  "3eme/Anglais/Electronic learning": [
    en(-3033, "'E-learning' refers to:",
      ["studying using electronic devices and the internet", "writing on paper only", "learning by walking", "ignoring teachers"],
      "A", "E-learning relies on digital platforms and devices."),
  ],
  "3eme/Anglais/Special education": [
    en(-3034, "Special education is designed for:",
      ["everyone equally", "students with specific learning needs or disabilities", "athletes only", "tourists only"],
      "B", "It tailors teaching for students with specific needs."),
  ],
  "3eme/Anglais/Dream school": [
    en(-3035, "Which best describes a 'dream school'?",
      ["The worst school imaginable", "An ideal school matching one's wishes", "A school that doesn't exist", "A school for sleeping"],
      "B", "A dream school is the kind of school one wishes to attend."),
  ],
  "3eme/Anglais/Exams": [
    en(-3036, "Which is a good revision strategy for exams?",
      ["Sleep too little", "Plan, summarize, and practise past papers", "Skip all lessons", "Avoid notes"],
      "B", "Regular planned revision is the key to exam success."),
  ],
  "3eme/Anglais/School life": [
    en(-3037, "Which is an aspect of school life?",
      ["Building bridges", "Classes, friendships, sports, and clubs", "Surgery practice", "Selling cars"],
      "B", "School life includes academic, social, and extra-curricular activities."),
  ],
  "3eme/Anglais/School violence": [
    en(-3038, "A good response to school violence is:",
      ["ignoring it", "reporting it and supporting the victim", "joining the bullies", "hiding alone"],
      "B", "Reporting and supporting victims helps stop violence."),
  ],
  "3eme/Anglais/Ecology": [
    en(-3039, "Ecology is the study of:",
      ["fashion trends", "relationships between organisms and their environment", "stock markets", "ancient ruins"],
      "B", "Ecology examines how living beings interact with their environment."),
  ],
  "3eme/Anglais/Environmental issues": [
    en(-3040, "Which is an environmental issue?",
      ["Cooking dinner at home", "Air pollution and climate change", "Reading a book", "Saying hello"],
      "B", "Pollution and climate change are environmental problems."),
  ],
  "3eme/Anglais/Natural disasters": [
    en(-3041, "Which is an example of a natural disaster?",
      ["A traffic jam", "An earthquake", "A homework task", "A phone call"],
      "B", "Earthquakes, floods, and hurricanes are natural disasters."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// LETTRES — Arabe (RTL, 5 chapters)
// ──────────────────────────────────────────────────────────────────────────────
const ARABE_LETTRES: Record<string, FallbackQuestion[]> = {
  "3eme/lettres/Arabe/الشعر الأندلسي والموشحات": [
    mcq(-3030, "ما الميزة الأساسية للموشحات الأندلسية؟",
      ["الالتزام الصارم بنظام القصيدة العربية", "التحرر الإيقاعي وتعدد الأقفال والأبيات", "غياب الموسيقى", "اقتصارها على لون شعري واحد"],
      "B", "تتميز الموشحات بمرونة بنيتها وتعدد أقفالها وعروضها.", { rtl: true }),
  ],
  "3eme/lettres/Arabe/المقامة": [
    shortAns(-3031, "ما المقصود بالمقامة في الأدب العربي القديم؟",
      "حكاية قصيرة ذات حبكة لغوية أنيقة، يرويها راوٍ ويبطلها شخصية متحايلة.",
      "أرسى المقامة بديع الزمان الهمذاني وطوّرها الحريري.", { rtl: true }),
  ],
  "3eme/lettres/Arabe/الشعر الحديث": [
    mcq(-3032, "ما السمة الأبرز للشعر العربي الحديث؟",
      ["التقيد التام بعمود الشعر", "التحرر الجزئي أو الكلي من الأوزان الخليلية وانفتاح الموضوعات", "نسخ الشعر الجاهلي", "إلغاء الإيقاع نهائياً"],
      "B", "تجاوز الشعر الحديث الأوزان التقليدية وانفتح على قضايا الإنسان المعاصر.", { rtl: true }),
  ],
  "3eme/lettres/Arabe/المسرحية": [
    shortAns(-3033, "ما الفرق بين المسرحية وغيرها من الأجناس الأدبية؟",
      "تعتمد على الحوار والمشهد البصري وتُكتب لتُمَثَّل.",
      "المسرحية فن أدائي يقوم على الحوار والصراع الدرامي.", { rtl: true }),
  ],
  "3eme/lettres/Arabe/السيرة الذاتية": [
    mcq(-3034, "ما المقصود بالسيرة الذاتية؟",
      ["سيرة شخص آخر", "كتابة المرء عن حياته بنفسه", "وصف مدينة", "تقرير علمي"],
      "B", "في السيرة الذاتية يروي الكاتب تجربته وحياته بضمير المتكلم.", { rtl: true }),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// NON-LETTRES — Arabe (RTL) — Modules: الفكاهة والهزل، صور ونصوص، شواغل المرأة،
// العدل والإنصاف، حرية التعبير، الإنسان والمكان.
// Written under __non_lettres__ key; seed expands to all 5 non-Lettres tracks.
// ──────────────────────────────────────────────────────────────────────────────
const ARABE_NON_LETTRES: Record<string, FallbackQuestion[]> = {
  "3eme/__non_lettres__/Arabe/النص التمهيدي: الحاجة إلى الفكاهة والضحك": [
    shortAns(-3040, "لماذا يحتاج الإنسان إلى الفكاهة؟",
      "للتنفيس عن همومه وتخفيف ضغط الحياة وإحياء الصلات الاجتماعية.",
      "الفكاهة وسيلة نفسية واجتماعية مهمة في حياة الإنسان.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/من المقامة الحلوانية": [
    mcq(-3041, "ما الذي يميّز أسلوب المقامة عامة؟",
      ["البساطة المعجمية", "السجع والصنعة اللغوية", "غياب الحوار", "الاقتصار على السرد العلمي"],
      "B", "تقوم المقامة على السجع وعناية بالمحسنات اللفظية.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/من المقامة المجاعية": [
    shortAns(-3042, "ما الدور الذي تؤديه الفكاهة في المقامة؟",
      "التعريض بأحوال المجتمع ونقد بعض عيوبه بأسلوب ضاحك.",
      "تتخذ الفكاهة في المقامة وسيلة للنقد الاجتماعي اللطيف.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/أبو دلامة والمهدي": [
    mcq(-3043, "ما القيمة الفنية لأبيات أبي دلامة الفكاهية؟",
      ["لا قيمة فنية", "براعة في توظيف اللغة وقدرة على إثارة الضحك", "مجرد سب", "محض إنشاد ديني"],
      "B", "تجمع أبيات أبي دلامة بين الذكاء البلاغي وروح الفكاهة.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/الكساحة": [
    shortAns(-3044, "ما الذي يستهدفه نص «الكساحة» الفكاهي؟",
      "تصوير حالة إنسانية بأسلوب ساخر يفضح بعض السلوكيات.",
      "تُوظَّف الفكاهة لرؤية الواقع من زاوية نقدية لطيفة.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/النص التمهيدي: الصورة والثقافة والاتصال": [
    mcq(-3045, "ما العلاقة بين الصورة والاتصال؟",
      ["لا علاقة بينهما", "الصورة لغة بصرية تنقل المعنى وتسهّل الاتصال", "الصورة تعيق التواصل", "الصورة بديل عن اللغة فقط"],
      "B", "الصورة وسيلة تواصل ذات قوة دلالية كبيرة.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/غرنكا": [
    shortAns(-3046, "ما الذي تصوره لوحة «غرنيكا» لبيكاسو؟",
      "بشاعة قصف غرنيكا الإسبانية وفظائع الحرب الأهلية.",
      "اشتهرت اللوحة برمز إدانتها لعنف الحرب.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/الحرية تقود الشعب": [
    mcq(-3047, "اشتهرت لوحة «الحرية تقود الشعب» بتمجيد:",
      ["الاستبداد", "ثورة الشعب وتطلعه إلى الحرية", "الانطواء", "الترف"],
      "B", "تجسد اللوحة (لـ Delacroix) ثورة الشعب الفرنسي ضد الظلم.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/المرأة في صورة الإشهار": [
    shortAns(-3048, "كيف تُوظَّف صورة المرأة أحياناً في الإشهار؟",
      "بطريقة استهلاكية تُختزل فيها المرأة في الشكل لخدمة الترويج التجاري.",
      "ينقد كثير من المفكرين هذا التوظيف لاختزاله للمرأة.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/سلاح دمار شامل": [
    mcq(-3049, "ما الفكرة التي يطرحها نص «سلاح دمار شامل» حول الصورة؟",
      ["الصورة بريئة دائماً", "الصورة قد تصبح أداة تأثير وتلاعب", "الصورة لا تنقل المعنى", "الصورة مجرد زينة"],
      "B", "تكشف النصوص النقدية قدرة الصورة على التوجيه والتأطير.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/الصورة وخطاب العنف": [
    shortAns(-3050, "كيف يُمكن للصورة أن تنشر العنف؟",
      "بترسيخ مشاهد العنف بوصفها أمراً مألوفاً أو مقبولاً.",
      "تتطلب التربية على الصورة قراءة نقدية للحدّ من تأثيرها السلبي.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/تسونامي": [
    mcq(-3051, "ما الذي يكشفه تناول صورة «تسونامي» إعلامياً؟",
      ["مدى الكارثة الإنسانية وأهمية التضامن", "أهمية السياحة", "ضرورة بناء أبنية أعلى للمياه", "ندرة الكوارث الطبيعية"],
      "A", "تبرز الصور الإعلامية حجم الفاجعة وضرورة الإغاثة.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/النص التمهيدي: الإبداع النسائي": [
    shortAns(-3052, "ما المقصود بـ«الإبداع النسائي» في الأدب؟",
      "الإنتاج الأدبي والفني الذي تكتبه نساء وتعبّر فيه عن تجاربهن الخاصة.",
      "ساهم الإبداع النسائي في إثراء المشهد الثقافي بقضايا المرأة.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/من هي المرأة الحقيقية؟": [
    mcq(-3053, "ما الذي يحدد قيمة المرأة الإنسانية حسب النص؟",
      ["مظهرها الخارجي فقط", "قيمها وقراراتها ومواقفها", "ثروتها فقط", "صمتها"],
      "B", "تتحدد قيمة المرأة الإنسانية بقدرتها على الفعل والإرادة.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/تريد المشاركة": [
    shortAns(-3054, "ما الذي تتطلبه مشاركة المرأة الفاعلة في المجتمع؟",
      "تعليماً ومساواة في الفرص ودعماً تشريعياً واجتماعياً.",
      "تحتاج المشاركة الفاعلة إلى منظومة متكاملة من الحقوق.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/لا خلاص إلا بالمساواة": [
    mcq(-3055, "أي قيمة يدعو إليها النص؟",
      ["التفوق الذكوري المطلق", "المساواة بين الرجل والمرأة", "العزلة الاجتماعية", "إلغاء التعليم"],
      "B", "يدعو النص إلى المساواة بوصفها مفتاحاً لتقدم المجتمع.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/لا سبيل إلى العمارة إلا بالعدل": [
    mcq(-3056, "ما العلاقة بين العدل والعمران كما يطرحها النص؟",
      ["لا علاقة بينهما", "العدل أساس ازدهار المجتمع وعمرانه", "العمران ينهار بالعدل", "العدل يضر بالاقتصاد"],
      "B", "أشار ابن خلدون إلى أن العدل أساس قوة الدولة والمجتمع.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/الثوب الجديد": [
    shortAns(-3057, "ما الفكرة التي يتناولها نص «الثوب الجديد»؟",
      "النقد الاجتماعي بأسلوب رمزي ساخر يفضح أوجه عدم العدل.",
      "يستعمل النص الرمز للوصول إلى نقد فعلي مرتبط بالعدل.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/في محكمة الاستئناف": [
    mcq(-3058, "ما الذي يبرزه مشهد «محكمة الاستئناف»؟",
      ["تقصير الأفراد فقط", "حق التقاضي والمراجعة بوصفه ضمانة قانونية للعدل", "حلول رياضية", "ندرة المحاكم"],
      "B", "تظهر النصوص قيمة الاستئناف كوسيلة ضامنة للحق.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/إصلاح السلطان": [
    shortAns(-3059, "كيف تتمثل علاقة العدل بالسلطان في النص؟",
      "صلاح السلطان رهين بإقامته للعدل ورعايته لحقوق الناس.",
      "النصوص الكلاسيكية ربطت بقاء السلطة بإقامة العدل.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/النص التمهيدي: الحرية اختيار شامل": [
    mcq(-3060, "تعني الحرية في النص:",
      ["الفوضى المطلقة", "اختيارٌ مسؤول مرتبط بقيم وحقوق", "الانعزال عن المجتمع", "اللامبالاة"],
      "B", "الحرية تجمع بين الاختيار والمسؤولية.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/الحرية منبع التقدم والتمدن": [
    shortAns(-3061, "كيف تكون الحرية منبعاً للتقدم؟",
      "بتوفير مناخ يحفز الإبداع والمبادرة وحرية الفكر.",
      "ربط النص بين فضاء الحرية وانطلاق الإبداع الحضاري.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/حرية الصحافة": [
    mcq(-3062, "ما أحد أبرز ضمانات حرية الصحافة؟",
      ["الرقابة المسبقة", "حماية القانون لحرية الرأي وحق الاطلاع", "احتكار الإعلام", "إغلاق الجرائد"],
      "B", "تنص الدساتير الحديثة على ضمان حرية الصحافة.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/هندسة الرؤية في الإعلام": [
    shortAns(-3063, "ما المقصود بـ«هندسة الرؤية» في الإعلام؟",
      "صياغة المضمون بطريقة توجّه فهم المتلقي ورؤيته للوقائع.",
      "تعالج النصوص قدرة الإعلام على تشكيل تصور الجمهور.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/الإعلام والغزو الثقافي": [
    mcq(-3064, "ما المقصود بـ«الغزو الثقافي» الإعلامي؟",
      ["تبادل ثقافي طبيعي", "هيمنة قيم أجنبية تُمرَّر عبر الإعلام", "تطوير اللغات الوطنية", "تشجيع الحوار"],
      "B", "يقلق المفكرون من إذابة الخصوصيات الثقافية تحت تأثير الإعلام المهيمن.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/دفاعا عن حرية الرأي": [
    shortAns(-3065, "ما حدود حرية الرأي حسب النص؟",
      "حدودها احترام حقوق الآخرين وعدم التحريض على الكراهية أو العنف.",
      "تتعايش حرية التعبير مع المسؤولية الأخلاقية والقانونية.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/ليس البيت فندقا": [
    mcq(-3066, "ما الفكرة الأساسية في «ليس البيت فندقاً»؟",
      ["البيت مكان عبور لا غير", "البيت ملاذ روحي واجتماعي وثقافي", "البيت مجرد مأوى", "البيت يحتاج خدمات الفندق"],
      "B", "يعالج النص أهمية البيت بوصفه مكوناً للهوية.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/كيف يموت النخل؟": [
    shortAns(-3067, "ما الدلالة الرمزية لـ«موت النخل» في النص؟",
      "زوال البيئة وانكسار الذاكرة الجماعية المرتبطة بالأرض.",
      "يستخدم النص النخل رمزاً للجذور والذاكرة.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/القرية المحفورة في الذاكرة": [
    mcq(-3068, "ما العلاقة بين الإنسان والمكان كما يطرحها النص؟",
      ["علاقة عابرة", "علاقة هوية وذاكرة وانتماء", "علاقة معاكسة", "لا توجد علاقة"],
      "B", "يربط الإنسان وجوده بمكانه الأول وذاكرته.", { rtl: true }),
  ],
  "3eme/__non_lettres__/Arabe/البيئة والإنسان": [
    shortAns(-3069, "ما واجب الإنسان نحو البيئة؟",
      "صونها واستثمارها بحكمة لضمان الحياة للأجيال القادمة.",
      "التنمية المستدامة شرط البقاء البيئي.", { rtl: true }),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// LETTRES — Français (LTR) — 3 modules, ~30 chapters
// We add 1 question per module-anchor chapter.
// ──────────────────────────────────────────────────────────────────────────────
const FRANCAIS_LETTRES: Record<string, FallbackQuestion[]> = {
  "3eme/lettres/Français/Textes à lire et à expliquer": [
    shortAns(-3070, "Qu'est-ce qu'un récit de voyage ?",
      "Un récit dans lequel un narrateur raconte un déplacement et les rencontres ou découvertes qu'il a faites.",
      "Le récit de voyage mêle narration, description et réflexion."),
  ],
  "3eme/lettres/Français/Lectures complémentaires": [
    shortAns(-3071, "Quel est le rôle d'une lecture complémentaire dans un module ?",
      "Approfondir le thème étudié et enrichir la culture personnelle de l'élève.",
      "Les lectures complémentaires élargissent le regard porté sur le sujet."),
  ],
  "3eme/lettres/Français/Activités lexicales": [
    shortAns(-3072, "Pourquoi travailler le champ lexical dans un module ?",
      "Pour mieux comprendre les textes et enrichir l'expression personnelle.",
      "Le travail lexical est essentiel à la maîtrise d'un thème."),
  ],
  "3eme/lettres/Français/Lecture de l'image": [
    mcq(-3073, "Que prend-on en compte lors de la lecture d'une image ?",
      ["Seulement les couleurs", "Le sujet, la composition, les couleurs et le message", "Le prix de l'image", "Rien de tout cela"],
      "B", "Lire une image, c'est observer ses éléments et interpréter son sens."),
  ],
  "3eme/lettres/Français/Pratique de la langue": [
    shortAns(-3074, "Quel intérêt présente la pratique régulière de la langue ?",
      "Elle consolide la grammaire et améliore la précision de l'écriture.",
      "Une bonne maîtrise grammaticale est nécessaire au lycée."),
  ],
  "3eme/lettres/Français/Pratique de l'oral": [
    shortAns(-3075, "Pourquoi pratiquer l'oral en classe ?",
      "Pour développer la confiance, la prononciation et la capacité d'argumentation.",
      "L'oral est aussi important que l'écrit dans la formation linguistique."),
  ],
  "3eme/lettres/Français/Pratique de l'écriture": [
    shortAns(-3076, "Quel est l'objectif de la pratique de l'écriture ?",
      "Apprendre à structurer ses idées et à écrire des textes cohérents et corrects.",
      "L'écriture régulière est la clé d'une expression maîtrisée."),
  ],
  "3eme/lettres/Français/Repères et rapprochements": [
    shortAns(-3077, "À quoi servent les « repères et rapprochements » dans un module ?",
      "À situer les textes dans leur contexte historique et culturel et à comparer les œuvres.",
      "Ces repères permettent une lecture plus riche et nuancée."),
  ],
  "3eme/lettres/Français/Fiche de projet": [
    shortAns(-3078, "Que doit contenir une fiche de projet pédagogique ?",
      "Le thème, les objectifs, les étapes, les ressources et l'évaluation prévue.",
      "Une fiche claire facilite la réalisation et le suivi du projet."),
  ],
  "3eme/lettres/Français/Autoévaluation": [
    shortAns(-3079, "Pourquoi pratiquer l'autoévaluation ?",
      "Pour identifier ses points forts et ses points à améliorer et devenir autonome.",
      "L'autoévaluation favorise l'apprentissage réflexif."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// NON-LETTRES — Français (LTR) — 6 modules
// ──────────────────────────────────────────────────────────────────────────────
const FRANCAIS_NON_LETTRES: Record<string, FallbackQuestion[]> = {
  "3eme/__non_lettres__/Français/Invitation au voyage": [
    shortAns(-3090, "Qu'est-ce qu'une invitation au voyage dans la littérature ?",
      "Un thème qui pousse le lecteur à découvrir d'autres lieux, cultures ou émotions.",
      "Le voyage devient un déclencheur d'évasion et de réflexion."),
  ],
  "3eme/__non_lettres__/Français/Le mythe aujourd'hui": [
    mcq(-3091, "Pourquoi les mythes restent-ils intéressants aujourd'hui ?",
      ["Ils sont seulement décoratifs", "Ils éclairent encore nos questions existentielles", "Ils sont sans valeur", "Ils sont scientifiques"],
      "B", "Les mythes parlent toujours de la condition humaine et de ses dilemmes."),
  ],
  "3eme/__non_lettres__/Français/Le droit à la différence": [
    shortAns(-3092, "Qu'est-ce que le droit à la différence ?",
      "Le droit pour chaque individu d'être respecté avec ses particularités sans discrimination.",
      "Cette valeur fonde la tolérance et le vivre-ensemble."),
  ],
  "3eme/__non_lettres__/Français/Celui qui n'avait jamais vu la mer": [
    mcq(-3093, "« Celui qui n'avait jamais vu la mer » de Le Clézio raconte :",
      ["une guerre", "une fugue d'enfant à la découverte de la mer", "une compétition sportive", "une bataille navale"],
      "B", "Daniel quitte l'école pour aller voir la mer pour la première fois."),
  ],
  "3eme/__non_lettres__/Français/Scènes comiques": [
    shortAns(-3094, "Qu'est-ce qui fait rire dans une scène comique ?",
      "Les quiproquos, les situations absurdes, le langage et les caractères contrastés.",
      "Le comique combine plusieurs procédés (de situation, de caractère, de langage)."),
  ],
  "3eme/__non_lettres__/Français/Le pouvoir de l'image": [
    mcq(-3095, "Quel effet une image bien choisie peut-elle avoir sur le lecteur ?",
      ["aucun effet", "renforcer un argument et rendre l'idée plus mémorable", "annuler le texte", "isoler le lecteur"],
      "B", "L'image visuelle ou mentale ancre l'idée et la rend plus forte."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// LETTRES + ECO — Histoire (RTL). Same book HISTOIRE_3EME_LETTRES_ECO.
// ──────────────────────────────────────────────────────────────────────────────
const HISTOIRE_LETTRES_ECO: Record<string, FallbackQuestion[]> = {
  "3eme/__lettres_eco__/Histoire/الدرس 1: الاكتشافات الجغرافية الكبرى ونتائجها": [
    mcq(-3100, "ما من أبرز نتائج الاكتشافات الجغرافية الكبرى؟",
      ["تراجع التجارة العالمية", "توسع التبادل العالمي وقيام إمبراطوريات استعمارية", "اختفاء أوروبا", "ركود اقتصادي شامل"],
      "B", "أفضت الاكتشافات إلى تجارة عالمية وإلى تأسيس إمبراطوريات.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 2: النهضة الأوروبية: المظاهر": [
    shortAns(-3101, "اذكر مظهرين من مظاهر النهضة الأوروبية.",
      "إحياء التراث اليوناني الروماني، ازدهار الفنون والعلوم، تطور الطباعة.",
      "تجلت النهضة في تجديد فكري وفني وعلمي شامل.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 3: النهضة الأوروبية: دراسة شخصية علمية: نيكولا كوبرنيك": [
    mcq(-3102, "بِم اشتهر نيكولا كوبرنيك؟",
      ["نظرية مركزية الشمس", "اختراع المطبعة", "اكتشاف أمريكا", "كتابة المسرحيات"],
      "A", "وضع كوبرنيك أسس النظام الشمسي حيث تدور الأرض حول الشمس.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 4: النهضة الأوروبية: دراسة فنية: لوحة الجوكوندا": [
    shortAns(-3103, "من رسم لوحة «الجوكوندا»؟",
      "ليوناردو دافنشي.",
      "تعد لوحة الموناليزا أيقونة فن عصر النهضة.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 5: توسع الإمبراطورية العثمانية وتنظيمها في القرن السادس عشر": [
    mcq(-3104, "في أي قرن بلغت الدولة العثمانية أوج توسعها؟",
      ["القرن 13م", "القرن 16م في عهد سليمان القانوني", "القرن 19م", "القرن 12م"],
      "B", "بلغت الدولة العثمانية ذروتها في القرن السادس عشر.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 6: أزمة الدولة الحفصية في القرن السادس عشر": [
    shortAns(-3105, "ما سبب أزمة الدولة الحفصية في القرن 16م؟",
      "الصراعات الداخلية والتدخل الأجنبي بين الإسبان والعثمانيين.",
      "كانت الحفصية في موقع صراع بين قوتي المتوسط.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 7: الصراع العثماني الإسباني في المتوسط وانتصاب العثمانيين في تونس": [
    mcq(-3106, "متى انتصب العثمانيون في تونس نهائياً؟",
      ["1574", "1830", "1881", "1956"],
      "A", "في 1574 بسط العثمانيون سيطرتهم على تونس.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 8: التحولات الاقتصادية في أوروبا الغربية: المثال الإنجليزي": [
    shortAns(-3107, "اذكر مظهراً للتحولات الاقتصادية في إنجلترا القرنين 17-18 م.",
      "بداية الثورة الزراعية ثم الصناعية وتطور التجارة البحرية.",
      "كانت إنجلترا رائدة في انتقال أوروبا إلى الاقتصاد الحديث.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 9: فكر التنوير": [
    shortAns(-3108, "ما الفكرة الأساسية التي دافع عنها فكر التنوير؟",
      "دافع فكر التنوير عن استعمال العقل ونقد الاستبداد والدعوة إلى الحرية والتقدم.",
      "ركّز فلاسفة التنوير على العقل وحقوق الإنسان وإصلاح المجتمع والسياسة.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 10: دراسة أثر من عصر التنوير: الموسوعة": [
    mcq(-3109, "من أبرز محرري «الموسوعة» الفرنسية؟",
      ["كوبرنيك", "ديدرو ودالمبير", "نابليون", "روسو وحده"],
      "B", "حرّر الموسوعة في القرن الثامن عشر ديدرو ودالمبير.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 11: الثورة الفرنسية وانتصار المبادئ الجديدة": [
    mcq(-3110, "في أي سنة اندلعت الثورة الفرنسية؟",
      ["1492", "1789", "1815", "1830"],
      "B", "اندلعت الثورة الفرنسية سنة 1789.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 12: أزمة الإمبراطورية العثمانية ومحاولات الإصلاح الأولى": [
    shortAns(-3111, "اذكر سبباً من أسباب أزمة الدولة العثمانية في القرن 18.",
      "ضعف الجيش الانكشاري، تراجع الاقتصاد، توسع نفوذ الدول الأوروبية.",
      "تراكمت أسباب داخلية وخارجية لأزمة الدولة العثمانية.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 13: التطور السياسي للإيالات العثمانية والمغرب الأقصى في القرن الثامن عشر": [
    shortAnswerSafe(-3112, "ما الذي ميّز إيالات الدولة العثمانية في القرن 18م؟",
      "استقلالها النسبي والتنافس على السلطة المحلية رغم تبعيتها للسلطان.",
      "تنامى الحكم المحلي في الإيالات في تلك الفترة.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 14: الدولة الحسينية في القرن الثامن عشر: علاقة السلطة بالمجتمع": [
    mcq(-3113, "متى تأسست الدولة الحسينية في تونس؟",
      ["1574", "1705", "1881", "1956"],
      "B", "أسّسها حسين بن علي سنة 1705.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 15: الثورة الصناعية": [
    shortAnswerSafe(-3114, "ما المقصود بالثورة الصناعية؟",
      "التحول من الإنتاج اليدوي إلى الإنتاج الآلي المعتمد على الآلة والبخار.",
      "بدأت في إنجلترا أواخر القرن 18 وانتشرت في أوروبا.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 16: التحولات الاقتصادية والاجتماعية في القرن التاسع عشر": [
    shortAnswerSafe(-3115, "اذكر تحولاً اجتماعياً في القرن 19 الأوروبي.",
      "ظهور البرجوازية والطبقة العاملة وتوسّع المدن.",
      "أعادت الثورة الصناعية تشكيل المجتمع الأوروبي.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 17: التيارات السياسية والفكرية في القرن التاسع عشر": [
    mcq(-3116, "أي تيار سياسي ظهر في القرن 19م كرد فعل على الرأسمالية؟",
      ["الفاشية", "الاشتراكية والشيوعية", "الفرعونية", "الاستقلالية المحضة"],
      "B", "ظهرت الأفكار الاشتراكية والشيوعية مع ماركس وإنغلز.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 18: التوسع الاستعماري واقتسام العالم": [
    mcq(-3117, "في أي مؤتمر تم تقاسم القارة الأفريقية بين القوى الأوروبية؟",
      ["مؤتمر يالطا", "مؤتمر برلين 1884-1885", "مؤتمر فرساي 1919", "مؤتمر بوتسدام"],
      "B", "حدد مؤتمر برلين 1884-1885 توزيع أفريقيا بين الدول الأوروبية.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 19: النهضة العربية الحديثة": [
    shortAnswerSafe(-3118, "اذكر علماً من أعلام النهضة العربية الحديثة.",
      "رفاعة الطهطاوي، خير الدين التونسي، محمد عبده، الطاهر الحداد.",
      "ساهم هؤلاء في تحديث الفكر والمجتمع العربيين.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 20: أزمة الإيالة التونسية في القرن التاسع عشر": [
    shortAnswerSafe(-3119, "اذكر مظهراً من مظاهر أزمة الإيالة التونسية في القرن 19م.",
      "تفاقم الديون الخارجية، تراجع الاقتصاد، الضغوط الأوروبية.",
      "أدت الأزمة الاقتصادية إلى الحماية الفرنسية.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 21: محاولات الإصلاح": [
    mcq(-3120, "ما أبرز كتاب لخير الدين التونسي؟",
      ["البخلاء", "أقوم المسالك في معرفة أحوال الممالك", "كليلة ودمنة", "الأيام"],
      "B", "ألّف خير الدين «أقوم المسالك» داعياً إلى التحديث.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 22: انتصاب الحماية الفرنسية على تونس وردود الفعل الأولى": [
    mcq(-3121, "في أي سنة فُرضت الحماية الفرنسية على تونس؟",
      ["1830", "1881", "1934", "1956"],
      "B", "فُرضت الحماية الفرنسية على تونس سنة 1881.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Histoire/الدرس 23: بوادر الحركة الوطنية التونسية إلى حدود 1914": [
    shortAnswerSafe(-3122, "اذكر تنظيماً مثّل بدايات الحركة الوطنية التونسية.",
      "جماعة «الشباب التونسي» وحزب «تونس الفتاة» (بعد 1907).",
      "تشكلت أولى التيارات الإصلاحية الوطنية مطلع القرن 20.", { rtl: true }),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SCIENTIFIC tracks — Histoire (RTL, 6 chapters)
// ──────────────────────────────────────────────────────────────────────────────
const HISTOIRE_SCIENTIFIC: Record<string, FallbackQuestion[]> = {
  "3eme/__sciences__/Histoire/الدرس الأول: فكر التنوير": [
    shortAns(-3140, "ما الفكرة الأساسية التي دافع عنها فكر التنوير؟",
      "دافع فكر التنوير عن استعمال العقل ونقد الاستبداد والدعوة إلى الحرية والتقدم.",
      "ركّز فلاسفة التنوير على العقل وحقوق الإنسان وإصلاح المجتمع والسياسة.", { rtl: true }),
  ],
  "3eme/__sciences__/Histoire/الدرس الثاني: الثورة الفرنسية وانتصار المبادئ الجديدة": [
    mcq(-3141, "ما الشعار الشهير للثورة الفرنسية؟",
      ["السلام والمحبة فقط", "الحرية، المساواة، الإخاء", "النصر للأكثرية", "العمل والثروة"],
      "B", "صار شعار الثورة الفرنسية: الحرية، المساواة، الإخاء.", { rtl: true }),
  ],
  "3eme/__sciences__/Histoire/الدرس الثالث: الثورة الصناعية: أهم مظاهرها": [
    mcq(-3142, "ما أبرز اختراع رمز للثورة الصناعية؟",
      ["الهاتف", "الآلة البخارية", "الإنترنت", "الكهرباء النووية"],
      "B", "أحدثت الآلة البخارية ثورة في المواصلات والصناعة.", { rtl: true }),
  ],
  "3eme/__sciences__/Histoire/الدرس الرابع: التحولات الاقتصادية والاجتماعية بأوروبا الغربية في القرن XIX": [
    shortAns(-3143, "اذكر تحولاً اجتماعياً نتج عن الثورة الصناعية في القرن 19م.",
      "ظهور البرجوازية والطبقة العاملة وتوسع المدن الصناعية.",
      "أعادت الصناعة تشكيل البنية الاجتماعية الأوروبية.", { rtl: true }),
  ],
  "3eme/__sciences__/Histoire/الدرس الخامس: التيارات الفكرية والسياسية في أوروبا في القرن XIX": [
    mcq(-3144, "أي تيار من التيارات التالية ظهر في القرن 19م؟",
      ["الفاشية فقط", "الليبرالية والاشتراكية والقومية", "الفكر اليوناني الكلاسيكي حصراً", "الأديان الجديدة"],
      "B", "ظهرت في القرن 19م تيارات الليبرالية والاشتراكية والقومية.", { rtl: true }),
  ],
  "3eme/__sciences__/Histoire/الدرس السادس: التوسع الاستعماري واقتسام العالم في القرن XIX": [
    mcq(-3145, "ما المؤتمر الذي قسّم أفريقيا بين القوى الأوروبية؟",
      ["يالطا", "برلين 1884-1885", "فرساي 1919", "بوتسدام 1945"],
      "B", "نظّم مؤتمر برلين اقتسام أفريقيا بين القوى الأوروبية.", { rtl: true }),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// LETTRES + ECO — Géographie (RTL, 17 chapters)
// ──────────────────────────────────────────────────────────────────────────────
const GEO_LETTRES_ECO: Record<string, FallbackQuestion[]> = {
  "3eme/__lettres_eco__/Géographie/الدرس 1: مزايا الموقع الجغرافي": [
    shortAns(-3150, "ما أهمية الموقع الجغرافي في دراسة المجال العربي؟",
      "يساعد الموقع الجغرافي على فهم أهمية المجال العربي في الربط بين القارات والبحار والمسالك التجارية.",
      "يساهم الموقع في تفسير الأهمية الاستراتيجية والاقتصادية للمجال العربي.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 2: الوسط الطبيعي: المزايا والضغوطات": [
    mcq(-3151, "أي عنصر يمثل ضغطاً طبيعياً على المجال العربي؟",
      ["خصوبة التربة في كل مكان", "ندرة المياه والجفاف", "غزارة الأمطار في الصحراء", "اعتدال المناخ كله"],
      "B", "تواجه المنطقة العربية تحديات الجفاف وندرة المياه.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 3: الموارد الطبيعية": [
    shortAns(-3152, "اذكر مورداً طبيعياً مهماً في العالم العربي.",
      "النفط والغاز الطبيعي والفوسفات.",
      "تتميز المنطقة العربية بثرواتها الطاقية والمعدنية.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 4: السكان والمشكلات السكانية": [
    mcq(-3153, "ما من المشكلات السكانية في كثير من الدول العربية؟",
      ["شيخوخة السكان فقط", "ارتفاع نسب الشباب مع البطالة", "اختفاء السكان", "تساوي التوزع جغرافياً"],
      "B", "تعاني الدول العربية من بطالة الشباب رغم وفرة الشريحة العاملة.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 5: التجارب التنموية بالبلدان العربية": [
    shortAns(-3154, "اذكر تحدياً يواجه التجارب التنموية في البلدان العربية.",
      "الاعتماد على النفط، ضعف التنوع الاقتصادي، عدم استقرار سياسي في بعض الحالات.",
      "تحتاج التنمية العربية إلى تنويع الاقتصاد والاستثمار في الإنسان.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 6: الأدفاق المادية واللامادية": [
    mcq(-3155, "ماذا تشمل الأدفاق اللامادية في العالم العربي؟",
      ["شحن البضائع فقط", "التحويلات المالية وتدفق المعلومات والخدمات", "نقل الفحم", "تصدير الفوسفات"],
      "B", "تشمل الأدفاق اللامادية الحوالات والاتصالات والخدمات.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 7: تنظيم المجال بالعالم العربي": [
    shortAns(-3156, "كيف يُنظَّم المجال الحضري في العالم العربي؟",
      "حول العواصم الكبرى ومدن السواحل، مع تفاوت بين المناطق الداخلية والساحلية.",
      "يبرز التفاوت بين السواحل والداخل سمة بنيوية للمجال العربي.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 8: المجال التونسي: الموارد الطبيعية والبشرية": [
    mcq(-3157, "ما المورد الطاقي البارز في تونس؟",
      ["الفحم", "النفط والغاز", "اليورانيوم", "الفحم الحجري الأسود"],
      "B", "تنتج تونس كميات محدودة لكن مهمة من النفط والغاز.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 9: المجال الفلاحي": [
    shortAns(-3158, "اذكر منتوجاً فلاحياً تونسياً مشهوراً.",
      "الزيتون وزيت الزيتون والتمور.",
      "تحتل تونس مرتبة عالمية في إنتاج زيت الزيتون والتمور.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 10: المجال السياحي": [
    mcq(-3159, "ما المنطقة السياحية الأكثر شهرة في تونس؟",
      ["مدنين", "السواحل التونسية (الحمامات، سوسة، جربة)", "القصرين", "تطاوين"],
      "B", "تتركز السياحة الشاطئية على السواحل الشرقية لتونس.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 11: المجال التجاري": [
    shortAns(-3160, "ما الشريك التجاري الرئيس لتونس؟",
      "الاتحاد الأوروبي وخاصة فرنسا وإيطاليا وألمانيا.",
      "ترتبط تونس باتفاقية شراكة مع الاتحاد الأوروبي.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 12: المجال الصناعي": [
    mcq(-3161, "ما القطاع الصناعي التحويلي الذي تشتهر به تونس؟",
      ["الفضاء", "النسيج والملابس والمكونات الإلكترونية", "الطاقة النووية", "السفن البحرية"],
      "B", "تونس مركز للنسيج والإلكترونيات الموجهة للتصدير.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 13: الولايات المتحدة الأمريكية: دعائم القوة": [
    mcq(-3162, "ما من دعائم القوة الأمريكية؟",
      ["ضعف الاقتصاد", "اقتصاد متنوع وقوة عسكرية وتكنولوجية", "صغر المساحة", "نقص الموارد"],
      "B", "للولايات المتحدة اقتصاد ضخم وقوة عسكرية وعلمية كبرى.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 14: الاتحاد الأوروبي: دعائم القوة": [
    shortAns(-3163, "ما الميزة الاقتصادية الأبرز للاتحاد الأوروبي؟",
      "أكبر سوق موحدة في العالم بحرية تنقل السلع والأشخاص.",
      "يشكل الاتحاد الأوروبي قطباً اقتصادياً عالمياً.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 15: اليابان: دعائم القوة": [
    mcq(-3164, "أي قطاع يمثل دعامة قوة اليابان؟",
      ["السياحة فقط", "الصناعات التكنولوجية والسيارات", "الفلاحة فقط", "النفط والغاز"],
      "B", "تشتهر اليابان بالصناعات التكنولوجية المتطورة.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 16: الأقطاب الاقتصادية الكبرى: المكانة العالمية": [
    shortAns(-3165, "ما مكانة الأقطاب الاقتصادية الكبرى في العالم؟",
      "تتحكم في الجزء الأكبر من الإنتاج والتجارة العالمية وفي الابتكار التكنولوجي.",
      "تشكل الولايات المتحدة والاتحاد الأوروبي واليابان والصين مراكز ثقل عالمية.", { rtl: true }),
  ],
  "3eme/__lettres_eco__/Géographie/الدرس 17: الأقطاب الاقتصادية الكبرى: حدود القوة": [
    mcq(-3166, "ما من حدود قوة الأقطاب الاقتصادية الكبرى؟",
      ["غياب التحديات", "التفاوت الداخلي والتنافس الدولي والتحديات البيئية", "ركود مستمر", "اختفاء الموارد"],
      "B", "تواجه الأقطاب تحديات داخلية وبيئية وسياسية.", { rtl: true }),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SCIENTIFIC tracks — Géographie (RTL, 17 chapters)
// ──────────────────────────────────────────────────────────────────────────────
const GEO_SCIENTIFIC: Record<string, FallbackQuestion[]> = {
  "3eme/__sciences__/Géographie/الدرس 1: الأدفاق التجارية": [
    mcq(-3170, "ما المقصود بالأدفاق التجارية؟",
      ["تبادل السلع والخدمات بين الدول", "تنقل السكان للسياحة", "تبادل الأخبار فقط", "نقل الفحم محلياً"],
      "A", "الأدفاق التجارية هي حركة السلع والخدمات بين الدول.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 2: الأدفاق المالية": [
    shortAns(-3171, "ما المقصود بالأدفاق المالية؟",
      "حركة رؤوس الأموال والاستثمارات وتحويلات الأموال بين الدول.",
      "تعكس الأدفاق المالية ترابط الاقتصاد العالمي.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 3: أدفاق الإعلام": [
    mcq(-3172, "ما الوسيلة التي عززت أدفاق الإعلام في العالم؟",
      ["البريد التقليدي فقط", "الإنترنت وقنوات الفضائيات", "الكتب الورقية حصراً", "الإذاعة المحلية"],
      "B", "أحدث الإنترنت ثورة في تدفق المعلومات عالمياً.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 4: المجال العالمي: التفاوت في التقدم وتركيبة العالم": [
    shortAns(-3173, "ما الذي يميز التفاوت في التقدم بين الدول؟",
      "فجوة بين الشمال المتقدم والجنوب النامي في الاقتصاد والتكنولوجيا.",
      "يظل التفاوت العالمي قضية مركزية في الجغرافيا الحديثة.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/ملف منهجي تقييمي: منهجية المقالة الجغرافية": [
    shortAns(-3174, "ما العناصر الأساسية لمقالة جغرافية؟",
      "مقدمة تطرح الإشكالية، عرض منظم بحجج وأمثلة، خاتمة.",
      "تتبع المقالة الجغرافية بنية منهجية واضحة.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 1: الاتحاد الأوروبي: المجال والسكان": [
    mcq(-3175, "كم عدد دول الاتحاد الأوروبي تقريباً (بعد بريكست)؟",
      ["10", "27", "50", "5"],
      "B", "بعد خروج بريطانيا، يضم الاتحاد الأوروبي 27 دولة.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 2: الاتحاد الأوروبي: دعائم القوة": [
    shortAns(-3176, "ما أبرز دعائم قوة الاتحاد الأوروبي؟",
      "سوق موحدة كبرى، تكنولوجيا متقدمة، تأثير دبلوماسي عالمي.",
      "يستفيد الاتحاد من تكامل اقتصادي وتنوع اجتماعي.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 3: الاتحاد الأوروبي: المظاهر الاقتصادية للقوة": [
    mcq(-3177, "ما العملة الموحدة المعتمدة في معظم دول الاتحاد الأوروبي؟",
      ["الدولار", "اليورو", "الجنيه الاسترليني", "الين"],
      "B", "اليورو عملة معتمدة في معظم دول الاتحاد الأوروبي.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 4: الاتحاد الأوروبي: حدود القوة": [
    shortAns(-3178, "ما من حدود قوة الاتحاد الأوروبي؟",
      "التفاوت الداخلي بين الدول الأعضاء، الأزمات الاقتصادية والديموغرافية، تحديات الهجرة.",
      "يواجه الاتحاد تحديات داخلية وخارجية متعددة.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 1: الولايات المتحدة الأمريكية: المجال والسكان": [
    mcq(-3179, "ما مساحة الولايات المتحدة تقريباً؟",
      ["1 مليون كم²", "9.8 مليون كم²", "0.5 مليون كم²", "20 مليون كم²"],
      "B", "تبلغ مساحتها حوالي 9.8 مليون كم².", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 2: الولايات المتحدة الأمريكية: دعائم القوة": [
    shortAns(-3180, "اذكر دعامة من دعائم قوة الولايات المتحدة.",
      "اقتصاد كبير ومتنوع، ابتكار تكنولوجي، قوة عسكرية، نفوذ ثقافي.",
      "تظل الولايات المتحدة قوة عالمية متعددة الأبعاد.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 3: الولايات المتحدة الأمريكية: المظاهر الاقتصادية للقوة": [
    mcq(-3181, "أي ولاية أمريكية مشهورة بالتكنولوجيا والشركات الناشئة؟",
      ["تكساس", "كاليفورنيا (وادي السيليكون)", "ألاسكا", "ميسيسيبي"],
      "B", "يقع وادي السيليكون في كاليفورنيا ويضم كبريات شركات التقنية.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 4: الولايات المتحدة الأمريكية: حدود القوة": [
    shortAns(-3182, "اذكر تحدياً تواجهه الولايات المتحدة.",
      "التفاوت الاجتماعي، الديون الفيدرالية، التحديات البيئية، التنافس الدولي.",
      "رغم القوة، تواجه الولايات المتحدة تحديات بنيوية.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 1: اليابان: المجال والسكان": [
    mcq(-3183, "ما الذي يميز جغرافية اليابان؟",
      ["أرخبيل بحري نشط زلزالياً", "صحراء حارة", "غابات استوائية فقط", "سهول مفتوحة شاسعة"],
      "A", "اليابان أرخبيل من جزر يقع على حلقة النار.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 2: اليابان: دعائم القوة": [
    shortAns(-3184, "اذكر دعامة من دعائم قوة اليابان.",
      "البحث والتطوير، الصناعات التكنولوجية، التعليم وانضباط العمل.",
      "تعتمد اليابان على ثقافة العمل والابتكار التكنولوجي.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 3: اليابان: المظاهر الاقتصادية للقوة": [
    mcq(-3185, "أي قطاع صناعي تتفوق فيه اليابان عالمياً؟",
      ["النسيج التقليدي فقط", "السيارات والإلكترونيات", "الزراعة العضوية حصراً", "التعدين الكلاسيكي"],
      "B", "اليابان رائدة في صناعة السيارات والإلكترونيات.", { rtl: true }),
  ],
  "3eme/__sciences__/Géographie/الدرس 4: اليابان: حدود القوة": [
    shortAns(-3186, "اذكر تحدياً يواجه اليابان.",
      "شيخوخة السكان، الكوارث الطبيعية، الديون العامة، التنافس الإقليمي.",
      "تواجه اليابان تحديات ديموغرافية وبيئية كبرى.", { rtl: true }),
  ],
};

// helper alias to avoid TypeScript narrowing oddities on long files
function shortAnswerSafe(id: number, q: string, a: string, e: string, opts: { rtl?: boolean } = {}) {
  return shortAns(id, q, a, e, { rtl: opts.rtl ?? false });
}

// ──────────────────────────────────────────────────────────────────────────────
// MATHÉMATIQUES — per track
// ──────────────────────────────────────────────────────────────────────────────
const MATH_MATHS: Record<string, FallbackQuestion[]> = {
  "3eme/mathematiques/Mathématiques/Chapitre 1: Produit scalaire dans le plan": [
    mcq(-3200, "Le produit scalaire de deux vecteurs orthogonaux est :",
      ["1", "leur somme", "0", "leur produit"], "C",
      "Deux vecteurs orthogonaux ont un produit scalaire nul."),
  ],
  "3eme/mathematiques/Mathématiques/Chapitre 2: Angles orientés": [
    mcq(-3201, "Combien de radians vaut 180° ?",
      ["π/2", "π", "2π", "π/4"], "B",
      "180° correspond à π radians."),
  ],
  "3eme/mathematiques/Mathématiques/Chapitre 3: Trigonométrie": [
    problem(-3202, "Calcule cos²(30°) + sin²(30°).",
      "1", "L'identité fondamentale donne cos²(α) + sin²(α) = 1."),
  ],
  "3eme/mathematiques/Mathématiques/Chapitre 4: Rotations": [
    mcq(-3203, "Une rotation conserve :",
      ["uniquement la longueur", "les distances et les angles", "ni l'un ni l'autre", "uniquement la direction"], "B",
      "Toute rotation est une isométrie : elle conserve distances et angles."),
  ],
  "3eme/mathematiques/Mathématiques/Chapitre 5: Nombres complexes": [
    problem(-3204, "On donne z = 3 + 4i. Calcule le module de z.",
      "5", "|z| = √(3² + 4²) = √25 = 5."),
  ],
  "3eme/mathematiques/Mathématiques/Chapitre 6: Dénombrement": [
    problem(-3205, "De combien de façons peut-on choisir 2 personnes parmi 5 ?",
      "10", "C(5,2) = 5!/(2!×3!) = 10."),
  ],
  "3eme/mathematiques/Mathématiques/Chapitre 7: Divisibilité dans Z": [
    mcq(-3206, "Quel est le PGCD de 12 et 18 ?",
      ["3", "6", "12", "18"], "B",
      "PGCD(12, 18) = 6."),
  ],
  "3eme/mathematiques/Mathématiques/Chapitre 8: Nombres premiers": [
    mcq(-3207, "Lequel des nombres suivants est premier ?",
      ["9", "15", "17", "21"], "C",
      "17 n'a pour diviseurs que 1 et lui-même."),
  ],
  "3eme/mathematiques/Mathématiques/Chapitre 9: Vecteurs de l'espace": [
    mcq(-3208, "Trois vecteurs de l'espace forment une base si et seulement s'ils sont :",
      ["coplanaires", "colinéaires", "non coplanaires", "orthogonaux deux à deux"], "C",
      "Une base de l'espace est formée par 3 vecteurs non coplanaires."),
  ],
  "3eme/mathematiques/Mathématiques/Chapitre 10: Produit scalaire et produit vectoriel dans l'espace": [
    mcq(-3209, "Le produit vectoriel de deux vecteurs colinéaires donne :",
      ["le vecteur somme", "le vecteur nul", "leur produit scalaire", "1"], "B",
      "Pour deux vecteurs colinéaires, le produit vectoriel est le vecteur nul."),
  ],
  "3eme/mathematiques/Mathématiques/Chapitre 11: Équations de droites et de plans. Équation d'une sphère": [
    mcq(-3210, "L'équation d'une sphère de centre Ω et de rayon R s'écrit :",
      ["(x − a)² + (y − b)² + (z − c)² = R²", "(x − a) + (y − b) + (z − c) = R", "(x − a)² + (y − b)² + (z − c)² = R", "(x − a)² + (y − b)² = R²"], "A",
      "C'est l'équation cartésienne d'une sphère."),
  ],
};

const MATH_SCI_EXP: Record<string, FallbackQuestion[]> = {
  "3eme/sciences_experimentales/Mathématiques/Chapitre 1: Généralités sur les fonctions": [
    mcq(-3220, "Le domaine de définition de f(x) = 1/x est :",
      ["IR", "IR*", "[0, +∞[", "]−1, 1["], "B",
      "f est définie sur IR* (tous les réels non nuls)."),
  ],
  "3eme/sciences_experimentales/Mathématiques/Chapitre 2: Continuité": [
    mcq(-3221, "Une fonction polynôme est continue sur :",
      ["IR", "IR*", "[0, 1] seulement", "Z"], "A",
      "Toute fonction polynôme est continue sur IR."),
  ],
  "3eme/sciences_experimentales/Mathématiques/Chapitre 3: Limites et continuité": [
    problem(-3222, "Calcule lim (x → 0) (sin x)/x.",
      "1", "C'est une limite remarquable classique : lim (sin x)/x = 1 quand x → 0."),
  ],
  "3eme/sciences_experimentales/Mathématiques/Chapitre 4: Limites et comportements asymptotiques": [
    mcq(-3223, "Si lim f(x) = +∞ quand x → a, on dit que la droite x = a est :",
      ["une asymptote horizontale", "une asymptote verticale", "une tangente", "une sécante"], "B",
      "Une limite infinie en a définit une asymptote verticale x = a."),
  ],
  "3eme/sciences_experimentales/Mathématiques/Chapitre 5: Nombre dérivé": [
    problem(-3224, "Soit f(x) = x². Calcule le nombre dérivé de f en x = 3.",
      "6", "f'(x) = 2x, donc f'(3) = 6."),
  ],
  "3eme/sciences_experimentales/Mathématiques/Chapitre 6: Fonction dérivée": [
    mcq(-3225, "La dérivée de f(x) = x³ est :",
      ["3x²", "x²", "x³/3", "3x"], "A",
      "(xⁿ)' = n·xⁿ⁻¹, donc (x³)' = 3x²."),
  ],
  "3eme/sciences_experimentales/Mathématiques/Chapitre 7: Exemples d'étude de fonctions": [
    shortAns(-3226, "Quelles sont les étapes principales pour étudier une fonction ?",
      "Domaine, limites, dérivée, tableau de variations, asymptotes, tracé.",
      "Ces étapes permettent une étude complète et rigoureuse de la fonction."),
  ],
  "3eme/sciences_experimentales/Mathématiques/Chapitre 8: Fonctions trigonométriques": [
    problem(-3227, "Calcule sin(π/2) + cos(0).",
      "2", "sin(π/2) = 1 et cos(0) = 1 ; somme = 2."),
  ],
  "3eme/sciences_experimentales/Mathématiques/Chapitre 9: Suites réelles": [
    mcq(-3228, "Une suite (uₙ) est arithmétique si :",
      ["uₙ₊₁ − uₙ est constant", "uₙ₊₁ / uₙ est constant", "uₙ est constant", "uₙ = n²"], "A",
      "La différence constante définit une suite arithmétique."),
  ],
  "3eme/sciences_experimentales/Mathématiques/Chapitre 10: Limites de suites réelles": [
    mcq(-3229, "La limite de (1/n) quand n → +∞ est :",
      ["1", "0", "+∞", "n'existe pas"], "B",
      "lim (1/n) = 0 quand n → +∞."),
  ],
};

const MATH_SCI_INFO: Record<string, FallbackQuestion[]> = {
  "3eme/sciences_informatique/Mathématiques/Chapitre 1: Généralités sur les fonctions numériques à variable réelle": [
    mcq(-3240, "Quel est le domaine de définition de f(x) = √x ?",
      ["IR", "IR*", "[0, +∞[", "]−∞, 0]"], "C",
      "La racine carrée n'est définie que pour x ≥ 0."),
  ],
  "3eme/sciences_informatique/Mathématiques/Chapitre 2: Les suites réelles": [
    mcq(-3241, "Une suite (uₙ) est géométrique si :",
      ["uₙ₊₁ − uₙ est constant", "uₙ₊₁ / uₙ est constant non nul", "uₙ est constant", "uₙ = n"], "B",
      "Le rapport constant définit une suite géométrique."),
  ],
  "3eme/sciences_informatique/Mathématiques/Chapitre 3: Limites, continuité, branches infinies": [
    problem(-3242, "Calcule lim (x → +∞) 1/x.",
      "0", "Quand x tend vers +∞, 1/x tend vers 0."),
  ],
  "3eme/sciences_informatique/Mathématiques/Chapitre 4: Dérivabilité d'une fonction": [
    mcq(-3243, "Si f est dérivable en a, alors f est :",
      ["non continue en a", "continue en a", "constante", "infinie en a"], "B",
      "La dérivabilité en a implique la continuité en a."),
  ],
  "3eme/sciences_informatique/Mathématiques/Chapitre 5: Fonctions dérivées - Applications": [
    mcq(-3244, "Si f'(x) > 0 sur un intervalle, alors f est :",
      ["décroissante", "croissante", "constante", "non définie"], "B",
      "Une dérivée positive correspond à une fonction croissante."),
  ],
  "3eme/sciences_informatique/Mathématiques/Chapitre 6: Étude de fonctions 1: Exemples de fonctions polynômes": [
    problem(-3245, "Soit f(x) = x² − 4. Résous f(x) = 0.",
      "x = ±2", "x² − 4 = (x − 2)(x + 2) = 0 donne x = 2 ou x = −2."),
  ],
  "3eme/sciences_informatique/Mathématiques/Chapitre 7: Étude de fonctions 2: Exemples de fonctions rationnelles, irrationnelles et trigonométriques": [
    mcq(-3246, "L'asymptote horizontale de f(x) = 1/x en +∞ est :",
      ["y = 1", "y = 0", "x = 0", "y = x"], "B",
      "Quand x → +∞, 1/x → 0 ; donc y = 0 est asymptote horizontale."),
  ],
};

const MATH_SCI_TECH: Record<string, FallbackQuestion[]> = {
  "3eme/sciences_techniques/Mathématiques/Chapitre 1: Généralités sur les fonctions": [
    mcq(-3260, "Une fonction paire vérifie :",
      ["f(−x) = −f(x)", "f(−x) = f(x)", "f(x) = 0", "f(x) = x"], "B",
      "Une fonction paire est symétrique par rapport à l'axe Oy."),
  ],
  "3eme/sciences_techniques/Mathématiques/Chapitre 2: Notion de limite": [
    problem(-3261, "Calcule lim (x → 2) (x² − 4)/(x − 2).",
      "4", "(x² − 4) = (x − 2)(x + 2), donc la limite vaut (2 + 2) = 4."),
  ],
  "3eme/sciences_techniques/Mathématiques/Chapitre 3: Continuité": [
    mcq(-3262, "Une fonction polynomiale est continue sur :",
      ["IR", "IR*", "[0, 1]", "Q"], "A",
      "Tout polynôme est continu sur IR."),
  ],
  "3eme/sciences_techniques/Mathématiques/Chapitre 4: Dérivabilité": [
    mcq(-3263, "La dérivée de f(x) = sin(x) est :",
      ["cos(x)", "−cos(x)", "sin(x)", "tan(x)"], "A",
      "(sin x)' = cos x."),
  ],
  "3eme/sciences_techniques/Mathématiques/Chapitre 5: Étude de fonctions": [
    shortAns(-3264, "Comment détermine-t-on les extremums d'une fonction dérivable ?",
      "On résout f'(x) = 0 et on analyse le signe de f' autour des solutions.",
      "Les extremums correspondent aux changements de signe de la dérivée."),
  ],
  "3eme/sciences_techniques/Mathématiques/Chapitre 6: Fonctions circulaires": [
    problem(-3265, "Calcule cos(0) + sin(π/2).",
      "2", "cos(0) = 1 et sin(π/2) = 1 ; somme = 2."),
  ],
  "3eme/sciences_techniques/Mathématiques/Chapitre 7: Suites réelles": [
    mcq(-3266, "La somme des n premiers termes d'une suite arithmétique de premier terme u₀ et raison r est :",
      ["n × u₀", "(u₀ + uₙ₋₁) × n / 2", "uₙ × n", "u₀ × r"], "B",
      "Formule classique de la somme d'une suite arithmétique."),
  ],
  "3eme/sciences_techniques/Mathématiques/Chapitre 8: Dénombrement": [
    problem(-3267, "Combien y a-t-il d'arrangements de 2 lettres choisies parmi {a, b, c} sans répétition ?",
      "6", "A(3,2) = 3! / (3−2)! = 6 arrangements ordonnés."),
  ],
  "3eme/sciences_techniques/Mathématiques/Chapitre 9: Probabilités": [
    problem(-3268, "On lance un dé équilibré. Quelle est la probabilité d'obtenir un 6 ?",
      "1/6", "Il y a 1 cas favorable sur 6 cas possibles équiprobables."),
  ],
  "3eme/sciences_techniques/Mathématiques/Chapitre 10: Statistiques": [
    problem(-3269, "Calcule la moyenne des notes : 12, 15, 18.",
      "15", "Moyenne = (12 + 15 + 18) / 3 = 45 / 3 = 15."),
  ],
};

const MATH_ECO: Record<string, FallbackQuestion[]> = {
  "3eme/economie_gestion/Mathématiques/Chapitre 1: Statistiques": [
    problem(-3280, "Calcule la moyenne des notes : 10, 12, 14, 16.",
      "13", "Somme = 52 ; moyenne = 52/4 = 13."),
  ],
  "3eme/economie_gestion/Mathématiques/Chapitre 2: Suites réelles": [
    mcq(-3281, "Une suite arithmétique de premier terme 5 et de raison 2 a pour 4ème terme :",
      ["9", "11", "13", "15"], "B",
      "u₄ = 5 + 2 × 3 = 11."),
  ],
  "3eme/economie_gestion/Mathématiques/Chapitre 3: Dénombrement": [
    problem(-3282, "Combien y a-t-il de combinaisons de 3 objets choisis parmi 4 ?",
      "4", "C(4,3) = 4!/(3!×1!) = 4."),
  ],
  "3eme/economie_gestion/Mathématiques/Chapitre 4: Probabilité": [
    problem(-3283, "On tire une carte au hasard d'un jeu de 52 cartes. Probabilité d'avoir un cœur ?",
      "1/4", "13 cœurs sur 52 cartes ; 13/52 = 1/4."),
  ],
  "3eme/economie_gestion/Mathématiques/Chapitre 5: Initiation aux graphes": [
    mcq(-3284, "Dans un graphe, un sommet est :",
      ["une arête", "un nœud représentant un objet", "une couleur", "un mot"], "B",
      "Un sommet (ou nœud) est un point du graphe."),
  ],
  "3eme/economie_gestion/Mathématiques/Chapitre 6: Système d'équations linéaires": [
    problem(-3285, "Résous : { x + y = 5 ; x − y = 1 }.",
      "x = 3 ; y = 2", "En additionnant : 2x = 6 ; x = 3, puis y = 5 − 3 = 2."),
  ],
  "3eme/economie_gestion/Mathématiques/Chapitre 7: Généralités sur les fonctions": [
    mcq(-3286, "Soit f(x) = 2x + 1. Quelle est l'image de 3 ?",
      ["5", "7", "8", "10"], "B",
      "f(3) = 2 × 3 + 1 = 7."),
  ],
  "3eme/economie_gestion/Mathématiques/Chapitre 8: Limite finie en un point et continuité": [
    mcq(-3287, "Une fonction f est continue en a si :",
      ["lim f(x) (x → a) = f(a)", "f(a) = 0", "lim f(x) (x → +∞) = a", "f est dérivable seulement"], "A",
      "La continuité en a se traduit par lim (x→a) f(x) = f(a)."),
  ],
  "3eme/economie_gestion/Mathématiques/Chapitre 9: Extension de la notion de limite et branches infinies": [
    mcq(-3288, "Une asymptote oblique de la forme y = ax + b apparaît lorsque :",
      ["f(x)/x tend vers a fini non nul, et f(x) − ax tend vers b", "lim f(x) = 0", "f est constante", "f n'est pas définie"], "A",
      "La condition usuelle pour une asymptote oblique."),
  ],
  "3eme/economie_gestion/Mathématiques/Chapitre 10: Dérivation": [
    mcq(-3289, "La dérivée de f(x) = 5 est :",
      ["5", "0", "1", "x"], "B",
      "La dérivée d'une constante est nulle."),
  ],
  "3eme/economie_gestion/Mathématiques/Chapitre 11: Exemples d'études de fonctions": [
    shortAns(-3290, "Quels sont les éléments clés du tableau de variations ?",
      "Le signe de la dérivée, les variations et les extremums éventuels.",
      "Le tableau résume le comportement de la fonction sur son domaine."),
  ],
  "3eme/economie_gestion/Mathématiques/Chapitre 12: Fonctions trigonométriques": [
    problem(-3291, "Calcule cos(0) − sin(0).",
      "1", "cos(0) = 1 et sin(0) = 0 ; donc la différence vaut 1."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// PHYSIQUE-CHIMIE — Math + Sciences exp tracks
// ──────────────────────────────────────────────────────────────────────────────
const PHYS_MATH: Record<string, FallbackQuestion[]> = {
  "3eme/mathematiques/Physique-Chimie/Chapitre 1: Interaction électrique": [
    mcq(-3300, "Deux charges de même signe :",
      ["s'attirent", "se repoussent", "n'interagissent pas", "se transforment"], "B",
      "Les charges de même signe se repoussent."),
  ],
  "3eme/mathematiques/Physique-Chimie/Chapitre 2: Interaction magnétique": [
    mcq(-3301, "Une boussole s'oriente vers :",
      ["le sud magnétique", "le nord magnétique terrestre", "le centre de la Terre", "le Soleil"], "B",
      "La boussole indique le nord magnétique."),
  ],
  "3eme/mathematiques/Physique-Chimie/Chapitre 3: Force de Laplace": [
    mcq(-3302, "La force de Laplace s'exerce sur :",
      ["un conducteur parcouru par un courant dans un champ magnétique", "tout corps au repos", "uniquement sur les isolants", "les charges immobiles"], "A",
      "La force de Laplace agit sur un conducteur traversé par un courant dans un champ B."),
  ],
  "3eme/mathematiques/Physique-Chimie/Chapitre 4-A: Interaction gravitationnelle": [
    mcq(-3303, "La force de gravitation entre deux masses :",
      ["est répulsive", "est attractive", "est nulle", "varie avec la couleur"], "B",
      "La gravitation est toujours attractive."),
  ],
  "3eme/mathematiques/Physique-Chimie/Chapitre 4-B: Interaction forte": [
    mcq(-3304, "L'interaction forte est responsable de :",
      ["la cohésion des noyaux atomiques", "la rotation des planètes", "les ondes radio", "l'éclair"], "A",
      "L'interaction forte assure la cohésion entre les nucléons dans le noyau."),
  ],
};

const PHYS_SCI_EXP: Record<string, FallbackQuestion[]> = {
  "3eme/sciences_experimentales/Physique-Chimie/Interaction électrique": [
    mcq(-3310, "Une charge électrique est :",
      ["toujours positive", "soit positive, soit négative", "uniquement négative", "neutre par définition"], "B",
      "Il existe deux types de charges : positives et négatives."),
  ],
  "3eme/sciences_experimentales/Physique-Chimie/Loi de Coulomb": [
    problem(-3311, "Selon la loi de Coulomb, comment varie la force entre deux charges en fonction de la distance r ?",
      "F est proportionnelle à 1/r²",
      "F = k·q₁·q₂/r² : la force varie comme l'inverse du carré de la distance."),
  ],
  "3eme/sciences_experimentales/Physique-Chimie/Champ électrique": [
    mcq(-3312, "Le champ électrique en un point est :",
      ["une force seulement", "une grandeur vectorielle ayant une intensité, une direction et un sens", "une masse", "une température"], "B",
      "Le champ électrique est un vecteur défini en chaque point."),
  ],
  "3eme/sciences_experimentales/Physique-Chimie/Force électrique": [
    mcq(-3313, "La force électrique subie par une charge q dans un champ E s'écrit :",
      ["F = q + E", "F = q × E", "F = q − E", "F = E/q"], "B",
      "F = q × E (relation vectorielle, q peut être négatif pour inverser le sens)."),
  ],
  "3eme/sciences_experimentales/Physique-Chimie/Interaction magnétique": [
    mcq(-3314, "Deux pôles magnétiques de même nature :",
      ["s'attirent", "se repoussent", "n'interagissent pas", "deviennent neutres"], "B",
      "Pôles de même nature (N-N ou S-S) se repoussent."),
  ],
  "3eme/sciences_experimentales/Physique-Chimie/Champ magnétique": [
    mcq(-3315, "L'unité du champ magnétique dans le SI est :",
      ["le volt", "le tesla", "le newton", "le mètre"], "B",
      "Le champ magnétique se mesure en teslas (T)."),
  ],
  "3eme/sciences_experimentales/Physique-Chimie/Force de Laplace": [
    mcq(-3316, "La force de Laplace dépend :",
      ["uniquement de la longueur du conducteur", "de I, L et B et de l'orientation", "uniquement du temps", "uniquement de la couleur"], "B",
      "F = B·I·L·sin(α), où α est l'angle entre le courant et B."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SVT — Lettres, Math, Sciences exp
// ──────────────────────────────────────────────────────────────────────────────
const SVT_LETTRES: Record<string, FallbackQuestion[]> = {
  "3eme/lettres/SVT/La structure de la cellule eucaryote": [
    mcq(-3330, "Quel organite contient l'information génétique ?",
      ["la mitochondrie", "le noyau", "la membrane", "le cytoplasme seul"], "B",
      "Le noyau contient l'ADN, support de l'information génétique."),
  ],
  "3eme/lettres/SVT/L'ultrastructure de la cellule eucaryote": [
    mcq(-3331, "Quel organite est le siège principal de la respiration cellulaire ?",
      ["le noyau", "la mitochondrie", "la membrane plasmique", "le chloroplaste"], "B",
      "La mitochondrie est le siège principal de la respiration cellulaire."),
  ],
  "3eme/lettres/SVT/Observation de cellules en division": [
    shortAns(-3332, "Que peut-on observer dans une cellule en mitose ?",
      "Les chromosomes condensés, leur séparation et la formation de deux cellules filles.",
      "La mitose se déroule en plusieurs étapes visibles au microscope."),
  ],
  "3eme/lettres/SVT/Mitose et programme génétique": [
    mcq(-3333, "La mitose donne deux cellules filles :",
      ["très différentes de la cellule mère", "génétiquement identiques à la cellule mère", "sans noyau", "avec moitié moins d'ADN"], "B",
      "La mitose est une reproduction conforme du matériel génétique."),
  ],
};

const SVT_MATH: Record<string, FallbackQuestion[]> = {
  "3eme/mathematiques/SVT/La malnutrition": [
    mcq(-3340, "La malnutrition peut être due à :",
      ["une alimentation insuffisante ou déséquilibrée", "une respiration trop rapide seulement", "une absence totale d'eau dans l'air", "une activité physique modérée"], "A",
      "La malnutrition résulte souvent d'un manque, d'un excès ou d'un déséquilibre alimentaire."),
  ],
  "3eme/mathematiques/SVT/Les besoins nutritionnels de l'Homme": [
    shortAns(-3341, "Cite deux groupes d'aliments indispensables.",
      "Glucides, lipides, protéines, vitamines et sels minéraux.",
      "Une alimentation équilibrée couvre tous ces groupes."),
  ],
  "3eme/mathematiques/SVT/Des aliments aux nutriments: la digestion": [
    mcq(-3342, "La digestion transforme les aliments en :",
      ["énergie pure seulement", "nutriments simples utilisables par l'organisme", "déchets uniquement", "gaz uniquement"], "B",
      "La digestion produit des nutriments absorbables par l'organisme."),
  ],
  "3eme/mathematiques/SVT/Dégradation des nutriments: la respiration": [
    mcq(-3343, "La respiration cellulaire produit principalement :",
      ["uniquement de la chaleur", "de l'énergie (ATP), du CO₂ et de l'eau", "uniquement du dioxygène", "des protéines"], "B",
      "La respiration cellulaire dégrade les nutriments pour produire de l'ATP, du CO₂ et de l'H₂O."),
  ],
  "3eme/mathematiques/SVT/L'immunité non spécifique": [
    shortAns(-3344, "Cite un mécanisme de l'immunité non spécifique.",
      "La phagocytose, la réaction inflammatoire, les barrières naturelles (peau, mucus).",
      "L'immunité innée réagit rapidement et de manière générale."),
  ],
  "3eme/mathematiques/SVT/L'immunité spécifique": [
    mcq(-3345, "Quelle cellule produit les anticorps ?",
      ["les neurones", "les lymphocytes B (plasmocytes)", "les hématies", "les hépatocytes"], "B",
      "Les plasmocytes (issus des lymphocytes B) sécrètent les anticorps."),
  ],
  "3eme/mathematiques/SVT/La reproduction humaine": [
    shortAns(-3346, "Quelles cellules sont impliquées dans la reproduction sexuée humaine ?",
      "Les spermatozoïdes et les ovules (gamètes).",
      "La fécondation unit un spermatozoïde et un ovule pour former un zygote."),
  ],
  "3eme/mathematiques/SVT/Le cycle menstruel": [
    mcq(-3347, "La durée moyenne d'un cycle menstruel est d'environ :",
      ["7 jours", "28 jours", "90 jours", "365 jours"], "B",
      "Le cycle menstruel dure en moyenne 28 jours."),
  ],
};

const SVT_SCI_EXP: Record<string, FallbackQuestion[]> = {
  "3eme/sciences_experimentales/SVT/Chapitre 1: La malnutrition": [
    mcq(-3360, "La malnutrition peut être due à :",
      ["Une alimentation insuffisante ou déséquilibrée", "Une respiration trop rapide seulement", "Une absence totale d'eau dans l'air", "Une activité physique modérée"], "A",
      "La malnutrition résulte souvent d'un manque, d'un excès ou d'un déséquilibre dans les apports alimentaires."),
  ],
  "3eme/sciences_experimentales/SVT/Chapitre 2: Les besoins nutritionnels de l'Homme": [
    shortAns(-3361, "De quoi dépendent les besoins nutritionnels d'un individu ?",
      "De l'âge, du sexe, de l'activité physique et de l'état physiologique.",
      "Les besoins varient selon le profil de la personne."),
  ],
  "3eme/sciences_experimentales/SVT/Chapitre 1: Des aliments aux nutriments: la digestion": [
    mcq(-3362, "Quels organes sont impliqués dans la digestion mécanique ?",
      ["les poumons et le cerveau", "la bouche, l'estomac et l'intestin", "le cœur uniquement", "les reins"], "B",
      "La digestion mécanique se fait dans la bouche, l'estomac et l'intestin."),
  ],
  "3eme/sciences_experimentales/SVT/Chapitre 2: Dégradation des nutriments: la respiration": [
    mcq(-3363, "La respiration cellulaire utilise :",
      ["du dioxyde de carbone uniquement", "du dioxygène et des nutriments", "de l'azote uniquement", "de l'eau uniquement"], "B",
      "La respiration cellulaire dégrade les nutriments en présence de O₂."),
  ],
  "3eme/sciences_experimentales/SVT/Chapitre 1: Les risques liés à la consommation des aliments contaminés": [
    shortAns(-3364, "Cite un risque sanitaire lié à la consommation d'aliments contaminés.",
      "Intoxication alimentaire (bactéries, parasites, toxines).",
      "Une bonne hygiène prévient les contaminations alimentaires."),
  ],
  "3eme/sciences_experimentales/SVT/Chapitre 2: Des microorganismes au service de la production des aliments": [
    mcq(-3365, "Quel microorganisme est utilisé dans la fabrication du yaourt ?",
      ["des virus", "des bactéries lactiques", "des champignons toxiques", "des moisissures industrielles"], "B",
      "Les bactéries lactiques transforment le lait en yaourt."),
  ],
  "3eme/sciences_experimentales/SVT/Chapitre 1: Le milieu intérieur et ses caractéristiques": [
    mcq(-3366, "Le milieu intérieur de l'organisme désigne principalement :",
      ["l'air extérieur", "le sang, la lymphe et les liquides interstitiels", "les os uniquement", "la peau"], "B",
      "Le milieu intérieur baigne les cellules de l'organisme."),
  ],
  "3eme/sciences_experimentales/SVT/Chapitre 2: L'excrétion urinaire": [
    shortAns(-3367, "Quel est le rôle du rein ?",
      "Filtrer le sang pour éliminer les déchets et réguler l'eau et les sels.",
      "Le rein produit l'urine et maintient l'homéostasie."),
  ],
  "3eme/sciences_experimentales/SVT/Chapitre 3: La régulation de la glycémie": [
    mcq(-3368, "Quelle hormone fait baisser la glycémie ?",
      ["le glucagon", "l'insuline", "l'adrénaline", "la testostérone"], "B",
      "L'insuline, sécrétée par le pancréas, abaisse la glycémie."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// INFORMATIQUE — Lettres + non-Lettres (Math/Sciences/Tech)
// ──────────────────────────────────────────────────────────────────────────────
const INFO_LETTRES: Record<string, FallbackQuestion[]> = {
  "3eme/lettres/Informatique/Chapitre I: Culture informatique": [
    mcq(-3400, "Qu'est-ce que l'informatique ?",
      ["la science du climat", "la science du traitement automatique de l'information", "la science des plantes", "l'étude des roches"], "B",
      "L'informatique traite automatiquement l'information."),
  ],
  "3eme/lettres/Informatique/Chapitre II: Architecture d'un ordinateur": [
    mcq(-3401, "Le processeur d'un ordinateur :",
      ["exécute les instructions des programmes", "affiche les images uniquement", "stocke les fichiers à long terme", "imprime"], "A",
      "Le processeur (CPU) exécute les instructions des programmes."),
  ],
  "3eme/lettres/Informatique/Chapitre III: Système d'exploitation et réseaux": [
    mcq(-3402, "Quel est un système d'exploitation courant ?",
      ["HTML", "Windows", "Excel", "Photoshop"], "B",
      "Windows est un système d'exploitation."),
  ],
  "3eme/lettres/Informatique/Chapitre IV: Internet": [
    mcq(-3403, "Qu'est-ce qu'Internet ?",
      ["un seul ordinateur", "un réseau mondial reliant des millions d'ordinateurs", "un câble électrique", "une imprimante"], "B",
      "Internet est un réseau mondial décentralisé."),
  ],
  "3eme/lettres/Informatique/Chapitre V: Traitement de texte": [
    mcq(-3404, "Quel logiciel est un traitement de texte ?",
      ["Excel", "Microsoft Word", "Paint", "VLC"], "B",
      "Word est un traitement de texte."),
  ],
  "3eme/lettres/Informatique/Chapitre VI: Tableur": [
    mcq(-3405, "Quel logiciel est un tableur ?",
      ["Word", "Excel", "Paint", "Chrome"], "B",
      "Excel est un tableur (feuille de calcul)."),
  ],
  "3eme/lettres/Informatique/Chapitre VII: Éléments de présentation": [
    mcq(-3406, "Quel logiciel sert à créer des diaporamas ?",
      ["Audacity", "PowerPoint", "Notepad", "Calculator"], "B",
      "PowerPoint crée des présentations / diaporamas."),
  ],
  "3eme/lettres/Informatique/Chapitre VIII: Étude et réalisation d'un projet": [
    shortAns(-3407, "Quelle est l'étape clé au début d'un projet informatique ?",
      "Analyser le besoin, définir les objectifs et planifier les ressources.",
      "Une bonne analyse initiale conditionne la réussite du projet."),
  ],
};

const INFO_NON_LETTRES: Record<string, FallbackQuestion[]> = {
  "3eme/__non_lettres_non_eco__/Informatique/Chapitre 1: Introduction à l'informatique": [
    mcq(-3420, "L'informatique étudie principalement :",
      ["les climats", "le traitement automatique de l'information", "les plantes", "les roches"], "B",
      "L'informatique traite l'information par des machines."),
  ],
  "3eme/__non_lettres_non_eco__/Informatique/Chapitre 2: Architecture d'un ordinateur": [
    mcq(-3421, "Quel composant exécute les instructions ?",
      ["le disque dur", "le processeur (CPU)", "la RAM", "l'écran"], "B",
      "Le processeur exécute les instructions des programmes."),
  ],
  "3eme/__non_lettres_non_eco__/Informatique/Chapitre 3: Les structures de données": [
    mcq(-3422, "Une variable se distingue d'une constante par :",
      ["son nom", "sa valeur modifiable pendant l'exécution", "sa couleur", "son indice de page"], "B",
      "Une variable peut changer de valeur ; une constante non."),
  ],
  "3eme/__non_lettres_non_eco__/Informatique/Chapitre 4: Les actions élémentaires simples": [
    mcq(-3423, "L'instruction LIRE permet de :",
      ["afficher une valeur", "lire une valeur saisie", "exécuter une boucle", "déclarer une fonction"], "B",
      "LIRE saisit une valeur depuis l'entrée standard."),
  ],
  "3eme/__non_lettres_non_eco__/Informatique/Chapitre 5: Les structures de contrôle conditionnelles": [
    mcq(-3424, "La structure SI ... ALORS ... permet :",
      ["de répéter des actions", "d'exécuter selon une condition", "de déclarer une variable", "de fermer un fichier"], "B",
      "La structure conditionnelle exécute si la condition est vraie."),
  ],
  "3eme/__non_lettres_non_eco__/Informatique/Chapitre 6: Les structures de contrôle itératives": [
    mcq(-3425, "Une boucle POUR sert à :",
      ["lire un fichier unique", "répéter des actions un nombre connu de fois", "fermer un programme", "déclarer une procédure"], "B",
      "POUR est une boucle à compteur."),
  ],
  "3eme/__non_lettres_non_eco__/Informatique/Chapitre 7: Démarche de résolution de problèmes": [
    shortAns(-3426, "Cite une étape de la démarche de résolution d'un problème en informatique.",
      "Analyse du problème, conception de l'algorithme, codage, test et validation.",
      "Une démarche structurée garantit une solution fiable."),
  ],
  "3eme/__non_lettres_non_eco__/Informatique/Chapitre 8: Les réseaux informatiques": [
    mcq(-3427, "Un réseau local (LAN) couvre :",
      ["un seul pays", "une zone géographique limitée (école, entreprise)", "uniquement Internet", "le monde entier"], "B",
      "Un LAN couvre une petite zone géographique."),
  ],
  "3eme/__non_lettres_non_eco__/Informatique/Chapitre 9: Les systèmes d'exploitation": [
    mcq(-3428, "Le système d'exploitation :",
      ["décore l'écran", "gère le matériel et les programmes", "imprime uniquement", "fait des calculs scientifiques"], "B",
      "Il est l'interface entre le matériel et les logiciels."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// PHILOSOPHIE — Lettres vs Autres (RTL)
// ──────────────────────────────────────────────────────────────────────────────
const PHILO_LETTRES: Record<string, FallbackQuestion[]> = {
  "3eme/lettres/Philosophie/I- اليومي": [
    mcq(-3450, "ما المقصود باليومي في مدخل درس الفلسفة؟",
      ["ما يعيشه الإنسان عادة دون تفكير نقدي", "النظريات العلمية الدقيقة فقط", "القوانين الرياضية فقط", "الخيال الأسطوري وحده"],
      "A", "اليومي هو مجال المعاش المألوف الذي تنطلق منه الفلسفة لتحويله إلى موضوع تفكير وتساؤل.", { rtl: true }),
  ],
  "3eme/lettres/Philosophie/II- مقتضيات التفكير": [
    shortAns(-3451, "ما أبرز مقتضيات التفكير الفلسفي؟",
      "الدقة، النقد، السؤال، الحرية، الانفتاح على آراء الآخرين.",
      "التفكير الفلسفي يقوم على عدة شروط منهجية وأخلاقية.", { rtl: true }),
  ],
  "3eme/lettres/Philosophie/III- إيتيقا التفكير": [
    mcq(-3452, "ما المقصود بـ«إيتيقا التفكير»؟",
      ["قواعد القياس فقط", "أخلاقيات التفكير وضوابطه", "علم النحو", "الإحصاء"],
      "B", "إيتيقا التفكير هي الجانب الأخلاقي للممارسة الفكرية.", { rtl: true }),
  ],
  "3eme/lettres/Philosophie/IV- تجربة الالتزام": [
    shortAns(-3453, "ما المقصود بتجربة الالتزام في الفلسفة؟",
      "تورط الفيلسوف في قضايا عصره والدفاع عن قيم الإنسانية.",
      "تربط تجربة الالتزام الفكر بالواقع.", { rtl: true }),
  ],
  "3eme/lettres/Philosophie/V- دراسة مسترسلة لأثر فلسفي": [
    shortAns(-3454, "ما الفائدة من دراسة أثر فلسفي بصفة مسترسلة؟",
      "فهم بنية النص الفلسفي ومتابعة تطور حجج الفيلسوف.",
      "تكشف الدراسة المسترسلة تماسك الأثر الفلسفي.", { rtl: true }),
  ],
};

const PHILO_AUTRES: Record<string, FallbackQuestion[]> = {
  "3eme/__autres__/Philosophie/I- اليومي": [
    mcq(-3460, "تنطلق الفلسفة من اليومي لأنها:",
      ["تنفصل عن الواقع", "تحوّل المألوف إلى سؤال نقدي", "ترفض الحياة", "تعتمد المعطيات العلمية وحدها"],
      "B", "ينقل التفكير الفلسفي اليومي من الإلف إلى الإشكال.", { rtl: true }),
  ],
  "3eme/__autres__/Philosophie/II- مقتضيات التفكير": [
    shortAns(-3461, "اذكر شرطاً من شروط التفكير الفلسفي السليم.",
      "النقد، الدقة، الاحترام، الانفتاح على الرأي المخالف.",
      "تتعدد شروط التفكير لكنها تتمحور حول العقلانية والأخلاق.", { rtl: true }),
  ],
  "3eme/__autres__/Philosophie/III- تجربة الالتزام": [
    mcq(-3462, "ما يميز تجربة الالتزام في الفكر الفلسفي؟",
      ["الانعزال عن الناس", "ربط الفكر بالقضايا الإنسانية", "إنكار قيم العصر", "تجاهل الواقع"],
      "B", "الفيلسوف الملتزم يضع فكره في خدمة قضايا الإنسان.", { rtl: true }),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SCIENCES DE L'INFORMATIQUE — Algorithmique, Systèmes/Réseaux, TIC
// ──────────────────────────────────────────────────────────────────────────────
const ALGO_SCI_INFO: Record<string, FallbackQuestion[]> = {
  "3eme/sciences_informatique/Algorithmique et Programmation/Chapitre 1: Les structures de données et les structures simples": [
    mcq(-3500, "Une variable de type 'entier' contient :",
      ["des nombres réels", "des nombres sans partie décimale", "des chaînes de caractères", "des booléens uniquement"], "B",
      "Le type entier représente des nombres sans virgule."),
  ],
  "3eme/sciences_informatique/Algorithmique et Programmation/Chapitre 2: Les structures algorithmiques de contrôle": [
    mcq(-3501, "La structure SI...ALORS...SINON est dite :",
      ["itérative", "conditionnelle", "récursive", "modulaire"], "B",
      "C'est une structure de contrôle conditionnelle."),
  ],
  "3eme/sciences_informatique/Algorithmique et Programmation/Chapitre 3: Les sous programmes": [
    mcq(-3502, "Une fonction se distingue d'une procédure par :",
      ["aucun élément", "le fait qu'elle retourne une valeur", "son nom", "sa longueur"], "B",
      "Une fonction renvoie une valeur ; une procédure n'en renvoie pas."),
  ],
  "3eme/sciences_informatique/Algorithmique et Programmation/Chapitre 4: Les algorithmes de tri et de recherche": [
    mcq(-3503, "À quoi sert un algorithme de tri ?",
      ["à organiser des données selon un ordre donné", "à supprimer tous les fichiers", "à afficher une image uniquement", "à arrêter l'ordinateur"], "A",
      "Un algorithme de tri range des données selon un ordre."),
  ],
  "3eme/sciences_informatique/Algorithmique et Programmation/Chapitre 5: Les algorithmes récurrents": [
    shortAns(-3504, "Qu'est-ce qu'un algorithme récurrent ?",
      "Un algorithme dans lequel un terme se calcule à partir des termes précédents.",
      "La récurrence est très utile pour les suites."),
  ],
  "3eme/sciences_informatique/Algorithmique et Programmation/Chapitre 6: Les algorithmes arithmétiques": [
    problem(-3505, "Quel est le PGCD de 24 et 36 ?",
      "12", "L'algorithme d'Euclide donne PGCD(24, 36) = 12."),
  ],
  "3eme/sciences_informatique/Algorithmique et Programmation/Chapitre 7: Les algorithmes d'approximation": [
    shortAns(-3506, "Cite une méthode d'approximation de racine d'équation.",
      "La méthode de dichotomie ou la méthode de Newton.",
      "Ces méthodes approchent une solution à une précision donnée."),
  ],
  "3eme/sciences_informatique/Algorithmique et Programmation/Annexe 1: Codes ASCII": [
    mcq(-3507, "Le code ASCII associe à chaque caractère :",
      ["une image", "un code numérique", "une couleur", "un son"], "B",
      "ASCII assigne un code numérique à chaque caractère."),
  ],
};

const SYS_RES_SCI_INFO: Record<string, FallbackQuestion[]> = {
  "3eme/sciences_informatique/Systèmes d'exploitation et Réseaux/Chapitre 1: Introduction aux systèmes d'exploitation": [
    mcq(-3520, "Le système d'exploitation est :",
      ["un type de virus", "le programme qui gère matériel et logiciels", "un câble", "une imprimante"], "B",
      "Le SE est l'interface entre le matériel et les programmes utilisateurs."),
  ],
  "3eme/sciences_informatique/Systèmes d'exploitation et Réseaux/Chapitre 2: Les fonctions de base d'un système d'exploitation": [
    mcq(-3521, "Quelle fonction du SE gère l'accès aux fichiers ?",
      ["la gestion mémoire", "la gestion des fichiers", "le réseau", "la cryptographie uniquement"], "B",
      "Le SE gère la création, lecture, écriture et suppression des fichiers."),
  ],
  "3eme/sciences_informatique/Systèmes d'exploitation et Réseaux/Chapitre 3: Administration d'un système d'exploitation": [
    shortAns(-3522, "Cite une tâche typique d'administration système.",
      "Créer des comptes utilisateurs, gérer les permissions, sauvegarder les données.",
      "L'administration assure le bon fonctionnement et la sécurité du système."),
  ],
  "3eme/sciences_informatique/Systèmes d'exploitation et Réseaux/Chapitre 4: Les types de réseaux": [
    mcq(-3523, "Un WAN est un réseau :",
      ["local à une école", "étendu sur de grandes distances (international)", "uniquement sans fil", "uniquement filaire"], "B",
      "WAN = Wide Area Network."),
  ],
  "3eme/sciences_informatique/Systèmes d'exploitation et Réseaux/Chapitre 5: Modèles OSI et TCP/IP": [
    mcq(-3524, "Combien de couches comporte le modèle OSI ?",
      ["4", "5", "7", "10"], "C",
      "Le modèle OSI a 7 couches."),
  ],
  "3eme/sciences_informatique/Systèmes d'exploitation et Réseaux/Chapitre 6: Équipements et techniques d'interconnexion": [
    mcq(-3525, "Quel équipement relie deux réseaux différents ?",
      ["un hub", "un routeur", "une imprimante", "un microphone"], "B",
      "Le routeur interconnecte des réseaux et oriente le trafic."),
  ],
  "3eme/sciences_informatique/Systèmes d'exploitation et Réseaux/Chapitre 7: Configuration et sécurité": [
    shortAns(-3526, "Cite une mesure de sécurité réseau courante.",
      "Pare-feu (firewall), antivirus, chiffrement, mots de passe forts.",
      "La sécurité combine plusieurs couches de protection."),
  ],
};

const TIC_SCI_INFO: Record<string, FallbackQuestion[]> = {
  "3eme/sciences_informatique/TIC/Définitions": [
    mcq(-3540, "TIC signifie :",
      ["Technologies de l'Information et de la Communication", "Test d'Informatique Classique", "Travail d'Initiation à la Conception", "Tableau Informatique Compact"], "A",
      "TIC = Technologies de l'Information et de la Communication."),
  ],
  "3eme/sciences_informatique/TIC/Ressources de l'information": [
    shortAns(-3541, "Cite une ressource d'information fiable.",
      "Encyclopédies en ligne reconnues, sites institutionnels, journaux établis.",
      "La fiabilité des sources est essentielle dans les TIC."),
  ],
  "3eme/sciences_informatique/TIC/Techniques de recherche": [
    mcq(-3542, "Une recherche par mot-clé donne de meilleurs résultats si :",
      ["on tape une seule lettre", "on utilise des mots-clés précis et combinés", "on cherche sans aucun mot", "on tape des phrases très longues sans sens"], "B",
      "Des mots-clés précis affinent les résultats."),
  ],
  "3eme/sciences_informatique/TIC/Communication": [
    mcq(-3543, "Quel outil permet la communication asynchrone par écrit ?",
      ["un appel téléphonique", "le courrier électronique", "un chronomètre", "un capteur de mouvement"], "B",
      "Le courrier électronique est un outil asynchrone."),
  ],
  "3eme/sciences_informatique/TIC/Éthique et déontologie des TIC": [
    shortAns(-3544, "Cite une règle éthique d'usage des TIC.",
      "Respecter la vie privée, ne pas plagier, citer les sources, lutter contre la cyberviolence.",
      "L'éthique numérique est essentielle à un usage responsable."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// GÉNIE ÉLECTRIQUE — Sciences techniques (15 chapters)
// ──────────────────────────────────────────────────────────────────────────────
const GENIE_ELEC: Record<string, FallbackQuestion[]> = {
  "3eme/sciences_techniques/Génie Électrique/Thème 1_1: Courant électrique monophasé": [
    mcq(-3600, "La tension du réseau électrique monophasé domestique en Tunisie est d'environ :",
      ["12 V", "220 V", "1000 V", "5 V"], "B",
      "Le réseau domestique délivre 220 V efficaces à 50 Hz."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Thème 1_2: Sécurité électrique": [
    mcq(-3601, "Quel dispositif protège contre les fuites de courant à la terre ?",
      ["un fusible classique", "un disjoncteur différentiel", "un voltmètre", "un ampèremètre"], "B",
      "Le différentiel détecte les fuites et déclenche la coupure."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Thème 1_3: Énergies renouvelables": [
    mcq(-3602, "Laquelle est une énergie renouvelable ?",
      ["le pétrole", "l'énergie solaire", "le charbon", "le gaz naturel"], "B",
      "Le solaire, l'éolien, l'hydraulique sont renouvelables."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Conception et réalisation de carte de commande": [
    shortAns(-3603, "Quel est le rôle d'une carte de commande ?",
      "Recevoir les signaux des capteurs et envoyer les commandes aux actionneurs.",
      "Elle pilote un système automatique."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Thème 3_1: Fonctions combinatoires": [
    mcq(-3604, "Une fonction combinatoire dépend :",
      ["de l'état précédent du système", "uniquement des valeurs actuelles des entrées", "de la température extérieure seulement", "du temps écoulé depuis le démarrage"], "B",
      "En logique combinatoire, les sorties dépendent uniquement des entrées présentes."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Thème 3_2: Résolution de problèmes de logique combinatoire": [
    shortAns(-3605, "Cite une méthode de simplification d'expression booléenne.",
      "La méthode du tableau de Karnaugh ou les théorèmes de Boole.",
      "Ces méthodes minimisent le nombre de portes logiques."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Thème 4_1: Systèmes séquentiels": [
    mcq(-3606, "Un système séquentiel se distingue d'un système combinatoire par :",
      ["l'absence de mémoire", "la prise en compte de l'état précédent", "l'absence d'entrées", "la couleur"], "B",
      "Le séquentiel mémorise un état pour produire la sortie."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Thème 4_2: Applications à base de bascules": [
    mcq(-3607, "Une bascule D mémorise :",
      ["la dernière sortie", "la valeur de D au front d'horloge", "une couleur", "la tension d'alimentation"], "B",
      "La bascule D mémorise D au front d'horloge."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Thème 5_1: Capteurs": [
    mcq(-3608, "Un capteur de température convertit :",
      ["une lumière en son", "une grandeur thermique en grandeur électrique", "une pression en lumière", "une vitesse en image"], "B",
      "Le capteur produit un signal électrique proportionnel à la température."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Thème 5_2: Automates programmables industriels": [
    shortAns(-3609, "À quoi sert un automate programmable industriel (API) ?",
      "À automatiser des systèmes industriels (machines, lignes de production) selon un programme.",
      "Les API sont programmables et fiables en environnement industriel."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Thème 6_1: Microcontrôleurs": [
    mcq(-3610, "Un microcontrôleur intègre :",
      ["seulement un processeur", "processeur, mémoire et périphériques sur une seule puce", "une grande imprimante", "une batterie uniquement"], "B",
      "Le microcontrôleur regroupe CPU, mémoire et E/S dans un seul circuit."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Thème 6_2: MikroC pour PIC": [
    mcq(-3611, "MikroC est :",
      ["un langage HTML", "un compilateur C pour microcontrôleurs PIC", "un type de capteur", "un module mémoire"], "B",
      "MikroC permet la programmation des PIC en C."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Technologies de communication des objets connectés": [
    shortAns(-3612, "Cite une technologie de communication pour objets connectés.",
      "Wi-Fi, Bluetooth, ZigBee, LoRa, 4G/5G.",
      "L'IoT utilise diverses technologies sans fil."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Moteurs électriques": [
    mcq(-3613, "Un moteur électrique convertit :",
      ["l'énergie mécanique en chaleur", "l'énergie électrique en énergie mécanique", "la lumière en son", "l'eau en huile"], "B",
      "Le moteur électrique transforme l'électricité en mouvement."),
  ],
  "3eme/sciences_techniques/Génie Électrique/Moteur pas à pas à aimant permanent": [
    mcq(-3614, "Le moteur pas à pas avance par :",
      ["mouvements continus aléatoires", "incréments angulaires précis commandés", "vibration thermique", "compression d'air"], "B",
      "Chaque impulsion produit un pas angulaire précis."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// GÉNIE MÉCANIQUE — Sciences techniques (sample of 25 from 59)
// ──────────────────────────────────────────────────────────────────────────────
const GENIE_MECA: Record<string, FallbackQuestion[]> = {
  "3eme/sciences_techniques/Génie Mécanique/Analyse fonctionnelle externe et interne d'un produit": [
    mcq(-3620, "L'analyse fonctionnelle externe identifie :",
      ["les pièces internes", "les fonctions de service rendues à l'utilisateur", "le prix du produit uniquement", "la couleur"], "B",
      "L'AF externe se concentre sur les besoins et fonctions perçus par l'utilisateur."),
  ],
  "3eme/sciences_techniques/Génie Mécanique/Imprimante 3D": [
    shortAns(-3621, "Cite un procédé d'impression 3D courant.",
      "Le dépôt de filament fondu (FDM) ou la stéréolithographie (SLA).",
      "L'impression 3D fabrique des pièces couche par couche."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// ÉCONOMIE — Économie et Gestion (~20 questions)
// ──────────────────────────────────────────────────────────────────────────────
const ECONOMIE: Record<string, FallbackQuestion[]> = {
  "3eme/economie_gestion/Économie/Chapitre 1: La production et sa mesure": [
    mcq(-3700, "La production désigne principalement :",
      ["La création de biens et services", "La disparition de la monnaie", "L'absence de travail", "La consommation uniquement"], "A",
      "La production correspond à la création de biens et de services destinés à satisfaire des besoins."),
  ],
  "3eme/economie_gestion/Économie/Chapitre 2: Le facteur travail": [
    shortAns(-3701, "Pourquoi le travail est-il considéré comme un facteur de production ?",
      "Parce qu'il apporte la force humaine, les compétences et les connaissances nécessaires à la production.",
      "Le travail crée de la valeur et combine les autres facteurs."),
  ],
  "3eme/economie_gestion/Économie/Chapitre 3: Le facteur capital": [
    mcq(-3702, "Le capital fixe regroupe :",
      ["les matières premières consommées", "les biens durables utilisés pour produire", "les salaires versés", "les impôts payés"], "B",
      "Le capital fixe (machines, bâtiments) sert plusieurs cycles de production."),
  ],
  "3eme/economie_gestion/Économie/Chapitre 4: La répartition primaire": [
    mcq(-3703, "La répartition primaire des revenus se fait :",
      ["entre les producteurs (salariés, propriétaires)", "uniquement par l'État", "uniquement entre familles", "par tirage au sort"], "A",
      "La répartition primaire rémunère les facteurs de production."),
  ],
  "3eme/economie_gestion/Économie/Chapitre 5: La redistribution": [
    shortAns(-3704, "Quel est l'objectif principal de la redistribution ?",
      "Réduire les inégalités et financer les services collectifs.",
      "La redistribution mobilise impôts et transferts sociaux."),
  ],
  "3eme/economie_gestion/Économie/Chapitre 6: La monnaie": [
    mcq(-3705, "Lequel n'est PAS une fonction de la monnaie ?",
      ["intermédiaire des échanges", "réserve de valeur", "unité de compte", "production d'aliments"], "D",
      "La monnaie sert aux échanges, à mesurer et conserver la valeur."),
  ],
  "3eme/economie_gestion/Économie/Chapitre 7: Le financement de l'activité économique": [
    shortAns(-3706, "Cite une source de financement d'une entreprise.",
      "Capitaux propres, emprunts bancaires, marché financier.",
      "Une entreprise combine plusieurs sources pour se financer."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// GESTION — Économie et Gestion (~18 questions)
// ──────────────────────────────────────────────────────────────────────────────
const GESTION: Record<string, FallbackQuestion[]> = {
  "3eme/economie_gestion/Gestion/Chapitre 1: L'entreprise": [
    mcq(-3720, "L'entreprise est :",
      ["une association sans but", "une organisation qui produit des biens ou services", "une administration sans personnel", "un syndicat"], "B",
      "L'entreprise combine des ressources pour produire."),
  ],
  "3eme/economie_gestion/Gestion/Chapitre 2: Le cycle d'exploitation": [
    shortAns(-3721, "Qu'est-ce que le cycle d'exploitation d'une entreprise ?",
      "L'ensemble des opérations courantes : achats, production, ventes, encaissements.",
      "Ce cycle se répète régulièrement pour assurer la production."),
  ],
  "3eme/economie_gestion/Gestion/Chapitre 3: La partie double": [
    mcq(-3722, "En comptabilité, la « partie double » signifie :",
      ["payer deux fois", "chaque opération est enregistrée au débit et au crédit pour le même montant", "doubler son chiffre d'affaires", "deux fois plus de personnel"], "B",
      "Le principe de la partie double est la base de la comptabilité."),
  ],
  "3eme/economie_gestion/Gestion/Chapitre 4: Le cycle d'investissement": [
    mcq(-3723, "Le cycle d'investissement concerne :",
      ["les ventes courantes", "l'acquisition d'actifs durables (machines, bâtiments)", "les paiements de salaires", "le calcul de l'IS"], "B",
      "L'investissement concerne les biens durables."),
  ],
  "3eme/economie_gestion/Gestion/Chapitre 5: La fonction approvisionnement": [
    shortAns(-3724, "Quel est le rôle de la fonction approvisionnement ?",
      "Acheter et stocker les matières et fournitures nécessaires à l'activité.",
      "Une bonne gestion des achats réduit les coûts et évite les ruptures."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// AGGREGATED EXPORT
// ──────────────────────────────────────────────────────────────────────────────
export const QUESTIONS_FALLBACK_3EME: Record<string, FallbackQuestion[]> = {
  ...ANGLAIS_SHARED,
  ...ARABE_LETTRES,
  ...ARABE_NON_LETTRES,
  ...FRANCAIS_LETTRES,
  ...FRANCAIS_NON_LETTRES,
  ...HISTOIRE_LETTRES_ECO,
  ...HISTOIRE_SCIENTIFIC,
  ...GEO_LETTRES_ECO,
  ...GEO_SCIENTIFIC,
  ...MATH_MATHS,
  ...MATH_SCI_EXP,
  ...MATH_SCI_INFO,
  ...MATH_SCI_TECH,
  ...MATH_ECO,
  ...PHYS_MATH,
  ...PHYS_SCI_EXP,
  ...SVT_LETTRES,
  ...SVT_MATH,
  ...SVT_SCI_EXP,
  ...INFO_LETTRES,
  ...INFO_NON_LETTRES,
  ...PHILO_LETTRES,
  ...PHILO_AUTRES,
  ...ALGO_SCI_INFO,
  ...SYS_RES_SCI_INFO,
  ...TIC_SCI_INFO,
  ...GENIE_ELEC,
  ...GENIE_MECA,
  ...ECONOMIE,
  ...GESTION,
};

/**
 * Seed-side expansion rules.
 *
 * For each "key prefix", the seed expands questions to the listed section_keys.
 * Real (non-special) keys are inserted with the section_key extracted from the path.
 */
export const EXPANSION_RULES: Array<{ prefix: string; sections: (string | null)[] }> = [
  // Truly shared across all 6 tracks
  { prefix: "3eme/Anglais/",                     sections: [null] },

  // Non-Lettres group (5 tracks): math, sci_exp, sci_tech, eco_gestion, sci_info
  { prefix: "3eme/__non_lettres__/",             sections: ["mathematiques", "sciences_experimentales", "sciences_techniques", "economie_gestion", "sciences_informatique"] },

  // Philosophie "autres" (5 non-Lettres tracks)
  { prefix: "3eme/__autres__/",                  sections: ["mathematiques", "sciences_experimentales", "sciences_techniques", "economie_gestion", "sciences_informatique"] },

  // Lettres + Eco (Histoire / Géographie shared book)
  { prefix: "3eme/__lettres_eco__/",             sections: ["lettres", "economie_gestion"] },

  // 4 scientific/technical tracks (Histoire/Géographie sciences book)
  { prefix: "3eme/__sciences__/",                sections: ["mathematiques", "sciences_experimentales", "sciences_techniques", "sciences_informatique"] },

  // 3 non-Lettres-non-Eco tracks for shared Informatique book
  { prefix: "3eme/__non_lettres_non_eco__/",     sections: ["mathematiques", "sciences_experimentales", "sciences_techniques"] },
];

/** Apply seed-time mapping: returns the list of (section_key, subject, topic) inserts for a key. */
export function expandKey(key: string): Array<{ sectionKey: string | null; subject: string; topic: string }> {
  for (const rule of EXPANSION_RULES) {
    if (!key.startsWith(rule.prefix)) continue;
    const remainder = key.slice(rule.prefix.length);
    const slash = remainder.indexOf("/");
    if (slash < 0) return [];
    const subject = remainder.slice(0, slash);
    const topic = remainder.slice(slash + 1);
    return rule.sections.map((sectionKey) => ({ sectionKey, subject, topic }));
  }
  // Default: parse "3eme/<section>/<subject>/<topic>" → 1 insert
  return [];
}

