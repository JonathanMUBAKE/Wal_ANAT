import { useMemo, useState } from "react";
import type { ChartConfiguration } from "chart.js";
import { Bouton, Carte, Entete, Jeton, LigneStat, Onglets, SelecteurPeriode, TeteCarte, BarreMini } from "../composants/Primitives";
import { CarteGraphique, Graphique, Legende, optionsCommunes } from "../composants/Graphique";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { Icone } from "../composants/Icone";
import { cx, exporterCSV, fmt, jeton, normaliser, voiler } from "../lib/format";
import { HEURES } from "../lib/donnees";
import { activite, activiteParDirection, activiteParModule, type EvenementActivite } from "../lib/sigrh";
import { Empechement, useDistant } from "../composants/Distant";
import { activites } from "../lib/api/anat";
import { useSource } from "../lib/api/source";

/* Activité : ce que les agents font du système, heure par heure et direction
   par direction. C'est la page qu'on ouvre pour répondre à « qui a fait quoi,
   et quand ». Elle ne juge pas : elle montre. */
export function Activite() {
  const ui = useUI();
  const { source } = useSource();
  const direct = source === "application";
  const distant = useDistant(activites);
  const [periode, poserPeriode] = useState("24 h");
  const [onglet, poserOnglet] = useState("flux");
  const [q, poserQ] = useState("");
  const [module, poserModule] = useState("");
  const [canal, poserCanal] = useState("");
  const [cachees, poserCachees] = useState<Set<number>>(new Set());

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return activite.filter((e) =>
      (!n || normaliser(`${e.agent} ${e.action} ${e.cible} ${e.direction}`).includes(n)) &&
      (!module || e.module === module) && (!canal || e.canal === canal));
  }, [q, module, canal]);

  const total = activite.length;
  const parCanal = ["Web", "Mobile", "Pointeuse", "API"].map((c) => ({
    nom: c, n: activite.filter((e) => e.canal === c).length,
  }));

  const configUsage = (): ChartConfiguration => {
    const o = optionsCommunes();
    return {
      type: "line",
      data: {
        labels: HEURES,
        datasets: activiteParModule.map((s) => {
          const col = jeton(s.couleur);
          return {
            label: s.nom, data: s.valeurs, borderColor: col, backgroundColor: voiler(col, 0.18),
            borderWidth: 2, fill: true, tension: 0.32, pointRadius: 0, pointHoverRadius: 5,
            pointBackgroundColor: col, pointBorderColor: jeton("--surface"), pointBorderWidth: 2,
          };
        }),
      },
      options: {
        ...o,
        scales: { ...o.scales, y: { ...o.scales.y, stacked: true, ticks: { ...o.scales.y.ticks, callback: (v) => fmt(Number(v), "compact") } } },
        plugins: { ...o.plugins, tooltip: { ...o.plugins.tooltip, callbacks: { label: (c) => ` ${c.dataset.label} : ${fmt(Number(c.parsed.y))} gestes` } } },
      },
    };
  };

  const colonnes: Colonne<EvenementActivite>[] = [
    { cle: "quand", nom: "Quand", triable: true, fixe: true, valeur: (e) => -e.minutes,
      rendu: (e) => <span className="text-encre-3 whitespace-nowrap">{e.quand}</span> },
    { cle: "agent", nom: "Agent", triable: true, rendu: (e) => <span className="font-medium">{e.agent}</span> },
    { cle: "direction", nom: "Direction", triable: true, rendu: (e) => <span className="text-encre-2">{e.direction}</span> },
    { cle: "module", nom: "Module", triable: true, rendu: (e) => <Jeton ton="neutre" point={false} enfants={e.module} /> },
    { cle: "action", nom: "Geste", triable: true, rendu: (e) => e.action },
    { cle: "cible", nom: "Objet", rendu: (e) => <span className="font-mono text-[12px] text-encre-2">{e.cible}</span> },
    { cle: "canal", nom: "Canal", triable: true, rendu: (e) => (
      <span className="inline-flex items-center gap-[6px] text-encre-2">
        <Icone nom={e.canal === "Mobile" ? "moniteur" : e.canal === "Pointeuse" ? "horloge" : e.canal === "API" ? "prise" : "grille"} taille="s" className="text-encre-4" />
        {e.canal}
      </span>
    )},
  ];

  return (
    <>
      <Entete
        titre="Activité"
        sous="Ce que les agents font du système : gestes, modules sollicités et canaux d'accès."
        actions={
          <>
            <SelecteurPeriode options={["24 h", "7 j", "30 j", "90 j"]} valeur={periode} surChoix={poserPeriode} />
            <Bouton icone="telecharger" onClick={() => { exporterCSV("activite", filtres); ui.message("Export de l'activité filtrée lancé.", "bon"); }} enfants="Exporter" />
          </>
        }
      />

      {direct && (
        <>
          <div className="mb-4">
            <Empechement etat={distant.etat} echec={distant.echec} relancer={distant.relancer} />
          </div>
          {distant.etat === "ok" && (
            <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-vigilance-voile border border-vigilance/40">
              <Icone nom="halte" className="text-vigilance mt-[2px]" />
              <p className="flex-1 min-w-[min(100%,260px)] text-[13px] text-encre-2">
                <b>{distant.donnees?.length ?? 0} activité{(distant.donnees?.length ?? 0) > 1 ? "s" : ""} lue{(distant.donnees?.length ?? 0) > 1 ? "s" : ""} sur l'application.</b>{" "}
                Cette route est cloisonnée par organisation : elle ne renvoie que ce que votre session voit
                dans l'organisation choisie. Le flux complet de la plateforme passe par le journal d'audit,
                qui lui n'est pas cloisonné. Les courbes et les répartitions ci-dessous sont du gabarit.
              </p>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-12 gap-4 mb-4">
        <CarteGraphique
          className="col-span-12 xl:col-span-8"
          titre="Gestes par module" sous="Nombre d'actions enregistrées, heure par heure"
          etiquettes={HEURES} series={activiteParModule}
          legende={
            <Legende
              items={activiteParModule.map((s) => ({
                nom: s.nom, couleur: `var(${s.couleur})`,
                valeur: fmt(s.valeurs.reduce((a, b) => a + b, 0), "compact"),
              }))}
              cachees={cachees}
              basculer={(i) => { const n = new Set(cachees); n.has(i) ? n.delete(i) : n.add(i); poserCachees(n); }}
            />
          }
          enfants={<Graphique config={configUsage} cacher={cachees} hauteur={276} />}
        />

        <Carte className="col-span-12 xl:col-span-4" enfants={
          <>
            <TeteCarte titre="En un coup d'œil" sous={`Sur les ${periode} écoulées`} />
            <div className="pas-carte pt-2">
              <LigneStat etiquette="Gestes enregistrés" valeur={fmt(total * 37)} />
              <LigneStat etiquette="Agents actifs" valeur="284 sur 412" />
              <LigneStat etiquette="Module le plus sollicité" valeur="Présences" />
              <LigneStat etiquette="Heure de pointe" valeur="07 h 30 – 08 h 30" />
              <LigneStat etiquette="Gestes hors horaires" valeur="146" ton="vigilance" />
              <div className="h-px bg-bordure my-3" />
              <div className="text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3 mb-2">Par canal</div>
              {parCanal.map((c) => (
                <div key={c.nom} className="flex items-center gap-3 py-[5px] text-[13px]">
                  <span className="text-encre-3 w-[72px] shrink-0">{c.nom}</span>
                  <BarreMini valeur={(c.n / total) * 100} largeur={90} />
                  <span className="ml-auto tab-num">{Math.round((c.n / total) * 100)} %</span>
                </div>
              ))}
            </div>
          </>
        } />
      </div>

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "flux", nom: "Flux des gestes", compte: filtres.length },
              { cle: "directions", nom: "Par direction", compte: activiteParDirection.length },
            ]}
          />

          {onglet === "flux" ? (
            <TableauDonnees
              lignes={filtres} colonnes={colonnes} cle={(e) => e.id}
              totalBrut={activite.length} nomEntite={["geste", "gestes"]}
              triInitial={{ cle: "quand", sens: "asc" }}
              surLigne={(e) => ui.ouvrirTiroir({
                titre: e.action,
                sous: <span className="font-mono">{e.id}</span>,
                onglets: [{
                  nom: "Détail",
                  contenu: <Definitions lignes={[
                    ["Agent", e.agent], ["Direction", e.direction], ["Module", e.module],
                    ["Objet", <span className="font-mono">{e.cible}</span>],
                    ["Canal", e.canal], ["Quand", e.quand],
                    ["Identifiant", <span className="font-mono">{e.id}</span>],
                  ]} />,
                }],
                pied: <Bouton icone="audit" onClick={() => ui.message("Ouverture du journal d'audit filtré sur cet agent.", "info")} enfants="Voir dans le journal d'audit" />,
              })}
              barreOutils={
                <>
                  <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                    <Icone nom="recherche" taille="s" />
                    <input
                      type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                      placeholder="Agent, geste, objet…" aria-label="Rechercher dans l'activité"
                      className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4"
                    />
                  </div>
                  <select value={module} onChange={(e) => poserModule(e.target.value)} aria-label="Filtrer par module"
                    className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                    <option value="">Tous les modules</option>
                    {activiteParModule.map((m) => <option key={m.nom}>{m.nom}</option>)}
                  </select>
                  <select value={canal} onChange={(e) => poserCanal(e.target.value)} aria-label="Filtrer par canal"
                    className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                    <option value="">Tous les canaux</option>
                    {["Web", "Mobile", "Pointeuse", "API"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </>
              }
            />
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    {["Direction", "Agents", "Gestes", "Taux de présence", ""].map((t, i) => (
                      <th key={t || i} className={cx(
                        "sticky top-0 z-3 bg-surface-2 px-3 py-[9px] border-b border-bordure whitespace-nowrap",
                        "text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3",
                        i === 0 ? "text-left" : "text-right",
                      )}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activiteParDirection.map((d) => (
                    <tr key={d.nom} className="hover:bg-surface-2 transi">
                      <td className="px-3 pas-ligne border-b border-bordure font-medium">{d.nom}</td>
                      <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{fmt(d.agents)}</td>
                      <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{fmt(d.actions)}</td>
                      <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">
                        <span className={cx(d.tauxPresence < 90 ? "text-vigilance" : "text-encre")}>{d.tauxPresence} %</span>
                      </td>
                      <td className="px-3 pas-ligne border-b border-bordure text-right">
                        <BarreMini valeur={d.tauxPresence} ton={d.tauxPresence < 90 ? "vigilance" : "bon"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      } />
    </>
  );
}
