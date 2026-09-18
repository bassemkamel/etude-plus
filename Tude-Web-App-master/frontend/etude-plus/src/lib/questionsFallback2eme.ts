/**
 * 2ème année secondaire — local question fallback.
 *
 * Key format (matches questionsFallback.ts):
 *   "2eme/<subject>/<chapter>"                          → shared (section_key = null)
 *   "2eme/<section_key>/<subject>/<chapter>"            → track-specific
 *
 * Section keys used (already in educationConfig.ts):
 *   - lettres
 *   - sciences
 *   - economie_services
 *   - technologie_informatique
 *
 * Notes:
 *   - Math for 2ème Sciences and 2ème Technologie de l'Informatique uses the
 *     SAME 19-chapter curriculum. We declare the questions ONCE under the
 *     "2eme/sciences/Mathématiques/<chapter>" key. The seed script duplicates
 *     each row into the technologie_informatique track so students of either
 *     track see them, but they never leak to Lettres or Économie & Services.
 *   - Économie & Services Math has its own 8-chapter book; questions live
 *     under "2eme/economie_services/Mathématiques/<chapter>".
 *   - Negative IDs distinguish fallback rows from real DB rows.
 *   - source = "manual-starter-2eme" identifies the seeded set in Neon.
 */

import type { FallbackQuestion } from "./questionsFallback";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function mcq(
  id: number,
  question: string,
  options: [string, string, string, string],
  correctAnswer: "A" | "B" | "C" | "D",
  explanation: string,
  opts: { difficulty?: FallbackQuestion["difficulty"]; marks?: number; minutes?: number; rtl?: boolean; instruction?: string } = {},
): FallbackQuestion {
  const rtl = opts.rtl ?? false;
  return {
    id,
    type: "multiple-choice",
    instruction: opts.instruction ?? (rtl ? "اختر الإجابة الصحيحة." : "a) Choisissez la bonne réponse."),
    question,
    options: [
      { label: "A", text: options[0] },
      { label: "B", text: options[1] },
      { label: "C", text: options[2] },
      { label: "D", text: options[3] },
    ],
    correctAnswer,
    explanation,
    difficulty: opts.difficulty ?? "facile",
    totalMarks: opts.marks ?? 2,
    estimatedTimeMinutes: opts.minutes ?? 3,
    requiresCalculator: false,
    direction: rtl ? "rtl" : "ltr",
    source: "manual-starter-2eme",
  };
}

function problem(
  id: number,
  question: string,
  correctAnswer: string,
  explanation: string,
  opts: { difficulty?: FallbackQuestion["difficulty"]; marks?: number; minutes?: number; calc?: boolean; rtl?: boolean } = {},
): FallbackQuestion {
  const rtl = opts.rtl ?? false;
  return {
    id,
    type: "problem-solving",
    instruction: rtl ? "حلّ المسألة التالية." : "Résolvez le problème suivant.",
    question,
    correctAnswer,
    explanation,
    difficulty: opts.difficulty ?? "moyen",
    totalMarks: opts.marks ?? 2,
    estimatedTimeMinutes: opts.minutes ?? 5,
    requiresCalculator: opts.calc ?? false,
    direction: rtl ? "rtl" : "ltr",
    source: "manual-starter-2eme",
  };
}

function shortAnswer(
  id: number,
  question: string,
  correctAnswer: string,
  explanation: string,
  opts: { difficulty?: FallbackQuestion["difficulty"]; marks?: number; minutes?: number; rtl?: boolean } = {},
): FallbackQuestion {
  const rtl = opts.rtl ?? false;
  return {
    id,
    type: "short-answer",
    instruction: rtl ? "أجب عن السؤال التالي." : "Répondez brièvement.",
    question,
    correctAnswer,
    explanation,
    difficulty: opts.difficulty ?? "facile",
    totalMarks: opts.marks ?? 2,
    estimatedTimeMinutes: opts.minutes ?? 3,
    requiresCalculator: false,
    direction: rtl ? "rtl" : "ltr",
    source: "manual-starter-2eme",
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Arabe (RTL)
// ──────────────────────────────────────────────────────────────────────────────

const ARABE: Record<string, FallbackQuestion[]> = {
  "2eme/Arabe/الفصل الأول: الرومنطيقية والكلاسيكية (القلب بديل عن العقل / صورة الحقيقة بين الكلاسيكية والرومنطيقية) — د. محمد غنيمي هلال": [
    mcq(-2001,
      "أي عنصر يُعد من خصائص الاتجاه الرومنطيقي؟",
      ["تغليب العقل وحده", "تقديس القواعد القديمة", "الاهتمام بالعاطفة والذات", "رفض الخيال"],
      "C",
      "الرومنطيقية تهتم بالعاطفة والذات والخيال والطبيعة، بخلاف الكلاسيكية التي تميل إلى النظام والعقل.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/الفصل الثاني: نشأة الرابطة القلمية (الحاجة إلى التجديد - عوامل نشأة الرابطة القلمية - أهداف جماعة الرابطة) — د. محمد قوبعة": [
    shortAnswer(-2002,
      "ما هي الرابطة القلمية وأين تأسست؟",
      "جماعة أدبية مهجرية تأسست في الولايات المتحدة الأمريكية مطلع القرن العشرين، تضم أدباء مهاجرين من بلاد الشام.",
      "تأسست الرابطة القلمية سنة 1920 في نيويورك على يد جبران خليل جبران وميخائيل نعيمة ورفاقهما.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/الفصل الثالث: حركة أبوللو أو الحداثة النظرية (هاجس النهوض بالشعر العربي - جوانب من تجديد الجماعة) — أدونيس (علي أحمد سعيد)": [
    mcq(-2003,
      "ما الهدف الأبرز لجماعة أبوللو الشعرية؟",
      ["إحياء الشعر الجاهلي حرفياً", "تجديد الشعر العربي والانفتاح على الرومنطيقية", "العودة إلى عمود الشعر الكلاسيكي وحده", "رفض الإيقاع كلياً"],
      "B",
      "سعت جماعة أبوللو إلى تجديد الشعر العربي تأثراً بالرومنطيقية الغربية مع المحافظة على الأصول.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 1: الشاعر (صورة الشاعر - شعرية الخطاب النثري) — جبران خليل جبران": [
    shortAnswer(-2004,
      "كيف يصور جبران شخصية الشاعر في نصه «الشاعر»؟",
      "يصوره كائناً متفرداً، ذا رؤية كونية وإحساس مرهف، يقف على هامش المجتمع ليعبّر عن أعمق هواجس الإنسان.",
      "الشاعر عند جبران مرشد ونبي للجمال، يجمع بين الحلم والمعاناة.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 2: الشاعر (الشاعر النبي - من خصائص الإيقاع عند الرومنطيقيين) — إيليا أبو ماضي": [
    mcq(-2005,
      "ما الصفة التي يضفيها إيليا أبو ماضي على الشاعر؟",
      ["تاجر", "نبي يبشر بالجمال والحقيقة", "محارب", "موظف"],
      "B",
      "صور الرومنطيقيون الشاعرَ نبياً يبشر بالجمال والحقيقة والحرية.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 3: يا شعر (موقع الشعر من الشاعر) — أبو القاسم الشابي": [
    shortAnswer(-2006,
      "ما موقع الشعر من الشاعر عند أبي القاسم الشابي؟",
      "الشعر عنده تعبير عن الذات والوجدان وعن آمال الحياة، وهو أداة الشاعر للكشف عن أعماقه.",
      "يرى الشابي أن الشعر صدى لروح الشاعر وتجربته الوجودية والإنسانية.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 4: ملكة الخيال (الخيال والإبداع عند الرومنطيقيين) — جبران خليل جبران": [
    mcq(-2007,
      "ما دور الخيال في الإبداع الرومنطيقي عند جبران؟",
      ["مجرد زخرف لغوي", "وسيلة لتجاوز الواقع وكشف الحقيقة الباطنية", "تكرار للواقع كما هو", "ركيزة العقل المنطقي"],
      "B",
      "الخيال عند الرومنطيقيين قوة إبداعية تتجاوز الواقع وتكشف عن حقائق روحية وفنية.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 5: عش للجمال (الجمال قيمة كونية وعمادًا للأدب الجديد) — إيليا أبو ماضي": [
    shortAnswer(-2008,
      "كيف يقدم إيليا أبو ماضي «الجمال» في قصيدته؟",
      "يقدمه قيمة كونية مطلقة وأساساً للأدب الجديد، يرتقي بالإنسان ويهديه إلى المعنى.",
      "الجمال عند أبي ماضي مبدأ روحي وأخلاقي يعلو على الزينة الشكلية.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 6: الفن الجميل (مصادر التجربة الشعرية ومنزلة الفن) — علي محمود طه": [
    mcq(-2009,
      "ما المصدر الرئيس للتجربة الشعرية عند الرومنطيقيين؟",
      ["النصوص القديمة فقط", "التجربة الذاتية والمشاعر الحية", "الإحصاءات العلمية", "النقد الكلاسيكي"],
      "B",
      "تنطلق التجربة الشعرية الرومنطيقية أساساً من الذات والمشاعر الصادقة.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 7: قلت للشعر (من خصائص الإيقاع - الشعر يحتضن الكون) — أبو القاسم الشابي": [
    shortAnswer(-2010,
      "بِمَ يتميز الإيقاع في الشعر الرومنطيقي؟",
      "بالتنوع والمرونة والتعبير عن الحالة الشعورية بدل التقيد الصارم بالقوافي.",
      "كسر الرومنطيقيون رتابة القافية وفتحوا الإيقاع على بنى موسيقية جديدة.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 8: الشاعر والمقلد (الموقف من التقليد والتجديد) — جبران خليل جبران": [
    mcq(-2011,
      "ما موقف الأدب الرومنطيقي من التقليد؟",
      ["تمجيد التقليد", "رفض التقليد والدعوة إلى التجديد", "محايد", "اتباع القدماء حرفياً"],
      "B",
      "نادى الرومنطيقيون بكسر التقليد والانفتاح على روح التجديد.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 9: المعراج (من تجليات الرمز في الأدب الرومنطيقي)": [
    shortAnswer(-2012,
      "ما وظيفة الرمز في الأدب الرومنطيقي؟",
      "الإيحاء بدلالات عميقة لا يستطيع المباشر التعبير عنها، وفتح المجال للتأويل.",
      "الرمز عند الرومنطيقيين جسر بين العاطفة والمعنى الكوني.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 10: مناجاة أرواح (بنية المناجاة - رمزية المدينة عند الرومنطيقيين)": [
    mcq(-2013,
      "كيف يصور الرومنطيقيون المدينة عادةً؟",
      ["جنة وفردوس", "فضاء قاسٍ يقمع روح الإنسان", "بلا أهمية", "مكان يحتفى به دائماً"],
      "B",
      "ترتبط المدينة في الأدب الرومنطيقي بالضيق والاغتراب، خلافاً للطبيعة المثالية.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 11: مناجاة عصفور (مكونات الرمز - الغربة - موقف من المدينة)": [
    shortAnswer(-2014,
      "ما العلاقة بين «الغربة» والشعور الرومنطيقي؟",
      "الغربة شعور وجودي يلازم الشاعر الرومنطيقي إذ يحس بانفصاله عن واقع لا يفهمه.",
      "الغربة عند الرومنطيقي اغتراب روحي عن المجتمع والمدينة.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 12: الجبابرة (الخطاب بين التأثير والتعبير - الالتزام في الأدب الرومنطيقي)": [
    mcq(-2015,
      "ما المقصود بالالتزام في الأدب الرومنطيقي؟",
      ["الانعزال عن قضايا الناس", "حمل قضايا الإنسان والدفاع عن الحرية والعدل", "كتابة الإعلانات", "تمجيد السلطة"],
      "B",
      "الالتزام يعني أن يضع الأديب فنّه في خدمة قضايا الإنسان.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 13: ليل الأشواق (الحب طريق إلى المعرفة)": [
    shortAnswer(-2016,
      "كيف يقدّم الرومنطيقيون «الحب»؟",
      "طريقاً إلى المعرفة وكشفاً للحقيقة الإنسانية الأعمق، لا مجرد عاطفة عابرة.",
      "الحب عند الرومنطيقي تجربة وجدانية ومعرفية تكشف للإنسان حقيقته.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 14: الأشواق التائهة (من تجليات الغربة والتوق إلى المنشود)": [
    shortAnswer(-2017,
      "ما المقصود بـ«التوق إلى المنشود» في الأدب الرومنطيقي؟",
      "الحنين إلى مثال أعلى أو واقع أجمل، يبقى دائماً بعيد المنال.",
      "يعبّر التوق عن سعي الرومنطيقي الدائم إلى عالم أمثل غير ما يعيش.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 15: أغنية ريفية (الطبيعة في الأدب الرومنطيقي)": [
    mcq(-2018,
      "ما موقع الطبيعة في الأدب الرومنطيقي؟",
      ["خلفية ثانوية", "ملاذ الشاعر ومرآة لمشاعره", "بلا أهمية", "تمجيد المدينة فقط"],
      "B",
      "الطبيعة عند الرومنطيقيين ملاذ روحي ومسرح للتأمل والانعكاس الوجداني.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 16: الجمال المنشود (صورة المرأة في الأدب الرومنطيقي)": [
    shortAnswer(-2019,
      "كيف تتجلى صورة المرأة في الأدب الرومنطيقي؟",
      "ترمز إلى الجمال المثالي والمحبة المخلصة، وتُقدَّم رفيقة الروح ومصدر الإلهام.",
      "تبدو المرأة في الأدب الرومنطيقي مثالاً للجمال والصفاء الروحي.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 17: رؤيا (القيم المؤسسة للمنشود في أدب الرومنطيقيين)": [
    mcq(-2020,
      "أي قيمة من القيم التالية تؤسّس للمنشود الرومنطيقي؟",
      ["الجشع", "الحرية والعدالة والجمال", "الانعزال السلبي", "الخضوع التام"],
      "B",
      "تتأسس رؤى الرومنطيقيين على قيم الحرية والعدالة والجمال.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 18: كم تشتكي (الإيمان بالحياة عند الرومنطيقي)": [
    shortAnswer(-2021,
      "كيف يعبّر الرومنطيقي عن «الإيمان بالحياة» رغم الألم؟",
      "بالتشبث بالأمل والإصرار على متابعة السعي نحو المعنى رغم المعاناة.",
      "الإيمان بالحياة يجعل الرومنطيقي يقاوم اليأس بالحلم والعمل.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 19: نشيد الجبار (التمرد - توظيف الأسطورة)": [
    mcq(-2022,
      "ما الوظيفة الفنية لتوظيف الأسطورة في الأدب الرومنطيقي؟",
      ["تزيين سطحي", "تعميق المعنى ورمزية التجربة", "إخفاء الفكرة", "تجاوز الأدب نهائياً"],
      "B",
      "توظف الأسطورة لتكثيف الدلالة الإنسانية والإيحاء بقضايا كبرى.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/النص 20: التمثال (الإنسان بين أوهام القدرة والخلق وواقع العجز)": [
    shortAnswer(-2023,
      "ما الفكرة التي يطرحها نص «التمثال» حول الإنسان؟",
      "أن الإنسان قد يدّعي القدرة والخلق ثم يصطدم بمحدوديته وعجزه أمام الحقيقة.",
      "يعالج النص تناقض الإنسان بين أوهام القدرة وواقع العجز.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/الفصل الأول: من تجليات الحداثة في إنتاج جماعة الرابطة القلمية (كسر الأنساق الإيقاعية القديمة - الرؤية الرومنطيقية والحداثة)": [
    shortAnswer(-2024,
      "ما أبرز ملمح من ملامح الحداثة عند جماعة الرابطة القلمية؟",
      "كسر الأنساق الإيقاعية القديمة والانفتاح على الرؤية الرومنطيقية.",
      "جدّدت الرابطة القلمية في الإيقاع والمعجم وفي رؤية الشعر للعالم.",
      { rtl: true },
    ),
  ],
  "2eme/Arabe/الفصل الثاني: ملامح من شعرية أغاني الحياة (القديم والحديث في شعر الشابي - بلاغة الصورة في أغاني الحياة - الأسطوري في أغاني الحياة)": [
    mcq(-2025,
      "ما السمة الفنية البارزة في «أغاني الحياة» للشابي؟",
      ["التزام صارم بالقصيدة العمودية فقط", "الجمع بين القديم والحديث وبلاغة الصورة الرومنطيقية", "إهمال الصورة الشعرية", "التركيز على المنطق الجاف"],
      "B",
      "اجتمع في شعر الشابي جمال الصورة الرومنطيقية والاستفادة من الموروث.",
      { rtl: true },
    ),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Français (LTR)
// ──────────────────────────────────────────────────────────────────────────────

const FRANCAIS: Record<string, FallbackQuestion[]> = {
  "2eme/Français/Perdus dans la rêverie — G. Flaubert": [
    shortAnswer(-2050,
      "Qu'est-ce qu'un champ lexical ?",
      "C'est un ensemble de mots qui se rapportent à un même thème.",
      "Par exemple, amour, cœur, sentiment et passion peuvent appartenir au champ lexical de l'amour.",
    ),
  ],
  "2eme/Français/Méditation — P. Géraldy": [
    mcq(-2051,
      "Dans un poème lyrique, quel est l'élément central ?",
      ["La narration d'événements historiques", "L'expression des sentiments du poète", "Une démonstration scientifique", "Un dialogue de théâtre"],
      "B",
      "La poésie lyrique exprime avant tout les émotions et les sentiments du poète.",
    ),
  ],
  "2eme/Français/L'amoureux éconduit — Marivaux": [
    shortAnswer(-2052,
      "Qu'est-ce qu'un thème dans un texte littéraire ?",
      "Le thème est le sujet central ou l'idée dominante traitée par le texte.",
      "Identifier le thème permet de comprendre l'orientation générale d'un texte.",
    ),
  ],
  "2eme/Français/Il pleut — F. Carco": [
    mcq(-2053,
      "Lequel de ces procédés est typique de la poésie ?",
      ["L'addition mathématique", "La métaphore et la comparaison", "Le tableau statistique", "L'équation chimique"],
      "B",
      "La métaphore et la comparaison sont au cœur des images poétiques.",
    ),
  ],
  "2eme/Français/Un songe — S. Prudhomme": [
    shortAnswer(-2054,
      "Qu'est-ce qu'une thèse dans un texte argumentatif ?",
      "C'est le point de vue, l'idée défendue par l'auteur.",
      "La thèse est l'opinion principale autour de laquelle s'organisent les arguments.",
    ),
  ],
  "2eme/Français/Solitude au milieu des hommes — R. Merle": [
    mcq(-2055,
      "Quel sentiment évoque la « solitude au milieu des hommes » ?",
      ["La joie collective", "L'incompréhension et l'isolement intérieur", "L'enthousiasme sportif", "L'humour ordinaire"],
      "B",
      "C'est un thème classique : se sentir seul même entouré, faute de lien sincère.",
    ),
  ],
  "2eme/Français/La peur du mépris — Stendhal": [
    shortAnswer(-2056,
      "Pourquoi la « peur du mépris » est-elle un moteur narratif chez Stendhal ?",
      "Parce qu'elle pousse le personnage à agir pour préserver son honneur et son image sociale.",
      "Stendhal explore la psychologie sociale et la honte comme ressort de l'action.",
    ),
  ],
  "2eme/Français/Une affaire de conscience — A. Touraine": [
    mcq(-2057,
      "Qu'est-ce qu'une « affaire de conscience » ?",
      ["Une question administrative", "Un dilemme moral personnel", "Une opération financière", "Un débat sportif"],
      "B",
      "Une affaire de conscience est un conflit intérieur entre valeurs morales et intérêts.",
    ),
  ],
  "2eme/Français/Je n'aimerais pas être un mari ! — C. Rochefort": [
    shortAnswer(-2058,
      "Qu'est-ce qu'un argument dans un texte argumentatif ?",
      "C'est une raison ou une preuve qui appuie la thèse de l'auteur.",
      "Un bon argument est appuyé par des exemples, des faits, ou un raisonnement clair.",
    ),
  ],
  "2eme/Français/Ainsi était ma mère ... — G. Navel": [
    mcq(-2059,
      "Quel procédé permet d'illustrer un argument ?",
      ["L'exemple concret", "Le silence", "Le calcul aléatoire", "L'image purement décorative"],
      "A",
      "L'exemple concret rend un argument plus convaincant en l'ancrant dans la réalité.",
    ),
  ],
  "2eme/Français/Un roi déchu — J. Giraudoux": [
    shortAnswer(-2060,
      "Qu'est-ce qu'un texte argumentatif sur le thème « Femme et société » peut chercher à montrer ?",
      "Que les conditions sociales et les stéréotypes pèsent sur la vie des femmes et appellent à plus d'égalité.",
      "L'auteur cherche souvent à dénoncer les inégalités et à proposer une vision plus juste.",
    ),
  ],
  "2eme/Français/Monsieur ou Mondamoiseau ? — F. de Lagarde": [
    mcq(-2061,
      "Quel mot clé désigne le déroulement logique d'un raisonnement ?",
      ["L'argumentation", "La rime", "La cuisine", "La décoration"],
      "A",
      "L'argumentation est la mise en ordre logique des idées pour convaincre.",
    ),
  ],
  "2eme/Français/Une existence exemplaire — R. M. Du Gard": [
    shortAnswer(-2062,
      "Comment s'organise un texte argumentatif en plusieurs étapes ?",
      "Introduction (thèse), développement (arguments + exemples), conclusion (synthèse ou ouverture).",
      "Cette structure permet de présenter clairement une opinion et de la défendre.",
    ),
  ],
  "2eme/Français/Des millions de petites flammes — M. Tournier": [
    mcq(-2063,
      "Quel rôle jouent les exemples dans un texte argumentatif ?",
      ["Ils décorent", "Ils illustrent et soutiennent les arguments", "Ils remplacent la thèse", "Ils contredisent la conclusion"],
      "B",
      "Les exemples concrets rendent les arguments vivants et plus convaincants.",
    ),
  ],
  "2eme/Français/Le chant de la pierre — Lamartine": [
    shortAnswer(-2064,
      "Comment Lamartine relie-t-il la nature au travail humain dans son écriture ?",
      "Il personnifie la nature et la rapproche du destin de l'homme qui travaille la terre.",
      "Le poète romantique voit la nature comme un compagnon spirituel de l'humain.",
    ),
  ],
  "2eme/Français/Sur les routes du monde — G. Cesbron": [
    mcq(-2065,
      "Quelle est la « structure de l'argumentation » la plus courante ?",
      ["Anecdote uniquement", "Thèse → arguments → conclusion", "Conclusion seule", "Liste sans ordre"],
      "B",
      "On commence par exposer une thèse, on la défend par des arguments, puis on conclut.",
    ),
  ],
  "2eme/Français/Sensation — Rimbaud": [
    shortAnswer(-2066,
      "Quels sens sont sollicités dans le poème « Sensation » de Rimbaud ?",
      "La vue, le toucher, l'odorat — la perception sensorielle de la nature.",
      "Le poème évoque une fusion sensorielle avec la nature, typique du sentiment poétique.",
    ),
  ],
  "2eme/Français/Le pouvoir de l'image — A. Jouffroy": [
    mcq(-2067,
      "Quel effet l'image a-t-elle dans un texte argumentatif ?",
      ["Elle rend l'idée plus concrète et plus mémorable", "Elle remplace la thèse", "Elle annule l'argument", "Elle distrait inutilement"],
      "A",
      "Une image bien choisie ancre l'idée et marque davantage le lecteur.",
    ),
  ],
  "2eme/Français/La ficelle — Guy de Maupassant": [
    mcq(-2068,
      "Quel thème central traverse la nouvelle « La ficelle » de Maupassant ?",
      ["La gloire militaire", "L'injustice de la rumeur et la fragilité de la réputation", "La conquête spatiale", "Les progrès scientifiques"],
      "B",
      "Maupassant montre comment une fausse accusation peut détruire la vie d'un homme.",
    ),
    shortAnswer(-2069,
      "Pourquoi Maître Hauchecorne refuse-t-il d'être cru à la fin de « La ficelle » ?",
      "Parce que la rumeur a déjà détruit sa crédibilité aux yeux des villageois.",
      "La nouvelle illustre comment la rumeur peut s'imposer plus fortement que la vérité.",
    ),
  ],
  "2eme/Français/La reine de beauté — Suzanne Prou": [
    shortAnswer(-2070,
      "Quel thème dominant explore la nouvelle « La reine de beauté » ?",
      "Le regard social sur la femme, la beauté et les apparences.",
      "L'auteure interroge la place de la femme et les attentes liées à son apparence.",
    ),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Anglais (LTR) — content lessons only
// ──────────────────────────────────────────────────────────────────────────────

function en(
  id: number, question: string, options: [string, string, string, string],
  correctAnswer: "A" | "B" | "C" | "D", explanation: string,
): FallbackQuestion {
  return mcq(id, question, options, correctAnswer, explanation, {
    instruction: "Choose the correct answer.",
  });
}

const ANGLAIS: Record<string, FallbackQuestion[]> = {
  "2eme/Anglais/Lesson 1: The image of who I am": [
    en(-2100, "Which adjective best describes a confident person?",
      ["Hesitant", "Self-assured", "Insecure", "Frightened"], "B",
      "A confident person is self-assured: they believe in their own abilities."),
  ],
  "2eme/Anglais/Lesson 3: Friendship": [
    en(-2101, "Which word best describes a good friend?",
      ["Selfish", "Loyal", "Careless", "Rude"], "B",
      "A good friend is loyal because they support and respect their friend."),
    shortAnswer(-2102,
      "Give one quality you expect from a true friend.",
      "Trust (or honesty, kindness, loyalty).",
      "True friendship is built on trust and mutual respect.",
      { rtl: false },
    ),
  ],
  "2eme/Anglais/Lesson 5: The E-mailer": [
    en(-2103, "What does 'compose an email' mean?",
      ["Delete it", "Write a new email", "Forward it", "Translate it"], "B",
      "To 'compose' means to write a new message."),
  ],
  "2eme/Anglais/Lesson 6: Travel is fun and broadens the mind": [
    en(-2104, "Travel 'broadens the mind' means it:",
      ["makes you forget things", "opens you to new cultures and ideas", "makes you tired", "wastes time"], "B",
      "The idiom means travel exposes you to new perspectives, expanding understanding."),
    shortAnswer(-2105,
      "Name one benefit of travelling abroad.",
      "Learning about new cultures (or improving languages, meeting people).",
      "Travelling enriches a person by exposing them to different ways of life.",
    ),
  ],
  "2eme/Anglais/Lesson 9: Violence": [
    en(-2106, "Which word is closest in meaning to 'violence'?",
      ["Kindness", "Aggression", "Politeness", "Friendship"], "B",
      "Violence and aggression both involve hostile, harmful behaviour."),
  ],
  "2eme/Anglais/Lesson 10: Child labour": [
    en(-2107, "Why is child labour considered harmful?",
      ["It helps children study", "It deprives children of education and a healthy childhood", "It improves their health", "It is encouraged worldwide"], "B",
      "Child labour prevents children from going to school and damages their physical and mental development."),
    shortAnswer(-2108,
      "Suggest one way to fight child labour.",
      "Free compulsory education and stricter laws against employing children.",
      "Education and law enforcement are key strategies to end child labour.",
    ),
  ],
  "2eme/Anglais/Lesson 11: Life without parents": [
    en(-2109, "An orphan is a child who:",
      ["loves animals", "has lost one or both parents", "is very rich", "is very tall"], "B",
      "'Orphan' refers to a child without parents."),
  ],
  "2eme/Anglais/Lesson 12: Money and evil": [
    en(-2110, "'Money is the root of all evil' is best described as:",
      ["a scientific law", "a proverb or saying", "a recipe", "a math formula"], "B",
      "It is a well-known proverb suggesting that the love of money causes many problems."),
  ],
  "2eme/Anglais/Lesson 13: Songs of freedom": [
    en(-2111, "Which word is a synonym of 'freedom'?",
      ["Slavery", "Liberty", "Prison", "Silence"], "B",
      "'Liberty' is a synonym of 'freedom'."),
  ],
  "2eme/Anglais/Lesson 14: Why I had to leave my job": [
    en(-2112, "If someone 'resigned' from a job, they:",
      ["got a promotion", "officially left the job", "started the job", "took a holiday"], "B",
      "'Resign' means to leave a job, usually voluntarily."),
  ],
  "2eme/Anglais/Lesson 15: Human rights": [
    en(-2113, "Human rights are:",
      ["privileges for the rich", "rights every person has from birth", "rules invented by parents", "rights only adults have"], "B",
      "Human rights belong to every person regardless of age, status, or origin."),
    shortAnswer(-2114,
      "Name one basic human right.",
      "The right to education (or freedom of expression, healthcare, life).",
      "These rights are recognized internationally and protected by law.",
    ),
  ],
  "2eme/Anglais/Lesson 16: Equality brings prosperity": [
    en(-2115, "'Equality' in society means:",
      ["everyone is identical", "everyone has the same rights and opportunities", "no rules at all", "only some people decide"], "B",
      "Equality is about equal rights and equal opportunities for everyone."),
  ],
  "2eme/Anglais/Lesson 18: School uniforms": [
    en(-2116, "What is one common argument in favour of school uniforms?",
      ["They make children identical thinkers", "They reduce social differences and pressure to follow fashion", "They are always cheap", "They prevent learning"], "B",
      "Uniforms can reduce visible social differences among students."),
  ],
  "2eme/Anglais/Lesson 19: Coping with exams": [
    en(-2117, "Which is the best way to 'cope with' exams?",
      ["Ignore them entirely", "Plan, revise regularly, and rest enough", "Stay awake all night before the exam", "Avoid sleeping"], "B",
      "A regular study plan with rest reduces stress and improves results."),
  ],
  "2eme/Anglais/Lesson 21: What's your dream job?": [
    en(-2118, "Which question best matches 'What's your dream job?'",
      ["Where do you live?", "What job would you most like to have?", "How old are you?", "How much is it?"], "B",
      "A 'dream job' is the ideal job a person would love to have."),
  ],
  "2eme/Anglais/Lesson 22: A success story": [
    shortAnswer(-2119,
      "Name one quality often found in a 'success story'.",
      "Hard work (or perseverance, determination).",
      "Successful people usually combine effort, vision, and persistence.",
    ),
  ],
  "2eme/Anglais/Lesson 23: The importance of libraries": [
    en(-2120, "Which sentence best explains the importance of libraries?",
      ["Libraries store furniture", "Libraries give free access to knowledge and culture", "Libraries replace teachers", "Libraries only sell books"], "B",
      "Libraries offer access to information and learning for everyone."),
  ],
  "2eme/Anglais/Lesson 25: Internet addiction": [
    en(-2121, "Spending too many hours online every day is often called:",
      ["Internet success", "Internet addiction", "Internet manners", "Internet design"], "B",
      "Compulsive overuse of the internet that affects daily life is called Internet addiction."),
  ],
  "2eme/Anglais/Lesson 27: Our world, our environment": [
    en(-2122, "Recycling helps the environment because it:",
      ["uses more raw materials", "reduces waste and saves resources", "increases pollution", "wastes energy"], "B",
      "Recycling transforms used items into new ones, reducing waste and saving resources."),
  ],
  "2eme/Anglais/Lesson 28: Water scarcity": [
    en(-2123, "'Water scarcity' means:",
      ["too much water", "a lack of available water", "clean water for all", "underground water"], "B",
      "Water scarcity describes a shortage of fresh water available for people's needs."),
  ],
  "2eme/Anglais/Economics 2: Advertising": [
    en(-2124, "The main aim of advertising is to:",
      ["entertain only", "inform and persuade people to buy a product or service", "replace shopping", "give free goods"], "B",
      "Advertising's main goal is to make consumers aware of a product and persuade them to buy it."),
  ],
  "2eme/Anglais/Economics 3: Business letters: Inquiry/Reply": [
    en(-2125, "A 'letter of inquiry' is written to:",
      ["complain about a product", "request information or prices about a product or service", "fire an employee", "say goodbye"], "B",
      "A letter of inquiry politely asks the receiver for information (e.g., prices, products, services)."),
  ],
  "2eme/Anglais/Economics 4: Business letters: Complaint / Reply": [
    en(-2126, "A 'letter of complaint' should be:",
      ["rude and aggressive", "clear, polite and factual", "anonymous", "very short with no details"], "B",
      "A professional complaint letter states the problem clearly and remains respectful."),
  ],
  "2eme/Anglais/Economics 5: Business letters: Notification and warning": [
    en(-2127, "Which document warns an employee about repeated lateness at work?",
      ["Curriculum vitae", "Warning letter", "Inquiry letter", "Invoice"], "B",
      "A warning letter notifies an employee of misconduct and possible consequences."),
  ],
  "2eme/Anglais/Economics 6: Job Hunting": [
    en(-2128, "Which document presents your education and professional experience to an employer?",
      ["A poem", "A CV (résumé)", "A weather report", "A recipe"], "B",
      "A CV is a summary of one's qualifications and work experience used when applying for a job."),
  ],
  "2eme/Anglais/Economics 7: Inflation": [
    en(-2129, "'Inflation' refers to:",
      ["a decrease in prices", "a general and continuous rise in prices", "stable prices", "free goods"], "B",
      "Inflation is the sustained rise in prices, reducing purchasing power."),
  ],
  "2eme/Anglais/Lesson 2: The step mum": [
    en(-2130, "A 'step-mother' is:",
      ["a child's biological mother", "the wife of one's father after a remarriage", "a teacher", "a grandmother"], "B",
      "A step-mother is the new wife of one's father, not the biological mother."),
  ],
  "2eme/Anglais/Lesson 4: Bridge over troubled water": [
    en(-2131, "'A bridge over troubled water' is a metaphor for:",
      ["a dangerous river", "support during difficult times", "an old structure", "a music CD only"], "B",
      "The famous song uses the metaphor to describe a friend who helps in hard times."),
  ],
  "2eme/Anglais/Lesson 7: An interview with a footballer": [
    en(-2132, "Which word fits 'an interview'?",
      ["a private monologue", "a recorded conversation in which questions are asked", "a song", "a math test"], "B",
      "An interview is a guided question-and-answer exchange."),
  ],
  "2eme/Anglais/Lesson 20: I had no choice": [
    en(-2133, "If a person says 'I had no choice', they mean:",
      ["they decided freely", "they were forced or felt obliged to act", "they refused to act", "they invented the situation"], "B",
      "'Having no choice' implies action under constraint."),
  ],
  "2eme/Anglais/Lesson 24: Death of the single": [
    en(-2134, "The title 'Death of the single' refers to the disappearance of:",
      ["single-song records replaced by albums and streaming", "all music", "concerts", "music videos"], "A",
      "It talks about the decline of single-song records in the music industry."),
  ],
  "2eme/Anglais/Lesson 26: What will man be like?": [
    en(-2135, "The question 'what will man be like' invites:",
      ["a description of the past", "predictions and speculations about the future of humanity", "a math demonstration", "a poem about the past only"], "B",
      "It opens a discussion about predictions, hopes, and fears for the future."),
  ],
  "2eme/Anglais/Lesson 29: Time for a song": [
    en(-2136, "Songs often help to:",
      ["reduce communication", "express feelings and bring people together", "increase noise pollution only", "replace school books"], "B",
      "Music is a powerful emotional and social bond."),
  ],
  "2eme/Anglais/Arts 1: Hard to decide": [
    en(-2137, "When something is 'hard to decide', it usually involves:",
      ["only one obvious choice", "several options with serious trade-offs", "no options", "complete certainty"], "B",
      "Hard decisions arise from competing options or values."),
  ],
  "2eme/Anglais/Arts 2: Fairy tales": [
    en(-2138, "Fairy tales typically:",
      ["are scientific reports", "are imaginative stories with magical elements", "describe daily news", "discuss economics"], "B",
      "Fairy tales use imagination, magic, and moral lessons."),
  ],
  "2eme/Anglais/Arts 3: Criss-crossed lovers": [
    en(-2139, "'Criss-crossed lovers' describes:",
      ["lovers in unfortunate, conflicting circumstances", "happy lovers in calm settings", "scientific researchers", "war heroes"], "A",
      "The expression evokes complicated love situations like Romeo and Juliet."),
  ],
  "2eme/Anglais/Arts 4: The colour of nutrition": [
    en(-2140, "'The colour of nutrition' relates to:",
      ["the variety of fruits and vegetables in a balanced diet", "painting only", "advertising slogans", "computer code"], "A",
      "Different food colours often correspond to different nutrients."),
  ],
  "2eme/Anglais/Arts 5: The fox and the crow": [
    en(-2141, "What moral does the fable 'The Fox and the Crow' teach?",
      ["Always trust strangers", "Beware of flattery", "Never sing", "Eat cheese"], "B",
      "The fox tricks the crow with flattery to steal the cheese — beware of flatterers."),
  ],
  "2eme/Anglais/Arts 6: Men and women": [
    en(-2142, "'Men and women' as a topic mainly explores:",
      ["the periodic table", "gender roles and relationships", "weather patterns", "tax law"], "B",
      "It examines social roles, equality, and relationships between genders."),
  ],
  "2eme/Anglais/Arts 7: Pushy parents": [
    en(-2143, "'Pushy parents' are parents who:",
      ["leave children alone", "pressure children to succeed often beyond their wishes", "ignore the children's school", "do not care"], "B",
      "Pushy parents impose ambitions that may not match the child's interests."),
  ],
  "2eme/Anglais/Arts 8: Students' part-time jobs": [
    en(-2144, "Which is a likely benefit of a student's part-time job?",
      ["worse grades only", "earning money and gaining work experience", "having no friends", "more sleep"], "B",
      "Part-time work brings money and useful experience if balanced with studies."),
  ],
  "2eme/Anglais/Arts 9: Keeping a diary": [
    en(-2145, "Keeping a diary helps a person to:",
      ["forget events", "record thoughts and reflect on experiences", "lose time only", "delete memories"], "B",
      "A diary supports memory, self-reflection, and emotional well-being."),
  ],
  "2eme/Anglais/Arts 10: Save the lofty trees": [
    en(-2146, "'Save the lofty trees' is a call for:",
      ["cutting trees", "protecting forests and the environment", "burning leaves", "ignoring nature"], "B",
      "Lofty trees symbolize old, tall trees crucial to ecosystems."),
  ],
  "2eme/Anglais/Economics 1: The financial market": [
    en(-2147, "A 'financial market' is a place (physical or electronic) where:",
      ["only food is sold", "people buy and sell financial assets like stocks and bonds", "students take exams", "cars are repaired"], "B",
      "The financial market matches buyers and sellers of financial assets."),
  ],
  "2eme/Anglais/Economics 8: The budget dollar": [
    en(-2148, "A government 'budget' is mainly:",
      ["a personal poem", "a plan of expected income and expenditure", "an advertisement", "a complaint letter"], "B",
      "A budget allocates money to different areas of expenditure based on income forecasts."),
  ],
  "2eme/Anglais/Economics 9: Talking about changes": [
    en(-2149, "Which tense is often used to describe completed economic changes over time?",
      ["The present simple", "The present perfect", "The future continuous", "The conditional"], "B",
      "Present perfect ('has increased', 'have fallen') describes changes up to now."),
  ],
  "2eme/Anglais/Economics 10: Selling a business": [
    en(-2150, "When a business is 'sold', what typically changes hands?",
      ["only the name", "ownership of the assets and operations", "the customers' birthdays", "the country's flag"], "B",
      "Selling a business transfers ownership of its assets, contracts, and goodwill."),
  ],
  "2eme/technologie_informatique/Informatique/Architecture de base d'un micro-ordinateur": [
    mcq(-2835,
      "Quel élément n'est PAS un composant interne d'un micro-ordinateur ?",
      ["Le processeur", "La RAM", "Le disque dur", "L'écran"], "D",
      "L'écran est un périphérique de sortie externe ; les autres sont internes."),
  ],
  "2eme/technologie_informatique/Informatique/L'exploitation d'un réseau local": [
    mcq(-2836,
      "Sur un réseau local, le partage d'imprimante permet :",
      ["d'imprimer depuis n'importe quel poste autorisé", "d'éteindre l'imprimante", "de désinstaller le pilote", "d'empêcher l'impression"], "A",
      "Le partage permet à plusieurs utilisateurs d'imprimer sur la même imprimante."),
  ],
  "2eme/technologie_informatique/Informatique/Les constantes": [
    mcq(-2837,
      "Quelle est la principale différence entre une variable et une constante ?",
      ["Aucune différence", "La valeur d'une constante ne change pas pendant l'exécution", "Une variable est toujours entière", "Une constante n'a pas de nom"], "B",
      "Une constante est invariante pendant l'exécution ; la variable peut changer."),
  ],
  "2eme/technologie_informatique/Informatique/Les opérations d'entrée et de sortie": [
    mcq(-2838,
      "Quelle instruction sert à afficher un message à l'utilisateur ?",
      ["LIRE", "ÉCRIRE / AFFICHER", "AFFECTATION", "SI"], "B",
      "ÉCRIRE (ou AFFICHER) envoie une donnée à la sortie standard."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Éducation Islamique (RTL)
// ──────────────────────────────────────────────────────────────────────────────

const EDUC_ISLAMIQUE: Record<string, FallbackQuestion[]> = {
  "2eme/Éducation Islamique/مقدمة الكتاب": [
    shortAnswer(-2200, "ما الهدف من مقدمة كتاب التربية الإسلامية؟",
      "تقديم محاور الكتاب وأهدافه وأسلوب التعامل معه.",
      "تساعد المقدمة على فهم منهج الكتاب وكيفية الاستفادة منه.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/كتابك: كيف تتعامل معه؟": [
    mcq(-2201, "ما أنسب أسلوب للتعامل مع الكتاب المدرسي؟",
      ["حفظه دون فهم", "قراءته بتدبر وفهم وربطه بالواقع", "إهماله", "الاكتفاء بحفظ العناوين"],
      "B",
      "التعامل الواعي يقتضي القراءة المتأنية والفهم والتطبيق العملي.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/الصفات الإلهية": [
    mcq(-2202, "ما المقصود بالصفات الإلهية؟",
      ["صفات بشرية", "صفات الكمال التي يتصف بها الله تعالى", "أوصاف الأنبياء", "أوصاف الملائكة"],
      "B",
      "الصفات الإلهية هي صفات الكمال الثابتة لله سبحانه كالعلم والقدرة والرحمة.",
      { rtl: true }),
    shortAnswer(-2203, "اذكر صفتين من صفات الله سبحانه وتعالى.",
      "العلم والقدرة (أو الرحمة والحكمة).",
      "تنوع الصفات يدل على كمال الذات الإلهية.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/العبادة: دلالاتها ومقاصدها": [
    mcq(-2204, "ما المقصد الأساسي من العبادة في الإسلام؟",
      ["المظهر الخارجي فقط", "تحقيق الصلة بالله وتهذيب سلوك الإنسان", "العادة الاجتماعية فقط", "حفظ النصوص دون عمل"],
      "B",
      "العبادة في الإسلام لها بعد روحي وسلوكي، فهي تقوي الصلة بالله وتنعكس على أخلاق الإنسان.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/الكون يسبح الله": [
    shortAnswer(-2205, "ما الدليل القرآني على أن الكون كله يسبح الله؟",
      "قوله تعالى: «وإن من شيء إلا يسبّح بحمده».",
      "تشير الآية إلى أن كل المخلوقات منسجمة مع توحيد الله وتسبيحه.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/عناصر بناء الشخصية في الإسلام": [
    mcq(-2206, "أي عنصر يدخل في بناء الشخصية المسلمة المتوازنة؟",
      ["العقل وحده", "الجسد وحده", "العقل والعاطفة والروح والجسد", "المال فقط"],
      "C",
      "الإسلام يدعو إلى تنمية متوازنة لكل أبعاد الشخصية.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/شخصية محمد صلّى الله عليه وسلم مثال التوازن": [
    shortAnswer(-2207, "كيف تجلّى التوازن في شخصية النبي ﷺ؟",
      "في الجمع بين العبادة والعمل، والرحمة والحزم، والاهتمام بالدنيا والآخرة.",
      "كانت سيرته ﷺ نموذجاً متكاملاً يتعامل بحكمة في كل مواقف الحياة.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/الوحي: المفهوم والدلالة": [
    mcq(-2208, "ما المقصود بالوحي؟",
      ["كلام بشر", "إعلام من الله لأنبيائه بطريق خاص", "خبر صحفي", "حلم عادي"],
      "B",
      "الوحي تبليغ إلهي مخصوص بالأنبياء، إما مباشرةً أو بواسطة الملك جبريل.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/الوحي والتاريخ": [
    shortAnswer(-2209, "ما العلاقة بين الوحي والتاريخ البشري؟",
      "الوحي يوجه التاريخ ويهديه إلى قيم العدل والإنسانية ويمنحه معنى.",
      "أثّر الوحي عميقاً في مسار الحضارات.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/العلاقة بين المعلم والمتعلم": [
    mcq(-2210, "ما الأساس الذي تقوم عليه العلاقة بين المعلم والمتعلم في الإسلام؟",
      ["السلطة والإكراه", "الاحترام المتبادل والحوار والنصيحة", "اللامبالاة", "العقاب الجسدي"],
      "B",
      "أكد الإسلام على الاحترام بين المعلم والمتعلم والحوار والرحمة.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/دور التعليم في تنمية الذات": [
    shortAnswer(-2211, "كيف يسهم التعليم في تنمية الذات؟",
      "بفتح آفاق الفكر، وتنمية القدرات، وتهذيب السلوك، وبناء الشخصية.",
      "العلم يرفع الإنسان من الجهل إلى الوعي والمسؤولية.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/الدين النصيحة": [
    mcq(-2212, "ماذا يعني قول النبي ﷺ: «الدين النصيحة»؟",
      ["أن الدين كلام بلا معنى", "أن جوهر الدين الإخلاص والصدق في كل تعامل", "أن الدين عقوبات فقط", "أن الدين شعائر فقط"],
      "B",
      "النصيحة هنا تعني الإخلاص لله ولرسوله وللأئمة وعامة المسلمين.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/من مشاغل الإصلاح": [
    shortAnswer(-2213, "اذكر قضية من قضايا الإصلاح في الفكر الإسلامي الحديث.",
      "إصلاح التعليم، أو تجديد الخطاب الديني، أو محاربة الفقر والجهل.",
      "اهتم المصلحون المسلمون بقضايا الواقع المعاصر بمنطلق الكتاب والسنة.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/الاستخلاف في القرآن الكريم": [
    mcq(-2214, "ما معنى «الاستخلاف» في القرآن الكريم؟",
      ["تخريب الأرض", "تكليف الإنسان بعمارة الأرض وفق منهج الله", "إهمال الكون", "العزلة عن الحياة"],
      "B",
      "الاستخلاف يجعل الإنسان مسؤولاً عن الأرض وما فيها بالإحسان والعمل.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/الاستخلاف وحركة التاريخ": [
    shortAnswer(-2215, "كيف يؤثر مفهوم الاستخلاف في حركة التاريخ؟",
      "يجعل الإنسان فاعلاً مسؤولاً يبني الحضارة ويصلح في الأرض.",
      "الاستخلاف يدفع الإنسان للعمل والتغيير الإيجابي.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/الأمل والصحة النفسية": [
    mcq(-2216, "ما أثر الأمل في الصحة النفسية للإنسان؟",
      ["يولّد اليأس", "يعزّز الإيجابية ويقاوم القلق والاكتئاب", "لا أثر له", "يضرّ صاحبه"],
      "B",
      "الأمل من أعظم عوامل الصحة النفسية والإصرار على متابعة الحياة.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/الأمل في القرآن": [
    shortAnswer(-2217, "اذكر آية تربط بين الإيمان والأمل ورحمة الله.",
      "قوله تعالى: «لا تقنطوا من رحمة الله».",
      "تذكّر الآيات المؤمنَ بألا ييأس من رحمة الله مهما اشتدّت الأحوال.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/المصير ومعنى الحياة": [
    shortAnswer(-2218, "كيف يعطي الإيمان معنى للحياة في نظر الإسلام؟",
      "بتحديد غاية وجود الإنسان: عبادة الله وعمارة الأرض والاستعداد للآخرة.",
      "الإيمان يحول الحياة من تيه إلى مسار له هدف ومعنى.",
      { rtl: true }),
  ],
  "2eme/Éducation Islamique/الإنسان وقدره": [
    mcq(-2219, "ما العلاقة بين القدر وحرية الإنسان في الإسلام؟",
      ["الإنسان مجبَر تماماً", "الإنسان حرّ مسؤول في إطار علم الله وقدره", "لا قدر أصلاً", "الإنسان معصوم تماماً"],
      "B",
      "الإسلام يثبت حرية اختيار الإنسان مع إثبات علم الله الشامل وقدره.",
      { rtl: true }),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Histoire (RTL)
// ──────────────────────────────────────────────────────────────────────────────

const HISTOIRE: Record<string, FallbackQuestion[]> = {
  "2eme/Histoire/الدرس 1: حضارات الشرق والعالم المتوسطي في العصر القديم: تقديم عام": [
    shortAnswer(-2300, "اذكر اثنتين من حضارات الشرق القديم في العالم المتوسطي.",
      "حضارة بلاد الرافدين، وحضارة مصر الفرعونية، والحضارة اليونانية.",
      "ازدهرت في الشرق القديم حضارات نهرية وبحرية تركت أثراً عميقاً في التاريخ.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 2: بلاد الرافدين: الأطوار التاريخية والتنظيم السياسي": [
    mcq(-2301, "ما السمة السياسية البارزة في بلاد الرافدين القديمة؟",
      ["جمهورية ديمقراطية", "نظام ملكي مقدس ومدن-دول", "اتحاد فيدرالي حديث", "حكومة برلمانية"],
      "B",
      "اتسمت بلاد الرافدين بأنظمة ملكية ودينية مع تطور المدن-الدول كأور وبابل.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 3: بلاد الرافدين: الزراعة": [
    shortAnswer(-2302, "ما الذي ساعد على ازدهار الزراعة في بلاد الرافدين؟",
      "وجود نهري دجلة والفرات وشبكات الري المتطورة وخصوبة التربة.",
      "اعتمدت الحضارة الرافدية على الري المنظم لتطوير زراعة الحبوب والنخيل.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 4: بلاد الرافدين: شريعة حمورابي": [
    shortAnswer(-2303, "ما أهمية شريعة حمورابي في تاريخ بلاد الرافدين؟",
      "تمثل من أقدم القوانين المكتوبة، ونظمت جوانب من الحياة الاجتماعية والاقتصادية والقضائية.",
      "تبرز هذه الشريعة تطور التنظيم السياسي والقانوني في بلاد الرافدين.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 5: بلاد الرافدين: الديانة والعلوم والفنون": [
    mcq(-2304, "أي علم برز في حضارة بلاد الرافدين؟",
      ["علم الفلك والرياضيات", "علم الحاسوب", "علم الذرة الحديث", "علم النانو"],
      "A",
      "تقدم البابليون في الفلك والرياضيات ووضعوا التقاويم القمرية.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 6: مصر في عهد الفراعنة: الأطوار التاريخية والمؤسسات": [
    mcq(-2305, "من كان يتولى السلطة العليا في مصر الفرعونية؟",
      ["مجلس الشعب", "الفرعون باعتباره ابن الإله", "حاكم عسكري منتخب", "خليفة"],
      "B",
      "كان الفرعون يجمع السلطة الدينية والدنيوية ويُعدّ ابن الإله.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 7: مصر في عهد الفراعنة: المجتمع والحياة الاقتصادية": [
    shortAnswer(-2306, "ما النشاط الاقتصادي الأساسي في مصر القديمة؟",
      "الزراعة المعتمدة على فيضان النيل وعلى نظام ري متطور.",
      "اعتمدت مصر بشكل رئيس على زراعة الحبوب والكتان في وادي النيل.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 8: مصر في عهد الفراعنة: الديانة والعلوم والفنون": [
    mcq(-2307, "أي مظهر يدل على تطور الفنون في مصر الفرعونية؟",
      ["ابتكار الكمبيوتر", "بناء الأهرامات وفنون النحت", "اختراع الكهرباء", "الطباعة الحديثة"],
      "B",
      "أهرامات الجيزة وتماثيل الفراعنة شاهدة على تطور هندسة وفنون مصر القديمة.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 9: بلاد الإغريق في العصر الكلاسيكي: الديمقراطية الأثينية": [
    mcq(-2308, "ما خصوصية الديمقراطية الأثينية القديمة؟",
      ["تشارك جميع السكان دون استثناء", "تشارك المواطنون الأحرار في تسيير الشؤون العامة", "حكم ديكتاتوري ملكي", "حكم الكنيسة"],
      "B",
      "كانت ديمقراطية المواطنين الأحرار في مجال السياسة (دون النساء والعبيد والأجانب).",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 10: بلاد الإغريق في العصر الكلاسيكي: الإنتاج الفكري والفني": [
    shortAnswer(-2309, "اذكر شخصية فكرية بارزة في بلاد الإغريق القديمة.",
      "سقراط (أو أفلاطون، أرسطو).",
      "وضع فلاسفة اليونان أسس الفلسفة الغربية في الأخلاق والسياسة والمنطق.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 11: العالم في نهاية القرن السادس وبداية القرن السابع للميلاد": [
    shortAnswer(-2310, "كيف كان حال شبه الجزيرة العربية قبيل ظهور الإسلام؟",
      "كانت في حالة تشتت قبلي وعبادة وثنية مع وجود بعض اليهود والنصارى وأنشطة تجارية مهمة.",
      "هذا السياق هيّأ لظهور رسالة موحّدة وموحِّدة.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 12: ظهور الإسلام ومراحل انتشاره": [
    mcq(-2311, "متى بدأ نزول الوحي على النبي محمد ﷺ؟",
      ["سنة 610 م تقريباً", "سنة 800 م", "سنة 500 م", "سنة 1000 م"],
      "A",
      "بدأ الوحي حوالي سنة 610م في غار حراء بمكة المكرمة.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 13: الدولة والمجتمع في المشرق الإسلامي (1-5 هـ / 7-11 م)": [
    shortAnswer(-2312, "اذكر أبرز خليفتين راشدين بعد أبي بكر الصديق.",
      "عمر بن الخطاب ثم عثمان بن عفان (ثم علي بن أبي طالب).",
      "تتابع الخلفاء الراشدون على قيادة الدولة الإسلامية الناشئة.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 14: الازدهار الحضاري في المشرق الإسلامي (1-5 هـ / 7-11 م)": [
    mcq(-2313, "ما عاصمة الدولة العباسية في عصر ازدهارها؟",
      ["دمشق", "بغداد", "القاهرة", "الرباط"],
      "B",
      "أسس المنصور بغداد سنة 762م لتكون عاصمة العباسيين.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 15: ابن سينا": [
    shortAnswer(-2314, "بِم اشتهر ابن سينا في تاريخ العلوم؟",
      "بالطب والفلسفة وكتاب «القانون في الطب» الذي ظل مرجعاً قروناً.",
      "ابن سينا من أعلام الحضارة الإسلامية في الطب والفلسفة.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 16: مدينة بغداد": [
    mcq(-2315, "ما أبرز معالم بغداد في عصرها الذهبي؟",
      ["برج إيفل", "بيت الحكمة ومسجدها الجامع", "تاج محل", "الكولوسيوم"],
      "B",
      "اشتهرت بغداد ببيت الحكمة الذي كان مركزاً للترجمة والعلوم.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 17: التطور السياسي في الغرب الإسلامي من القرن الثاني إلى القرن التاسع للهجرة (8–15 م)": [
    shortAnswer(-2316, "اذكر دولة من دول الغرب الإسلامي في العصر الوسيط.",
      "الأغالبة، الفاطميون، الموحدون، الحفصيون (أمثلة متعددة).",
      "تعاقبت عدة دول إسلامية على المغرب وإفريقية بين القرنين الثامن والخامس عشر.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 18: التحولات الاجتماعية في الغرب الإسلامي من القرن الثاني إلى القرن التاسع للهجرة (8–15 م)": [
    shortAnswer(-2317, "اذكر ظاهرة اجتماعية بارزة في الغرب الإسلامي الوسيط.",
      "ازدهار التجارة الصحراوية والاندماج العربي البربري والاستقرار الحضري.",
      "أحدث الانتشار العربي البربري تحولات اجتماعية وثقافية كبرى.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 19: ابن رشد": [
    mcq(-2318, "ما الميدان الذي اشتهر فيه ابن رشد؟",
      ["الفلسفة وشرح أرسطو", "تجارة الذهب", "بناء المساجد فقط", "صناعة السفن"],
      "A",
      "ابن رشد فيلسوف أندلسي اشتهر بشروحه لأرسطو وتأثيره في الفكر الأوروبي.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 20: الإدريسي": [
    shortAnswer(-2319, "بِم اشتهر الشريف الإدريسي؟",
      "بالجغرافيا ورسم الخرائط، خاصة كتابه «نزهة المشتاق» وخريطته الشهيرة.",
      "الإدريسي من أعظم جغرافيي العصور الوسطى.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 21: الغرب المسيحي في حدود عام 1000 ميلادي": [
    shortAnswer(-2320, "ما السمة العامة للغرب المسيحي حوالي سنة 1000م؟",
      "تجزّؤ سياسي وفوضى نسبية وبدء تشكّل النظام الإقطاعي وسيطرة الكنيسة.",
      "كانت أوروبا تخرج تدريجياً من العصور المظلمة نحو نهضة بطيئة.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 22: المواجهة بين العالم الإسلامي والغرب المسيحي": [
    mcq(-2322, "ما المعركة التي توقف فيها التوسع الإسلامي شمالاً في أوروبا؟",
      ["معركة حطين", "معركة بلاط الشهداء (بواتييه)", "معركة عين جالوت", "معركة الأهرام"],
      "B",
      "في معركة بلاط الشهداء سنة 732م توقف تقدم المسلمين شمالاً في أوروبا.",
      { rtl: true }),
  ],
  "2eme/Histoire/الدرس 23: تأثير الحضارة الإسلامية في أوروبا": [
    shortAnswer(-2323, "اذكر مجالين تأثرت بهما أوروبا بالحضارة الإسلامية.",
      "الطب والفلسفة (والكيمياء والرياضيات والترجمة).",
      "كانت الأندلس وصقلية بوابتي العلم العربي إلى أوروبا.",
      { rtl: true }),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SHARED — Géographie (RTL)
// ──────────────────────────────────────────────────────────────────────────────

const GEOGRAPHIE: Record<string, FallbackQuestion[]> = {
  "2eme/Géographie/الدرس 1: وظائف المدينة": [
    mcq(-2400, "ما المقصود بوظيفة المدينة؟",
      ["عدد سكان المدينة فقط", "الدور أو النشاط الأساسي الذي تقوم به المدينة", "مساحة المدينة فقط", "شكل مباني المدينة"],
      "B",
      "وظيفة المدينة تعني الدور أو النشاط الذي تميّزت به مثل الوظيفة الإدارية أو التجارية أو الصناعية.",
      { rtl: true }),
  ],
  "2eme/Géographie/الدرس 2: التراتب الحضري": [
    mcq(-2401, "ما المقصود بالتراتب الحضري؟",
      ["تساوي كل المدن", "تنظيم المدن في هرم حسب الحجم والوظائف", "اختفاء المدن الصغرى", "بناء مدن خيالية"],
      "B",
      "التراتب الحضري ينظم المدن من العاصمة الكبرى إلى المدن المتوسطة فالصغيرة وفق وظائفها.",
      { rtl: true }),
  ],
  "2eme/Géographie/الدرس 3: الشبكات الحضرية": [
    shortAnswer(-2402, "ما الذي تعنيه «الشبكات الحضرية»؟",
      "ترابط المدن فيما بينها عبر طرق النقل وتدفقات السكان والاقتصاد.",
      "تشكل المدن شبكات تتبادل من خلالها السلع والخدمات والسكان.",
      { rtl: true }),
  ],
  "2eme/Géographie/الدرس 4: الحواضر الكبرى تنظّم المجال العالمي": [
    mcq(-2403, "ما دور الحواضر الكبرى على المستوى العالمي؟",
      ["دور هامشي بلا تأثير", "تنظيم المجال العالمي عبر التحكم في الاقتصاد والمعلومة", "اقتصار دورها على السياحة فقط", "غياب تأثيرها"],
      "B",
      "حواضر مثل نيويورك ولندن وطوكيو تتحكم في التدفقات المالية والمعرفية على مستوى العالم.",
      { rtl: true }),
  ],
  "2eme/Géographie/الدرس 5: وظائف المجال الريفي": [
    shortAnswer(-2404, "اذكر وظيفة من وظائف المجال الريفي.",
      "الإنتاج الفلاحي (وتربية الحيوانات، الحفاظ على البيئة، السياحة الريفية).",
      "تتنوع وظائف الريف وتشمل الفلاحة والسكن والحفاظ على البيئة.",
      { rtl: true }),
  ],
  "2eme/Géographie/الدرس 6: تنظيم المجال الريفي في العالم المتقدم": [
    mcq(-2405, "ما خصوصية الريف في العالم المتقدم؟",
      ["إنتاجية ضعيفة جداً", "تنظيم متطور وآلية وإنتاج مكثف", "غياب أي نشاط فلاحي", "اعتماده على القوة البشرية فقط"],
      "B",
      "يستفيد الريف في الدول المتقدمة من التكنولوجيا والآلات والاستثمار.",
      { rtl: true }),
  ],
  "2eme/Géographie/الدرس 7: تنظيم المجال الريفي في العالم النامي": [
    shortAnswer(-2406, "اذكر تحدياً يواجه الريف في العالم النامي.",
      "ضعف البنية التحتية، صغر الاستغلاليات، الفقر، أو الهجرة نحو المدن.",
      "يعاني ريف الدول النامية من تحديات تنموية مهمة.",
      { rtl: true }),
  ],
  "2eme/Géographie/الدرس 8: شبكات النقل والاتصال": [
    mcq(-2407, "ما دور شبكات النقل في تنظيم المجال؟",
      ["تعزل المناطق", "تربط المناطق وتنشّط التبادل الاقتصادي والاجتماعي", "تحدّ من التطور", "تعطل الاقتصاد"],
      "B",
      "شبكات النقل تربط المناطق وتعزز ديناميكيتها الاقتصادية.",
      { rtl: true }),
  ],
  "2eme/Géographie/الدرس 9: دور شبكات النقل والاتصال في تنظيم المجال": [
    shortAnswer(-2408, "كيف يساهم النقل في تنظيم المجال؟",
      "بربط الأقاليم، توزيع المنتوجات، وتقريب المسافات بين السكان والأسواق.",
      "النقل هو شريان الحركية الاقتصادية والاجتماعية للمجال.",
      { rtl: true }),
  ],
  "2eme/Géographie/الدرس 10: تهيئة منطقة سياحية": [
    mcq(-2409, "ما الهدف الأساسي من تهيئة منطقة سياحية؟",
      ["تعطيل الاقتصاد المحلي", "استثمار الموارد الطبيعية والثقافية وتوفير مرافق للسياح", "تهجير السكان", "حصر المنطقة"],
      "B",
      "تهيئة المنطقة السياحية تهدف إلى تثمين مؤهلاتها وتطوير اقتصادها.",
      { rtl: true }),
  ],
  "2eme/Géographie/الدرس 11: تهيئة منطقة صناعية": [
    shortAnswer(-2410, "ما الذي يستلزمه تهيئة منطقة صناعية ناجحة؟",
      "بنية تحتية وطاقة ونقل ويد عاملة مؤهلة وقرب من الأسواق.",
      "تستوجب التهيئة الصناعية عدة عوامل مترابطة لنجاح الاستثمار.",
      { rtl: true }),
  ],
  "2eme/Géographie/الدرس 12: تهيئة منطقة سقوية": [
    mcq(-2411, "ما الهدف الأساسي من تهيئة منطقة سقوية؟",
      ["تجفيف الأراضي", "تطوير الفلاحة المسقية وزيادة الإنتاج", "إيقاف الزراعة", "تركيز السياحة"],
      "B",
      "تهيئة المناطق السقوية تهدف إلى تكثيف الإنتاج الفلاحي بفضل الري المنظم.",
      { rtl: true }),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// LETTRES — Mathématiques (6 chapters)
// ──────────────────────────────────────────────────────────────────────────────

const MATH_LETTRES: Record<string, FallbackQuestion[]> = {
  "2eme/lettres/Mathématiques/Pourcentage": [
    problem(-2500,
      "Un article coûte 80 D. Son prix augmente de 15 %. Calcule le nouveau prix.",
      "92 D",
      "15 % de 80 = 12. Nouveau prix = 80 + 12 = 92 D.",
      { difficulty: "facile" }),
    mcq(-2501,
      "Un produit à 200 D bénéficie d'une remise de 10 %. Quel est le prix après remise ?",
      ["220 D", "190 D", "180 D", "210 D"], "C",
      "10 % de 200 = 20. Prix après remise = 200 − 20 = 180 D."),
  ],
  "2eme/lettres/Mathématiques/Suites arithmétiques - Suites géométriques": [
    mcq(-2502,
      "Une suite arithmétique a pour premier terme 5 et pour raison 3. Quel est le 4ème terme ?",
      ["8", "11", "14", "17"], "C",
      "Les termes sont 5, 8, 11, 14. Le 4ème terme est 14."),
    problem(-2503,
      "Soit la suite géométrique de premier terme 2 et de raison 3. Calcule u₄.",
      "u₄ = 54",
      "Suite géométrique: uₙ = u₁ × r^(n−1). Donc u₄ = 2 × 3³ = 2 × 27 = 54."),
  ],
  "2eme/lettres/Mathématiques/Équations et inéquations": [
    problem(-2504,
      "Résous l'équation : 3(2x − 5) + 4x = 5x − 1.",
      "x = 14/5",
      "3(2x−5)+4x = 6x−15+4x = 10x−15 = 5x−1 ; 5x = 14 ; x = 14/5."),
  ],
  "2eme/lettres/Mathématiques/Systèmes d'équations": [
    problem(-2505,
      "Résous le système : { x + y = 10 ; x − y = 4 }.",
      "x = 7 ; y = 3",
      "En additionnant : 2x = 14 ; x = 7. Puis y = 10 − 7 = 3."),
  ],
  "2eme/lettres/Mathématiques/Fonctions": [
    mcq(-2506,
      "Soit f(x) = 2x − 3. Quelle est l'image de 4 ?",
      ["5", "8", "11", "−5"], "A",
      "f(4) = 2 × 4 − 3 = 8 − 3 = 5."),
  ],
  "2eme/lettres/Mathématiques/Statistiques": [
    problem(-2507,
      "Calcule la moyenne arithmétique des notes : 10, 12, 14, 16, 18.",
      "14",
      "Somme = 10+12+14+16+18 = 70 ; moyenne = 70/5 = 14."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// LETTRES — SVT (14 chapters)
// ──────────────────────────────────────────────────────────────────────────────

const SVT_LETTRES: Record<string, FallbackQuestion[]> = {
  "2eme/lettres/SVT/Les habitudes et les besoins alimentaires": [
    mcq(-2550,
      "Les besoins alimentaires d'un individu dépendent surtout :",
      ["uniquement de son humeur", "de son âge, de son sexe et de son activité physique", "uniquement de la saison", "uniquement de son pays"], "B",
      "Les besoins varient selon l'âge, le sexe, l'activité et l'état physiologique."),
  ],
  "2eme/lettres/SVT/La malnutrition, conséquence de certaines habitudes alimentaires: Obésité et carence alimentaire": [
    shortAnswer(-2551,
      "Quelle est la différence entre obésité et carence alimentaire ?",
      "L'obésité résulte d'un excès d'apports énergétiques ; la carence d'un manque d'un ou plusieurs nutriments.",
      "Les deux sont des formes de malnutrition par déséquilibre."),
  ],
  "2eme/lettres/SVT/L'alimentation équilibrée": [
    mcq(-2552,
      "Quelle est la caractéristique d'une alimentation équilibrée ?",
      ["Manger un seul type d'aliment", "Apport varié et adapté en glucides, lipides, protéines, vitamines et minéraux", "Sauter le petit-déjeuner", "Ne manger que des sucres"], "B",
      "L'équilibre alimentaire combine les différents groupes d'aliments."),
  ],
  "2eme/lettres/SVT/Le choix et la conservation des aliments": [
    shortAnswer(-2553,
      "Cite deux moyens de conserver les aliments.",
      "Le froid (réfrigération/congélation) et la pasteurisation (ou le séchage, l'appertisation).",
      "La conservation ralentit la prolifération microbienne."),
  ],
  "2eme/lettres/SVT/L'eau potable: propriétés et origine": [
    mcq(-2554,
      "Une eau potable est une eau qui :",
      ["contient beaucoup de germes", "ne présente pas de risque pour la santé selon les normes", "est trouble", "a une odeur forte"], "B",
      "L'eau potable répond à des critères microbiologiques et chimiques stricts."),
  ],
  "2eme/lettres/SVT/Les risques liés à la pollution de l'eau potable et les moyens de protection des ressources en eau": [
    shortAnswer(-2555,
      "Cite une source courante de pollution de l'eau.",
      "Les rejets industriels, agricoles (engrais, pesticides) ou domestiques.",
      "Protéger les ressources en eau passe par le traitement et la prévention des rejets."),
  ],
  "2eme/lettres/SVT/Le Kyste hydatique": [
    mcq(-2556,
      "Le kyste hydatique est provoqué par :",
      ["un virus", "un parasite (Echinococcus) transmis par le chien", "une bactérie aérienne", "un champignon de la peau"], "B",
      "L'homme se contamine par l'ingestion d'œufs du parasite émis par les chiens infectés."),
  ],
  "2eme/lettres/SVT/L'Oxyurose": [
    shortAnswer(-2557,
      "Quel est l'agent responsable de l'oxyurose ?",
      "Un ver parasite : l'oxyure (Enterobius vermicularis).",
      "L'oxyurose touche surtout les enfants et se traite par déparasitage et hygiène."),
  ],
  "2eme/lettres/SVT/La Toxoplasmose": [
    mcq(-2558,
      "La toxoplasmose présente un risque particulier pour :",
      ["les sportifs uniquement", "les femmes enceintes", "les personnes âgées seulement", "les nouveau-nés en bonne santé"], "B",
      "Pendant la grossesse, la toxoplasmose peut provoquer des malformations chez le fœtus."),
  ],
  "2eme/lettres/SVT/Le Sida": [
    mcq(-2559,
      "Le virus responsable du Sida est :",
      ["la grippe", "le VIH", "le rotavirus", "le tétanos"], "B",
      "Le VIH (Virus de l'Immunodéficience Humaine) provoque le Sida."),
  ],
  "2eme/lettres/SVT/Le tabagisme": [
    mcq(-2560,
      "Le tabac augmente principalement le risque de :",
      ["bonne santé", "cancers du poumon et maladies cardiovasculaires", "vue parfaite", "réussite scolaire"], "B",
      "Le tabac est un facteur de risque majeur de cancers et de maladies cardiovasculaires."),
  ],
  "2eme/lettres/SVT/L'alcoolisme": [
    shortAnswer(-2561,
      "Cite une conséquence grave de l'alcoolisme chronique.",
      "Atteinte du foie (cirrhose), troubles neurologiques, dépendance.",
      "L'alcoolisme touche plusieurs organes et a un impact social fort."),
  ],
  "2eme/lettres/SVT/Les drogues": [
    mcq(-2562,
      "Les drogues agissent surtout sur :",
      ["le système osseux", "le système nerveux central", "les ongles", "les muscles uniquement"], "B",
      "Les drogues psychoactives modifient le fonctionnement du système nerveux central."),
  ],
  "2eme/lettres/SVT/Quelques stratégies de prévention et de lutte contre les toxicomanies": [
    shortAnswer(-2563,
      "Cite une stratégie de prévention contre la toxicomanie.",
      "L'éducation, la sensibilisation, le sport, le soutien familial et social.",
      "La prévention combine information, accompagnement et alternatives saines."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SCIENCES — Mathématiques (Tome 1 + 2, 19 chapters)
// Will be duplicated to technologie_informatique by seed.
// ──────────────────────────────────────────────────────────────────────────────

const MATH_SCIENCES_TECH: Record<string, FallbackQuestion[]> = {
  "2eme/sciences/Mathématiques/Chapitre 1: Calcul dans IR": [
    problem(-2600,
      "Calcule et simplifie : 3(2x − 5) + 4x.",
      "10x − 15",
      "3(2x−5) = 6x − 15. Puis 6x − 15 + 4x = 10x − 15."),
    mcq(-2601,
      "Quelle proposition est correcte pour tous les réels a et b ?",
      ["(a + b)² = a² + b²", "(a + b)² = a² + 2ab + b²", "(a − b)² = a² − b²", "a × 0 = a"], "B",
      "C'est l'identité remarquable (a + b)² = a² + 2ab + b²."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 2: Problèmes du 1er degré et problèmes du second degré": [
    problem(-2602,
      "Résous : x² − 5x + 6 = 0.",
      "x = 2 ou x = 3",
      "Δ = 25 − 24 = 1 ; x = (5 ± 1)/2 → x = 2 ou x = 3."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 3: Notion de polynômes": [
    mcq(-2603,
      "Quel est le degré du polynôme P(x) = 2x³ − x + 7 ?",
      ["1", "2", "3", "7"], "C",
      "Le degré est la plus grande puissance de x, donc 3."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 4: Arithmétique": [
    problem(-2604,
      "Donne le PGCD de 24 et 36.",
      "12",
      "24 = 2³ × 3, 36 = 2² × 3². PGCD = 2² × 3 = 12."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 5: Calcul vectoriel": [
    mcq(-2605,
      "Soit ABCD un parallélogramme. Que vaut AB + AD ?",
      ["AC", "BD", "0", "DA"], "A",
      "Par la règle du parallélogramme, AB + AD = AC."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 6: Barycentre": [
    shortAnswer(-2606,
      "Qu'est-ce que le barycentre de deux points pondérés (A, α) et (B, β) avec α + β ≠ 0 ?",
      "C'est le point G tel que α·GA + β·GB = 0.",
      "G = (αA + βB)/(α + β) — c'est le point d'équilibre des poids."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 7: Translations": [
    mcq(-2607,
      "Une translation de vecteur u envoie A sur A'. Quelle égalité est correcte ?",
      ["AA' = u", "A'A = u", "AA' = -u", "AA' = 0"], "A",
      "La translation de vecteur u définit AA' = u."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 8: Homothéties": [
    mcq(-2608,
      "Une homothétie de centre O et de rapport k = 2 transforme un point M en M'. Que vaut OM' ?",
      ["OM' = OM", "OM' = 2·OM", "OM' = -OM", "OM' = 0"], "B",
      "L'homothétie de rapport k multiplie OM par k : OM' = 2·OM."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 9: Rotations": [
    mcq(-2609,
      "Une rotation de centre O et d'angle 90° conserve :",
      ["seulement les longueurs", "les distances et les angles", "ni les distances ni les angles", "uniquement les directions"], "B",
      "Toute rotation est une isométrie : elle conserve distances et angles."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 1: Suites arithmétiques": [
    mcq(-2610,
      "Une suite arithmétique a u₁ = 5 et de raison r = 3. Quel est u₄ ?",
      ["8", "11", "14", "17"], "C",
      "u₄ = u₁ + 3r = 5 + 9 = 14."),
    problem(-2611,
      "Calcule la somme des 10 premiers termes d'une suite arithmétique de premier terme 1 et de raison 2.",
      "100",
      "Termes : 1, 3, 5, …, 19. Somme = (1 + 19) × 10 / 2 = 100."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 2: Suites géométriques": [
    problem(-2612,
      "Soit la suite géométrique de premier terme 3 et de raison 2. Calcule u₅.",
      "u₅ = 48",
      "uₙ = u₁ × r^(n−1) ; u₅ = 3 × 2⁴ = 3 × 16 = 48."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 3: Généralités sur les fonctions": [
    mcq(-2613,
      "Soit f(x) = x². Quelle est l'image de −3 ?",
      ["−9", "9", "6", "−6"], "B",
      "f(−3) = (−3)² = 9."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 4: Fonctions de références": [
    mcq(-2614,
      "Quelle est la courbe représentative de f(x) = x² ?",
      ["une droite", "une parabole", "un cercle", "une hyperbole"], "B",
      "x² est une fonction du second degré, représentée par une parabole."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 5: Trigonométrie et mesure des grandeurs": [
    problem(-2615,
      "Calcule cos(60°) + sin(30°).",
      "1",
      "cos(60°) = 1/2 et sin(30°) = 1/2 ; somme = 1."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 6: Géométrie analytique": [
    problem(-2616,
      "Dans un repère, A(1 ; 2) et B(4 ; 6). Calcule AB.",
      "AB = 5",
      "AB = √((4−1)² + (6−2)²) = √(9 + 16) = √25 = 5."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 7: Droites et plans de l'espace": [
    mcq(-2617,
      "Deux droites de l'espace peuvent être :",
      ["parallèles, sécantes ou non coplanaires", "uniquement perpendiculaires", "toujours sécantes", "toujours parallèles"], "A",
      "Dans l'espace, deux droites peuvent être coplanaires (parallèles ou sécantes) ou non coplanaires."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 8: Parallélisme dans l'espace": [
    mcq(-2618,
      "Une droite parallèle à un plan :",
      ["coupe ce plan en un point", "n'a aucun point commun avec ce plan", "est contenue dans le plan", "est perpendiculaire au plan"], "B",
      "Une droite parallèle à un plan ne le coupe pas."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 9: Orthogonalité dans l'espace": [
    shortAnswer(-2619,
      "Qu'est-ce qu'une droite orthogonale à un plan ?",
      "C'est une droite perpendiculaire à toutes les droites du plan passant par le pied de la perpendiculaire.",
      "Elle est orthogonale au plan si elle est perpendiculaire à toute droite de ce plan."),
  ],
  "2eme/sciences/Mathématiques/Chapitre 10: Statistiques": [
    problem(-2620,
      "Calcule la moyenne des notes : 8, 12, 14, 16, 10.",
      "12",
      "Somme = 60 ; moyenne = 60/5 = 12."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SCIENCES — Physique-Chimie (8 chapters)
// ──────────────────────────────────────────────────────────────────────────────

const PHYS_SCIENCES: Record<string, FallbackQuestion[]> = {
  "2eme/sciences/Physique-Chimie/Chapitre 1: Puissance et énergie électrique": [
    problem(-2700,
      "Un appareil de puissance 100 W fonctionne pendant 2 h. Calcule l'énergie consommée en Wh.",
      "200 Wh",
      "E = P × t = 100 × 2 = 200 Wh."),
    mcq(-2701,
      "Quelle relation lie la puissance, la tension et l'intensité ?",
      ["P = U + I", "P = U × I", "P = U − I", "U = P × I"], "B",
      "En continu : P = U × I."),
  ],
  "2eme/sciences/Physique-Chimie/Chapitre 2: Conductibilité électrique": [
    mcq(-2702,
      "Lequel des matériaux suivants est un bon conducteur électrique ?",
      ["Le bois", "Le cuivre", "Le verre", "Le plastique"], "B",
      "Le cuivre est un excellent conducteur ; bois, verre et plastique sont isolants."),
  ],
  "2eme/sciences/Physique-Chimie/Chapitre 3: Récepteurs passifs (1)": [
    mcq(-2703,
      "Pour un résistor ohmique, quelle relation relie U, R et I ?",
      ["U = R + I", "U = R × I", "R = U × I", "I = U × R"], "B",
      "Loi d'Ohm : U = R × I."),
    problem(-2704,
      "On applique U = 12 V aux bornes d'un résistor R = 4 Ω. Calcule I.",
      "I = 3 A",
      "I = U/R = 12/4 = 3 A."),
  ],
  "2eme/sciences/Physique-Chimie/Chapitre 4: Récepteurs passifs (2)": [
    mcq(-2705,
      "Deux résistors R₁ = 6 Ω et R₂ = 4 Ω sont en série. Quelle est leur résistance équivalente ?",
      ["2 Ω", "10 Ω", "24 Ω", "0,4 Ω"], "B",
      "En série, R = R₁ + R₂ = 6 + 4 = 10 Ω."),
  ],
  "2eme/sciences/Physique-Chimie/Chapitre 5: Récepteurs actifs": [
    shortAnswer(-2706,
      "Donne un exemple de récepteur actif et son rôle.",
      "Le moteur électrique : il transforme l'énergie électrique en énergie mécanique.",
      "Les récepteurs actifs convertissent l'énergie électrique en une autre forme exploitable."),
  ],
  "2eme/sciences/Physique-Chimie/Chapitre 6: Le dipôle générateur": [
    mcq(-2707,
      "Une pile présente une f.é.m. E = 4,5 V et une résistance interne r = 0,5 Ω. Si elle débite I = 1 A, la tension à ses bornes est :",
      ["5 V", "4 V", "4,5 V", "0,5 V"], "B",
      "U = E − r × I = 4,5 − 0,5 = 4 V."),
  ],
  "2eme/sciences/Physique-Chimie/Chapitre 7: Adaptation: Loi de Pouillet": [
    problem(-2708,
      "Un circuit fermé contient un générateur de f.é.m. E = 12 V et de résistance interne r = 1 Ω, alimentant une résistance R = 5 Ω. Calcule I.",
      "I = 2 A",
      "Loi de Pouillet : I = E/(R + r) = 12/(5 + 1) = 2 A."),
  ],
  "2eme/sciences/Physique-Chimie/Chapitre 8: Le courant alternatif": [
    mcq(-2709,
      "Quelle est la fréquence du courant alternatif domestique en Tunisie/Europe ?",
      ["50 Hz", "60 Hz", "100 Hz", "10 Hz"], "A",
      "Le réseau européen et tunisien fonctionne à 50 Hz."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// SCIENCES — SVT (17 chapters)
// ──────────────────────────────────────────────────────────────────────────────

const SVT_SCIENCES: Record<string, FallbackQuestion[]> = {
  "2eme/sciences/SVT/La cellule: unité structurale des êtres vivants": [
    mcq(-2750,
      "Quel énoncé décrit le mieux la cellule ?",
      ["Une particule sans vie", "L'unité structurale et fonctionnelle des êtres vivants", "Une molécule chimique simple", "Un organe complexe"], "B",
      "La cellule est l'unité de base structurale et fonctionnelle de tout être vivant."),
  ],
  "2eme/sciences/SVT/Ultrastructure de la cellule eucaryote": [
    mcq(-2751,
      "Quel organite est principalement responsable de la respiration cellulaire ?",
      ["Le noyau", "La mitochondrie", "La membrane plasmique", "Le chloroplaste"], "B",
      "La mitochondrie est le siège principal de la respiration cellulaire."),
  ],
  "2eme/sciences/SVT/La mitose: mécanisme de la reproduction conforme": [
    shortAnswer(-2752,
      "Pourquoi dit-on que la mitose est une reproduction conforme ?",
      "Parce qu'elle donne deux cellules filles ayant la même information génétique que la cellule mère.",
      "La mitose conserve le même nombre et la même nature de chromosomes."),
  ],
  "2eme/sciences/SVT/Les Chromosomes": [
    mcq(-2753,
      "Combien de chromosomes possède une cellule humaine (hors gamètes) ?",
      ["23", "46", "92", "12"], "B",
      "Les cellules somatiques humaines contiennent 46 chromosomes (23 paires)."),
  ],
  "2eme/sciences/SVT/Localisation, nature et structure de l'information génétique": [
    mcq(-2754,
      "Où se trouve l'information génétique dans la cellule eucaryote ?",
      ["Dans le cytoplasme uniquement", "Principalement dans le noyau, sous forme d'ADN", "Sur la membrane uniquement", "Dans les ribosomes"], "B",
      "L'ADN est principalement dans le noyau ; on en trouve aussi dans les mitochondries."),
  ],
  "2eme/sciences/SVT/La carte topographique": [
    mcq(-2755,
      "Que représente une carte topographique ?",
      ["La répartition des étoiles", "Le relief et les paysages d'une région à une échelle donnée", "Les courants marins uniquement", "L'organisation des cellules"], "B",
      "La carte topographique représente le relief par des courbes de niveau."),
  ],
  "2eme/sciences/SVT/Notion de stratigraphie et de tectonique": [
    shortAnswer(-2756,
      "Que désigne la stratigraphie ?",
      "L'étude des couches sédimentaires, de leur ordre et de leur âge.",
      "La stratigraphie permet de reconstituer l'histoire géologique d'une région."),
  ],
  "2eme/sciences/SVT/La carte géologique": [
    mcq(-2757,
      "Quel est le rôle d'une carte géologique ?",
      ["Représenter les rues d'une ville", "Représenter la nature et la disposition des roches en surface", "Indiquer la météo", "Cartographier des satellites"], "B",
      "La carte géologique cartographie les formations rocheuses affleurantes."),
  ],
  "2eme/sciences/SVT/Les ressources en eau et leur exploitation": [
    shortAnswer(-2758,
      "Cite deux sources d'eau exploitables.",
      "Les nappes souterraines et les eaux de surface (fleuves, barrages).",
      "L'exploitation rationnelle protège les ressources et l'environnement."),
  ],
  "2eme/sciences/SVT/Une roche sédimentaire à intérêt économique: les phosphates": [
    mcq(-2759,
      "Le phosphate est exploité principalement pour fabriquer :",
      ["du verre", "des engrais et de l'acide phosphorique", "de l'aluminium", "du fer"], "B",
      "Les phosphates sont la matière première essentielle des engrais."),
  ],
  "2eme/sciences/SVT/Une roche sédimentaire à intérêt économique: le pétrole": [
    mcq(-2760,
      "Le pétrole est une ressource :",
      ["renouvelable", "non renouvelable", "infinie", "minérale métallique"], "B",
      "Le pétrole est un combustible fossile non renouvelable à l'échelle humaine."),
  ],
  "2eme/sciences/SVT/Gestion rationnelle d'un écosystème": [
    shortAnswer(-2761,
      "Qu'est-ce que la gestion rationnelle d'un écosystème ?",
      "L'exploitation des ressources d'un écosystème sans nuire à sa pérennité.",
      "Elle vise un équilibre entre besoins humains et conservation."),
  ],
  "2eme/sciences/SVT/Adaptation des végétaux et des animaux aux conditions défavorables": [
    mcq(-2762,
      "Quelle adaptation permet aux plantes du désert d'économiser l'eau ?",
      ["Très grandes feuilles plates", "Feuilles transformées en épines et stockage de l'eau", "Racines superficielles seulement", "Absence totale de racines"], "B",
      "Les plantes désertiques limitent la transpiration et stockent l'eau (cactacées)."),
  ],
  "2eme/sciences/SVT/La répartition des végétaux en Tunisie": [
    shortAnswer(-2763,
      "Cite un type de végétation typique du nord de la Tunisie.",
      "La forêt méditerranéenne (chêne-liège, chêne-zéen).",
      "Le nord humide favorise une végétation forestière variée."),
  ],
  "2eme/sciences/SVT/Relations trophiques et cycle de la matière": [
    mcq(-2764,
      "Quel rôle jouent les décomposeurs dans un écosystème ?",
      ["Producteurs primaires", "Recyclage de la matière organique en matière minérale", "Prédateurs supérieurs", "Producteurs secondaires"], "B",
      "Les décomposeurs ferment la boucle du cycle de la matière."),
  ],
  "2eme/sciences/SVT/Principaux types de relations trophiques": [
    mcq(-2765,
      "La relation entre un lion et une gazelle est principalement :",
      ["mutualisme", "prédation", "parasitisme", "compétition entre plantes"], "B",
      "Le lion (prédateur) chasse la gazelle (proie) : relation de prédation."),
  ],
  "2eme/sciences/SVT/Vers une gestion rationnelle de l'écosystème, notion de développement durable": [
    shortAnswer(-2766,
      "Qu'est-ce que le développement durable ?",
      "Un développement qui répond aux besoins du présent sans compromettre ceux des générations futures.",
      "Il combine viabilité économique, équité sociale et préservation environnementale."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// TECHNOLOGIE INFORMATIQUE — Informatique (curriculum has many sub-headings;
// we cover the 12 main chapters with 1–3 questions each)
// ──────────────────────────────────────────────────────────────────────────────

const INFO_TI: Record<string, FallbackQuestion[]> = {
  "2eme/technologie_informatique/Informatique/Chapitre 1: Culture informatique": [
    mcq(-2800,
      "Qu'est-ce que l'informatique ?",
      ["L'étude des plantes", "La science du traitement automatique de l'information", "L'art de la peinture", "La science du climat"], "B",
      "L'informatique traite l'information par des machines automatiques."),
  ],
  "2eme/technologie_informatique/Informatique/L'informatique: définition, historique et domaine d'utilisation": [
    shortAnswer(-2801,
      "Cite deux domaines d'application de l'informatique.",
      "La santé, l'éducation, l'industrie, les transports, l'administration, etc.",
      "L'informatique transforme tous les secteurs de la société moderne."),
  ],
  "2eme/technologie_informatique/Informatique/Notions d'information et de numérisation": [
    mcq(-2802,
      "Numériser une information, c'est :",
      ["la coder en chiffres binaires (0 et 1)", "la dessiner", "la jeter", "la transformer en son uniquement"], "A",
      "La numérisation représente toute information par une suite de 0 et 1."),
  ],
  "2eme/technologie_informatique/Informatique/Notion de logiciels": [
    mcq(-2803,
      "Lequel des éléments suivants est un logiciel ?",
      ["L'écran", "Microsoft Word", "La carte mère", "Le clavier"], "B",
      "Word est un logiciel d'application ; les autres sont du matériel."),
  ],
  "2eme/technologie_informatique/Informatique/Chapitre 2: Architecture d'un micro-ordinateur": [
    mcq(-2804,
      "Quel composant exécute les instructions d'un programme ?",
      ["Le disque dur", "Le processeur (CPU)", "La mémoire RAM", "L'écran"], "B",
      "Le processeur est l'unité centrale qui exécute les instructions."),
  ],
  "2eme/technologie_informatique/Informatique/Définition d'un ordinateur": [
    shortAnswer(-2805,
      "Donne une définition simple de l'ordinateur.",
      "Une machine électronique programmable capable de traiter automatiquement de l'information.",
      "L'ordinateur combine matériel et logiciel pour exécuter des tâches."),
  ],
  "2eme/technologie_informatique/Informatique/Chapitre 3: Systèmes d'exploitation et réseaux informatiques": [
    mcq(-2806,
      "Quel rôle joue le système d'exploitation ?",
      ["Décorer l'écran", "Gérer le matériel et permettre aux logiciels de s'exécuter", "Imprimer uniquement", "Faire des calculs scientifiques"], "B",
      "Le système d'exploitation est l'intermédiaire entre matériel et logiciels."),
  ],
  "2eme/technologie_informatique/Informatique/Système d'exploitation: présentation et rôles": [
    shortAnswer(-2807,
      "Cite un exemple de système d'exploitation.",
      "Windows, Linux, macOS, Android.",
      "Chaque système d'exploitation gère le matériel à sa façon."),
  ],
  "2eme/technologie_informatique/Informatique/Notions de fichiers et de répertoires": [
    mcq(-2808,
      "Qu'est-ce qu'un répertoire (ou dossier) ?",
      ["Un type de fichier vidéo", "Un conteneur servant à organiser des fichiers", "Une mémoire interne du CPU", "Un port USB"], "B",
      "Un répertoire regroupe des fichiers et sous-répertoires."),
  ],
  "2eme/technologie_informatique/Informatique/Les réseaux informatiques": [
    mcq(-2809,
      "Qu'est-ce qu'un réseau informatique ?",
      ["Un seul ordinateur isolé", "Un ensemble d'ordinateurs interconnectés pour échanger des données", "Un logiciel de dessin", "Un câble électrique simple"], "B",
      "Un réseau permet l'échange d'informations entre ordinateurs."),
  ],
  "2eme/technologie_informatique/Informatique/Les différents types": [
    mcq(-2810,
      "Un réseau local (LAN) est un réseau :",
      ["mondial", "limité à un site (école, entreprise)", "uniquement sans fil", "lent par définition"], "B",
      "Un LAN couvre une zone géographique limitée."),
  ],
  "2eme/technologie_informatique/Informatique/Les avantages d'un réseau": [
    shortAnswer(-2811,
      "Cite un avantage d'un réseau informatique en classe.",
      "Partage de fichiers, d'imprimantes et accès à Internet pour tous.",
      "Le réseau facilite la collaboration et l'accès commun aux ressources."),
  ],
  "2eme/technologie_informatique/Informatique/Les topologies": [
    mcq(-2811 - 1,
      "Quelle est une topologie réseau classique ?",
      ["Triangle", "Étoile", "Cube", "Sphère"], "B",
      "Étoile, bus et anneau sont des topologies classiques."),
  ],
  "2eme/technologie_informatique/Informatique/Chapitre 4: Éléments de multimédia": [
    mcq(-2813,
      "Le multimédia combine :",
      ["uniquement du texte", "texte, image, son et vidéo", "uniquement des chiffres", "uniquement la voix"], "B",
      "Le multimédia intègre différents médias dans un même support."),
  ],
  "2eme/technologie_informatique/Informatique/Le traitement de texte": [
    mcq(-2814,
      "Lequel de ces logiciels est un traitement de texte ?",
      ["Excel", "Word", "Paint", "VLC"], "B",
      "Word est un logiciel de traitement de texte."),
  ],
  "2eme/technologie_informatique/Informatique/L'image": [
    shortAnswer(-2815,
      "Cite un format d'image courant.",
      "JPEG, PNG, GIF.",
      "Chaque format a ses usages (photos, transparence, animation)."),
  ],
  "2eme/technologie_informatique/Informatique/Le son": [
    mcq(-2816,
      "Lequel de ces formats est un format audio ?",
      ["MP4", "MP3", "JPG", "PDF"], "B",
      "MP3 est un format audio compressé largement répandu."),
  ],
  "2eme/technologie_informatique/Informatique/La vidéo": [
    mcq(-2817,
      "Lequel de ces formats est un format vidéo ?",
      ["MP3", "MP4", "TXT", "PNG"], "B",
      "MP4 est un format vidéo couramment utilisé."),
  ],
  "2eme/technologie_informatique/Informatique/Chapitre 5: Internet": [
    mcq(-2818,
      "Qu'est-ce qu'Internet ?",
      ["Un seul ordinateur", "Un réseau mondial reliant des millions d'ordinateurs", "Un câble électrique", "Une imprimante"], "B",
      "Internet est un réseau mondial décentralisé."),
  ],
  "2eme/technologie_informatique/Informatique/Les services d'Internet": [
    shortAnswer(-2819,
      "Cite deux services d'Internet.",
      "Le Web, le courrier électronique, le partage de fichiers, la messagerie instantanée.",
      "Internet regroupe plusieurs services au service de la communication et de l'information."),
  ],
  "2eme/technologie_informatique/Informatique/Chapitre 6: Éléments de présentation": [
    mcq(-2820,
      "Quel logiciel sert à créer des présentations ?",
      ["PowerPoint", "Photoshop", "Audacity", "Notepad"], "A",
      "PowerPoint (ou Impress, Keynote) sert à créer des diaporamas."),
  ],
  "2eme/technologie_informatique/Informatique/La production de pages Web": [
    mcq(-2821,
      "Quel langage est utilisé pour structurer une page Web ?",
      ["Python", "HTML", "Java", "C#"], "B",
      "HTML est le langage de structuration des pages Web."),
  ],
  "2eme/technologie_informatique/Informatique/Chapitre 7: Introduction à la résolution de problèmes et à la programmation": [
    mcq(-2822,
      "À quoi sert un algorithme ?",
      ["À décorer une page", "À décrire les étapes nécessaires pour résoudre un problème", "À supprimer les données", "À remplacer l'ordinateur"], "B",
      "Un algorithme est une suite d'étapes ordonnées permettant de résoudre un problème."),
  ],
  "2eme/technologie_informatique/Informatique/Spécification et analyse d'un problème": [
    shortAnswer(-2823,
      "Cite deux étapes importantes pour analyser un problème.",
      "Identifier les données (entrées), les résultats attendus (sorties), et les traitements nécessaires.",
      "L'analyse précède la conception de l'algorithme."),
  ],
  "2eme/technologie_informatique/Informatique/Chapitre 8: Les structures de données": [
    mcq(-2824,
      "Qu'est-ce qu'une constante en programmation ?",
      ["Une valeur qui change à chaque exécution", "Une valeur fixe pendant toute l'exécution du programme", "Une fonction", "Un commentaire"], "B",
      "Une constante conserve la même valeur pendant l'exécution."),
  ],
  "2eme/technologie_informatique/Informatique/Les variables": [
    shortAnswer(-2825,
      "Qu'est-ce qu'une variable ?",
      "Un emplacement mémoire nommé qui peut contenir une valeur modifiable pendant l'exécution.",
      "Une variable a un nom, un type et une valeur."),
  ],
  "2eme/technologie_informatique/Informatique/Les types de données": [
    mcq(-2826,
      "Lequel de ces éléments est un type de données ?",
      ["entier", "fonction", "boucle", "commentaire"], "A",
      "Entier, réel, caractère, chaîne, booléen sont des types de données classiques."),
  ],
  "2eme/technologie_informatique/Informatique/Chapitre 9: Les structures simples": [
    mcq(-2827,
      "L'instruction LIRE x permet :",
      ["d'afficher x", "de lire une valeur entrée par l'utilisateur dans x", "de supprimer x", "de copier le fichier"], "B",
      "LIRE attend une valeur saisie par l'utilisateur et la stocke dans x."),
  ],
  "2eme/technologie_informatique/Informatique/L'affectation": [
    problem(-2828,
      "Quelle est la valeur de x après l'affectation suivante : x ← 3 + 2 × 4 ?",
      "x = 11",
      "On évalue 3 + 2 × 4 = 3 + 8 = 11."),
  ],
  "2eme/technologie_informatique/Informatique/Chapitre 10: Les structures de contrôle conditionnelles": [
    mcq(-2829,
      "À quoi sert une structure conditionnelle ?",
      ["À répéter une action", "À exécuter une instruction selon le résultat d'un test", "À déclarer une constante", "À afficher du texte uniquement"], "B",
      "La structure conditionnelle (SI) permet l'exécution conditionnelle."),
  ],
  "2eme/technologie_informatique/Informatique/Chapitre 11: Les structures de contrôle itératives": [
    mcq(-2830,
      "Une structure itérative sert à :",
      ["déclarer une variable", "répéter une action plusieurs fois", "afficher une seule ligne", "déclarer une fonction"], "B",
      "Les structures itératives (POUR, TANT QUE) répètent un bloc d'instructions."),
  ],
  "2eme/technologie_informatique/Informatique/La structure itérative complète": [
    problem(-2831,
      "Combien de fois la boucle « POUR i ← 1 à 5 FAIRE … FIN POUR » s'exécute-t-elle ?",
      "5 fois",
      "i prend les valeurs 1, 2, 3, 4, 5 — soit 5 itérations."),
  ],
  "2eme/technologie_informatique/Informatique/Chapitre 12: Les sous programmes": [
    mcq(-2832,
      "À quoi sert un sous-programme (fonction/procédure) ?",
      ["À répéter du code partout", "À regrouper et réutiliser du code, et rendre le programme plus clair", "À déclarer des constantes uniquement", "À supprimer du code"], "B",
      "Les sous-programmes favorisent la réutilisation et la modularité."),
  ],
  "2eme/technologie_informatique/Informatique/Les fonctions": [
    shortAnswer(-2833,
      "Qu'est-ce qui distingue une fonction d'une procédure ?",
      "La fonction retourne une valeur, la procédure n'en retourne pas.",
      "Cette distinction est centrale dans la programmation structurée."),
  ],
  "2eme/technologie_informatique/Informatique/Les procédures": [
    mcq(-2834,
      "Une procédure est utilisée surtout pour :",
      ["calculer une valeur retournée", "exécuter une action sans retourner de valeur", "stocker une variable", "lire un fichier image"], "B",
      "Une procédure réalise une action ; elle ne renvoie pas de valeur."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// ÉCONOMIE ET SERVICES — Mathématiques (8 chapters, distinct curriculum)
// ──────────────────────────────────────────────────────────────────────────────

const MATH_ES: Record<string, FallbackQuestion[]> = {
  "2eme/economie_services/Mathématiques/Chapitre 1: Les pourcentages": [
    problem(-2900,
      "Un article coûte 80 dinars. Son prix augmente de 15 %. Quel est le nouveau prix ?",
      "92 dinars",
      "15 % de 80 = 12. Nouveau prix = 80 + 12 = 92 dinars."),
    mcq(-2901,
      "Quelle est la valeur de 25 % de 200 ?",
      ["25", "50", "75", "100"], "B",
      "25 % de 200 = 200 × 0,25 = 50."),
  ],
  "2eme/economie_services/Mathématiques/Chapitre 2: Proportion": [
    problem(-2902,
      "5 stylos coûtent 8 D. Combien coûtent 20 stylos ?",
      "32 D",
      "Prix proportionnel : 20 stylos coûtent 8 × (20/5) = 32 D."),
  ],
  "2eme/economie_services/Mathématiques/Chapitre 3: Suites arithmétiques - Suites géométriques": [
    mcq(-2903,
      "Une suite arithmétique commence par 4 et a pour raison 5. Quel est le 6ème terme ?",
      ["29", "24", "34", "30"], "A",
      "u₆ = 4 + 5 × (6−1) = 4 + 25 = 29."),
  ],
  "2eme/economie_services/Mathématiques/Chapitre 4: Statistiques et Dénombrement": [
    problem(-2904,
      "On dispose des notes 8, 10, 12, 14. Calcule la moyenne arithmétique.",
      "11",
      "Somme = 44 ; moyenne = 44/4 = 11."),
  ],
  "2eme/economie_services/Mathématiques/Chapitre 5: Problèmes du premier degré à une inconnue": [
    problem(-2905,
      "Résous : 3x − 7 = 11.",
      "x = 6",
      "3x = 18 ; x = 6."),
  ],
  "2eme/economie_services/Mathématiques/Chapitre 6: Problèmes du premier degré à deux ou trois inconnues": [
    problem(-2906,
      "Résous : { x + y = 7 ; 2x − y = 5 }.",
      "x = 4 ; y = 3",
      "En additionnant : 3x = 12 ; x = 4. Puis y = 7 − 4 = 3."),
  ],
  "2eme/economie_services/Mathématiques/Chapitre 7: Problèmes du second degré": [
    problem(-2907,
      "Résous : x² − 7x + 10 = 0.",
      "x = 2 ou x = 5",
      "Δ = 49 − 40 = 9 ; x = (7 ± 3)/2 → x = 2 ou x = 5."),
  ],
  "2eme/economie_services/Mathématiques/Chapitre 8: Exemples de fonctions de références": [
    mcq(-2908,
      "Soit f(x) = 3x − 1. Quelle est l'image de 2 ?",
      ["5", "−1", "6", "1"], "A",
      "f(2) = 3 × 2 − 1 = 5."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// ÉCONOMIE ET SERVICES — Économie / Gestion (≈ 24 entries)
// ──────────────────────────────────────────────────────────────────────────────

const ECO_GESTION: Record<string, FallbackQuestion[]> = {
  "2eme/economie_services/Économie / Gestion/Présentation du programme de gestion": [
    shortAnswer(-2950,
      "Quel est l'objet principal du programme de gestion en 2ème ?",
      "Introduire les notions de base de la gestion : organisation, décisions, ressources, finalités.",
      "Le programme initie l'élève aux concepts fondamentaux de l'entreprise."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 1: Concepts fondamentaux et définition de la gestion": [
    mcq(-2951,
      "Quel est l'objectif principal de la gestion dans une entreprise ?",
      ["Organiser les ressources pour atteindre les objectifs", "Supprimer toutes les décisions", "Éviter toute planification", "Remplacer tous les employés"], "A",
      "La gestion organise les ressources humaines, matérielles et financières pour atteindre les objectifs."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 2: Les finalités de la gestion": [
    mcq(-2952,
      "Laquelle est une finalité économique d'une entreprise ?",
      ["Réaliser un profit", "Polluer l'environnement", "Ignorer les clients", "Supprimer des emplois sans raison"], "A",
      "La finalité économique principale est la pérennité grâce au profit."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 3: Les tâches du gestionnaire": [
    shortAnswer(-2953,
      "Cite deux tâches principales d'un gestionnaire.",
      "Planifier et contrôler (organiser, diriger, décider).",
      "Le gestionnaire planifie, organise, dirige et contrôle l'activité."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 4: Les outils de la gestion": [
    mcq(-2954,
      "Lequel de ces éléments est un outil de gestion ?",
      ["Le tableau de bord", "Le tablier de cuisine", "Le miroir", "Le pinceau"], "A",
      "Le tableau de bord, le budget, le plan d'action sont des outils de gestion."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 5: La notion d'opportunité": [
    shortAnswer(-2955,
      "Qu'est-ce qu'une opportunité d'affaires ?",
      "Une occasion favorable que l'entreprise peut exploiter pour créer de la valeur.",
      "Une bonne gestion sait identifier et saisir les opportunités."),
  ],
  "2eme/economie_services/Économie / Gestion/Chapitre 2: L'entreprise centre de décision": [
    mcq(-2956,
      "L'entreprise est un centre de décision parce qu'elle :",
      ["évite toute décision", "fait des choix sur ses produits, ses prix, son personnel", "agit sans planifier", "ne tient pas compte des clients"], "B",
      "L'entreprise prend en permanence des décisions stratégiques et opérationnelles."),
  ],
  "2eme/economie_services/Économie / Gestion/Chapitre 3: Décision d'achat": [
    shortAnswer(-2957,
      "Cite un critère de choix lors d'une décision d'achat.",
      "Le prix, la qualité, le délai de livraison, la fiabilité du fournisseur.",
      "L'acheteur compare plusieurs critères avant de décider."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 1: Processus de fabrication": [
    mcq(-2958,
      "Le processus de fabrication transforme :",
      ["des matières premières en produits finis", "des produits finis en matières premières", "rien", "l'eau en air uniquement"], "A",
      "La production transforme les ressources en biens ou services."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 2: Organisation de la production": [
    shortAnswer(-2959,
      "Qu'est-ce que l'organisation de la production ?",
      "La répartition des tâches et des ressources pour produire efficacement, à temps et au moindre coût.",
      "L'organisation vise efficacité, qualité et délais."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 3: Le contrôle de la production": [
    mcq(-2960,
      "Le contrôle de la production a pour objectif :",
      ["décorer l'atelier", "vérifier la qualité et la conformité des produits", "augmenter le gaspillage", "réduire la sécurité"], "B",
      "Le contrôle qualité vérifie que la production respecte les normes fixées."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 4: La notion de coût": [
    problem(-2961,
      "Une entreprise vend un produit 50 D. Son coût de revient est 30 D. Calcule le bénéfice unitaire.",
      "20 D",
      "Bénéfice = prix de vente − coût de revient = 50 − 30 = 20 D."),
  ],
  "2eme/economie_services/Économie / Gestion/Introduction": [
    shortAnswer(-2970,
      "Pourquoi une entreprise prend-elle continuellement des décisions ?",
      "Parce qu'elle évolue dans un environnement changeant (clients, fournisseurs, concurrence, marché) et doit s'adapter.",
      "Les décisions touchent l'achat, la production, le personnel, les ventes, le financement."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 1: Le recrutement du personnel": [
    mcq(-2962,
      "Le recrutement est :",
      ["le départ d'un salarié", "l'opération qui consiste à embaucher un nouveau salarié adapté au poste", "le contrôle des stocks", "l'augmentation de salaire"], "B",
      "Le recrutement vise à attirer et choisir le bon candidat pour un poste donné."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 2: La rémunération du personnel": [
    shortAnswer(-2963,
      "Cite un élément de la rémunération du personnel.",
      "Le salaire de base, les primes, les indemnités, les avantages sociaux.",
      "La rémunération combine plusieurs composantes selon le contrat et la performance."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 1: Les prévisions des ventes": [
    mcq(-2964,
      "Les prévisions des ventes servent à :",
      ["décorer le bureau", "anticiper la demande et préparer la production", "supprimer les ventes", "augmenter les retours clients"], "B",
      "Les prévisions guident la production, les stocks et les budgets."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 2: La provocation des ventes": [
    mcq(-2965,
      "Lequel de ces outils sert à provoquer les ventes ?",
      ["Le tableau scolaire", "La publicité et la promotion", "La règle graduée", "La calculatrice du comptable"], "B",
      "La publicité, la promotion et la communication stimulent la demande."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 3: La réalisation et le suivi des ventes": [
    shortAnswer(-2966,
      "Que comprend le suivi des ventes ?",
      "Le suivi des commandes, des livraisons et de la satisfaction des clients.",
      "Le suivi permet d'évaluer la performance commerciale et de fidéliser."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 4: La saisie et le recouvrement des ventes": [
    mcq(-2967,
      "Le « recouvrement » d'une vente, c'est :",
      ["la livraison", "la perception effective du paiement par l'entreprise", "la promotion du produit", "la fabrication du bien"], "B",
      "Le recouvrement consiste à percevoir l'argent dû à l'entreprise."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 1: Les opérations d'investissement": [
    mcq(-2968,
      "Un investissement, c'est :",
      ["un achat de fournitures de bureau", "une dépense durable visant à créer de la valeur future", "un dividende versé", "un salaire"], "B",
      "L'investissement engage des fonds pour générer des revenus futurs."),
  ],
  "2eme/economie_services/Économie / Gestion/Section 2: Les opérations de financement": [
    mcq(-2969,
      "Quelles sont des sources de financement d'une entreprise ?",
      ["Uniquement les ventes du jour", "Capitaux propres, emprunts bancaires, subventions", "La météo locale", "Les vacances du personnel"], "B",
      "Une entreprise se finance par capitaux propres, dettes ou aides."),
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// AGGREGATED EXPORT
// ──────────────────────────────────────────────────────────────────────────────

export const QUESTIONS_FALLBACK_2EME: Record<string, FallbackQuestion[]> = {
  ...ARABE,
  ...FRANCAIS,
  ...ANGLAIS,
  ...EDUC_ISLAMIQUE,
  ...HISTOIRE,
  ...GEOGRAPHIE,
  ...MATH_LETTRES,
  ...SVT_LETTRES,
  ...MATH_SCIENCES_TECH,
  ...PHYS_SCIENCES,
  ...SVT_SCIENCES,
  ...INFO_TI,
  ...MATH_ES,
  ...ECO_GESTION,
};

/**
 * Math for 2ème Sciences and 2ème Technologie de l'Informatique uses the
 * SAME curriculum. Seed scripts insert each Sciences Math row twice — once
 * under section_key=sciences and once under section_key=technologie_informatique.
 * The fallback above contains the questions ONCE (under sciences). The seed
 * script knows to duplicate them. This export advertises the policy.
 */
export const MATH_SCIENCES_DUPLICATE_TO_TI = true;


