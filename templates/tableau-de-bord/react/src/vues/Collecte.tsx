import { useState } from "react";
import type { ChartConfiguration } from "chart.js";
import { BarreMini, Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, Progression, TeteCarte } from "../composants/Primitives";
import { AnneauTotal, Graphique, Legende, optionsCommunes } from "../composants/Graphique";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { LigneAssistant } from "../composants/AssistantIA";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, fmt, jeton, NF, voiler } from "../lib/format";
import { HEURES } from "../lib/donnees";
import { collecte, sourcesJournaux, type SourceJournaux } from "../lib/exploitation";

const TON = { "collecte": "bon", "dégradée": "vigilance", "arrêtée": "critique" } as const;

/* Collecte des journaux : tout ce qui écrit un journal l'envoie ici.
   La valeur n'est pas dans la collecte, elle est dans l'analyse. Une source
   collectée en « brut » coûte le même stockage qu'une source structurée, et
   ne sert à rien : on ne peut ni la filtrer, ni l'agréger, ni y détecter un
   motif. C'est la colonne qu'il faut regarder en premier sur cette page. */
export function Collecte() {
  const ui = useUI();
  const [onglet, poserOnglet] = useState("sources");

  const total = sourcesJournaux.reduce((a, s) => a + s.lignesParMin, 0);
  const volume = sourcesJournaux.reduce((a, s) => a + s.volumeJour, 0);
  const degradees = sourcesJournaux.filter((s) => s.etat !== "collecte");
  const brutes = sourcesJournaux.filter((s) => s.analyse !== "structurée");
  const nouveaux = collecte.motifs.filter((m) => m.nouveau);

  const configVolume = (): ChartConfiguration => {
    const o = optionsCommunes();
    const col = jeton("--serie-1");
    return {
      type: "line",
      data: {
        labels: HEURES,
        datasets: [{
          label: "Lignes par minute", data: collecte.volumeJour,
          borderColor: col, backgroundColor: voiler(col, 0.18),
          borderWidth: 2, fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 5,
          pointBackgroundColor: col, pointBorderColor: jeton("--surface"), pointBorderWidth: 2,
        }],
      },
      options: {
        ...o,
        scales: { ...o.scales, y: { ...o.scales.y, ticks: { ...o.scales.y.ticks, callback: (v) => fmt(Number(v), "compact") } } },
      },
    };
  };

  async function relancer(s: SourceJournaux) {
    const ok = await ui.confirmer({
      titre: `Relancer la collecte de « ${s.nom} » ?`,
      texte: `L'agent de collecte redémarre et reprend depuis son dernier point. ${s.retard > 60 ? `Il a ${Math.round(s.retard / 60)} heures de retard : le rattrapage produira une pointe de volume.` : ""}`,
      bouton: "Relancer", ton: "vigilance",
    });
    if (ok) ui.message(`Collecte de « ${s.nom} » relancée.`, "bon");
  }

  function detail(s: SourceJournaux) {
    ui.ouvrirTiroir({
      titre: s.nom,
      sous: <>{s.type} · <span className="font-mono">{s.cle}</span></>,
      onglets: [
        { nom: "Collecte", contenu: (
          <>
            <Definitions lignes={[
              ["Type", s.type],
              ["État", <Jeton ton={TON[s.etat]} enfants={s.etat} />],
              ["Débit", `${fmt(s.lignesParMin)} lignes par minute`],
              ["Volume", `${s.volumeJour} Gio par jour`],
              ["Retard", s.retard < 1 ? "aucun" : s.retard < 60 ? `${s.retard} min` : <span className="text-critique font-semibold">{Math.round(s.retard / 60)} h</span>],
              ["Analyse", <Jeton ton={s.analyse === "structurée" ? "bon" : s.analyse === "partielle" ? "vigilance" : "critique"} enfants={s.analyse} />],
              ["Champs extraits", s.champsExtraits ? String(s.champsExtraits) : "aucun"],
              ["Dernière ligne", s.derniereLigne],
              ["Conservation", `${s.retention} jours`],
            ]} />
            {s.analyse !== "structurée" && (
              <div className="mt-4 p-3 rounded-[4px] bg-vigilance-voile text-[12.5px] text-encre-2">
                <b className="text-vigilance">Analyse incomplète. </b>
                {s.analyse === "brute"
                  ? "Les lignes sont stockées telles quelles : on ne peut ni les filtrer par champ, ni y détecter un motif. Elles coûtent le même stockage qu'une source structurée, sans servir à rien de plus qu'un fichier texte."
                  : "Une partie des champs seulement est extraite. Les recherches sur les champs manquants retombent sur du texte libre."}
              </div>
            )}
          </>
        )},
      ],
      pied: s.etat !== "collecte"
        ? <Bouton ton="principal" icone="rafraichir" onClick={() => { ui.fermerTiroir(); relancer(s); }} enfants="Relancer la collecte" />
        : undefined,
    });
  }

  return (
    <>
      <Entete
        titre="Collecte des journaux"
        sous="Tout ce qui écrit un journal l'envoie ici : services, système, base, matériel, réseau, terminaux."
        actions={
          <>
            <Bouton icone="plus" onClick={() => ui.message("Déclaration de source à brancher.", "info")} enfants="Ajouter une source" />
            <Bouton icone="terminal" onClick={() => ui.message("Explorateur ouvert sur l'ensemble des sources.", "info")} enfants="Explorer" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sources" valeur={<NombreAnime valeur={sourcesJournaux.length} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Lignes par minute" valeur={<NombreAnime valeur={total} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Volume par jour" valeur={<NombreAnime valeur={volume} decimales={1} suffixe=" Gio" />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sources dégradées" valeur={<NombreAnime valeur={degradees.length} />} ton={degradees.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Analyse incomplète" valeur={<NombreAnime valeur={brutes.length} />} ton={brutes.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={
          <>
            <LigneStat etiquette="Stockage" valeur={`${fmt(collecte.stockage.total)} / ${fmt(collecte.stockage.capacite)} Gio`} />
            <Progression valeur={(collecte.stockage.total / collecte.stockage.capacite) * 100} ton="accent" />
          </>
        } />
      </div>

      {nouveaux.length > 0 && (
        <Apparition className="mb-4">
          <LigneAssistant
            texte={
              <>
                <b className="text-encre">Deux motifs d'erreur sont apparus aujourd'hui et n'existaient pas avant.</b>{" "}
                « {nouveaux[0].motif} » ({fmt(nouveaux[0].occurrences)} occurrences) et
                « {nouveaux[1]?.motif} ». Un motif nouveau vaut mieux qu'un seuil franchi : il signale
                un comportement que le système n'avait jamais eu, là où un seuil ne dit que « plus qu'avant ».
              </>
            }
            action={<Bouton taille="s" onClick={() => poserOnglet("motifs")} enfants="Voir les motifs" />}
          />
        </Apparition>
      )}

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 380px)" }}>
        <Carte enfants={
          <>
            <TeteCarte titre="Volume collecté" sous="Lignes par minute, toutes sources confondues"
              outils={<Jeton ton="neutre" point={false} enfants="24 h" />} />
            <Legende items={[{ nom: "Lignes par minute", couleur: "var(--serie-1)", valeur: fmt(total) }]} />
            <Graphique config={configVolume} hauteur={226} />
          </>
        } />

        <Carte enfants={
          <div className="pas-carte">
            <div className="flex items-start gap-4">
              <AnneauTotal taille={130}
                parts={collecte.repartition.map((r, i) => ({ nom: r.nom, valeur: r.v, couleur: `--serie-${i + 1}` }))}
                total={`${NF(1).format(volume)} Gio`} intitule="par jour" />
              <div className="min-w-0 flex-1">
                {collecte.repartition.map((r, i) => (
                  <div key={r.nom} className="flex items-center gap-2 py-[4px] text-[12px]">
                    <i className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: `var(--serie-${i + 1})` }} />
                    <span className="truncate flex-1 min-w-0">{r.nom}</span>
                    <span className="tab-num text-encre-2">{r.v} Gio</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        } />
      </div>

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "sources", nom: "Sources", compte: sourcesJournaux.length },
              { cle: "motifs", nom: "Motifs détectés", compte: collecte.motifs.length },
              { cle: "pipeline", nom: "Chaîne de traitement" },
              { cle: "stockage", nom: "Stockage et conservation" },
            ]}
          />

          <div className="pas-carte">
            {onglet === "sources" && (
              <div className="overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      {["Source", "Type", "Débit", "Volume/jour", "Retard", "Analyse", "Champs", "Conservation", ""].map((t, i) => (
                        <th key={t || i} className={cx(
                          "sticky top-0 bg-surface-2 px-3 py-[9px] border-b border-bordure whitespace-nowrap",
                          "text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3",
                          i >= 2 && i <= 4 ? "text-right" : i === 6 || i === 7 ? "text-right" : "text-left")}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sourcesJournaux.map((s) => (
                      <tr key={s.cle} className="hover:bg-surface-2 transi cursor-pointer" onClick={() => detail(s)}>
                        <td className="px-3 pas-ligne border-b border-bordure">
                          <span className="inline-flex items-center gap-[9px]">
                            <Pastille ton={TON[s.etat]} pulse={s.etat === "collecte"} />
                            <span className="font-medium">{s.nom}</span>
                          </span>
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure text-encre-2">{s.type}</td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{fmt(s.lignesParMin)}/min</td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{s.volumeJour} Gio</td>
                        <td className={cx("px-3 pas-ligne border-b border-bordure text-right tab-num",
                          s.retard > 60 ? "text-critique font-semibold" : s.retard > 5 ? "text-vigilance" : "")}>
                          {s.retard < 1 ? "—" : s.retard < 60 ? `${s.retard} min` : `${Math.round(s.retard / 60)} h`}
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure">
                          <Jeton ton={s.analyse === "structurée" ? "bon" : s.analyse === "partielle" ? "vigilance" : "critique"}
                            enfants={s.analyse} />
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right tab-num text-encre-2">
                          {s.champsExtraits || "—"}
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right tab-num text-encre-3">{s.retention} j</td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right">
                          {s.etat !== "collecte" && (
                            <span onClick={(e) => e.stopPropagation()}>
                              <Bouton ton="fantome" taille="s" icone="rafraichir" title="Relancer" onClick={() => relancer(s)} />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {onglet === "motifs" && (
              <>
                <p className="text-[12px] text-encre-3 mb-3">
                  Les lignes qui se ressemblent sont regroupées sous un motif. Ce qui compte n'est pas
                  le nombre d'occurrences mais la <b className="text-encre-2">tendance</b> — et
                  l'apparition d'un motif qui n'existait pas.
                </p>
                <ListeEchelonnee className="space-y-2">
                  {collecte.motifs.map((m) => (
                    <div key={m.motif} className={cx("flex items-start gap-3 p-3 rounded-[4px] border",
                      m.nouveau ? "border-vigilance/45 bg-vigilance-voile" : "border-bordure bg-surface-2")}>
                      <Icone nom={m.nouveau ? "etoiles" : "terminal"} taille="s"
                        className={cx("mt-[3px] shrink-0", m.nouveau ? "text-vigilance" : "text-encre-4")} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[12.5px]">{m.motif}</span>
                          {m.nouveau && <Jeton ton="vigilance" enfants="motif nouveau" />}
                        </div>
                        <div className="flex items-center gap-2 mt-[5px] flex-wrap text-[11px] text-encre-3">
                          première apparition {m.premiere} ·
                          {m.services.map((s) => (
                            <span key={s} className="font-mono px-[5px] py-[1px] rounded-[3px] bg-surface-3">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[14px] font-semibold tab-num">{fmt(m.occurrences)}</div>
                        <div className={cx("text-[11px] tab-num",
                          m.tendance > 0 ? "text-critique" : m.tendance < 0 ? "text-bon" : "text-encre-4")}>
                          {m.tendance > 0 ? "+" : ""}{m.tendance} sur 24 h
                        </div>
                      </div>
                    </div>
                  ))}
                </ListeEchelonnee>
              </>
            )}

            {onglet === "pipeline" && (
              <>
                <p className="text-[12px] text-encre-3 mb-4">
                  Une ligne traverse cinq étapes. Si une seule décroche, les suivantes travaillent sur
                  moins que ce qui est arrivé — sans que personne ne le voie dans l'explorateur.
                </p>
                <div className="flex items-stretch gap-2 flex-wrap">
                  {collecte.pipeline.map((e, i) => (
                    <div key={e.etape} className="flex items-center gap-2 flex-1 min-w-[180px]">
                      <div className={cx("flex-1 p-3 rounded-[4px] border anim-pousse",
                        e.etat === "bon" ? "border-bordure bg-surface-2" : "border-vigilance/45 bg-vigilance-voile")}
                        style={{ animationDelay: i * 60 + "ms" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Pastille ton={e.etat} pulse={e.etat === "bon"} />
                          <span className="text-[13px] font-semibold">{e.etape}</span>
                        </div>
                        <div className="text-[12px] tab-num text-encre-2">{e.debit}</div>
                        <div className="text-[11px] text-encre-3 mt-[2px]">{e.detail}</div>
                      </div>
                      {i < collecte.pipeline.length - 1 && (
                        <Icone nom="chevronDroite" taille="s" className="text-encre-4 shrink-0 max-lg:hidden" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-[4px] bg-vigilance-voile text-[12.5px] text-encre-2">
                  <b className="text-vigilance">300 lignes par minute se perdent à l'analyse. </b>
                  Elles arrivent mais ne sont pas structurées : elles viennent des pointeuses, dont le
                  format n'est pas reconnu. On les stocke, on les paye, et on ne peut rien en faire.
                </div>
              </>
            )}

            {onglet === "stockage" && (
              <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                <section>
                  <TeteCarte titre="Répartition" sous="Chaud pour la recherche, froid pour l'archive" />
                  <div className="pt-3">
                    <LigneStat etiquette="Stockage chaud (7 jours)" valeur={`${fmt(collecte.stockage.chaud)} Gio`} />
                    <LigneStat etiquette="Stockage froid" valeur={`${fmt(collecte.stockage.froid)} Gio`} />
                    <LigneStat etiquette="Total" valeur={`${fmt(collecte.stockage.total)} Gio`} />
                    <LigneStat etiquette="Capacité" valeur={`${fmt(collecte.stockage.capacite)} Gio`} />
                    <LigneStat etiquette="Coût mensuel" valeur={`${fmt(collecte.stockage.coutMois)} €`} />
                    <div className="mt-3">
                      <Progression valeur={(collecte.stockage.total / collecte.stockage.capacite) * 100} ton="accent" />
                      <div className="text-[11px] text-encre-3 mt-[4px]">
                        {Math.round((collecte.stockage.total / collecte.stockage.capacite) * 100)} % occupé
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <TeteCarte titre="Conservation par source" sous="Ce qu'on garde, et combien de temps" />
                  <div className="pt-3">
                    {[...sourcesJournaux].sort((a, b) => b.retention - a.retention).map((s) => (
                      <div key={s.cle} className="flex items-center gap-3 py-[6px] text-[12.5px]">
                        <span className="truncate flex-1 min-w-0">{s.nom}</span>
                        <BarreMini valeur={(s.retention / 730) * 100} largeur={80} />
                        <span className="tab-num text-encre-2 w-[56px] text-right">{s.retention} j</span>
                      </div>
                    ))}
                    <p className="text-[12px] text-encre-3 mt-3">
                      Les journaux du contrôleur matériel se gardent deux ans : ils sont minuscules et
                      servent à prouver une panne auprès du constructeur. Les journaux de pare-feu se
                      gardent quatre-vingt-dix jours : ils sont énormes et leur valeur s'épuise vite.
                    </p>
                  </div>
                </section>
              </div>
            )}
          </div>
        </>
      } />
    </>
  );
}
