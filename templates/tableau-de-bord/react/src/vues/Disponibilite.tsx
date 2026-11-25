import { useState } from "react";
import { Bouton, Carte, Entete, FriseDisponibilite, Jeton, LigneStat, Onglets, Pastille, TeteCarte } from "../composants/Primitives";
import { useUI } from "../composants/Superpositions";
import { Definitions } from "../composants/Superpositions";
import { cx } from "../lib/format";
import { disponibilite, incidentsDisponibilite } from "../lib/sigrh";

/* Disponibilité : l'engagement de service tenu, ou non. La frise de 90 jours
   dit plus qu'un pourcentage — un seul jour noir se voit tout de suite, là où
   une moyenne l'efface. */
export function Disponibilite() {
  const ui = useUI();
  const [onglet, poserOnglet] = useState("services");

  const global = disponibilite.reduce((a, s) => a + s.taux90, 0) / disponibilite.length;
  const sousEngagement = disponibilite.filter((s) => s.taux90 < s.engagement);
  const interruptions = disponibilite.reduce((a, s) => a + s.interruptions, 0);

  return (
    <>
      <Entete
        titre="Disponibilité"
        sous="L'engagement de service tenu ou non, service par service, sur les quatre-vingt-dix derniers jours."
        actions={
          <>
            <Bouton icone="oeil" onClick={() => ui.message("Page d'état publique ouverte dans un nouvel onglet.", "info")} enfants="Page d'état publique" />
            <Bouton icone="telecharger" onClick={() => ui.message("Rapport de disponibilité en préparation.", "bon")} enfants="Rapport mensuel" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Disponibilité globale" valeur={`${global.toFixed(3)} %`} ton={global >= 99.9 ? "bon" : "vigilance"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sous engagement" valeur={String(sousEngagement.length)} ton={sousEngagement.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Jours dégradés (90 j)" valeur={String(interruptions)} ton={interruptions > 10 ? "vigilance" : undefined} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Incidents ouverts" valeur={String(incidentsDisponibilite.filter((i) => i.duree === "en cours").length)} ton="critique" />} />
      </div>

      {sousEngagement.length > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-critique-voile border border-critique/40 anim-apparait">
          <Pastille ton="critique" pulse />
          <div className="flex-1 min-w-[min(100%,220px)] text-[13px]">
            <b>{sousEngagement.length} service{sousEngagement.length > 1 ? "s sont" : " est"} sous l'engagement de service.</b>{" "}
            <span className="text-encre-2">
              {sousEngagement.map((s) => `${s.nom} (${s.taux90.toFixed(2)} % pour ${s.engagement} % promis)`).join(", ")}.
            </span>
          </div>
        </div>
      )}

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "services", nom: "Par service", compte: disponibilite.length },
              { cle: "incidents", nom: "Incidents", compte: incidentsDisponibilite.length },
            ]}
          />

          {onglet === "services" ? (
            <div className="divide-y divide-bordure">
              {disponibilite.map((s, i) => {
                const tenu = s.taux90 >= s.engagement;
                return (
                  <div key={s.nom} className="pas-carte anim-entre" style={{ animationDelay: i * 30 + "ms" }}>
                    <div className="flex items-start gap-3 mb-3 flex-wrap">
                      <Pastille ton={tenu ? "bon" : "critique"} />
                      <div className="min-w-0">
                        <div className="font-mono text-[13px] font-semibold">{s.nom}</div>
                        <div className="text-[11px] text-encre-3">{s.role}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-5 text-right flex-wrap">
                        <div>
                          <div className={cx("text-[15px] font-semibold tab-num", tenu ? "text-bon" : "text-critique")}>
                            {s.taux90.toFixed(3)} %
                          </div>
                          <div className="text-[11px] text-encre-3">sur 90 jours</div>
                        </div>
                        <div>
                          <div className="text-[13px] tab-num text-encre-2">{s.engagement} %</div>
                          <div className="text-[11px] text-encre-3">promis</div>
                        </div>
                        <div>
                          <div className="text-[13px] tab-num text-encre-2">{s.retablissement}</div>
                          <div className="text-[11px] text-encre-3">rétablissement moyen</div>
                        </div>
                        <Jeton ton={tenu ? "bon" : "critique"} enfants={tenu ? "engagement tenu" : "engagement rompu"} />
                      </div>
                    </div>
                    <FriseDisponibilite jours={s.jours} legende={i === 0} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-bordure">
              {incidentsDisponibilite.map((inc, i) => (
                <button key={inc.code} type="button"
                  onClick={() => ui.ouvrirTiroir({
                    titre: inc.titre,
                    sous: <span className="font-mono">{inc.code}</span>,
                    onglets: [{
                      nom: "Fiche",
                      contenu: <Definitions lignes={[
                        ["Service", <span className="font-mono">{inc.service}</span>],
                        ["Gravité", <Jeton ton={inc.gravite} enfants={inc.gravite} />],
                        ["Début", inc.debut],
                        ["Durée", inc.duree],
                        ["Effet pour les agents", inc.impact],
                      ]} />,
                    }],
                    pied: <Bouton icone="rapport" onClick={() => ui.message("Compte rendu d'incident à rédiger.", "info")} enfants="Rédiger le compte rendu" />,
                  })}
                  className="flex items-start gap-3 pas-carte w-full text-left hover:bg-surface-2 transi anim-entre"
                  style={{ animationDelay: i * 25 + "ms" }}>
                  <span className="mt-[3px]"><Pastille ton={inc.gravite} pulse={inc.duree === "en cours"} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold">{inc.titre}</span>
                      <span className="font-mono text-[11px] text-encre-4">{inc.code}</span>
                      {inc.duree === "en cours" && <Jeton ton="critique" enfants="en cours" />}
                    </span>
                    <span className="block text-[12px] text-encre-2 mt-[2px]">{inc.impact}</span>
                    <span className="block text-[11px] text-encre-4 mt-[4px]">
                      {inc.service} · depuis le {inc.debut}{inc.duree !== "en cours" && ` · ${inc.duree}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      } />

      <Carte className="mt-4" enfants={
        <>
          <TeteCarte titre="Ce que l'engagement veut dire" sous="Converti en temps d'arrêt toléré" />
          <div className="pas-carte pt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {[["99,9 %", "8 h 46 par an", "43 min par mois", "bon"], ["99,5 %", "1 j 19 h par an", "3 h 39 par mois", "vigilance"], ["99 %", "3 j 15 h par an", "7 h 18 par mois", "serieux"]].map(([taux, an, mois, ton]) => (
              <div key={taux} className="p-3 rounded-[4px] border border-bordure bg-surface-2">
                <div className={cx("text-[19px] font-semibold tab-num", `text-${ton}`)}>{taux}</div>
                <div className="text-[12px] text-encre-2 mt-1">{an}</div>
                <div className="text-[12px] text-encre-3">{mois}</div>
              </div>
            ))}
          </div>
        </>
      } />
    </>
  );
}
