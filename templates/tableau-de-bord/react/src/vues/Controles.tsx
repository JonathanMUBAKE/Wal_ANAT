import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { CarteGraphique, Graphique, optionsCommunes } from "../composants/Graphique";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { ListeEchelonnee } from "../composants/Mouvement";
import { cx, exporterCSV, fmt, jeton, normaliser } from "../lib/format";
import {
  conforme, ecartAssume, gestes as gestesInitiaux, manque, NIVEAUX, PLANCHER,
  repartitionNiveaux, type Geste, type NiveauControle,
} from "../lib/controles";
import type { ChartConfiguration } from "chart.js";

const TON_EFFET = {
  lecture: "neutre", écriture: "accent", configuration: "accent",
  envoi: "vigilance", exécution: "vigilance", destruction: "critique",
} as const;

/* Registre des contrôles : la liste de tout ce que l'outil permet, et du prix
   à payer pour chaque geste. C'est la page qui répond à « qu'est-ce qui peut
   arriver ici, et qui peut le déclencher ». Un geste absent de cette liste
   n'existe pas dans l'outil ; un geste présent mais sous-contrôlé est un
   défaut, et l'écran le nomme comme tel. */
export function Controles() {
  const ui = useUI();
  const [gestes, poserGestes] = useState<Geste[]>(gestesInitiaux);
  const [q, poserQ] = useState("");
  const [module, poserModule] = useState("");
  const [effet, poserEffet] = useState("");
  const [niveau, poserNiveau] = useState("");
  const [defautsSeuls, poserDefautsSeuls] = useState(false);
  const [ecartsSeuls, poserEcartsSeuls] = useState(false);

  const modules = [...new Set(gestes.map((g) => g.module))].sort((a, b) => a.localeCompare(b, "fr"));
  const enDefaut = gestes.filter((g) => !conforme(g));
  const ecarts = gestes.filter(ecartAssume);
  /* Un écart dont la date de revue est passée redevient un défaut : c'est ce
     qui empêche une dérogation « provisoire » de durer trois ans. */
  const aRevoir = ecarts.filter((g) => g.ecart && g.ecart.revoirLe.includes("2026"));

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return gestes.filter((g) =>
      (!n || normaliser(`${g.id} ${g.nom} ${g.module} ${g.note}`).includes(n)) &&
      (!module || g.module === module) &&
      (!effet || g.effet === effet) &&
      (!niveau || g.niveau === niveau) &&
      (!defautsSeuls || !conforme(g)) &&
      (!ecartsSeuls || ecartAssume(g)));
  }, [gestes, q, module, effet, niveau, defautsSeuls, ecartsSeuls]);

  const repartition = repartitionNiveaux();

  const configNiveaux = (): ChartConfiguration => ({
    type: "bar",
    data: {
      labels: repartition.map((r) => r.nom),
      datasets: [{
        label: "Gestes",
        data: repartition.map((r) => r.compte),
        backgroundColor: repartition.map((r) =>
          jeton(r.niveau === "libre" ? "--encre-4"
            : r.niveau === "confirmation" ? "--serie-1"
              : r.niveau === "mot" ? "--serie-4"
                : r.niveau === "double" ? "--serie-2"
                  : "--serie-8")),
        borderRadius: 4, borderSkipped: false, barThickness: 18,
      }],
    },
    options: {
      ...optionsCommunes(),
      indexAxis: "y" as const,
      scales: {
        x: { beginAtZero: true, grid: { color: jeton("--bordure"), drawTicks: false },
          border: { display: false },
          ticks: { color: jeton("--encre-3"), font: { size: 11 }, precision: 0, maxTicksLimit: 6 } },
        y: { grid: { display: false }, border: { color: jeton("--bordure") },
          ticks: { color: jeton("--encre-3"), font: { size: 11 } } },
      },
    } as never,
  });

  /* Relever un contrôle est lui-même un geste contrôlé (G-062) : la demande
     part dans la file d'attente, elle ne s'applique pas ici. C'est le seul
     moyen qu'un registre de contrôles ne se vide pas discrètement. */
  async function demanderRelevement(g: Geste) {
    const cible = PLANCHER[g.effet];
    const ok = await ui.confirmer({
      titre: `Demander le relèvement de « ${g.nom} » ?`,
      texte: `Le niveau passerait de « ${NIVEAUX[g.niveau].nom} » à « ${NIVEAUX[cible].nom} ». `
        + `Changer un contrôle est lui-même un geste contrôlé : la demande part dans la file d'attente, `
        + `exige un quorum de deux approbateurs, et ne prend effet que 24 heures après l'accord.`,
      bouton: "Déposer la demande", ton: "info",
    });
    if (!ok) return;
    ui.message(`Demande déposée pour ${g.id} — quorum de deux, applicable dans 24 h.`, "bon");
  }

  async function abaisser(g: Geste) {
    const ok = await ui.confirmer({
      titre: `Abaisser le contrôle de « ${g.nom} » ?`,
      texte: `Ce geste est de type « ${g.effet} » : le registre exige au minimum « ${NIVEAUX[PLANCHER[g.effet]].nom} ». `
        + `Abaisser son niveau le mettra en défaut, et le défaut s'affichera en tête de cette page tant qu'il durera.`,
      bouton: "Abaisser quand même", ton: "danger", mot: "ABAISSER",
    });
    if (!ok) return;
    const ordre: NiveauControle[] = ["libre", "confirmation", "mot", "double", "quorum", "interdit"];
    const i = ordre.indexOf(g.niveau);
    const avant = g.niveau;
    poserGestes((l) => l.map((x) => x.id === g.id ? { ...x, niveau: ordre[Math.max(0, i - 1)] } : x));
    ui.message(`${g.id} abaissé — le registre est en défaut.`, "critique", {
      annuler: () => poserGestes((l) => l.map((x) => x.id === g.id ? { ...x, niveau: avant } : x)),
    });
  }

  function detail(g: Geste) {
    const defaut = manque(g);
    ui.ouvrirTiroir({
      titre: g.nom,
      sous: <><span className="font-mono">{g.id}</span> · {g.module}</>,
      onglets: [
        { nom: "Le contrôle", contenu: (
          <>
            {defaut && (
              <div className="flex items-start gap-[9px] px-3 py-[10px] rounded-[4px] mb-4 bg-critique-voile border border-critique/40">
                <Icone nom="halte" className="text-critique mt-[1px]" taille="s" />
                <p className="text-[12.5px] text-encre-2">{defaut}</p>
              </div>
            )}
            {g.ecart && (
              <div className="px-3 py-[10px] rounded-[4px] mb-4 bg-surface-2 border border-vigilance/40">
                <div className="flex items-center gap-[7px] mb-[6px]">
                  <Icone nom="tampon" taille="s" className="text-vigilance" />
                  <span className="text-[12.5px] font-semibold">Écart assumé au plancher</span>
                  <span className="ml-auto text-[11px] text-encre-4">à revoir le {g.ecart.revoirLe}</span>
                </div>
                <p className="text-[12.5px] text-encre-2 leading-[18px]">{g.ecart.motif}</p>
                <p className="text-[11.5px] text-encre-4 mt-[6px]">
                  Signé par {g.ecart.signePar}, le {g.ecart.le}.
                </p>
              </div>
            )}
            <Definitions lignes={[
              ["Effet", <Jeton ton={TON_EFFET[g.effet]} point={false} enfants={g.effet} />],
              ["Niveau exigé", <Jeton ton={NIVEAUX[g.niveau].ton} enfants={NIVEAUX[g.niveau].nom} />],
              ["Plancher du type", NIVEAUX[PLANCHER[g.effet]].nom],
              ["Ce qu'on traverse", <span className="text-[12.5px]">{NIVEAUX[g.niveau].traverse}</span>],
              ["Qui peut le déclencher", g.roles.length
                ? <span className="flex flex-wrap gap-[4px] justify-end">
                    {g.roles.map((r) => <Jeton key={r} ton="neutre" point={false} enfants={r} />)}
                  </span>
                : <span className="text-encre-4">personne — le geste est fermé</span>],
              ["Journalisé", g.journalise
                ? <Jeton ton="bon" enfants="oui, sans exception" />
                : <Jeton ton="critique" enfants="non" />],
              ["Se défait", g.reversible === "oui" ? <Jeton ton="bon" enfants="oui, d'un clic" />
                : g.reversible === "fenêtre" ? <Jeton ton="vigilance" enfants={`dans une fenêtre — ${g.fenetre}`} />
                  : <Jeton ton="critique" enfants="non, jamais" />],
              ...(g.delai ? [["Délai de réflexion", g.delai] as [string, string]] : []),
              ["Usages (30 j)", fmt(g.usages30j)],
              ["Dernier usage", g.dernier],
            ]} />
            <div className="mt-4 pt-3 border-t border-bordure">
              <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-[6px]">
                Pourquoi ce niveau
              </div>
              <p className="text-[12.5px] text-encre-2 leading-[19px]">{g.note}</p>
            </div>
          </>
        )},
      ],
      pied: (
        <>
          {defaut && <Bouton ton="principal" icone="verrou"
            onClick={() => { ui.fermerTiroir(); demanderRelevement(g); }} enfants="Demander le relèvement" />}
          {g.niveau !== "libre" && g.niveau !== "interdit" && (
            <Bouton ton="danger" className="ml-auto" icone="selecteur"
              onClick={() => { ui.fermerTiroir(); abaisser(g); }} enfants="Abaisser" />
          )}
        </>
      ),
    });
  }

  const colonnes: Colonne<Geste>[] = [
    { cle: "nom", nom: "Geste", triable: true, fixe: true, rendu: (g) => (
      <div className="flex items-start gap-[9px] min-w-0">
        {!conforme(g)
          ? <Icone nom="halte" taille="s" className="text-critique mt-[3px] shrink-0" />
          : ecartAssume(g)
            ? <Icone nom="tampon" taille="s" className="text-vigilance mt-[3px] shrink-0" />
            : <Icone nom="verrou" taille="s" className="text-encre-4 mt-[3px] shrink-0" />}
        <span className="flex flex-col min-w-0">
          <span className="font-medium truncate">{g.nom}</span>
          <span className="font-mono text-[11px] text-encre-3">{g.id} · {g.module}</span>
        </span>
      </div>
    )},
    { cle: "effet", nom: "Effet", triable: true, rendu: (g) =>
      <Jeton ton={TON_EFFET[g.effet]} point={false} enfants={g.effet} /> },
    { cle: "niveau", nom: "Contrôle", triable: true,
      valeur: (g) => NIVEAUX[g.niveau].rang,
      rendu: (g) => (
        <span className="inline-flex items-center gap-[5px]">
          <Jeton ton={NIVEAUX[g.niveau].ton} enfants={NIVEAUX[g.niveau].nom} />
          {ecartAssume(g) && <Jeton ton="vigilance" point={false} enfants="écart signé" />}
        </span>
      ) },
    { cle: "roles", nom: "Qui", valeur: (g) => g.roles.length, rendu: (g) =>
      g.roles.length === 0 ? <span className="text-encre-4">personne</span>
        : <span className="text-encre-2 text-[12px]">{g.roles.length > 2 ? `${g.roles[0]} +${g.roles.length - 1}` : g.roles.join(", ")}</span> },
    { cle: "journalise", nom: "Journalisé", triable: true, rendu: (g) =>
      g.journalise ? <Jeton ton="bon" enfants="oui" /> : <Jeton ton="critique" enfants="non" /> },
    { cle: "reversible", nom: "Se défait", triable: true, rendu: (g) =>
      g.reversible === "oui" ? <span className="text-bon text-[12px]">d'un clic</span>
        : g.reversible === "fenêtre" ? <span className="text-vigilance text-[12px]">{g.fenetre}</span>
          : <span className="text-critique text-[12px]">jamais</span> },
    { cle: "delai", nom: "Réflexion", rendu: (g) =>
      g.delai ? <span className="text-encre-2 text-[12px] whitespace-nowrap">{g.delai}</span>
        : <span className="text-encre-4">—</span> },
    { cle: "usages30j", nom: "Usages 30 j", num: true, triable: true, rendu: (g) =>
      <span className="tab-num">{fmt(g.usages30j)}</span> },
  ];

  return (
    <>
      <Entete
        titre="Registre des contrôles"
        sous="Tout ce que l'outil permet, et le contrôle qu'il faut traverser pour le faire. Un geste absent d'ici n'existe pas."
        actions={
          <>
            <Bouton icone="telecharger"
              onClick={() => { exporterCSV("registre-des-controles", gestes); ui.message("Registre exporté.", "bon"); }}
              enfants="Exporter" />
            <Bouton ton="principal" icone="halte" onClick={() => { poserDefautsSeuls(true); poserEcartsSeuls(false); }}
              enfants={enDefaut.length ? `Voir le${enDefaut.length > 1 ? "s" : ""} ${enDefaut.length} défaut${enDefaut.length > 1 ? "s" : ""}` : "Aucun défaut"} />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Gestes recensés" valeur={fmt(gestes.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sous-contrôlés" valeur={fmt(enDefaut.length)} ton={enDefaut.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Écarts assumés" valeur={fmt(ecarts.length)} ton={ecarts.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Gestes fermés" valeur={fmt(gestes.filter((g) => g.niveau === "interdit").length)} ton="accent" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Non journalisés" valeur={fmt(gestes.filter((g) => !g.journalise).length)} ton={gestes.some((g) => !g.journalise) ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sous double regard ou plus" valeur={fmt(gestes.filter((g) => NIVEAUX[g.niveau].rang >= 3).length)} />} />
      </div>

      {enDefaut.length > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-critique-voile border border-critique/40 anim-apparait">
          <Icone nom="halte" className="text-critique mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,260px)] text-[13px]">
            <b>{enDefaut.length} geste{enDefaut.length > 1 ? "s sont" : " est"} sous-contrôlé{enDefaut.length > 1 ? "s" : ""} au regard de son effet.</b>{" "}
            <span className="text-encre-2">
              {enDefaut.slice(0, 2).map((g) => `« ${g.nom} »`).join(" et ")}
              {enDefaut.length > 2 ? `, et ${enDefaut.length - 2} autre${enDefaut.length > 3 ? "s" : ""}` : ""}.{" "}
              Ce n'est pas un réglage à la convenance de l'administrateur : c'est un écart au plancher que le
              registre s'est donné, et il reste affiché ici tant qu'il n'est pas repris.
            </span>
          </div>
          <Bouton taille="s" onClick={() => poserDefautsSeuls(true)} enfants="Les isoler" />
        </div>
      )}

      {ecarts.length > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-surface-2 border border-bordure anim-apparait">
          <Icone nom="tampon" className="text-encre-3 mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,260px)] text-[13px]">
            <b>{ecarts.length} gestes sont sous leur plancher, mais l'écart est signé.</b>{" "}
            <span className="text-encre-2">
              Un contrôle qu'on allège sans le dire est un défaut ; allégé par écrit, daté, avec le nom de
              celui qui l'assume et la date à laquelle on y revient, c'est une décision.
              {aRevoir.length > 0 && <> {aRevoir.length} de ces écarts {aRevoir.length > 1 ? "sont à revoir" : "est à revoir"} avant la fin de l'année.</>}
            </span>
          </div>
          <Bouton taille="s" onClick={() => { poserDefautsSeuls(false); poserEcartsSeuls(true); }} enfants="Les lire" />
        </div>
      )}

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,360px), 1fr))" }}>
        <CarteGraphique
          titre="Répartition par niveau d'exigence"
          sous="Combien de gestes se trouvent derrière chaque contrôle"
          etiquettes={repartition.map((r) => r.nom)}
          series={[{ nom: "Gestes", couleur: "--serie-1", valeurs: repartition.map((r) => r.compte) }]}
          enfants={<div className="px-2 pb-2"><Graphique config={configNiveaux} hauteur={212} /></div>}
        />

        <Carte enfants={
          <>
            <TeteCarte titre="Ce que chaque niveau exige" sous="Dit à l'opérateur, pas au développeur" />
            <ListeEchelonnee className="pas-carte pt-3 divide-y divide-bordure">
              {(["libre", "confirmation", "mot", "double", "quorum", "interdit"] as NiveauControle[]).map((n) => (
                <div key={n} className="flex items-start gap-3 py-[9px] first:pt-0 last:pb-0">
                  <Jeton ton={NIVEAUX[n].ton} enfants={NIVEAUX[n].nom} />
                  <p className="flex-1 min-w-0 text-[12.5px] text-encre-2 leading-[18px]">{NIVEAUX[n].traverse}</p>
                  <span className="text-[12px] tab-num text-encre-3 shrink-0">
                    {repartition.find((r) => r.niveau === n)?.compte ?? 0}
                  </span>
                </div>
              ))}
            </ListeEchelonnee>
          </>
        } />
      </div>

      <Carte enfants={
        <TableauDonnees
          lignes={filtres} colonnes={colonnes} cle={(g) => g.id}
          totalBrut={gestes.length} nomEntite={["geste", "gestes"]}
          triInitial={{ cle: "niveau", sens: "desc" }}
          surLigne={detail}
          vide={{
            titre: "Aucun geste", texte: "Aucun geste ne correspond à ces filtres.",
            actions: <Bouton onClick={() => { poserQ(""); poserModule(""); poserEffet(""); poserNiveau(""); poserDefautsSeuls(false); poserEcartsSeuls(false); }} enfants="Réinitialiser les filtres" />,
          }}
          barreOutils={
            <>
              <div className="flex items-center gap-2 h-8 px-[10px] min-w-[220px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                <Icone nom="recherche" taille="s" />
                <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                  placeholder="Geste, module, motif…" aria-label="Rechercher un geste"
                  className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
              </div>
              <select value={module} onChange={(e) => poserModule(e.target.value)} aria-label="Filtrer par module"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Tous les modules</option>
                {modules.map((m) => <option key={m}>{m}</option>)}
              </select>
              <select value={effet} onChange={(e) => poserEffet(e.target.value)} aria-label="Filtrer par effet"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Tous les effets</option>
                {Object.keys(PLANCHER).map((e) => <option key={e}>{e}</option>)}
              </select>
              <select value={niveau} onChange={(e) => poserNiveau(e.target.value)} aria-label="Filtrer par niveau"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Tous les niveaux</option>
                {(Object.keys(NIVEAUX) as NiveauControle[]).map((n) => <option key={n} value={n}>{NIVEAUX[n].nom}</option>)}
              </select>
              <Bouton actif={defautsSeuls} icone="halte"
                onClick={() => { poserDefautsSeuls((v) => !v); poserEcartsSeuls(false); }} enfants="Défauts seulement" />
              <Bouton actif={ecartsSeuls} icone="tampon"
                onClick={() => { poserEcartsSeuls((v) => !v); poserDefautsSeuls(false); }} enfants="Écarts signés" />
            </>
          }
          actionsLigne={(g) => (
            <>
              <Bouton ton="fantome" taille="s" icone="oeil" title="Détail" onClick={() => detail(g)} />
              {!conforme(g) && <Bouton ton="fantome" taille="s" icone="verrou" title="Demander le relèvement"
                onClick={() => demanderRelevement(g)} />}
            </>
          )}
        />
      } />

      <Carte className="mt-4" enfants={
        <>
          <TeteCarte titre="Le plancher par type d'effet" sous="Ce que le registre s'interdit de descendre en dessous" />
          <div className="pas-carte pt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            {(Object.keys(PLANCHER) as Array<keyof typeof PLANCHER>).map((e) => {
              const n = PLANCHER[e];
              const nb = gestes.filter((g) => g.effet === e).length;
              const mauvais = gestes.filter((g) => g.effet === e && !conforme(g)).length;
              const signes = gestes.filter((g) => g.effet === e && ecartAssume(g)).length;
              return (
                <div key={e} className={cx("p-3 rounded-[4px] border bg-surface-2",
                  mauvais ? "border-critique/40" : "border-bordure")}>
                  <div className="flex items-center gap-2">
                    <Jeton ton={TON_EFFET[e]} point={false} enfants={e} />
                    <span className="ml-auto text-[11px] tab-num text-encre-3">{nb}</span>
                  </div>
                  <div className="text-[14px] font-semibold mt-[6px]">{NIVEAUX[n].nom}</div>
                  <div className={cx("text-[11px] mt-1", mauvais ? "text-critique" : signes ? "text-vigilance" : "text-encre-3")}>
                    {mauvais ? `${mauvais} geste${mauvais > 1 ? "s" : ""} en dessous, sans écrit`
                      : signes ? `${signes} écart${signes > 1 ? "s" : ""} signé${signes > 1 ? "s" : ""}`
                        : "tous au plancher"}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      } />
    </>
  );
}
