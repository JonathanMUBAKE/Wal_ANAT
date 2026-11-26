import { useMemo, useState } from "react";
import { BarreMini, Bouton, Carte, Entete, Interrupteur, Jeton, LigneStat, Onglets, Pastille, Progression, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { useUI } from "../composants/Superpositions";
import { cx, fmt, normaliser } from "../lib/format";
import { agentsIA as agentsInitiaux, executionsAgents, modeles, type AgentIA } from "../lib/intelligence";
import { Empechement, useDistant } from "../composants/Distant";
import { agentsIA, type AgentIADistant } from "../lib/api/anat";
import { useSource } from "../lib/api/source";

/* Les coéquipiers IA déclarés dans ANAT Pilotage : leur rôle et leurs
   instructions, tels que l'organisation les a écrits.

   Ce que l'application ne dit pas : le modèle employé, le coût, les quotas,
   les plafonds de dépense. C'est le lot « gouvernance de l'IA », et tant
   qu'il n'existe pas ces chiffres restent du gabarit. En revanche la règle
   qui compte est déjà tenue côté serveur : l'IA propose, un humain décide. */
function depuisAgent(a: AgentIADistant): AgentIA {
  return {
    id: a.id,
    nom: a.name,
    role: a.ai_role ?? a.title ?? "Coéquipier IA",
    etat: a.status === "active" ? "actif" : "suspendu",
    modele: "non déclaré",
    instructions: a.ai_instructions ?? "",
    documents: [],
    outils: [],
    executions30j: 0,
    cout30j: 0,
    tauxValidation: 0,
    derniere: new Date(a.created_at).toLocaleDateString("fr-FR"),
    garde: "L'agent propose, un humain décide. Les garde-fous vivent hors des instructions.",
  } as unknown as AgentIA;
}

const TON = { "actif": "bon", "en essai": "vigilance", "suspendu": "neutre" } as const;

/* Agents IA : ce que chacun a le droit de faire, et ce qu'il a fait.
   Le parti pris tient en une phrase : les garde-fous ne vivent pas dans les
   instructions. Une consigne écrite en prose se négocie, s'oublie, se
   réinterprète ; une liste d'outils autorisés, non. */
export function AgentsIA() {
  const ui = useUI();
  const { source } = useSource();
  const direct = source === "application";
  const distant = useDistant(agentsIA);
  const [inventes, poserInventes] = useState<AgentIA[]>(agentsInitiaux);
  const agents: AgentIA[] = direct && distant.donnees?.length
    ? distant.donnees.map(depuisAgent)
    : inventes;
  const poserAgents = direct ? (() => { /* le serveur fait foi */ }) as typeof poserInventes : poserInventes;
  const [choisi, poserChoisi] = useState<AgentIA>(agentsInitiaux[0]);
  const [onglet, poserOnglet] = useState("instructions");
  const [q, poserQ] = useState("");
  const [essai, poserEssai] = useState("");
  const [reponseEssai, poserReponseEssai] = useState<string | null>(null);

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return agents.filter((a) => !n || normaliser(`${a.nom} ${a.role} ${a.responsable}`).includes(n));
  }, [agents, q]);

  const actifs = agents.filter((a) => a.etat === "actif").length;
  const enAttente = executionsAgents.filter((e) => e.etat === "en attente").length;
  const coutJour = agents.reduce((a, x) => a + x.consommeJour, 0);
  const budgetJour = agents.reduce((a, x) => a + x.budgetJour, 0);

  async function basculerEtat(a: AgentIA) {
    if (a.etat !== "suspendu") {
      const ok = await ui.confirmer({
        titre: `Suspendre « ${a.nom} » ?`,
        texte: "Il cessera immédiatement de répondre et de s'exécuter sur programmation. Ses instructions, ses documents et ses garde-fous sont conservés : la reprise ne demandera pas de tout refaire.",
        bouton: "Suspendre", ton: "vigilance",
      });
      if (!ok) return;
    }
    const nouvel: AgentIA["etat"] = a.etat === "suspendu" ? "en essai" : "suspendu";
    poserAgents((l) => l.map((x) => x.cle === a.cle ? { ...x, etat: nouvel } : x));
    poserChoisi((c) => c.cle === a.cle ? { ...c, etat: nouvel } : c);
    ui.message(a.etat === "suspendu" ? `« ${a.nom} » repris en essai.` : `« ${a.nom} » suspendu.`, "bon");
  }

  async function basculerGardeFou(a: AgentIA, i: number) {
    const g = a.gardeFous[i];
    if (g.actif) {
      const ok = await ui.confirmer({
        titre: `Retirer le garde-fou « ${g.libelle} » ?`,
        texte: `${g.explication} Le retirer élargit ce que l'agent peut faire sans qu'on le lui demande. Le changement est journalisé à votre nom.`,
        bouton: "Retirer le garde-fou", ton: "danger", mot: "RETIRER",
      });
      if (!ok) return;
    }
    const maj = (x: AgentIA) => x.cle !== a.cle ? x : {
      ...x, gardeFous: x.gardeFous.map((gg, k) => k === i ? { ...gg, actif: !gg.actif } : gg),
    };
    poserAgents((l) => l.map(maj));
    poserChoisi(maj);
    ui.message(g.actif ? "Garde-fou retiré et journalisé." : "Garde-fou remis en place.", "bon");
  }

  function lancerEssai() {
    if (!essai.trim()) return ui.message("Écrivez une question pour l'essai.", "critique");
    poserReponseEssai(null);
    ui.message("Essai en cours — il consomme du budget réel.", "info", { duree: 1400 });
    setTimeout(() => poserReponseEssai(
      "L'essai s'exécute dans un bac à sable : les outils de lecture répondent sur des données figées, " +
      "et tout outil d'écriture est refusé, même si vos garde-fous l'autorisent. " +
      "C'est volontaire — un essai ne doit jamais toucher la production.\n\n" +
      "Réponse de l'agent sur votre question : la lecture proposée citerait les lignes concernées, " +
      "donnerait la cause la plus probable avec son degré de certitude, et s'arrêterait là. " +
      "Aucune action ne partirait sans votre accord."), 1600);
  }

  const modeleDe = (cle: string) => modeles.find((m) => m.cle === cle);

  return (
    <>
      <Entete
        titre="Agents IA"
        sous="Ce que chaque agent a le droit de faire, sur quoi il s'appuie, et ce qu'il a fait."
        actions={
          <>
            {enAttente > 0 && <Jeton ton="vigilance" enfants={`${enAttente} en attente de validation`} />}
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Assistant de création d'agent à brancher.", "info")} enfants="Nouvel agent" />
          </>
        }
      />

      {direct && (
        <>
          <div className="mb-4">
            <Empechement etat={distant.etat} echec={distant.echec} relancer={distant.relancer} />
          </div>
          {distant.etat === "ok" && (
            <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-surface-2 border border-bordure">
              <Icone nom="robot" className="text-accent mt-[2px]" />
              <p className="flex-1 min-w-[min(100%,260px)] text-[13px] text-encre-2">
                <b>{distant.donnees?.length ?? 0} coéquipiers IA déclarés dans l'application</b>, avec leur rôle
                et leurs instructions tels que l'organisation les a écrits. Le modèle employé, le coût et les
                quotas ne sont pas exposés : ces chiffres-là restent du gabarit jusqu'au lot de gouvernance de
                l'IA. La règle qui compte, elle, est déjà tenue côté serveur — l'IA propose, un humain décide.
              </p>
            </div>
          )}
        </>
      )}

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Agents déclarés" valeur={String(agents.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Actifs" valeur={String(actifs)} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="À valider" valeur={String(enAttente)} ton={enAttente ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={
          <>
            <LigneStat etiquette="Dépense du jour" valeur={`${coutJour.toFixed(2)} € / ${budgetJour} €`}
              ton={coutJour / budgetJour > 0.8 ? "vigilance" : "bon"} />
            <Progression valeur={(coutJour / budgetJour) * 100} ton={coutJour / budgetJour > 0.8 ? "critique" : "bon"} />
          </>
        } />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)" }}>
        {/* Liste des agents */}
        <Carte className="self-start" enfants={
          <>
            <div className="pas-carte border-b border-bordure">
              <div className="flex items-center gap-2 h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                <Icone nom="recherche" taille="s" />
                <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                  placeholder="Nom, rôle, responsable…" aria-label="Rechercher un agent"
                  className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
              </div>
            </div>
            <div className="divide-y divide-bordure max-h-[620px] overflow-y-auto">
              {filtres.map((a, i) => (
                <button key={a.cle} type="button" onClick={() => { poserChoisi(a); poserReponseEssai(null); }}
                  className={cx("flex items-start gap-3 p-3 w-full text-left transi anim-entre",
                    choisi.cle === a.cle ? "bg-accent-voile" : "hover:bg-surface-2")}
                  style={{ animationDelay: i * 25 + "ms" }}>
                  <span className={cx("w-[28px] h-[28px] rounded-[4px] grid place-items-center shrink-0 mt-[2px]",
                    a.etat === "actif" ? "bg-accent-voile text-accent" : "bg-surface-3 text-encre-3")}>
                    <Icone nom="robot" taille="s" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold truncate">{a.nom}</span>
                      <Pastille ton={TON[a.etat] === "bon" ? "bon" : TON[a.etat] === "vigilance" ? "vigilance" : "neutre"}
                                pulse={a.etat === "actif"} />
                    </span>
                    <span className="block text-[11.5px] text-encre-3 mt-[2px] line-clamp-2">{a.role}</span>
                    <span className="block text-[11px] text-encre-4 mt-[4px]">
                      {fmt(a.executions7j)} exécutions sur 7 j · {a.tauxValidation} % retenues
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        } />

        {/* Fiche de l'agent choisi */}
        <div className="min-w-0">
          <Carte enfants={
            <>
              <div className="flex items-start gap-3 pas-carte border-b border-bordure">
                <span className={cx("w-[34px] h-[34px] rounded-[4px] grid place-items-center shrink-0",
                  choisi.etat === "actif" ? "bg-accent-voile text-accent" : "bg-surface-3 text-encre-3")}>
                  <Icone nom="robot" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[15px] font-semibold">{choisi.nom}</h2>
                    <Jeton ton={TON[choisi.etat]} enfants={choisi.etat} />
                    <Jeton ton="neutre" point={false} enfants={modeleDe(choisi.modele)?.nom ?? choisi.modele} />
                  </div>
                  <p className="text-[12.5px] text-encre-3 mt-[2px]">{choisi.role}</p>
                  <p className="text-[11px] text-encre-4 mt-[4px]">Responsable : {choisi.responsable}</p>
                </div>
                <Interrupteur actif={choisi.etat !== "suspendu"} surChangement={() => basculerEtat(choisi)}
                  etiquette={`Activer ${choisi.nom}`} />
              </div>

              <Onglets
                actif={onglet} surChoix={poserOnglet}
                onglets={[
                  { cle: "instructions", nom: "Instructions" },
                  { cle: "outils", nom: "Outils", compte: choisi.outils.length },
                  { cle: "documents", nom: "Documents", compte: choisi.documents.length },
                  { cle: "gardefous", nom: "Garde-fous", compte: choisi.gardeFous.filter((g) => g.actif).length },
                  { cle: "budget", nom: "Budget et usage" },
                  { cle: "essai", nom: "Essai" },
                ]}
              />

              <div className="pas-carte">
                {onglet === "instructions" && (
                  <>
                    <p className="text-[12px] text-encre-3 mb-3">
                      Les instructions disent <b className="text-encre-2">comment</b> l'agent travaille.
                      Elles ne disent jamais ce qu'il n'a pas le droit de faire : cela se règle dans
                      les outils et les garde-fous, où une consigne ne se discute pas.
                    </p>
                    <pre className="font-mono text-[12.5px] leading-[19px] p-4 rounded-[4px] bg-fond border border-bordure whitespace-pre-wrap">
                      {choisi.instructions}
                    </pre>
                    <div className="flex gap-2 mt-3">
                      <Bouton taille="s" icone="reglages"
                        onClick={() => ui.message("Éditeur d'instructions à brancher — toute version est conservée.", "info")}
                        enfants="Modifier" />
                      <Bouton taille="s" ton="fantome" icone="horloge"
                        onClick={() => ui.message("Quatorze versions conservées depuis mars.", "info")}
                        enfants="Historique des versions" />
                    </div>
                  </>
                )}

                {onglet === "outils" && (
                  <>
                    <p className="text-[12px] text-encre-3 mb-3">
                      Un outil absent de cette liste n'existe pas pour l'agent, quelles que soient ses
                      instructions. Les outils qui écrivent sont séparés de ceux qui lisent, et chacun
                      d'eux demande un humain.
                    </p>
                    {choisi.outils.map((o) => (
                      <div key={o.nom} className="flex items-center gap-3 py-[10px] border-b border-bordure last:border-0">
                        <span className={cx("w-[24px] h-[24px] rounded-[4px] grid place-items-center shrink-0",
                          o.portee === "écriture" ? "bg-vigilance-voile text-vigilance" : "bg-surface-3 text-encre-3")}>
                          <Icone nom={o.portee === "écriture" ? "cle" : "oeil"} taille="s" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-[12.5px]">{o.nom}</span>
                          <span className="block text-[11px] text-encre-3">{o.source}</span>
                        </span>
                        <Jeton ton={o.portee === "écriture" ? "vigilance" : "neutre"} point={false} enfants={o.portee} />
                        <Jeton ton={o.approbation === "humaine" ? "accent" : "bon"}
                               enfants={o.approbation === "humaine" ? "approbation humaine" : "automatique"} />
                      </div>
                    ))}
                    {choisi.outils.every((o) => o.portee === "lecture") && (
                      <div className="mt-3 p-3 rounded-[4px] bg-bon-voile text-[12px] text-encre-2">
                        Cet agent est en lecture seule : aucun outil ne lui permet de modifier quoi que
                        ce soit. C'est la configuration la plus sûre, et souvent la plus utile.
                      </div>
                    )}
                  </>
                )}

                {onglet === "documents" && (
                  <>
                    <p className="text-[12px] text-encre-3 mb-3">
                      Ce que l'agent peut citer. Le contenu retrouvé est traité comme une donnée, jamais
                      comme une consigne : un document ne peut pas lui donner d'ordre.
                    </p>
                    {choisi.documents.map((d) => (
                      <div key={d.nom} className="flex items-center gap-3 py-[10px] border-b border-bordure last:border-0">
                        <Icone nom="rapport" taille="s" className="text-encre-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium truncate">{d.nom}</span>
                          <span className="block text-[11px] text-encre-3">
                            {d.type} · {d.taille} · {fmt(d.morceaux)} morceaux · indexé {d.indexe}
                          </span>
                        </span>
                        <Jeton ton={d.sensibilite === "Restreint" ? "vigilance" : "neutre"} point={false} enfants={d.sensibilite} />
                      </div>
                    ))}
                    <Bouton taille="s" className="mt-3" icone="plus"
                      onClick={() => ui.message("Dépôt de document à brancher — l'indexation suit.", "info")}
                      enfants="Ajouter un document" />
                  </>
                )}

                {onglet === "gardefous" && (
                  <>
                    <p className="text-[12px] text-encre-3 mb-3">
                      Chaque garde-fou est appliqué par le système, pas par le modèle. Les retirer est
                      possible, journalisé, et demande de retaper un mot.
                    </p>
                    {choisi.gardeFous.map((g, i) => (
                      <div key={g.libelle} className="flex items-start gap-3 py-[12px] border-b border-bordure last:border-0">
                        <span className={cx("w-[24px] h-[24px] rounded-[4px] grid place-items-center shrink-0 mt-[2px]",
                          g.actif ? "bg-bon-voile text-bon" : "bg-surface-3 text-encre-4")}>
                          <Icone nom={g.actif ? "bouclier" : "croix"} taille="s" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold">{g.libelle}</span>
                          <span className="block text-[12px] text-encre-3 mt-[2px]">{g.explication}</span>
                        </span>
                        <Interrupteur actif={g.actif} surChangement={() => basculerGardeFou(choisi, i)}
                          etiquette={g.libelle} />
                      </div>
                    ))}
                  </>
                )}

                {onglet === "budget" && (
                  <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                    <section>
                      <TeteCarte titre="Plafonds" sous="L'agent s'arrête au plafond au lieu de continuer" />
                      <div className="pt-3">
                        <LigneStat etiquette="Par session" valeur={`${choisi.budgetSession.toFixed(2)} €`} />
                        <LigneStat etiquette="Par jour" valeur={`${choisi.budgetJour.toFixed(2)} €`} />
                        <LigneStat etiquette="Consommé aujourd'hui" valeur={`${choisi.consommeJour.toFixed(2)} €`}
                          ton={choisi.budgetJour && choisi.consommeJour / choisi.budgetJour > 0.8 ? "vigilance" : "bon"} />
                        {choisi.budgetJour > 0 && (
                          <Progression valeur={(choisi.consommeJour / choisi.budgetJour) * 100}
                            ton={choisi.consommeJour / choisi.budgetJour > 0.8 ? "critique" : "bon"} />
                        )}
                        <p className="text-[12px] text-encre-3 mt-3">
                          Un plafond atteint arrête l'agent et prévient son responsable. Il ne dégrade
                          pas silencieusement ses réponses.
                        </p>
                      </div>
                    </section>
                    <section>
                      <TeteCarte titre="Usage" sous="Sur sept jours" />
                      <div className="pt-3">
                        <LigneStat etiquette="Exécutions" valeur={fmt(choisi.executions7j)} />
                        <LigneStat etiquette="Lectures retenues" valeur={`${choisi.tauxValidation} %`}
                          ton={choisi.tauxValidation > 80 ? "bon" : choisi.tauxValidation > 60 ? "vigilance" : "critique"} />
                        <BarreMini valeur={choisi.tauxValidation} largeur={180}
                          ton={choisi.tauxValidation > 80 ? "bon" : "vigilance"} />
                        <LigneStat etiquette="Dernière exécution" valeur={choisi.derniereExecution} />
                        <LigneStat etiquette="Modèle" valeur={modeleDe(choisi.modele)?.nom ?? choisi.modele} />
                        <p className="text-[12px] text-encre-3 mt-3">
                          Le taux de lectures retenues est le vrai indicateur : un agent dont on écarte
                          la moitié des réponses coûte du temps au lieu d'en faire gagner.
                        </p>
                      </div>
                    </section>
                  </div>
                )}

                {onglet === "essai" && (
                  <>
                    <p className="text-[12px] text-encre-3 mb-3">
                      L'essai s'exécute dans un bac à sable : les outils de lecture répondent sur des
                      données figées, les outils d'écriture sont refusés. Il consomme du budget réel.
                    </p>
                    <label htmlFor="essai-agent" className="block text-[12px] text-encre-3 mb-[6px]">
                      Ce qu'on lui demande
                    </label>
                    <textarea id="essai-agent" value={essai} onChange={(e) => poserEssai(e.target.value)}
                      rows={3} placeholder="Par exemple : explique les erreurs 500 de la passerelle depuis une heure."
                      className="w-full p-3 rounded-[4px] bg-surface-2 border border-bordure text-[13px] text-encre placeholder:text-encre-4 outline-none focus:border-accent transi resize-y" />
                    <div className="flex items-center gap-2 mt-2">
                      <Bouton ton="principal" taille="s" icone="etoiles" onClick={lancerEssai} enfants="Lancer l'essai" />
                      <span className="text-[11px] text-encre-4">
                        Coût estimé : {(choisi.budgetSession * 0.4).toFixed(3)} €
                      </span>
                    </div>
                    {reponseEssai && (
                      <div className="mt-4 p-4 rounded-[4px] bg-surface-2 border border-bordure anim-apparait">
                        <div className="flex items-center gap-2 mb-2">
                          <Icone nom="etoiles" taille="s" className="text-accent" />
                          <span className="text-[12px] font-semibold">Réponse en bac à sable</span>
                        </div>
                        <p className="text-[13px] text-encre-2 leading-[19px] whitespace-pre-wrap">{reponseEssai}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          } />

          {/* Exécutions à valider */}
          <Carte className="mt-4" enfants={
            <>
              <TeteCarte titre="Exécutions récentes"
                sous="Ce que les agents ont produit, et ce qui attend votre décision"
                outils={<Bouton taille="s" ton="fantome" iconeFin="chevronDroite"
                  onClick={() => ui.message("Journal complet des exécutions à brancher.", "info")} enfants="Tout voir" />} />
              <div className="divide-y divide-bordure">
                {executionsAgents.slice(0, 8).map((e, i) => (
                  <div key={e.id} className="flex items-start gap-3 pas-carte anim-entre" style={{ animationDelay: i * 25 + "ms" }}>
                    <Pastille ton={e.etat === "en attente" ? "vigilance" : e.etat === "rejetée" ? "critique" : "bon"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold">{e.agent}</span>
                        <Jeton ton={e.etat === "en attente" ? "vigilance" : e.etat === "rejetée" ? "critique" : e.etat === "validée" ? "bon" : "neutre"} enfants={e.etat} />
                        <span className="text-[11px] text-encre-4">{e.quand}</span>
                      </div>
                      <p className="text-[12.5px] text-encre-2 mt-[3px]">{e.resume}</p>
                      <div className="flex items-center gap-3 mt-[5px] text-[11px] text-encre-4 flex-wrap tab-num">
                        <span>{fmt(e.jetonsEntree)} jetons en entrée</span>
                        <span>{fmt(e.jetonsSortie)} en sortie</span>
                        <span>{e.cout.toFixed(3)} €</span>
                        <span>{(e.duree / 1000).toFixed(1)} s</span>
                        {e.valideePar && <span>retenue par {e.valideePar}</span>}
                      </div>
                    </div>
                    {e.etat === "en attente" && (
                      <div className="flex gap-2 shrink-0">
                        <Bouton taille="s" icone="croix" onClick={() => ui.message("Lecture écartée.", "info")} enfants="Écarter" />
                        <Bouton taille="s" ton="principal" icone="check" onClick={() => ui.message("Lecture retenue.", "bon")} enfants="Retenir" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          } />
        </div>
      </div>
    </>
  );
}
