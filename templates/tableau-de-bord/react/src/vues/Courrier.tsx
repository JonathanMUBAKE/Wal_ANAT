import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille } from "../composants/Primitives";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { Icone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { LigneAssistant } from "../composants/AssistantIA";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, normaliser } from "../lib/format";
import { courriers as courriersInitiaux, type Courrier as TypeCourrier, type EtatCourrier } from "../lib/institution";
import { AGENTS_NOMS, DIRECTIONS } from "../lib/sigrh";

const TON: Record<EtatCourrier, "neutre" | "accent" | "vigilance" | "bon" | "critique"> = {
  "enregistré": "vigilance", "imputé": "accent", "en traitement": "accent",
  "traité": "bon", "classé sans suite": "neutre",
};

/* Courrier : enregistré une fois au bureau d'ordre, puis vu partout — mais
   dans un état qui est propre à chacun. Le même courrier est « à imputer »
   pour le secrétariat, « à traiter » pour l'agent chargé, « pour information »
   pour celui qui est en copie. Un seul objet, plusieurs vérités : c'est ce
   qui évite les quatre registres parallèles qu'on finit sinon par tenir. */
export function Courrier() {
  const ui = useUI();
  const [courriers, poserCourriers] = useState<TypeCourrier[]>(courriersInitiaux);
  const [onglet, poserOnglet] = useState("mon");
  const [q, poserQ] = useState("");
  const [sens, poserSens] = useState("");
  const [etat, poserEtat] = useState("");

  const aImputer = courriers.filter((c) => c.etat === "enregistré");
  const aMoi = courriers.filter((c) => c.monEtat === "à traiter" || c.monEtat === "pour avis");
  const enRetard = courriers.filter((c) => c.joursRestants < 0 && c.etat !== "traité" && c.etat !== "classé sans suite");
  const traitesCeMois = courriers.filter((c) => c.etat === "traité");

  const base = useMemo(() => {
    if (onglet === "mon") return courriers.filter((c) => c.monEtat !== "rien à faire");
    if (onglet === "imputer") return aImputer;
    if (onglet === "retard") return enRetard;
    return courriers;
  }, [courriers, onglet, aImputer, enRetard]);

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return base.filter((c) =>
      (!n || normaliser(`${c.objet} ${c.correspondant} ${c.code} ${c.charge}`).includes(n)) &&
      (!sens || c.sens === sens) && (!etat || c.etat === etat));
  }, [base, q, sens, etat]);

  async function imputer(c: TypeCourrier) {
    const ok = await ui.confirmer({
      titre: `Imputer « ${c.objet.slice(0, 50)}… » ?`,
      texte: "Le courrier sera confié à une entité avec une instruction et un délai. Le chef d'entité pourra ensuite l'imputer en cascade à un agent. Les personnes en copie le verront « pour information » sans en être chargées.",
      bouton: "Imputer", ton: "info",
    });
    if (!ok) return;
    poserCourriers((l) => l.map((x) => x.code === c.code
      ? { ...x, etat: "imputé", charge: AGENTS_NOMS[0], entite: DIRECTIONS[1], monEtat: "rien à faire",
          instruction: "Pour traitement et réponse sous huitaine" }
      : x));
    ui.message(`${c.code} imputé. Le chargé et les copies sont prévenus.`, "bon");
  }

  async function classer(c: TypeCourrier) {
    const ok = await ui.confirmer({
      titre: `Classer « ${c.code} » sans suite ?`,
      texte: "Le courrier sort des files d'attente sans réponse. Le motif reste lisible dans le fil : c'est lui qu'on relira si quelqu'un redemande ce qu'il est devenu.",
      bouton: "Classer sans suite", ton: "vigilance",
    });
    if (!ok) return;
    poserCourriers((l) => l.map((x) => x.code === c.code ? { ...x, etat: "classé sans suite", monEtat: "rien à faire" } : x));
    ui.message(`${c.code} classé sans suite.`, "bon");
  }

  function detail(c: TypeCourrier) {
    ui.ouvrirTiroir({
      titre: c.objet,
      sous: <><span className="font-mono">{c.code}</span> · {c.correspondant}</>,
      onglets: [
        { nom: "Fiche", contenu: (
          <>
            <Definitions lignes={[
              ["Sens", c.sens], ["Correspondant", c.correspondant],
              ["Enregistré", c.recuLe],
              ["État", <Jeton ton={TON[c.etat]} enfants={c.etat} />],
              ["Pour vous", <Jeton ton={c.monEtat === "rien à faire" ? "neutre" : "accent"} enfants={c.monEtat} />],
              ["Entité", c.entite], ["Chargé", c.charge],
              ["Échéance", <span className={c.joursRestants < 0 ? "text-critique font-semibold" : ""}>
                {c.echeance}{c.joursRestants < 0 ? ` — ${-c.joursRestants} j de retard` : ` — dans ${c.joursRestants} j`}
              </span>],
              ["Pièce", <span className="font-mono">{c.piece}</span>],
              ["Confidentialité", c.confidentiel ? "restreinte" : "ouverte à l'entité"],
            ]} />
            {c.instruction && (
              <div className="mt-4 p-3 rounded-[4px] bg-surface-2 border border-bordure">
                <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-1">Instruction</div>
                <p className="text-[13px]">{c.instruction}</p>
              </div>
            )}
            {c.annotation && (
              <div className="mt-3 p-3 rounded-[4px] bg-accent-voile border border-accent/30">
                <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-accent mb-1">Annotation de la direction</div>
                <p className="text-[13px] text-encre-2">{c.annotation}</p>
              </div>
            )}
            {c.copies.length > 0 && (
              <p className="text-[12px] text-encre-3 mt-3">
                En copie : {c.copies.join(", ")}. Ils voient le courrier sans en être chargés.
              </p>
            )}
          </>
        )},
        { nom: "Le fil", contenu: (
          <ListeEchelonnee>
            {[
              { quand: c.recuLe, qui: "Bureau d'ordre", quoi: `Enregistré sous ${c.code}`, ton: "neutre" as const },
              ...(c.etat !== "enregistré" ? [{ quand: c.recuLe, qui: "Direction", quoi: `Imputé à ${c.entite}${c.instruction ? ` — « ${c.instruction} »` : ""}`, ton: "accent" as const }] : []),
              ...(c.charge !== "—" ? [{ quand: c.recuLe, qui: `Chef de ${c.entite}`, quoi: `Imputé en cascade à ${c.charge}`, ton: "accent" as const }] : []),
              ...(c.annotation ? [{ quand: c.recuLe, qui: "Direction", quoi: `Annotation : « ${c.annotation} »`, ton: "accent" as const }] : []),
              ...(c.etat === "en traitement" ? [{ quand: "en cours", qui: c.charge, quoi: "Pris en charge", ton: "accent" as const }] : []),
              ...(c.etat === "traité" ? [{ quand: "récemment", qui: c.charge, quoi: "Traité et clos", ton: "bon" as const }] : []),
              ...(c.etat === "classé sans suite" ? [{ quand: "récemment", qui: "Direction", quoi: "Classé sans suite", ton: "neutre" as const }] : []),
            ].map((e, i) => (
              <div key={i} className="flex items-start gap-3 py-[9px] border-b border-bordure last:border-0">
                <Pastille ton={e.ton === "accent" ? "bon" : e.ton} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px]">{e.quoi}</span>
                  <span className="block text-[11px] text-encre-3 mt-[2px]">{e.qui} · {e.quand}</span>
                </span>
              </div>
            ))}
          </ListeEchelonnee>
        )},
      ],
      pied: (
        <>
          {c.etat === "enregistré" && <Bouton ton="principal" icone="escalade" onClick={() => { ui.fermerTiroir(); imputer(c); }} enfants="Imputer" />}
          {c.etat !== "traité" && c.etat !== "classé sans suite" && (
            <Bouton className="ml-auto" icone="croix" onClick={() => { ui.fermerTiroir(); classer(c); }} enfants="Classer sans suite" />
          )}
        </>
      ),
    });
  }

  const colonnes: Colonne<TypeCourrier>[] = [
    { cle: "code", nom: "Référence", triable: true, fixe: true, rendu: (c) => (
      <div className="flex items-center gap-[9px] min-w-0">
        <Icone nom={c.sens === "Entrant" ? "tendanceBas" : "tendanceHaut"} taille="s"
          className={c.sens === "Entrant" ? "text-serie-3" : "text-serie-1"} />
        <span className="flex flex-col min-w-0">
          <span className="font-mono text-[12px] font-semibold">{c.code}</span>
          <span className="text-[11px] text-encre-3 truncate">{c.correspondant}</span>
        </span>
      </div>
    )},
    { cle: "objet", nom: "Objet", triable: true, rendu: (c) => (
      <span className="flex flex-col min-w-0">
        <span className="truncate">{c.objet}</span>
        {c.etiquettes.length > 0 && (
          <span className="flex gap-[4px] mt-[3px]">
            {c.etiquettes.map((e) => (
              <span key={e} className="text-[10px] px-[5px] py-[1px] rounded-[3px] bg-surface-3 text-encre-3">{e}</span>
            ))}
          </span>
        )}
      </span>
    )},
    { cle: "monEtat", nom: "Pour vous", triable: true, rendu: (c) => (
      <Jeton ton={c.monEtat === "à imputer" ? "vigilance" : c.monEtat === "à traiter" ? "accent"
        : c.monEtat === "pour avis" ? "accent" : "neutre"} enfants={c.monEtat} />
    )},
    { cle: "etat", nom: "État du courrier", triable: true, rendu: (c) => <Jeton ton={TON[c.etat]} enfants={c.etat} /> },
    { cle: "entite", nom: "Entité", triable: true, rendu: (c) => <span className="text-encre-2">{c.entite}</span> },
    { cle: "charge", nom: "Chargé", triable: true, rendu: (c) => c.charge },
    { cle: "echeance", nom: "Échéance", num: true, triable: true, valeur: (c) => c.joursRestants, rendu: (c) =>
      c.etat === "traité" || c.etat === "classé sans suite"
        ? <span className="text-encre-4">—</span>
        : <span className={cx("tab-num", c.joursRestants < 0 ? "text-critique font-semibold" : c.joursRestants <= 2 ? "text-vigilance" : "")}>
            {c.joursRestants < 0 ? `${-c.joursRestants} j de retard` : `dans ${c.joursRestants} j`}
          </span> },
  ];

  return (
    <>
      <Entete
        titre="Courrier"
        sous="Du bureau d'ordre à la réponse. Enregistré une fois, vu partout — dans un état propre à chacun."
        actions={
          <>
            <Bouton icone="telecharger" onClick={() => { exporterCSV("courrier", filtres.map(({ copies, etiquettes, ...r }) => ({ ...r, copies: copies.join(" "), etiquettes: etiquettes.join(" ") }))); ui.message("Registre exporté.", "bon"); }} enfants="Exporter" />
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Enregistrement au bureau d'ordre à brancher.", "info")} enfants="Enregistrer" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="À imputer" valeur={<NombreAnime valeur={aImputer.length} />} ton={aImputer.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Qui m'attend" valeur={<NombreAnime valeur={aMoi.length} />} ton={aMoi.length ? "accent" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En retard" valeur={<NombreAnime valeur={enRetard.length} />} ton={enRetard.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Traités ce mois" valeur={<NombreAnime valeur={traitesCeMois.length} />} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Au registre" valeur={<NombreAnime valeur={courriers.length} />} />} />
      </div>

      {enRetard.length > 0 && (
        <Apparition className="mb-4">
          <LigneAssistant
            texte={
              <>
                <b className="text-encre">Les retards se concentrent.</b> Sur {enRetard.length} courriers
                hors délai, la plupart sont imputés aux mêmes entités — et plusieurs portent l'instruction
                « me rendre compte avant toute réponse », qui ajoute une attente que le délai ne prévoit pas.
                Le délai ne commence pas à la bonne date : il court depuis l'enregistrement, pas depuis
                l'imputation en cascade.
              </>
            }
            action={<Bouton taille="s" onClick={() => poserOnglet("retard")} enfants="Voir les retards" />}
          />
        </Apparition>
      )}

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "mon", nom: "Mon courrier", compte: courriers.filter((c) => c.monEtat !== "rien à faire").length },
              { cle: "imputer", nom: "À imputer", compte: aImputer.length },
              { cle: "retard", nom: "En retard", compte: enRetard.length },
              { cle: "registre", nom: "Registre", compte: courriers.length },
            ]}
          />

          <TableauDonnees
            lignes={filtres} colonnes={colonnes} cle={(c) => c.code}
            totalBrut={courriers.length} nomEntite={["courrier", "courriers"]}
            triInitial={{ cle: "echeance", sens: "asc" }}
            surLigne={detail}
            vide={{ titre: "Rien à traiter", texte: "Aucun courrier ne correspond à cette vue." }}
            barreOutils={
              <>
                <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                  <Icone nom="recherche" taille="s" />
                  <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                    placeholder="Objet, correspondant, référence…" aria-label="Rechercher un courrier"
                    className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
                </div>
                <select value={sens} onChange={(e) => poserSens(e.target.value)} aria-label="Filtrer par sens"
                  className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                  <option value="">Entrant et sortant</option>
                  <option>Entrant</option><option>Sortant</option>
                </select>
                <select value={etat} onChange={(e) => poserEtat(e.target.value)} aria-label="Filtrer par état"
                  className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                  <option value="">Tous les états</option>
                  {["enregistré", "imputé", "en traitement", "traité", "classé sans suite"].map((e) => <option key={e}>{e}</option>)}
                </select>
              </>
            }
            actionsLigne={(c) => (
              <>
                <Bouton ton="fantome" taille="s" icone="oeil" title="Ouvrir" onClick={() => detail(c)} />
                {c.etat === "enregistré" && (
                  <Bouton ton="fantome" taille="s" icone="escalade" title="Imputer" onClick={() => imputer(c)} />
                )}
              </>
            )}
            actionsLot={(ids, vider) => (
              <>
                <Bouton taille="s" icone="escalade" onClick={async () => {
                  const ok = await ui.confirmer({
                    titre: `Imputer ${ids.length} courriers à la même entité ?`,
                    texte: "La même instruction et le même délai seront appliqués à tous. Les courriers confidentiels sont écartés de l'imputation groupée.",
                    bouton: "Imputer", ton: "info",
                  });
                  if (!ok) return;
                  poserCourriers((l) => l.map((c) => ids.includes(c.code) && !c.confidentiel
                    ? { ...c, etat: "imputé", monEtat: "rien à faire" } : c));
                  vider(); ui.message(`${ids.length} courriers imputés.`, "bon");
                }} enfants="Imputer" />
                <Bouton taille="s" icone="telecharger" onClick={() => {
                  exporterCSV("courrier-selection", courriers.filter((c) => ids.includes(c.code)).map(({ copies, etiquettes, ...r }) => r));
                  ui.message(`${ids.length} courriers exportés.`, "bon");
                }} enfants="Exporter" />
              </>
            )}
          />
        </>
      } />
    </>
  );
}
