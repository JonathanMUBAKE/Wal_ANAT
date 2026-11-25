import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Pastille, TeteCarte } from "../composants/Primitives";
import { Icone, type NomIcone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx } from "../lib/format";
import { integrationsInitiales, type Integration } from "../lib/sigrh";

const ICONES: Record<string, NomIcone> = {
  annuaire: "utilisateurs", pointeuses: "horloge", messagerie: "cloche",
  sms: "eclair", signature: "rapport", comptabilite: "monnaie", archivage: "base",
};

const TON: Record<Integration["etat"], "bon" | "vigilance" | "critique" | "neutre"> = {
  "connectée": "bon", "dégradée": "vigilance", "en erreur": "critique", "non connectée": "neutre",
};

/* Intégrations : ce qui entre dans le SIGRH et ce qui en sort. Une intégration
   en erreur se voit de loin — c'est toujours de là que viennent les données
   manquantes dont personne ne comprend l'absence. */
export function Integrations() {
  const ui = useUI();
  const [integrations, poserIntegrations] = useState<Integration[]>(integrationsInitiales);
  const [categorie, poserCategorie] = useState("");

  const categories = useMemo(() => [...new Set(integrationsInitiales.map((i) => i.categorie))].sort(), []);
  const filtres = useMemo(
    () => integrations.filter((i) => !categorie || i.categorie === categorie), [integrations, categorie]);

  const connectees = integrations.filter((i) => i.etat === "connectée").length;
  const enErreur = integrations.filter((i) => i.etat === "en erreur");
  const degradees = integrations.filter((i) => i.etat === "dégradée");

  async function tester(i: Integration) {
    ui.message(`Test de « ${i.nom} » en cours…`, "info", { duree: 1400 });
    setTimeout(() => {
      if (i.etat === "en erreur") ui.message(`« ${i.nom} » : le test échoue, même erreur qu'en production.`, "critique");
      else if (i.etat === "non connectée") ui.message(`« ${i.nom} » : aucun paramètre enregistré.`, "critique");
      else ui.message(`« ${i.nom} » : le test aboutit.`, "bon");
    }, 1500);
  }

  async function synchroniser(i: Integration) {
    const ok = await ui.confirmer({
      titre: `Lancer une synchronisation de « ${i.nom} » ?`,
      texte: i.sens === "Entrant"
        ? "Les données distantes seront relues et appliquées au référentiel. Les modifications faites ici depuis la dernière synchronisation peuvent être écrasées."
        : "Les données en attente seront renvoyées au système distant.",
      bouton: "Synchroniser", ton: i.sens === "Entrant" ? "vigilance" : "info",
    });
    if (!ok) return;
    poserIntegrations((l) => l.map((x) => x.cle === i.cle ? { ...x, derniereSynchro: "à l'instant" } : x));
    ui.message(`Synchronisation de « ${i.nom} » lancée.`, "bon");
  }

  async function deconnecter(i: Integration) {
    const ok = await ui.confirmer({
      titre: `Déconnecter « ${i.nom} » ?`,
      texte: `Les échanges s'arrêtent immédiatement. ${i.sens === "Entrant" ? "Les données concernées ne seront plus mises à jour et personne ne sera prévenu côté métier." : "Les éléments en attente resteront en file sans être transmis."} Les paramètres sont conservés : la reconnexion ne demandera pas de tout ressaisir.`,
      bouton: "Déconnecter", ton: "danger", mot: i.nom,
    });
    if (!ok) return;
    poserIntegrations((l) => l.map((x) => x.cle === i.cle ? { ...x, etat: "non connectée", derniereSynchro: "—", volume: "—" } : x));
    ui.message(`« ${i.nom} » déconnectée.`, "bon");
  }

  function detail(i: Integration) {
    ui.ouvrirTiroir({
      titre: i.nom,
      sous: <span className="inline-flex items-center gap-2"><Pastille ton={TON[i.etat]} />{i.etat}</span>,
      onglets: [
        { nom: "Fiche", contenu: (
          <>
            <p className="text-[13px] text-encre-2 mb-4">{i.description}</p>
            <Definitions lignes={[
              ["Catégorie", i.categorie],
              ["Sens des échanges", i.sens],
              ["État", <Jeton ton={TON[i.etat]} enfants={i.etat} />],
              ["Dernière synchronisation", i.derniereSynchro],
              ["Volume", i.volume],
            ]} />
          </>
        )},
        { nom: "Journal", contenu: (
          <div className="font-mono text-[12px] leading-[1.75] bg-fond rounded-[4px] border border-bordure p-3">
            <div className="text-encre-3">[{i.derniereSynchro}] ouverture de la connexion</div>
            {i.etat === "en erreur" ? (
              <>
                <div className="text-encre-2">[{i.derniereSynchro}] authentification acceptée</div>
                <div className="text-critique">[{i.derniereSynchro}] ERREUR — le format attendu a changé côté distant</div>
                <div className="text-critique">[{i.derniereSynchro}] 48 écritures laissées en file</div>
              </>
            ) : i.etat === "dégradée" ? (
              <>
                <div className="text-vigilance">[{i.derniereSynchro}] ALERTE — réponse lente, 3 tentatives</div>
                <div className="text-encre-2">[{i.derniereSynchro}] synchronisation partielle : 68 %</div>
              </>
            ) : (
              <>
                <div className="text-encre-2">[{i.derniereSynchro}] {i.volume}</div>
                <div className="text-bon">[{i.derniereSynchro}] terminé sans erreur</div>
              </>
            )}
          </div>
        )},
      ],
      pied: (
        <>
          <Bouton icone="eclair" onClick={() => tester(i)} enfants="Tester" />
          {i.etat !== "non connectée" && (
            <Bouton ton="danger" className="ml-auto" icone="prise"
              onClick={() => { ui.fermerTiroir(); deconnecter(i); }} enfants="Déconnecter" />
          )}
        </>
      ),
    });
  }

  return (
    <>
      <Entete
        titre="Intégrations"
        sous="Ce qui entre dans le SIGRH et ce qui en sort : annuaire, pointeuses, messagerie, paie, archivage."
        actions={
          <>
            <select value={categorie} onChange={(e) => poserCategorie(e.target.value)} aria-label="Filtrer par catégorie"
              className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
              <option value="">Toutes les catégories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Catalogue des connecteurs à brancher.", "info")} enfants="Ajouter" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Intégrations déclarées" valeur={String(integrations.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Connectées" valeur={String(connectees)} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Dégradées" valeur={String(degradees.length)} ton={degradees.length ? "vigilance" : undefined} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En erreur" valeur={String(enErreur.length)} ton={enErreur.length ? "critique" : "bon"} />} />
      </div>

      {enErreur.length > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-critique-voile border border-critique/40 anim-apparait">
          <Icone nom="prise" className="text-critique mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,220px)] text-[13px]">
            <b>« {enErreur[0].nom} » n'échange plus depuis {enErreur[0].derniereSynchro}.</b>{" "}
            <span className="text-encre-2">
              {enErreur[0].volume} — tant que cette liaison reste coupée, la paie travaille sur des
              données arrêtées à la dernière synchronisation réussie.
            </span>
          </div>
          <Bouton taille="s" onClick={() => detail(enErreur[0])} enfants="Voir le journal" />
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {filtres.map((i, k) => (
          <Carte key={i.cle} className={cx("anim-entre", i.etat === "en erreur" && "border-critique/50")} enfants={
            <div style={{ animationDelay: k * 30 + "ms" }}>
              <TeteCarte
                titre={i.nom}
                sous={i.categorie + " · " + i.sens.toLowerCase()}
                outils={<Bouton taille="s" icone="points" aria-label={"Détail de " + i.nom} onClick={() => detail(i)} />}
              />
              <div className="pas-carte pt-3">
                <div className="flex items-start gap-3 mb-3">
                  <span className={cx(
                    "w-[34px] h-[34px] rounded-[4px] grid place-items-center shrink-0",
                    TON[i.etat] === "bon" ? "bg-bon-voile text-bon"
                      : TON[i.etat] === "vigilance" ? "bg-vigilance-voile text-vigilance"
                      : TON[i.etat] === "critique" ? "bg-critique-voile text-critique" : "bg-surface-3 text-encre-3",
                  )}>
                    <Icone nom={ICONES[i.cle] ?? "prise"} />
                  </span>
                  <p className="text-[12px] text-encre-2 min-w-0">{i.description}</p>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Pastille ton={TON[i.etat]} pulse={i.etat === "connectée"} />
                  <span className="text-[12px] text-encre-2">{i.etat}</span>
                  <span className="ml-auto text-[11px] text-encre-3">{i.derniereSynchro}</span>
                </div>

                <div className="text-[12px] text-encre-3 mb-3">{i.volume}</div>

                <div className="flex items-center gap-2">
                  <Bouton taille="s" icone="eclair" onClick={() => tester(i)} enfants="Tester" />
                  {i.etat === "non connectée" ? (
                    <Bouton taille="s" ton="principal" icone="prise"
                      onClick={() => ui.message("Assistant de connexion à brancher.", "info")} enfants="Connecter" />
                  ) : (
                    <Bouton taille="s" icone="rafraichir" onClick={() => synchroniser(i)} enfants="Synchroniser" />
                  )}
                </div>
              </div>
            </div>
          } />
        ))}
      </div>
    </>
  );
}
