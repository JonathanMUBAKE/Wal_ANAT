import { useState } from "react";
import { Bouton, Carte, Entete, Interrupteur, Jeton, LigneReglage, LigneStat, Onglets, Pastille, Progression, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { useUI } from "../composants/Superpositions";
import { cx, fmt } from "../lib/format";
import { agentsIA, clesModeles, confidentialite, modeles as modelesInitiaux, type ModeleIA } from "../lib/intelligence";

/* Modèles et clés : quel moteur répond, combien il coûte, et ce qui sort du
   réseau de l'Agence. La page répond surtout à la question que posera la
   direction : « où vont nos données ? ». */
export function ModelesIA() {
  const ui = useUI();
  const [modeles, poserModeles] = useState<ModeleIA[]>(modelesInitiaux);
  const [onglet, poserOnglet] = useState("modeles");

  const depense = clesModeles.reduce((a, c) => a + c.consomme, 0);
  const plafond = clesModeles.reduce((a, c) => a + c.plafondMensuel, 0);
  const parModele = modeles.map((m) => ({
    ...m, agents: agentsIA.filter((a) => a.modele === m.cle).length,
  }));

  async function definirDefaut(m: ModeleIA) {
    const ok = await ui.confirmer({
      titre: `Faire de « ${m.nom} » le modèle par défaut ?`,
      texte: `Tous les agents qui n'imposent pas de modèle basculeront sur celui-ci. ${m.heberge === "Nuage" ? "Leurs données sortiront du réseau de l'Agence." : "Leurs données resteront sur le réseau de l'Agence, avec des réponses plus lentes."}`,
      bouton: "Définir par défaut", ton: "vigilance",
    });
    if (!ok) return;
    poserModeles((l) => l.map((x) => ({ ...x, defaut: x.cle === m.cle })));
    ui.message(`« ${m.nom} » est le modèle par défaut.`, "bon");
  }

  async function basculerModele(m: ModeleIA) {
    if (m.actif && m.defaut) {
      return ui.message("Impossible de désactiver le modèle par défaut. Désignez-en un autre d'abord.", "critique");
    }
    poserModeles((l) => l.map((x) => x.cle === m.cle ? { ...x, actif: !x.actif } : x));
    ui.message(m.actif ? `« ${m.nom} » désactivé.` : `« ${m.nom} » activé.`, "bon");
  }

  async function revoquerCle(nom: string) {
    const ok = await ui.confirmer({
      titre: `Révoquer « ${nom} » ?`,
      texte: "Tous les agents qui s'en servent cesseront de répondre dès la prochaine requête. La révocation est définitive chez le fournisseur.",
      bouton: "Révoquer", ton: "danger", mot: "REVOQUER",
    });
    if (ok) ui.message(`« ${nom} » révoquée.`, "bon");
  }

  return (
    <>
      <Entete
        titre="Modèles et clés"
        sous="Quel moteur répond, combien il coûte, et ce qui sort du réseau de l'Agence."
        actions={<Bouton ton="principal" icone="plus" onClick={() => ui.message("Déclaration de modèle à brancher.", "info")} enfants="Déclarer un modèle" />}
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Modèles déclarés" valeur={String(modeles.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Actifs" valeur={String(modeles.filter((m) => m.actif).length)} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Hébergés sur site" valeur={String(modeles.filter((m) => m.heberge === "Sur site").length)} ton="bon" />} />
        <Carte className="pas-carte" enfants={
          <>
            <LigneStat etiquette="Dépense du mois" valeur={`${depense.toFixed(2)} € / ${plafond} €`}
              ton={depense / plafond > 0.8 ? "vigilance" : "bon"} />
            <Progression valeur={(depense / plafond) * 100} ton={depense / plafond > 0.8 ? "critique" : "bon"} />
          </>
        } />
      </div>

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "modeles", nom: "Modèles", compte: modeles.length },
              { cle: "cles", nom: "Clés", compte: clesModeles.length },
              { cle: "confidentialite", nom: "Confidentialité" },
            ]}
          />

          <div className="pas-carte">
            {onglet === "modeles" && (
              <div className="space-y-3">
                {parModele.map((m, i) => (
                  <div key={m.cle} className={cx(
                    "p-4 rounded-[4px] border anim-entre",
                    m.defaut ? "border-accent/40 bg-accent-voile" : "border-bordure bg-surface-2",
                    !m.actif && "opacity-60",
                  )} style={{ animationDelay: i * 30 + "ms" }}>
                    <div className="flex items-start gap-3 mb-3">
                      <span className={cx("w-[30px] h-[30px] rounded-[4px] grid place-items-center shrink-0",
                        m.heberge === "Sur site" ? "bg-bon-voile text-bon" : "bg-surface-3 text-encre-3")}>
                        <Icone nom="puce" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13.5px] font-semibold">{m.nom}</span>
                          {m.defaut && <Jeton ton="accent" enfants="par défaut" />}
                          <Jeton ton={m.heberge === "Sur site" ? "bon" : "neutre"} point={false} enfants={m.heberge} />
                          {m.agents > 0 && <Jeton ton="neutre" point={false} enfants={`${m.agents} agent${m.agents > 1 ? "s" : ""}`} />}
                        </div>
                        <p className="text-[12px] text-encre-3 mt-[2px]">{m.usage}</p>
                        <p className="text-[11px] text-encre-4 mt-[3px]">{m.fournisseur} · contexte {m.contexte}</p>
                      </div>
                      <Interrupteur actif={m.actif} surChangement={() => basculerModele(m)} etiquette={`Activer ${m.nom}`} />
                    </div>

                    <div className="grid gap-3 text-[12px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                      <div>
                        <div className="text-encre-3">Entrée</div>
                        <div className="tab-num font-semibold">{m.entree ? `${m.entree} € / M jetons` : "sans coût"}</div>
                      </div>
                      <div>
                        <div className="text-encre-3">Sortie</div>
                        <div className="tab-num font-semibold">{m.sortie ? `${m.sortie} € / M jetons` : "sans coût"}</div>
                      </div>
                      <div>
                        <div className="text-encre-3">Latence type</div>
                        <div className="tab-num font-semibold">{fmt(m.latence)} ms</div>
                      </div>
                      <div className="flex items-end">
                        {!m.defaut && m.actif && (
                          <Bouton taille="s" onClick={() => definirDefaut(m)} enfants="Par défaut" />
                        )}
                      </div>
                    </div>

                    {m.heberge === "Sur site" && (
                      <p className="text-[11.5px] text-bon mt-3 flex items-start gap-[6px]">
                        <Icone nom="bouclier" taille="s" className="mt-[2px] shrink-0" />
                        Les données traitées par ce modèle ne quittent pas le réseau de l'Agence.
                        C'est le modèle à imposer pour les dossiers individuels et les archives.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {onglet === "cles" && (
              <>
                <p className="text-[12px] text-encre-3 mb-3">
                  Une clé porte un plafond mensuel. Atteint, les agents qui en dépendent s'arrêtent
                  et préviennent — ils ne basculent pas en silence sur un modèle moins cher.
                </p>
                {clesModeles.map((c) => (
                  <div key={c.id} className={cx("flex items-start gap-3 py-[12px] border-b border-bordure last:border-0", !c.actif && "opacity-55")}>
                    <Pastille ton={!c.actif ? "neutre" : c.consomme / c.plafondMensuel > 0.8 ? "vigilance" : "bon"} pulse={c.actif} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold">{c.nom}</span>
                        <span className="font-mono text-[11px] px-[6px] py-[1px] rounded-[3px] bg-surface-3 text-encre-3">{c.prefixe}•••••</span>
                        {!c.actif && <Jeton ton="neutre" enfants="inactive" />}
                      </div>
                      <div className="text-[11px] text-encre-4 mt-[3px]">
                        {c.fournisseur} · créée par {c.creePar} le {c.creeLe} · {c.derniereUtilisation}
                      </div>
                      <div className="flex items-center gap-2 mt-2 max-w-[320px]">
                        <Progression valeur={(c.consomme / c.plafondMensuel) * 100}
                          ton={c.consomme / c.plafondMensuel > 0.8 ? "critique" : "bon"} />
                        <span className="text-[11.5px] tab-num text-encre-2 shrink-0">
                          {c.consomme.toFixed(2)} / {c.plafondMensuel} €
                        </span>
                      </div>
                    </div>
                    {c.actif && (
                      <Bouton taille="s" ton="danger" icone="corbeille" title="Révoquer"
                        onClick={() => revoquerCle(c.nom)} />
                    )}
                  </div>
                ))}
                <Bouton taille="s" className="mt-3" icone="plus"
                  onClick={() => ui.message("La clé ne s'affiche qu'une fois, à sa création.", "info")}
                  enfants="Ajouter une clé" />
              </>
            )}

            {onglet === "confidentialite" && (
              <>
                <div className="p-3 rounded-[4px] bg-surface-2 border border-bordure text-[12.5px] text-encre-2 mb-4">
                  Ce que la direction demandera : où vont les données, combien de temps elles restent
                  chez le fournisseur, et si elles servent à entraîner quoi que ce soit. Les réponses
                  sont ici, et elles sont vérifiables au contrat.
                </div>
                <LigneReglage titre="Données envoyées au modèle"
                  texte="Les noms, matricules et adresses sont remplacés par des identifiants techniques avant l'envoi."
                  controle={<Jeton ton="bon" enfants={confidentialite.sortieDonnees} />} />
                <LigneReglage titre="Conservation chez le fournisseur"
                  texte="Durée pendant laquelle le fournisseur garde les requêtes, selon le contrat signé."
                  controle={<Jeton ton="bon" enfants={confidentialite.retentionFournisseur} />} />
                <LigneReglage titre="Utilisation pour l'entraînement"
                  texte="Si les requêtes de l'Agence servent à améliorer les modèles du fournisseur."
                  controle={<Jeton ton={confidentialite.entrainement ? "critique" : "bon"}
                    enfants={confidentialite.entrainement ? "autorisée" : "refusée au contrat"} />} />
                <LigneReglage titre="Journalisation des invites"
                  texte="Ce qui a été envoyé au modèle est conservé localement, pour pouvoir expliquer une réponse."
                  controle={<Jeton ton="bon" enfants={`${confidentialite.retentionInvites} jours`} />} />
                <LigneReglage titre="Modèle imposé pour les données sensibles"
                  texte="Les dossiers individuels et les archives passent obligatoirement par le modèle hébergé sur site."
                  avertissement="Ce réglage ne couvre pas tout : c'est la liste des catégories interdites, ci-dessous, qui bloque réellement l'envoi."
                  controle={<Jeton ton="bon" enfants="Modèle sur site" />} />

                <div className="mt-4 pt-4 border-t border-bordure">
                  <h3 className="text-[13px] font-semibold mb-1">Catégories qui ne sortent jamais</h3>
                  <p className="text-[12px] text-encre-3 mb-3">
                    Détectées avant l'envoi. Une requête qui en contient est refusée, pas tronquée :
                    l'agent le dit plutôt que de répondre à moitié.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {confidentialite.categoriesInterdites.map((c) => (
                      <span key={c} className="inline-flex items-center gap-[6px] px-[9px] py-[5px] rounded-[4px] bg-critique-voile text-critique text-[12px]">
                        <Icone nom="bouclier" taille="s" />{c}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      } />

      <Carte className="mt-4" enfants={
        <>
          <TeteCarte titre="Qui utilise quoi" sous="Répartition des agents par modèle" />
          <div className="pas-carte pt-3">
            {parModele.filter((m) => m.agents > 0).map((m) => (
              <div key={m.cle} className="flex items-center gap-3 py-[7px] text-[13px]">
                <span className="w-[160px] shrink-0 truncate">{m.nom}</span>
                <Progression valeur={(m.agents / agentsIA.length) * 100} ton={m.heberge === "Sur site" ? "bon" : "accent"} />
                <span className="ml-auto tab-num text-encre-2 shrink-0">
                  {m.agents} agent{m.agents > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      } />
    </>
  );
}
