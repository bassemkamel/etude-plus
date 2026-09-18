import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Printer, ChevronDown, ChevronUp } from "lucide-react";

const SECTIONS = [
  { id: "art1",  label: "1 — Présentation de la plateforme" },
  { id: "art2",  label: "2 — Acceptation des conditions" },
  { id: "art3",  label: "3 — Inscription et comptes" },
  { id: "art4",  label: "4 — Services et paiements" },
  { id: "art5",  label: "5 — Contenu et propriété intellectuelle" },
  { id: "art6",  label: "6 — Sessions en direct" },
  { id: "art7",  label: "7 — Assistant IA — Mon Prof Étude" },
  { id: "art8",  label: "8 — Évaluations et notes" },
  { id: "art9",  label: "9 — Notation des professeurs" },
  { id: "art10", label: "10 — Données personnelles" },
  { id: "art11", label: "11 — Publicités" },
  { id: "art12", label: "12 — Suspension et résiliation" },
  { id: "art13", label: "13 — Limitation de responsabilité" },
  { id: "art14", label: "14 — Droit applicable" },
  { id: "art15", label: "15 — Contact" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-10">
      <h2 className="text-lg font-bold text-[#1a1a2e] mb-3 pb-2 border-b border-amber-100">{title}</h2>
      <div className="text-gray-700 leading-relaxed space-y-3 text-sm">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-none space-y-1 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-amber-500 mt-0.5 flex-shrink-0">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Email({ addr }: { addr: string }) {
  return <a href={`mailto:${addr}`} className="text-amber-600 hover:underline font-medium">{addr}</a>;
}

export function Terms() {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string>("");
  const [tocOpen, setTocOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    document.title = "Conditions d'utilisation — Étude+";
    return () => { document.title = "Étude+"; };
  }, []);

  useEffect(() => {
    const sections = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    sections.forEach(el => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setTocOpen(false);
  }

  const TocList = () => (
    <ul className="space-y-0.5">
      {SECTIONS.map(s => (
        <li key={s.id}>
          <button
            onClick={() => scrollTo(s.id)}
            className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors font-medium leading-snug ${
              activeId === s.id
                ? "bg-amber-50 text-amber-700 border-l-2 border-amber-400"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {s.label}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="border-b border-gray-100 bg-white/90 backdrop-blur sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-amber-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-serif font-bold text-gray-900">Étude<span style={{ color: "#f59e0b" }}>+</span></span>
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            {t("legal.print")}
          </button>
        </div>
      </div>

      {/* Mobile TOC dropdown */}
      <div className="lg:hidden border-b border-gray-100 bg-gray-50 print:hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700"
          onClick={() => setTocOpen(o => !o)}
        >
          <span>{t("legal.tableOfContents")}</span>
          {tocOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {tocOpen && (
          <div className="px-2 pb-3">
            <TocList />
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-12">

          {/* Sticky sidebar TOC — desktop */}
          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-20">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 px-3">
                {t("legal.tableOfContents")}
              </p>
              <TocList />
            </div>
          </aside>

          {/* Article content */}
          <article className="min-w-0">
            {/* Header */}
            <div className="mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-4">
                {t("legal.legalDocument")}
              </div>
              <h1 className="text-3xl font-serif font-bold text-[#1a1a2e] mb-2">Conditions d'utilisation</h1>
              <p className="text-sm text-gray-400">Dernière mise à jour : Mars 2025</p>
            </div>

            {/* ARTICLE 1 */}
            <Section id="art1" title="Article 1 — Présentation de la plateforme">
              <p>
                Étude+ est une plateforme éducative en ligne basée en Tunisie, permettant aux professeurs de proposer
                des cours, quiz, tests et sessions en direct aux élèves. La plateforme est éditée par Étude+
                (ci-après "nous", "notre", "la Société").
              </p>
            </Section>

            {/* ARTICLE 2 */}
            <Section id="art2" title="Article 2 — Acceptation des conditions">
              <p>
                En créant un compte sur Étude+, vous acceptez pleinement et sans réserve les présentes Conditions
                d'utilisation. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser la plateforme.
              </p>
              <p>
                Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs seront
                informés de toute modification par email.
              </p>
            </Section>

            {/* ARTICLE 3 */}
            <Section id="art3" title="Article 3 — Inscription et comptes">
              <Sub title="3.1 Éligibilité">
                <p>Pour créer un compte, vous devez :</p>
                <Ul items={[
                  "Avoir au moins 13 ans (ou obtenir le consentement parental si mineur)",
                  "Fournir des informations exactes et complètes",
                  "Disposer d'une adresse email valide",
                ]} />
              </Sub>
              <Sub title="3.2 Sécurité du compte">
                <p>
                  Vous êtes responsable de la confidentialité de vos identifiants. Toute activité effectuée
                  depuis votre compte est sous votre responsabilité. Signalez immédiatement toute utilisation
                  non autorisée à <Email addr="support@etude-plus.tn" />
                </p>
              </Sub>
              <Sub title="3.3 Vérification des professeurs">
                <p>
                  Les professeurs doivent soumettre un dossier de vérification (KYC) incluant une pièce
                  d'identité, un diplôme universitaire, un certificat d'enseignement et une vidéo de
                  présentation. Étude+ se réserve le droit d'accepter ou refuser toute candidature sans
                  justification obligatoire.
                </p>
              </Sub>
            </Section>

            {/* ARTICLE 4 */}
            <Section id="art4" title="Article 4 — Services et paiements">
              <Sub title="4.1 Tarification">
                <p>
                  Les cours sont proposés par les professeurs à un prix maximum de 30 dinars tunisiens (TND)
                  par cours. Les prix sont fixés librement par les professeurs dans cette limite.
                </p>
              </Sub>
              <Sub title="4.2 Commission de la plateforme">
                <p>
                  Étude+ prélève une commission de 15% sur chaque transaction. Les professeurs perçoivent
                  85% du montant payé par l'élève.
                </p>
              </Sub>
              <Sub title="4.3 Politique de remboursement">
                <p>
                  Les paiements pour l'accès à un cours sont non remboursables une fois l'accès accordé,
                  sauf en cas de dysfonctionnement technique prouvé de la plateforme. Tout litige doit être
                  signalé dans les 48 heures suivant l'achat à <Email addr="support@etude-plus.tn" />
                </p>
              </Sub>
              <Sub title="4.4 Codes de réduction">
                <p>
                  Des codes promotionnels peuvent être émis par Étude+. Ces codes sont soumis à des
                  conditions spécifiques d'utilisation et ne peuvent pas être combinés sauf mention contraire.
                </p>
              </Sub>
            </Section>

            {/* ARTICLE 5 */}
            <Section id="art5" title="Article 5 — Contenu et propriété intellectuelle">
              <Sub title="5.1 Contenu des professeurs">
                <p>
                  Les professeurs conservent la propriété intellectuelle du contenu qu'ils publient. En
                  publiant sur Étude+, ils accordent à la plateforme une licence non exclusive pour afficher
                  et distribuer ce contenu aux élèves inscrits.
                </p>
              </Sub>
              <Sub title="5.2 Contenu interdit">
                <p>Il est strictement interdit de publier :</p>
                <Ul items={[
                  "Du contenu offensant, discriminatoire ou haineux",
                  "Du contenu protégé par des droits d'auteur sans autorisation",
                  "Du contenu trompeur ou frauduleux",
                  "Du contenu à caractère sexuel ou violent",
                  "Tout contenu non lié à l'enseignement",
                ]} />
              </Sub>
              <Sub title="5.3 Signalement">
                <p>
                  Tout contenu inapproprié peut être signalé à <Email addr="support@etude-plus.tn" />.
                  Étude+ se réserve le droit de supprimer tout contenu jugé inapproprié sans préavis.
                </p>
              </Sub>
            </Section>

            {/* ARTICLE 6 */}
            <Section id="art6" title="Article 6 — Sessions en direct">
              <p>
                Les sessions en direct sont proposées par les professeurs à un prix maximum de 30 TND.
                La durée et le contenu sont déterminés par le professeur. Étude+ ne peut être tenu
                responsable des interruptions techniques lors des sessions en direct. En cas d'interruption
                technique prouvée, une session de remplacement devra être proposée par le professeur.
              </p>
            </Section>

            {/* ARTICLE 7 */}
            <Section id="art7" title="Article 7 — Assistant IA — Mon Prof Étude">
              <Sub title="7.1 Nature du service">
                <p>
                  Mon Prof Étude est un assistant pédagogique alimenté par l'intelligence artificielle.
                  Il est fourni à titre d'aide éducative et ne remplace pas un professeur qualifié.
                </p>
              </Sub>
              <Sub title="7.2 Limites d'utilisation">
                <p>
                  L'accès à Mon Prof Étude est soumis à des limites quotidiennes selon le niveau
                  d'abonnement de l'utilisateur. Ces limites peuvent être modifiées à tout moment.
                </p>
              </Sub>
              <Sub title="7.3 Publicités">
                <p>
                  Les utilisateurs non abonnés ou abonnés à moins de 5 cours peuvent être exposés à des
                  publicités pour accéder à des réponses supplémentaires. Les utilisateurs inscrits à 5
                  cours ou plus bénéficient d'un accès illimité sans publicité.
                </p>
              </Sub>
              <Sub title="7.4 Exactitude">
                <p>
                  Les réponses de Mon Prof Étude sont générées automatiquement et peuvent contenir des
                  erreurs. Étude+ ne garantit pas l'exactitude des réponses fournies.
                </p>
              </Sub>
            </Section>

            {/* ARTICLE 8 */}
            <Section id="art8" title="Article 8 — Évaluations et notes">
              <p>
                Les notes attribuées par les professeurs sont sur 20, conformément au système d'évaluation
                tunisien. Étude+ ne peut être tenu responsable des évaluations réalisées par les professeurs.
                Tout litige concernant une note doit être résolu directement avec le professeur concerné.
              </p>
            </Section>

            {/* ARTICLE 9 */}
            <Section id="art9" title="Article 9 — Système de notation des professeurs">
              <p>
                Les élèves peuvent noter les professeurs de 1 à 5 étoiles et laisser des commentaires. Les
                évaluations doivent être honnêtes et basées sur l'expérience réelle. Étude+ se réserve le
                droit de supprimer tout avis jugé abusif ou frauduleux.
              </p>
            </Section>

            {/* ARTICLE 10 */}
            <Section id="art10" title="Article 10 — Données personnelles">
              <p>
                Étude+ collecte et traite vos données personnelles conformément à la loi tunisienne
                n°2004-63 du 27 juillet 2004 portant sur la protection des données personnelles. Vos
                données sont utilisées uniquement pour le fonctionnement de la plateforme et ne sont jamais
                vendues à des tiers.
              </p>
              <p>
                Pour toute demande relative à vos données, contactez : <Email addr="privacy@etude-plus.tn" />
              </p>
            </Section>

            {/* ARTICLE 11 */}
            <Section id="art11" title="Article 11 — Publicités">
              <p>
                Étude+ peut afficher des publicités tierces via Google AdSense sur certaines pages de la
                plateforme. Ces publicités sont soumises aux politiques de Google. Étude+ n'est pas
                responsable du contenu des publicités diffusées par des tiers.
              </p>
            </Section>

            {/* ARTICLE 12 */}
            <Section id="art12" title="Article 12 — Suspension et résiliation">
              <p>Étude+ se réserve le droit de suspendre ou supprimer tout compte en cas de :</p>
              <Ul items={[
                "Violation des présentes conditions",
                "Comportement frauduleux ou abusif",
                "Non-paiement",
                "Fausse déclaration lors de l'inscription",
              ]} />
              <p>En cas de suspension, aucun remboursement ne sera effectué pour les cours déjà achetés.</p>
            </Section>

            {/* ARTICLE 13 */}
            <Section id="art13" title="Article 13 — Limitation de responsabilité">
              <p>Étude+ ne peut être tenu responsable :</p>
              <Ul items={[
                "Des interruptions de service",
                "Des erreurs dans le contenu éducatif",
                "Des pertes de données",
                "De tout dommage indirect résultant de l'utilisation de la plateforme",
              ]} />
              <p>La plateforme est fournie "telle quelle" sans garantie de disponibilité permanente.</p>
            </Section>

            {/* ARTICLE 14 */}
            <Section id="art14" title="Article 14 — Droit applicable">
              <p>
                Les présentes conditions sont régies par le droit tunisien. Tout litige sera soumis à la
                compétence exclusive des tribunaux de Tunis, Tunisie.
              </p>
            </Section>

            {/* ARTICLE 15 */}
            <Section id="art15" title="Article 15 — Contact">
              <p>Pour toute question concernant ces conditions d'utilisation :</p>
              <div className="mt-3 space-y-1.5">
                <p><span className="font-medium text-gray-900">Email légal :</span>{" "}<Email addr="legal@etude-plus.tn" /></p>
                <p><span className="font-medium text-gray-900">Support :</span>{" "}<Email addr="support@etude-plus.tn" /></p>
                <p><span className="font-medium text-gray-900">Adresse :</span> Tunis, Tunisie</p>
              </div>
            </Section>

            {/* Footer nav */}
            <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 print:hidden">
              <Link href="/" className="flex items-center gap-2 hover:text-amber-600 transition-colors font-medium">
                <ArrowLeft className="w-4 h-4" /> {t("legal.backHome")}
              </Link>
              <button onClick={() => window.print()} className="flex items-center gap-2 hover:text-gray-800 transition-colors">
                <Printer className="w-4 h-4" /> {t("legal.printDoc")}
              </button>
            </div>
          </article>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { font-size: 12px; }
          h1 { font-size: 20px; }
          h2 { font-size: 14px; }
        }
      `}</style>
    </div>
  );
}
