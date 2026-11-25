import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icone } from "./Icone";
import { Bouton, Carte, Jeton } from "./Primitives";
import { useUI } from "./Superpositions";
import { cx } from "../lib/format";

/* =========================================================================
   ASSISTANT IA — brique réutilisable
   Le même bloc sert pour les journaux, les alertes, la santé du serveur et
   la base de données. Il tient en quatre règles, qui sont la raison d'être
   du composant plutôt qu'un détail d'habillage :

   1. L'assistant ne décide de rien. Il rend une lecture, et l'opérateur
      la retient, l'écarte, ou la transforme en action.
   2. Chaque affirmation cite ce sur quoi elle s'appuie. Une lecture sans
      preuve se repère au premier coup d'œil.
   3. Quand les éléments ne suffisent pas, il le dit. C'est une réponse
      valable, pas un échec.
   4. Ce que ça coûte et quel modèle a répondu sont écrits, toujours.
   ========================================================================= */

export interface Constat {
  /** Ce qui s'est passé, en une phrase. */
  resume: string;
  /** La cause la plus probable. Vide si l'assistant ne conclut pas. */
  cause: string;
  /** Le degré de certitude, dit en toutes lettres. */
  certitude: "élevée" | "moyenne" | "faible" | "insuffisante";
  /** Les éléments cités : lignes de journal, mesures, événements. */
  preuves: Array<{ source: string; extrait: string }>;
  /** Ce qu'il vérifierait ensuite, dans l'ordre. */
  pistes: string[];
  /** L'action qu'il propose, que l'opérateur déclenche ou non. */
  action?: { libelle: string; consequence: string };
}

export function AssistantIA({
  titre = "Lecture assistée",
  invite,
  constat,
  modele = "Modèle de raisonnement",
  cout = 0.012,
  surAction,
  compact,
}: {
  titre?: string;
  /** Ce sur quoi on lui demande de se prononcer, dit à l'opérateur. */
  invite: string;
  constat: Constat;
  modele?: string;
  cout?: number;
  surAction?: () => void;
  compact?: boolean;
}) {
  const ui = useUI();
  const [etat, poserEtat] = useState<"repos" | "travail" | "rendu" | "retenu" | "ecarte">("repos");
  const [etape, poserEtape] = useState(0);
  const minuteur = useRef<number | undefined>(undefined);

  const ETAPES = [
    "Rassemblement des éléments…",
    "Mise en correspondance avec les procédures…",
    "Rédaction de la lecture…",
  ];

  useEffect(() => () => window.clearTimeout(minuteur.current), []);

  function analyser() {
    poserEtat("travail");
    poserEtape(0);
    const avancer = (i: number) => {
      if (i >= ETAPES.length) { poserEtat("rendu"); return; }
      poserEtape(i);
      minuteur.current = window.setTimeout(() => avancer(i + 1), 520);
    };
    avancer(0);
  }

  const certitude = {
    "élevée": { ton: "bon" as const, texte: "Les éléments concordent." },
    "moyenne": { ton: "vigilance" as const, texte: "Une autre cause reste possible." },
    "faible": { ton: "serieux" as const, texte: "À confirmer avant d'agir." },
    "insuffisante": { ton: "neutre" as const, texte: "Pas de quoi conclure." },
  }[constat.certitude];

  return (
    <Carte className={cx("relative overflow-hidden", etat === "rendu" && "border-accent/30")} enfants={
      <>
        <i aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[var(--accent)] to-[var(--serie-7)] opacity-60" />

        <header className="flex items-start gap-[10px] px-[var(--pas-carte)] pt-[var(--pas-carte)]">
          <span className="w-[26px] h-[26px] rounded-[4px] grid place-items-center shrink-0 bg-accent-voile text-accent">
            <Icone nom="etoiles" taille="s" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[13.5px] font-semibold">{titre}</h2>
            <p className="text-[12px] text-encre-3">{invite}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0 sans-impression">
            {etat === "repos" && (
              <Bouton ton="principal" taille="s" icone="etoiles" onClick={analyser} enfants="Analyser" />
            )}
            {(etat === "rendu" || etat === "retenu" || etat === "ecarte") && (
              <Bouton ton="fantome" taille="s" icone="rafraichir" title="Redemander" onClick={analyser} />
            )}
          </div>
        </header>

        {etat === "repos" && (
          <div className="pas-carte pt-3">
            <p className="text-[12px] text-encre-3">
              Rien n'est envoyé au modèle tant que vous ne le demandez pas. Les identités sont
              remplacées par des matricules avant l'envoi.
            </p>
          </div>
        )}

        {etat === "travail" && (
          <div className="pas-carte pt-3">
            <div className="flex items-center gap-[10px] text-[13px] text-encre-2">
              <Icone nom="rafraichir" taille="s" className="text-accent animate-spin [animation-duration:1.2s]" />
              {ETAPES[etape]}
            </div>
            <div className="mt-3 space-y-[6px]">
              {[100, 86, 64].map((l, i) => (
                <div key={i} className="h-[9px] rounded-[3px] bg-surface-3 overflow-hidden"
                     style={{ width: l + "%", opacity: i <= etape ? 1 : 0.4 }}>
                  <i className="block h-full bg-accent-voile anim-apparait" />
                </div>
              ))}
            </div>
          </div>
        )}

        {(etat === "rendu" || etat === "retenu" || etat === "ecarte") && (
          <div className="pas-carte pt-3">
            <div className="flex items-start gap-2 mb-3">
              <p className="text-[14px] leading-[20px] font-medium flex-1 min-w-0">{constat.resume}</p>
              <Jeton ton={certitude.ton} enfants={`certitude ${constat.certitude}`} />
            </div>

            {constat.cause ? (
              <section className="mb-3">
                <h3 className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-1">Cause la plus probable</h3>
                <p className="text-[13px] text-encre-2 leading-[20px]">{constat.cause}</p>
                <p className="text-[12px] text-encre-3 mt-1">{certitude.texte}</p>
              </section>
            ) : (
              <section className="mb-3 p-3 rounded-[4px] bg-surface-2 border border-bordure">
                <p className="text-[13px] text-encre-2">
                  Les éléments disponibles ne permettent pas de désigner une cause. Plutôt qu'une
                  hypothèse plausible, voici ce qui manque pour trancher.
                </p>
              </section>
            )}

            {constat.preuves.length > 0 && (
              <section className="mb-3">
                <h3 className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-[6px]">
                  Sur quoi il s'appuie
                </h3>
                <div className="space-y-[6px]">
                  {constat.preuves.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 p-[8px] rounded-[4px] bg-surface-2 border border-bordure anim-entre"
                         style={{ animationDelay: i * 50 + "ms" }}>
                      <span className="font-mono text-[10.5px] text-encre-4 shrink-0 w-[112px] truncate" title={p.source}>{p.source}</span>
                      <span className="font-mono text-[11.5px] text-encre-2 [overflow-wrap:anywhere]">{p.extrait}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {constat.pistes.length > 0 && !compact && (
              <section className="mb-3">
                <h3 className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-[6px]">
                  Ce qu'il vérifierait, dans cet ordre
                </h3>
                <ol className="space-y-[5px]">
                  {constat.pistes.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-encre-2">
                      <span className="w-[17px] h-[17px] rounded-full bg-surface-3 text-encre-3 text-[10px] font-semibold grid place-items-center shrink-0 mt-[2px]">
                        {i + 1}
                      </span>
                      {p}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {constat.action && etat === "rendu" && (
              <div className="flex items-start gap-3 p-3 rounded-[4px] bg-accent-voile border border-accent/30 mb-3">
                <Icone nom="eclair" taille="s" className="text-accent mt-[2px] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{constat.action.libelle}</div>
                  <p className="text-[12px] text-encre-2 mt-[2px]">{constat.action.consequence}</p>
                </div>
                <Bouton taille="s" ton="principal" className="shrink-0" onClick={async () => {
                  const ok = await ui.confirmer({
                    titre: constat.action!.libelle + " ?",
                    texte: constat.action!.consequence + " C'est vous qui déclenchez cette action, pas l'assistant : elle sera journalisée à votre nom.",
                    bouton: "Lancer", ton: "vigilance",
                  });
                  if (ok) { surAction?.(); ui.message("Action lancée et journalisée à votre nom.", "bon"); }
                }} enfants="Lancer" />
              </div>
            )}

            <footer className="flex items-center gap-3 flex-wrap pt-3 border-t border-bordure text-[11px] text-encre-4">
              <span className="inline-flex items-center gap-[5px]"><Icone nom="puce" taille="s" />{modele}</span>
              <span className="inline-flex items-center gap-[5px]"><Icone nom="monnaie" taille="s" />{cout.toFixed(3)} €</span>
              <span className="inline-flex items-center gap-[5px]"><Icone nom="bouclier" taille="s" />identités pseudonymisées</span>

              <div className="ml-auto flex items-center gap-2 sans-impression">
                {etat === "rendu" ? (
                  <>
                    <Bouton taille="s" icone="croix" onClick={() => {
                      poserEtat("ecarte");
                      ui.message("Lecture écartée. Le retour sert à régler l'agent.", "info");
                    }} enfants="Écarter" />
                    <Bouton taille="s" icone="check" onClick={() => {
                      poserEtat("retenu");
                      ui.message("Lecture retenue et jointe au dossier.", "bon");
                    }} enfants="Retenir" />
                  </>
                ) : (
                  <Jeton ton={etat === "retenu" ? "bon" : "neutre"}
                         enfants={etat === "retenu" ? "retenue par vous" : "écartée par vous"} />
                )}
              </div>
            </footer>

            <p className="text-[11px] text-encre-4 mt-2">
              L'assistant propose une lecture. Il ne touche à rien : toute action part de vous.
            </p>
          </div>
        )}
      </>
    } />
  );
}

/* Bandeau compact : une seule phrase d'assistant au-dessus d'une liste. */
export function LigneAssistant({ texte, action }: { texte: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-[10px] px-4 py-[10px] rounded-[4px] bg-accent-voile border border-accent/25 anim-apparait">
      <Icone nom="etoiles" taille="s" className="text-accent mt-[2px] shrink-0" />
      <div className="text-[12.5px] text-encre-2 min-w-0 flex-1">{texte}</div>
      {action && <div className="shrink-0 sans-impression">{action}</div>}
    </div>
  );
}
