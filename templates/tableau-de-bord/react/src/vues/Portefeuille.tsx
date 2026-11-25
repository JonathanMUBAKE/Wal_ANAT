import { useMemo, useState } from "react";
import { BarreMini, Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, Progression, TeteCarte } from "../composants/Primitives";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, fmt, normaliser } from "../lib/format";
import { arbitrages as arbitragesInitiaux, dossiers, type Arbitrage, type Dossier, type Sante } from "../lib/institution";

const TON: Record<Sante, "bon" | "vigilance" | "critique"> = {
  "bonne": "bon", "à surveiller": "vigilance", "dégradée": "critique",
};

/* Portefeuille : la vue de tout ce que la direction pilote. On n'y range
   rien, on y compare et on y arbitre.
   La seule idée qui compte : la santé **déclarée** par le responsable est
   posée à côté de la santé **calculée** depuis le calendrier, les livrables,
   le budget et les tâches. On ne demande à personne de se noter — on montre
   les deux chiffres côte à côte, et les écarts passent en tête. */
export function Portefeuille() {
  const ui = useUI();
  const [arbitrages, poserArbitrages] = useState<Arbitrage[]>(arbitragesInitiaux);
  const [onglet, poserOnglet] = useState("revue");
  const [q, poserQ] = useState("");
  const [type, poserType] = useState("");

  const enEcart = dossiers.filter((d) => d.santeDeclaree !== d.santeCalculee);
  const projets = dossiers.filter((d) => d.type === "Projet");
  const activites = dossiers.filter((d) => d.type !== "Projet");
  const enAttente = arbitrages.filter((a) => a.etat === "en attente");

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    const base = onglet === "projets" ? projets : onglet === "activites" ? activites : dossiers;
    return base.filter((d) =>
      (!n || normaliser(`${d.intitule} ${d.responsable} ${d.entite} ${d.code}`).includes(n)) &&
      (!type || d.type === type));
  }, [q, type, onglet, projets, activites]);

  const budgetTotal = projets.reduce((a, d) => a + d.budget, 0);
  const engageTotal = projets.reduce((a, d) => a + d.engage, 0);

  async function trancher(a: Arbitrage, i: number) {
    const ok = await ui.confirmer({
      titre: "Inscrire cette décision au registre ?",
      texte: `« ${a.options[i].intitule} ». ${a.options[i].consequence} La décision sera numérotée et figée : on ne la modifie plus, on la remplace par une nouvelle si besoin.`,
      bouton: "Inscrire la décision", ton: "vigilance",
    });
    if (!ok) return;
    poserArbitrages((l) => l.map((x) => x.code === a.code ? { ...x, etat: "tranché", decision: "DEC/2026/0153" } : x));
    ui.message("Décision DEC/2026/0153 inscrite au registre. L'arbitrage est clos.", "bon");
  }

  function detail(d: Dossier) {
    const calculBudget = Math.round((d.engage / (d.budget || 1)) * 100);
    ui.ouvrirTiroir({
      titre: d.intitule,
      sous: <><span className="font-mono">{d.code}</span> · {d.type}</>,
      onglets: [
        { nom: "Fiche", contenu: (
          <>
            <Definitions lignes={[
              ["Responsable", d.responsable], ["Entité", d.entite], ["Domaine", d.domaine],
              ["Période", `${d.debut} → ${d.fin}`],
              ["Avancement", `${d.avancement} %`],
              ["Santé déclarée", <Jeton ton={TON[d.santeDeclaree]} enfants={d.santeDeclaree} />],
              ["Santé calculée", <Jeton ton={TON[d.santeCalculee]} enfants={d.santeCalculee} />],
              ["Confidentialité", d.confidentiel ? "restreinte" : "ouverte à l'entité"],
              ["Prochaine échéance", d.prochaineEcheance],
            ]} />
            {d.raisonEcart && (
              <div className="mt-4 p-3 rounded-[4px] bg-vigilance-voile text-[12.5px] text-encre-2">
                <b className="text-vigilance">Pourquoi l'écart. </b>{d.raisonEcart}
              </div>
            )}
          </>
        )},
        { nom: "Ce qui le mesure", contenu: (
          <div className="space-y-4">
            {d.budget > 0 && (
              <Mesure titre="Budget" valeur={`${fmt(d.engage)} / ${fmt(d.budget)} €`} part={calculBudget}
                lecture={calculBudget > d.avancement + 15
                  ? "Le budget part plus vite que l'avancement. C'est le premier signal d'un dossier qui dérape."
                  : "Le budget suit l'avancement."} />
            )}
            <Mesure titre="Livrables" valeur={`${d.livrables.faits} / ${d.livrables.total}`}
              part={d.livrables.total ? (d.livrables.faits / d.livrables.total) * 100 : 0}
              lecture={d.livrables.enRetard ? `${d.livrables.enRetard} en retard.` : "Aucun en retard."} />
            <Mesure titre="Tâches" valeur={`${d.taches.faites} / ${d.taches.total}`}
              part={d.taches.total ? (d.taches.faites / d.taches.total) * 100 : 0}
              lecture={d.taches.enRetard ? `${d.taches.enRetard} en retard.` : "Aucune en retard."} />
            <Mesure titre="Calendrier" valeur={`${d.avancement} % déclarés`} part={d.avancement}
              lecture={`Échéance : ${d.fin}.`} />
          </div>
        )},
        { nom: "Suites à donner", contenu: d.suites.length === 0
          ? <p className="text-[13px] text-encre-3">Aucune suite à donner enregistrée.</p>
          : (
            <ListeEchelonnee>
              {d.suites.map((s, i) => (
                <div key={i} className="flex items-start gap-3 py-[10px] border-b border-bordure last:border-0">
                  <span className={cx("w-[18px] h-[18px] rounded-[4px] border grid place-items-center shrink-0 mt-[2px]",
                    s.faite ? "bg-bon border-bon text-white" : "border-bordure-2")}>
                    {s.faite && <Icone nom="check" taille="s" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px]">{s.intitule}</span>
                    <span className="block text-[11px] text-encre-3 mt-[2px]">{s.responsable} · pour le {s.echeance}</span>
                  </span>
                </div>
              ))}
            </ListeEchelonnee>
          )},
      ],
      pied: d.arbitrageAttendu
        ? <Bouton ton="principal" icone="balance" onClick={() => { ui.fermerTiroir(); poserOnglet("arbitrages"); }} enfants="Voir l'arbitrage attendu" />
        : undefined,
    });
  }

  return (
    <>
      <Entete
        titre="Portefeuille"
        sous="Tout ce que la direction pilote : projets et activités, leur santé réelle et les arbitrages qui attendent."
        actions={
          <>
            {enAttente.length > 0 && <Jeton ton="vigilance" enfants={`${enAttente.length} arbitrages en attente`} />}
            <Bouton icone="telecharger" onClick={() => { exporterCSV("portefeuille", filtres.map(({ suites, livrables, taches, ...r }) => r)); ui.message("Revue de portefeuille exportée.", "bon"); }} enfants="Exporter" />
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Assistant de création de dossier à brancher.", "info")} enfants="Nouveau dossier" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Dossiers" valeur={<NombreAnime valeur={dossiers.length} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Projets" valeur={<NombreAnime valeur={projets.length} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En écart de santé" valeur={<NombreAnime valeur={enEcart.length} />} ton={enEcart.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Arbitrages en attente" valeur={<NombreAnime valeur={enAttente.length} />} ton={enAttente.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={
          <>
            <LigneStat etiquette="Budget engagé" valeur={<NombreAnime valeur={Math.round((engageTotal / budgetTotal) * 100)} suffixe=" %" />}
              ton={engageTotal / budgetTotal > 0.85 ? "vigilance" : "bon"} />
            <Progression valeur={(engageTotal / budgetTotal) * 100} ton={engageTotal / budgetTotal > 0.85 ? "critique" : "bon"} />
          </>
        } />
      </div>

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "revue", nom: "Revue de portefeuille", compte: projets.length },
              { cle: "arbitrages", nom: "Arbitrages", compte: enAttente.length },
              { cle: "projets", nom: "Projets", compte: projets.length },
              { cle: "activites", nom: "Activités", compte: activites.length },
            ]}
          />

          <div className="pas-carte">
            {onglet === "revue" && (
              <>
                <p className="text-[12px] text-encre-3 mb-3">
                  La santé déclarée par le responsable, et la santé calculée depuis le calendrier,
                  les livrables, le budget et les tâches. Les écarts sont en tête : ce ne sont pas
                  des fautes, ce sont les dossiers dont il faut parler.
                </p>
                <ListeEchelonnee className="space-y-3">
                  {[...projets].sort((a, b) =>
                    Number(b.santeDeclaree !== b.santeCalculee) - Number(a.santeDeclaree !== a.santeCalculee)
                  ).map((d) => {
                    const ecart = d.santeDeclaree !== d.santeCalculee;
                    return (
                      <button key={d.code} type="button" onClick={() => detail(d)}
                        className={cx("w-full text-left p-4 rounded-[4px] border transi souleve",
                          ecart ? "border-vigilance/45 bg-vigilance-voile" : "border-bordure bg-surface-2 hover:border-bordure-2")}>
                        <div className="flex items-start gap-3 mb-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13.5px] font-semibold">{d.intitule}</span>
                              <span className="font-mono text-[11px] text-encre-4">{d.code}</span>
                              {d.confidentiel && <Jeton ton="neutre" point={false} enfants="restreint" />}
                              {d.arbitrageAttendu && <Jeton ton="vigilance" enfants="arbitrage attendu" />}
                            </div>
                            <div className="text-[11.5px] text-encre-3 mt-[2px]">
                              {d.responsable} · {d.entite} · échéance {d.fin}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <ParSante titre="déclarée" sante={d.santeDeclaree} />
                            <Icone nom={ecart ? "croix" : "check"} taille="s" className={ecart ? "text-vigilance" : "text-bon"} />
                            <ParSante titre="calculée" sante={d.santeCalculee} />
                          </div>
                        </div>

                        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                          <MiniMesure nom="Avancement" valeur={`${d.avancement} %`} part={d.avancement} />
                          <MiniMesure nom="Budget engagé" valeur={d.budget ? `${Math.round((d.engage / d.budget) * 100)} %` : "—"}
                            part={d.budget ? (d.engage / d.budget) * 100 : 0}
                            alerte={d.budget > 0 && (d.engage / d.budget) * 100 > d.avancement + 15} />
                          <MiniMesure nom="Livrables" valeur={`${d.livrables.faits}/${d.livrables.total}`}
                            part={d.livrables.total ? (d.livrables.faits / d.livrables.total) * 100 : 0}
                            alerte={d.livrables.enRetard > 0} />
                          <MiniMesure nom="Tâches" valeur={`${d.taches.faites}/${d.taches.total}`}
                            part={d.taches.total ? (d.taches.faites / d.taches.total) * 100 : 0}
                            alerte={d.taches.enRetard > 0} />
                        </div>

                        {d.raisonEcart && (
                          <p className="text-[12px] text-encre-2 mt-3 pt-3 border-t border-bordure">
                            <b className="text-vigilance">Écart. </b>{d.raisonEcart}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </ListeEchelonnee>
              </>
            )}

            {onglet === "arbitrages" && (
              <ListeEchelonnee className="space-y-3">
                {arbitrages.map((a) => (
                  <div key={a.code} className={cx("p-4 rounded-[4px] border",
                    a.etat === "en attente" ? "border-vigilance/45 bg-vigilance-voile" : "border-bordure bg-surface-2")}>
                    <div className="flex items-start gap-2 mb-2 flex-wrap">
                      <Icone nom="balance" className={a.etat === "en attente" ? "text-vigilance" : "text-encre-4"} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold">{a.question}</div>
                        <div className="text-[11px] text-encre-3 mt-[2px]">
                          <span className="font-mono">{a.code}</span> · dossier {a.dossier} · demandé par {a.demandeur} le {a.demandeLe}
                          {a.etat === "en attente" && ` · souhaité pour le ${a.souhaiteeLe}`}
                        </div>
                      </div>
                      <Jeton ton={a.etat === "en attente" ? "vigilance" : a.etat === "tranché" ? "bon" : "neutre"} enfants={a.etat} />
                    </div>

                    <p className="text-[12.5px] text-encre-2 mb-3">{a.contexte}</p>

                    <div className="space-y-2">
                      {a.options.map((o, i) => (
                        <div key={i} className={cx("flex items-start gap-3 p-3 rounded-[4px] border",
                          o.recommandee ? "border-accent/40 bg-accent-voile" : "border-bordure bg-surface")}>
                          <span className="w-[20px] h-[20px] rounded-full bg-surface-3 text-encre-3 text-[10px] font-semibold grid place-items-center shrink-0 mt-[2px]">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-semibold">{o.intitule}</span>
                              {o.recommandee && <Jeton ton="accent" point={false} enfants="recommandée" />}
                            </div>
                            <p className="text-[12px] text-encre-2 mt-[2px]">{o.consequence}</p>
                          </div>
                          {a.etat === "en attente" && (
                            <Bouton taille="s" ton={o.recommandee ? "principal" : "neutre"} className="shrink-0"
                              onClick={() => trancher(a, i)} enfants="Trancher" />
                          )}
                        </div>
                      ))}
                    </div>

                    {a.decision && (
                      <p className="text-[12px] text-encre-3 mt-3 pt-3 border-t border-bordure">
                        Tranché — inscrit au registre sous <span className="font-mono text-encre-2">{a.decision}</span>.
                      </p>
                    )}
                  </div>
                ))}
              </ListeEchelonnee>
            )}

            {(onglet === "projets" || onglet === "activites") && (
              <>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                    <Icone nom="recherche" taille="s" />
                    <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                      placeholder="Intitulé, responsable, entité, code…" aria-label="Rechercher un dossier"
                      className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
                  </div>
                  {onglet === "activites" && (
                    <select value={type} onChange={(e) => poserType(e.target.value)} aria-label="Filtrer par type"
                      className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                      <option value="">Tous les types</option>
                      {["Commission", "Conférence", "Rendez-vous", "Activité interne"].map((t) => <option key={t}>{t}</option>)}
                    </select>
                  )}
                </div>

                <ListeEchelonnee className="space-y-2">
                  {filtres.map((d) => (
                    <button key={d.code} type="button" onClick={() => detail(d)}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-[4px] border border-bordure bg-surface-2 hover:border-bordure-2 transi souleve">
                      <Pastille ton={TON[d.santeCalculee]} pulse={d.santeCalculee === "bonne"} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold">{d.intitule}</span>
                          <Jeton ton="neutre" point={false} enfants={d.type} />
                          <span className="font-mono text-[11px] text-encre-4">{d.code}</span>
                        </span>
                        <span className="block text-[11.5px] text-encre-3 mt-[2px]">
                          {d.responsable} · {d.entite} · {d.prochaineEcheance}
                        </span>
                      </span>
                      <span className="shrink-0 flex items-center gap-3">
                        <BarreMini valeur={d.avancement} largeur={70} />
                        <span className="text-[12px] tab-num w-[36px] text-right">{d.avancement} %</span>
                      </span>
                    </button>
                  ))}
                </ListeEchelonnee>
              </>
            )}
          </div>
        </>
      } />

      <Apparition delai={120}>
        <Carte className="mt-4" enfants={
          <>
            <TeteCarte titre="Pourquoi deux santés plutôt qu'une"
              sous="La question que posera le premier chef de projet qui verra cet écran" />
            <div className="pas-carte pt-3 text-[13px] text-encre-2 leading-[20px]">
              <p>
                Demander à quelqu'un de noter la santé de son propre dossier produit presque toujours
                du vert. Ce n'est pas de la mauvaise foi : on connaît son dossier, on sait ce qu'on va
                rattraper, et on le déclare sain parce qu'on compte le redresser.
              </p>
              <p className="mt-3">
                La santé calculée ne sait rien de cette intention. Elle ne lit que des faits : des dates
                dépassées, des livrables non remis, un budget qui avance plus vite que le travail.
                Mise à côté de la déclaration, elle ne contredit personne — elle ouvre une conversation
                que la seule déclaration n'aurait jamais déclenchée.
              </p>
            </div>
          </>
        } />
      </Apparition>
    </>
  );
}

function ParSante({ titre, sante }: { titre: string; sante: Sante }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-[.06em] text-encre-4 mb-[3px]">{titre}</div>
      <Jeton ton={TON[sante]} enfants={sante} />
    </div>
  );
}

function MiniMesure({ nom, valeur, part, alerte }: { nom: string; valeur: string; part: number; alerte?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-[3px]">
        <span className="text-[11px] text-encre-3">{nom}</span>
        <span className={cx("ml-auto text-[12px] tab-num font-semibold", alerte && "text-vigilance")}>{valeur}</span>
      </div>
      <BarreMini valeur={part} ton={alerte ? "vigilance" : "accent"} largeur={999} />
    </div>
  );
}

function Mesure({ titre, valeur, part, lecture }: { titre: string; valeur: string; part: number; lecture: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-[5px]">
        <span className="text-[13px] font-semibold">{titre}</span>
        <span className="ml-auto text-[13px] tab-num">{valeur}</span>
      </div>
      <Progression valeur={part} ton={part > 90 ? "critique" : "accent"} />
      <p className="text-[12px] text-encre-3 mt-[5px]">{lecture}</p>
    </div>
  );
}
