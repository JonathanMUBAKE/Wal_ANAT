import { useMemo, useState } from "react";
import { Bouton, Carte, Chronologie, Entete, Etapes, Jeton, LigneStat, Onglets, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx } from "../lib/format";
import { deploiements as deploiementsInitiaux, type Deploiement } from "../lib/sigrh";

const TON: Record<Deploiement["etat"], "bon" | "accent" | "critique" | "neutre"> = {
  "réussi": "bon", "en cours": "accent", "échoué": "critique", "annulé": "neutre",
};

/* Déploiements : ce qui est parti en production, par qui, et ce que ça a
   changé. La note explique le pourquoi — sans elle, un historique de versions
   ne sert à personne six mois plus tard. */
export function Deploiements() {
  const ui = useUI();
  const [deploiements, poserDeploiements] = useState<Deploiement[]>(deploiementsInitiaux);
  const [onglet, poserOnglet] = useState("liste");
  const [env, poserEnv] = useState("");

  const filtres = useMemo(
    () => deploiements.filter((d) => !env || d.environnement === env), [deploiements, env]);

  const enCours = deploiements.filter((d) => d.etat === "en cours").length;
  const echecs = deploiements.filter((d) => d.etat === "échoué").length;
  const reussis = deploiements.filter((d) => d.etat === "réussi").length;
  const tauxReussite = Math.round((reussis / deploiements.length) * 100);

  async function revenir(d: Deploiement) {
    const ok = await ui.confirmer({
      titre: `Revenir à la version précédente de ${d.service} ?`,
      texte: `La version ${d.version} sera retirée et la précédente remise en service. Les données écrites depuis le déploiement ne sont pas annulées — seul le code revient en arrière.`,
      bouton: "Revenir en arrière", ton: "danger", mot: d.service,
    });
    if (ok) ui.message(`Retour arrière de ${d.service} lancé.`, "bon");
  }

  async function rejouer(d: Deploiement) {
    const ok = await ui.confirmer({
      titre: `Rejouer le déploiement ${d.id} ?`,
      texte: `${d.service} ${d.version} repartira depuis la première étape, en ${d.environnement.toLowerCase()}.`,
      bouton: "Rejouer", ton: "info",
    });
    if (!ok) return;
    poserDeploiements((l) => l.map((x) => x.id === d.id
      ? { ...x, etat: "en cours", quand: "à l'instant",
          etapes: x.etapes.map((e, i) => ({ ...e, etat: i === 0 ? "en cours" : "attente" })) }
      : x));
    ui.message(`Déploiement ${d.id} relancé.`, "bon");
  }

  async function interrompre(d: Deploiement) {
    const ok = await ui.confirmer({
      titre: `Interrompre le déploiement ${d.id} ?`,
      texte: "L'étape en cours ira à son terme, puis l'enchaînement s'arrêtera. L'environnement restera dans l'état intermédiaire — à vous de décider ensuite.",
      bouton: "Interrompre", ton: "vigilance",
    });
    if (!ok) return;
    poserDeploiements((l) => l.map((x) => x.id === d.id ? { ...x, etat: "annulé" } : x));
    ui.message(`Déploiement ${d.id} interrompu.`, "info");
  }

  function detail(d: Deploiement) {
    ui.ouvrirTiroir({
      titre: `${d.service} ${d.version}`,
      sous: <><span className="font-mono">{d.id}</span> · {d.environnement}</>,
      onglets: [
        { nom: "Déroulé", contenu: (
          <>
            <div className="mb-4"><Etapes etapes={d.etapes} /></div>
            <Definitions lignes={[
              ["Service", <span className="font-mono">{d.service}</span>],
              ["Version", <span className="font-mono">{d.version}</span>],
              ["Environnement", d.environnement],
              ["Auteur", d.auteur],
              ["Lancé", d.quand],
              ["Durée", d.duree],
              ["État", <Jeton ton={TON[d.etat]} enfants={d.etat} />],
            ]} />
          </>
        )},
        { nom: "Ce que ça change", contenu: (
          <p className="text-[13px] text-encre-2 leading-[20px]">{d.note}</p>
        )},
      ],
      pied: (
        <>
          {d.etat === "en cours"
            ? <Bouton ton="danger" icone="pause" onClick={() => { ui.fermerTiroir(); interrompre(d); }} enfants="Interrompre" />
            : <Bouton icone="rafraichir" onClick={() => { ui.fermerTiroir(); rejouer(d); }} enfants="Rejouer" />}
          {d.etat === "réussi" && d.environnement === "Production" && (
            <Bouton ton="danger" className="ml-auto" icone="tendanceBas" onClick={() => { ui.fermerTiroir(); revenir(d); }} enfants="Revenir en arrière" />
          )}
        </>
      ),
    });
  }

  return (
    <>
      <Entete
        titre="Déploiements"
        sous="Ce qui est parti en production, par qui, et ce que ça change pour les agents."
        actions={
          <>
            <select value={env} onChange={(e) => poserEnv(e.target.value)} aria-label="Filtrer par environnement"
              className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
              <option value="">Tous les environnements</option>
              {["Production", "Recette", "Bac à sable"].map((e) => <option key={e}>{e}</option>)}
            </select>
            <Bouton ton="principal" icone="fusee" onClick={() => ui.message("Assistant de déploiement à brancher.", "info")} enfants="Déployer" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sur 30 jours" valeur={String(deploiements.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Taux de réussite" valeur={`${tauxReussite} %`} ton={tauxReussite >= 80 ? "bon" : "vigilance"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En cours" valeur={String(enCours)} ton={enCours ? "accent" : undefined} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En échec" valeur={String(echecs)} ton={echecs ? "critique" : "bon"} />} />
      </div>

      {enCours > 0 && (
        <Carte className="mb-4 border-accent/40" enfants={
          <>
            <TeteCarte
              titre="Déploiement en cours"
              sous="L'enchaînement s'arrête tout seul si une étape échoue"
              outils={<Bouton taille="s" ton="danger" icone="pause" onClick={() => interrompre(deploiements.find((d) => d.etat === "en cours")!)} enfants="Interrompre" />}
            />
            {deploiements.filter((d) => d.etat === "en cours").map((d) => (
              <div key={d.id} className="pas-carte pt-3">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="font-mono text-[13px] font-semibold">{d.service}</span>
                  <Jeton ton="accent" point={false} enfants={d.version} />
                  <Jeton ton="neutre" point={false} enfants={d.environnement} />
                  <span className="text-[12px] text-encre-3 ml-auto">par {d.auteur} · {d.quand}</span>
                </div>
                <Etapes etapes={d.etapes} />
                <p className="text-[12px] text-encre-3 mt-3">{d.note}</p>
              </div>
            ))}
          </>
        } />
      )}

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[{ cle: "liste", nom: "Historique", compte: filtres.length }, { cle: "frise", nom: "Chronologie" }]}
          />

          {onglet === "liste" ? (
            <div className="divide-y divide-bordure">
              {filtres.map((d, i) => (
                <button key={d.id} type="button" onClick={() => detail(d)}
                  className="flex items-start gap-3 pas-carte w-full text-left hover:bg-surface-2 transi anim-entre"
                  style={{ animationDelay: i * 25 + "ms" }}>
                  <span className={cx(
                    "mt-[2px] w-[26px] h-[26px] rounded-[4px] grid place-items-center shrink-0",
                    d.etat === "réussi" ? "bg-bon-voile text-bon"
                      : d.etat === "en cours" ? "bg-accent-voile text-accent"
                      : d.etat === "échoué" ? "bg-critique-voile text-critique" : "bg-surface-3 text-encre-3",
                  )}>
                    <Icone nom={d.etat === "réussi" ? "check" : d.etat === "en cours" ? "rafraichir" : d.etat === "échoué" ? "croix" : "pause"} taille="s" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[13px] font-semibold">{d.service}</span>
                      <Jeton ton="accent" point={false} enfants={d.version} />
                      <Jeton ton="neutre" point={false} enfants={d.environnement} />
                      <span className="font-mono text-[11px] text-encre-4">{d.id}</span>
                    </span>
                    <span className="block text-[12px] text-encre-2 mt-[3px]">{d.note}</span>
                    <span className="block text-[11px] text-encre-4 mt-[4px]">
                      {d.auteur} · {d.quand} · {d.duree}
                    </span>
                  </span>

                  <span className="shrink-0 max-md:hidden"><Etapes etapes={d.etapes} /></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="pas-carte">
              <Chronologie points={filtres.map((d) => ({
                quand: `${d.quand} · ${d.duree}`,
                titre: `${d.service} ${d.version} — ${d.environnement}`,
                texte: <>{d.note} <span className="text-encre-4">— par {d.auteur}</span></>,
                ton: d.etat === "réussi" ? "bon" : d.etat === "échoué" ? "critique" : d.etat === "en cours" ? "vigilance" : "neutre",
              }))} />
            </div>
          )}
        </>
      } />
    </>
  );
}
