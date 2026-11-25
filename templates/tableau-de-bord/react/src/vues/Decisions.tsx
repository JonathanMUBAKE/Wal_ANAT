import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, TeteCarte } from "../composants/Primitives";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { Icone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, normaliser } from "../lib/format";
import { decisions as decisionsInitiales, type Decision, type EtatDecision } from "../lib/institution";

const TON: Record<EtatDecision, "vigilance" | "accent" | "bon" | "neutre"> = {
  "à exécuter": "vigilance", "en cours": "accent", "exécutée": "bon", "remplacée": "neutre",
};

/* Décisions : le registre officiel.
   Une décision est numérotée, figée, confiée à quelqu'un avec une échéance,
   et suivie jusqu'à son exécution. Elle ne se modifie pas — elle se remplace
   par une nouvelle, et l'ancienne reste lisible. C'est exactement ce qui
   distingue un registre d'une liste de tâches : on peut y revenir dans cinq
   ans et reconstituer ce qui a été décidé, par qui, et sur quelle base. */
export function Decisions() {
  const ui = useUI();
  const [decisions, poserDecisions] = useState<Decision[]>(decisionsInitiales);
  const [onglet, poserOnglet] = useState("ouvertes");
  const [q, poserQ] = useState("");
  const [origine, poserOrigine] = useState("");

  const ouvertes = decisions.filter((d) => d.etat === "à exécuter" || d.etat === "en cours");
  const enRetard = ouvertes.filter((d) => d.joursRestants < 0);
  const executees = decisions.filter((d) => d.etat === "exécutée");

  const base = onglet === "ouvertes" ? ouvertes : onglet === "retard" ? enRetard : decisions;
  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return base.filter((d) =>
      (!n || normaliser(`${d.titre} ${d.texte} ${d.charge} ${d.code}`).includes(n)) &&
      (!origine || d.origine === origine));
  }, [base, q, origine]);

  async function marquerExecutee(d: Decision) {
    const ok = await ui.confirmer({
      titre: `Marquer ${d.code} comme exécutée ?`,
      texte: "Le passage est à sens unique : une décision exécutée ne revient pas en arrière. Si l'exécution se révèle incomplète, il faudra inscrire une nouvelle décision.",
      bouton: "Marquer exécutée", ton: "info",
    });
    if (!ok) return;
    poserDecisions((l) => l.map((x) => x.code === d.code ? { ...x, etat: "exécutée" } : x));
    ui.message(`${d.code} marquée exécutée.`, "bon");
  }

  async function remplacer(d: Decision) {
    const ok = await ui.confirmer({
      titre: `Remplacer ${d.code} par une nouvelle décision ?`,
      texte: "L'ancienne décision ne disparaît pas : elle passe en « remplacée » et reste lisible, avec le renvoi vers celle qui la remplace. C'est ce qui permet de reconstituer plus tard l'enchaînement des décisions.",
      bouton: "Inscrire une décision de remplacement", ton: "vigilance",
    });
    if (!ok) return;
    poserDecisions((l) => l.map((x) => x.code === d.code ? { ...x, etat: "remplacée", remplacePar: "DEC/2026/0153" } : x));
    ui.message(`${d.code} remplacée par DEC/2026/0153.`, "bon");
  }

  function detail(d: Decision) {
    ui.ouvrirTiroir({
      titre: d.titre,
      sous: <><span className="font-mono">{d.code}</span> · prise le {d.prise}</>,
      onglets: [
        { nom: "Texte", contenu: (
          <>
            <blockquote className="p-4 rounded-[4px] bg-surface-2 border-l-[3px] border-accent text-[13.5px] leading-[20px] mb-4">
              {d.texte}
            </blockquote>
            <Definitions lignes={[
              ["Référence", <span className="font-mono">{d.code}</span>],
              ["Prise le", d.prise],
              ["Origine", d.origine],
              ["Dossier rattaché", d.dossier === "—" ? "aucun" : <span className="font-mono">{d.dossier}</span>],
              ["Chargé d'exécution", <b>{d.charge}</b>],
              ["Échéance", <span className={d.joursRestants < 0 && d.etat !== "exécutée" ? "text-critique font-semibold" : ""}>
                {d.echeance}
                {d.etat !== "exécutée" && d.etat !== "remplacée" &&
                  (d.joursRestants < 0 ? ` — ${-d.joursRestants} j de retard` : ` — dans ${d.joursRestants} j`)}
              </span>],
              ["État", <Jeton ton={TON[d.etat]} enfants={d.etat} />],
              ["Confidentialité", d.confidentiel ? "restreinte" : "ouverte"],
              ...(d.remplacePar ? [["Remplacée par", <span className="font-mono">{d.remplacePar}</span>] as [string, React.ReactNode]] : []),
            ]} />
            <p className="text-[12px] text-encre-3 mt-4">
              Le texte est figé depuis son inscription. Il ne se corrige pas, même pour une faute :
              une décision du registre fait foi telle qu'elle a été prise.
            </p>
          </>
        )},
        { nom: "Suivi", contenu: (
          <ListeEchelonnee>
            {[
              { quoi: `Inscrite au registre sous ${d.code}`, qui: `Origine : ${d.origine.toLowerCase()}`, quand: d.prise, ton: "bon" as const },
              { quoi: `Confiée à ${d.charge}`, qui: `Échéance au ${d.echeance}`, quand: d.prise, ton: "bon" as const },
              ...(d.etat === "en cours" ? [{ quoi: "Exécution engagée", qui: d.charge, quand: "en cours", ton: "bon" as const }] : []),
              ...(d.joursRestants < 0 && d.etat !== "exécutée" && d.etat !== "remplacée"
                ? [{ quoi: `Échéance dépassée de ${-d.joursRestants} jours`, qui: "Rappel automatique au chargé puis à son chef", quand: d.echeance, ton: "critique" as const }] : []),
              ...(d.etat === "exécutée" ? [{ quoi: "Exécutée", qui: d.charge, quand: "récemment", ton: "bon" as const }] : []),
              ...(d.etat === "remplacée" ? [{ quoi: `Remplacée par ${d.remplacePar}`, qui: "L'ancienne reste lisible", quand: "récemment", ton: "neutre" as const }] : []),
            ].map((e, i) => (
              <div key={i} className="flex items-start gap-3 py-[9px] border-b border-bordure last:border-0">
                <Pastille ton={e.ton} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px]">{e.quoi}</span>
                  <span className="block text-[11px] text-encre-3 mt-[2px]">{e.qui} · {e.quand}</span>
                </span>
              </div>
            ))}
          </ListeEchelonnee>
        )},
      ],
      pied: d.etat === "à exécuter" || d.etat === "en cours" ? (
        <>
          <Bouton icone="check" onClick={() => { ui.fermerTiroir(); marquerExecutee(d); }} enfants="Marquer exécutée" />
          <Bouton className="ml-auto" icone="rafraichir" onClick={() => { ui.fermerTiroir(); remplacer(d); }} enfants="Remplacer" />
        </>
      ) : undefined,
    });
  }

  const colonnes: Colonne<Decision>[] = [
    { cle: "code", nom: "Référence", triable: true, fixe: true, rendu: (d) => (
      <span className="flex items-center gap-[9px] min-w-0">
        <Pastille ton={d.joursRestants < 0 && (d.etat === "à exécuter" || d.etat === "en cours") ? "critique" : TON[d.etat] === "accent" ? "bon" : TON[d.etat]} />
        <span className="font-mono text-[12px] font-semibold">{d.code}</span>
      </span>
    )},
    { cle: "titre", nom: "Décision", triable: true, rendu: (d) => (
      <span className="flex flex-col min-w-0">
        <span className="font-medium truncate">{d.titre}</span>
        <span className="text-[11px] text-encre-3 truncate">{d.texte}</span>
      </span>
    )},
    { cle: "origine", nom: "Origine", triable: true, rendu: (d) => <Jeton ton="neutre" point={false} enfants={d.origine} /> },
    { cle: "dossier", nom: "Dossier", triable: true, rendu: (d) =>
      d.dossier === "—" ? <span className="text-encre-4">—</span> : <span className="font-mono text-[12px]">{d.dossier}</span> },
    { cle: "charge", nom: "Chargé d'exécution", triable: true, rendu: (d) => d.charge },
    { cle: "echeance", nom: "Échéance", num: true, triable: true, valeur: (d) => d.joursRestants, rendu: (d) =>
      d.etat === "exécutée" || d.etat === "remplacée"
        ? <span className="text-encre-4">—</span>
        : <span className={cx("tab-num", d.joursRestants < 0 ? "text-critique font-semibold" : d.joursRestants <= 5 ? "text-vigilance" : "")}>
            {d.joursRestants < 0 ? `${-d.joursRestants} j de retard` : `dans ${d.joursRestants} j`}
          </span> },
    { cle: "etat", nom: "État", triable: true, rendu: (d) => <Jeton ton={TON[d.etat]} enfants={d.etat} /> },
  ];

  return (
    <>
      <Entete
        titre="Registre des décisions"
        sous="Numérotées, figées, confiées à quelqu'un avec une échéance, et suivies jusqu'à leur exécution."
        actions={
          <>
            <Bouton icone="telecharger" onClick={() => { exporterCSV("registre-decisions", filtres); ui.message("Registre exporté.", "bon"); }} enfants="Exporter le registre" />
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Inscription au registre à brancher.", "info")} enfants="Inscrire une décision" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Au registre" valeur={<NombreAnime valeur={decisions.length} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Ouvertes" valeur={<NombreAnime valeur={ouvertes.length} />} ton="accent" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En retard" valeur={<NombreAnime valeur={enRetard.length} />} ton={enRetard.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Exécutées" valeur={<NombreAnime valeur={executees.length} />} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Délai moyen d'exécution" valeur="18 jours" />} />
      </div>

      {enRetard.length > 0 && (
        <Apparition className="mb-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-[4px] bg-critique-voile border border-critique/40">
            <Icone nom="balance" className="text-critique mt-[2px]" />
            <div className="flex-1 min-w-0 text-[13px]">
              <b>{enRetard.length} décisions ont dépassé leur échéance.</b>{" "}
              <span className="text-encre-2">
                Une décision en retard n'est pas une tâche en retard : elle a été prise en séance ou par
                arbitrage, et quelqu'un attend son effet. Le rappel part au chargé d'exécution, puis à son
                chef — c'est le seul endroit de l'outil où l'escalade est automatique.
              </span>
            </div>
            <Bouton taille="s" onClick={() => poserOnglet("retard")} enfants="Les voir" />
          </div>
        </Apparition>
      )}

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "ouvertes", nom: "Ouvertes", compte: ouvertes.length },
              { cle: "retard", nom: "En retard", compte: enRetard.length },
              { cle: "tout", nom: "Tout le registre", compte: decisions.length },
            ]}
          />

          <TableauDonnees
            lignes={filtres} colonnes={colonnes} cle={(d) => d.code}
            totalBrut={decisions.length} nomEntite={["décision", "décisions"]}
            triInitial={{ cle: "echeance", sens: "asc" }}
            surLigne={detail}
            vide={{ titre: "Registre vide", texte: "Aucune décision ne correspond à cette vue." }}
            barreOutils={
              <>
                <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                  <Icone nom="recherche" taille="s" />
                  <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                    placeholder="Titre, texte, chargé, référence…" aria-label="Rechercher une décision"
                    className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
                </div>
                <select value={origine} onChange={(e) => poserOrigine(e.target.value)} aria-label="Filtrer par origine"
                  className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                  <option value="">Toutes les origines</option>
                  {["Registre", "Arbitrage", "Séance", "Tableau de bord"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </>
            }
            actionsLigne={(d) => (
              <>
                <Bouton ton="fantome" taille="s" icone="oeil" title="Ouvrir" onClick={() => detail(d)} />
                {(d.etat === "à exécuter" || d.etat === "en cours") && (
                  <Bouton ton="fantome" taille="s" icone="check" title="Marquer exécutée" onClick={() => marquerExecutee(d)} />
                )}
              </>
            )}
          />
        </>
      } />

      <Apparition delai={120}>
        <Carte className="mt-4" enfants={
          <>
            <TeteCarte titre="Les quatre portes d'entrée du registre" sous="Une décision ne naît jamais de nulle part" />
            <div className="pas-carte pt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
              {[
                ["Directement", "Inscrite au registre par celui qui décide, sans dossier préalable.", "rapport"],
                ["Par arbitrage", "Une question posée par un responsable, tranchée par la direction.", "balance"],
                ["Par une séance", "Les décisions de séance entrent au registre à la validation du compte rendu.", "utilisateurs"],
                ["Depuis le tableau de bord", "Une décision attendue sur un dossier, tranchée sur place.", "grille"],
              ].map(([titre, texte, icone]) => (
                <div key={titre} className="p-3 rounded-[4px] border border-bordure bg-surface-2">
                  <div className="flex items-center gap-2 mb-[6px]">
                    <Icone nom={icone as "rapport"} taille="s" className="text-accent" />
                    <span className="text-[13px] font-semibold">{titre}</span>
                  </div>
                  <p className="text-[12px] text-encre-3">{texte}</p>
                </div>
              ))}
            </div>
            <p className="text-[12.5px] text-encre-2 pas-carte pt-0 leading-[19px]">
              Quelle que soit la porte, l'objet produit est le même : un texte figé, numéroté, confié et
              daté. C'est ce qui permet de dire, six mois plus tard, que la chose a bien été décidée —
              et pas seulement évoquée.
            </p>
          </>
        } />
      </Apparition>
    </>
  );
}
