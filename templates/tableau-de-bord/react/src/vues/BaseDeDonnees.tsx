import { useState } from "react";
import type { ChartConfiguration } from "chart.js";
import { BarreMini, Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, Progression, TeteCarte } from "../composants/Primitives";
import { CarteGraphique, Graphique, Legende, optionsCommunes } from "../composants/Graphique";
import { AssistantIA } from "../composants/AssistantIA";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, fmt, jeton, voiler } from "../lib/format";
import { HEURES } from "../lib/donnees";
import {
  baseInfo, connexions, metriquesBase, replication, requetesLentes,
  sessionsBase, tables, verrous, type RequeteLente, type TableBase,
} from "../lib/infrastructure";

/* Base de données : les cinq endroits où une base se dégrade sans prévenir —
   les connexions, les requêtes lentes, les verrous, le gonflement des tables,
   la réplication. Les seuils retenus sont les repères usuels de supervision
   PostgreSQL : 70 et 90 % de connexions, 10 et 20 % de tuples morts,
   30 secondes et 5 minutes de retard de réplication. */
export function BaseDeDonnees() {
  const ui = useUI();
  const [onglet, poserOnglet] = useState("apercu");

  const totalConnexions = connexions.actives + connexions.inactives + connexions.inactivesTransaction;
  const partConnexions = Math.round((totalConnexions / baseInfo.connexionsMax) * 100);
  const tablesGonflees = tables.filter((t) => t.ratioMorts >= 10);
  const retardMax = Math.max(...replication.secondaires.map((s) => s.retard));
  const emplacementsRisque = replication.emplacements.filter((e) => e.risque);

  const configActivite = (): ChartConfiguration => {
    const o = optionsCommunes();
    const series = [
      { nom: "Transactions par seconde", valeurs: metriquesBase.transactions, couleur: "--serie-1" },
      { nom: "Lectures disque par seconde", valeurs: metriquesBase.lecturesDisque, couleur: "--serie-2" },
    ];
    return {
      type: "line",
      data: {
        labels: HEURES,
        datasets: series.map((s) => {
          const col = jeton(s.couleur);
          return {
            label: s.nom, data: s.valeurs, borderColor: col, backgroundColor: voiler(col, 0.16),
            borderWidth: 2, fill: true, tension: 0.32, pointRadius: 0, pointHoverRadius: 5,
            pointBackgroundColor: col, pointBorderColor: jeton("--surface"), pointBorderWidth: 2,
          };
        }),
      },
      options: {
        ...o,
        scales: { ...o.scales, y: { ...o.scales.y, ticks: { ...o.scales.y.ticks, callback: (v) => fmt(Number(v), "compact") } } },
      },
    };
  };

  async function terminerSession(pid: number) {
    const ok = await ui.confirmer({
      titre: `Terminer la session ${pid} ?`,
      texte: "La transaction en cours sera annulée et le client recevra une erreur. C'est le geste à faire pour libérer un verrou qui bloque les autres, mais le travail non validé est perdu.",
      bouton: "Terminer la session", ton: "danger",
    });
    if (ok) ui.message(`Session ${pid} terminée. Les sessions bloquées repartent.`, "bon");
  }

  async function lancerVacuum(t: TableBase) {
    const ok = await ui.confirmer({
      titre: `Lancer un VACUUM sur ${t.nom} ?`,
      texte: `La table contient ${fmt(t.tuplesMorts)} tuples morts, soit ${t.ratioMorts} % de son contenu. Le nettoyage rend l'espace réutilisable sans le restituer au système de fichiers. Il ne bloque pas les lectures, mais il sollicite fortement le disque : à lancer hors des heures de travail.`,
      bouton: "Lancer le nettoyage", ton: "vigilance",
    });
    if (ok) ui.message(`VACUUM ANALYZE lancé sur ${t.nom}.`, "bon");
  }

  async function supprimerEmplacement(nom: string) {
    const ok = await ui.confirmer({
      titre: `Supprimer l'emplacement de réplication « ${nom} » ?`,
      texte: "Cet emplacement retient 412 Gio de journaux pour un secondaire qui ne se connecte plus. Tant qu'il existe, la base garde ces fichiers et le disque se remplit. Sa suppression est définitive : le secondaire concerné devra être reconstruit depuis une sauvegarde.",
      bouton: "Supprimer définitivement", ton: "danger", mot: nom,
    });
    if (ok) ui.message(`Emplacement « ${nom} » supprimé. 412 Gio seront libérés au prochain point de contrôle.`, "bon");
  }

  return (
    <>
      <Entete
        titre="Base de données"
        sous={`${baseInfo.moteur} · ${baseInfo.role} · ${baseInfo.taille} · démarrée ${baseInfo.demarree}`}
        actions={
          <>
            <Bouton icone="telecharger" onClick={() => ui.message("Rapport d'état de la base en préparation.", "bon")} enfants="Rapport" />
            <Bouton icone="rafraichir" onClick={() => ui.message("Relevés actualisés.", "bon", { duree: 1500 })} enfants="Actualiser" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Carte className="pas-carte" enfants={
          <>
            <LigneStat etiquette="Connexions" valeur={`${totalConnexions} / ${baseInfo.connexionsMax}`}
              ton={partConnexions > 90 ? "critique" : partConnexions > 70 ? "vigilance" : "bon"} />
            <Progression valeur={partConnexions} ton={partConnexions > 90 ? "critique" : partConnexions > 70 ? "accent" : "bon"} />
          </>
        } />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Taux de cache" valeur={`${metriquesBase.cacheRatio} %`} ton={metriquesBase.cacheRatio > 99 ? "bon" : "vigilance"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Verrous bloquants" valeur={String(verrous.length)} ton={verrous.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Tables gonflées" valeur={String(tablesGonflees.length)} ton={tablesGonflees.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Retard de réplication" valeur={`${retardMax} s`} ton={retardMax > 300 ? "critique" : retardMax > 30 ? "vigilance" : "bon"} />} />
      </div>

      {emplacementsRisque.length > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-critique-voile border border-critique/40 anim-apparait">
          <Icone nom="base" className="text-critique mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,220px)] text-[13px]">
            <b>Un emplacement de réplication oublié retient 412 Gio de journaux.</b>{" "}
            <span className="text-encre-2">
              « {emplacementsRisque[0].nom} » appartient à un secondaire qui ne se connecte plus.
              Tant qu'il existe, la base conserve ces fichiers — c'est la façon la plus courante
              de remplir un disque et d'arrêter la production sans que rien n'ait changé.
            </span>
          </div>
          <Bouton taille="s" ton="danger" onClick={() => supprimerEmplacement(emplacementsRisque[0].nom)} enfants="Supprimer" />
        </div>
      )}

      <div className="mb-4">
        <AssistantIA
          invite="Sur les requêtes, les verrous et les relevés de la dernière heure."
          modele="Modèle de raisonnement"
          cout={0.021}
          constat={{
            resume: "Deux sessions attendent depuis près de quatre minutes sur la table des soldes de congés, derrière une transaction restée ouverte.",
            cause: "Une transaction du compte applicatif a pris un verrou de ligne sur soldes_conges et ne l'a jamais relâché — la session est dans l'état « inactive dans une transaction ». Ce n'est pas un problème de charge : le taux de cache est normal et les transactions par seconde n'ont pas bougé. C'est une transaction qu'un code a ouverte et n'a pas fermée.",
            certitude: "élevée",
            preuves: [
              { source: "pg_locks", extrait: "pid 24180 bloque 24412 et 24590 sur soldes_conges, mode RowExclusiveLock" },
              { source: "pg_stat_activity", extrait: `${connexions.inactivesTransaction} sessions « idle in transaction »` },
              { source: "pg_stat_statements", extrait: "UPDATE soldes_conges : 62 ms en moyenne — la requête elle-même est rapide" },
            ],
            pistes: [
              "Regarder depuis combien de temps la session 24180 est inactive : au-delà de quelques minutes, c'est une transaction oubliée.",
              "Terminer la session 24180 pour libérer les deux autres, puis chercher dans le code le chemin qui ouvre sans fermer.",
              "Au passage : cette même transaction empêche le nettoyage de la table, dont le ratio de tuples morts est monté à 45,6 %.",
            ],
            action: {
              libelle: "Terminer la session 24180",
              consequence: "Sa transaction sera annulée, les deux sessions bloquées repartiront aussitôt.",
            },
          }}
          surAction={() => terminerSession(24180)}
        />
      </div>

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "apercu", nom: "Aperçu" },
              { cle: "requetes", nom: "Requêtes lentes", compte: requetesLentes.length },
              { cle: "verrous", nom: "Verrous", compte: verrous.length },
              { cle: "tables", nom: "Tables et nettoyage", compte: tables.length },
              { cle: "replication", nom: "Réplication" },
              { cle: "sessions", nom: "Sessions", compte: sessionsBase.length },
            ]}
          />

          <div className={onglet === "apercu" ? "" : "pas-carte"}>
            {onglet === "apercu" && (
              <>
                <CarteGraphique titre="Activité de la base" sous="Transactions et lectures disque, sur 24 heures"
                  legende={<Legende items={[
                    { nom: "Transactions par seconde", couleur: "var(--serie-1)", valeur: fmt(metriquesBase.transactions.at(-1) ?? 0) },
                    { nom: "Lectures disque par seconde", couleur: "var(--serie-2)", valeur: fmt(metriquesBase.lecturesDisque.at(-1) ?? 0) },
                  ]} />}
                  enfants={<Graphique config={configActivite} hauteur={240} />}
                />
                <div className="pas-carte grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                  <section>
                    <TeteCarte titre="Connexions" sous="Par état, repères à 70 et 90 % du maximum" />
                    <div className="pt-3">
                      <LigneStat etiquette="Actives" valeur={String(connexions.actives)} ton="bon" />
                      <LigneStat etiquette="Inactives" valeur={String(connexions.inactives)} />
                      <LigneStat etiquette="Inactives dans une transaction" valeur={String(connexions.inactivesTransaction)}
                        ton={connexions.inactivesTransaction > 5 ? "vigilance" : undefined} />
                      <LigneStat etiquette="En attente d'un verrou" valeur={String(connexions.enAttente)}
                        ton={connexions.enAttente ? "vigilance" : "bon"} />
                      <LigneStat etiquette="Réservées à l'administration" valeur={String(connexions.reservees)} />
                      <p className="text-[12px] text-encre-3 mt-3">
                        Une session « inactive dans une transaction » tient ses verrous et empêche le
                        nettoyage. C'est le premier chiffre à regarder quand la base ralentit sans raison.
                      </p>
                    </div>
                  </section>
                  <section>
                    <TeteCarte titre="Fiche technique" sous="Ce qui tourne réellement" />
                    <div className="pt-3">
                      <LigneStat etiquette="Version" valeur={baseInfo.version} />
                      <LigneStat etiquette="Rôle" valeur={baseInfo.role} />
                      <LigneStat etiquette="Taille totale" valeur={baseInfo.taille} />
                      <LigneStat etiquette="Encodage" valeur={baseInfo.encodage} />
                      <LigneStat etiquette="Fuseau" valeur={baseInfo.fuseau} />
                      <LigneStat etiquette="Démarrée" valeur={baseInfo.demarree} />
                    </div>
                  </section>
                </div>
              </>
            )}

            {onglet === "requetes" && (
              <>
                <p className="text-[12px] text-encre-3 mb-3">
                  Classées par temps total passé, pas par lenteur unitaire : une requête de 4 ms appelée
                  un million de fois coûte plus cher qu'une requête de 40 secondes appelée une fois.
                </p>
                <div className="space-y-2">
                  {requetesLentes.map((r, i) => (
                    <button key={r.id} type="button"
                      onClick={() => detailRequete(ui, r)}
                      className="w-full text-left p-3 rounded-[4px] border border-bordure bg-surface-2 hover:border-bordure-2 transi anim-entre"
                      style={{ animationDelay: i * 30 + "ms" }}>
                      <div className="flex items-start gap-3 mb-2">
                        <span className="font-mono text-[12px] text-encre-2 flex-1 min-w-0 [overflow-wrap:anywhere]">{r.requete}</span>
                        <span className={cx("text-[13px] font-semibold tab-num shrink-0",
                          r.tempsMoyen > 1000 ? "text-critique" : r.tempsMoyen > 250 ? "text-vigilance" : "")}>
                          {fmt(r.tempsMoyen)} ms
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-encre-3 flex-wrap tab-num">
                        <span>{fmt(r.appels)} appels</span>
                        <span>{fmt(r.tempsTotal)} s au total</span>
                        <span>{fmt(r.lignesMoyennes)} lignes en moyenne</span>
                        <span className={cx(r.cacheRatio < 80 && "text-vigilance")}>cache {r.cacheRatio} %</span>
                        <span className="ml-auto font-mono">{r.utilisateur}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {onglet === "verrous" && (
              verrous.length === 0 ? (
                <p className="text-[13px] text-encre-3 py-8 text-center">Aucun verrou bloquant en ce moment.</p>
              ) : (
                <>
                  <p className="text-[12px] text-encre-3 mb-3">
                    Ce qui compte n'est pas la session bloquée mais celle qui bloque : c'est elle qu'il
                    faut libérer.
                  </p>
                  {verrous.map((v, i) => (
                    <div key={i} className="p-3 mb-2 rounded-[4px] border border-critique/40 bg-critique-voile">
                      <div className="flex items-center gap-2 mb-3">
                        <Pastille ton="critique" pulse />
                        <span className="text-[13px] font-semibold">Attente de {v.attente} sur {v.relation}</span>
                        <Jeton ton="neutre" point={false} enfants={v.mode} />
                      </div>
                      <div className="grid gap-3" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
                        <div className="p-2 rounded-[4px] bg-surface border border-bordure">
                          <div className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-critique mb-1">Bloque</div>
                          <div className="font-mono text-[12px]">{v.bloqueur}</div>
                          <div className="font-mono text-[11px] text-encre-3 mt-1 truncate">{v.bloqueurRequete}</div>
                        </div>
                        <div className="grid place-items-center text-encre-4"><Icone nom="chevronDroite" /></div>
                        <div className="p-2 rounded-[4px] bg-surface border border-bordure">
                          <div className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-encre-3 mb-1">Attend</div>
                          <div className="font-mono text-[12px]">{v.bloque}</div>
                          <div className="font-mono text-[11px] text-encre-3 mt-1 truncate">{v.bloqueRequete}</div>
                        </div>
                      </div>
                      <Bouton taille="s" ton="danger" className="mt-3" icone="croix"
                        onClick={() => terminerSession(Number(v.bloqueur.replace("pid ", "")))}
                        enfants={`Terminer ${v.bloqueur}`} />
                    </div>
                  ))}
                </>
              )
            )}

            {onglet === "tables" && (
              <>
                <p className="text-[12px] text-encre-3 mb-3">
                  Au-delà de 10 % de tuples morts, le nettoyage ne suit plus ; au-delà de 20 %, les
                  parcours ralentissent et la table occupe nettement plus de place qu'elle ne contient.
                </p>
                <div className="overflow-auto">
                  <table className="w-full border-separate border-spacing-0 text-[13px]">
                    <thead>
                      <tr>
                        {["Table", "Lignes", "Taille", "Index", "Tuples morts", "Ratio", "Dernier nettoyage", ""].map((t, i) => (
                          <th key={t || i} className={cx(
                            "sticky top-0 bg-surface-2 px-3 py-[9px] border-b border-bordure whitespace-nowrap",
                            "text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3",
                            i === 0 ? "text-left" : "text-right")}>{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tables.map((t) => (
                        <tr key={t.nom} className="hover:bg-surface-2 transi">
                          <td className="px-3 pas-ligne border-b border-bordure font-mono font-medium">{t.nom}</td>
                          <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{fmt(t.lignes, "compact")}</td>
                          <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{t.taille}</td>
                          <td className="px-3 pas-ligne border-b border-bordure text-right tab-num text-encre-3">{t.index}</td>
                          <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{fmt(t.tuplesMorts, "compact")}</td>
                          <td className="px-3 pas-ligne border-b border-bordure text-right">
                            <span className="inline-flex items-center gap-2 justify-end">
                              <BarreMini valeur={Math.min(100, t.ratioMorts * 2)} ton={t.ratioMorts >= 20 ? "critique" : t.ratioMorts >= 10 ? "vigilance" : "bon"} largeur={44} />
                              <span className={cx("tab-num w-[44px] text-right",
                                t.ratioMorts >= 20 ? "text-critique font-semibold" : t.ratioMorts >= 10 ? "text-vigilance" : "")}>
                                {t.ratioMorts} %
                              </span>
                            </span>
                          </td>
                          <td className="px-3 pas-ligne border-b border-bordure text-right tab-num text-encre-3">{t.dernierVacuum}</td>
                          <td className="px-3 pas-ligne border-b border-bordure text-right">
                            {t.ratioMorts >= 10 && (
                              <Bouton taille="s" onClick={() => lancerVacuum(t)} enfants="Nettoyer" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {onglet === "replication" && (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
                <section>
                  <TeteCarte titre="Secondaires" sous={replication.mode + " · repères à 30 s et 5 min"} />
                  <div className="pt-3">
                    {replication.secondaires.map((s) => (
                      <div key={s.nom} className="py-[9px] border-b border-bordure last:border-0">
                        <div className="flex items-center gap-2 mb-[4px]">
                          <Pastille ton={s.etat === "bon" ? "bon" : "vigilance"} pulse={s.etat === "bon"} />
                          <span className="font-mono text-[13px] font-semibold">{s.nom}</span>
                          <span className="ml-auto text-[13px] tab-num font-semibold">
                            <span className={cx(s.retard > 300 ? "text-critique" : s.retard > 30 ? "text-vigilance" : "text-bon")}>
                              {s.retard} s
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-encre-3">
                          <span>{s.role}</span><span>{s.lieu}</span>
                          <span className="ml-auto">{s.retardOctets} en retard</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <TeteCarte titre="Emplacements de réplication" sous="Ce que la base retient pour ses secondaires" />
                  <div className="pt-3">
                    {replication.emplacements.map((e) => (
                      <div key={e.nom} className={cx("flex items-center gap-3 py-[9px] border-b border-bordure last:border-0", e.risque && "text-critique")}>
                        <Pastille ton={e.risque ? "critique" : e.actif ? "bon" : "neutre"} />
                        <span className="font-mono text-[13px] flex-1 min-w-0 truncate">{e.nom}</span>
                        <span className={cx("text-[12px] tab-num", e.risque && "font-semibold")}>{e.retenu}</span>
                        {e.risque
                          ? <Bouton taille="s" ton="danger" onClick={() => supprimerEmplacement(e.nom)} enfants="Supprimer" />
                          : <Jeton ton={e.actif ? "bon" : "neutre"} enfants={e.actif ? "actif" : "inactif"} />}
                      </div>
                    ))}
                    <p className="text-[12px] text-encre-3 mt-3">
                      Un emplacement inactif retient les journaux pour un secondaire qui ne revient pas.
                      C'est la cause la plus fréquente d'un disque qui se remplit sans explication.
                    </p>
                  </div>
                </section>
              </div>
            )}

            {onglet === "sessions" && (
              <div className="overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      {["PID", "Utilisateur", "Client", "État", "Depuis", "Attente", "Requête", ""].map((t, i) => (
                        <th key={t || i} className={cx(
                          "sticky top-0 bg-surface-2 px-3 py-[9px] border-b border-bordure whitespace-nowrap",
                          "text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3",
                          i >= 4 && i <= 5 ? "text-right" : "text-left")}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsBase.map((s) => (
                      <tr key={s.pid} className="hover:bg-surface-2 transi">
                        <td className="px-3 pas-ligne border-b border-bordure font-mono">{s.pid}</td>
                        <td className="px-3 pas-ligne border-b border-bordure font-mono text-encre-2">{s.utilisateur}</td>
                        <td className="px-3 pas-ligne border-b border-bordure font-mono text-[12px] text-encre-3">{s.client}</td>
                        <td className="px-3 pas-ligne border-b border-bordure">
                          <Jeton ton={s.etat === "active" ? "bon" : s.etat === "idle in transaction" ? "vigilance" : "neutre"} enfants={s.etat} />
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{s.depuis}</td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right">
                          {s.attente === "—" ? <span className="text-encre-4">—</span> : <Jeton ton="critique" enfants={s.attente} />}
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure font-mono text-[12px] text-encre-2 max-w-[260px] truncate">{s.requete}</td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right">
                          <Bouton ton="fantome" taille="s" icone="croix" title="Terminer la session"
                            onClick={() => terminerSession(s.pid)} />
                        </td>
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

function detailRequete(ui: ReturnType<typeof useUI>, r: RequeteLente) {
  ui.ouvrirTiroir({
    titre: "Requête",
    sous: <span className="font-mono">{r.utilisateur} · {r.base}</span>,
    onglets: [
      { nom: "Mesures", contenu: (
        <>
          <pre className="font-mono text-[12px] leading-[18px] p-3 rounded-[4px] bg-fond border border-bordure whitespace-pre-wrap [overflow-wrap:anywhere] mb-4">
            {r.requete}
          </pre>
          <Definitions lignes={[
            ["Appels", fmt(r.appels)],
            ["Temps moyen", `${fmt(r.tempsMoyen)} ms`],
            ["Temps total", `${fmt(r.tempsTotal)} s`],
            ["Lignes par appel", fmt(r.lignesMoyennes)],
            ["Taux de cache", `${r.cacheRatio} %`],
            ["Utilisateur", r.utilisateur],
          ]} />
        </>
      )},
      { nom: "Lecture", contenu: (
        <div className="text-[13px] text-encre-2 leading-[20px] space-y-3">
          <p>
            {r.cacheRatio < 80
              ? `Le taux de cache de ${r.cacheRatio} % signifie que cette requête va chercher la plupart de ses pages sur le disque. C'est souvent le signe d'un index manquant ou d'un parcours de table complet.`
              : `Le taux de cache de ${r.cacheRatio} % est bon : les pages sont en mémoire. La lenteur, s'il y en a, ne vient pas des entrées-sorties.`}
          </p>
          <p>
            Cette requête consomme {fmt(r.tempsTotal)} secondes cumulées sur la période.
            {r.appels > 100_000
              ? " Elle est appelée très souvent : un gain de quelques millisecondes se verrait tout de suite."
              : " Elle est peu appelée : l'optimiser rapporterait peu."}
          </p>
        </div>
      )},
    ],
    pied: <Bouton icone="trace" onClick={() => ui.message("Plan d'exécution demandé.", "info")} enfants="Voir le plan d'exécution" />,
  });
}
