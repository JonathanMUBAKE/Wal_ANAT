import { useState } from "react";
import type { ChartConfiguration } from "chart.js";
import { BarreMini, Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, Progression, TeteCarte } from "../composants/Primitives";
import { AnneauTotal, Graphique, Legende, optionsCommunes } from "../composants/Graphique";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { Icone } from "../composants/Icone";
import { useUI } from "../composants/Superpositions";
import { cx, fmt, jeton, NF, voiler } from "../lib/format";
import { HEURES } from "../lib/donnees";
import { capacite } from "../lib/exploitation";

/* Capacité et coûts : quand est-ce que ça sature, et combien ça coûte.
   La colonne qui compte n'est pas le taux d'occupation mais la **date de
   saturation** : un disque à 92 % qui ne bouge plus est moins urgent qu'un
   disque à 70 % qui monte de 11 Gio par jour. */
export function Capacite() {
  const ui = useUI();
  const [onglet, poserOnglet] = useState("ressources");

  const critiques = capacite.ressources.filter((r) => r.critique);
  const coutTotal = capacite.couts.reduce((a, c) => a + c.mois, 0);
  const surdimensionnes = capacite.coutParService.filter((s) => s.surdimensionne);
  const gainPossible = 340 + 180;

  const configProjection = (): ChartConfiguration => {
    const o = optionsCommunes();
    const col = jeton("--serie-2");
    return {
      type: "line",
      data: {
        labels: HEURES,
        datasets: [{
          label: "Stockage de la base (Gio)", data: capacite.projection.stockageBase,
          borderColor: col, backgroundColor: voiler(col, 0.16),
          borderWidth: 2, fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 5,
          pointBackgroundColor: col, pointBorderColor: jeton("--surface"), pointBorderWidth: 2,
        }],
      },
      options: {
        ...o,
        scales: { ...o.scales, y: { ...o.scales.y, beginAtZero: false, ticks: { ...o.scales.y.ticks, callback: (v) => fmt(Number(v)) + " Gio" } } },
      },
    };
  };

  return (
    <>
      <Entete
        titre="Capacité et coûts"
        sous="Quand est-ce que ça sature, et combien ça coûte — poste par poste et service par service."
        actions={
          <>
            {critiques.length > 0 && <Jeton ton="critique" enfants={`${critiques.length} ressource saturée bientôt`} />}
            <Bouton icone="telecharger" onClick={() => ui.message("Rapport de capacité en préparation.", "bon")} enfants="Rapport" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Coût mensuel" valeur={<NombreAnime valeur={coutTotal} suffixe=" €" />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Saturation la plus proche" valeur="23 jours" ton="critique" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Services surdimensionnés" valeur={<NombreAnime valeur={surdimensionnes.length} />} ton={surdimensionnes.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Économie identifiée" valeur={<NombreAnime valeur={gainPossible} suffixe=" € / mois" />} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Coût par agent" valeur={`${NF(2).format(coutTotal / 412)} € / mois`} />} />
      </div>

      {critiques.map((r) => (
        <Apparition key={r.nom} className="mb-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-[4px] bg-critique-voile border border-critique/40">
            <Icone nom="base" className="text-critique mt-[2px]" />
            <div className="flex-1 min-w-0 text-[13px]">
              <b>{r.nom} : saturation {r.saturation}.</b>{" "}
              <span className="text-encre-2">
                {fmt(r.utilise)} {r.unite} occupés sur {fmt(r.capacite)}, et la croissance est de
                {" "}{r.tendance} {r.unite} par jour. Ce n'est pas le taux d'occupation qui alerte,
                c'est la pente : à ce rythme, la capacité est atteinte avant la fin du mois prochain.
              </span>
            </div>
            <Bouton taille="s" ton="danger" onClick={() => poserOnglet("recommandations")} enfants="Que faire" />
          </div>
        </Apparition>
      ))}

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "ressources", nom: "Ressources", compte: capacite.ressources.length },
              { cle: "couts", nom: "Coûts", compte: capacite.couts.length },
              { cle: "services", nom: "Par service", compte: capacite.coutParService.length },
              { cle: "recommandations", nom: "Que faire", compte: capacite.recommandations.length },
            ]}
          />

          <div className="pas-carte">
            {onglet === "ressources" && (
              <>
                <p className="text-[12px] text-encre-3 mb-3">
                  Classées par date de saturation, pas par taux d'occupation. Un disque à 92 % qui ne
                  bouge plus est moins urgent qu'un disque à 70 % qui monte vite.
                </p>
                <ListeEchelonnee className="space-y-2">
                  {[...capacite.ressources].sort((a, b) => Number(b.critique) - Number(a.critique)).map((r) => {
                    const part = (r.utilise / r.capacite) * 100;
                    return (
                      <div key={r.nom} className={cx("p-4 rounded-[4px] border",
                        r.critique ? "border-critique/45 bg-critique-voile" : "border-bordure bg-surface-2")}>
                        <div className="flex items-start gap-3 flex-wrap mb-2">
                          <Pastille ton={r.critique ? "critique" : part > 80 ? "vigilance" : "bon"} pulse={!r.critique} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-semibold">{r.nom}</div>
                            <div className="text-[11.5px] text-encre-3 mt-[2px]">
                              {fmt(r.utilise)} / {fmt(r.capacite)} {r.unite} · croissance {r.tendance} {r.unite} par jour
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={cx("text-[13px] font-semibold", r.critique ? "text-critique" : "text-encre-2")}>
                              {r.saturation}
                            </div>
                            <div className="text-[11px] text-encre-4">avant saturation</div>
                          </div>
                        </div>
                        <Progression valeur={part} ton={r.critique ? "critique" : part > 80 ? "accent" : "bon"} />
                        <div className="text-[11px] text-encre-3 mt-[4px] tab-num">{Math.round(part)} % occupé</div>
                      </div>
                    );
                  })}
                </ListeEchelonnee>

                <div className="mt-4">
                  <TeteCarte titre="Projection du stockage de la base" sous="Courbe observée sur 24 heures, extrapolée" />
                  <Legende items={[{ nom: "Stockage de la base", couleur: "var(--serie-2)", valeur: fmt(2944) + " Gio" }]} />
                  <Graphique config={configProjection} hauteur={210} />
                </div>
              </>
            )}

            {onglet === "couts" && (
              <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)" }}>
                <div className="flex items-start gap-4">
                  <AnneauTotal taille={140}
                    parts={capacite.couts.map((c, i) => ({ nom: c.poste, valeur: c.mois, couleur: `--serie-${i + 1}` }))}
                    total={`${fmt(coutTotal)} €`} intitule="par mois" />
                </div>
                <div className="min-w-0">
                  {capacite.couts.map((c, i) => (
                    <div key={c.poste} className="flex items-center gap-3 py-[8px] border-b border-bordure last:border-0 text-[13px]">
                      <i className="w-[8px] h-[8px] rounded-full shrink-0" style={{ background: `var(--serie-${i + 1})` }} />
                      <span className="flex-1 min-w-0 truncate">{c.poste}</span>
                      <BarreMini valeur={c.part * 2} largeur={70} />
                      <span className="tab-num text-encre-3 w-[36px] text-right">{c.part} %</span>
                      <span className="tab-num font-semibold w-[70px] text-right">{fmt(c.mois)} €</span>
                      <span className={cx("tab-num text-[11.5px] w-[56px] text-right",
                        c.tendance > 10 ? "text-critique" : c.tendance > 0 ? "text-vigilance" : c.tendance < 0 ? "text-bon" : "text-encre-4")}>
                        {c.tendance > 0 ? "+" : ""}{c.tendance ? `${c.tendance} %` : "stable"}
                      </span>
                    </div>
                  ))}
                  <p className="text-[12px] text-encre-3 mt-3">
                    La dépense d'IA croît de 34 % par mois. Elle reste le plus petit poste, mais à ce
                    rythme elle dépasse les licences dans quatre mois : c'est maintenant qu'elle doit
                    entrer au budget, pas quand on la découvrira.
                  </p>
                </div>
              </div>
            )}

            {onglet === "services" && (
              <div className="overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      {["Service", "Instances", "Coût mensuel", "Coût par requête", "Dimensionnement"].map((t, i) => (
                        <th key={t} className={cx(
                          "sticky top-0 bg-surface-2 px-3 py-[9px] border-b border-bordure whitespace-nowrap",
                          "text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3",
                          i >= 1 && i <= 3 ? "text-right" : "text-left")}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...capacite.coutParService].sort((a, b) => b.mois - a.mois).map((s) => (
                      <tr key={s.nom} className={cx("hover:bg-surface-2 transi", s.surdimensionne && "bg-vigilance-voile")}>
                        <td className="px-3 pas-ligne border-b border-bordure font-mono">{s.nom}</td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{s.instances}</td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right tab-num font-semibold">{fmt(s.mois)} €</td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right tab-num text-encre-3">
                          {NF(6).format(s.parRequete)} €
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure">
                          {s.surdimensionne
                            ? <Jeton ton="vigilance" enfants="jamais au-dessus de 30 %" />
                            : <Jeton ton="bon" enfants="ajusté" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {onglet === "recommandations" && (
              <ListeEchelonnee className="space-y-3">
                {capacite.recommandations.map((r) => (
                  <div key={r.titre} className={cx("p-4 rounded-[4px] border",
                    r.urgence === "critique" ? "border-critique/45 bg-critique-voile"
                      : r.urgence === "moyenne" ? "border-bordure bg-surface-2" : "border-bordure bg-surface-2 opacity-85")}>
                    <div className="flex items-start gap-3 mb-2">
                      <Icone nom={r.urgence === "critique" ? "alerte" : "eclair"} taille="s"
                        className={cx("mt-[3px] shrink-0", r.urgence === "critique" ? "text-critique" : "text-accent")} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13.5px] font-semibold">{r.titre}</span>
                          {r.gain && <Jeton ton="bon" point={false} enfants={r.gain} />}
                          <Jeton ton={r.urgence === "critique" ? "critique" : r.urgence === "moyenne" ? "vigilance" : "neutre"}
                            enfants={`urgence ${r.urgence}`} />
                        </div>
                      </div>
                    </div>
                    <p className="text-[12.5px] text-encre-2 leading-[18px]">{r.texte}</p>
                  </div>
                ))}
                <div className="p-3 rounded-[4px] bg-surface-2 border border-bordure text-[12.5px] text-encre-2">
                  Ces recommandations ne s'appliquent pas toutes seules. Chacune a un effet sur le
                  service rendu — une instance en moins, c'est moins de marge le jour de la paie.
                  C'est à vous de dire si le gain vaut la marge perdue.
                </div>
              </ListeEchelonnee>
            )}
          </div>
        </>
      } />
    </>
  );
}
