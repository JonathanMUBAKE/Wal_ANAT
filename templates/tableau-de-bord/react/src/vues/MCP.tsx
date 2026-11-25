import { useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, fmt } from "../lib/format";
import {
  appelsMCP, approbationsMCP, connecteursMCP as connecteursInitiaux,
  type ApprobationMCP, type ConnecteurMCP, type PolitiqueMCP,
} from "../lib/intelligence";

const TON = { "connecté": "bon", "dégradé": "vigilance", "arrêté": "neutre" } as const;

const POLITIQUES: Array<{ cle: PolitiqueMCP; nom: string; texte: string }> = [
  { cle: "nommés", nom: "Outils nommés", texte: "Seuls les outils explicitement listés demandent une approbation. Les autres s'exécutent." },
  { cle: "destructifs", nom: "Outils destructifs", texte: "Tout outil marqué comme destructif demande une approbation. C'est le réglage courant." },
  { cle: "tous", nom: "Tous les outils", texte: "Chaque appel demande une approbation, même une simple lecture. Lourd, mais sans surprise." },
];

/* Connecteurs MCP : ce que les agents peuvent appeler au-dehors.
   Deux règles tiennent toute la page :
   - un outil ajouté après coup à un connecteur ne s'exécute pas tout seul ;
     il arrive marqué « nouveau » et repasse par une approbation ;
   - une approbation vaut pour un appel précis, avec ses arguments, et expire.
     Si les arguments changent entre la demande et la reprise, c'est refusé. */
export function MCP() {
  const ui = useUI();
  const [connecteurs, poserConnecteurs] = useState<ConnecteurMCP[]>(connecteursInitiaux);
  const [approbations, poserApprobations] = useState<ApprobationMCP[]>(approbationsMCP);
  const [onglet, poserOnglet] = useState("connecteurs");
  const [ouvert, poserOuvert] = useState<string | null>(connecteursInitiaux[0].cle);

  const outilsTotal = connecteurs.reduce((a, c) => a + c.outils.length, 0);
  const nouveaux = connecteurs.flatMap((c) => c.outils.filter((o) => o.nouveau).map((o) => ({ c, o })));
  const connectes = connecteurs.filter((c) => c.etat === "connecté").length;

  async function decider(a: ApprobationMCP, accepter: boolean) {
    if (accepter) {
      const ok = await ui.confirmer({
        titre: `Autoriser « ${a.outil} » ?`,
        texte: `L'appel sera exécuté avec exactement les arguments affichés, au nom de ${a.agent}. L'autorisation ne vaut que pour cet appel : si les arguments changent, il est refusé. Elle est journalisée à votre nom.`,
        bouton: "Autoriser cet appel", ton: a.destructif ? "danger" : "info",
      });
      if (!ok) return;
    }
    poserApprobations((l) => l.filter((x) => x.id !== a.id));
    ui.message(accepter ? `Appel ${a.id} autorisé et exécuté.` : `Appel ${a.id} refusé.`, accepter ? "bon" : "info");
  }

  async function changerPolitique(c: ConnecteurMCP, p: PolitiqueMCP) {
    if (p === "nommés" && c.politique !== "nommés") {
      const ok = await ui.confirmer({
        titre: "Passer en « outils nommés » ?",
        texte: "Les outils destructifs qui ne figurent pas dans la liste nommée s'exécuteront sans demander. C'est le réglage le plus permissif : à ne choisir que si la liste est tenue à jour.",
        bouton: "Appliquer", ton: "danger", mot: "NOMMES",
      });
      if (!ok) return;
    }
    poserConnecteurs((l) => l.map((x) => x.cle === c.cle ? { ...x, politique: p } : x));
    ui.message(`Politique de « ${c.nom} » : ${p}.`, "bon");
  }

  async function arreter(c: ConnecteurMCP) {
    const ok = await ui.confirmer({
      titre: `Arrêter « ${c.nom} » ?`,
      texte: `Les ${c.agents.length} agents qui s'en servent perdront ces outils immédiatement. Ils continueront de répondre, mais sans pouvoir consulter ce que ce connecteur expose — et ils ne le diront pas toujours clairement.`,
      bouton: "Arrêter le connecteur", ton: "danger", mot: c.nom,
    });
    if (!ok) return;
    poserConnecteurs((l) => l.map((x) => x.cle === c.cle ? { ...x, etat: "arrêté", agents: [] } : x));
    ui.message(`« ${c.nom} » arrêté.`, "bon");
  }

  return (
    <>
      <Entete
        titre="Connecteurs MCP"
        sous="Ce que les agents peuvent appeler au-dehors, et qui a autorisé quoi."
        actions={
          <>
            {approbations.length > 0 && <Jeton ton="vigilance" enfants={`${approbations.length} appels en attente`} />}
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Déclaration de connecteur à brancher.", "info")} enfants="Ajouter un connecteur" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Connecteurs" valeur={String(connecteurs.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Connectés" valeur={String(connectes)} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Outils exposés" valeur={String(outilsTotal)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Appels en attente" valeur={String(approbations.length)} ton={approbations.length ? "vigilance" : "bon"} />} />
      </div>

      {nouveaux.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-[4px] mb-4 bg-vigilance-voile border border-vigilance/40 anim-apparait">
          <Icone nom="branche" className="text-vigilance mt-[2px]" />
          <div className="flex-1 min-w-0 text-[13px]">
            <b>{nouveaux.length} outils sont apparus sur des connecteurs déjà déclarés.</b>{" "}
            <span className="text-encre-2">
              {nouveaux.map((n) => `${n.o.nom} (${n.c.nom})`).join(", ")}. Ils n'ont jamais été
              approuvés : un connecteur peut ajouter des outils après son installation, et c'est
              exactement par là qu'un agent gagne des pouvoirs que personne ne lui a donnés.
              Ils restent bloqués tant que vous ne les avez pas examinés.
            </span>
          </div>
        </div>
      )}

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "connecteurs", nom: "Connecteurs", compte: connecteurs.length },
              { cle: "attente", nom: "En attente", compte: approbations.length },
              { cle: "journal", nom: "Journal des appels", compte: appelsMCP.length },
            ]}
          />

          <div className="pas-carte">
            {onglet === "connecteurs" && (
              <div className="space-y-3">
                {connecteurs.map((c, i) => {
                  const deplie = ouvert === c.cle;
                  return (
                    <div key={c.cle} className={cx(
                      "rounded-[4px] border anim-entre",
                      c.etat === "dégradé" ? "border-vigilance/40" : "border-bordure",
                      c.etat === "arrêté" && "opacity-60",
                    )} style={{ animationDelay: i * 30 + "ms" }}>
                      <button type="button" onClick={() => poserOuvert(deplie ? null : c.cle)}
                        className="flex items-start gap-3 w-full p-4 text-left hover:bg-surface-2 transi rounded-[4px]">
                        <span className={cx("w-[30px] h-[30px] rounded-[4px] grid place-items-center shrink-0",
                          c.etat === "connecté" ? "bg-accent-voile text-accent" : "bg-surface-3 text-encre-3")}>
                          <Icone nom="branche" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-semibold">{c.nom}</span>
                            <Pastille ton={TON[c.etat]} pulse={c.etat === "connecté"} />
                            <span className="text-[11px] text-encre-3">{c.etat}</span>
                            <Jeton ton="neutre" point={false} enfants={c.transport} />
                            <Jeton ton="neutre" point={false} enfants={c.version} />
                            {c.outils.some((o) => o.nouveau) && <Jeton ton="vigilance" enfants="outils nouveaux" />}
                          </span>
                          <span className="block text-[12px] text-encre-3 mt-[3px]">{c.portee}</span>
                          <span className="block text-[11px] text-encre-4 mt-[4px]">
                            {c.outils.length} outils · {c.agents.length} agents · vérifié {c.derniereVerification}
                          </span>
                        </span>
                        <Icone nom={deplie ? "chevronBas" : "chevronDroite"} taille="s" className="text-encre-4 mt-2 shrink-0" />
                      </button>

                      {deplie && (
                        <div className="px-4 pb-4 anim-apparait">
                          <div className="mb-4">
                            <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-2">
                              Politique d'approbation
                            </div>
                            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
                              {POLITIQUES.map((p) => (
                                <button key={p.cle} type="button" onClick={() => changerPolitique(c, p.cle)}
                                  className={cx("p-3 rounded-[4px] border text-left transi",
                                    c.politique === p.cle ? "border-accent bg-accent-voile" : "border-bordure bg-surface-2 hover:border-bordure-2")}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={cx("w-[13px] h-[13px] rounded-full border-2 shrink-0",
                                      c.politique === p.cle ? "border-accent bg-accent" : "border-bordure-2")} />
                                    <span className="text-[12.5px] font-semibold">{p.nom}</span>
                                  </div>
                                  <p className="text-[11.5px] text-encre-3">{p.texte}</p>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-2">
                            Outils exposés
                          </div>
                          {c.outils.map((o) => (
                            <div key={o.nom} className={cx(
                              "flex items-center gap-3 py-[9px] border-b border-bordure last:border-0",
                              o.nouveau && "bg-vigilance-voile -mx-2 px-2 rounded-[4px]",
                            )}>
                              <span className={cx("w-[22px] h-[22px] rounded-[4px] grid place-items-center shrink-0",
                                o.destructif ? "bg-critique-voile text-critique" : "bg-surface-3 text-encre-3")}>
                                <Icone nom={o.destructif ? "alerte" : "oeil"} taille="s" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-mono text-[12.5px]">{o.nom}</span>
                                <span className="block text-[11px] text-encre-3">{o.description}</span>
                              </span>
                              {o.nouveau && <Jeton ton="vigilance" enfants="jamais approuvé" />}
                              {o.destructif && <Jeton ton="critique" point={false} enfants="destructif" />}
                              <Jeton ton={o.approbation === "humaine" ? "accent" : "bon"}
                                     enfants={o.approbation === "humaine" ? "humaine" : "automatique"} />
                              <span className="text-[11px] tab-num text-encre-4 w-[72px] text-right shrink-0">
                                {fmt(o.appels30j, "compact")} appels
                              </span>
                            </div>
                          ))}

                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-bordure">
                            <Bouton taille="s" icone="eclair"
                              onClick={() => ui.message(`« ${c.nom} » répond en 42 ms, ${c.outils.length} outils annoncés.`, "bon")}
                              enfants="Vérifier la connexion" />
                            {c.agents.length > 0 && (
                              <span className="text-[11.5px] text-encre-3">
                                Utilisé par {c.agents.join(", ")}
                              </span>
                            )}
                            {c.etat !== "arrêté" && (
                              <Bouton taille="s" ton="danger" className="ml-auto" icone="prise"
                                onClick={() => arreter(c)} enfants="Arrêter" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {onglet === "attente" && (
              approbations.length === 0 ? (
                <p className="text-[13px] text-encre-3 py-10 text-center">
                  Aucun appel n'attend votre décision.
                </p>
              ) : (
                <>
                  <p className="text-[12px] text-encre-3 mb-3">
                    Une autorisation vaut pour cet appel et ces arguments exactement. Si quoi que ce
                    soit change entre la demande et la reprise, l'appel est refusé plutôt que rejoué.
                  </p>
                  {approbations.map((a, i) => (
                    <div key={a.id} className={cx("p-4 mb-3 rounded-[4px] border anim-entre",
                      a.destructif ? "border-critique/40 bg-critique-voile" : "border-bordure bg-surface-2")}
                      style={{ animationDelay: i * 40 + "ms" }}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Pastille ton={a.destructif ? "critique" : "vigilance"} pulse />
                        <span className="font-mono text-[13px] font-semibold">{a.outil}</span>
                        {a.destructif && <Jeton ton="critique" point={false} enfants="destructif" />}
                        <span className="text-[11px] text-encre-3">{a.connecteur}</span>
                        <span className="ml-auto text-[11px] text-encre-4">{a.demande} · {a.expire}</span>
                      </div>
                      <div className="text-[12px] text-encre-2 mb-2">
                        Demandé par <b>{a.agent}</b>, déclenché par {a.demandeur}.
                      </div>
                      <pre className="font-mono text-[12px] p-3 rounded-[4px] bg-fond border border-bordure whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {a.arguments}
                      </pre>
                      <div className="flex items-center gap-2 mt-3">
                        <Bouton taille="s" icone="croix" onClick={() => decider(a, false)} enfants="Refuser" />
                        <Bouton taille="s" ton={a.destructif ? "danger" : "principal"} icone="check"
                          onClick={() => decider(a, true)} enfants="Autoriser cet appel" />
                        <span className="ml-auto text-[11px] text-encre-4 font-mono">{a.id}</span>
                      </div>
                    </div>
                  ))}
                </>
              )
            )}

            {onglet === "journal" && (
              <>
                <p className="text-[12px] text-encre-3 mb-3">
                  Chaque appel garde qui a demandé, quel agent, quel connecteur, quel outil, la
                  décision, sa durée et un identifiant de corrélation pour retrouver la trace complète.
                </p>
                <div className="overflow-auto">
                  <table className="w-full border-separate border-spacing-0 text-[13px]">
                    <thead>
                      <tr>
                        {["Quand", "Agent", "Connecteur", "Outil", "Décision", "Par", "Durée", "Corrélation"].map((t, i) => (
                          <th key={t} className={cx(
                            "sticky top-0 bg-surface-2 px-3 py-[9px] border-b border-bordure whitespace-nowrap",
                            "text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3",
                            i === 6 ? "text-right" : "text-left")}>{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {appelsMCP.map((c) => (
                        <tr key={c.id} className="hover:bg-surface-2 transi cursor-pointer"
                          onClick={() => ui.ouvrirTiroir({
                            titre: c.outil,
                            sous: <span className="font-mono">{c.correlation}</span>,
                            onglets: [{
                              nom: "Appel",
                              contenu: <Definitions lignes={[
                                ["Quand", c.quand], ["Agent", c.agent],
                                ["Connecteur", c.connecteur],
                                ["Outil", <span className="font-mono">{c.outil}</span>],
                                ["Décision", <Jeton ton={c.decision === "refusé" ? "critique" : c.decision === "expiré" ? "vigilance" : "bon"} enfants={c.decision} />],
                                ["Décidé par", c.par],
                                ["Durée", `${c.duree} ms`],
                                ["Corrélation", <span className="font-mono">{c.correlation}</span>],
                              ]} />,
                            }],
                          })}>
                          <td className="px-3 pas-ligne border-b border-bordure text-encre-3 whitespace-nowrap">{c.quand}</td>
                          <td className="px-3 pas-ligne border-b border-bordure">{c.agent}</td>
                          <td className="px-3 pas-ligne border-b border-bordure text-encre-2">{c.connecteur}</td>
                          <td className="px-3 pas-ligne border-b border-bordure font-mono text-[12px]">{c.outil}</td>
                          <td className="px-3 pas-ligne border-b border-bordure">
                            <Jeton ton={c.decision === "refusé" ? "critique" : c.decision === "expiré" ? "vigilance" : c.decision === "approuvé" ? "accent" : "bon"}
                                   enfants={c.decision} />
                          </td>
                          <td className="px-3 pas-ligne border-b border-bordure text-encre-2">{c.par}</td>
                          <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{c.duree} ms</td>
                          <td className="px-3 pas-ligne border-b border-bordure font-mono text-[11px] text-encre-4">{c.correlation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      } />

      <Carte className="mt-4" enfants={
        <>
          <TeteCarte titre="Pourquoi un nouvel outil ne s'exécute pas tout seul"
            sous="La seule règle de cette page qui mérite d'être retenue" />
          <div className="pas-carte pt-3 text-[13px] text-encre-2 leading-[20px]">
            <p>
              Un connecteur annonce la liste de ses outils au moment où on l'interroge. Rien n'empêche
              cette liste de grandir après son installation : une mise à jour du connecteur suffit.
              Si les nouveaux outils héritaient de l'approbation donnée aux anciens, un agent gagnerait
              des pouvoirs que personne ne lui a accordés, sans qu'aucun écran ne le signale.
            </p>
            <p className="mt-3">
              C'est pourquoi tout outil apparu après la déclaration arrive marqué « jamais approuvé »
              et reste bloqué jusqu'à examen — même sur un connecteur en qui l'on a toute confiance,
              et même pour une simple lecture.
            </p>
          </div>
        </>
      } />
    </>
  );
}
