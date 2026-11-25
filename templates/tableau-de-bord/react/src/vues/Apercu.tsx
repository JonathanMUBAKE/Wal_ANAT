import { useMemo, useState } from "react";
import type { ChartConfiguration } from "chart.js";
import {
  BarreMini, Bouton, Carte, CaseSerie, CurseurPeriode, Jeton, LigneStat,
  Onglets, Pastille, RangeeTuiles, SelecteurPeriode, TeteCarte,
} from "../composants/Primitives";
import { AnneauTotal, Graphique, optionsCommunes } from "../composants/Graphique";
import { LigneAssistant } from "../composants/AssistantIA";
import { Icone } from "../composants/Icone";
import { useUI } from "../composants/Superpositions";
import { cx, fmt, jeton, NF, voiler } from "../lib/format";
import { HEURES, charge, latence, parCode, parService, serie } from "../lib/donnees";
import { activiteParModule, servicesSIGRH } from "../lib/sigrh";
import { agentsIA } from "../lib/intelligence";

/* =========================================================================
   VUE D'ENSEMBLE — reprise de la composition du tableau de bord UniFi :
   une barre d'outils fine, un graphique héros avec son curseur de période,
   trois rangées de tuiles, puis deux cartes à anneau dont le total est au
   centre et le détail en tableau à côté.
   Une différence assumée : UniFi superpose deux échelles de valeurs sur le
   même graphique (ms à gauche, Mb/s à droite). On ne le fait pas ici —
   deux échelles sur un même dessin donnent des croisements qui ne veulent
   rien dire. Les séries d'unités différentes sont normalisées en indice.
   ========================================================================= */

const SERIES_HERO = [
  { cle: "requetes", nom: "Requêtes par minute", couleur: "--serie-1", valeurs: charge[0].valeurs, unite: "req/min" },
  { cle: "latence", nom: "Latence moyenne", couleur: "--serie-5", valeurs: latence[1].valeurs, unite: "ms" },
  { cle: "erreurs", nom: "Taux d'erreur", couleur: "--serie-8", valeurs: serie(24, 14, 5), unite: "pour mille" },
];

export function Apercu({ aller }: { aller: (cle: string) => void }) {
  const ui = useUI();
  const [periode, poserPeriode] = useState("1 j");
  const [portee, poserPortee] = useState("plateforme");
  const [visibles, poserVisibles] = useState<Set<string>>(new Set(["requetes", "latence"]));
  const [service, poserService] = useState("");
  const [incident, poserIncident] = useState(true);

  const basculer = (cle: string) => poserVisibles((s) => {
    const n = new Set(s);
    n.has(cle) ? n.delete(cle) : n.add(cle);
    return n.size ? n : s; // au moins une série reste affichée
  });

  /* Les trois séries n'ont pas la même unité : on les ramène à un indice
     base 100 sur leur propre moyenne, et le repère reste lisible. */
  const configHero = (): ChartConfiguration => {
    const o = optionsCommunes();
    const actives = SERIES_HERO.filter((s) => visibles.has(s.cle));
    return {
      type: "line",
      data: {
        labels: HEURES,
        datasets: actives.map((s) => {
          const col = jeton(s.couleur);
          const moyenne = s.valeurs.reduce((a, b) => a + b, 0) / s.valeurs.length || 1;
          return {
            label: s.nom,
            data: s.valeurs.map((v) => Math.round((v / moyenne) * 100)),
            borderColor: col,
            backgroundColor: voiler(col, 0.12),
            borderWidth: 1.75, fill: actives.length === 1, tension: 0.28,
            pointRadius: 0, pointHoverRadius: 5,
            pointBackgroundColor: col, pointBorderColor: jeton("--surface"), pointBorderWidth: 2,
          };
        }),
      },
      options: {
        ...o,
        scales: {
          ...o.scales,
          y: {
            ...o.scales.y,
            beginAtZero: false,
            ticks: { ...o.scales.y.ticks, callback: (v) => v + "" },
          },
        },
        plugins: {
          ...o.plugins,
          tooltip: {
            ...o.plugins.tooltip,
            callbacks: {
              label: (c) => {
                const s = actives[c.datasetIndex];
                const moyenne = s.valeurs.reduce((a, b) => a + b, 0) / s.valeurs.length || 1;
                const reel = Math.round((Number(c.parsed.y) / 100) * moyenne);
                return ` ${s.nom} : ${fmt(reel)} ${s.unite} (indice ${c.parsed.y})`;
              },
            },
          },
        },
      },
    };
  };

  /* --- Les trois rangées de tuiles ---------------------------------------- */
  const tuilesServices = useMemo(() => servicesSIGRH.slice(0, 7).map((s, i) => ({
    cle: s.nom, nom: s.nom.replace("sigrh-", ""), initiales: s.nom.replace("sigrh-", "").slice(0, 2).toUpperCase(),
    valeur: `${fmt(s.debit)} req/min`, actif: service ? service === s.nom : i === 0,
  })), [service]);

  const tuilesModules = activiteParModule.map((m, i) => ({
    cle: m.nom, nom: m.nom,
    initiales: m.nom.slice(0, 2),
    valeur: fmt(m.valeurs.reduce((a, b) => a + b, 0)) + " gestes",
    actif: i === 0,
  }));

  const tuilesAgents = agentsIA.slice(0, 6).map((a, i) => ({
    cle: a.cle, nom: a.nom.split(" ")[0],
    icone: "robot" as const,
    valeur: `${fmt(a.executions7j)} exécutions`,
    actif: i === 0,
  }));

  /* --- Les deux anneaux ---------------------------------------------------- */
  const totalModules = activiteParModule.reduce((a, m) => a + m.valeurs.reduce((x, y) => x + y, 0), 0);
  const partsModules = activiteParModule.map((m, i) => ({
    nom: m.nom,
    valeur: m.valeurs.reduce((a, b) => a + b, 0),
    couleur: `--serie-${i + 1}`,
  }));

  const CANAUX = [
    { nom: "Applicatif web", type: "Web", connexions: 842, activite: 86, experience: "Excellente" },
    { nom: "Portail mobile", type: "Mobile", connexions: 284, activite: 62, experience: "Excellente" },
    { nom: "Pointeuses", type: "Terminal", connexions: 112, activite: 94, experience: "Correcte" },
    { nom: "Interfaces", type: "API", connexions: 46, activite: 38, experience: "Excellente" },
  ];
  const totalConnexions = CANAUX.reduce((a, c) => a + c.connexions, 0);
  const partsCanaux = CANAUX.map((c, i) => ({ nom: c.nom, valeur: c.connexions, couleur: `--serie-${i + 1}` }));

  const enAlerte = servicesSIGRH.filter((s) => s.etat === "critique").length;

  return (
    <>
      {incident && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-critique-voile border border-critique/40 anim-apparait">
          <Icone nom="alerte" className="text-critique mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,240px)]">
            <div className="text-[13px] font-semibold">Incident P1 — latence de la passerelle d'entrée</div>
            <div className="text-[12px] text-encre-2 mt-[2px]">
              Détecté il y a 14 min · 3 services touchés · astreinte notifiée · <span className="font-mono">INC-2048</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Bouton taille="s" icone="check" onClick={() => ui.message("INC-2048 acquitté — vous en êtes responsable.", "bon")} enfants="Acquitter" />
            <Bouton taille="s" ton="principal" onClick={() => aller("alertes")} enfants="Ouvrir la fiche" />
            <Bouton taille="s" ton="fantome" icone="croix" aria-label="Masquer" onClick={() => poserIncident(false)} />
          </div>
        </div>
      )}

      {/* --- Graphique héros : la pièce maîtresse, comme chez UniFi --------- */}
      <Carte className="mb-4" enfants={
        <>
          <div className="flex items-center gap-2 flex-wrap px-[var(--pas-carte)] pt-[6px] border-b border-bordure">
            <div className="-mb-px">
              <Onglets compact actif={portee} surChoix={poserPortee}
                onglets={[{ cle: "plateforme", nom: "Plateforme" }, { cle: "agents", nom: "Agents IA" }]} />
            </div>

            <select value={service} onChange={(e) => poserService(e.target.value)} aria-label="Filtrer par service"
              className="h-[28px] px-[8px] ml-2 rounded-[4px] bg-surface-2 border border-bordure text-encre text-[12px]">
              <option value="">Tous les services</option>
              {servicesSIGRH.map((s) => <option key={s.nom} value={s.nom}>{s.nom}</option>)}
            </select>

            <div className="ml-auto flex items-center gap-1 flex-wrap py-[6px]">
              {SERIES_HERO.map((s) => (
                <CaseSerie key={s.cle} nom={s.nom} couleur={`var(${s.couleur})`}
                  actif={visibles.has(s.cle)} surChangement={() => basculer(s.cle)} />
              ))}
              <span className="w-px h-[20px] bg-bordure mx-1" />
              <SelecteurPeriode options={["1 h", "1 j", "1 sem.", "1 mois"]} valeur={periode} surChoix={poserPeriode} />
            </div>
          </div>

          <Graphique config={configHero} cacher={undefined} hauteur={300} />
          <CurseurPeriode debut="00:00" fin="Maintenant"
            surEtendre={() => ui.message("Période étendue à une semaine.", "info", { duree: 1400 })} />
        </>
      } />

      {/* --- Les trois rangées de tuiles ------------------------------------ */}
      <Carte className="mb-4" enfants={
        <div className="pas-carte grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <RangeeTuiles titre="Principaux services" tuiles={tuilesServices}
            surChoix={(c) => poserService(c === service ? "" : c)} />
          <RangeeTuiles titre="Principaux modules" tuiles={tuilesModules}
            surChoix={() => aller("activite")} />
          <RangeeTuiles titre="Agents IA les plus sollicités" tuiles={tuilesAgents}
            surChoix={() => aller("agents")} />
        </div>
      } />

      {/* --- Les deux anneaux, détail en tableau ---------------------------- */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))" }}>
        <Carte enfants={
          <div className="pas-carte">
            <div className="flex items-start gap-5">
              <AnneauTotal parts={partsModules} total={fmt(totalModules, "compact")} intitule="Gestes enregistrés" />
              <div className="min-w-0 flex-1 overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-[12.5px]">
                  <thead>
                    <tr>
                      <th className="text-left pb-2 text-[11px] font-semibold text-encre-3">Module</th>
                      <th className="text-right pb-2 text-[11px] font-semibold text-encre-3">Part</th>
                      <th className="text-right pb-2 text-[11px] font-semibold text-accent">Gestes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partsModules.map((p, i) => (
                      <tr key={p.nom} className="hover:bg-surface-2 transi">
                        <td className="py-[5px]">
                          <span className="inline-flex items-center gap-[7px]">
                            <i className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: `var(--serie-${i + 1})` }} />
                            <span className="truncate">{p.nom}</span>
                          </span>
                        </td>
                        <td className="py-[5px] text-right tab-num text-encre-3">
                          {NF(1).format((p.valeur / totalModules) * 100)} %
                        </td>
                        <td className="py-[5px] text-right tab-num font-medium">{fmt(p.valeur, "compact")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        } />

        <Carte enfants={
          <div className="pas-carte">
            <div className="flex items-start gap-5">
              <AnneauTotal parts={partsCanaux} total={fmt(totalConnexions)} intitule="Connexions ouvertes" />
              <div className="min-w-0 flex-1 overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-[12.5px]">
                  <thead>
                    <tr>
                      <th className="text-left pb-2 text-[11px] font-semibold text-encre-3">Accès</th>
                      <th className="text-left pb-2 text-[11px] font-semibold text-accent">Activité</th>
                      <th className="text-left pb-2 text-[11px] font-semibold text-encre-3">Expérience</th>
                      <th className="text-right pb-2 text-[11px] font-semibold text-encre-3">Connexions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CANAUX.map((c, i) => (
                      <tr key={c.nom} className="hover:bg-surface-2 transi">
                        <td className="py-[5px]">
                          <span className="inline-flex items-center gap-[7px]">
                            <i className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: `var(--serie-${i + 1})` }} />
                            <span className="truncate">{c.type}</span>
                          </span>
                        </td>
                        <td className="py-[5px]"><BarreMini valeur={c.activite} largeur={56} /></td>
                        <td className={cx("py-[5px]", c.experience === "Excellente" ? "text-bon" : "text-vigilance")}>
                          {c.experience}
                        </td>
                        <td className="py-[5px] text-right tab-num font-medium">{fmt(c.connexions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        } />
      </div>

      {/* --- Lecture assistée du tableau de bord ---------------------------- */}
      <div className="mb-4">
        <LigneAssistant
          texte={
            <>
              <b className="text-encre">Les trois services les plus lents partagent la même base.</b>{" "}
              La latence de la passerelle, du service documents et des rapports monte ensemble depuis
              14 h, pendant que les requêtes par minute restent stables. Une montée de latence sans
              montée de charge vient rarement du code : regardez d'abord les verrous sur la base.
            </>
          }
          action={<Bouton taille="s" onClick={() => aller("basededonnees")} enfants="Voir la base" />}
        />
      </div>

      {/* --- Bandeau de santé : services, familles de réponses, files ------- */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Carte enfants={
          <>
            <TeteCarte titre="Services" sous={`${servicesSIGRH.length} déclarés · ${enAlerte} en alerte`}
              outils={<Bouton taille="s" ton="fantome" iconeFin="chevronDroite" onClick={() => aller("services")} enfants="Tout voir" />} />
            <div className="pas-carte pt-3">
              {servicesSIGRH.slice(0, 6).map((s) => (
                <div key={s.nom} className="flex items-center gap-3 py-[6px] text-[12.5px]">
                  <Pastille ton={s.etat} pulse={s.etat === "bon"} />
                  <span className="font-mono truncate flex-1 min-w-0">{s.nom}</span>
                  <BarreMini valeur={Math.min(100, (s.latence / 420) * 100)}
                    ton={s.latence > 350 ? "critique" : s.latence > 240 ? "vigilance" : "accent"} largeur={56} />
                  <span className={cx("tab-num w-[56px] text-right",
                    s.latence > 350 ? "text-critique" : s.latence > 240 ? "text-vigilance" : "text-encre-2")}>
                    {s.latence} ms
                  </span>
                </div>
              ))}
            </div>
          </>
        } />

        <Carte enfants={
          <>
            <TeteCarte titre="Réponses par famille" sous="Codes renvoyés aux agents" />
            <div className="pas-carte pt-3">
              {parCode.map((c, i) => {
                const total = parCode.reduce((a, b) => a + b.v, 0);
                return (
                  <div key={c.nom} className="flex items-center gap-3 py-[7px] text-[12.5px]">
                    <i className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: `var(--serie-${i + 1})` }} />
                    <span className="truncate flex-1 min-w-0">{c.nom}</span>
                    <span className="tab-num text-encre-3">{NF(1).format((c.v / total) * 100)} %</span>
                    <span className="tab-num font-medium w-[64px] text-right">{fmt(c.v, "compact")}</span>
                  </div>
                );
              })}
            </div>
          </>
        } />

        <Carte enfants={
          <>
            <TeteCarte titre="Volume par service" sous="Requêtes sur la période"
              outils={<Jeton ton="neutre" point={false} enfants={periode} />} />
            <div className="pas-carte pt-3">
              {parService.map((s) => {
                const max = Math.max(...parService.map((x) => x.v));
                return (
                  <div key={s.nom} className="flex items-center gap-3 py-[6px] text-[12.5px]">
                    <span className="font-mono truncate w-[150px] shrink-0">{s.nom}</span>
                    <BarreMini valeur={(s.v / max) * 100} largeur={90} />
                    <span className="ml-auto tab-num font-medium">{fmt(s.v, "compact")}</span>
                  </div>
                );
              })}
            </div>
          </>
        } />

        <Carte enfants={
          <>
            <TeteCarte titre="Chiffres du jour" sous="Les cinq qu'on regarde en premier" />
            <div className="pas-carte pt-3">
              <LigneStat etiquette="Disponibilité (90 j)" valeur="99,81 %" ton="vigilance" />
              <LigneStat etiquette="Requêtes par minute" valeur="4,8 k" />
              <LigneStat etiquette="Latence p95" valeur="182 ms" />
              <LigneStat etiquette="Taux d'erreur" valeur="0,28 %" ton="bon" />
              <LigneStat etiquette="Agents connectés" valeur="284 sur 412" />
              <LigneStat etiquette="Coût du jour" valeur="412 €" />
              <LigneStat etiquette="Dépense IA du jour" valeur="26,56 €" />
            </div>
          </>
        } />
      </div>
    </>
  );
}
