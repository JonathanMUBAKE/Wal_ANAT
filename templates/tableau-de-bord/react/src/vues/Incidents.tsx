import { useState } from "react";
import { Bouton, Carte, Chronologie, Entete, Jeton, LigneStat, Onglets, Pastille, TeteCarte } from "../composants/Primitives";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx } from "../lib/format";
import { astreinte, incidents as incidentsInitiaux, indicateursIncidents, type EtatIncident, type Incident } from "../lib/exploitation";

const TON_ETAT: Record<EtatIncident, "critique" | "accent" | "vigilance" | "bon" | "neutre"> = {
  "déclaré": "critique", "pris en charge": "accent", "atténué": "vigilance", "résolu": "bon", "clos": "neutre",
};

/* Incidents et astreinte : la salle de crise.
   Un incident se raconte dans l'ordre où il s'est passé — c'est la
   chronologie, pas le statut, qui permet de reconstituer ce qui a été vu,
   décidé et fait. Elle sert pendant l'incident à ceux qui arrivent en
   renfort, et après à ceux qui écrivent le compte rendu. */
export function Incidents() {
  const ui = useUI();
  const [incidents, poserIncidents] = useState<Incident[]>(incidentsInitiaux);
  const [onglet, poserOnglet] = useState("ouverts");
  const [choisi, poserChoisi] = useState<Incident>(incidentsInitiaux[0]);

  const ouverts = incidents.filter((i) => i.etat !== "clos" && i.etat !== "résolu");
  const p1 = ouverts.filter((i) => i.gravite === "P1");
  const aRediger = incidents.filter((i) => i.compteRendu === "à rédiger");
  const base = onglet === "ouverts" ? ouverts : onglet === "comptes" ? aRediger : incidents;

  async function avancer(i: Incident, etat: EtatIncident) {
    const textes: Record<string, string> = {
      "pris en charge": "Vous devenez responsable de cet incident. L'astreinte de niveau 2 n'est plus appelée automatiquement.",
      "atténué": "L'effet pour les agents a cessé, mais la cause n'est pas corrigée. L'incident reste ouvert et la vigilance aussi.",
      "résolu": "La cause est corrigée et vérifiée. Un compte rendu sera demandé avant la clôture.",
      "clos": "L'incident sort des files. Le compte rendu doit être publié avant — sans lui, rien ne reste de ce qui a été appris.",
    };
    const ok = await ui.confirmer({
      titre: `Passer ${i.code} en « ${etat} » ?`,
      texte: textes[etat] ?? "",
      bouton: "Confirmer", ton: etat === "clos" ? "vigilance" : "info",
    });
    if (!ok) return;
    poserIncidents((l) => l.map((x) => x.code === i.code ? { ...x, etat } : x));
    poserChoisi((x) => x.code === i.code ? { ...x, etat } : x);
    ui.message(`${i.code} : ${etat}.`, "bon");
  }

  async function appelerRenfort(i: Incident) {
    const ok = await ui.confirmer({
      titre: "Appeler le niveau 2 d'astreinte ?",
      texte: `${astreinte.actuelle.niveau2} sera appelé immédiatement, de jour comme de nuit. À faire quand l'incident dépasse ce que le niveau 1 peut traiter seul — pas pour partager l'inquiétude.`,
      bouton: "Appeler le renfort", ton: "vigilance",
    });
    if (ok) ui.message(`${astreinte.actuelle.niveau2} appelé en renfort sur ${i.code}.`, "bon");
  }

  return (
    <>
      <Entete
        titre="Incidents et astreinte"
        sous="La salle de crise : ce qui est en cours, qui est d'astreinte, et ce qu'on a appris des fois précédentes."
        actions={
          <>
            {p1.length > 0 && <Jeton ton="critique" enfants={`${p1.length} incidents P1 ouverts`} />}
            <Bouton ton="danger" icone="alerte" onClick={() => ui.message("Déclaration d'incident à brancher.", "info")} enfants="Déclarer un incident" />
          </>
        }
      />

      {/* L'astreinte d'abord : c'est la première chose qu'on cherche */}
      <Carte className="mb-4" enfants={
        <div className="pas-carte flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-[34px] h-[34px] rounded-full bg-accent-voile text-accent grid place-items-center shrink-0">
              <Icone nom="cloche" />
            </span>
            <div>
              <div className="text-[10.5px] uppercase tracking-[.08em] text-encre-4">Astreinte en cours</div>
              <div className="text-[13.5px] font-semibold">{astreinte.actuelle.niveau1}</div>
            </div>
          </div>
          <span className="w-px h-[34px] bg-bordure max-sm:hidden" />
          <div><div className="text-[10.5px] uppercase tracking-[.08em] text-encre-4">Niveau 2</div>
            <div className="text-[13px]">{astreinte.actuelle.niveau2}</div></div>
          <div><div className="text-[10.5px] uppercase tracking-[.08em] text-encre-4">Responsable</div>
            <div className="text-[13px]">{astreinte.actuelle.manager}</div></div>
          <div><div className="text-[10.5px] uppercase tracking-[.08em] text-encre-4">Période</div>
            <div className="text-[13px]">{astreinte.actuelle.depuis} → {astreinte.actuelle.jusqua}</div></div>
          <div className="ml-auto flex gap-2">
            <Bouton taille="s" icone="escalade" onClick={() => appelerRenfort(choisi)} enfants="Appeler le niveau 2" />
          </div>
        </div>
      } />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Ouverts" valeur={<NombreAnime valeur={ouverts.length} />} ton={ouverts.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="P1" valeur={<NombreAnime valeur={p1.length} />} ton={p1.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Prise en charge moyenne" valeur={<NombreAnime valeur={indicateursIncidents.delaiPriseEnCharge} suffixe=" min" />} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Résolution moyenne" valeur={<NombreAnime valeur={indicateursIncidents.delaiResolution} suffixe=" min" />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Engagement tenu" valeur={<NombreAnime valeur={indicateursIncidents.tauxRespectEngagement} suffixe=" %" />} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Comptes rendus à écrire" valeur={<NombreAnime valeur={aRediger.length} />} ton={aRediger.length ? "vigilance" : "bon"} />} />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)" }}>
        <Carte className="self-start" enfants={
          <>
            <Onglets compact actif={onglet} surChoix={poserOnglet}
              onglets={[
                { cle: "ouverts", nom: "Ouverts", compte: ouverts.length },
                { cle: "comptes", nom: "À écrire", compte: aRediger.length },
                { cle: "tout", nom: "Tout", compte: incidents.length },
              ]} />
            <div className="divide-y divide-bordure max-h-[520px] overflow-y-auto">
              {base.map((i, k) => (
                <button key={i.code} type="button" onClick={() => poserChoisi(i)}
                  className={cx("flex items-start gap-3 p-3 w-full text-left transi anim-pousse",
                    choisi.code === i.code ? "bg-accent-voile" : "hover:bg-surface-2")}
                  style={{ animationDelay: k * 30 + "ms" }}>
                  <span className={cx("px-[7px] h-[20px] rounded-[4px] text-[11px] font-bold grid place-items-center shrink-0 mt-[2px]",
                    i.gravite === "P1" ? "bg-critique text-white"
                      : i.gravite === "P2" ? "bg-serieux text-white"
                      : "bg-surface-3 text-encre-2")}>
                    {i.gravite}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-[17px]">{i.titre}</span>
                    <span className="flex items-center gap-2 mt-[4px] flex-wrap">
                      <Jeton ton={TON_ETAT[i.etat]} enfants={i.etat} />
                      <span className="font-mono text-[11px] text-encre-4">{i.code}</span>
                    </span>
                    <span className="block text-[11px] text-encre-3 mt-[3px]">
                      {i.astreinte} · {i.dureeMin < 60 ? `${i.dureeMin} min` : `${Math.round(i.dureeMin / 60)} h`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        } />

        <div className="min-w-0">
          <Carte className="anim-pousse" enfants={
            <>
              <div className="flex items-start gap-3 pas-carte border-b border-bordure">
                <span className={cx("px-[9px] h-[26px] rounded-[4px] text-[12px] font-bold grid place-items-center shrink-0",
                  choisi.gravite === "P1" ? "bg-critique text-white" : choisi.gravite === "P2" ? "bg-serieux text-white" : "bg-surface-3")}>
                  {choisi.gravite}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[15px] font-semibold">{choisi.titre}</h2>
                    <Jeton ton={TON_ETAT[choisi.etat]} enfants={choisi.etat} />
                  </div>
                  <p className="text-[11.5px] text-encre-3 mt-[3px]">
                    <span className="font-mono">{choisi.code}</span> · ouvert le {choisi.ouvert} ·
                    {choisi.dureeMin < 60 ? ` ${choisi.dureeMin} min` : ` ${Math.round(choisi.dureeMin / 60)} h`} ·
                    détecté par {choisi.detectePar.toLowerCase()}
                  </p>
                </div>
                {choisi.etat !== "clos" && (
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {choisi.etat === "déclaré" && <Bouton taille="s" ton="principal" onClick={() => avancer(choisi, "pris en charge")} enfants="Prendre en charge" />}
                    {choisi.etat === "pris en charge" && <Bouton taille="s" onClick={() => avancer(choisi, "atténué")} enfants="Atténué" />}
                    {choisi.etat === "atténué" && <Bouton taille="s" ton="principal" onClick={() => avancer(choisi, "résolu")} enfants="Résolu" />}
                    {choisi.etat === "résolu" && <Bouton taille="s" onClick={() => avancer(choisi, "clos")} enfants="Clore" />}
                  </div>
                )}
              </div>

              <div className="pas-carte space-y-4">
                <section className={cx("p-3 rounded-[4px]", choisi.etat === "clos" ? "bg-surface-2" : "bg-critique-voile")}>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-1">
                    Ce que vivent les agents
                  </div>
                  <p className="text-[13px] text-encre-2">{choisi.effetAgents}</p>
                </section>

                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                  <Definitions lignes={[
                    ["Astreinte", choisi.astreinte],
                    ["Renfort", choisi.renfort.length ? choisi.renfort.join(", ") : "aucun"],
                    ["Services touchés", choisi.servicesTouches.join(", ")],
                    ["Prise en charge", `${choisi.delaiPriseEnCharge} min après détection`],
                    ["Atténuation", `${choisi.delaiAttenuation} min après détection`],
                    ["Compte rendu", <Jeton ton={choisi.compteRendu === "publié" ? "bon" : "vigilance"} enfants={choisi.compteRendu} />],
                  ]} />
                  <section>
                    <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-1">
                      Cause probable
                    </div>
                    <p className="text-[13px] text-encre-2 leading-[19px]">{choisi.causeProbable}</p>
                  </section>
                </div>

                <section>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-2">
                    Chronologie
                  </div>
                  <Chronologie points={choisi.chronologie.map((c) => ({
                    quand: `${c.quand} · ${c.qui}`,
                    titre: c.quoi,
                    ton: c.type === "décision" ? "vigilance" : c.type === "action" ? "bon" : c.type === "communication" ? "neutre" : "neutre",
                  }))} />
                  {choisi.etat !== "clos" && (
                    <Bouton taille="s" className="mt-3" icone="plus"
                      onClick={() => ui.message("Saisie d'un point de chronologie à brancher — horodatée automatiquement.", "info")}
                      enfants="Ajouter un point" />
                  )}
                </section>

                {choisi.compteRendu === "à rédiger" && (
                  <section className="p-3 rounded-[4px] border border-accent/35 bg-accent-voile">
                    <div className="flex items-start gap-3">
                      <Icone nom="etoiles" className="text-accent mt-[2px] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold">Préparer le compte rendu</div>
                        <p className="text-[12.5px] text-encre-2 mt-[2px] leading-[18px]">
                          L'agent rassemble la chronologie, les alertes et les déploiements de la période,
                          et rend un brouillon. Il n'attribue de faute à personne : il écrit ce qui s'est
                          passé, pas qui s'est trompé. Le texte part ensuite en validation.
                        </p>
                      </div>
                      <Bouton taille="s" ton="principal" className="shrink-0"
                        onClick={() => ui.message("Brouillon de compte rendu demandé au rédacteur.", "bon")}
                        enfants="Demander un brouillon" />
                    </div>
                  </section>
                )}
              </div>
            </>
          } />
        </div>
      </div>

      <Apparition delai={120} className="mt-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <Carte enfants={
            <>
              <TeteCarte titre="Rotation d'astreinte" sous="Les quatre semaines à venir" />
              <div className="pas-carte pt-3">
                {astreinte.rotation.map((r, i) => (
                  <div key={r.semaine} className={cx("flex items-center gap-3 py-[9px] border-b border-bordure last:border-0",
                    i === 0 && "font-medium")}>
                    {i === 0 ? <Pastille ton="bon" pulse /> : <span className="w-[7px]" />}
                    <span className="text-[12.5px] w-[130px] shrink-0">{r.semaine}</span>
                    <span className="text-[12.5px] flex-1 min-w-0 truncate">{r.niveau1}</span>
                    <span className="text-[11.5px] text-encre-3 truncate">{r.niveau2}</span>
                  </div>
                ))}
              </div>
            </>
          } />

          <Carte enfants={
            <>
              <TeteCarte titre="Règles d'astreinte" sous="Ce sur quoi tout le monde s'est mis d'accord" />
              <div className="pas-carte pt-3">
                <ListeEchelonnee>
                  {astreinte.regles.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 py-[7px] text-[12.5px] text-encre-2">
                      <span className="w-[17px] h-[17px] rounded-full bg-surface-3 text-encre-3 text-[10px] font-semibold grid place-items-center shrink-0 mt-[1px]">
                        {i + 1}
                      </span>
                      {r}
                    </div>
                  ))}
                </ListeEchelonnee>
                <div className="mt-3 pt-3 border-t border-bordure grid grid-cols-2 gap-3 text-[12px]">
                  <div><span className="text-encre-3">Appels sur 30 jours</span>
                    <div className="text-[15px] font-semibold tab-num">{astreinte.statistiques.appels30j}</div></div>
                  <div><span className="text-encre-3">Dont la nuit</span>
                    <div className="text-[15px] font-semibold tab-num">{astreinte.statistiques.nuit}</div></div>
                  <div><span className="text-encre-3">Délai moyen</span>
                    <div className="text-[15px] font-semibold tab-num">{astreinte.statistiques.delaiMoyen} min</div></div>
                  <div><span className="text-encre-3">Interventions</span>
                    <div className="text-[15px] font-semibold tab-num">{astreinte.statistiques.interventions}</div></div>
                </div>
              </div>
            </>
          } />

          <Carte enfants={
            <>
              <TeteCarte titre="Incidents par mois" sous="Six derniers mois, par gravité" />
              <div className="pas-carte pt-3">
                {indicateursIncidents.parMois.map((m) => {
                  const total = m.p1 + m.p2 + m.p3;
                  return (
                    <div key={m.mois} className="flex items-center gap-3 py-[6px] text-[12.5px]">
                      <span className="w-[48px] shrink-0 text-encre-3">{m.mois}</span>
                      <span className="flex gap-[2px] flex-1 h-[14px]">
                        {m.p1 > 0 && <span className="bg-critique rounded-[2px]" style={{ flex: m.p1 }} title={`${m.p1} P1`} />}
                        {m.p2 > 0 && <span className="bg-serieux rounded-[2px]" style={{ flex: m.p2 }} title={`${m.p2} P2`} />}
                        {m.p3 > 0 && <span className="bg-vigilance rounded-[2px]" style={{ flex: m.p3 }} title={`${m.p3} P3`} />}
                        <span className="bg-surface-3 rounded-[2px]" style={{ flex: Math.max(0, 14 - total) }} />
                      </span>
                      <span className="tab-num text-encre-2 w-[20px] text-right">{total}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 mt-3 text-[11px] text-encre-3">
                  <span className="inline-flex items-center gap-[5px]"><i className="w-[8px] h-[8px] rounded-[2px] bg-critique" />P1</span>
                  <span className="inline-flex items-center gap-[5px]"><i className="w-[8px] h-[8px] rounded-[2px] bg-serieux" />P2</span>
                  <span className="inline-flex items-center gap-[5px]"><i className="w-[8px] h-[8px] rounded-[2px] bg-vigilance" />P3</span>
                </div>
              </div>
            </>
          } />
        </div>
      </Apparition>
    </>
  );
}
