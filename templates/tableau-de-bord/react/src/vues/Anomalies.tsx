import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, TeteCarte } from "../composants/Primitives";
import { Apparition, NombreAnime } from "../composants/Mouvement";
import { Icone, type NomIcone } from "../composants/Icone";
import { useUI } from "../composants/Superpositions";
import { cx, exporterCSV, fmt, normaliser } from "../lib/format";
import { anomalies as anomaliesInitiales, type Anomalie, type Correctif, type EtatAnomalie, type FamilleAnomalie } from "../lib/exploitation";

const FAMILLES: Record<FamilleAnomalie, { nom: string; icone: NomIcone; texte: string }> = {
  "faille": { nom: "Faille", icone: "bouclier", texte: "Une faiblesse exploitable, qu'elle ait été exploitée ou non." },
  "bug": { nom: "Bug", icone: "alerte", texte: "Le logiciel ne fait pas ce qu'il annonce." },
  "donnée": { nom: "Donnée", icone: "base", texte: "Le logiciel marche, mais les données qu'il contient sont fausses." },
};

const TON_GRAVITE = { critique: "critique", "élevée": "serieux", moyenne: "vigilance", faible: "neutre" } as const;
const TON_ETAT: Record<EtatAnomalie, "critique" | "accent" | "vigilance" | "bon" | "neutre"> = {
  "ouverte": "critique", "correctif proposé": "accent", "en vérification": "vigilance",
  "corrigée": "bon", "écartée": "neutre",
};

/* Anomalies : failles, bugs et erreurs de données au même endroit.
   Ils sont regroupés parce qu'ils se traitent pareil — on constate, on
   comprend, on corrige, on vérifie. Ce qui change, c'est la nature du
   correctif : une montée de version, un changement de code, une requête
   de redressement.
   Le correctif est PROPOSÉ par un agent, jamais appliqué par lui. Le texte
   exact est lisible avant d'être exécuté, sa portée est chiffrée, et c'est
   un humain qui déclenche — à son nom, au journal d'audit. */
export function Anomalies() {
  const ui = useUI();
  const [anomalies, poserAnomalies] = useState<Anomalie[]>(anomaliesInitiales);
  const [onglet, poserOnglet] = useState("ouvertes");
  const [q, poserQ] = useState("");
  const [famille, poserFamille] = useState("");
  const [choisie, poserChoisie] = useState<Anomalie | null>(anomaliesInitiales[0]);

  const ouvertes = anomalies.filter((a) => a.etat !== "corrigée" && a.etat !== "écartée");
  const avecCorrectif = anomalies.filter((a) => a.correctif && a.etat === "correctif proposé");
  const critiques = ouvertes.filter((a) => a.gravite === "critique");
  const parFamille = (f: FamilleAnomalie) => ouvertes.filter((a) => a.famille === f).length;

  const base = onglet === "ouvertes" ? ouvertes
    : onglet === "correctifs" ? avecCorrectif
    : onglet === "traitees" ? anomalies.filter((a) => a.etat === "corrigée" || a.etat === "écartée")
    : anomalies;

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return base.filter((a) =>
      (!n || normaliser(`${a.titre} ${a.service} ${a.composant} ${a.code}`).includes(n)) &&
      (!famille || a.famille === famille));
  }, [base, q, famille]);

  async function appliquer(a: Anomalie) {
    const c = a.correctif;
    if (!c) return;
    const ok = await ui.confirmer({
      titre: `Appliquer le correctif de ${a.code} ?`,
      texte: `${c.resume} Portée : ${c.portee} ${c.reversible ? "L'opération est réversible." : "L'opération n'est pas réversible — un instantané est pris avant."} Elle sera exécutée à votre nom et journalisée.`,
      bouton: "Appliquer le correctif",
      ton: c.risque === "élevé" || !c.reversible ? "danger" : "vigilance",
      mot: c.reversible ? undefined : a.code,
    });
    if (!ok) return;
    poserAnomalies((l) => l.map((x) => x.code === a.code ? { ...x, etat: "en vérification" } : x));
    poserChoisie((x) => x && x.code === a.code ? { ...x, etat: "en vérification" } : x);
    ui.message(`Correctif de ${a.code} appliqué. Vérification en cours : ${c.verification}`, "bon", { duree: 6000 });
  }

  async function ecarter(a: Anomalie) {
    const ok = await ui.confirmer({
      titre: `Écarter ${a.code} ?`,
      texte: "L'anomalie sort des files d'attente. Le motif reste lisible : c'est lui qu'on relira si le problème revient. Écarter n'est pas corriger.",
      bouton: "Écarter", ton: "vigilance",
    });
    if (!ok) return;
    poserAnomalies((l) => l.map((x) => x.code === a.code ? { ...x, etat: "écartée" } : x));
    poserChoisie((x) => x && x.code === a.code ? { ...x, etat: "écartée" } : x);
    ui.message(`${a.code} écartée.`, "info");
  }

  function demanderCorrectif(a: Anomalie) {
    ui.message(`Analyse de ${a.code} demandée à l'agent…`, "info", { duree: 1600 });
    setTimeout(() => ui.message(
      "L'agent n'a pas proposé de correctif : les éléments disponibles ne permettent pas de trancher entre deux approches. Son analyse est jointe à la fiche.",
      "info", { duree: 6000 }), 1800);
  }

  return (
    <>
      <Entete
        titre="Anomalies"
        sous="Failles, bugs et erreurs de données au même endroit — avec le correctif que l'agent propose et que vous appliquez."
        actions={
          <>
            {avecCorrectif.length > 0 && <Jeton ton="accent" enfants={`${avecCorrectif.length} correctifs prêts`} />}
            <Bouton icone="telecharger" onClick={() => { exporterCSV("anomalies", filtres.map(({ preuves, correctif, ...r }) => ({ ...r, correctif: correctif ? correctif.nature : "aucun" }))); ui.message("Liste exportée.", "bon"); }} enfants="Exporter" />
            <Bouton icone="rafraichir" onClick={() => ui.message("Nouvelle passe d'analyse lancée sur les journaux et le contrôle d'intégrité.", "bon")} enfants="Relancer l'analyse" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Ouvertes" valeur={<NombreAnime valeur={ouvertes.length} />} ton={ouvertes.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Critiques" valeur={<NombreAnime valeur={critiques.length} />} ton={critiques.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Failles" valeur={<NombreAnime valeur={parFamille("faille")} />} ton={parFamille("faille") ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Bugs" valeur={<NombreAnime valeur={parFamille("bug")} />} ton={parFamille("bug") ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Erreurs de données" valeur={<NombreAnime valeur={parFamille("donnée")} />} ton={parFamille("donnée") ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Correctifs prêts" valeur={<NombreAnime valeur={avecCorrectif.length} />} ton="accent" />} />
      </div>

      {critiques.length > 0 && (
        <Apparition className="mb-4">
          <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] bg-critique-voile border border-critique/40">
            <Icone nom="bouclier" className="text-critique mt-[2px]" />
            <div className="flex-1 min-w-[min(100%,220px)] text-[13px]">
              <b>{critiques[0].titre}</b>{" "}
              <span className="text-encre-2">{critiques[0].effet}</span>
              {critiques[0].correctif && (
                <span className="text-encre-2"> Un correctif est prêt : {critiques[0].correctif.resume.toLowerCase()}</span>
              )}
            </div>
            <Bouton taille="s" ton="danger" onClick={() => { poserChoisie(critiques[0]); poserOnglet("ouvertes"); }} enfants="Ouvrir" />
          </div>
        </Apparition>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)" }}>
        {/* Liste */}
        <Carte className="self-start" enfants={
          <>
            <Onglets compact actif={onglet} surChoix={poserOnglet}
              onglets={[
                { cle: "ouvertes", nom: "Ouvertes", compte: ouvertes.length },
                { cle: "correctifs", nom: "Correctifs", compte: avecCorrectif.length },
                { cle: "traitees", nom: "Traitées", compte: anomalies.length - ouvertes.length },
              ]} />

            <div className="pas-carte border-b border-bordure">
              <div className="flex items-center gap-2 h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi mb-2">
                <Icone nom="recherche" taille="s" />
                <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                  placeholder="Titre, service, composant…" aria-label="Rechercher une anomalie"
                  className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
              </div>
              <div className="flex gap-[6px]">
                {([["", "Toutes"], ["faille", "Failles"], ["bug", "Bugs"], ["donnée", "Données"]] as const).map(([c, n]) => (
                  <button key={c} type="button" aria-pressed={famille === c} onClick={() => poserFamille(c)}
                    className={cx("h-[26px] px-[9px] rounded-[4px] border text-[12px] transi",
                      famille === c ? "bg-accent-voile border-accent text-accent font-semibold"
                        : "bg-surface-2 border-bordure text-encre-3 hover:text-encre")}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-bordure max-h-[560px] overflow-y-auto">
              {filtres.map((a, i) => (
                <button key={a.code} type="button" onClick={() => poserChoisie(a)}
                  className={cx("flex items-start gap-3 p-3 w-full text-left transi anim-pousse",
                    choisie?.code === a.code ? "bg-accent-voile" : "hover:bg-surface-2")}
                  style={{ animationDelay: i * 25 + "ms" }}>
                  <span className={cx("w-[26px] h-[26px] rounded-[4px] grid place-items-center shrink-0 mt-[2px]",
                    a.famille === "faille" ? "bg-critique-voile text-critique"
                      : a.famille === "bug" ? "bg-vigilance-voile text-vigilance"
                      : "bg-accent-voile text-accent")}>
                    <Icone nom={FAMILLES[a.famille].icone} taille="s" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-[6px] flex-wrap">
                      <span className="font-mono text-[11px] text-encre-4">{a.code}</span>
                      <Jeton ton={TON_GRAVITE[a.gravite]} point={false} enfants={a.gravite} />
                      {a.correctif && a.etat === "correctif proposé" && (
                        <span className="inline-flex items-center gap-[3px] text-[10.5px] text-accent font-semibold">
                          <Icone nom="etoiles" taille="s" />correctif prêt
                        </span>
                      )}
                    </span>
                    <span className="block text-[13px] font-semibold mt-[2px] leading-[17px]">{a.titre}</span>
                    <span className="block text-[11px] text-encre-3 mt-[3px]">
                      {a.service} · {a.occurrences > 0 ? `${fmt(a.occurrences)} occurrences · ` : ""}{a.detectee}
                    </span>
                  </span>
                </button>
              ))}
              {filtres.length === 0 && (
                <p className="px-4 py-10 text-center text-[13px] text-encre-3">Rien dans cette vue.</p>
              )}
            </div>
          </>
        } />

        {/* Fiche */}
        <div className="min-w-0">
          {choisie && <Fiche key={choisie.code} a={choisie} appliquer={appliquer} ecarter={ecarter} demander={demanderCorrectif} />}
        </div>
      </div>

      <Apparition delai={120}>
        <Carte className="mt-4" enfants={
          <>
            <TeteCarte titre="Pourquoi l'agent ne corrige pas lui-même"
              sous="La question qu'on pose toujours en voyant cet écran" />
            <div className="pas-carte pt-3 text-[13px] text-encre-2 leading-[20px]">
              <p>
                Techniquement, rien n'empêcherait l'agent d'exécuter la requête qu'il propose. C'est
                précisément pour cela qu'on le lui interdit : un correctif de données s'applique à des
                lignes réelles, et une erreur de raisonnement sur sept soldes de congés devient sept
                agents à qui l'on doit des explications.
              </p>
              <p className="mt-3">
                Le partage est donc net. L'agent fait ce qu'il fait bien : lire des milliers de lignes,
                relier ce qui se ressemble, rédiger un correctif exact et chiffrer sa portée. L'humain
                fait ce que l'agent ne peut pas faire : savoir si, aujourd'hui, dans ce service, avec
                cette échéance de paie, c'est le bon moment.
              </p>
            </div>
          </>
        } />
      </Apparition>
    </>
  );
}

function Fiche({ a, appliquer, ecarter, demander }: {
  a: Anomalie;
  appliquer: (a: Anomalie) => void;
  ecarter: (a: Anomalie) => void;
  demander: (a: Anomalie) => void;
}) {
  return (
    <Carte className="anim-pousse" enfants={
      <>
        <div className="flex items-start gap-3 pas-carte border-b border-bordure">
          <span className={cx("w-[34px] h-[34px] rounded-[4px] grid place-items-center shrink-0",
            a.famille === "faille" ? "bg-critique-voile text-critique"
              : a.famille === "bug" ? "bg-vigilance-voile text-vigilance"
              : "bg-accent-voile text-accent")}>
            <Icone nom={FAMILLES[a.famille].icone} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] font-semibold">{a.titre}</h2>
              <Jeton ton={TON_GRAVITE[a.gravite]} enfants={a.gravite} />
              <Jeton ton={TON_ETAT[a.etat]} enfants={a.etat} />
            </div>
            <p className="text-[11.5px] text-encre-3 mt-[3px]">
              <span className="font-mono">{a.code}</span> · {FAMILLES[a.famille].nom} ·{" "}
              {a.service} · {a.composant}
            </p>
          </div>
        </div>

        <div className="pas-carte space-y-4">
          <section>
            <Titre>Ce que ça fait</Titre>
            <p className="text-[13px] text-encre-2 leading-[19px]">{a.effet}</p>
            <div className="flex items-center gap-4 mt-2 text-[11px] text-encre-4 flex-wrap">
              {a.occurrences > 0 && <span>{fmt(a.occurrences)} occurrences</span>}
              <span>vue pour la première fois {a.premiereVue}</span>
              <span>détectée {a.detectee}</span>
              {a.assignee !== "—" && <span>suivie par {a.assignee}</span>}
            </div>
          </section>

          <section>
            <Titre>Sur quoi on s'appuie</Titre>
            <div className="space-y-[6px]">
              {a.preuves.map((p, i) => (
                <div key={i} className="flex items-start gap-2 p-[8px] rounded-[4px] bg-surface-2 border border-bordure anim-pousse"
                  style={{ animationDelay: i * 40 + "ms" }}>
                  <span className="font-mono text-[10.5px] text-encre-4 shrink-0 w-[150px] truncate" title={p.source}>{p.source}</span>
                  <span className="font-mono text-[11.5px] text-encre-2 [overflow-wrap:anywhere]">{p.extrait}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <Titre>Analyse</Titre>
            <p className="text-[13px] text-encre-2 leading-[19px]">{a.analyse}</p>
          </section>

          {a.correctif ? (
            <BlocCorrectif a={a} c={a.correctif} appliquer={appliquer} ecarter={ecarter} />
          ) : (
            <section className="p-4 rounded-[4px] border border-bordure bg-surface-2">
              <div className="flex items-start gap-3">
                <Icone nom="etoiles" className="text-encre-4 mt-[2px] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">Aucun correctif proposé</div>
                  <p className="text-[12.5px] text-encre-2 mt-[2px] leading-[18px]">
                    L'agent s'est arrêté : les éléments disponibles ne permettent pas de trancher entre
                    plusieurs approches. C'est une réponse valable — une proposition inventée coûterait
                    plus cher que pas de proposition du tout.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Bouton taille="s" icone="etoiles" onClick={() => demander(a)} enfants="Redemander une analyse" />
                    <Bouton taille="s" ton="fantome" onClick={() => ecarter(a)} enfants="Écarter" />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </>
    } />
  );
}

function BlocCorrectif({ a, c, appliquer, ecarter }: {
  a: Anomalie; c: Correctif;
  appliquer: (a: Anomalie) => void;
  ecarter: (a: Anomalie) => void;
}) {
  const applique = a.etat === "en vérification" || a.etat === "corrigée";
  return (
    <section className={cx("rounded-[4px] border overflow-hidden",
      applique ? "border-bon/40" : "border-accent/40")}>
      <div className={cx("flex items-start gap-3 p-3 border-b",
        applique ? "bg-bon-voile border-bon/30" : "bg-accent-voile border-accent/30")}>
        <Icone nom="etoiles" className={applique ? "text-bon" : "text-accent"} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold">{c.resume}</div>
          <div className="flex items-center gap-3 mt-[4px] text-[11px] text-encre-3 flex-wrap">
            <span>Proposé par {c.propositionPar}</span>
            <span>confiance {c.confiance}</span>
            <span>{c.cout.toFixed(3)} €</span>
          </div>
        </div>
        <Jeton ton="neutre" point={false} enfants={c.nature} />
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4">
            {c.langage === "diff" ? "Ce qui change dans le code"
              : c.langage === "sql" ? "La requête qui sera exécutée"
              : c.langage === "yaml" ? "La configuration qui sera appliquée" : "La commande"}
          </span>
          <span className="ml-auto font-mono text-[10px] text-encre-4">{c.langage}</span>
        </div>

        <pre className="font-mono text-[11.5px] leading-[17px] p-3 rounded-[4px] bg-fond border border-bordure overflow-x-auto">
          {c.contenu.split("\n").map((ligne, i) => (
            <div key={i} className={cx(
              ligne.startsWith("+") && !ligne.startsWith("+++") && "bg-bon-voile text-bon",
              ligne.startsWith("-") && !ligne.startsWith("---") && "bg-critique-voile text-critique",
              ligne.startsWith("@@") && "text-accent",
              ligne.startsWith("--") && ligne.startsWith("-- ") && "text-encre-4",
              ligne.startsWith("#") && "text-encre-4",
            )}>
              {ligne || " "}
            </div>
          ))}
        </pre>

        <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <Detail nom="Portée" valeur={c.portee} />
          <Detail nom="Réversible" valeur={c.reversible ? "oui" : "non — instantané pris avant"}
            ton={c.reversible ? "bon" : "vigilance"} />
          <Detail nom="Risque" valeur={c.risque}
            ton={c.risque === "faible" ? "bon" : c.risque === "moyen" ? "vigilance" : "critique"} />
        </div>

        <div className="mt-3 p-[10px] rounded-[4px] bg-surface-2 border border-bordure">
          <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-1">
            Comment on saura que c'est corrigé
          </div>
          <p className="text-[12.5px] text-encre-2">{c.verification}</p>
        </div>

        {applique ? (
          <div className="flex items-center gap-2 mt-3 text-[12.5px] text-bon">
            <Pastille ton="bon" pulse={a.etat === "en vérification"} />
            {a.etat === "en vérification" ? "Correctif appliqué — vérification en cours." : "Corrigé et vérifié."}
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Bouton taille="s" onClick={() => ecarter(a)} enfants="Écarter" />
            <Bouton taille="s" ton="fantome"
              onClick={() => navigator.clipboard?.writeText(c.contenu)} icone="rapport" enfants="Copier" />
            <Bouton taille="s" ton={c.reversible ? "principal" : "danger"} icone="check"
              className="ml-auto" onClick={() => appliquer(a)} enfants="Appliquer le correctif" />
          </div>
        )}

        <p className="text-[11px] text-encre-4 mt-2">
          L'agent a écrit ce correctif ; il ne l'exécutera pas. L'exécution part de vous et porte votre nom
          au journal d'audit.
        </p>
      </div>
    </section>
  );
}

const Titre = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-[6px]">{children}</h3>
);

function Detail({ nom, valeur, ton }: { nom: string; valeur: string; ton?: "bon" | "vigilance" | "critique" }) {
  return (
    <div>
      <div className="text-[10.5px] text-encre-4 mb-[2px]">{nom}</div>
      <div className={cx("text-[12.5px]",
        ton === "bon" ? "text-bon" : ton === "vigilance" ? "text-vigilance" : ton === "critique" ? "text-critique" : "text-encre-2")}>
        {valeur}
      </div>
    </div>
  );
}
