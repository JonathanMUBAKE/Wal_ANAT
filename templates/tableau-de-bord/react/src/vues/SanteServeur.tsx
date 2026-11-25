import { useState } from "react";
import type { ChartConfiguration } from "chart.js";
import { BarreMini, Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, Progression } from "../composants/Primitives";
import { CarteGraphique, Graphique, Legende, optionsCommunes } from "../composants/Graphique";
import { AssistantIA } from "../composants/AssistantIA";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, fmt, jeton, voiler } from "../lib/format";
import { HEURES } from "../lib/donnees";
import {
  alimentations, certificats, chargeHistorique, disquesPhysiques, grappes,
  interfacesReseau, journalMateriel, memoire, systeme, systemesFichiers,
  temperatures, ventilateurs, type Capteur, type EtatMateriel,
} from "../lib/infrastructure";

const TON: Record<EtatMateriel, "bon" | "vigilance" | "critique" | "neutre"> = {
  bon: "bon", vigilance: "vigilance", critique: "critique", absent: "neutre",
};

/* Santé du serveur : ce qu'un contrôleur d'administration matériel montre —
   refroidissement, alimentation, mémoire, stockage, journal d'événements —
   plus l'état du système d'exploitation. Le résumé du haut doit suffire :
   si tout y est vert, on n'a pas besoin de descendre. */
export function SanteServeur() {
  const ui = useUI();
  const [onglet, poserOnglet] = useState("materiel");

  const critiques = [
    ...ventilateurs.filter((v) => v.etat === "critique").map((v) => `Ventilateur ${v.index} arrêté`),
    ...disquesPhysiques.filter((d) => d.etat === "critique").map((d) => `Disque ${d.baie} en panne`),
  ];
  const vigilances = [
    ...temperatures.filter((t) => t.etat === "vigilance").map((t) => t.nom),
    ...disquesPhysiques.filter((d) => d.etat === "vigilance").map((d) => `Disque ${d.baie}`),
    ...memoire.filter((m) => m.etat === "vigilance").map((m) => `Barrette ${m.fente}`),
    ...certificats.filter((c) => c.etat === "vigilance").map((c) => `Certificat ${c.nom}`),
  ];

  const etatGlobal: EtatMateriel = critiques.length ? "critique" : vigilances.length ? "vigilance" : "bon";
  const consommation = alimentations.reduce((a, p) => a + p.consommation, 0);
  const capacite = alimentations.reduce((a, p) => a + p.capacite, 0);
  const memoirePourcent = Math.round((systeme.memoireUtilisee / systeme.memoireTotale) * 100);

  const configCharge = (): ChartConfiguration => {
    const o = optionsCommunes();
    const series = [
      { nom: "Processeur", valeurs: chargeHistorique.processeur, couleur: "--serie-1" },
      { nom: "Mémoire", valeurs: chargeHistorique.memoire, couleur: "--serie-3" },
      { nom: "Attente d'entrées-sorties", valeurs: chargeHistorique.entreeSortie, couleur: "--serie-4" },
    ];
    return {
      type: "line",
      data: {
        labels: HEURES,
        datasets: series.map((s) => {
          const col = jeton(s.couleur);
          return {
            label: s.nom, data: s.valeurs, borderColor: col, backgroundColor: voiler(col, 0.14),
            borderWidth: 2, fill: true, tension: 0.32, pointRadius: 0, pointHoverRadius: 5,
            pointBackgroundColor: col, pointBorderColor: jeton("--surface"), pointBorderWidth: 2,
          };
        }),
      },
      options: {
        ...o,
        scales: { ...o.scales, y: { ...o.scales.y, max: 100, ticks: { ...o.scales.y.ticks, callback: (v) => v + " %" } } },
        plugins: { ...o.plugins, tooltip: { ...o.plugins.tooltip, callbacks: { label: (c) => ` ${c.dataset.label} : ${c.parsed.y} %` } } },
      },
    };
  };

  async function actionMaterielle(cle: string) {
    if (cle === "ventilateur") {
      const ok = await ui.confirmer({
        titre: "Passer le refroidissement en mode secours ?",
        texte: "Les cinq ventilateurs restants tourneront à pleine vitesse jusqu'au remplacement du ventilateur 5. Le serveur deviendra nettement plus bruyant et consommera davantage, mais les températures redescendront sous les seuils.",
        bouton: "Passer en secours", ton: "vigilance",
      });
      if (ok) ui.message("Refroidissement en mode secours. Ticket de remplacement à ouvrir.", "bon");
      return;
    }
    if (cle === "disque") {
      const ok = await ui.confirmer({
        titre: "Mettre le disque 0:1:3 hors ligne ?",
        texte: "La grappe RAID 5 passera en mode dégradé et reconstruira sur la réserve dynamique 0:1:5. Pendant la reconstruction, la perte d'un second disque entraînerait la perte des données. Comptez six à huit heures.",
        bouton: "Mettre hors ligne", ton: "danger", mot: "0:1:3",
      });
      if (ok) ui.message("Disque 0:1:3 hors ligne, reconstruction lancée sur 0:1:5.", "bon");
      return;
    }
    if (cle === "controle") {
      const ok = await ui.confirmer({
        titre: "Lancer un contrôle de cohérence ?",
        texte: "Le contrôle lit toute la grappe et corrige les écarts de parité. Il dure plusieurs heures et ralentit les entrées-sorties : à lancer hors des heures de travail.",
        bouton: "Lancer", ton: "vigilance",
      });
      if (ok) ui.message("Contrôle de cohérence lancé.", "bon");
    }
  }

  return (
    <>
      <Entete
        titre="Santé du serveur"
        sous={`${systeme.hote} · ${systeme.modele} · numéro de série ${systeme.numeroSerie}`}
        actions={
          <>
            <Bouton icone="telecharger" onClick={() => ui.message("Rapport de santé matérielle en préparation.", "bon")} enfants="Rapport de santé" />
            <Bouton icone="rafraichir" onClick={() => ui.message("Relevé des capteurs actualisé.", "bon", { duree: 1500 })} enfants="Actualiser" />
          </>
        }
      />

      {/* Résumé : six pavés, un par sous-ensemble matériel */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <PaveEtat icone="boussole" nom="État général" etat={etatGlobal}
          detail={critiques.length ? `${critiques.length} panne${critiques.length > 1 ? "s" : ""}` : vigilances.length ? `${vigilances.length} à surveiller` : "tout est normal"} />
        <PaveEtat icone="thermometre" nom="Refroidissement" etat={ventilateurs.some((v) => v.etat === "critique") ? "critique" : "bon"}
          detail={`${ventilateurs.filter((v) => v.etat !== "critique").length} / ${ventilateurs.length} ventilateurs`} />
        <PaveEtat icone="alimentation" nom="Alimentation" etat="bon"
          detail={`${fmt(consommation)} W sur ${fmt(capacite)} W`} />
        <PaveEtat icone="memoire" nom="Mémoire" etat={memoire.some((m) => m.etat === "vigilance") ? "vigilance" : "bon"}
          detail={`${memoire.filter((m) => m.etat !== "absent").length} barrettes · ${memoire.reduce((a, m) => a + m.capacite, 0)} Gio`} />
        <PaveEtat icone="disque" nom="Stockage" etat={disquesPhysiques.some((d) => d.etat === "vigilance") ? "vigilance" : "bon"}
          detail={`${disquesPhysiques.length} disques · ${grappes.length} grappes`} />
        <PaveEtat icone="puce" nom="Système" etat="bon"
          detail={`charge ${systeme.charge[0]} · ${systeme.demarre}`} />
      </div>

      {/* L'assistant lit le journal matériel et relie les événements entre eux */}
      <div className="mb-4">
        <AssistantIA
          invite="Sur les sept derniers événements matériels et les relevés de capteurs."
          modele="Modèle de raisonnement"
          cout={0.018}
          surAction={() => actionMaterielle("ventilateur")}
          constat={{
            resume: "Le ventilateur 5 s'est arrêté à 14 h 02 ; les températures de la zone arrière montent depuis, sans avoir encore atteint les seuils d'alerte.",
            cause: "Panne mécanique du ventilateur, et non une consigne de régulation : les cinq autres ont augmenté leur vitesse au même instant, ce qui est la réaction normale du contrôleur à une perte de redondance. La coupure d'onduleur de la veille à 22 h 11 n'est probablement pas liée — elle concerne une autre alimentation et le ventilateur a tourné seize heures après.",
            certitude: "élevée",
            preuves: [
              { source: "FAN0005 · 14:02", extrait: "Le ventilateur 5 ne tourne plus. La redondance de refroidissement est perdue." },
              { source: "Capteur · sortie d'air", extrait: `${temperatures[6].valeur} °C, seuil de vigilance à ${temperatures[6].seuilVigilance} °C` },
              { source: "Ventilateurs 1-4, 6", extrait: `vitesses relevées entre ${Math.min(...ventilateurs.filter((v) => v.pourcentage > 0).map((v) => v.pourcentage))} % et ${Math.max(...ventilateurs.map((v) => v.pourcentage))} %` },
            ],
            pistes: [
              "Vérifier à l'œil que la baie 5 n'est pas obstruée avant de conclure à la panne du moteur.",
              "Comparer la montée de température de la zone arrière à celle d'avant 14 h 02 pour estimer la marge restante.",
              "Ouvrir un ticket de remplacement : sans redondance, une seconde panne impose l'arrêt du serveur.",
            ],
            action: {
              libelle: "Passer le refroidissement en mode secours",
              consequence: "Les cinq ventilateurs restants passeront à pleine vitesse jusqu'au remplacement.",
            },
          }}
        />
      </div>

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "materiel", nom: "Matériel" },
              { cle: "systeme", nom: "Système d'exploitation" },
              { cle: "stockage", nom: "Stockage", compte: disquesPhysiques.length },
              { cle: "reseau", nom: "Réseau et certificats" },
              { cle: "journal", nom: "Journal matériel", compte: journalMateriel.length },
            ]}
          />

          <div className="pas-carte">
            {onglet === "materiel" && (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                <section>
                  <TitreBloc icone="thermometre" nom="Températures" sous="Mesure, seuil de vigilance, seuil critique" />
                  {temperatures.map((t) => <LigneCapteur key={t.nom} c={t} />)}
                </section>

                <section>
                  <TitreBloc icone="ventilateur" nom="Ventilateurs" sous="Vitesse et redondance" />
                  {ventilateurs.map((v) => (
                    <div key={v.index} className="flex items-center gap-3 py-[7px] border-b border-bordure last:border-0">
                      <Pastille ton={TON[v.etat]} pulse={v.etat === "bon"} />
                      <span className="text-[13px] w-[108px] shrink-0">Ventilateur {v.index}</span>
                      <span className="text-[11px] text-encre-3 w-[96px] shrink-0 truncate">{v.emplacement}</span>
                      <BarreMini valeur={v.pourcentage} ton={v.etat === "critique" ? "critique" : v.pourcentage > 72 ? "vigilance" : "accent"} largeur={70} />
                      <span className="ml-auto text-[12px] tab-num text-right">
                        {v.vitesse ? `${fmt(v.vitesse)} tr/min` : <span className="text-critique font-semibold">arrêté</span>}
                      </span>
                    </div>
                  ))}
                  {ventilateurs.some((v) => v.etat === "critique") && (
                    <Bouton taille="s" className="mt-3" icone="ventilateur"
                      onClick={() => actionMaterielle("ventilateur")} enfants="Passer en mode secours" />
                  )}
                </section>

                <section>
                  <TitreBloc icone="alimentation" nom="Alimentation" sous="Blocs redondants et consommation" />
                  {alimentations.map((p) => (
                    <div key={p.index} className="py-[7px] border-b border-bordure last:border-0">
                      <div className="flex items-center gap-2 mb-[4px]">
                        <Pastille ton={TON[p.etat]} pulse />
                        <span className="text-[13px] font-medium">Bloc {p.index}</span>
                        {p.redondante && <Jeton ton="bon" point={false} enfants="redondant" />}
                        <span className="ml-auto text-[12px] tab-num">{p.consommation} W</span>
                      </div>
                      <div className="text-[11px] text-encre-3 mb-[4px]">{p.modele} · {p.entree}</div>
                      <Progression valeur={(p.consommation / p.capacite) * 100} ton="bon" />
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-bordure">
                    <LigneStat etiquette="Consommation totale" valeur={`${fmt(consommation)} W`} />
                    <LigneStat etiquette="Marge avant perte de redondance" valeur={`${fmt(capacite / 2 - consommation)} W`} ton="bon" />
                  </div>
                </section>

                <section>
                  <TitreBloc icone="memoire" nom="Mémoire" sous="Barrettes et erreurs corrigées" />
                  <div className="grid grid-cols-4 gap-[6px] mb-3">
                    {memoire.map((m) => (
                      <div key={m.fente} title={`${m.fente} — ${m.capacite ? m.capacite + " Gio" : "fente vide"}`}
                        className={cx(
                          "p-[6px] rounded-[4px] border text-center",
                          m.etat === "absent" ? "border-dashed border-bordure-2 text-encre-4"
                            : m.etat === "vigilance" ? "border-vigilance/50 bg-vigilance-voile text-vigilance"
                            : "border-bordure bg-surface-2",
                        )}>
                        <div className="text-[10px] font-mono">{m.fente}</div>
                        <div className="text-[12px] font-semibold tab-num">{m.capacite ? m.capacite : "—"}</div>
                      </div>
                    ))}
                  </div>
                  {memoire.filter((m) => m.erreursCorrigees > 100).map((m) => (
                    <div key={m.fente} className="flex items-start gap-2 p-[8px] rounded-[4px] bg-vigilance-voile text-[12px]">
                      <Icone nom="alerte" taille="s" className="text-vigilance mt-[2px]" />
                      <span className="text-encre-2">
                        Barrette <b>{m.fente}</b> : {fmt(m.erreursCorrigees)} erreurs corrigées. Une barrette qui
                        corrige beaucoup finit par ne plus y arriver — à remplacer à la prochaine fenêtre.
                      </span>
                    </div>
                  ))}
                </section>
              </div>
            )}

            {onglet === "systeme" && (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                <section className="xl:col-span-2">
                  <CarteGraphique titre="Charge du système" sous="Processeur, mémoire et attente d'entrées-sorties, sur 24 heures"
                    legende={<Legende items={[
                      { nom: "Processeur", couleur: "var(--serie-1)", valeur: systeme.processeurUtilise + " %" },
                      { nom: "Mémoire", couleur: "var(--serie-3)", valeur: memoirePourcent + " %" },
                      { nom: "Attente d'E/S", couleur: "var(--serie-4)", valeur: systeme.processeurAttenteES + " %" },
                    ]} />}
                    enfants={<Graphique config={configCharge} hauteur={230} />}
                  />
                </section>

                <section>
                  <TitreBloc icone="puce" nom="Système" sous="Identité et charge" />
                  <LigneStat etiquette="Système" valeur={systeme.systeme} />
                  <LigneStat etiquette="Processeurs" valeur={systeme.processeurs} />
                  <LigneStat etiquette="Démarré" valeur={systeme.demarre} />
                  <LigneStat etiquette="Charge (1, 5, 15 min)" valeur={systeme.charge.join(" · ")} />
                  <LigneStat etiquette="Mémoire" valeur={`${systeme.memoireUtilisee} / ${systeme.memoireTotale} Gio`}
                    ton={memoirePourcent > 85 ? "vigilance" : undefined} />
                  <LigneStat etiquette="Cache" valeur={`${systeme.memoireCache} Gio`} />
                  <LigneStat etiquette="Espace d'échange" valeur={`${systeme.echange} / ${systeme.echangeTotal} Gio`}
                    ton={systeme.echange > 1 ? "vigilance" : "bon"} />
                  <LigneStat etiquette="Écart d'horloge" valeur={`${systeme.horloge.ecart} ${systeme.horloge.unite}`} ton="bon" />
                </section>

                <section>
                  <TitreBloc icone="boite" nom="Mises à jour" sous="Paquets en attente" />
                  <LigneStat etiquette="Paquets à mettre à jour" valeur={String(systeme.misesAJour.total)} />
                  <LigneStat etiquette="Dont correctifs de sécurité" valeur={String(systeme.misesAJour.securite)} ton="vigilance" />
                  <LigneStat etiquette="Redémarrage requis" valeur={systeme.misesAJour.redemarrageRequis ? "oui" : "non"}
                    ton={systeme.misesAJour.redemarrageRequis ? "vigilance" : "bon"} />
                  <div className="mt-3 p-3 rounded-[4px] bg-surface-2 border border-bordure text-[12px] text-encre-2">
                    Un redémarrage coupe le SIGRH pour tous les agents. À planifier avec la direction
                    des ressources humaines, hors période de clôture de paie.
                  </div>
                  <Bouton taille="s" className="mt-3" icone="telecharger"
                    onClick={() => ui.message("Les paquets sont téléchargés mais non appliqués.", "bon")}
                    enfants="Préparer les mises à jour" />
                </section>
              </div>
            )}

            {onglet === "stockage" && (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
                <section>
                  <TitreBloc icone="disque" nom="Grappes" sous="Niveau, état, opérations en cours" />
                  {grappes.map((g) => (
                    <div key={g.nom} className="p-3 mb-2 rounded-[4px] border border-bordure bg-surface-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Pastille ton={TON[g.etat]} />
                        <span className="text-[13px] font-semibold">{g.nom}</span>
                        <Jeton ton="accent" point={false} enfants={g.niveau} />
                        <span className="ml-auto text-[12px] tab-num text-encre-2">{g.capacite}</span>
                      </div>
                      <Progression valeur={g.utilise} ton={g.utilise > 85 ? "critique" : g.utilise > 70 ? "accent" : "bon"} />
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-encre-3 flex-wrap">
                        <span>{g.utilise} % occupé</span>
                        <span>{g.disques} disques</span>
                        <span>réserve : {g.reserve}</span>
                        <span>contrôle : {g.dernierControle}</span>
                      </div>
                      {g.operation && (
                        <div className="mt-2 pt-2 border-t border-bordure">
                          <div className="flex items-center gap-2 text-[12px] mb-[4px]">
                            <Icone nom="rafraichir" taille="s" className="text-accent animate-spin [animation-duration:2s]" />
                            {g.operation.nom}
                            <span className="ml-auto tab-num text-accent">{g.operation.avancement} %</span>
                          </div>
                          <Progression valeur={g.operation.avancement} />
                        </div>
                      )}
                      {!g.operation && (
                        <Bouton taille="s" className="mt-2" icone="check"
                          onClick={() => actionMaterielle("controle")} enfants="Contrôle de cohérence" />
                      )}
                    </div>
                  ))}
                </section>

                <section>
                  <TitreBloc icone="base" nom="Disques physiques" sous="État, usure, secteurs réalloués" />
                  <div className="overflow-auto">
                    <table className="w-full border-separate border-spacing-0 text-[12.5px]">
                      <thead>
                        <tr>
                          {["Baie", "Type", "Capacité", "Heures", "Réalloués", "Usure", "T°"].map((t, i) => (
                            <th key={t} className={cx("sticky top-0 bg-surface-2 px-2 py-[7px] border-b border-bordure text-[10.5px] font-semibold uppercase tracking-[.06em] text-encre-3", i > 2 ? "text-right" : "text-left")}>{t}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {disquesPhysiques.map((d) => (
                          <tr key={d.baie} className="hover:bg-surface-2 transi">
                            <td className="px-2 py-[7px] border-b border-bordure">
                              <span className="inline-flex items-center gap-2">
                                <Pastille ton={TON[d.etat]} />
                                <span className="font-mono">{d.baie}</span>
                              </span>
                            </td>
                            <td className="px-2 py-[7px] border-b border-bordure text-encre-2">{d.type}</td>
                            <td className="px-2 py-[7px] border-b border-bordure text-encre-2">{d.capacite}</td>
                            <td className="px-2 py-[7px] border-b border-bordure text-right tab-num">{fmt(d.heures)}</td>
                            <td className={cx("px-2 py-[7px] border-b border-bordure text-right tab-num", d.reallouees > 100 && "text-vigilance font-semibold")}>{d.reallouees}</td>
                            <td className="px-2 py-[7px] border-b border-bordure text-right tab-num">{d.usure} %</td>
                            <td className="px-2 py-[7px] border-b border-bordure text-right tab-num">{d.temperature} °C</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {disquesPhysiques.some((d) => d.reallouees > 100) && (
                    <div className="mt-3 flex items-start gap-2 p-[8px] rounded-[4px] bg-vigilance-voile text-[12px]">
                      <Icone nom="alerte" taille="s" className="text-vigilance mt-[2px]" />
                      <span className="text-encre-2 flex-1">
                        Le disque 0:1:3 a réalloué 164 secteurs. Un disque qui en réalloue continue
                        souvent jusqu'à la panne : mieux vaut le remplacer avant, grappe en bon état.
                      </span>
                      <Bouton taille="s" onClick={() => actionMaterielle("disque")} enfants="Mettre hors ligne" />
                    </div>
                  )}
                </section>

                <section className="xl:col-span-2">
                  <TitreBloc icone="boite" nom="Systèmes de fichiers" sous="Espace occupé par point de montage" />
                  {systemesFichiers.map((f) => {
                    const pct = Math.round((f.utilise / f.taille) * 100);
                    return (
                      <div key={f.point} className="flex items-center gap-3 py-[7px] border-b border-bordure last:border-0">
                        <span className="font-mono text-[12px] w-[180px] shrink-0 truncate">{f.point}</span>
                        <span className="text-[11px] text-encre-3 w-[64px] shrink-0">{f.type}</span>
                        <BarreMini valeur={pct} ton={pct > 90 ? "critique" : pct > 78 ? "vigilance" : "accent"} largeur={120} />
                        <span className={cx("text-[12px] tab-num w-[46px] text-right", pct > 90 && "text-critique font-semibold")}>{pct} %</span>
                        <span className="ml-auto text-[12px] tab-num text-encre-3">
                          {f.utilise >= 1000 ? (f.utilise / 1000).toFixed(2) + " Tio" : f.utilise + " Gio"} sur{" "}
                          {f.taille >= 1000 ? (f.taille / 1000).toFixed(2) + " Tio" : f.taille + " Gio"}
                        </span>
                      </div>
                    );
                  })}
                </section>
              </div>
            )}

            {onglet === "reseau" && (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
                <section>
                  <TitreBloc icone="prise" nom="Interfaces" sous="Débit, erreurs, rejets" />
                  {interfacesReseau.map((i) => (
                    <div key={i.nom} className="py-[8px] border-b border-bordure last:border-0">
                      <div className="flex items-center gap-2 mb-[4px]">
                        <Pastille ton={i.erreurs > 0 ? "vigilance" : "bon"} pulse={i.erreurs === 0} />
                        <span className="font-mono text-[12.5px] font-semibold">{i.nom}</span>
                        <span className="text-[11px] text-encre-3">{i.debit}</span>
                        {i.erreurs > 0 && <Jeton ton="vigilance" enfants={`${i.erreurs} erreurs`} />}
                      </div>
                      <div className="flex items-center gap-4 text-[12px] text-encre-2 tab-num">
                        <span className="inline-flex items-center gap-1"><Icone nom="tendanceBas" taille="s" className="text-encre-4" />{i.entrant} Mb/s</span>
                        <span className="inline-flex items-center gap-1"><Icone nom="tendanceHaut" taille="s" className="text-encre-4" />{i.sortant} Mb/s</span>
                        <span className="ml-auto text-encre-3">{i.rejets} rejets</span>
                      </div>
                    </div>
                  ))}
                </section>

                <section>
                  <TitreBloc icone="bouclier" nom="Certificats" sous="Échéances surveillées" />
                  {certificats.map((c) => (
                    <div key={c.nom} className="flex items-center gap-3 py-[8px] border-b border-bordure last:border-0">
                      <Pastille ton={TON[c.etat]} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium truncate">{c.nom}</span>
                        <span className="block text-[11px] text-encre-3">{c.emetteur}</span>
                      </span>
                      <span className={cx("text-[12px] tab-num text-right shrink-0", c.jours < 30 && "text-vigilance font-semibold")}>
                        {c.expire}
                      </span>
                    </div>
                  ))}
                  <div className="mt-3 p-3 rounded-[4px] bg-surface-2 border border-bordure text-[12px] text-encre-2">
                    Un certificat expiré coupe l'accès sans message compréhensible pour les agents.
                    La surveillance alerte à trente jours, puis chaque jour sous sept jours.
                  </div>
                </section>
              </div>
            )}

            {onglet === "journal" && (
              <div className="overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      {["Horodatage", "Gravité", "Source", "Code", "Message"].map((t) => (
                        <th key={t} className="sticky top-0 bg-surface-2 px-3 py-[9px] border-b border-bordure text-left text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3 whitespace-nowrap">{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {journalMateriel.map((e, i) => (
                      <tr key={i} className="hover:bg-surface-2 transi cursor-pointer"
                        onClick={() => ui.ouvrirTiroir({
                          titre: e.message,
                          sous: <span className="font-mono">{e.code}</span>,
                          onglets: [{
                            nom: "Événement",
                            contenu: <Definitions lignes={[
                              ["Horodatage", e.horo], ["Source", e.source],
                              ["Code", <span className="font-mono">{e.code}</span>],
                              ["Gravité", <Jeton ton={e.gravite} enfants={e.gravite} />],
                              ["Message", e.message],
                            ]} />,
                          }],
                        })}>
                        <td className="px-3 pas-ligne border-b border-bordure font-mono text-encre-3 whitespace-nowrap">{e.horo}</td>
                        <td className="px-3 pas-ligne border-b border-bordure"><Jeton ton={e.gravite} enfants={e.gravite} /></td>
                        <td className="px-3 pas-ligne border-b border-bordure text-encre-2">{e.source}</td>
                        <td className="px-3 pas-ligne border-b border-bordure font-mono text-[12px] text-encre-3">{e.code}</td>
                        <td className="px-3 pas-ligne border-b border-bordure">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      } />
    </>
  );
}

function PaveEtat({ icone, nom, etat, detail }: {
  icone: Parameters<typeof Icone>[0]["nom"]; nom: string; etat: EtatMateriel; detail: string;
}) {
  const fond = {
    bon: "bg-bon-voile text-bon", vigilance: "bg-vigilance-voile text-vigilance",
    critique: "bg-critique-voile text-critique", absent: "bg-surface-3 text-encre-3",
  }[etat];
  return (
    <Carte className={cx("pas-carte", etat === "critique" && "border-critique/50")} enfants={
      <>
        <div className="flex items-center gap-2 mb-2">
          <span className={cx("w-[26px] h-[26px] rounded-[4px] grid place-items-center shrink-0", fond)}>
            <Icone nom={icone} taille="s" />
          </span>
          <span className="text-[11.5px] font-semibold uppercase tracking-[.055em] text-encre-3 truncate">{nom}</span>
        </div>
        <div className="flex items-center gap-2">
          <Pastille ton={TON[etat]} pulse={etat !== "bon"} />
          <span className="text-[13px] text-encre-2 truncate">{detail}</span>
        </div>
      </>
    } />
  );
}

function TitreBloc({ icone, nom, sous }: {
  icone: Parameters<typeof Icone>[0]["nom"]; nom: string; sous: string;
}) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <Icone nom={icone} taille="s" className="text-encre-4 mt-[3px]" />
      <div>
        <h3 className="text-[13px] font-semibold">{nom}</h3>
        <p className="text-[11.5px] text-encre-3">{sous}</p>
      </div>
    </div>
  );
}

function LigneCapteur({ c }: { c: Capteur }) {
  const part = Math.min(100, (c.valeur / c.seuilCritique) * 100);
  const vigilance = (c.seuilVigilance / c.seuilCritique) * 100;
  return (
    <div className="py-[7px] border-b border-bordure last:border-0">
      <div className="flex items-baseline gap-2 mb-[4px]">
        <span className="text-[13px]">{c.nom}</span>
        <span className="text-[11px] text-encre-3">{c.emplacement}</span>
        <span className={cx("ml-auto text-[13px] font-semibold tab-num",
          c.etat === "critique" ? "text-critique" : c.etat === "vigilance" ? "text-vigilance" : "")}>
          {c.valeur} {c.unite}
        </span>
      </div>
      <div className="relative h-[5px] rounded-full bg-surface-3 overflow-hidden">
        <i className={cx("block h-full rounded-full transition-[width] duration-500",
          c.etat === "critique" ? "bg-critique" : c.etat === "vigilance" ? "bg-vigilance" : "bg-bon")}
          style={{ width: part + "%" }} />
        <i className="absolute top-0 bottom-0 w-px bg-vigilance/70" style={{ left: vigilance + "%" }}
           title={`Seuil de vigilance : ${c.seuilVigilance} ${c.unite}`} />
      </div>
    </div>
  );
}
