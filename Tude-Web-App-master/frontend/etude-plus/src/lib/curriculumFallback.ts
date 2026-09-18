/**
 * Local curriculum fallback — used when the API is unavailable or returns no data.
 *
 * Key formats:
 *   Simple levels:          "${levelCode}/${subject}"               e.g. "1ere_secondaire/Mathématiques"
 *   Section-level shared:   "${levelCode}/${subject}"               e.g. "2eme/Arabe"   ← shared across ALL 2ème tracks
 *   Section-level specific: "${levelCode}/${sectionKey}/${subject}" e.g. "2eme/lettres/SVT"  ← Lettres only
 *
 * getFallbackChapters() tries the section-specific key first, then falls back to
 * "${levelCode}/${subject}". This means shared 2ème subjects need only one entry and
 * are automatically available for every track (sciences, economie_services, etc.).
 *
 * 1ère secondaire DB subject name mappings:
 *   "Technique"           ← DB "Technologie"
 *   "Sciences Naturelles" ← DB "Sciences de la Vie et de la Terre"
 *   "Physique-Chimie"     ← DB "Sciences Physiques"
 *   "Géographie"          ← DB "الجغرافيا"
 *   "Histoire"            ← DB "التاريخ"
 *   "Éducation Islamique" ← DB "اللغة العربية / التربية الإسلامية"
 */

export interface FallbackChapter {
  name:  string;
  group: string | null;
}

export const CURRICULUM_FALLBACK: Record<string, FallbackChapter[]> = {

  // ── Mathématiques 1ère ─────────────────────────────────────────────────────
  "1ere_secondaire/Mathématiques": [
    { name: "Angles",                                                                                   group: "Travaux géométriques" },
    { name: "Théorème de Thalès et sa réciproque",                                                      group: "Travaux géométriques" },
    { name: "Rapports trigonométriques d'un angle aigu; Relations métriques dans un triangle rectangle", group: "Travaux géométriques" },
    { name: "Vecteurs et translations",                                                                 group: "Travaux géométriques" },
    { name: "Somme de deux vecteurs - Vecteurs colinéaires",                                            group: "Travaux géométriques" },
    { name: "Activités dans un repère",                                                                 group: "Travaux géométriques" },
    { name: "Quart de tour",                                                                            group: "Travaux géométriques" },
    { name: "Sections planes d'un solide",                                                              group: "Travaux géométriques" },
    { name: "Activités numériques I",                                                                   group: "Travaux numériques"   },
    { name: "Activités numériques II",                                                                  group: "Travaux numériques"   },
    { name: "Activités algébriques",                                                                    group: "Travaux numériques"   },
    { name: "Fonctions linéaires",                                                                      group: "Travaux numériques"   },
    { name: "Équations et inéquations du premier degré à une inconnue",                                 group: "Travaux numériques"   },
    { name: "Fonctions affines",                                                                        group: "Travaux numériques"   },
    { name: "Systèmes de deux équations à deux inconnues",                                              group: "Travaux numériques"   },
    { name: "Exploitation de l'information",                                                            group: "Travaux numériques"   },
  ],

  // ── Technique 1ère ─────────────────────────────────────────────────────────
  "1ere_secondaire/Technique": [
    { name: "Analyse fonctionnelle d'un système technique",                         group: "Analyse fonctionnelle"                  },
    { name: "Lecture d'un dessin d'ensemble",                                       group: "Analyse structurelle et conception"     },
    { name: "Graphe de montage et graphe de démontage",                             group: "Analyse structurelle et conception"     },
    { name: "Dessin de définition",                                                 group: "Analyse structurelle et conception"     },
    { name: "Dessin assisté par ordinateur (DAO)",                                  group: "Analyse structurelle et conception"     },
    { name: "Liaisons mécaniques",                                                  group: "Analyse structurelle et conception"     },
    { name: "Systèmes combinatoires",                                               group: "Analyse structurelle et conception"     },
    { name: "Transmission de puissance",                                            group: "Analyse structurelle et conception"     },
    { name: "Matériaux utilisés",                                                   group: "Les matériaux utilisés"                 },
    { name: "Énergies renouvelables",                                               group: "Les énergies mises en œuvre"            },
    { name: "Convertisseurs statiques d'énergie électrique",                        group: "Les énergies mises en œuvre"            },
    { name: "Projet 1: Robot suiveur de ligne et éviteur d'obstacles",              group: "Réalisation et production"              },
    { name: "Programmation d'une carte de commande d'un système embarqué",          group: "Réalisation et production"              },
    { name: "Procédés de mise en forme des matériaux",                              group: "Réalisation et production"              },
    { name: "Procédés et typologie des assemblages",                                group: "Réalisation et production"              },
    { name: "Contrôle des composants",                                              group: "Réalisation et production"              },
    { name: "Projet 2: Lampe connectée",                                            group: "Réalisation et production"              },
    { name: "Fonction interfaçage",                                                 group: "Réalisation et production"              },
  ],

  // ── Sciences Naturelles 1ère ───────────────────────────────────────────────
  "1ere_secondaire/Sciences Naturelles": [
    { name: "La nutrition minérale",                                                group: "Amélioration de la production végétale" },
    { name: "La nutrition carbonée",                                                group: "Amélioration de la production végétale" },
    { name: "La multiplication végétative",                                         group: "Amélioration de la production végétale" },
    { name: "La diversité du monde microbien",                                      group: "Microbes et santé"                      },
    { name: "Les agents pathogènes et les maladies infectieuses",                   group: "Microbes et santé"                      },
    { name: "La défense de l'organisme",                                            group: "Microbes et santé"                      },
    { name: "Étude d'un site géologique",                                           group: "Découverte et gestion des ressources géologiques" },
    { name: "Exploitation et gestion d'une roche à intérêt économique: le phosphate", group: "Découverte et gestion des ressources géologiques" },
  ],

  // ── Physique-Chimie 1ère ───────────────────────────────────────────────────
  "1ere_secondaire/Physique-Chimie": [
    { name: "Le phénomène d'électrisation",                                         group: "L'Électricité" },
    { name: "Le circuit électrique",                                                group: "L'Électricité" },
    { name: "L'intensité du courant électrique",                                    group: "L'Électricité" },
    { name: "La tension électrique",                                                group: "L'Électricité" },
    { name: "Le dipôle résistor",                                                   group: "L'Électricité" },
    { name: "Les états physiques de la matière",                                    group: "La Matière"    },
    { name: "Quelques propriétés de la matière",                                    group: "La Matière"    },
    { name: "La masse",                                                             group: "La Matière"    },
    { name: "Les changements d'état physique d'un corps pur",                       group: "La Matière"    },
    { name: "Constitution de la matière",                                           group: "La Matière"    },
    { name: "Structure de la matière à l'échelle microscopique",                    group: "La Matière"    },
    { name: "Discontinuité de la matière",                                          group: "La Matière"    },
    { name: "Atomes et ions simples",                                               group: "La Matière"    },
    { name: "Molécules et ions polyatomiques",                                      group: "La Matière"    },
    { name: "Utilisation des modèles moléculaires",                                 group: "La Matière"    },
    { name: "Structure de la matière à l'échelle macroscopique",                    group: "La Matière"    },
    { name: "Détermination expérimentale du volume molaire d'un liquide ou d'un solide", group: "La Matière" },
    { name: "La dissolution",                                                       group: "La Matière"    },
    { name: "Les effets thermiques de la dissolution",                              group: "La Matière"    },
    { name: "Concentration d'une solution",                                         group: "La Matière"    },
    { name: "Solubilité",                                                           group: "La Matière"    },
    { name: "Préparation d'une solution titrée",                                    group: "La Matière"    },
    { name: "Notion de réaction chimique",                                          group: "La Matière"    },
    { name: "Étude qualitative d'une réaction chimique",                            group: "La Matière"    },
    { name: "Étude quantitative d'une réaction chimique",                           group: "La Matière"    },
    { name: "Détermination expérimentale du volume molaire d'un gaz",               group: "La Matière"    },
    { name: "Les hydrocarbures",                                                    group: "La Matière"    },
    { name: "Le mouvement",                                                         group: "La Mécanique"  },
    { name: "Les actions mécaniques",                                               group: "La Mécanique"  },
    { name: "Forces et équilibre",                                                  group: "La Mécanique"  },
    { name: "Forces et pression",                                                   group: "La Mécanique"  },
    { name: "Énergie et contrôle",                                                  group: "L'Énergie"     },
    { name: "La Terre et l'univers",                                                group: "L'Astronomie"  },
    { name: "La lumière et sa propagation",                                         group: "L'Optique"     },
    { name: "Spectre de lumière et vision",                                         group: "L'Optique"     },
  ],

  // ── Français 1ère ──────────────────────────────────────────────────────────
  "1ere_secondaire/Français": [
    { name: "Module 1: Rencontres",                 group: null },
    { name: "Module 2: Scènes de la vie en France", group: null },
    { name: "Module 3: Jeunesse sans frontières",   group: null },
    { name: "Module 4: La société de consommation", group: null },
    { name: "Module 5: Sauvons la planète Terre",   group: null },
    { name: "Module 6: Passions",                   group: null },
    { name: "Module 7: Progrès et bonheur",         group: null },
  ],

  // ── Géographie 1ère ────────────────────────────────────────────────────────
  "1ere_secondaire/Géographie": [
    { name: "التوزع الجغرافي للسكان",                                   group: "الوحدة 1: الإنسان يعمر الأرض"                   },
    { name: "الحركة الديمغرافية للسكان",                                group: "الوحدة 1: الإنسان يعمر الأرض"                   },
    { name: "الحركية المجالية للسكان",                                  group: "الوحدة 1: الإنسان يعمر الأرض"                   },
    { name: "الانفجار الحضري",                                          group: "الوحدة 1: الإنسان يعمر الأرض"                   },
    { name: "تركيبة المدينة: دراسة حالة: القاهرة",                     group: "الوحدة 1: الإنسان يعمر الأرض"                   },
    { name: "الموارد المائية",                                          group: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية"       },
    { name: "الموارد المائية وتوزعها الجغرافي",                         group: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية"       },
    { name: "تعبئة المياه",                                             group: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية"       },
    { name: "رهانات الماء",                                             group: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية"       },
    { name: "الموارد النفطية",                                          group: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية"       },
    { name: "الموارد النفطية: الإنتاج والاستهلاك والمبادلات",           group: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية"       },
    { name: "رهانات النفط",                                             group: "الوحدة 2: الإنسان يستثمر الموارد الطبيعية"       },
    { name: "الإنسان والوسط الطبيعي",                                   group: "الوحدة 3: الإنسان والأوساط الطبيعية"             },
    { name: "من المخاطر إلى الكوارث: الزلازل والبراكين",               group: "الوحدة 3: الإنسان والأوساط الطبيعية"             },
    { name: "من المخاطر إلى الكوارث: الفيضانات",                       group: "الوحدة 3: الإنسان والأوساط الطبيعية"             },
    { name: "تدهور الأوساط الطبيعية: مثال التصحر",                     group: "الوحدة 3: الإنسان والأوساط الطبيعية"             },
    { name: "تدهور الأوساط الطبيعية: مثال تدهور الغابة المتوسطية",    group: "الوحدة 3: الإنسان والأوساط الطبيعية"             },
    { name: "تدهور الأوساط الطبيعية: تعرية السواحل",                   group: "الوحدة 3: الإنسان والأوساط الطبيعية"             },
    { name: "الخضرسة",                                                  group: "الوحدة 3: الإنسان والأوساط الطبيعية"             },
  ],

  // ── Histoire 1ère ──────────────────────────────────────────────────────────
  "1ere_secondaire/Histoire": [
    { name: "الخصوصيات الحضارية",                                       group: "قرطاج البونية وإشعاعها في المتوسط"               },
    { name: "المؤسسات السياسية",                                        group: "قرطاج البونية وإشعاعها في المتوسط"               },
    { name: "الديانة",                                                   group: "قرطاج البونية وإشعاعها في المتوسط"               },
    { name: "إشعاع قرطاج",                                              group: "قرطاج البونية وإشعاعها في المتوسط"               },
    { name: "الميناء والتوسع التجاري",                                  group: "قرطاج البونية وإشعاعها في المتوسط"               },
    { name: "موسوعة ماغون",                                             group: "قرطاج البونية وإشعاعها في المتوسط"               },
    { name: "عبقرية حنبعل",                                             group: "قرطاج البونية وإشعاعها في المتوسط"               },
    { name: "الازدهار العمراني",                                        group: "قرطاج وإسهاماتها في الحضارة الرومانية"           },
    { name: "الازدهار الاقتصادي: الفلاحة",                             group: "قرطاج وإسهاماتها في الحضارة الرومانية"           },
    { name: "أبوليوس",                                                   group: "قرطاج وإسهاماتها في الحضارة الرومانية"           },
    { name: "القديس أوغسطينوس",                                         group: "قرطاج وإسهاماتها في الحضارة الرومانية"           },
    { name: "القيروان قاعدة الانتشار العربي الإسلامي",                  group: "القيروان ودورها في نشر الحضارة العربية الإسلامية" },
    { name: "الدور الاقتصادي للقيروان: أهمية النشاط التجاري",         group: "القيروان ودورها في نشر الحضارة العربية الإسلامية" },
    { name: "خصائص العمارة",                                            group: "القيروان ودورها في نشر الحضارة العربية الإسلامية" },
    { name: "الإشعاع الفكري",                                           group: "القيروان ودورها في نشر الحضارة العربية الإسلامية" },
    { name: "عمارة مدينة تونس",                                         group: "تونس في العهد الحفصي مركز إشعاع ثقافي"           },
    { name: "عبد الرحمان بن خلدون",                                     group: "تونس في العهد الحفصي مركز إشعاع ثقافي"           },
    { name: "إضاءات حول تاريخ تونس في العصر الحديث",                   group: "البلاد التونسية من الإصلاح إلى التحديث"           },
    { name: "الفكر الإصلاحي",                                           group: "البلاد التونسية من الإصلاح إلى التحديث"           },
    { name: "التجربة التونسية في مقاومة الاستعمار",                    group: "البلاد التونسية من الإصلاح إلى التحديث"           },
    { name: "تعصير الدولة وتحديث المجتمع",                             group: "البلاد التونسية من الإصلاح إلى التحديث"           },
  ],

  // ── Éducation Islamique 1ère ───────────────────────────────────────────────
  "1ere_secondaire/Éducation Islamique": [
    { name: "تلازم أركان العقيدة",                                      group: "فهمي لعقيدتي أعمق"                               },
    { name: "الإيمان عقيدة وممارسة",                                   group: "فهمي لعقيدتي أعمق"                               },
    { name: "الإيمان حسن المعاملة: هدي قرآني",                         group: "فهمي لعقيدتي أعمق"                               },
    { name: "تكامل العقل والنقل في إثبات حقيقة الغيب",                 group: "فهمي لعقيدتي أعمق"                               },
    { name: "طبيعة العلاقات الأسرية في الإسلام",                       group: "أتواصل إيجابيا وأحاور الآخرين"                   },
    { name: "دور الأسرة في الارتقاء بالعلاقات الاجتماعية",            group: "أتواصل إيجابيا وأحاور الآخرين"                   },
    { name: "المجادلة بالحسنى: هدي قرآني",                             group: "أتواصل إيجابيا وأحاور الآخرين"                   },
    { name: "آداب الحوار",                                              group: "أتواصل إيجابيا وأحاور الآخرين"                   },
    { name: "أثر الحوار في تحقيق التواصل بين الأجيال",                group: "أتواصل إيجابيا وأحاور الآخرين"                   },
    { name: "أثر الإيمان في العلاقات الاجتماعية: هدي نبوي",           group: "أتواصل إيجابيا وأحاور الآخرين"                   },
    { name: "حقيقة النبوّة ومقتضياتها",                                group: "أتمثل قيم النبوة وأرصد حضورها في التاريخ"         },
    { name: "دور الأنبياء في الارتقاء بالوعي البشري",                  group: "أتمثل قيم النبوة وأرصد حضورها في التاريخ"         },
    { name: "النبوّة هداية وإصلاح: هدي قرآني",                         group: "أتمثل قيم النبوة وأرصد حضورها في التاريخ"         },
    { name: "الأنبياء بناة الحضارة: هدي نبوي",                         group: "أتمثل قيم النبوة وأرصد حضورها في التاريخ"         },
    { name: "الاجتهاد ضرورة شرعية: هدي نبوي",                         group: "أدرك تفاعل الإسلام مع قضايا الواقع"               },
    { name: "التشريع بالنص",                                            group: "أدرك تفاعل الإسلام مع قضايا الواقع"               },
    { name: "التشريع بالاجتهاد المستند إلى أصل سابق",                 group: "أدرك تفاعل الإسلام مع قضايا الواقع"               },
    { name: "التشريع بالاستحسان والرأي المستند إلى المصلحة",           group: "أدرك تفاعل الإسلام مع قضايا الواقع"               },
    { name: "خصائص الشريعة الإسلامية",                                 group: "أدرك تفاعل الإسلام مع قضايا الواقع"               },
    { name: "دلالات التوحيد",                                           group: "أتواصل مع الكون والطبيعة"                         },
    { name: "أبعاد التوحيد",                                            group: "أتواصل مع الكون والطبيعة"                         },
    { name: "الإنسان والطبيعة: هدي قرآني",                             group: "أتواصل مع الكون والطبيعة"                         },
    { name: "قيمة العمل في الإسلام",                                    group: "بالعمل نرقى"                                      },
    { name: "دور العمل في تحقيق الذات",                                group: "بالعمل نرقى"                                      },
    { name: "العمل قيمة حضارية",                                        group: "بالعمل نرقى"                                      },
    { name: "مقتضيات الإيمان: هدي قرآني",                              group: "بالعمل نرقى"                                      },
  ],
};

export function getFallbackChapters(levelCode: string, subject: string, sectionKey?: string | null): FallbackChapter[] {
  if (sectionKey) {
    const sectionPath = `${levelCode}/${sectionKey}/${subject}`;
    if (CURRICULUM_FALLBACK[sectionPath]) return CURRICULUM_FALLBACK[sectionPath];
  }
  return CURRICULUM_FALLBACK[`${levelCode}/${subject}`] ?? [];
}

// ── 2ÈME SECONDAIRE ───────────────────────────────────────────────────────────
//
// Shared subjects (key: "2eme/${subject}") — appear in ALL 2ème tracks.
// Track-specific subjects (key: "2eme/${sectionKey}/${subject}") — override/extend.
//
// getFallbackChapters tries section-specific first ("2eme/lettres/Arabe"),
// then falls back to general ("2eme/Arabe"). So shared data lives at "2eme/X"
// and is automatically available for sciences, economie_services,
// technologie_informatique, and any future track with no duplication.
//
// Shared subjects defined below:
//   Arabe, Français, Anglais, Histoire, Géographie,
//   Éducation Islamique, Éducation Civique (no chapters yet)
//
// Track-specific (Lettres): Mathématiques, SVT

Object.assign(CURRICULUM_FALLBACK, {

  // ── Arabe — shared across all 2ème tracks ──────────────────────────────────
  "2eme/Arabe": [
    // القسم الأول: النصوص التمهيدية
    { name: "الفصل الأول: الرومنطيقية والكلاسيكية (القلب بديل عن العقل / صورة الحقيقة بين الكلاسيكية والرومنطيقية) — د. محمد غنيمي هلال", group: "القسم الأول: النصوص التمهيدية" },
    { name: "الفصل الثاني: نشأة الرابطة القلمية (الحاجة إلى التجديد - عوامل نشأة الرابطة القلمية - أهداف جماعة الرابطة) — د. محمد قوبعة", group: "القسم الأول: النصوص التمهيدية" },
    { name: "الفصل الثالث: حركة أبوللو أو الحداثة النظرية (هاجس النهوض بالشعر العربي - جوانب من تجديد الجماعة) — أدونيس (علي أحمد سعيد)", group: "القسم الأول: النصوص التمهيدية" },
    // الباب الأول: مفهوم الأدب ومنزلة الشاعر
    { name: "النص 1: الشاعر (صورة الشاعر - شعرية الخطاب النثري) — جبران خليل جبران",                             group: "الباب الأول: مفهوم الأدب ومنزلة الشاعر" },
    { name: "النص 2: الشاعر (الشاعر النبي - من خصائص الإيقاع عند الرومنطيقيين) — إيليا أبو ماضي",               group: "الباب الأول: مفهوم الأدب ومنزلة الشاعر" },
    { name: "النص 3: يا شعر (موقع الشعر من الشاعر) — أبو القاسم الشابي",                                         group: "الباب الأول: مفهوم الأدب ومنزلة الشاعر" },
    { name: "النص 4: ملكة الخيال (الخيال والإبداع عند الرومنطيقيين) — جبران خليل جبران",                         group: "الباب الأول: مفهوم الأدب ومنزلة الشاعر" },
    { name: "النص 5: عش للجمال (الجمال قيمة كونية وعمادًا للأدب الجديد) — إيليا أبو ماضي",                      group: "الباب الأول: مفهوم الأدب ومنزلة الشاعر" },
    { name: "النص 6: الفن الجميل (مصادر التجربة الشعرية ومنزلة الفن) — علي محمود طه",                            group: "الباب الأول: مفهوم الأدب ومنزلة الشاعر" },
    { name: "النص 7: قلت للشعر (من خصائص الإيقاع - الشعر يحتضن الكون) — أبو القاسم الشابي",                     group: "الباب الأول: مفهوم الأدب ومنزلة الشاعر" },
    { name: "النص 8: الشاعر والمقلد (الموقف من التقليد والتجديد) — جبران خليل جبران",                            group: "الباب الأول: مفهوم الأدب ومنزلة الشاعر" },
    // الباب الثاني: الكون الشعري عند الرومنطيقيين
    { name: "النص 9: المعراج (من تجليات الرمز في الأدب الرومنطيقي)",                                              group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    { name: "النص 10: مناجاة أرواح (بنية المناجاة - رمزية المدينة عند الرومنطيقيين)",                             group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    { name: "النص 11: مناجاة عصفور (مكونات الرمز - الغربة - موقف من المدينة)",                                    group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    { name: "النص 12: الجبابرة (الخطاب بين التأثير والتعبير - الالتزام في الأدب الرومنطيقي)",                    group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    { name: "النص 13: ليل الأشواق (الحب طريق إلى المعرفة)",                                                       group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    { name: "النص 14: الأشواق التائهة (من تجليات الغربة والتوق إلى المنشود)",                                     group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    { name: "النص 15: أغنية ريفية (الطبيعة في الأدب الرومنطيقي)",                                                group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    { name: "النص 16: الجمال المنشود (صورة المرأة في الأدب الرومنطيقي)",                                          group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    { name: "النص 17: رؤيا (القيم المؤسسة للمنشود في أدب الرومنطيقيين)",                                         group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    { name: "النص 18: كم تشتكي (الإيمان بالحياة عند الرومنطيقي)",                                                group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    { name: "النص 19: نشيد الجبار (التمرد - توظيف الأسطورة)",                                                     group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    { name: "النص 20: التمثال (الإنسان بين أوهام القدرة والخلق وواقع العجز)",                                    group: "الباب الثاني: الكون الشعري عند الرومنطيقيين" },
    // القسم الثالث: النصوص التكميلية والدراسات
    { name: "الفصل الأول: من تجليات الحداثة في إنتاج جماعة الرابطة القلمية (كسر الأنساق الإيقاعية القديمة - الرؤية الرومنطيقية والحداثة)", group: "القسم الثالث: النصوص التكميلية والدراسات" },
    { name: "الفصل الثاني: ملامح من شعرية أغاني الحياة (القديم والحديث في شعر الشابي - بلاغة الصورة في أغاني الحياة - الأسطوري في أغاني الحياة)", group: "القسم الثالث: النصوص التكميلية والدراسات" },
    { name: "الفصل الثالث: علي محمود طه حلقة مهمة في تطور الشعر الحديث (اللغة في شعر علي محمود طه - علي محمود والشكل الشعري الحديث)", group: "القسم الثالث: النصوص التكميلية والدراسات" },
    { name: "خاتمة الكتاب: ثبت بيبليوغرافي (المراجع والمصادر)",                                                   group: "القسم الثالث: النصوص التكميلية والدراسات" },
  ] as FallbackChapter[],

  // ── Éducation Islamique — shared across all 2ème tracks ───────────────────
  "2eme/Éducation Islamique": [
    { name: "مقدمة الكتاب",                                          group: "محتوى الكتاب" },
    { name: "كتابك: كيف تتعامل معه؟",                               group: "محتوى الكتاب" },
    { name: "الصفات الإلهية",                                        group: "محتوى الكتاب" },
    { name: "العبادة: دلالاتها ومقاصدها",                           group: "محتوى الكتاب" },
    { name: "الكون يسبح الله",                                       group: "محتوى الكتاب" },
    { name: "عناصر بناء الشخصية في الإسلام",                        group: "محتوى الكتاب" },
    { name: "شخصية محمد صلّى الله عليه وسلم مثال التوازن",          group: "محتوى الكتاب" },
    { name: "الوحي: المفهوم والدلالة",                               group: "محتوى الكتاب" },
    { name: "الوحي والتاريخ",                                        group: "محتوى الكتاب" },
    { name: "العلاقة بين المعلم والمتعلم",                          group: "محتوى الكتاب" },
    { name: "دور التعليم في تنمية الذات",                           group: "محتوى الكتاب" },
    { name: "الدين النصيحة",                                         group: "محتوى الكتاب" },
    { name: "من مشاغل الإصلاح",                                      group: "محتوى الكتاب" },
    { name: "الاستخلاف في القرآن الكريم",                           group: "محتوى الكتاب" },
    { name: "الاستخلاف وحركة التاريخ",                              group: "محتوى الكتاب" },
    { name: "الأمل والصحة النفسية",                                  group: "محتوى الكتاب" },
    { name: "الأمل في القرآن",                                       group: "محتوى الكتاب" },
    { name: "المصير ومعنى الحياة",                                   group: "محتوى الكتاب" },
    { name: "الإنسان وقدره",                                         group: "محتوى الكتاب" },
  ] as FallbackChapter[],

  // ── Géographie — shared across all 2ème tracks ─────────────────────────────
  "2eme/Géographie": [
    { name: "الدرس 1: وظائف المدينة",                                group: "المحور الأوّل: المدن تنظّم المجال" },
    { name: "الدرس 2: التراتب الحضري",                               group: "المحور الأوّل: المدن تنظّم المجال" },
    { name: "الدرس 3: الشبكات الحضرية",                              group: "المحور الأوّل: المدن تنظّم المجال" },
    { name: "الدرس 4: الحواضر الكبرى تنظّم المجال العالمي",          group: "المحور الأوّل: المدن تنظّم المجال" },
    { name: "الدرس 5: وظائف المجال الريفي",                          group: "المحور الثّاني: تنظيم المجالات الرّيفية" },
    { name: "الدرس 6: تنظيم المجال الريفي في العالم المتقدم",        group: "المحور الثّاني: تنظيم المجالات الرّيفية" },
    { name: "الدرس 7: تنظيم المجال الريفي في العالم النامي",         group: "المحور الثّاني: تنظيم المجالات الرّيفية" },
    { name: "الدرس 8: شبكات النقل والاتصال",                         group: "المحور الثّالث: شبكات النقل والاتصال ودورها في تنظيم المجال" },
    { name: "الدرس 9: دور شبكات النقل والاتصال في تنظيم المجال",     group: "المحور الثّالث: شبكات النقل والاتصال ودورها في تنظيم المجال" },
    { name: "الدرس 10: تهيئة منطقة سياحية",                         group: "المحور الرّابع: التهيئة الترابية" },
    { name: "الدرس 11: تهيئة منطقة صناعية",                         group: "المحور الرّابع: التهيئة الترابية" },
    { name: "الدرس 12: تهيئة منطقة سقوية",                          group: "المحور الرّابع: التهيئة الترابية" },
  ] as FallbackChapter[],

  // ── Histoire — shared across all 2ème tracks ───────────────────────────────
  "2eme/Histoire": [
    { name: "الدرس 1: حضارات الشرق والعالم المتوسطي في العصر القديم: تقديم عام",              group: "المحور الأوّل: الحضارات القديمة في الشرق والعالم المتوسطي" },
    { name: "الدرس 2: بلاد الرافدين: الأطوار التاريخية والتنظيم السياسي",                     group: "المحور الأوّل: الحضارات القديمة في الشرق والعالم المتوسطي" },
    { name: "الدرس 3: بلاد الرافدين: الزراعة",                                                group: "المحور الأوّل: الحضارات القديمة في الشرق والعالم المتوسطي" },
    { name: "الدرس 4: بلاد الرافدين: شريعة حمورابي",                                          group: "المحور الأوّل: الحضارات القديمة في الشرق والعالم المتوسطي" },
    { name: "الدرس 5: بلاد الرافدين: الديانة والعلوم والفنون",                                group: "المحور الأوّل: الحضارات القديمة في الشرق والعالم المتوسطي" },
    { name: "الدرس 6: مصر في عهد الفراعنة: الأطوار التاريخية والمؤسسات",                      group: "المحور الأوّل: الحضارات القديمة في الشرق والعالم المتوسطي" },
    { name: "الدرس 7: مصر في عهد الفراعنة: المجتمع والحياة الاقتصادية",                       group: "المحور الأوّل: الحضارات القديمة في الشرق والعالم المتوسطي" },
    { name: "الدرس 8: مصر في عهد الفراعنة: الديانة والعلوم والفنون",                          group: "المحور الأوّل: الحضارات القديمة في الشرق والعالم المتوسطي" },
    { name: "الدرس 9: بلاد الإغريق في العصر الكلاسيكي: الديمقراطية الأثينية",                 group: "المحور الأوّل: الحضارات القديمة في الشرق والعالم المتوسطي" },
    { name: "الدرس 10: بلاد الإغريق في العصر الكلاسيكي: الإنتاج الفكري والفني",               group: "المحور الأوّل: الحضارات القديمة في الشرق والعالم المتوسطي" },
    { name: "الدرس 11: العالم في نهاية القرن السادس وبداية القرن السابع للميلاد",              group: "المحور الثّاني: التطور الحضاري والتحولات التاريخية في المشرق والغرب الإسلامي في العصر الوسيط" },
    { name: "الدرس 12: ظهور الإسلام ومراحل انتشاره",                                          group: "المحور الثّاني: التطور الحضاري والتحولات التاريخية في المشرق والغرب الإسلامي في العصر الوسيط" },
    { name: "الدرس 13: الدولة والمجتمع في المشرق الإسلامي (1-5 هـ / 7-11 م)",                group: "المحور الثّاني: التطور الحضاري والتحولات التاريخية في المشرق والغرب الإسلامي في العصر الوسيط" },
    { name: "الدرس 14: الازدهار الحضاري في المشرق الإسلامي (1-5 هـ / 7-11 م)",               group: "المحور الثّاني: التطور الحضاري والتحولات التاريخية في المشرق والغرب الإسلامي في العصر الوسيط" },
    { name: "الدرس 15: ابن سينا",                                                              group: "المحور الثّاني: التطور الحضاري والتحولات التاريخية في المشرق والغرب الإسلامي في العصر الوسيط" },
    { name: "الدرس 16: مدينة بغداد",                                                           group: "المحور الثّاني: التطور الحضاري والتحولات التاريخية في المشرق والغرب الإسلامي في العصر الوسيط" },
    { name: "الدرس 17: التطور السياسي في الغرب الإسلامي من القرن الثاني إلى القرن التاسع للهجرة (8–15 م)", group: "المحور الثّاني: التطور الحضاري والتحولات التاريخية في المشرق والغرب الإسلامي في العصر الوسيط" },
    { name: "الدرس 18: التحولات الاجتماعية في الغرب الإسلامي من القرن الثاني إلى القرن التاسع للهجرة (8–15 م)", group: "المحور الثّاني: التطور الحضاري والتحولات التاريخية في المشرق والغرب الإسلامي في العصر الوسيط" },
    { name: "الدرس 19: ابن رشد",                                                               group: "المحور الثّاني: التطور الحضاري والتحولات التاريخية في المشرق والغرب الإسلامي في العصر الوسيط" },
    { name: "الدرس 20: الإدريسي",                                                              group: "المحور الثّاني: التطور الحضاري والتحولات التاريخية في المشرق والغرب الإسلامي في العصر الوسيط" },
    { name: "الدرس 21: الغرب المسيحي في حدود عام 1000 ميلادي",                                group: "المحور الثالث: العلاقة بين العالم الإسلامي والغرب المسيحي من القرن الرابع للهجرة (10م) إلى سقوط غرناطة (15م)" },
    { name: "الدرس 22: المواجهة بين العالم الإسلامي والغرب المسيحي",                          group: "المحور الثالث: العلاقة بين العالم الإسلامي والغرب المسيحي من القرن الرابع للهجرة (10م) إلى سقوط غرناطة (15م)" },
    { name: "الدرس 23: تأثير الحضارة الإسلامية في أوروبا",                                    group: "المحور الثالث: العلاقة بين العالم الإسلامي والغرب المسيحي من القرن الرابع للهجرة (10م) إلى سقوط غرناطة (15م)" },
  ] as FallbackChapter[],

  // ── Mathématiques 2ème Lettres ──────────────────────────────────────────────
  "2eme/lettres/Mathématiques": [
    { name: "Pourcentage",                                            group: "Activités numériques"   },
    { name: "Suites arithmétiques - Suites géométriques",             group: "Activités numériques"   },
    { name: "Équations et inéquations",                               group: "Activités algébriques"  },
    { name: "Systèmes d'équations",                                   group: "Activités algébriques"  },
    { name: "Fonctions",                                              group: "Activités algébriques"  },
    { name: "Statistiques",                                           group: "Statistiques"           },
  ] as FallbackChapter[],

  // ── SVT 2ème Lettres ────────────────────────────────────────────────────────
  "2eme/lettres/SVT": [
    { name: "Les habitudes et les besoins alimentaires",                                                        group: "Hygiène alimentaire et risques alimentaires liés à la pollution" },
    { name: "La malnutrition, conséquence de certaines habitudes alimentaires: Obésité et carence alimentaire", group: "Hygiène alimentaire et risques alimentaires liés à la pollution" },
    { name: "L'alimentation équilibrée",                                                                        group: "Hygiène alimentaire et risques alimentaires liés à la pollution" },
    { name: "Le choix et la conservation des aliments",                                                         group: "Hygiène alimentaire et risques alimentaires liés à la pollution" },
    { name: "L'eau potable: propriétés et origine",                                                             group: "Hygiène alimentaire et risques alimentaires liés à la pollution" },
    { name: "Les risques liés à la pollution de l'eau potable et les moyens de protection des ressources en eau", group: "Hygiène alimentaire et risques alimentaires liés à la pollution" },
    { name: "Le Kyste hydatique",                                                                               group: "Risques liés au parasitisme et aux intoxications" },
    { name: "L'Oxyurose",                                                                                       group: "Risques liés au parasitisme et aux intoxications" },
    { name: "La Toxoplasmose",                                                                                  group: "Risques liés au parasitisme et aux intoxications" },
    { name: "Le Sida",                                                                                          group: "Risques liés au parasitisme et aux intoxications" },
    { name: "Le tabagisme",                                                                                     group: "Risques liés au parasitisme et aux intoxications" },
    { name: "L'alcoolisme",                                                                                     group: "Risques liés au parasitisme et aux intoxications" },
    { name: "Les drogues",                                                                                      group: "Risques liés au parasitisme et aux intoxications" },
    { name: "Quelques stratégies de prévention et de lutte contre les toxicomanies",                            group: "Risques liés au parasitisme et aux intoxications" },
  ] as FallbackChapter[],

  // ── Anglais — shared across all 2ème tracks ────────────────────────────────
  "2eme/Anglais": [
    { name: "Preface",                                                group: "Review and Intro" },
    { name: "Book Map",                                               group: "Review and Intro" },
    { name: "Diagnostic Test",                                        group: "Review and Intro" },
    { name: "Self-Reflection",                                        group: "Review and Intro" },
    { name: "Review Module",                                          group: "Review and Intro" },
    { name: "Lesson 1: The image of who I am",                        group: "Lessons" },
    { name: "Lesson 2: The step mum",                                 group: "Lessons" },
    { name: "Lesson 3: Friendship",                                   group: "Lessons" },
    { name: "Lesson 4: Bridge over troubled water",                   group: "Lessons" },
    { name: "Lesson 5: The E-mailer",                                 group: "Lessons" },
    { name: "Lesson 6: Travel is fun and broadens the mind",          group: "Lessons" },
    { name: "Lesson 7: An interview with a footballer",               group: "Lessons" },
    { name: "Lesson 8: Progress Check 1 and Self-Evaluation",         group: "Lessons" },
    { name: "Lesson 9: Violence",                                     group: "Lessons" },
    { name: "Lesson 10: Child labour",                                group: "Lessons" },
    { name: "Lesson 11: Life without parents",                        group: "Lessons" },
    { name: "Lesson 12: Money and evil",                              group: "Lessons" },
    { name: "Lesson 13: Songs of freedom",                            group: "Lessons" },
    { name: "Lesson 14: Why I had to leave my job",                   group: "Lessons" },
    { name: "Lesson 15: Human rights",                                group: "Lessons" },
    { name: "Lesson 16: Equality brings prosperity",                  group: "Lessons" },
    { name: "Lesson 17: Progress Check 2 and Self-evaluation",        group: "Lessons" },
    { name: "Lesson 18: School uniforms",                             group: "Lessons" },
    { name: "Lesson 19: Coping with exams",                           group: "Lessons" },
    { name: "Lesson 20: I had no choice",                             group: "Lessons" },
    { name: "Lesson 21: What's your dream job?",                      group: "Lessons" },
    { name: "Lesson 22: A success story",                             group: "Lessons" },
    { name: "Lesson 23: The importance of libraries",                 group: "Lessons" },
    { name: "Lesson 24: Death of the single",                         group: "Lessons" },
    { name: "Lesson 25: Internet addiction",                          group: "Lessons" },
    { name: "Lesson 26: What will man be like?",                      group: "Lessons" },
    { name: "Lesson 27: Our world, our environment",                  group: "Lessons" },
    { name: "Lesson 28: Water scarcity",                              group: "Lessons" },
    { name: "Lesson 29: Time for a song",                             group: "Lessons" },
    { name: "Lesson 30: Progress Check 3 and Self-evaluation",        group: "Lessons" },
    { name: "Arts 1: Hard to decide",                                 group: "Arts" },
    { name: "Arts 2: Fairy tales",                                    group: "Arts" },
    { name: "Arts 3: Criss-crossed lovers",                           group: "Arts" },
    { name: "Arts 4: The colour of nutrition",                        group: "Arts" },
    { name: "Arts 5: The fox and the crow",                           group: "Arts" },
    { name: "Arts 6: Men and women",                                  group: "Arts" },
    { name: "Arts 7: Pushy parents",                                  group: "Arts" },
    { name: "Arts 8: Students' part-time jobs",                       group: "Arts" },
    { name: "Arts 9: Keeping a diary",                                group: "Arts" },
    { name: "Arts 10: Save the lofty trees",                          group: "Arts" },
    { name: "Economics 1: The financial market",                      group: "Economics" },
    { name: "Economics 2: Advertising",                               group: "Economics" },
    { name: "Economics 3: Business letters: Inquiry/Reply",           group: "Economics" },
    { name: "Economics 4: Business letters: Complaint / Reply",       group: "Economics" },
    { name: "Economics 5: Business letters: Notification and warning",group: "Economics" },
    { name: "Economics 6: Job Hunting",                               group: "Economics" },
    { name: "Economics 7: Inflation",                                 group: "Economics" },
    { name: "Economics 8: The budget dollar",                         group: "Economics" },
    { name: "Economics 9: Talking about changes",                     group: "Economics" },
    { name: "Economics 10: Selling a business",                       group: "Economics" },
    { name: "Grammar Summary",                                        group: "Appendix" },
    { name: "New words per lesson",                                   group: "Appendix" },
    { name: "Irregular verbs list",                                   group: "Appendix" },
    { name: "Phonetic Symbols",                                       group: "Appendix" },
  ] as FallbackChapter[],

  // ── Français — shared across all 2ème tracks ───────────────────────────────
  "2eme/Français": [
    { name: "Perdus dans la rêverie — G. Flaubert",                   group: "Pages d'amour — Champ lexical et thème" },
    { name: "Méditation — P. Géraldy",                                group: "Pages d'amour — Champ lexical et thème" },
    { name: "L'amoureux éconduit — Marivaux",                         group: "Pages d'amour — Champ lexical et thème" },
    { name: "Il pleut — F. Carco",                                    group: "Pages d'amour — Champ lexical et thème" },
    { name: "Un songe — S. Prudhomme",                                group: "Toi, mon semblable — Thème et thèse" },
    { name: "Solitude au milieu des hommes — R. Merle",               group: "Toi, mon semblable — Thème et thèse" },
    { name: "La peur du mépris — Stendhal",                           group: "Toi, mon semblable — Thème et thèse" },
    { name: "Une affaire de conscience — A. Touraine",                group: "Toi, mon semblable — Thème et thèse" },
    { name: "Je n'aimerais pas être un mari ! — C. Rochefort",        group: "Femme et société — Thèse et arguments" },
    { name: "Ainsi était ma mère ... — G. Navel",                     group: "Femme et société — Thèse et arguments" },
    { name: "Un roi déchu — J. Giraudoux",                            group: "Femme et société — Thèse et arguments" },
    { name: "Monsieur ou Mondamoiseau ? — F. de Lagarde",             group: "Femme et société — Thèse et arguments" },
    { name: "Une existence exemplaire — R. M. Du Gard",               group: "Travail et bien-être — Les étapes de l'argumentation" },
    { name: "Des millions de petites flammes — M. Tournier",          group: "Travail et bien-être — Les étapes de l'argumentation" },
    { name: "Le chant de la pierre — Lamartine",                      group: "Travail et bien-être — Les étapes de l'argumentation" },
    { name: "Sur les routes du monde — G. Cesbron",                   group: "Images d'ici, images d'ailleurs — La structure de l'argumentation" },
    { name: "Sensation — Rimbaud",                                    group: "Images d'ici, images d'ailleurs — La structure de l'argumentation" },
    { name: "Le pouvoir de l'image — A. Jouffroy",                    group: "Images d'ici, images d'ailleurs — La structure de l'argumentation" },
    { name: "La ficelle — Guy de Maupassant",                         group: "Nouvelles" },
    { name: "La reine de beauté — Suzanne Prou",                      group: "Nouvelles" },
  ] as FallbackChapter[],

  // Éducation Civique 2ème (shared) — no chapters yet.
  // Intentionally omitted so getFallbackChapters returns [] and the UI shows
  // "Aucun chapitre pour cette matière" for every 2ème track.

});

// ── 2ÈME SECONDAIRE — TRACK-SPECIFIC SUBJECTS ────────────────────────────────
//
// Mathématiques Sciences and Technologie share the same Tome 1 + Tome 2 programme.
// Defined once as a const to avoid duplication.

const MATHS_2EME_SCIENCES_TECH: FallbackChapter[] = [
  // Tome 1
  { name: "Chapitre 1: Calcul dans IR",                                          group: "Tome 1" },
  { name: "Chapitre 2: Problèmes du 1er degré et problèmes du second degré",     group: "Tome 1" },
  { name: "Chapitre 3: Notion de polynômes",                                      group: "Tome 1" },
  { name: "Chapitre 4: Arithmétique",                                             group: "Tome 1" },
  { name: "Chapitre 5: Calcul vectoriel",                                         group: "Tome 1" },
  { name: "Chapitre 6: Barycentre",                                               group: "Tome 1" },
  { name: "Chapitre 7: Translations",                                             group: "Tome 1" },
  { name: "Chapitre 8: Homothéties",                                              group: "Tome 1" },
  { name: "Chapitre 9: Rotations",                                                group: "Tome 1" },
  // Tome 2
  { name: "Chapitre 1: Suites arithmétiques",                                     group: "Tome 2" },
  { name: "Chapitre 2: Suites géométriques",                                      group: "Tome 2" },
  { name: "Chapitre 3: Généralités sur les fonctions",                            group: "Tome 2" },
  { name: "Chapitre 4: Fonctions de références",                                  group: "Tome 2" },
  { name: "Chapitre 5: Trigonométrie et mesure des grandeurs",                    group: "Tome 2" },
  { name: "Chapitre 6: Géométrie analytique",                                     group: "Tome 2" },
  { name: "Chapitre 7: Droites et plans de l'espace",                             group: "Tome 2" },
  { name: "Chapitre 8: Parallélisme dans l'espace",                               group: "Tome 2" },
  { name: "Chapitre 9: Orthogonalité dans l'espace",                              group: "Tome 2" },
  { name: "Chapitre 10: Statistiques",                                            group: "Tome 2" },
];

Object.assign(CURRICULUM_FALLBACK, {

  // ── Mathématiques — 2ème Sciences (Tome 1 + 2) ─────────────────────────────
  "2eme/sciences/Mathématiques": MATHS_2EME_SCIENCES_TECH,

  // ── Mathématiques — 2ème Technologie de l'Informatique (same as Sciences) ──
  "2eme/technologie_informatique/Mathématiques": MATHS_2EME_SCIENCES_TECH,

  // ── Mathématiques — 2ème Économie et Services (distinct 8-chapter book) ────
  "2eme/economie_services/Mathématiques": [
    { name: "Chapitre 1: Les pourcentages",                                            group: "Activités numériques" },
    { name: "Chapitre 2: Proportion",                                                  group: "Activités numériques" },
    { name: "Chapitre 3: Suites arithmétiques - Suites géométriques",                  group: "Activités numériques" },
    { name: "Chapitre 4: Statistiques et Dénombrement",                                group: "Statistiques"         },
    { name: "Chapitre 5: Problèmes du premier degré à une inconnue",                   group: "Activités algébriques" },
    { name: "Chapitre 6: Problèmes du premier degré à deux ou trois inconnues",        group: "Activités algébriques" },
    { name: "Chapitre 7: Problèmes du second degré",                                   group: "Activités algébriques" },
    { name: "Chapitre 8: Exemples de fonctions de références",                         group: "Fonctions"            },
  ] as FallbackChapter[],

  // ── Physique-Chimie — 2ème Sciences ────────────────────────────────────────
  "2eme/sciences/Physique-Chimie": [
    { name: "Chapitre 1: Puissance et énergie électrique", group: "Partie 1: Circuits électriques" },
    { name: "Chapitre 2: Conductibilité électrique",       group: "Partie 1: Circuits électriques" },
    { name: "Chapitre 3: Récepteurs passifs (1)",          group: "Partie 1: Circuits électriques" },
    { name: "Chapitre 4: Récepteurs passifs (2)",          group: "Partie 1: Circuits électriques" },
    { name: "Chapitre 5: Récepteurs actifs",               group: "Partie 1: Circuits électriques" },
    { name: "Chapitre 6: Le dipôle générateur",            group: "Partie 1: Circuits électriques" },
    { name: "Chapitre 7: Adaptation: Loi de Pouillet",     group: "Partie 1: Circuits électriques" },
    { name: "Chapitre 8: Le courant alternatif",           group: "Partie 1: Circuits électriques" },
  ] as FallbackChapter[],

  // ── SVT — 2ème Sciences ─────────────────────────────────────────────────────
  "2eme/sciences/SVT": [
    // Thème 1
    { name: "La cellule: unité structurale des êtres vivants",                    group: "THÈME 1: La cellule: unité structurale des êtres vivants" },
    { name: "Ultrastructure de la cellule eucaryote",                             group: "THÈME 1: La cellule: unité structurale des êtres vivants" },
    { name: "La mitose: mécanisme de la reproduction conforme",                   group: "THÈME 1: La cellule: unité structurale des êtres vivants" },
    { name: "Les Chromosomes",                                                    group: "THÈME 1: La cellule: unité structurale des êtres vivants" },
    { name: "Localisation, nature et structure de l'information génétique",       group: "THÈME 1: La cellule: unité structurale des êtres vivants" },
    // Thème 2
    { name: "La carte topographique",                                             group: "THÈME 2: Exploitation rationnelle des ressources géologiques" },
    { name: "Notion de stratigraphie et de tectonique",                           group: "THÈME 2: Exploitation rationnelle des ressources géologiques" },
    { name: "La carte géologique",                                                group: "THÈME 2: Exploitation rationnelle des ressources géologiques" },
    { name: "Les ressources en eau et leur exploitation",                         group: "THÈME 2: Exploitation rationnelle des ressources géologiques" },
    { name: "Une roche sédimentaire à intérêt économique: les phosphates",        group: "THÈME 2: Exploitation rationnelle des ressources géologiques" },
    { name: "Une roche sédimentaire à intérêt économique: le pétrole",           group: "THÈME 2: Exploitation rationnelle des ressources géologiques" },
    // Thème 3
    { name: "Gestion rationnelle d'un écosystème",                               group: "THÈME 3: Notion d'écologie" },
    { name: "Adaptation des végétaux et des animaux aux conditions défavorables", group: "THÈME 3: Notion d'écologie" },
    { name: "La répartition des végétaux en Tunisie",                             group: "THÈME 3: Notion d'écologie" },
    { name: "Relations trophiques et cycle de la matière",                        group: "THÈME 3: Notion d'écologie" },
    { name: "Principaux types de relations trophiques",                           group: "THÈME 3: Notion d'écologie" },
    { name: "Vers une gestion rationnelle de l'écosystème, notion de développement durable", group: "THÈME 3: Notion d'écologie" },
  ] as FallbackChapter[],

  // ── Informatique — 2ème Technologie de l'Informatique ──────────────────────
  "2eme/technologie_informatique/Informatique": [
    // Culture informatique
    { name: "Chapitre 1: Culture informatique",                                                       group: "Culture informatique" },
    { name: "L'informatique: définition, historique et domaine d'utilisation",                        group: "Culture informatique" },
    { name: "Notions d'information et de numérisation",                                               group: "Culture informatique" },
    { name: "Notion de logiciels",                                                                    group: "Culture informatique" },
    // Architecture et systèmes
    { name: "Chapitre 2: Architecture d'un micro-ordinateur",                                         group: "Architecture et systèmes" },
    { name: "Définition d'un ordinateur",                                                             group: "Architecture et systèmes" },
    { name: "Architecture de base d'un micro-ordinateur",                                             group: "Architecture et systèmes" },
    { name: "Chapitre 3: Systèmes d'exploitation et réseaux informatiques",                           group: "Architecture et systèmes" },
    { name: "Système d'exploitation: présentation et rôles",                                          group: "Architecture et systèmes" },
    { name: "Les principales fonctions",                                                              group: "Architecture et systèmes" },
    { name: "Notions de fichiers et de répertoires",                                                  group: "Architecture et systèmes" },
    { name: "Apprentissage des fonctions de base d'un système d'exploitation",                        group: "Architecture et systèmes" },
    { name: "Les réseaux informatiques",                                                              group: "Architecture et systèmes" },
    { name: "Les différents types",                                                                   group: "Architecture et systèmes" },
    { name: "Les avantages d'un réseau",                                                              group: "Architecture et systèmes" },
    { name: "Les logistiques matérielles et logicielles",                                             group: "Architecture et systèmes" },
    { name: "Les topologies",                                                                         group: "Architecture et systèmes" },
    { name: "L'exploitation d'un réseau local",                                                       group: "Architecture et systèmes" },
    // Multimédia, Internet et présentation
    { name: "Chapitre 4: Éléments de multimédia",                                                    group: "Multimédia, Internet et présentation" },
    { name: "Introduction",                                                                           group: "Multimédia, Internet et présentation" },
    { name: "Le traitement de texte",                                                                 group: "Multimédia, Internet et présentation" },
    { name: "L'image",                                                                                group: "Multimédia, Internet et présentation" },
    { name: "Le son",                                                                                 group: "Multimédia, Internet et présentation" },
    { name: "La vidéo",                                                                               group: "Multimédia, Internet et présentation" },
    { name: "Chapitre 5: Internet",                                                                   group: "Multimédia, Internet et présentation" },
    { name: "Présentation",                                                                           group: "Multimédia, Internet et présentation" },
    { name: "Les services d'Internet",                                                                group: "Multimédia, Internet et présentation" },
    { name: "Projet",                                                                                 group: "Multimédia, Internet et présentation" },
    { name: "Chapitre 6: Éléments de présentation",                                                  group: "Multimédia, Internet et présentation" },
    { name: "La production de présentation",                                                          group: "Multimédia, Internet et présentation" },
    { name: "La production de pages Web",                                                             group: "Multimédia, Internet et présentation" },
    // Algorithmique et programmation
    { name: "Chapitre 7: Introduction à la résolution de problèmes et à la programmation",            group: "Algorithmique et programmation" },
    { name: "Introduction",                                                                           group: "Algorithmique et programmation" },
    { name: "Spécification et analyse d'un problème",                                                 group: "Algorithmique et programmation" },
    { name: "Écriture d'un algorithme",                                                               group: "Algorithmique et programmation" },
    { name: "Traduction en un programme exécutable par ordinateur",                                   group: "Algorithmique et programmation" },
    { name: "Exécutions et tests",                                                                    group: "Algorithmique et programmation" },
    { name: "Chapitre 8: Les structures de données",                                                  group: "Algorithmique et programmation" },
    { name: "Les constantes",                                                                         group: "Algorithmique et programmation" },
    { name: "Les variables",                                                                          group: "Algorithmique et programmation" },
    { name: "Les types de données",                                                                   group: "Algorithmique et programmation" },
    { name: "Chapitre 9: Les structures simples",                                                     group: "Algorithmique et programmation" },
    { name: "Introduction",                                                                           group: "Algorithmique et programmation" },
    { name: "Les opérations d'entrée et de sortie",                                                   group: "Algorithmique et programmation" },
    { name: "L'affectation",                                                                          group: "Algorithmique et programmation" },
    { name: "Chapitre 10: Les structures de contrôle conditionnelles",                                group: "Algorithmique et programmation" },
    { name: "Introduction",                                                                           group: "Algorithmique et programmation" },
    { name: "La structure conditionnelle simple",                                                     group: "Algorithmique et programmation" },
    { name: "La structure conditionnelle généralisée",                                                group: "Algorithmique et programmation" },
    { name: "La structure conditionnelle à choix",                                                    group: "Algorithmique et programmation" },
    { name: "Chapitre 11: Les structures de contrôle itératives",                                     group: "Algorithmique et programmation" },
    { name: "Introduction",                                                                           group: "Algorithmique et programmation" },
    { name: "La structure itérative complète",                                                        group: "Algorithmique et programmation" },
    { name: "La structure itérative à condition d'arrêt",                                             group: "Algorithmique et programmation" },
    { name: "Chapitre 12: Les sous programmes",                                                       group: "Algorithmique et programmation" },
    { name: "Introduction",                                                                           group: "Algorithmique et programmation" },
    { name: "Les fonctions",                                                                          group: "Algorithmique et programmation" },
    { name: "Les procédures",                                                                         group: "Algorithmique et programmation" },
  ] as FallbackChapter[],

  // ── Économie / Gestion — 2ème Économie et Services ─────────────────────────
  "2eme/economie_services/Économie / Gestion": [
    { name: "Présentation du programme de gestion",                               group: "Présentation du programme de gestion" },
    // Chapitre 1
    { name: "Section 1: Concepts fondamentaux et définition de la gestion",       group: "Chapitre 1: Introduction à la gestion" },
    { name: "Section 2: Les finalités de la gestion",                             group: "Chapitre 1: Introduction à la gestion" },
    { name: "Section 3: Les tâches du gestionnaire",                              group: "Chapitre 1: Introduction à la gestion" },
    { name: "Section 4: Les outils de la gestion",                                group: "Chapitre 1: Introduction à la gestion" },
    { name: "Section 5: La notion d'opportunité",                                 group: "Chapitre 1: Introduction à la gestion" },
    // Chapitre 2
    { name: "Chapitre 2: L'entreprise centre de décision",                        group: "Chapitre 2: L'entreprise centre de décision" },
    // Chapitre 3
    { name: "Chapitre 3: Décision d'achat",                                       group: "Chapitre 3: Décision d'achat" },
    // Chapitre 4
    { name: "Section 1: Processus de fabrication",                                group: "Chapitre 4: La décision de production" },
    { name: "Section 2: Organisation de la production",                           group: "Chapitre 4: La décision de production" },
    { name: "Section 3: Le contrôle de la production",                            group: "Chapitre 4: La décision de production" },
    { name: "Section 4: La notion de coût",                                       group: "Chapitre 4: La décision de production" },
    // Chapitre 5
    { name: "Introduction",                                                        group: "Chapitre 5: Les décisions liées au personnel" },
    { name: "Section 1: Le recrutement du personnel",                             group: "Chapitre 5: Les décisions liées au personnel" },
    { name: "Section 2: La rémunération du personnel",                            group: "Chapitre 5: Les décisions liées au personnel" },
    // Chapitre 6
    { name: "Introduction",                                                        group: "Chapitre 6: Les décisions de vente" },
    { name: "Section 1: Les prévisions des ventes",                               group: "Chapitre 6: Les décisions de vente" },
    { name: "Section 2: La provocation des ventes",                               group: "Chapitre 6: Les décisions de vente" },
    { name: "Section 3: La réalisation et le suivi des ventes",                   group: "Chapitre 6: Les décisions de vente" },
    { name: "Section 4: La saisie et le recouvrement des ventes",                 group: "Chapitre 6: Les décisions de vente" },
    // Chapitre 7
    { name: "Introduction",                                                        group: "Chapitre 7: Les décisions d'investissement et de financement" },
    { name: "Section 1: Les opérations d'investissement",                         group: "Chapitre 7: Les décisions d'investissement et de financement" },
    { name: "Section 2: Les opérations de financement",                           group: "Chapitre 7: Les décisions d'investissement et de financement" },
  ] as FallbackChapter[],

});

// ── 3ÈME SECONDAIRE ───────────────────────────────────────────────────────────
//
// Key strategy (same pattern as 2ème):
//   "3eme/X"                  — shared across ALL 3ème tracks (fallback)
//   "3eme/lettres/X"          — Lettres-specific book
//   "3eme/${sectionKey}/X"    — other track-specific books
//
// Subjects with two different books:
//   Arabe:   "3eme/lettres/Arabe"   (Lettres) | "3eme/Arabe"    (scientific fallback)
//   Français: "3eme/lettres/Français" (Lettres) | "3eme/Français" (scientific fallback)
//   Histoire: Lettres+Eco use const HISTOIRE_3EME_LETTRES_ECO    | "3eme/Histoire" (scientific)
//
// Placeholders (intentionally omitted → returns [] → shows empty state):
//   Éducation Islamique, Éducation Civique, Géographie (all tracks)
//   Éducation Islamique, Éducation Civique, Géographie need NO explicit key.
//   Eco Informatique needs an explicit [] to block the general fallback.

// Géographie shared by Lettres + Économie et Gestion (same book)
const GEOGRAPHIE_3EME_LETTRES_ECO: FallbackChapter[] = [
  // محور 1
  { name: "الدرس 1: مزايا الموقع الجغرافي",                                              group: "المحور الأول: المجال والتنمية في العالم العربي" },
  { name: "الدرس 2: الوسط الطبيعي: المزايا والضغوطات",                                  group: "المحور الأول: المجال والتنمية في العالم العربي" },
  { name: "الدرس 3: الموارد الطبيعية",                                                    group: "المحور الأول: المجال والتنمية في العالم العربي" },
  { name: "الدرس 4: السكان والمشكلات السكانية",                                          group: "المحور الأول: المجال والتنمية في العالم العربي" },
  { name: "الدرس 5: التجارب التنموية بالبلدان العربية",                                  group: "المحور الأول: المجال والتنمية في العالم العربي" },
  { name: "الدرس 6: الأدفاق المادية واللامادية",                                         group: "المحور الأول: المجال والتنمية في العالم العربي" },
  { name: "الدرس 7: تنظيم المجال بالعالم العربي",                                        group: "المحور الأول: المجال والتنمية في العالم العربي" },
  // محور 2
  { name: "الدرس 8: المجال التونسي: الموارد الطبيعية والبشرية",                         group: "المحور الثاني: المجال والتنمية بالبلاد التونسية" },
  { name: "الدرس 9: المجال الفلاحي",                                                      group: "المحور الثاني: المجال والتنمية بالبلاد التونسية" },
  { name: "الدرس 10: المجال السياحي",                                                     group: "المحور الثاني: المجال والتنمية بالبلاد التونسية" },
  { name: "الدرس 11: المجال التجاري",                                                     group: "المحور الثاني: المجال والتنمية بالبلاد التونسية" },
  { name: "الدرس 12: المجال الصناعي",                                                     group: "المحور الثاني: المجال والتنمية بالبلاد التونسية" },
  // محور 3
  { name: "الدرس 13: الولايات المتحدة الأمريكية: دعائم القوة",                           group: "المحور الثالث: المجال والتنمية في الأقطاب الاقتصادية الكبرى" },
  { name: "الدرس 14: الاتحاد الأوروبي: دعائم القوة",                                     group: "المحور الثالث: المجال والتنمية في الأقطاب الاقتصادية الكبرى" },
  { name: "الدرس 15: اليابان: دعائم القوة",                                               group: "المحور الثالث: المجال والتنمية في الأقطاب الاقتصادية الكبرى" },
  { name: "الدرس 16: الأقطاب الاقتصادية الكبرى: المكانة العالمية",                      group: "المحور الثالث: المجال والتنمية في الأقطاب الاقتصادية الكبرى" },
  { name: "الدرس 17: الأقطاب الاقتصادية الكبرى: حدود القوة",                            group: "المحور الثالث: المجال والتنمية في الأقطاب الاقتصادية الكبرى" },
] as FallbackChapter[];

// Géographie shared by Maths / Sciences Exp / Sciences Tech / Sciences Info (same book)
const GEOGRAPHIE_3EME_SCIENCES: FallbackChapter[] = [
  // محور 1
  { name: "الدرس 1: الأدفاق التجارية",                                                    group: "المحور الأول: مجال عالمي مترابط ومتفاوت" },
  { name: "الدرس 2: الأدفاق المالية",                                                     group: "المحور الأول: مجال عالمي مترابط ومتفاوت" },
  { name: "الدرس 3: أدفاق الإعلام",                                                       group: "المحور الأول: مجال عالمي مترابط ومتفاوت" },
  { name: "الدرس 4: المجال العالمي: التفاوت في التقدم وتركيبة العالم",                  group: "المحور الأول: مجال عالمي مترابط ومتفاوت" },
  { name: "ملف منهجي تقييمي: منهجية المقالة الجغرافية",                                 group: "المحور الأول: مجال عالمي مترابط ومتفاوت" },
  // محور 2
  { name: "الدرس 1: الاتحاد الأوروبي: المجال والسكان",                                  group: "المحور الثاني: الاتحاد الأوروبي" },
  { name: "الدرس 2: الاتحاد الأوروبي: دعائم القوة",                                     group: "المحور الثاني: الاتحاد الأوروبي" },
  { name: "الدرس 3: الاتحاد الأوروبي: المظاهر الاقتصادية للقوة",                       group: "المحور الثاني: الاتحاد الأوروبي" },
  { name: "الدرس 4: الاتحاد الأوروبي: حدود القوة",                                      group: "المحور الثاني: الاتحاد الأوروبي" },
  // محور 3
  { name: "الدرس 1: الولايات المتحدة الأمريكية: المجال والسكان",                        group: "المحور الثالث: الولايات المتحدة الأمريكية" },
  { name: "الدرس 2: الولايات المتحدة الأمريكية: دعائم القوة",                           group: "المحور الثالث: الولايات المتحدة الأمريكية" },
  { name: "الدرس 3: الولايات المتحدة الأمريكية: المظاهر الاقتصادية للقوة",             group: "المحور الثالث: الولايات المتحدة الأمريكية" },
  { name: "الدرس 4: الولايات المتحدة الأمريكية: حدود القوة",                            group: "المحور الثالث: الولايات المتحدة الأمريكية" },
  // محور 4
  { name: "الدرس 1: اليابان: المجال والسكان",                                            group: "المحور الرابع: اليابان" },
  { name: "الدرس 2: اليابان: دعائم القوة",                                               group: "المحور الرابع: اليابان" },
  { name: "الدرس 3: اليابان: المظاهر الاقتصادية للقوة",                                 group: "المحور الرابع: اليابان" },
  { name: "الدرس 4: اليابان: حدود القوة",                                                group: "المحور الرابع: اليابان" },
] as FallbackChapter[];

// Histoire shared by Lettres + Économie et Gestion (same book)
const HISTOIRE_3EME_LETTRES_ECO: FallbackChapter[] = [
  // محور 1
  { name: "الدرس 1: الاكتشافات الجغرافية الكبرى ونتائجها",                                                      group: "المحور الأول: أوروبا والعالم المتوسطي في القرن السادس عشر" },
  { name: "الدرس 2: النهضة الأوروبية: المظاهر",                                                                 group: "المحور الأول: أوروبا والعالم المتوسطي في القرن السادس عشر" },
  { name: "الدرس 3: النهضة الأوروبية: دراسة شخصية علمية: نيكولا كوبرنيك",                                      group: "المحور الأول: أوروبا والعالم المتوسطي في القرن السادس عشر" },
  { name: "الدرس 4: النهضة الأوروبية: دراسة فنية: لوحة الجوكوندا",                                             group: "المحور الأول: أوروبا والعالم المتوسطي في القرن السادس عشر" },
  { name: "الدرس 5: توسع الإمبراطورية العثمانية وتنظيمها في القرن السادس عشر",                                  group: "المحور الأول: أوروبا والعالم المتوسطي في القرن السادس عشر" },
  { name: "الدرس 6: أزمة الدولة الحفصية في القرن السادس عشر",                                                   group: "المحور الأول: أوروبا والعالم المتوسطي في القرن السادس عشر" },
  { name: "الدرس 7: الصراع العثماني الإسباني في المتوسط وانتصاب العثمانيين في تونس",                            group: "المحور الأول: أوروبا والعالم المتوسطي في القرن السادس عشر" },
  { name: "ملف منهجي تقييمي",                                                                                   group: "المحور الأول: أوروبا والعالم المتوسطي في القرن السادس عشر" },
  // محور 2
  { name: "الدرس 8: التحولات الاقتصادية في أوروبا الغربية: المثال الإنجليزي",                                   group: "المحور الثاني: تحولات العالم الغربي في القرنين السابع عشر والثامن عشر" },
  { name: "الدرس 9: فكر التنوير",                                                                               group: "المحور الثاني: تحولات العالم الغربي في القرنين السابع عشر والثامن عشر" },
  { name: "الدرس 10: دراسة أثر من عصر التنوير: الموسوعة",                                                       group: "المحور الثاني: تحولات العالم الغربي في القرنين السابع عشر والثامن عشر" },
  { name: "الدرس 11: الثورة الفرنسية وانتصار المبادئ الجديدة",                                                  group: "المحور الثاني: تحولات العالم الغربي في القرنين السابع عشر والثامن عشر" },
  { name: "ملف منهجي تقييمي",                                                                                   group: "المحور الثاني: تحولات العالم الغربي في القرنين السابع عشر والثامن عشر" },
  // محور 3
  { name: "الدرس 12: أزمة الإمبراطورية العثمانية ومحاولات الإصلاح الأولى",                                     group: "المحور الثالث: الإمبراطورية العثمانية والمغرب العربي في القرن الثامن عشر" },
  { name: "الدرس 13: التطور السياسي للإيالات العثمانية والمغرب الأقصى في القرن الثامن عشر",                    group: "المحور الثالث: الإمبراطورية العثمانية والمغرب العربي في القرن الثامن عشر" },
  { name: "الدرس 14: الدولة الحسينية في القرن الثامن عشر: علاقة السلطة بالمجتمع",                              group: "المحور الثالث: الإمبراطورية العثمانية والمغرب العربي في القرن الثامن عشر" },
  { name: "ملف منهجي تقييمي",                                                                                   group: "المحور الثالث: الإمبراطورية العثمانية والمغرب العربي في القرن الثامن عشر" },
  // محور 4
  { name: "الدرس 15: الثورة الصناعية",                                                                          group: "المحور الرابع: الثورة الصناعية وتركيز الاقتصاد الرأسمالي في القرن التاسع عشر" },
  { name: "الدرس 16: التحولات الاقتصادية والاجتماعية في القرن التاسع عشر",                                     group: "المحور الرابع: الثورة الصناعية وتركيز الاقتصاد الرأسمالي في القرن التاسع عشر" },
  { name: "الدرس 17: التيارات السياسية والفكرية في القرن التاسع عشر",                                           group: "المحور الرابع: الثورة الصناعية وتركيز الاقتصاد الرأسمالي في القرن التاسع عشر" },
  { name: "الدرس 18: التوسع الاستعماري واقتسام العالم",                                                         group: "المحور الرابع: الثورة الصناعية وتركيز الاقتصاد الرأسمالي في القرن التاسع عشر" },
  { name: "ملف منهجي تقييمي",                                                                                   group: "المحور الرابع: الثورة الصناعية وتركيز الاقتصاد الرأسمالي في القرن التاسع عشر" },
  // محور 5
  { name: "الدرس 19: النهضة العربية الحديثة",                                                                   group: "المحور الخامس: الهيمنة العربية الحديثة وتطور الإيالة التونسية في القرن التاسع عشر" },
  { name: "الدرس 20: أزمة الإيالة التونسية في القرن التاسع عشر",                                               group: "المحور الخامس: الهيمنة العربية الحديثة وتطور الإيالة التونسية في القرن التاسع عشر" },
  { name: "الدرس 21: محاولات الإصلاح",                                                                          group: "المحور الخامس: الهيمنة العربية الحديثة وتطور الإيالة التونسية في القرن التاسع عشر" },
  { name: "الدرس 22: انتصاب الحماية الفرنسية على تونس وردود الفعل الأولى",                                     group: "المحور الخامس: الهيمنة العربية الحديثة وتطور الإيالة التونسية في القرن التاسع عشر" },
  { name: "الدرس 23: بوادر الحركة الوطنية التونسية إلى حدود 1914",                                             group: "المحور الخامس: الهيمنة العربية الحديثة وتطور الإيالة التونسية في القرن التاسع عشر" },
  { name: "ملف منهجي تقييمي",                                                                                   group: "المحور الخامس: الهيمنة العربية الحديثة وتطور الإيالة التونسية في القرن التاسع عشر" },
  { name: "المصادر والمراجع",                                                                                    group: "المحور الخامس: الهيمنة العربية الحديثة وتطور الإيالة التونسية في القرن التاسع عشر" },
  { name: "توزيع الدروس",                                                                                        group: "المحور الخامس: الهيمنة العربية الحديثة وتطور الإيالة التونسية في القرن التاسع عشر" },
] as FallbackChapter[];

Object.assign(CURRICULUM_FALLBACK, {

  // ── ANGLAIS — shared across all 3ème tracks ────────────────────────────────
  "3eme/Anglais": [
    { name: "Review Module",                                        group: "Review Module" },
    { name: "Family Relationships",                                 group: "Module 1: In Time of Test, Family is Best" },
    { name: "Family roles",                                         group: "Module 1: In Time of Test, Family is Best" },
    { name: "The generation gap",                                   group: "Module 1: In Time of Test, Family is Best" },
    { name: "Values and attitudes",                                 group: "Module 2: We Learn to Give, Share and Care" },
    { name: "Philanthropy",                                         group: "Module 2: We Learn to Give, Share and Care" },
    { name: "Charity",                                              group: "Module 2: We Learn to Give, Share and Care" },
    { name: "Altruism",                                             group: "Module 2: We Learn to Give, Share and Care" },
    { name: "Activism",                                             group: "Module 2: We Learn to Give, Share and Care" },
    { name: "Self-sacrifice",                                       group: "Module 2: We Learn to Give, Share and Care" },
    { name: "Volunteerism",                                         group: "Module 2: We Learn to Give, Share and Care" },
    { name: "Solidarity",                                           group: "Module 2: We Learn to Give, Share and Care" },
    { name: "Generosity",                                           group: "Module 2: We Learn to Give, Share and Care" },
    { name: "Consolidation Module 1",                              group: "Consolidation Module 1" },
    { name: "Entertainment",                                        group: "Module 3: A Change is as Good as a Rest" },
    { name: "Leisure activities",                                   group: "Module 3: A Change is as Good as a Rest" },
    { name: "History and geography of places visited",             group: "Module 3: A Change is as Good as a Rest" },
    { name: "Facilities",                                           group: "Module 3: A Change is as Good as a Rest" },
    { name: "Travel",                                               group: "Module 3: A Change is as Good as a Rest" },
    { name: "Holidays",                                             group: "Module 3: A Change is as Good as a Rest" },
    { name: "Eating out",                                           group: "Module 3: A Change is as Good as a Rest" },
    { name: "Science and inventions",                               group: "Module 4: Science and Technology: A Blessing or a Curse?" },
    { name: "Technology",                                           group: "Module 4: Science and Technology: A Blessing or a Curse?" },
    { name: "Inventions",                                           group: "Module 4: Science and Technology: A Blessing or a Curse?" },
    { name: "Experiments",                                          group: "Module 4: Science and Technology: A Blessing or a Curse?" },
    { name: "Medical research and progress",                        group: "Module 4: Science and Technology: A Blessing or a Curse?" },
    { name: "Computers",                                            group: "Module 4: Science and Technology: A Blessing or a Curse?" },
    { name: "TV",                                                   group: "Module 4: Science and Technology: A Blessing or a Curse?" },
    { name: "Mobile phones",                                        group: "Module 4: Science and Technology: A Blessing or a Curse?" },
    { name: "Genetic engineering",                                  group: "Module 4: Science and Technology: A Blessing or a Curse?" },
    { name: "New technology and its impact on our daily life",      group: "Module 4: Science and Technology: A Blessing or a Curse?" },
    { name: "Consolidation Module 2",                              group: "Consolidation Module 2" },
    { name: "Education",                                            group: "Module 5: Education is Not Filling a Bucket but Lighting a Fire" },
    { name: "Professional life",                                    group: "Module 5: Education is Not Filling a Bucket but Lighting a Fire" },
    { name: "Distance learning",                                    group: "Module 5: Education is Not Filling a Bucket but Lighting a Fire" },
    { name: "Electronic learning",                                  group: "Module 5: Education is Not Filling a Bucket but Lighting a Fire" },
    { name: "Special education",                                    group: "Module 5: Education is Not Filling a Bucket but Lighting a Fire" },
    { name: "Dream school",                                         group: "Module 5: Education is Not Filling a Bucket but Lighting a Fire" },
    { name: "Exams",                                                group: "Module 5: Education is Not Filling a Bucket but Lighting a Fire" },
    { name: "School life",                                          group: "Module 5: Education is Not Filling a Bucket but Lighting a Fire" },
    { name: "School violence",                                      group: "Module 5: Education is Not Filling a Bucket but Lighting a Fire" },
    { name: "Ecology",                                              group: "Module 6: Nature: Any Future Without It?" },
    { name: "Environmental issues",                                 group: "Module 6: Nature: Any Future Without It?" },
    { name: "Natural disasters",                                    group: "Module 6: Nature: Any Future Without It?" },
  ] as FallbackChapter[],

  // ── ARABE — 3ème Lettres ───────────────────────────────────────────────────
  "3eme/lettres/Arabe": [
    { name: "الشعر الأندلسي والموشحات",  group: "الأدب" },
    { name: "المقامة",                    group: "الأدب" },
    { name: "الشعر الحديث",              group: "الأدب" },
    { name: "المسرحية",                  group: "الأدب" },
    { name: "السيرة الذاتية",            group: "الأدب" },
  ] as FallbackChapter[],

  // ── ARABE — 3ème scientific/maths/eco/info tracks (fallback) ──────────────
  "3eme/Arabe": [
    // محور 1
    { name: "النص التمهيدي: الحاجة إلى الفكاهة والضحك",                                  group: "المحور الأول: الفكاهة والهزل في القصص العربي القديم" },
    { name: "من المقامة الحلوانية",                                                        group: "المحور الأول: الفكاهة والهزل في القصص العربي القديم" },
    { name: "من المقامة المجاعية",                                                         group: "المحور الأول: الفكاهة والهزل في القصص العربي القديم" },
    { name: "أبو دلامة والمهدي",                                                           group: "المحور الأول: الفكاهة والهزل في القصص العربي القديم" },
    { name: "الكساحة",                                                                     group: "المحور الأول: الفكاهة والهزل في القصص العربي القديم" },
    { name: "من المقامة الموصلية",                                                         group: "المحور الأول: الفكاهة والهزل في القصص العربي القديم" },
    { name: "من المقامة الأرمنية",                                                         group: "المحور الأول: الفكاهة والهزل في القصص العربي القديم" },
    { name: "أشير إليها باللقمة",                                                          group: "المحور الأول: الفكاهة والهزل في القصص العربي القديم" },
    { name: "دع الحمار مكانه",                                                             group: "المحور الأول: الفكاهة والهزل في القصص العربي القديم" },
    { name: "عد لتزيدك",                                                                   group: "المحور الأول: الفكاهة والهزل في القصص العربي القديم" },
    { name: "النص التكميلي: النص الهزلي",                                                 group: "المحور الأول: الفكاهة والهزل في القصص العربي القديم" },
    // محور 2
    { name: "النص التمهيدي: الصورة والثقافة والاتصال",                                    group: "المحور الثاني: صور ونصوص" },
    { name: "غرنكا",                                                                        group: "المحور الثاني: صور ونصوص" },
    { name: "الحرية تقود الشعب",                                                           group: "المحور الثاني: صور ونصوص" },
    { name: "جينيفر لي ينشي",                                                              group: "المحور الثاني: صور ونصوص" },
    { name: "البهجة الأبدية",                                                              group: "المحور الثاني: صور ونصوص" },
    { name: "المرأة في صورة الإشهار",                                                     group: "المحور الثاني: صور ونصوص" },
    { name: "سلاح دمار شامل",                                                              group: "المحور الثاني: صور ونصوص" },
    { name: "الصورة وخطاب العنف",                                                          group: "المحور الثاني: صور ونصوص" },
    { name: "تسونامي",                                                                     group: "المحور الثاني: صور ونصوص" },
    { name: "اغتيال محمد الدرة",                                                           group: "المحور الثاني: صور ونصوص" },
    { name: "التفعيل الجمالي لمشهد العالم",                                               group: "المحور الثاني: صور ونصوص" },
    { name: "صيرفي",                                                                       group: "المحور الثاني: صور ونصوص" },
    { name: "المرأة في أعمال الزبير التركي",                                              group: "المحور الثاني: صور ونصوص" },
    { name: "النص التكميلي: بين الواقع والتخييل",                                        group: "المحور الثاني: صور ونصوص" },
    // محور 3
    { name: "النص التمهيدي: الإبداع النسائي",                                             group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "من هي المرأة الحقيقية؟",                                                     group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "تريد المشاركة",                                                              group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "لا خلاص إلا بالمساواة",                                                     group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "الحريم",                                                                      group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "الزمن المضاد للشعر",                                                          group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "دعوة إلى الحياة",                                                            group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "المرأة البرمكية",                                                             group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "حمزة",                                                                        group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "المرأة والمدينة",                                                             group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "حوار مع منى واصف",                                                            group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "الاتجار بالنساء والأطفال",                                                   group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "عالم بلا قلب",                                                               group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "العولمة وتشغيل المرأة",                                                      group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    { name: "النص التكميلي: واقع المرأة العربية",                                        group: "المحور الثالث: شواغل المرأة وقيم المرأة" },
    // محور 4
    { name: "لا سبيل إلى العمارة إلا بالعدل",                                            group: "المحور الرابع: العدل والإنصاف" },
    { name: "الثوب الجديد",                                                               group: "المحور الرابع: العدل والإنصاف" },
    { name: "اربط وحل كما تشاء",                                                          group: "المحور الرابع: العدل والإنصاف" },
    { name: "في محكمة الاستئناف",                                                          group: "المحور الرابع: العدل والإنصاف" },
    { name: "شهادة أم",                                                                   group: "المحور الرابع: العدل والإنصاف" },
    { name: "إني مظلوم وقد أعوزني الإنصاف",                                              group: "المحور الرابع: العدل والإنصاف" },
    { name: "بردت غضبي بثورتك",                                                           group: "المحور الرابع: العدل والإنصاف" },
    { name: "إصلاح السلطان",                                                              group: "المحور الرابع: العدل والإنصاف" },
    { name: "حكاية الثريا",                                                               group: "المحور الرابع: العدل والإنصاف" },
    { name: "عدل روما",                                                                   group: "المحور الرابع: العدل والإنصاف" },
    // محور 5
    { name: "النص التمهيدي: الحرية اختيار شامل",                                         group: "المحور الخامس: حرية التعبير" },
    { name: "الحرية منبع التقدم والتمدن",                                                 group: "المحور الخامس: حرية التعبير" },
    { name: "حرية الصحافة",                                                               group: "المحور الخامس: حرية التعبير" },
    { name: "هندسة الرؤية في الإعلام",                                                   group: "المحور الخامس: حرية التعبير" },
    { name: "الإعلام والغزو الثقافي",                                                    group: "المحور الخامس: حرية التعبير" },
    { name: "دفاعا عن حرية الرأي",                                                       group: "المحور الخامس: حرية التعبير" },
    { name: "الاستبداد والحرية واللسان",                                                  group: "المحور الخامس: حرية التعبير" },
    { name: "الدولة وحرية التعبير",                                                       group: "المحور الخامس: حرية التعبير" },
    { name: "عوائق حرية التعبير",                                                         group: "المحور الخامس: حرية التعبير" },
    { name: "مدن الحرية",                                                                 group: "المحور الخامس: حرية التعبير" },
    { name: "أحب نكهة تمردي",                                                             group: "المحور الخامس: حرية التعبير" },
    { name: "النص التكميلي: حرية التفكير والتعبير",                                     group: "المحور الخامس: حرية التعبير" },
    // محور 6
    { name: "ليس البيت فندقا",                                                            group: "المحور السادس: الإنسان والمكان" },
    { name: "واي العيون",                                                                  group: "المحور السادس: الإنسان والمكان" },
    { name: "كيف يموت النخل؟",                                                            group: "المحور السادس: الإنسان والمكان" },
    { name: "القرية المحفورة في الذاكرة",                                                group: "المحور السادس: الإنسان والمكان" },
    { name: "مرسيليا",                                                                    group: "المحور السادس: الإنسان والمكان" },
    { name: "شارع الأميرات",                                                              group: "المحور السادس: الإنسان والمكان" },
    { name: "مجالي الزهراء",                                                              group: "المحور السادس: الإنسان والمكان" },
    { name: "غريب على الخليج",                                                            group: "المحور السادس: الإنسان والمكان" },
    { name: "قصيدة الأرض",                                                                group: "المحور السادس: الإنسان والمكان" },
    { name: "حرية السجين",                                                                group: "المحور السادس: الإنسان والمكان" },
    { name: "البيئة والإنسان",                                                            group: "المحور السادس: الإنسان والمكان" },
    { name: "الولاء للبيئة",                                                              group: "المحور السادس: الإنسان والمكان" },
  ] as FallbackChapter[],

  // ── FRANÇAIS — 3ème Lettres ────────────────────────────────────────────────
  "3eme/lettres/Français": [
    { name: "Textes à lire et à expliquer",  group: "Module 1: Récits de voyage" },
    { name: "Lectures complémentaires",      group: "Module 1: Récits de voyage" },
    { name: "Activités lexicales",           group: "Module 1: Récits de voyage" },
    { name: "Lecture de l'image",            group: "Module 1: Récits de voyage" },
    { name: "Pratique de la langue",         group: "Module 1: Récits de voyage" },
    { name: "Pratique de l'oral",            group: "Module 1: Récits de voyage" },
    { name: "Pratique de l'écriture",        group: "Module 1: Récits de voyage" },
    { name: "Repères et rapprochements",     group: "Module 1: Récits de voyage" },
    { name: "Fiche de projet",               group: "Module 1: Récits de voyage" },
    { name: "Autoévaluation",                group: "Module 1: Récits de voyage" },
    { name: "Textes à lire et à expliquer",  group: "Module 2: Droit à la différence" },
    { name: "Lectures complémentaires",      group: "Module 2: Droit à la différence" },
    { name: "Activités lexicales",           group: "Module 2: Droit à la différence" },
    { name: "Lecture de l'image",            group: "Module 2: Droit à la différence" },
    { name: "Pratique de la langue",         group: "Module 2: Droit à la différence" },
    { name: "Pratique de l'oral",            group: "Module 2: Droit à la différence" },
    { name: "Pratique de l'écriture",        group: "Module 2: Droit à la différence" },
    { name: "Repères et rapprochements",     group: "Module 2: Droit à la différence" },
    { name: "Fiche de projet",               group: "Module 2: Droit à la différence" },
    { name: "Autoévaluation",                group: "Module 2: Droit à la différence" },
    { name: "Textes à lire et à expliquer",  group: "Module 3: Mythes d'hier, mythes d'aujourd'hui" },
    { name: "Lectures complémentaires",      group: "Module 3: Mythes d'hier, mythes d'aujourd'hui" },
    { name: "Activités lexicales",           group: "Module 3: Mythes d'hier, mythes d'aujourd'hui" },
    { name: "Lecture de l'image",            group: "Module 3: Mythes d'hier, mythes d'aujourd'hui" },
    { name: "Pratique de la langue",         group: "Module 3: Mythes d'hier, mythes d'aujourd'hui" },
    { name: "Pratique de l'oral",            group: "Module 3: Mythes d'hier, mythes d'aujourd'hui" },
    { name: "Pratique de l'écriture",        group: "Module 3: Mythes d'hier, mythes d'aujourd'hui" },
    { name: "Repères et rapprochements",     group: "Module 3: Mythes d'hier, mythes d'aujourd'hui" },
    { name: "Fiche de projet",               group: "Module 3: Mythes d'hier, mythes d'aujourd'hui" },
    { name: "Autoévaluation",                group: "Module 3: Mythes d'hier, mythes d'aujourd'hui" },
  ] as FallbackChapter[],

  // ── FRANÇAIS — 3ème scientific / maths / eco / tech / info (fallback) ──────
  "3eme/Français": [
    { name: "Invitation au voyage",                   group: "Module 1: Invitation au voyage" },
    { name: "Le mythe aujourd'hui",                   group: "Module 2: Le mythe aujourd'hui" },
    { name: "Le droit à la différence",               group: "Module 3: Le droit à la différence" },
    { name: "Celui qui n'avait jamais vu la mer",     group: "Module 4: Celui qui n'avait jamais vu la mer" },
    { name: "Scènes comiques",                        group: "Module 5: Scènes comiques" },
    { name: "Le pouvoir de l'image",                  group: "Module de lecture: Le pouvoir de l'image" },
  ] as FallbackChapter[],

  // ── HISTOIRE — 3ème Lettres + 3ème Économie et Gestion (same book) ─────────
  "3eme/lettres/Histoire":        HISTOIRE_3EME_LETTRES_ECO,
  "3eme/economie_gestion/Histoire": HISTOIRE_3EME_LETTRES_ECO,

  // ── HISTOIRE — 3ème Mathématiques / Sciences Exp / Sciences Tech / Sciences Info
  "3eme/Histoire": [
    { name: "الدرس الأول: فكر التنوير",                                                               group: "المحور الأول: التحولات الفكرية والاقتصادية والاجتماعية في أوروبا في العصر الحديث" },
    { name: "الدرس الثاني: الثورة الفرنسية وانتصار المبادئ الجديدة",                                 group: "المحور الأول: التحولات الفكرية والاقتصادية والاجتماعية في أوروبا في العصر الحديث" },
    { name: "الدرس الثالث: الثورة الصناعية: أهم مظاهرها",                                            group: "المحور الأول: التحولات الفكرية والاقتصادية والاجتماعية في أوروبا في العصر الحديث" },
    { name: "الدرس الرابع: التحولات الاقتصادية والاجتماعية بأوروبا الغربية في القرن XIX",            group: "المحور الأول: التحولات الفكرية والاقتصادية والاجتماعية في أوروبا في العصر الحديث" },
    { name: "الدرس الخامس: التيارات الفكرية والسياسية في أوروبا في القرن XIX",                        group: "المحور الأول: التحولات الفكرية والاقتصادية والاجتماعية في أوروبا في العصر الحديث" },
    { name: "الدرس السادس: التوسع الاستعماري واقتسام العالم في القرن XIX",                            group: "المحور الأول: التحولات الفكرية والاقتصادية والاجتماعية في أوروبا في العصر الحديث" },
  ] as FallbackChapter[],

  // ── MATHÉMATIQUES — 3ème Économie et Gestion ──────────────────────────────
  "3eme/economie_gestion/Mathématiques": [
    { name: "Chapitre 1: Statistiques",                                           group: "Partie I" },
    { name: "Chapitre 2: Suites réelles",                                         group: "Partie I" },
    { name: "Chapitre 3: Dénombrement",                                           group: "Partie I" },
    { name: "Chapitre 4: Probabilité",                                            group: "Partie I" },
    { name: "Chapitre 5: Initiation aux graphes",                                 group: "Partie I" },
    { name: "Chapitre 6: Système d'équations linéaires",                          group: "Partie I" },
    { name: "Chapitre 7: Généralités sur les fonctions",                          group: "Partie II" },
    { name: "Chapitre 8: Limite finie en un point et continuité",                 group: "Partie II" },
    { name: "Chapitre 9: Extension de la notion de limite et branches infinies",  group: "Partie II" },
    { name: "Chapitre 10: Dérivation",                                            group: "Partie II" },
    { name: "Chapitre 11: Exemples d'études de fonctions",                        group: "Partie II" },
    { name: "Chapitre 12: Fonctions trigonométriques",                            group: "Partie II" },
  ] as FallbackChapter[],

  // ── MATHÉMATIQUES — 3ème Mathématiques ────────────────────────────────────
  "3eme/mathematiques/Mathématiques": [
    { name: "Chapitre 1: Produit scalaire dans le plan",                          group: "Tome 2" },
    { name: "Chapitre 2: Angles orientés",                                        group: "Tome 2" },
    { name: "Chapitre 3: Trigonométrie",                                          group: "Tome 2" },
    { name: "Chapitre 4: Rotations",                                              group: "Tome 2" },
    { name: "Chapitre 5: Nombres complexes",                                      group: "Tome 2" },
    { name: "Chapitre 6: Dénombrement",                                           group: "Tome 2" },
    { name: "Chapitre 7: Divisibilité dans Z",                                    group: "Tome 2" },
    { name: "Chapitre 8: Nombres premiers",                                       group: "Tome 2" },
    { name: "Chapitre 9: Vecteurs de l'espace",                                   group: "Tome 2" },
    { name: "Chapitre 10: Produit scalaire et produit vectoriel dans l'espace",   group: "Tome 2" },
    { name: "Chapitre 11: Équations de droites et de plans. Équation d'une sphère", group: "Tome 2" },
  ] as FallbackChapter[],

  // ── MATHÉMATIQUES — 3ème Sciences expérimentales ──────────────────────────
  "3eme/sciences_experimentales/Mathématiques": [
    { name: "Chapitre 1: Généralités sur les fonctions",                          group: "Tome 1" },
    { name: "Chapitre 2: Continuité",                                             group: "Tome 1" },
    { name: "Chapitre 3: Limites et continuité",                                  group: "Tome 1" },
    { name: "Chapitre 4: Limites et comportements asymptotiques",                 group: "Tome 1" },
    { name: "Chapitre 5: Nombre dérivé",                                          group: "Tome 1" },
    { name: "Chapitre 6: Fonction dérivée",                                       group: "Tome 1" },
    { name: "Chapitre 7: Exemples d'étude de fonctions",                          group: "Tome 1" },
    { name: "Chapitre 8: Fonctions trigonométriques",                             group: "Tome 1" },
    { name: "Chapitre 9: Suites réelles",                                         group: "Tome 1" },
    { name: "Chapitre 10: Limites de suites réelles",                             group: "Tome 1" },
  ] as FallbackChapter[],

  // ── MATHÉMATIQUES — 3ème Sciences de l'informatique ───────────────────────
  "3eme/sciences_informatique/Mathématiques": [
    { name: "Chapitre 1: Généralités sur les fonctions numériques à variable réelle",           group: "Première partie" },
    { name: "Chapitre 2: Les suites réelles",                                                   group: "Première partie" },
    { name: "Chapitre 3: Limites, continuité, branches infinies",                               group: "Première partie" },
    { name: "Chapitre 4: Dérivabilité d'une fonction",                                          group: "Première partie" },
    { name: "Chapitre 5: Fonctions dérivées - Applications",                                    group: "Première partie" },
    { name: "Chapitre 6: Étude de fonctions 1: Exemples de fonctions polynômes",               group: "Première partie" },
    { name: "Chapitre 7: Étude de fonctions 2: Exemples de fonctions rationnelles, irrationnelles et trigonométriques", group: "Première partie" },
  ] as FallbackChapter[],

  // ── MATHÉMATIQUES — 3ème Sciences techniques ──────────────────────────────
  "3eme/sciences_techniques/Mathématiques": [
    { name: "Chapitre 1: Généralités sur les fonctions",   group: "Première partie" },
    { name: "Chapitre 2: Notion de limite",                group: "Première partie" },
    { name: "Chapitre 3: Continuité",                      group: "Première partie" },
    { name: "Chapitre 4: Dérivabilité",                    group: "Première partie" },
    { name: "Chapitre 5: Étude de fonctions",              group: "Première partie" },
    { name: "Chapitre 6: Fonctions circulaires",           group: "Première partie" },
    { name: "Chapitre 7: Suites réelles",                  group: "Première partie" },
    { name: "Chapitre 8: Dénombrement",                    group: "Première partie" },
    { name: "Chapitre 9: Probabilités",                    group: "Première partie" },
    { name: "Chapitre 10: Statistiques",                   group: "Première partie" },
  ] as FallbackChapter[],

  // ── PHYSIQUE-CHIMIE — 3ème Mathématiques (partial) ────────────────────────
  "3eme/mathematiques/Physique-Chimie": [
    { name: "Chapitre 1: Interaction électrique",         group: "Les interactions dans l'univers" },
    { name: "Chapitre 2: Interaction magnétique",         group: "Les interactions dans l'univers" },
    { name: "Chapitre 3: Force de Laplace",               group: "Les interactions dans l'univers" },
    { name: "Chapitre 4-A: Interaction gravitationnelle", group: "Les interactions dans l'univers" },
    { name: "Chapitre 4-B: Interaction forte",            group: "Les interactions dans l'univers" },
  ] as FallbackChapter[],

  // ── PHYSIQUE-CHIMIE — 3ème Sciences expérimentales (partial) ──────────────
  "3eme/sciences_experimentales/Physique-Chimie": [
    { name: "Interaction électrique",    group: "Les interactions dans l'univers" },
    { name: "Loi de Coulomb",            group: "Les interactions dans l'univers" },
    { name: "Champ électrique",          group: "Les interactions dans l'univers" },
    { name: "Force électrique",          group: "Les interactions dans l'univers" },
    { name: "Interaction magnétique",    group: "Les interactions dans l'univers" },
    { name: "Champ magnétique",          group: "Les interactions dans l'univers" },
    { name: "Force de Laplace",          group: "Les interactions dans l'univers" },
  ] as FallbackChapter[],

  // ── SVT — 3ème Lettres ─────────────────────────────────────────────────────
  "3eme/lettres/SVT": [
    { name: "La structure de la cellule eucaryote",       group: "La cellule, unité de structure des êtres vivants" },
    { name: "L'ultrastructure de la cellule eucaryote",   group: "La cellule, unité de structure des êtres vivants" },
    { name: "Observation de cellules en division",        group: "La mitose, mécanisme de reproduction conforme" },
    { name: "Mitose et programme génétique",              group: "La mitose, mécanisme de reproduction conforme" },
  ] as FallbackChapter[],

  // ── SVT — 3ème Sciences expérimentales (Thème 1 only) ─────────────────────
  "3eme/sciences_experimentales/SVT": [
    { name: "Chapitre 1: La malnutrition",                         group: "Thème 1, Partie I: L'alimentation saine et équilibrée" },
    { name: "Chapitre 2: Les besoins nutritionnels de l'Homme",    group: "Thème 1, Partie I: L'alimentation saine et équilibrée" },
    { name: "Chapitre 1: Des aliments aux nutriments: la digestion",   group: "Thème 1, Partie II: Utilisation des nutriments par l'organisme" },
    { name: "Chapitre 2: Dégradation des nutriments: la respiration",  group: "Thème 1, Partie II: Utilisation des nutriments par l'organisme" },
    { name: "Chapitre 1: Les risques liés à la consommation des aliments contaminés", group: "Thème 1, Partie III: Nutrition et environnement" },
    { name: "Chapitre 2: Des microorganismes au service de la production des aliments", group: "Thème 1, Partie III: Nutrition et environnement" },
    { name: "Chapitre 1: Le milieu intérieur et ses caractéristiques", group: "Thème 1, Partie IV: La constance du milieu intérieur" },
    { name: "Chapitre 2: L'excrétion urinaire",                        group: "Thème 1, Partie IV: La constance du milieu intérieur" },
    { name: "Chapitre 3: La régulation de la glycémie",                group: "Thème 1, Partie IV: La constance du milieu intérieur" },
  ] as FallbackChapter[],

  // ── INFORMATIQUE — 3ème Lettres ────────────────────────────────────────────
  "3eme/lettres/Informatique": [
    { name: "Chapitre I: Culture informatique",     group: "Culture informatique" },
    { name: "Chapitre II: Architecture d'un ordinateur", group: "Architecture et systèmes" },
    { name: "Chapitre III: Système d'exploitation et réseaux", group: "Architecture et systèmes" },
    { name: "Chapitre IV: Internet",                group: "Internet et bureautique" },
    { name: "Chapitre V: Traitement de texte",      group: "Internet et bureautique" },
    { name: "Chapitre VI: Tableur",                 group: "Internet et bureautique" },
    { name: "Chapitre VII: Éléments de présentation", group: "Internet et bureautique" },
    { name: "Chapitre VIII: Étude et réalisation d'un projet", group: "Projet" },
    { name: "Annexes",                              group: "Annexes" },
    { name: "Lexique",                              group: "Annexes" },
    { name: "Bibliographie",                        group: "Annexes" },
  ] as FallbackChapter[],

  // ── INFORMATIQUE — 3ème Maths / Sciences Exp / Sciences Tech (fallback) ────
  "3eme/Informatique": [
    { name: "Chapitre 1: Introduction à l'informatique",   group: "Introduction et architecture" },
    { name: "Chapitre 2: Architecture d'un ordinateur",    group: "Introduction et architecture" },
    { name: "Chapitre 3: Les structures de données",       group: "Algorithmique et données" },
    { name: "Chapitre 4: Les actions élémentaires simples", group: "Algorithmique et données" },
    { name: "Chapitre 5: Les structures de contrôle conditionnelles", group: "Algorithmique et données" },
    { name: "Chapitre 6: Les structures de contrôle itératives", group: "Algorithmique et données" },
    { name: "Chapitre 7: Démarche de résolution de problèmes", group: "Algorithmique et données" },
    { name: "Chapitre 8: Les réseaux informatiques",       group: "Réseaux et systèmes" },
    { name: "Chapitre 9: Les systèmes d'exploitation",     group: "Réseaux et systèmes" },
  ] as FallbackChapter[],

  // Eco Informatique — explicit placeholder so "3eme/Informatique" fallback is blocked
  "3eme/economie_gestion/Informatique": [] as FallbackChapter[],

  // ── ALGORITHMIQUE ET PROGRAMMATION — 3ème Sciences de l'informatique ───────
  "3eme/sciences_informatique/Algorithmique et Programmation": [
    { name: "Chapitre 1: Les structures de données et les structures simples", group: "Algorithmique et programmation" },
    { name: "Chapitre 2: Les structures algorithmiques de contrôle",           group: "Algorithmique et programmation" },
    { name: "Chapitre 3: Les sous programmes",                                 group: "Algorithmique et programmation" },
    { name: "Chapitre 4: Les algorithmes de tri et de recherche",              group: "Algorithmique et programmation" },
    { name: "Chapitre 5: Les algorithmes récurrents",                          group: "Algorithmique et programmation" },
    { name: "Chapitre 6: Les algorithmes arithmétiques",                       group: "Algorithmique et programmation" },
    { name: "Chapitre 7: Les algorithmes d'approximation",                     group: "Algorithmique et programmation" },
    { name: "Annexe 1: Codes ASCII",                                           group: "Annexes" },
  ] as FallbackChapter[],

  // ── TIC — 3ème Sciences de l'informatique ─────────────────────────────────
  "3eme/sciences_informatique/TIC": [
    { name: "Définitions",                        group: "Chapitre I: TIC — Information et communication" },
    { name: "Ressources de l'information",        group: "Chapitre I: TIC — Information et communication" },
    { name: "Techniques de recherche",            group: "Chapitre I: TIC — Information et communication" },
    { name: "Communication",                      group: "Chapitre I: TIC — Information et communication" },
    { name: "Éthique et déontologie des TIC",     group: "Chapitre I: TIC — Information et communication" },
  ] as FallbackChapter[],

  // ── GÉNIE ÉLECTRIQUE — 3ème Sciences techniques ───────────────────────────
  "3eme/sciences_techniques/Génie Électrique": [
    { name: "Thème 1_1: Courant électrique monophasé",              group: "Thème 1: Réseau électrique monophasé" },
    { name: "Thème 1_2: Sécurité électrique",                       group: "Thème 1: Réseau électrique monophasé" },
    { name: "Thème 1_3: Énergies renouvelables",                    group: "Thème 1: Réseau électrique monophasé" },
    { name: "Conception et réalisation de carte de commande",       group: "Thème 2: Conception et réalisation de carte de commande" },
    { name: "Thème 3_1: Fonctions combinatoires",                   group: "Thème 3: Logique combinatoire" },
    { name: "Thème 3_2: Résolution de problèmes de logique combinatoire", group: "Thème 3: Logique combinatoire" },
    { name: "Thème 4_1: Systèmes séquentiels",                      group: "Thème 4: Logique séquentielle" },
    { name: "Thème 4_2: Applications à base de bascules",           group: "Thème 4: Logique séquentielle" },
    { name: "Thème 5_1: Capteurs",                                  group: "Thème 5: Automates programmables industriels" },
    { name: "Thème 5_2: Automates programmables industriels",       group: "Thème 5: Automates programmables industriels" },
    { name: "Thème 6_1: Microcontrôleurs",                         group: "Thème 6: Microcontrôleurs" },
    { name: "Thème 6_2: MikroC pour PIC",                          group: "Thème 6: Microcontrôleurs" },
    { name: "Technologies de communication des objets connectés",   group: "Thème 7: Technologies de communication des objets connectés" },
    { name: "Moteurs électriques",                                   group: "Thème 8: Moteurs électriques" },
    { name: "Moteur pas à pas à aimant permanent",                  group: "Thème 9: Moteur pas à pas à aimant permanent" },
  ] as FallbackChapter[],

  // ── GÉNIE MÉCANIQUE — 3ème Sciences techniques ────────────────────────────
  "3eme/sciences_techniques/Génie Mécanique": [
    // Axe 1
    { name: "Analyse fonctionnelle externe et interne d'un produit",  group: "Axe 1: Analyse fonctionnelle" },
    { name: "Imprimante 3D",                                          group: "Axe 1: Analyse fonctionnelle" },
    { name: "Analyse fonctionnelle externe d'un produit",             group: "Axe 1: Analyse fonctionnelle" },
    { name: "Analyse fonctionnelle interne d'un produit",             group: "Axe 1: Analyse fonctionnelle" },
    { name: "Robot SAM",                                              group: "Axe 1: Analyse fonctionnelle" },
    { name: "Machine à pain",                                         group: "Axe 1: Analyse fonctionnelle" },
    { name: "Synthèse: Analyse fonctionnelle d'un produit",           group: "Axe 1: Analyse fonctionnelle" },
    // Axe 2 — Communication technique
    { name: "Réducteur à engrenages cylindriques",                    group: "Axe 2: Communication technique" },
    { name: "Lecture d'un dessin d'ensemble",                         group: "Axe 2: Communication technique" },
    { name: "Morphologie des pièces",                                 group: "Axe 2: Communication technique" },
    { name: "Graphe de montage et démontage",                         group: "Axe 2: Communication technique" },
    { name: "Tolérances",                                             group: "Axe 2: Communication technique" },
    { name: "Cotation fonctionnelle",                                 group: "Axe 2: Communication technique" },
    { name: "Dessin de définition",                                   group: "Axe 2: Communication technique" },
    { name: "Réducteur à engrenages cylindriques et coniques",        group: "Axe 2: Communication technique" },
    { name: "Réducteur à roue et vis sans fin",                       group: "Axe 2: Communication technique" },
    { name: "Tourelle porte-outil",                                   group: "Axe 2: Communication technique" },
    // Axe 2 — Assemblages
    { name: "Perceuse sensitive",                                     group: "Axe 2: Typologie des assemblages" },
    { name: "Les liaisons mécaniques",                                group: "Axe 2: Typologie des assemblages" },
    { name: "Les assemblages",                                        group: "Axe 2: Typologie des assemblages" },
    { name: "Guidage en translation par glissement",                  group: "Axe 2: Typologie des assemblages" },
    { name: "Guidage en rotation par glissement",                     group: "Axe 2: Typologie des assemblages" },
    { name: "Guidage en rotation par roulement",                      group: "Axe 2: Typologie des assemblages" },
    { name: "Poupée mobile",                                          group: "Axe 2: Typologie des assemblages" },
    { name: "Étau de modélisme",                                      group: "Axe 2: Typologie des assemblages" },
    { name: "Réducteur à engrenages cylindro-conique",                group: "Axe 2: Typologie des assemblages" },
    { name: "Tour parallèle",                                         group: "Axe 2: Typologie des assemblages" },
    { name: "Tapis roulant de course",                                group: "Axe 2: Typologie des assemblages" },
    { name: "Synthèse: Typologie des assemblages",                    group: "Axe 2: Typologie des assemblages" },
    // Axe 2 — Transmission
    { name: "Perceuse sensitive",                                     group: "Axe 2: Transmission de puissance" },
    { name: "Réducteur à engrenages cylindriques",                    group: "Axe 2: Transmission de puissance" },
    { name: "Scooter",                                                group: "Axe 2: Transmission de puissance" },
    { name: "Dispositif de transmission",                             group: "Axe 2: Transmission de puissance" },
    { name: "Escalier mécanique",                                     group: "Axe 2: Transmission de puissance" },
    { name: "Synthèse: Transmission de puissance",                    group: "Axe 2: Transmission de puissance" },
    // Axe 2 — Comportement statique
    { name: "Bride hydraulique",                                      group: "Axe 2: Comportement statique du solide indéformable" },
    { name: "Cric hydraulique roulant",                               group: "Axe 2: Comportement statique du solide indéformable" },
    { name: "Suspension arrière de VTT",                              group: "Axe 2: Comportement statique du solide indéformable" },
    { name: "Système de bridage",                                     group: "Axe 2: Comportement statique du solide indéformable" },
    { name: "Pince du robot SAM",                                     group: "Axe 2: Comportement statique du solide indéformable" },
    { name: "Synthèse: Comportement statique du solide indéformable", group: "Axe 2: Comportement statique du solide indéformable" },
    // Axe 2 — Comportement déformable
    { name: "Essai de traction",                                      group: "Axe 2: Comportement du solide déformable" },
    { name: "Bride hydraulique",                                      group: "Axe 2: Comportement du solide déformable" },
    { name: "Cric hydraulique",                                       group: "Axe 2: Comportement du solide déformable" },
    { name: "Suspension arrière de VTT",                              group: "Axe 2: Comportement du solide déformable" },
    { name: "Synthèse: Comportement du solide déformable",            group: "Axe 2: Comportement du solide déformable" },
    // Axe 3
    { name: "Obtention des pièces",                                   group: "Axe 3: Réalisation et production" },
    { name: "Analyse fonctionnelle",                                  group: "Axe 3: Réalisation et production" },
    { name: "Recherche des solutions constructives",                  group: "Axe 3: Réalisation et production" },
    { name: "Dimensionnement des composants",                         group: "Axe 3: Réalisation et production" },
    { name: "Obtention des pièces par enlèvement de matière",         group: "Axe 3: Réalisation et production" },
    { name: "Obtention des pièces par méthode additive",              group: "Axe 3: Réalisation et production" },
    { name: "Obtention des pièces par moulage",                       group: "Axe 3: Réalisation et production" },
    { name: "Métrologie dimensionnelle",                              group: "Axe 3: Réalisation et production" },
    { name: "Métrologie géométrique",                                 group: "Axe 3: Réalisation et production" },
    { name: "Autres projets",                                         group: "Axe 3: Réalisation et production" },
    { name: "Appui réglable",                                         group: "Axe 3: Réalisation et production" },
    { name: "Bride de serrage",                                       group: "Axe 3: Réalisation et production" },
    { name: "Synthèse: Obtention des pièces",                         group: "Axe 3: Réalisation et production" },
  ] as FallbackChapter[],

  // ── ÉCONOMIE — 3ème Économie et Gestion ───────────────────────────────────
  "3eme/economie_gestion/Économie": [
    // Partie I
    { name: "Chapitre 1: La production et sa mesure",                group: "Partie I: La production et ses facteurs" },
    { name: "Section 1: La mesure de la production",                 group: "Partie I: La production et ses facteurs" },
    { name: "Section 2: Les limites de l'évaluation de la production", group: "Partie I: La production et ses facteurs" },
    { name: "Chapitre 2: Le facteur travail",                        group: "Partie I: La production et ses facteurs" },
    { name: "Section 1: L'aspect quantitatif du travail",            group: "Partie I: La production et ses facteurs" },
    { name: "Section 2: La qualification du travail",                group: "Partie I: La production et ses facteurs" },
    { name: "Section 3: L'organisation du travail",                  group: "Partie I: La production et ses facteurs" },
    { name: "Section 4: La productivité du travail",                 group: "Partie I: La production et ses facteurs" },
    { name: "Section 5: Le marché du travail",                       group: "Partie I: La production et ses facteurs" },
    { name: "Chapitre 3: Le facteur capital",                        group: "Partie I: La production et ses facteurs" },
    { name: "Section 1: Définitions et mesure",                      group: "Partie I: La production et ses facteurs" },
    { name: "Section 2: La productivité du capital",                 group: "Partie I: La production et ses facteurs" },
    { name: "Section 3: L'investissement",                           group: "Partie I: La production et ses facteurs" },
    // Partie II
    { name: "Chapitre 1: La répartition primaire",                   group: "Partie II: La répartition" },
    { name: "Section 1: Les revenus du travail",                     group: "Partie II: La répartition" },
    { name: "Section 2: Les revenus du capital",                     group: "Partie II: La répartition" },
    { name: "Chapitre 2: La redistribution des revenus",             group: "Partie II: La répartition" },
    { name: "Section 1: Les objectifs de la redistribution",         group: "Partie II: La répartition" },
    { name: "Section 2: Les formes de la redistribution",            group: "Partie II: La répartition" },
    { name: "Section 3: La détermination du revenu disponible",      group: "Partie II: La répartition" },
    // Partie III
    { name: "Chapitre 1: La monnaie",                                group: "Partie III: Monnaie et financement" },
    { name: "Section 1: La monnaie: définition et fonctions",        group: "Partie III: Monnaie et financement" },
    { name: "Section 2: Les formes de la monnaie",                   group: "Partie III: Monnaie et financement" },
    { name: "Chapitre 2: Le financement de l'activité économique",   group: "Partie III: Monnaie et financement" },
    { name: "Section 1: La capacité et le besoin de financement",    group: "Partie III: Monnaie et financement" },
    { name: "Section 2: Le financement interne",                     group: "Partie III: Monnaie et financement" },
    { name: "Section 3: Le financement externe indirect",            group: "Partie III: Monnaie et financement" },
    { name: "Section 4: Le financement externe direct",              group: "Partie III: Monnaie et financement" },
  ] as FallbackChapter[],

  // ── GESTION — 3ème Économie et Gestion ────────────────────────────────────
  "3eme/economie_gestion/Gestion": [
    { name: "L'entreprise",                                          group: "Chapitre I: Module évaluation consolidation" },
    { name: "Sensibilisation",                                       group: "Chapitre I: Module évaluation consolidation" },
    { name: "L'entreprise en tant qu'organisation",                  group: "Chapitre I: Module évaluation consolidation" },
    { name: "L'entreprise et son environnement",                     group: "Chapitre I: Module évaluation consolidation" },
    { name: "La prise de décisions",                                 group: "Chapitre I: Module évaluation consolidation" },
    { name: "Synthèse",                                              group: "Chapitre I: Module évaluation consolidation" },
    { name: "À retenir",                                             group: "Chapitre I: Module évaluation consolidation" },
    { name: "Évaluation",                                            group: "Chapitre I: Module évaluation consolidation" },
    { name: "Le cycle d'exploitation",                               group: "Chapitre I: Module évaluation consolidation" },
    { name: "Notion de cycle d'exploitation",                        group: "Chapitre I: Module évaluation consolidation" },
    { name: "Principe de la partie double",                          group: "Chapitre I: Module évaluation consolidation" },
    { name: "Le cycle d'investissement",                             group: "Chapitre I: Module évaluation consolidation" },
    { name: "Notion d'investissement",                               group: "Chapitre I: Module évaluation consolidation" },
    { name: "Classification des investissements selon leur nature",  group: "Chapitre I: Module évaluation consolidation" },
    { name: "Classification des investissements selon leur objectif", group: "Chapitre I: Module évaluation consolidation" },
    { name: "Complément",                                            group: "Chapitre I: Module évaluation consolidation" },
    { name: "Les objectifs de la fonction Approvisionnement",        group: "Fonction approvisionnement" },
    { name: "Sensibilisation",                                       group: "Fonction approvisionnement" },
    { name: "La pluralité des objectifs",                            group: "Fonction approvisionnement" },
    { name: "La pluralité des choix",                                group: "Fonction approvisionnement" },
    { name: "Synthèse",                                              group: "Fonction approvisionnement" },
    { name: "À retenir",                                             group: "Fonction approvisionnement" },
    { name: "Évaluation",                                            group: "Fonction approvisionnement" },
  ] as FallbackChapter[],

  // ── GÉOGRAPHIE — 3ème Lettres + 3ème Économie et Gestion (same book) ─────────
  "3eme/lettres/Géographie":        GEOGRAPHIE_3EME_LETTRES_ECO,
  "3eme/economie_gestion/Géographie": GEOGRAPHIE_3EME_LETTRES_ECO,

  // ── GÉOGRAPHIE — 3ème Mathématiques / Sciences Exp / Sciences Tech / Sciences Info
  "3eme/mathematiques/Géographie":       GEOGRAPHIE_3EME_SCIENCES,
  "3eme/sciences_experimentales/Géographie": GEOGRAPHIE_3EME_SCIENCES,
  "3eme/sciences_techniques/Géographie":  GEOGRAPHIE_3EME_SCIENCES,
  "3eme/sciences_informatique/Géographie": GEOGRAPHIE_3EME_SCIENCES,

  // ── SVT — 3ème Mathématiques ──────────────────────────────────────────────────
  "3eme/mathematiques/SVT": [
    { name: "Chapitre 1: La malnutrition",                                              group: "Thème 1: Nutrition et santé — Alimentation saine et équilibrée" },
    { name: "Chapitre 2: Les besoins nutritionnels",                                    group: "Thème 1: Nutrition et santé — Alimentation saine et équilibrée" },
    { name: "Chapitre 3: La ration alimentaire équilibrée",                             group: "Thème 1: Nutrition et santé — Alimentation saine et équilibrée" },
    { name: "Chapitre 4: L'alimentation et le développement durable: l'agriculture biologique", group: "Thème 1: Nutrition et santé — Alimentation saine et équilibrée" },
    { name: "Chapitre 5: La régulation de la glycémie",                                 group: "Thème 1: Nutrition et santé — Alimentation saine et équilibrée" },
    { name: "Chapitre 1: Les microbes",                                                 group: "Thème 2: Immunité et santé" },
    { name: "Chapitre 2: L'infection microbienne",                                      group: "Thème 2: Immunité et santé" },
    { name: "Chapitre 3: Les moyens de défense de l'organisme",                         group: "Thème 2: Immunité et santé" },
    { name: "Chapitre 4: L'immunité spécifique",                                        group: "Thème 2: Immunité et santé" },
    { name: "Chapitre 5: Aider l'organisme à se défendre",                              group: "Thème 2: Immunité et santé" },
    { name: "Chapitre 1: Les appareils reproducteurs de l'homme et de la femme",        group: "Thème 3: Reproduction humaine et santé" },
    { name: "Chapitre 2: La puberté",                                                   group: "Thème 3: Reproduction humaine et santé" },
    { name: "Chapitre 3: De la fécondation à la naissance",                             group: "Thème 3: Reproduction humaine et santé" },
    { name: "Chapitre 4: La contraception",                                             group: "Thème 3: Reproduction humaine et santé" },
    { name: "Chapitre 5: La procréation médicalement assistée",                         group: "Thème 3: Reproduction humaine et santé" },
  ] as FallbackChapter[],

  // ── SYSTÈMES D'EXPLOITATION ET RÉSEAUX — 3ème Sciences de l'informatique ──────
  "3eme/sciences_informatique/Systèmes d'exploitation et Réseaux": [
    { name: "Chapitre I: Introduction aux systèmes d'exploitation",   group: "Partie I: Système d'exploitation" },
    { name: "Chapitre II: Fonctions de base d'un système d'exploitation", group: "Partie I: Système d'exploitation" },
    { name: "Chapitre III: Administration système",                   group: "Partie I: Système d'exploitation" },
    { name: "Chapitre IV: Introduction aux réseaux",                  group: "Partie II: Les réseaux" },
    { name: "Chapitre V: Protocoles réseaux",                         group: "Partie II: Les réseaux" },
    { name: "Chapitre VI: Les équipements d'un réseau local",         group: "Partie II: Les réseaux" },
    { name: "Chapitre VII: Configuration et administration d'un réseau local", group: "Partie II: Les réseaux" },
  ] as FallbackChapter[],

  // Éducation Islamique, Éducation Civique — hidden from 3ème subject lists (no valid lycée book yet).
  // Physique-Chimie 3ème Sciences Tech / Sciences Info — hidden from subject lists (no data).
});

// ── BAC / 4ÈME SECONDAIRE — shared constants ─────────────────────────────────

const BAC_ANGLAIS: FallbackChapter[] = [
  // Introductory Unit
  { name: "Learning Quiz",                                                   group: "Introductory Unit: First Impressions" },
  { name: "Check some synonyms and antonyms",                                group: "Introductory Unit: First Impressions" },
  { name: "Digital Language Pal",                                            group: "Introductory Unit: First Impressions" },
  { name: "Get to know your book",                                           group: "Introductory Unit: First Impressions" },
  { name: "Check your definitions, collocations, idioms and phrasal verbs",  group: "Introductory Unit: First Impressions" },
  { name: "Englishman in New York",                                          group: "Introductory Unit: First Impressions" },
  { name: "Finding out about English(es)",                                   group: "Introductory Unit: First Impressions" },
  { name: "Webquest 1: American and British English",                        group: "Introductory Unit: First Impressions" },
  { name: "How good are you at Pronunciation?",                              group: "Introductory Unit: First Impressions" },
  { name: "Recognising text types",                                          group: "Introductory Unit: First Impressions" },
  { name: "Cultures and Languages",                                          group: "Introductory Unit: First Impressions" },
  // Unit 1
  { name: "Holidaying",                                                      group: "Unit 1: Art Shows and Holidaying" },
  { name: "Webquest 2: The Seychelles",                                      group: "Unit 1: Art Shows and Holidaying" },
  { name: "Space Tourism",                                                   group: "Unit 1: Art Shows and Holidaying" },
  { name: "Art Shows, Strings",                                              group: "Unit 1: Art Shows and Holidaying" },
  { name: "Exploring a Song: Immortality",                                   group: "Unit 1: Art Shows and Holidaying" },
  { name: "Walking Tour",                                                    group: "Unit 1: Art Shows and Holidaying" },
  { name: "A Package Tour",                                                  group: "Unit 1: Art Shows and Holidaying" },
  { name: "Project Work 1: My Festival",                                     group: "Unit 1: Art Shows and Holidaying" },
  { name: "At the Travel Agency",                                            group: "Unit 1: Art Shows and Holidaying" },
  { name: "Put a little drama in your travel",                               group: "Unit 1: Art Shows and Holidaying" },
  { name: "The Winter's Tale: Part 1",                                       group: "Unit 1: Art Shows and Holidaying" },
  { name: "Arts Session 1: The Winter's Tale: Part 2",                       group: "Unit 1: Art Shows and Holidaying" },
  { name: "Arts Session 2: Tale end...?",                                    group: "Unit 1: Art Shows and Holidaying" },
  { name: "Webquest 3: Shakespeare's Plays",                                 group: "Unit 1: Art Shows and Holidaying" },
  // Unit 2
  { name: "School-related Words",                                            group: "Unit 2: Education Matters" },
  { name: "Education for all",                                               group: "Unit 2: Education Matters" },
  { name: "Virtual Schools",                                                 group: "Unit 2: Education Matters" },
  { name: "Online Learning",                                                 group: "Unit 2: Education Matters" },
  { name: "Comparing Educational Systems",                                   group: "Unit 2: Education Matters" },
  { name: "Age or …?",                                                       group: "Unit 2: Education Matters" },
  { name: "Lifelong Learning",                                               group: "Unit 2: Education Matters" },
  { name: "Reading the Back Cover of a Book",                                group: "Unit 2: Education Matters" },
  { name: "Alexander Graham Bell",                                           group: "Unit 2: Education Matters" },
  { name: "Project Work 2: Expository Texts",                                group: "Unit 2: Education Matters" },
  { name: "Webquest 4: Text Structure - Expository Texts",                   group: "Unit 2: Education Matters" },
  { name: "Arts Session 3: Later",                                           group: "Unit 2: Education Matters" },
  { name: "Arts Session 4: Writing a Narrative",                             group: "Unit 2: Education Matters" },
  // Check 1
  { name: "Check Your Language and Skills 1",                                group: "Check Your Language and Skills 1" },
  // Unit 3
  { name: "Inventions-related Words",                                        group: "Unit 3: Creative Inventive Minds" },
  { name: "Webquest 5: Robots",                                              group: "Unit 3: Creative Inventive Minds" },
  { name: "Technology: A Blessing in Disguise?",                             group: "Unit 3: Creative Inventive Minds" },
  { name: "The Father of Playstation",                                       group: "Unit 3: Creative Inventive Minds" },
  { name: "Prize Winners",                                                   group: "Unit 3: Creative Inventive Minds" },
  { name: "Women choose to opt out",                                         group: "Unit 3: Creative Inventive Minds" },
  { name: "The Brain Drain",                                                 group: "Unit 3: Creative Inventive Minds" },
  { name: "Scientists' Achievements",                                        group: "Unit 3: Creative Inventive Minds" },
  { name: "The Daffodils",                                                   group: "Unit 3: Creative Inventive Minds" },
  { name: "Writing as a Process: Argumentative Text",                        group: "Unit 3: Creative Inventive Minds" },
  { name: "Arts Session 5: The Bard's Sonnet 18",                            group: "Unit 3: Creative Inventive Minds" },
  { name: "Arts Session 6: As You Like It",                                  group: "Unit 3: Creative Inventive Minds" },
  { name: "Arts Session 7: Project Work 3: More on Text Structure",          group: "Unit 3: Creative Inventive Minds" },
  // Unit 4
  { name: "Life Concerns",                                                   group: "Unit 4: Life Issues" },
  { name: "Attitudes",                                                       group: "Unit 4: Life Issues" },
  { name: "If …, a poem by Kipling",                                         group: "Unit 4: Life Issues" },
  { name: "Consumerism",                                                     group: "Unit 4: Life Issues" },
  { name: "Ecodriving",                                                      group: "Unit 4: Life Issues" },
  { name: "Urban Exodus",                                                    group: "Unit 4: Life Issues" },
  { name: "A Newscast",                                                      group: "Unit 4: Life Issues" },
  { name: "Staff Management",                                                group: "Unit 4: Life Issues" },
  { name: "Job Ads",                                                         group: "Unit 4: Life Issues" },
  { name: "Arts Session 8: The Richer, The Poorer",                          group: "Unit 4: Life Issues" },
  { name: "Arts Session 9: A Secret for Two",                                group: "Unit 4: Life Issues" },
  { name: "Arts Session 10: What a Wonderful World!",                        group: "Unit 4: Life Issues" },
  // Check 2
  { name: "Check Your Language and Skills 2",                                group: "Check Your Language and Skills 2" },
  // Before We Say Goodbye
  { name: "The Road to Success",                                             group: "Before We Say Goodbye" },
  { name: "Organising your Portfolio",                                       group: "Before We Say Goodbye" },
  { name: "How good are you at Skills and Strategies?",                      group: "Before We Say Goodbye" },
  { name: "Feedback on the book",                                            group: "Before We Say Goodbye" },
  // Add Ons
  { name: "Grammar Reference",                                               group: "Add Ons" },
  { name: "Irregular Verbs",                                                 group: "Add Ons" },
  { name: "Vocabulary Strategies and Affixation",                            group: "Add Ons" },
  { name: "Word List",                                                       group: "Add Ons" },
];

const BAC_FRANCAIS: FallbackChapter[] = [
  // Module 1
  { name: "Débat: Nostalgie, quand tu nous tiens!",                                   group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "À l'ombre de mon grand-père — Christian Signol",                           group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "Crépuscule — Gustave Flaubert",                                            group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "Le discours rapporté",                                                     group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "L'étude de texte",                                                         group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "L'Absent — Linda Lê",                                                      group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "La madeleine — Marcel Proust",                                             group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "Lecture de l'image: La mémoire — Magritte",                               group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "L'essai",                                                                  group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "Visite à la maison paternelle — François-René de Chateaubriand",           group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "Le lac — Alphonse de Lamartine",                                           group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "Débat: Éterniser un instant",                                              group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "Lectures complémentaires",                                                 group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "Citations",                                                                group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  { name: "Bilan",                                                                    group: "Module d'apprentissage N°1: Souvenirs et nostalgie" },
  // Module 2
  { name: "Débat: Amour, toujours!",                                                  group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "Hermina — Victor Hugo",                                                    group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "La rencontre — Madame de La Fayette",                                      group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "Récit et discours",                                                        group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "L'étude de texte",                                                         group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "Les mains d'Elsa — Louis Aragon",                                          group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "Ravissement — Ivan Tourgueniev",                                            group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "Lecture de l'image: Olga sur un fauteuil — Pablo Picasso",                 group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "La caractérisation",                                                       group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "L'exposé: Les couples célèbres dans la littérature arabe",                 group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "L'attente — William Shakespeare",                                          group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "L'essai",                                                                  group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "Lectures complémentaires",                                                 group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "Citations",                                                                group: "Module d'apprentissage N°2: Histoires d'amour" },
  { name: "Bilan",                                                                    group: "Module d'apprentissage N°2: Histoires d'amour" },
  // Module 3
  { name: "Débat: Vous avez dit liberté!",                                            group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "Liberté — Paul Éluard",                                                    group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "Lecture de l'image: Liberté — Jean Lurçat",                                group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "Afrique — David Diop",                                                     group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "La comparaison et la métaphore",                                           group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "L'étude de texte",                                                         group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "Au nom de la liberté — Alexandre Dumas",                                   group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "Les Troglodytes — Montesquieu",                                            group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "L'exposé: Liberté et expression artistique",                               group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "La nominalisation",                                                        group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "Une femme libre — Jean-Marie Gustave Le Clézio",                           group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "L'essai",                                                                  group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "Lectures complémentaires",                                                 group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "Citations",                                                                group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  { name: "Bilan",                                                                    group: "Module d'apprentissage N°3: Liberté, j'écris ton nom…" },
  // Module de lecture 1
  { name: "Le silence de la mer — Vercors",                                           group: "Module de lecture 1" },
  // Module 4
  { name: "Débat: Guerre à la guerre!",                                               group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "Les routes noires — Antoine de Saint-Exupéry",                             group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "Le dormeur du val — Arthur Rimbaud",                                       group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "Le conditionnel et le subjonctif",                                         group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "L'étude de texte",                                                         group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "Lecture de l'image: Affiche Handicap International",                       group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "Villages en flammes — Louis-Ferdinand Céline",                             group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "Ce jour-là — Franck Pavloff",                                              group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "L'exposé: Le combat pacifiste",                                            group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "Un homme comme moi — Erich Maria Remarque",                                group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "L'essai",                                                                  group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "Lectures complémentaires",                                                 group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "Citations",                                                                group: "Module d'apprentissage N°4: Guerre et Paix" },
  { name: "Bilan",                                                                    group: "Module d'apprentissage N°4: Guerre et Paix" },
  // Module 5
  { name: "Débat: Science et conscience",                                             group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "La cause de ce qui n'est point — Fontenelle",                              group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "Il ne faut pas jeter le bébé avec l'eau du bain — Jean Cazeneuve",        group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "L'expression de l'opinion",                                                group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "L'étude de texte: Bilan des apprentissages",                               group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "Lecture de l'image: Lire une caricature — Franck Chapatte",               group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "Les beaux jours des pirates informatiques — Eric Filiol",                  group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "Les mérites de la science — François Jacob",                               group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "L'enfer et la raison — Albert Camus",                                      group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "L'exposé: La Science, enjeux et perspectives",                             group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "L'essai",                                                                  group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "Lectures complémentaires",                                                 group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "Citations",                                                                group: "Module d'apprentissage N°5: L'Homme et la Science" },
  { name: "Bilan",                                                                    group: "Module d'apprentissage N°5: L'Homme et la Science" },
  // Module de lecture 2
  { name: "La Cantatrice chauve — Eugène Ionesco",                                    group: "Module de lecture 2" },
];

const INFORMATIQUE_BAC_ALGO: FallbackChapter[] = [
  { name: "Chapitre 1: Les structures de données",                 group: "Algorithmique et programmation" },
  { name: "Chapitre 2: Les actions élémentaires simples",          group: "Algorithmique et programmation" },
  { name: "Chapitre 3: Les structures de contrôle conditionnelles", group: "Algorithmique et programmation" },
  { name: "Chapitre 4: Les structures de contrôle itératives",     group: "Algorithmique et programmation" },
  { name: "Chapitre 5: Les sous-programmes",                       group: "Algorithmique et programmation" },
  { name: "Chapitre 6: Les traitements avancés",                   group: "Algorithmique et programmation" },
];

// ── BAC / 4ÈME SECONDAIRE ─────────────────────────────────────────────────────

Object.assign(CURRICULUM_FALLBACK, {

  // ── Anglais — shared across ALL Bac tracks ───────────────────────────────────
  "bac/Anglais": BAC_ANGLAIS,

  // ── Français — non-Lettres only; Lettres explicitly hidden ───────────────────
  "bac/Français":          BAC_FRANCAIS,
  "bac/lettres/Français":  [] as FallbackChapter[],

  // ── SVT ──────────────────────────────────────────────────────────────────────
  "bac/lettres/SVT": [
    { name: "Chapitre 1: La fonction reproductrice chez l'homme",   group: "Reproduction humaine et santé" },
    { name: "Chapitre 2: La fonction reproductrice chez la femme",   group: "Reproduction humaine et santé" },
    { name: "Chapitre 3: La procréation",                            group: "Reproduction humaine et santé" },
  ] as FallbackChapter[],

  "bac/mathematiques/SVT": [
    { name: "Chapitre 1: Le tissu nerveux",                          group: "Neurophysiologie" },
    { name: "Chapitre 2: L'activité réflexe",                        group: "Neurophysiologie" },
    { name: "Chapitre 3: L'hygiène du système nerveux",              group: "Neurophysiologie" },
  ] as FallbackChapter[],

  "bac/sciences_experimentales/SVT": [
    { name: "Chapitre 1: La fonction reproductrice chez l'homme",   group: "Thème 1: Reproduction humaine et santé" },
    { name: "Chapitre 2: La fonction reproductrice chez la femme",   group: "Thème 1: Reproduction humaine et santé" },
    { name: "Chapitre 3: La procréation",                            group: "Thème 1: Reproduction humaine et santé" },
  ] as FallbackChapter[],

  // ── Informatique ─────────────────────────────────────────────────────────────
  "bac/lettres/Informatique": [
    { name: "Chapitre 1: Culture informatique",                      group: "Culture informatique" },
    { name: "Chapitre 2: Architecture d'un ordinateur",              group: "Architecture et systèmes" },
    { name: "Chapitre 3: Système d'exploitation et réseaux",         group: "Architecture et systèmes" },
    { name: "Chapitre 4: Internet",                                  group: "Internet et bureautique" },
    { name: "Chapitre 5: Traitement de texte",                       group: "Internet et bureautique" },
    { name: "Chapitre 6: Tableur",                                   group: "Internet et bureautique" },
    { name: "Chapitre 7: Éléments de présentation",                  group: "Internet et bureautique" },
    { name: "Chapitre 8: Étude et réalisation d'un projet",          group: "Projet" },
  ] as FallbackChapter[],

  "bac/mathematiques/Informatique":       INFORMATIQUE_BAC_ALGO,
  "bac/sciences_experimentales/Informatique": INFORMATIQUE_BAC_ALGO,
  "bac/sciences_techniques/Informatique": INFORMATIQUE_BAC_ALGO,

  "bac/economie_gestion/Informatique": [
    { name: "Chapitre 1: Culture informatique",                      group: "Informatique appliquée" },
    { name: "Chapitre 2: Architecture d'un ordinateur",              group: "Informatique appliquée" },
    { name: "Chapitre 3: Système d'exploitation et réseaux",         group: "Informatique appliquée" },
    { name: "Chapitre 4: Internet",                                  group: "Informatique appliquée" },
    { name: "Chapitre 5: Traitement de texte",                       group: "Informatique appliquée" },
    { name: "Chapitre 6: Tableur",                                   group: "Informatique appliquée" },
    { name: "Chapitre 7: Éléments de présentation",                  group: "Informatique appliquée" },
    { name: "Chapitre 8: Étude et réalisation d'un projet",          group: "Informatique appliquée" },
  ] as FallbackChapter[],

  // ── Mathématiques ────────────────────────────────────────────────────────────
  "bac/mathematiques/Mathématiques": [
    { name: "Chapitre 1: Continuité et limites",                     group: "Tome 1" },
    { name: "Chapitre 2: Suites réelles",                            group: "Tome 1" },
    { name: "Chapitre 3: Dérivabilité",                              group: "Tome 1" },
    { name: "Chapitre 4: Fonctions réciproques",                     group: "Tome 1" },
    { name: "Chapitre 5: Primitives",                                group: "Tome 1" },
    { name: "Chapitre 6: Intégrales",                                group: "Tome 1" },
    { name: "Chapitre 7: Fonction logarithme népérien",              group: "Tome 1" },
    { name: "Chapitre 8: Fonction exponentielle",                    group: "Tome 1" },
    { name: "Chapitre 9: Équations différentielles",                 group: "Tome 1" },
    { name: "Chapitre 1: Nombres complexes",                         group: "Tome 2" },
    { name: "Chapitre 2: Isométries du plan",                        group: "Tome 2" },
    { name: "Chapitre 3: Déplacements - Antidéplacements",           group: "Tome 2" },
    { name: "Chapitre 4: Similitudes",                               group: "Tome 2" },
    { name: "Chapitre 5: Coniques",                                  group: "Tome 2" },
    { name: "Chapitre 6: Géométrie dans l'espace",                   group: "Tome 2" },
    { name: "Chapitre 7: Divisibilité dans Z",                       group: "Tome 2" },
    { name: "Chapitre 8: Identité de Bezout",                        group: "Tome 2" },
    { name: "Chapitre 9: Probabilités",                              group: "Tome 2" },
    { name: "Chapitre 10: Statistiques",                             group: "Tome 2" },
  ] as FallbackChapter[],

  "bac/sciences_experimentales/Mathématiques": [
    { name: "Chapitre 1: Continuité et limites",                     group: "Tome 1" },
    { name: "Chapitre 2: Suites réelles",                            group: "Tome 1" },
    { name: "Chapitre 3: Dérivabilité",                              group: "Tome 1" },
    { name: "Chapitre 4: Fonctions réciproques",                     group: "Tome 1" },
    { name: "Chapitre 5: Études de fonctions",                       group: "Tome 1" },
    { name: "Chapitre 6: Primitives",                                group: "Tome 1" },
    { name: "Chapitre 7: Intégrales",                                group: "Tome 1" },
    { name: "Chapitre 8: Fonction logarithme népérien",              group: "Tome 1" },
    { name: "Chapitre 9: Fonction exponentielle",                    group: "Tome 1" },
    { name: "Chapitre 10: Équations différentielles",                group: "Tome 1" },
    { name: "Chapitre 1: Nombres complexes",                         group: "Tome 2" },
    { name: "Chapitre 2: Équations à coefficients complexes",        group: "Tome 2" },
    { name: "Chapitre 3: Produit scalaire - Produit vectoriel dans l'espace", group: "Tome 2" },
    { name: "Chapitre 4: Équations de droites, de plans et de sphères", group: "Tome 2" },
    { name: "Chapitre 5: Probabilités sur un ensemble fini",         group: "Tome 2" },
    { name: "Chapitre 6: Variables aléatoires",                      group: "Tome 2" },
    { name: "Chapitre 7: Statistiques",                              group: "Tome 2" },
  ] as FallbackChapter[],

  "bac/sciences_techniques/Mathématiques": [
    { name: "Chapitre 1: Fonctions continues et monotonie",          group: "Analyse" },
    { name: "Chapitre 2: Limites et asymptotes",                     group: "Analyse" },
    { name: "Chapitre 3: Dérivation",                                group: "Analyse" },
    { name: "Chapitre 4: Fonctions réciproques",                     group: "Analyse" },
    { name: "Chapitre 5: Fonction logarithme népérien",              group: "Analyse" },
    { name: "Chapitre 6: Fonction exponentielle",                    group: "Analyse" },
    { name: "Chapitre 7: Primitives",                                group: "Analyse" },
    { name: "Chapitre 8: Intégrales",                                group: "Analyse" },
    { name: "Chapitre 9: Nombres complexes",                         group: "Algèbre, géométrie, probabilités et statistiques" },
    { name: "Chapitre 10: Géométrie dans l'espace",                  group: "Algèbre, géométrie, probabilités et statistiques" },
    { name: "Chapitre 11: Probabilités",                             group: "Algèbre, géométrie, probabilités et statistiques" },
    { name: "Chapitre 12: Statistiques",                             group: "Algèbre, géométrie, probabilités et statistiques" },
  ] as FallbackChapter[],

  "bac/economie_gestion/Mathématiques": [
    { name: "Chapitre 1: Limites et continuité",                     group: "Analyse" },
    { name: "Chapitre 2: Dérivation",                                group: "Analyse" },
    { name: "Chapitre 3: Étude de fonctions",                        group: "Analyse" },
    { name: "Chapitre 4: Fonction logarithme népérien",              group: "Analyse" },
    { name: "Chapitre 5: Fonction exponentielle",                    group: "Analyse" },
    { name: "Chapitre 6: Primitives",                                group: "Analyse" },
    { name: "Chapitre 7: Intégrales",                                group: "Analyse" },
    { name: "Chapitre 8: Matrices",                                  group: "Algèbre, probabilités et statistiques" },
    { name: "Chapitre 9: Probabilités",                              group: "Algèbre, probabilités et statistiques" },
    { name: "Chapitre 10: Statistiques",                             group: "Algèbre, probabilités et statistiques" },
  ] as FallbackChapter[],

  "bac/sciences_informatique/Mathématiques": [
    { name: "Chapitre 1: Suites réelles",                            group: "Première Partie" },
    { name: "Chapitre 2: Limites de fonctions",                      group: "Première Partie" },
    { name: "Chapitre 3: Continuité",                                group: "Première Partie" },
    { name: "Chapitre 4: Dérivation - Primitives",                   group: "Première Partie" },
    { name: "Chapitre 5: Étude de fonctions",                        group: "Première Partie" },
    { name: "Chapitre 6: Logarithme népérien",                       group: "Première Partie" },
    { name: "Chapitre 7: Fonctions exponentielles",                  group: "Première Partie" },
    { name: "Chapitre 8: Calcul intégral",                           group: "Première Partie" },
    { name: "Chapitre 9: Arithmétique",                              group: "Deuxième Partie" },
    { name: "Chapitre 10: Nombres complexes",                        group: "Deuxième Partie" },
    { name: "Chapitre 11: Systèmes d'équations linéaires",           group: "Deuxième Partie" },
    { name: "Chapitre 12: Séries statistiques à deux caractères",    group: "Deuxième Partie" },
    { name: "Chapitre 13: Probabilité",                              group: "Deuxième Partie" },
  ] as FallbackChapter[],

  // ── Physique-Chimie ───────────────────────────────────────────────────────────
  // bac/sciences_informatique/Physique-Chimie intentionally omitted → hidden
  "bac/mathematiques/Physique-Chimie": [
    { name: "Chapitre 1: Le condensateur; le dipôle RC",                      group: "Physique — Évolution de systèmes" },
    { name: "Chapitre 2: La bobine; le dipôle RL",                            group: "Physique — Évolution de systèmes" },
    { name: "Chapitre 3: Oscillations électriques libres",                    group: "Physique — Évolution de systèmes" },
    { name: "Chapitre 4: Oscillations électriques forcées en régime sinusoïdal", group: "Physique — Évolution de systèmes" },
    { name: "Chapitre 5: Oscillations libres d'un pendule élastique",         group: "Physique — Évolution de systèmes" },
    { name: "Chapitre 6: Oscillations forcées d'un pendule élastique en régime sinusoïdal", group: "Physique — Évolution de systèmes" },
    { name: "Chapitre 7: Propagation d'une onde",                             group: "Ondes" },
    { name: "Chapitre 8: Diffraction de la lumière",                          group: "Ondes" },
    { name: "Chapitre 1: Détermination d'une quantité de matière",            group: "Chimie" },
    { name: "Chapitre 2: Détermination d'une quantité de matière par la mesure d'une masse ou d'un volume", group: "Chimie" },
    { name: "Chapitre 3: Pile électrochimique: pile Daniell",                 group: "Chimie" },
    { name: "Chapitre 4: Électrolyse",                                        group: "Chimie" },
    { name: "Chapitre 5: Les alcools aliphatiques saturés",                   group: "Chimie" },
    { name: "Chapitre 6: L'oxydation ménagée des alcools",                    group: "Chimie" },
  ] as FallbackChapter[],

  "bac/sciences_experimentales/Physique-Chimie": [
    { name: "Chapitre 1: Le condensateur; le dipôle RC",                      group: "Physique" },
    { name: "Chapitre 2: La bobine; le dipôle RL",                            group: "Physique" },
    { name: "Chapitre 3: Oscillations électriques libres",                    group: "Physique" },
    { name: "Chapitre 4: Oscillations électriques forcées en régime sinusoïdal", group: "Physique" },
    { name: "Chapitre 5: Oscillations libres d'un pendule élastique",         group: "Physique" },
    { name: "Chapitre 6: Oscillations forcées d'un pendule élastique en régime sinusoïdal", group: "Physique" },
    { name: "Chapitre 7: Propagation d'une onde",                             group: "Physique" },
    { name: "Chapitre 8: Diffraction de la lumière",                          group: "Physique" },
    { name: "Chapitre 1: Détermination d'une quantité de matière",            group: "Chimie" },
    { name: "Chapitre 2: Détermination d'une quantité de matière par la mesure d'une masse ou d'un volume", group: "Chimie" },
    { name: "Chapitre 3: Pile électrochimique: pile Daniell",                 group: "Chimie" },
    { name: "Chapitre 4: Électrolyse",                                        group: "Chimie" },
    { name: "Chapitre 5: Les alcools aliphatiques saturés",                   group: "Chimie" },
    { name: "Chapitre 6: L'oxydation ménagée des alcools",                    group: "Chimie" },
  ] as FallbackChapter[],

  "bac/sciences_techniques/Physique-Chimie": [
    { name: "Chapitre 1: Le condensateur; le dipôle RC",                      group: "Physique" },
    { name: "Chapitre 2: La bobine; le dipôle RL",                            group: "Physique" },
    { name: "Chapitre 3: Oscillations électriques libres",                    group: "Physique" },
    { name: "Chapitre 4: Oscillations électriques forcées en régime sinusoïdal", group: "Physique" },
    { name: "Chapitre 5: Filtres électriques",                                group: "Physique" },
    { name: "Chapitre 1: Détermination d'une quantité de matière",            group: "Chimie" },
    { name: "Chapitre 2: Pile électrochimique",                               group: "Chimie" },
    { name: "Chapitre 3: Électrolyse",                                        group: "Chimie" },
    { name: "Chapitre 4: Les alcools aliphatiques saturés",                   group: "Chimie" },
    { name: "Chapitre 5: L'oxydation ménagée des alcools",                    group: "Chimie" },
  ] as FallbackChapter[],

  // ── Économie et Gestion ───────────────────────────────────────────────────────
  "bac/economie_gestion/Économie": [
    { name: "Chapitre 1: La croissance économique",                  group: "Croissance et développement" },
    { name: "Chapitre 2: Les facteurs de la croissance",             group: "Croissance et développement" },
    { name: "Chapitre 3: Le développement",                          group: "Croissance et développement" },
    { name: "Chapitre 4: Les indicateurs du développement",          group: "Croissance et développement" },
    { name: "Chapitre 5: Les échanges internationaux",               group: "Mondialisation" },
    { name: "Chapitre 6: La mondialisation",                         group: "Mondialisation" },
    { name: "Chapitre 7: Les firmes multinationales",                group: "Mondialisation" },
  ] as FallbackChapter[],

  "bac/economie_gestion/Gestion": [
    { name: "Chapitre 1: Module évaluation-consolidation",           group: "Gestion comptable et financière" },
    { name: "Chapitre 2: Gestion de l'approvisionnement",            group: "Gestion comptable et financière" },
    { name: "Chapitre 3: Gestion de la production",                  group: "Gestion comptable et financière" },
    { name: "Chapitre 4: Gestion commerciale",                       group: "Gestion comptable et financière" },
    { name: "Chapitre 5: Gestion financière",                        group: "Gestion comptable et financière" },
    { name: "Chapitre 6: Gestion des ressources humaines",           group: "Gestion comptable et financière" },
  ] as FallbackChapter[],

  // ── Génie Électrique — Bac Sciences techniques ────────────────────────────────
  "bac/sciences_techniques/Génie Électrique": [
    { name: "Réseau électrique monophasé",                            group: "Systèmes électriques" },
    { name: "Sécurité électrique",                                    group: "Systèmes électriques" },
    { name: "Énergies renouvelables",                                 group: "Systèmes électriques" },
    { name: "Conception et réalisation de carte de commande",         group: "Cartes de commande" },
    { name: "Fonctions combinatoires",                                group: "Logique combinatoire" },
    { name: "Résolution de problèmes de logique combinatoire",        group: "Logique combinatoire" },
    { name: "Systèmes séquentiels",                                   group: "Logique séquentielle" },
    { name: "Applications à base de bascules",                        group: "Logique séquentielle" },
    { name: "Capteurs",                                               group: "Automates et microcontrôleurs" },
    { name: "Automates programmables industriels",                    group: "Automates et microcontrôleurs" },
    { name: "Microcontrôleurs",                                       group: "Automates et microcontrôleurs" },
    { name: "MikroC pour PIC",                                        group: "Automates et microcontrôleurs" },
    { name: "Technologies de communication des objets connectés",     group: "Communication et moteurs" },
    { name: "Moteurs électriques",                                    group: "Communication et moteurs" },
    { name: "Moteur pas à pas à aimant permanent",                    group: "Communication et moteurs" },
  ] as FallbackChapter[],

  // ── Génie Mécanique — Bac Sciences techniques ─────────────────────────────────
  "bac/sciences_techniques/Génie Mécanique": [
    { name: "Analyse fonctionnelle externe et interne d'un produit",  group: "Analyse fonctionnelle" },
    { name: "Lecture d'un dessin d'ensemble",                         group: "Analyse structurelle et conception" },
    { name: "Morphologie des pièces",                                 group: "Analyse structurelle et conception" },
    { name: "Graphe de montage et démontage",                         group: "Analyse structurelle et conception" },
    { name: "Tolérances",                                             group: "Analyse structurelle et conception" },
    { name: "Cotation fonctionnelle",                                 group: "Analyse structurelle et conception" },
    { name: "Dessin de définition",                                   group: "Analyse structurelle et conception" },
    { name: "Les liaisons mécaniques",                                group: "Typologie des assemblages" },
    { name: "Les assemblages",                                        group: "Typologie des assemblages" },
    { name: "Guidage en translation par glissement",                  group: "Typologie des assemblages" },
    { name: "Guidage en rotation par glissement",                     group: "Typologie des assemblages" },
    { name: "Guidage en rotation par roulement",                      group: "Typologie des assemblages" },
    { name: "Dispositif de transmission",                             group: "Transmission de puissance" },
    { name: "Transmission de puissance",                              group: "Transmission de puissance" },
    { name: "Comportement statique du solide indéformable",           group: "Comportement statique du solide indéformable" },
    { name: "Comportement du solide déformable",                      group: "Comportement du solide déformable" },
    { name: "Obtention des pièces par enlèvement de matière",         group: "Réalisation et production" },
    { name: "Obtention des pièces par méthode additive",              group: "Réalisation et production" },
    { name: "Obtention des pièces par moulage",                       group: "Réalisation et production" },
    { name: "Métrologie dimensionnelle",                              group: "Réalisation et production" },
    { name: "Métrologie géométrique",                                 group: "Réalisation et production" },
  ] as FallbackChapter[],

  // ── Sciences de l'Informatique ────────────────────────────────────────────────
  "bac/sciences_informatique/Algorithmique et Programmation": [
    { name: "Chapitre 1: Les enregistrements et les fichiers",        group: "Algorithmique et programmation" },
    { name: "Chapitre 2: La récursivité",                             group: "Algorithmique et programmation" },
    { name: "Chapitre 3: Les algorithmes de tri",                     group: "Algorithmique et programmation" },
    { name: "Chapitre 4: Les algorithmes récurrents",                 group: "Algorithmique et programmation" },
    { name: "Chapitre 5: Les algorithmes d'arithmétique",             group: "Algorithmique et programmation" },
    { name: "Chapitre 6: Les algorithmes d'approximation",            group: "Algorithmique et programmation" },
    { name: "Chapitre 7: Les algorithmes avancés",                    group: "Algorithmique et programmation" },
  ] as FallbackChapter[],

  "bac/sciences_informatique/Bases de Données": [
    { name: "Chapitre 1: Notion de Base de Données",                  group: "Partie I: Introduction aux bases de données" },
    { name: "Chapitre 2: Notion de Systèmes de Gestion de Bases de Données", group: "Partie I: Introduction aux bases de données" },
    { name: "Chapitre 3: Structure d'une Base de Données Relationnelle", group: "Partie II: Création de Bases de Données" },
    { name: "Chapitre 4: Démarche de détermination de la structure d'une Base de Données", group: "Partie II: Création de Bases de Données" },
    { name: "Chapitre 5: Création et modification de la structure d'une Base de Données", group: "Partie II: Création de Bases de Données" },
    { name: "Chapitre 6: Manipulation d'une base de données",         group: "Partie III: Manipulation et Sécurisation de Bases de Données" },
    { name: "Chapitre 7: Développement d'applications autour d'une base de données", group: "Partie III: Manipulation et Sécurisation de Bases de Données" },
  ] as FallbackChapter[],

  "bac/sciences_informatique/TIC": [
    { name: "Présentation",                                           group: "Chapitre I: Outils de collaboration" },
    { name: "Applications dans un réseau local",                      group: "Chapitre I: Outils de collaboration" },
    { name: "Forums",                                                 group: "Chapitre I: Outils de collaboration" },
    { name: "Visio-conférence",                                       group: "Chapitre I: Outils de collaboration" },
    { name: "Partie A: Animations",                                   group: "Chapitre II: Production électronique avancée" },
    { name: "Partie B: Pages Web statiques",                          group: "Chapitre II: Production électronique avancée" },
    { name: "Partie C: Pages Web dynamiques",                         group: "Chapitre II: Production électronique avancée" },
    { name: "Publication électronique",                               group: "Chapitre III: Publication électronique" },
  ] as FallbackChapter[],

  // Arabe, Histoire, Géographie — intentionally omitted for all Bac tracks → hidden.
  // Physique-Chimie Bac Sciences de l'informatique — omitted → hidden.
});

// ── PHILOSOPHIE — 3ÈME + BAC constants ───────────────────────────────────────

// 3ème Lettres
const PHILO_3EME_LETTRES: FallbackChapter[] = [
  { name: "الدعاية",                              group: "I- اليومي" },
  { name: "الرأي السائد",                         group: "I- اليومي" },
  { name: "الوثوقية",                             group: "I- اليومي" },
  { name: "الوهم",                                group: "I- اليومي" },
  { name: "أشباه المشاكل",                        group: "1- في الوعي بالمغالطات" },
  { name: "الحجاج الباطل",                        group: "1- في الوعي بالمغالطات" },
  { name: "الخلط بين المقولات المنطقية",          group: "1- في الوعي بالمغالطات" },
  { name: "المفارقة",                             group: "1- في الوعي بالمغالطات" },
  { name: "الأشكلة",                              group: "2- إجرائيات التفكير" },
  { name: "التأسيس",                              group: "2- إجرائيات التفكير" },
  { name: "التعريف",                              group: "2- إجرائيات التفكير" },
  { name: "الحجاج",                               group: "2- إجرائيات التفكير" },
  { name: "الدحض",                                group: "2- إجرائيات التفكير" },
  { name: "التعقل",                               group: "3- إيتيقا التفكير" },
  { name: "الحوار",                               group: "3- إيتيقا التفكير" },
  { name: "النقد",                                group: "3- إيتيقا التفكير" },
  { name: "الاستقلالية",                          group: "III- تجربة الالتزام: شخصيات فكرية" },
  { name: "الإيديولوجيا",                         group: "III- تجربة الالتزام: شخصيات فكرية" },
  { name: "الشجاعة",                              group: "III- تجربة الالتزام: شخصيات فكرية" },
  { name: "المسؤولية",                            group: "III- تجربة الالتزام: شخصيات فكرية" },
  { name: "دراسة مسترسلة لأثر فلسفي",            group: "VI- دراسة مسترسلة لأثر فلسفي" },
];

// 3ème بقية الشعب (all other 3ème tracks)
const PHILO_3EME_AUTRES: FallbackChapter[] = [
  { name: "الدعاية",                              group: "I- اليومي" },
  { name: "الرأي السائد",                         group: "I- اليومي" },
  { name: "الوهم",                                group: "I- اليومي" },
  { name: "أشباه المشاكل",                        group: "1- في الوعي بالمغالطات" },
  { name: "الحجاج الباطل",                        group: "1- في الوعي بالمغالطات" },
  { name: "الخلط بين المقولات المنطقية",          group: "1- في الوعي بالمغالطات" },
  { name: "الأشكلة",                              group: "2- إجرائيات التفكير" },
  { name: "التعريف",                              group: "2- إجرائيات التفكير" },
  { name: "الحجاج",                               group: "2- إجرائيات التفكير" },
  { name: "الدحض",                                group: "2- إجرائيات التفكير" },
  { name: "الاستقلالية",                          group: "III- تجربة الالتزام: شخصيات فكرية" },
  { name: "الحوار",                               group: "III- تجربة الالتزام: شخصيات فكرية" },
  { name: "الشجاعة",                              group: "III- تجربة الالتزام: شخصيات فكرية" },
  { name: "المسؤولية",                            group: "III- تجربة الالتزام: شخصيات فكرية" },
  { name: "النقد",                                group: "III- تجربة الالتزام: شخصيات فكرية" },
];

// Bac Lettres
const PHILO_BAC_LETTRES: FallbackChapter[] = [
  // Group I — Subgroup 1
  { name: "التاريخ",                              group: "1- الإنية والغيرية" },
  { name: "الجسد",                                group: "1- الإنية والغيرية" },
  { name: "الذات",                                group: "1- الإنية والغيرية" },
  { name: "العالم",                               group: "1- الإنية والغيرية" },
  { name: "اللاوعي",                              group: "1- الإنية والغيرية" },
  { name: "الوعي",                                group: "1- الإنية والغيرية" },
  // Group I — Subgroup 2
  { name: "الآخر",                                group: "2- التواصل والأنظمة الرمزية" },
  { name: "الصورة",                               group: "2- التواصل والأنظمة الرمزية" },
  { name: "اللغة",                                group: "2- التواصل والأنظمة الرمزية" },
  { name: "الوساطة",                              group: "2- التواصل والأنظمة الرمزية" },
  { name: "المقدس",                               group: "2- التواصل والأنظمة الرمزية" },
  // Group I — Subgroup 3
  { name: "الاختلاف",                             group: "3- الخصوصية والكونية" },
  { name: "العالمي",                              group: "3- الخصوصية والكونية" },
  { name: "العولمي",                              group: "3- الخصوصية والكونية" },
  { name: "الهوية",                               group: "3- الخصوصية والكونية" },
  { name: "الكلي",                                group: "3- الخصوصية والكونية" },
  // Group II — Nested: أ- البعد التركيبي
  { name: "الأكسمة",                              group: "أ- البعد التركيبي" },
  { name: "البنية",                               group: "أ- البعد التركيبي" },
  { name: "الترييض",                              group: "أ- البعد التركيبي" },
  { name: "الصورنة",                              group: "أ- البعد التركيبي" },
  // Group II — Nested: ب- البعد الدلالي
  { name: "الافتراضي",                            group: "ب- البعد الدلالي" },
  { name: "القانون",                              group: "ب- البعد الدلالي" },
  { name: "الملائم",                              group: "ب- البعد الدلالي" },
  { name: "النظرية",                              group: "ب- البعد الدلالي" },
  { name: "الواقعي",                              group: "ب- البعد الدلالي" },
  // Group II — Nested: ج- البعد التداولي
  { name: "التفسير",                              group: "ج- البعد التداولي" },
  { name: "التحقيق",                              group: "ج- البعد التداولي" },
  { name: "الفهم",                                group: "ج- البعد التداولي" },
  { name: "النجاعة",                              group: "ج- البعد التداولي" },
  // Group II — Nested: أ- الحدود الإبستيمولوجية
  { name: "الاختزالية",                           group: "أ- الحدود الإبستيمولوجية" },
  { name: "التاريخية",                            group: "أ- الحدود الإبستيمولوجية" },
  { name: "الأنظمة التقنية",                      group: "أ- الحدود الإبستيمولوجية" },
  // Group II — Nested: ب- الحدود الفلسفية
  { name: "الحقيقة",                              group: "ب- الحدود الفلسفية" },
  { name: "المسؤولية",                            group: "ب- الحدود الفلسفية" },
  { name: "المعنى",                               group: "ب- الحدود الفلسفية" },
  // Group III — Subgroup 1
  { name: "الاغتراب",                             group: "1- العمل: النجاعة والعدالة" },
  { name: "الإنصاف",                              group: "1- العمل: النجاعة والعدالة" },
  { name: "التحرر",                               group: "1- العمل: النجاعة والعدالة" },
  { name: "السوق",                                group: "1- العمل: النجاعة والعدالة" },
  { name: "المال",                                group: "1- العمل: النجاعة والعدالة" },
  { name: "المنفعة",                              group: "1- العمل: النجاعة والعدالة" },
  // Group III — Subgroup 2
  { name: "الحق",                                 group: "2- الدولة: السيادة والمواطنة" },
  { name: "الديمقراطية",                          group: "2- الدولة: السيادة والمواطنة" },
  { name: "السلطة",                               group: "2- الدولة: السيادة والمواطنة" },
  { name: "العنف",                                group: "2- الدولة: السيادة والمواطنة" },
  { name: "المقاومة",                             group: "2- الدولة: السيادة والمواطنة" },
  { name: "المواطن العالمي",                      group: "2- الدولة: السيادة والمواطنة" },
  // Group III — Subgroup 3
  { name: "الحرية",                               group: "3- الأخلاق: الخير والسعادة" },
  { name: "الرفاه",                               group: "3- الأخلاق: الخير والسعادة" },
  { name: "الفضيلة",                              group: "3- الأخلاق: الخير والسعادة" },
  { name: "الواجب",                               group: "3- الأخلاق: الخير والسعادة" },
  // Group III — Subgroup 4
  { name: "الإبداع",                              group: "4- الفن: الجمال والحقيقة" },
  { name: "التذوق",                               group: "4- الفن: الجمال والحقيقة" },
  { name: "المحاكاة",                             group: "4- الفن: الجمال والحقيقة" },
  // Group VI
  { name: "دراسة مسترسلة لأثر فلسفي",            group: "VI- دراسة مسترسلة لأثر فلسفي" },
];

// Bac بقية الشعب (all other Bac tracks)
const PHILO_BAC_AUTRES: FallbackChapter[] = [
  // Group I — Subgroup 1
  { name: "التاريخ",                              group: "1- الإنية والغيرية" },
  { name: "الجسد",                                group: "1- الإنية والغيرية" },
  { name: "الذات",                                group: "1- الإنية والغيرية" },
  { name: "اللاوعي",                              group: "1- الإنية والغيرية" },
  { name: "الوعي",                                group: "1- الإنية والغيرية" },
  // Group I — Subgroup 2
  { name: "الآخر",                                group: "2- الخصوصية والكونية" },
  { name: "الاختلاف",                             group: "2- الخصوصية والكونية" },
  { name: "التواصل",                              group: "2- الخصوصية والكونية" },
  { name: "الصورة",                               group: "2- الخصوصية والكونية" },
  { name: "المقدس",                               group: "2- الخصوصية والكونية" },
  { name: "الهوية",                               group: "2- الخصوصية والكونية" },
  // Group II — Nested: أ- البعد التركيبي
  { name: "الأكسمة",                              group: "أ- البعد التركيبي" },
  { name: "البنية",                               group: "أ- البعد التركيبي" },
  { name: "الترييض",                              group: "أ- البعد التركيبي" },
  { name: "الصورنة",                              group: "أ- البعد التركيبي" },
  // Group II — Nested: ب- البعد الدلالي
  { name: "الافتراضي",                            group: "ب- البعد الدلالي" },
  { name: "الملائم",                              group: "ب- البعد الدلالي" },
  { name: "الواقعي",                              group: "ب- البعد الدلالي" },
  { name: "القانون",                              group: "ب- البعد الدلالي" },
  { name: "النظرية",                              group: "ب- البعد الدلالي" },
  // Group II — Nested: ج- البعد التداولي
  { name: "التفسير",                              group: "ج- البعد التداولي" },
  { name: "التحقيق",                              group: "ج- البعد التداولي" },
  { name: "الفهم",                                group: "ج- البعد التداولي" },
  { name: "النجاعة",                              group: "ج- البعد التداولي" },
  // Group II — Nested: أ- الحدود الإبستيمولوجية
  { name: "الاختزالية",                           group: "أ- الحدود الإبستيمولوجية" },
  { name: "التاريخية",                            group: "أ- الحدود الإبستيمولوجية" },
  { name: "الأنظمة التقنية",                      group: "أ- الحدود الإبستيمولوجية" },
  // Group II — Nested: ب- الحدود الفلسفية
  { name: "الحقيقة",                              group: "ب- الحدود الفلسفية" },
  { name: "المسؤولية",                            group: "ب- الحدود الفلسفية" },
  { name: "المعنى",                               group: "ب- الحدود الفلسفية" },
  // Group III — Subgroup 1
  { name: "الحق",                                 group: "1- الدولة: السيادة والمواطنة" },
  { name: "الديمقراطية",                          group: "1- الدولة: السيادة والمواطنة" },
  { name: "السلطة",                               group: "1- الدولة: السيادة والمواطنة" },
  { name: "العدالة",                              group: "1- الدولة: السيادة والمواطنة" },
  { name: "المواطن العالمي",                      group: "1- الدولة: السيادة والمواطنة" },
  // Group III — Subgroup 2
  { name: "الحرية",                               group: "2- الأخلاق: الخير والسعادة" },
  { name: "الرفاه",                               group: "2- الأخلاق: الخير والسعادة" },
  { name: "الفضيلة",                              group: "2- الأخلاق: الخير والسعادة" },
  { name: "الواجب",                               group: "2- الأخلاق: الخير والسعادة" },
  { name: "المنفعة",                              group: "2- الأخلاق: الخير والسعادة" },
];

Object.assign(CURRICULUM_FALLBACK, {

  // ── PHILOSOPHIE — 3ème ───────────────────────────────────────────────────────
  "3eme/lettres/Philosophie":               PHILO_3EME_LETTRES,
  "3eme/mathematiques/Philosophie":         PHILO_3EME_AUTRES,
  "3eme/sciences_experimentales/Philosophie": PHILO_3EME_AUTRES,
  "3eme/sciences_techniques/Philosophie":   PHILO_3EME_AUTRES,
  "3eme/economie_gestion/Philosophie":      PHILO_3EME_AUTRES,
  "3eme/sciences_informatique/Philosophie": PHILO_3EME_AUTRES,

  // ── PHILOSOPHIE — Bac ────────────────────────────────────────────────────────
  "bac/lettres/Philosophie":               PHILO_BAC_LETTRES,
  "bac/mathematiques/Philosophie":         PHILO_BAC_AUTRES,
  "bac/sciences_experimentales/Philosophie": PHILO_BAC_AUTRES,
  "bac/sciences_techniques/Philosophie":   PHILO_BAC_AUTRES,
  "bac/economie_gestion/Philosophie":      PHILO_BAC_AUTRES,
  "bac/sciences_informatique/Philosophie": PHILO_BAC_AUTRES,
});
