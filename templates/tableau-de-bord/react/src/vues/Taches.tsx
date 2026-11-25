import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Interrupteur, Jeton, LigneStat, Pastille } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, normaliser } from "../lib/format";
import { tachesInitiales, type TachePlanifiee } from "../lib/sigrh";

/* Tâches planifiées : ce que le système fait tout seul, à heure fixe.
   Une tâche désactivée doit se voir au premier regard — c'est la panne la
   plus silencieuse d'un système de gestion. */
export function Taches() {
  const ui = useUI();
  const [taches, poserTaches] = useState<TachePlanifiee[]>(tachesInitiales);
  const [q, poserQ] = useState("");
  const [filtre, poserFiltre] = useState<"" | "actives" | "inactives" | "echecs">("");

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return taches.filter((t) => {
      if (n && !normaliser(`${t.nom} ${t.description} ${t.proprietaire}`).includes(n)) return false;
      if (filtre === "actives") return t.active;
      if (filtre === "inactives") return !t.active;
      if (filtre === "echecs") return t.etat === "échouée";
      return true;
    });
  }, [taches, q, filtre]);

  const echecs = taches.filter((t) => t.etat === "échouée").length;
  const inactives = taches.filter((t) => !t.active).length;

  const tonEtat = (t: TachePlanifiee) =>
    !t.active ? "neutre" : t.etat === "échouée" ? "critique" : t.etat === "en cours" ? "accent" : "bon";

  async function basculer(t: TachePlanifiee) {
    if (t.active) {
      const ok = await ui.confirmer({
        titre: `Désactiver « ${t.nom} » ?`,
        texte: `La tâche ne s'exécutera plus ${t.lisible}. Rien ne la relancera tant qu'elle restera désactivée : c'est la panne la plus silencieuse d'un système de gestion.`,
        bouton: "Désactiver", ton: "vigilance",
      });
      if (!ok) return;
    }
    poserTaches((l) => l.map((x) => x.id === t.id
      ? { ...x, active: !x.active, prochaine: x.active ? "désactivée" : "au prochain créneau" } : x));
    ui.message(t.active ? `« ${t.nom} » désactivée.` : `« ${t.nom} » réactivée.`, "bon");
  }

  async function executer(t: TachePlanifiee) {
    const ok = await ui.confirmer({
      titre: `Lancer « ${t.nom} » maintenant ?`,
      texte: `La tâche s'exécutera en plus de sa programmation ${t.lisible}. Durée habituelle : ${t.duree}.`,
      bouton: "Lancer", ton: "info",
    });
    if (!ok) return;
    poserTaches((l) => l.map((x) => x.id === t.id ? { ...x, etat: "en cours", derniere: "à l'instant", traite: "en cours…" } : x));
    ui.message(`« ${t.nom} » lancée.`, "bon");
  }

  function detail(t: TachePlanifiee) {
    ui.ouvrirTiroir({
      titre: t.nom,
      sous: <span className="font-mono">{t.expression}</span>,
      onglets: [
        { nom: "Fiche", contenu: (
          <>
            <p className="text-[13px] text-encre-2 mb-4">{t.description}</p>
            <Definitions lignes={[
              ["Programmation", <>{t.lisible} <span className="font-mono text-encre-3">({t.expression})</span></>],
              ["Responsable", t.proprietaire],
              ["État", <Jeton ton={tonEtat(t)} enfants={t.active ? t.etat : "désactivée"} />],
              ["Dernière exécution", t.derniere],
              ["Durée", t.duree],
              ["Volume traité", t.traite],
              ["Prochaine", t.prochaine],
            ]} />
          </>
        )},
        { nom: "Journal", contenu: (
          <div className="font-mono text-[12px] leading-[1.75] bg-fond rounded-[4px] border border-bordure p-3">
            <div className="text-encre-3">[{t.derniere}] démarrage de la tâche {t.id}</div>
            <div className="text-encre-2">[{t.derniere}] verrou acquis</div>
            <div className="text-encre-2">[{t.derniere}] traitement : {t.traite}</div>
            {t.etat === "échouée"
              ? <div className="text-critique">[{t.derniere}] ERREUR — interruption, le verrou est relâché</div>
              : <div className="text-bon">[{t.derniere}] terminé en {t.duree}</div>}
          </div>
        )},
      ],
      pied: (
        <>
          <Bouton icone="lecture" onClick={() => { ui.fermerTiroir(); executer(t); }} enfants="Lancer maintenant" />
          <Bouton className="ml-auto" icone="reglages"
            onClick={() => ui.message("Édition de la programmation à brancher.", "info")} enfants="Modifier la programmation" />
        </>
      ),
    });
  }

  return (
    <>
      <Entete
        titre="Tâches planifiées"
        sous="Ce que le système fait tout seul, à heure fixe : imports, calculs, relances, sauvegardes."
        actions={
          <>
            <Bouton icone="telecharger" onClick={() => { exporterCSV("taches", filtres); ui.message("Liste des tâches exportée.", "bon"); }} enfants="Exporter" />
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Assistant de création de tâche à brancher.", "info")} enfants="Nouvelle tâche" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Tâches déclarées" valeur={String(taches.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Actives" valeur={String(taches.length - inactives)} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Désactivées" valeur={String(inactives)} ton={inactives ? "vigilance" : undefined} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En échec" valeur={String(echecs)} ton={echecs ? "critique" : "bon"} />} />
      </div>

      <Carte enfants={
        <>
          <div className="flex items-center gap-2 flex-wrap pas-carte border-b border-bordure sans-impression">
            <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
              <Icone nom="recherche" taille="s" />
              <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                placeholder="Nom, description, responsable…" aria-label="Rechercher une tâche"
                className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
            </div>
            <div className="flex gap-[6px] flex-wrap" role="group" aria-label="Filtres">
              {([["", "Toutes"], ["actives", "Actives"], ["inactives", "Désactivées"], ["echecs", "En échec"]] as const).map(([c, n]) => (
                <button key={c} type="button" aria-pressed={filtre === c} onClick={() => poserFiltre(c)}
                  className={cx("h-[27px] px-[10px] rounded-[4px] border text-[12.5px] transi",
                    filtre === c ? "bg-accent-voile border-accent text-accent font-semibold"
                      : "bg-surface-2 border-bordure text-encre-3 hover:text-encre hover:border-bordure-2")}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-bordure">
            {filtres.map((t, i) => (
              <div key={t.id} className={cx("flex items-start gap-3 pas-carte hover:bg-surface-2 transi anim-entre", !t.active && "opacity-60")}
                   style={{ animationDelay: i * 20 + "ms" }}>
                <span className="mt-[5px] shrink-0"><Pastille ton={tonEtat(t) === "accent" ? "bon" : (tonEtat(t) as "bon" | "critique" | "neutre")} pulse={t.etat === "en cours"} /></span>

                <button type="button" onClick={() => detail(t)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold">{t.nom}</span>
                    <span className="font-mono text-[11px] text-encre-3 px-[6px] py-[1px] rounded-[3px] bg-surface-3">{t.expression}</span>
                    {!t.active && <Jeton ton="neutre" enfants="désactivée" />}
                    {t.etat === "échouée" && t.active && <Jeton ton="critique" enfants="dernière exécution en échec" />}
                    {t.etat === "en cours" && <Jeton ton="accent" enfants="en cours" />}
                  </div>
                  <p className="text-[12px] text-encre-3 mt-[2px]">{t.description}</p>
                  <div className="flex items-center gap-x-4 gap-y-1 mt-[6px] text-[11px] text-encre-4 flex-wrap">
                    <span className="inline-flex items-center gap-[4px]"><Icone nom="horloge" taille="s" />{t.lisible}</span>
                    <span className="inline-flex items-center gap-[4px]"><Icone nom="check" taille="s" />{t.derniere} · {t.duree}</span>
                    <span className="inline-flex items-center gap-[4px]"><Icone nom="boite" taille="s" />{t.traite}</span>
                    <span className="inline-flex items-center gap-[4px]"><Icone nom="utilisateurs" taille="s" />{t.proprietaire}</span>
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-encre-3 tab-num whitespace-nowrap max-sm:hidden">{t.prochaine}</span>
                  <Bouton taille="s" icone="lecture" title="Lancer maintenant" onClick={() => executer(t)} />
                  <Interrupteur actif={t.active} surChangement={() => basculer(t)} etiquette={`Activer ${t.nom}`} />
                </div>
              </div>
            ))}
            {filtres.length === 0 && (
              <p className="px-4 py-10 text-center text-[13px] text-encre-3">Aucune tâche ne correspond à ce filtre.</p>
            )}
          </div>
        </>
      } />
    </>
  );
}
