import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Interrupteur, Jeton, LigneStat, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, fmt, normaliser } from "../lib/format";
import { gardeFous as gardeFousInitiaux, type GardeFou } from "../lib/controles";

const FAMILLES: Record<GardeFou["famille"], { nom: string; quoi: string; icone: "horloge" | "verrou" | "monnaie" | "utilisateurs" | "branche" | "bouclier" | "tache" }> = {
  fenêtre: { nom: "Fenêtre", quoi: "Le geste n'est pas permis à ce moment-là.", icone: "horloge" },
  gel: { nom: "Gel", quoi: "Tout un pan de l'outil passe en lecture seule.", icone: "verrou" },
  plafond: { nom: "Plafond", quoi: "Au-delà d'un volume, le geste s'étale ou s'arrête.", icone: "monnaie" },
  séparation: { nom: "Séparation", quoi: "Deux rôles ne peuvent pas être tenus par la même personne.", icone: "utilisateurs" },
  dépendance: { nom: "Dépendance", quoi: "Le geste exige qu'autre chose existe d'abord.", icone: "branche" },
  liste: { nom: "Liste", quoi: "Seul ce qui est nommé répond ; le reste est muet.", icone: "bouclier" },
  forme: { nom: "Forme", quoi: "Le geste mal formé est refusé à l'entrée.", icone: "tache" },
};

/* Garde-fous : ce qui refuse le geste avant qu'il soit demandé.

   Un contrôle demande une main ; un garde-fou ne demande rien, il dit non.
   C'est la différence entre un outil qui protège et un outil qui fait signer
   deux cents approbations par semaine jusqu'à ce qu'on les signe sans lire.

   Chaque règle désactivée est un trou visible : l'écran les met en tête et ne
   les range pas tant qu'elles n'ont pas été remises. */
export function GardeFous() {
  const ui = useUI();
  const [regles, poserRegles] = useState<GardeFou[]>(gardeFousInitiaux);
  const [q, poserQ] = useState("");
  const [famille, poserFamille] = useState("");
  const [eteintesSeules, poserEteintesSeules] = useState(false);

  const eteintes = regles.filter((r) => !r.actif);
  const blocages = regles.reduce((s, r) => s + r.blocages30j, 0);
  const sansDerogation = regles.filter((r) => r.derogation.startsWith("Aucune")).length;

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return regles.filter((r) =>
      (!n || normaliser(`${r.id} ${r.nom} ${r.regle} ${r.portee}`).includes(n)) &&
      (!famille || r.famille === famille) &&
      (!eteintesSeules || !r.actif));
  }, [regles, q, famille, eteintesSeules]);

  async function basculer(r: GardeFou, vers: boolean) {
    if (!vers) {
      const ok = await ui.confirmer({
        titre: `Éteindre « ${r.nom} » ?`,
        texte: `${r.regle} Une fois la règle éteinte, le geste qu'elle refusait devient possible, et plus rien `
          + `ne s'y oppose avant le contrôle ordinaire. La règle restera affichée en tête de cette page `
          + `tant qu'elle sera éteinte, et un rappel partira chaque semaine.`,
        bouton: "Éteindre la règle", ton: "danger", mot: "ETEINDRE",
      });
      if (!ok) return;
    }
    poserRegles((l) => l.map((x) => x.id === r.id ? { ...x, actif: vers } : x));
    ui.message(vers ? `« ${r.nom} » remise en service.` : `« ${r.nom} » éteinte — un trou de plus dans la garde.`,
      vers ? "bon" : "critique",
      { annuler: () => poserRegles((l) => l.map((x) => x.id === r.id ? { ...x, actif: !vers } : x)) });
  }

  function detail(r: GardeFou) {
    ui.ouvrirTiroir({
      titre: r.nom,
      sous: <><span className="font-mono">{r.id}</span> · {FAMILLES[r.famille].nom}</>,
      onglets: [
        { nom: "La règle", contenu: (
          <>
            <div className={cx("flex items-start gap-[9px] px-3 py-[10px] rounded-[4px] mb-4 border",
              r.actif ? "bg-bon-voile border-bon/40" : "bg-critique-voile border-critique/40")}>
              <Icone nom={r.actif ? "bouclier" : "halte"} taille="s"
                className={cx("mt-[1px]", r.actif ? "text-bon" : "text-critique")} />
              <p className="text-[12.5px] text-encre-2">
                {r.actif ? "La règle est en service : elle refuse le geste sans rien demander."
                  : "La règle est éteinte : le geste qu'elle refusait est redevenu possible."}
              </p>
            </div>
            <Definitions lignes={[
              ["Ce qu'elle refuse", <span className="text-[12.5px]">{r.regle}</span>],
              ["Famille", <Jeton ton="neutre" point={false} enfants={FAMILLES[r.famille].nom} />],
              ["Portée", r.portee],
              ["Dérogation possible", r.derogation.startsWith("Aucune")
                ? <Jeton ton="bon" enfants="aucune" />
                : <span className="text-[12.5px] text-vigilance">{r.derogation}</span>],
              ["Blocages (30 j)", fmt(r.blocages30j)],
              ["Dernier blocage", r.dernier],
            ]} />
            <p className="text-[12px] text-encre-3 mt-4 leading-[18px]">
              Un garde-fou qui ne bloque jamais rien n'est pas forcément inutile : il peut tenir le geste à
              distance par sa seule existence. Mais un garde-fou qui bloque tous les jours désigne un
              désaccord entre la règle et le travail réel, et c'est la règle qu'il faut alors reprendre — pas
              éteindre.
            </p>
          </>
        )},
      ],
      pied: r.actif
        ? <Bouton ton="danger" icone="halte" onClick={() => { ui.fermerTiroir(); basculer(r, false); }} enfants="Éteindre la règle" />
        : <Bouton ton="principal" icone="bouclier" onClick={() => { ui.fermerTiroir(); basculer(r, true); }} enfants="Remettre en service" />,
    });
  }

  const colonnes: Colonne<GardeFou>[] = [
    { cle: "nom", nom: "Règle", triable: true, fixe: true, rendu: (r) => (
      <div className="flex items-start gap-[9px] min-w-0">
        <Icone nom={r.actif ? FAMILLES[r.famille].icone : "halte"} taille="s"
          className={cx("mt-[3px] shrink-0", r.actif ? "text-encre-4" : "text-critique")} />
        <span className="flex flex-col min-w-0">
          <span className="font-medium truncate">{r.nom}</span>
          <span className="font-mono text-[11px] text-encre-3">{r.id} · {r.portee}</span>
        </span>
      </div>
    )},
    { cle: "regle", nom: "Ce qu'elle refuse", rendu: (r) =>
      <span className="text-[12.5px] text-encre-2 line-clamp-2">{r.regle}</span> },
    { cle: "famille", nom: "Famille", triable: true, rendu: (r) =>
      <Jeton ton="neutre" point={false} enfants={FAMILLES[r.famille].nom} /> },
    { cle: "derogation", nom: "Dérogation", triable: true, rendu: (r) =>
      r.derogation.startsWith("Aucune") ? <Jeton ton="bon" enfants="aucune" />
        : <span className="text-[12px] text-vigilance">{r.derogation}</span> },
    { cle: "blocages30j", nom: "Blocages 30 j", num: true, triable: true, rendu: (r) =>
      <span className="tab-num">{fmt(r.blocages30j)}</span> },
    { cle: "dernier", nom: "Dernier blocage", rendu: (r) =>
      <span className="text-encre-3 text-[12px] whitespace-nowrap">{r.dernier}</span> },
    { cle: "actif", nom: "En service", triable: true, rendu: (r) => (
      <Interrupteur actif={r.actif} etiquette={`Règle ${r.nom}`}
        surChangement={(v) => basculer(r, v)} />
    )},
  ];

  return (
    <>
      <Entete
        titre="Garde-fous"
        sous="Ce qui refuse le geste avant qu'il soit demandé. Un contrôle réclame une main ; un garde-fou, lui, dit non."
        actions={
          <>
            <Bouton icone="telecharger"
              onClick={() => { exporterCSV("garde-fous", regles); ui.message("Garde-fous exportés.", "bon"); }}
              enfants="Exporter" />
            {eteintes.length > 0 && (
              <Bouton ton="principal" icone="bouclier" onClick={() => poserEteintesSeules(true)}
                enfants={`${eteintes.length} règle${eteintes.length > 1 ? "s" : ""} éteinte${eteintes.length > 1 ? "s" : ""}`} />
            )}
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Règles en service" valeur={`${regles.length - eteintes.length} / ${regles.length}`} ton={eteintes.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Règles éteintes" valeur={fmt(eteintes.length)} ton={eteintes.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sans dérogation possible" valeur={fmt(sansDerogation)} ton="accent" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Blocages (30 j)" valeur={fmt(blocages)} />} />
      </div>

      {eteintes.length > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-critique-voile border border-critique/40 anim-apparait">
          <Icone nom="halte" className="text-critique mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,260px)] text-[13px]">
            <b>{eteintes.length} garde-fou{eteintes.length > 1 ? "s sont éteints" : " est éteint"}.</b>{" "}
            <span className="text-encre-2">
              {eteintes.map((r) => `« ${r.nom} »`).join(", ")} — {eteintes[0].regle.toLowerCase()}{" "}
              Une règle éteinte ne se range pas dans la liste : elle reste ici, en tête, et un rappel part
              chaque semaine tant qu'elle n'est pas remise.
            </span>
          </div>
          <Bouton taille="s" ton="principal" onClick={() => eteintes.forEach((r) => basculer(r, true))}
            enfants="Tout remettre" />
        </div>
      )}

      <Carte className="mb-4" enfants={
        <>
          <TeteCarte titre="Les sept familles" sous="Sept manières de dire non, et ce que chacune refuse" />
          <div className="pas-carte pt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {(Object.keys(FAMILLES) as Array<GardeFou["famille"]>).map((f) => {
              const nb = regles.filter((r) => r.famille === f).length;
              const off = regles.filter((r) => r.famille === f && !r.actif).length;
              return (
                <button key={f} type="button" onClick={() => poserFamille(famille === f ? "" : f)}
                  className={cx("p-3 rounded-[4px] border text-left transi",
                    famille === f ? "border-accent bg-accent-voile"
                      : off ? "border-critique/40 bg-surface-2 hover:border-critique"
                        : "border-bordure bg-surface-2 hover:border-bordure-2")}>
                  <div className="flex items-center gap-2">
                    <Icone nom={FAMILLES[f].icone} taille="s" className="text-encre-3" />
                    <span className="text-[12.5px] font-semibold">{FAMILLES[f].nom}</span>
                    <span className={cx("ml-auto text-[11px] tab-num", off ? "text-critique" : "text-encre-3")}>
                      {off ? `${nb - off}/${nb}` : nb}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-encre-3 mt-[6px] leading-[16px]">{FAMILLES[f].quoi}</p>
                </button>
              );
            })}
          </div>
        </>
      } />

      <Carte enfants={
        <TableauDonnees
          lignes={filtres} colonnes={colonnes} cle={(r) => r.id}
          totalBrut={regles.length} nomEntite={["garde-fou", "garde-fous"]}
          triInitial={{ cle: "blocages30j", sens: "desc" }}
          surLigne={detail}
          vide={{
            titre: "Aucun garde-fou", texte: "Aucune règle ne correspond à ces filtres.",
            actions: <Bouton onClick={() => { poserQ(""); poserFamille(""); poserEteintesSeules(false); }} enfants="Réinitialiser les filtres" />,
          }}
          barreOutils={
            <>
              <div className="flex items-center gap-2 h-8 px-[10px] min-w-[220px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                <Icone nom="recherche" taille="s" />
                <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                  placeholder="Règle, portée…" aria-label="Rechercher un garde-fou"
                  className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
              </div>
              <select value={famille} onChange={(e) => poserFamille(e.target.value)} aria-label="Filtrer par famille"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Toutes les familles</option>
                {(Object.keys(FAMILLES) as Array<GardeFou["famille"]>).map((f) => <option key={f} value={f}>{FAMILLES[f].nom}</option>)}
              </select>
              <Bouton actif={eteintesSeules} icone="halte"
                onClick={() => poserEteintesSeules((v) => !v)} enfants="Éteintes seulement" />
            </>
          }
          actionsLigne={(r) => (
            <Bouton ton="fantome" taille="s" icone="oeil" title="Détail" onClick={() => detail(r)} />
          )}
        />
      } />
    </>
  );
}
