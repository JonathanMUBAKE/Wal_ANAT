import { Bouton, LigneStat, Pastille, Progression } from "./Primitives";
import { Etincelle } from "./Graphique";
import { Icone } from "./Icone";
import { fmt } from "../lib/format";
import { charge, comptes } from "../lib/donnees";
import {
  disponibilite, filesInitiales, integrationsInitiales, jetonsInitiaux,
  sauvegardes, servicesSIGRH, sessionsInitiales, tachesInitiales,
} from "../lib/sigrh";
import { connexions, journalMateriel, systeme, temperatures, ventilateurs, verrous, replication } from "../lib/infrastructure";
import { agentsIA, approbationsMCP, clesModeles, connecteursMCP, executionsAgents } from "../lib/intelligence";
import { sms, smtp, whatsapp, envois } from "../lib/communication";
import { accords, arbitrages, courriers, decisions, dossiers, circuits, seances } from "../lib/institution";

/* Le bas du panneau de section porte l'essentiel du domaine, comme la carte
   « console » du tableau de bord UniFi : un en-tête d'identité, une liste de
   couples étiquette-valeur, une courbe muette, puis une ou deux actions.
   On y met ce qui fait ouvrir une page, pas tout ce qu'on pourrait y mettre. */
export function ResumeGroupe({ groupe, aller }: { groupe: string; aller: (cle: string) => void }) {
  if (groupe === "Pilotage") {
    const global = disponibilite.reduce((a, s) => a + s.taux90, 0) / disponibilite.length;
    return (
      <Bloc titre="État de la plateforme">
        <LigneStat etiquette="Disponibilité (90 j)" valeur={`${global.toFixed(2)} %`} ton={global >= 99.9 ? "bon" : "vigilance"} />
        <LigneStat etiquette="Agents du référentiel" valeur={fmt(412)} />
        <LigneStat etiquette="Connectés maintenant" valeur={fmt(sessionsInitiales.length)} />
        <LigneStat etiquette="Incidents ouverts" valeur="2" ton="critique" />
        <LigneStat etiquette="Requêtes par minute" valeur={fmt(charge[0].valeurs.at(-1) ?? 0)} />
        <Etincelle valeurs={charge[0].valeurs} couleur="--serie-1" hauteur={34} />
        <Alerte texte="Incident P1 sur la passerelle d'entrée depuis 14 min." ton="critique" />
        <div className="mt-3 space-y-2">
          <Bouton taille="s" icone="alerte" className="w-full" onClick={() => aller("alertes")} enfants="Centre d'alertes" />
          <Bouton taille="s" icone="rapport" className="w-full" onClick={() => aller("rapports")} enfants="Rapports de direction" />
        </div>
      </Bloc>
    );
  }

  if (groupe === "Dossiers") {
    const ecarts = dossiers.filter((d) => d.santeDeclaree !== d.santeCalculee).length;
    const attente = arbitrages.filter((a) => a.etat === "en attente").length;
    const echeances = accords.filter((a) => a.etat === "en vigueur" && a.joursAvantEcheance <= 60).length;
    return (
      <Bloc titre="Dossiers pilotés">
        <LigneStat etiquette="Projets et activités" valeur={String(dossiers.length)} />
        <LigneStat etiquette="En écart de santé" valeur={String(ecarts)} ton={ecarts ? "critique" : "bon"} />
        <LigneStat etiquette="Arbitrages en attente" valeur={String(attente)} ton={attente ? "vigilance" : "bon"} />
        <LigneStat etiquette="Accords en vigueur" valeur={String(accords.filter((a) => a.etat === "en vigueur").length)} />
        <LigneStat etiquette="Échéances sous 60 j" valeur={String(echeances)} ton={echeances ? "vigilance" : "bon"} />
        {ecarts > 0 && <Alerte texte="Un projet se déclare sain alors que son budget est engagé à 91 %." ton="critique" />}
        <div className="mt-3">
          <Bouton taille="s" icone="balance" className="w-full" onClick={() => aller("portefeuille")} enfants="Revue de portefeuille" />
        </div>
      </Bloc>
    );
  }

  if (groupe === "Secrétariat") {
    const aImputer = courriers.filter((c) => c.etat === "enregistré").length;
    const retards = courriers.filter((c) => c.joursRestants < 0 && c.etat !== "traité" && c.etat !== "classé sans suite").length;
    const aValider = seances.filter((s) => s.compteRendu === "soumis").length;
    const decRetard = decisions.filter((d) => (d.etat === "à exécuter" || d.etat === "en cours") && d.joursRestants < 0).length;
    const aSigner = circuits.filter((c) => c.etat === "en circuit").length;
    return (
      <Bloc titre="Secrétariat">
        <LigneStat etiquette="Courrier à imputer" valeur={String(aImputer)} ton={aImputer ? "vigilance" : "bon"} />
        <LigneStat etiquette="Courrier en retard" valeur={String(retards)} ton={retards ? "critique" : "bon"} />
        <LigneStat etiquette="Comptes rendus à valider" valeur={String(aValider)} ton={aValider ? "accent" : "bon"} />
        <LigneStat etiquette="Décisions en retard" valeur={String(decRetard)} ton={decRetard ? "critique" : "bon"} />
        <LigneStat etiquette="En circuit de signature" valeur={String(aSigner)} />
        {decRetard > 0 && <Alerte texte="Des décisions de séance ont dépassé leur échéance d'exécution." ton="critique" />}
        <div className="mt-3 space-y-2">
          <Bouton taille="s" icone="enveloppe" className="w-full" onClick={() => aller("courrier")} enfants="Mon courrier" />
          <Bouton taille="s" icone="cle" className="w-full" onClick={() => aller("signataire")} enfants="À viser ou signer" />
        </div>
      </Bloc>
    );
  }

  if (groupe === "Exploitation") {
    const alerte = servicesSIGRH.filter((s) => s.etat === "critique").length;
    const attente = filesInitiales.reduce((a, f) => a + f.enAttente, 0);
    const echecsTaches = tachesInitiales.filter((t) => t.etat === "échouée").length;
    return (
      <Bloc titre="Exploitation">
        <LigneStat etiquette="Services en service" valeur={`${servicesSIGRH.length - alerte} / ${servicesSIGRH.length}`} ton={alerte ? "critique" : "bon"} />
        <LigneStat etiquette="Messages en file" valeur={fmt(attente)} />
        <LigneStat etiquette="Tâches en échec" valeur={String(echecsTaches)} ton={echecsTaches ? "vigilance" : "bon"} />
        <LigneStat etiquette="Déploiement" valeur="1 en cours" ton="accent" />
        <div className="mt-3">
          <div className="flex items-center gap-2 text-[11px] text-encre-3 mb-[5px]">
            <Pastille ton="bon" pulse /> sigrh-presences v3.4.0
          </div>
          <Progression valeur={62} />
        </div>
      </Bloc>
    );
  }

  if (groupe === "Infrastructure") {
    const panne = ventilateurs.filter((v) => v.etat === "critique").length;
    const retardMax = Math.max(...replication.secondaires.map((s) => s.retard));
    return (
      <Bloc titre={systeme.hote}>
        <LigneStat etiquette="Modèle" valeur={systeme.modele} />
        <LigneStat etiquette="En service depuis" valeur={systeme.demarre} />
        <LigneStat etiquette="Charge" valeur={systeme.charge.join(" · ")} />
        <LigneStat etiquette="Mémoire" valeur={`${systeme.memoireUtilisee} / ${systeme.memoireTotale} Gio`} />
        <LigneStat etiquette="Entrée d'air" valeur={`${temperatures[0].valeur} °C`} ton="bon" />
        <LigneStat etiquette="Ventilateurs" valeur={`${ventilateurs.length - panne} / ${ventilateurs.length}`} ton={panne ? "critique" : "bon"} />
        <div className="h-px bg-bordure my-3" />
        <LigneStat etiquette="Connexions base" valeur={`${connexions.actives + connexions.inactives} / 400`} />
        <LigneStat etiquette="Verrous bloquants" valeur={String(verrous.length)} ton={verrous.length ? "critique" : "bon"} />
        <LigneStat etiquette="Retard de réplication" valeur={`${retardMax} s`} ton={retardMax > 30 ? "vigilance" : "bon"} />
        {panne > 0 && <Alerte texte={journalMateriel[0].message} ton="critique" />}
        <div className="mt-3 space-y-2">
          <Bouton taille="s" icone="thermometre" className="w-full" onClick={() => aller("sante")} enfants="Capteurs et journal" />
        </div>
      </Bloc>
    );
  }

  if (groupe === "Observabilité") {
    const sous = disponibilite.filter((s) => s.taux90 < s.engagement).length;
    return (
      <Bloc titre="Santé observée">
        <LigneStat etiquette="Alertes P1" valeur="2" ton="critique" />
        <LigneStat etiquette="Alertes P2 / P3" valeur="1 / 2" ton="vigilance" />
        <LigneStat etiquette="Latence p95" valeur="182 ms" />
        <LigneStat etiquette="Taux d'erreur" valeur="0,28 %" ton="bon" />
        <LigneStat etiquette="Sous engagement" valeur={String(sous)} ton={sous ? "critique" : "bon"} />
        <div className="mt-3">
          <Bouton taille="s" icone="etoiles" className="w-full" onClick={() => aller("journaux")} enfants="Lecture assistée des journaux" />
        </div>
      </Bloc>
    );
  }

  if (groupe === "Intelligence") {
    const actifs = agentsIA.filter((a) => a.etat === "actif").length;
    const enAttente = executionsAgents.filter((e) => e.etat === "en attente").length;
    const coutJour = agentsIA.reduce((a, x) => a + x.consommeJour, 0);
    const budgetJour = agentsIA.reduce((a, x) => a + x.budgetJour, 0);
    const nouveaux = connecteursMCP.flatMap((c) => c.outils.filter((o) => o.nouveau)).length;
    return (
      <Bloc titre="Intelligence embarquée">
        <LigneStat etiquette="Agents actifs" valeur={`${actifs} / ${agentsIA.length}`} ton="bon" />
        <LigneStat etiquette="Lectures à valider" valeur={String(enAttente)} ton={enAttente ? "vigilance" : "bon"} />
        <LigneStat etiquette="Appels MCP en attente" valeur={String(approbationsMCP.length)} ton={approbationsMCP.length ? "vigilance" : "bon"} />
        <LigneStat etiquette="Connecteurs" valeur={`${connecteursMCP.filter((c) => c.etat === "connecté").length} / ${connecteursMCP.length}`} />
        <div className="mt-3">
          <div className="flex items-baseline gap-2 text-[11px] mb-[5px]">
            <span className="text-encre-3">Dépense du jour</span>
            <span className="ml-auto tab-num text-encre">{coutJour.toFixed(2)} / {budgetJour} €</span>
          </div>
          <Progression valeur={(coutJour / budgetJour) * 100} ton={coutJour / budgetJour > 0.8 ? "critique" : "bon"} />
          <div className="text-[10.5px] text-encre-4 mt-[4px]">
            Plafond mensuel des clés : {clesModeles.reduce((a, c) => a + c.plafondMensuel, 0)} €
          </div>
        </div>
        {nouveaux > 0 && <Alerte texte={`${nouveaux} outils MCP jamais approuvés sont bloqués.`} ton="vigilance" />}
        <div className="mt-3">
          <Bouton taille="s" icone="branche" className="w-full" onClick={() => aller("mcp")} enfants="Approbations en attente" />
        </div>
      </Bloc>
    );
  }

  if (groupe === "Communication") {
    const echecs = envois.filter((e) => e.etat === "échec").length;
    return (
      <Bloc titre="Canaux">
        <LigneStat etiquette="Messagerie" valeur={`${smtp.statistiques.delivres} % remis`} ton="bon" />
        <LigneStat etiquette="SMS" valeur={`${sms.delivres} % remis`} ton={sms.delivres < 95 ? "vigilance" : "bon"} />
        <LigneStat etiquette="WhatsApp" valeur={`qualité ${whatsapp.qualite.toLowerCase()}`} ton="vigilance" />
        <LigneStat etiquette="Crédit SMS" valeur={`${fmt(sms.creditRestant)} €`} />
        <LigneStat etiquette="Envois en échec" valeur={String(echecs)} ton={echecs ? "critique" : "bon"} />
        <Etincelle valeurs={smtp.historique} couleur="--serie-1" hauteur={30} />
        <Alerte texte="La qualité du numéro WhatsApp est passée à « moyenne »." ton="vigilance" />
        <div className="mt-3">
          <Bouton taille="s" icone="enveloppe" className="w-full" onClick={() => aller("envois")} enfants="Journal des envois" />
        </div>
      </Bloc>
    );
  }

  if (groupe === "Accès") {
    const sans2F = sessionsInitiales.filter((s) => !s.deuxFacteurs).length;
    const expirants = jetonsInitiaux.filter((j) => j.expireBientot && j.actif).length;
    return (
      <Bloc titre="Accès et habilitations">
        <LigneStat etiquette="Comptes" valeur={fmt(comptes.length)} />
        <LigneStat etiquette="Suspendus" valeur={fmt(comptes.filter((c) => c.statut === "suspendu").length)} />
        <LigneStat etiquette="Sessions ouvertes" valeur={fmt(sessionsInitiales.length)} />
        <LigneStat etiquette="Sans deuxième facteur" valeur={fmt(sans2F)} ton={sans2F ? "vigilance" : "bon"} />
        <LigneStat etiquette="Jetons actifs" valeur={String(jetonsInitiaux.filter((j) => j.actif).length)} />
        {expirants > 0 && <Alerte texte="Un jeton de l'interface paie expire bientôt." ton="vigilance" />}
      </Bloc>
    );
  }

  if (groupe === "Système") {
    const enErreur = integrationsInitiales.filter((i) => i.etat === "en erreur").length;
    const derniere = sauvegardes.find((s) => s.etat === "réussie");
    return (
      <Bloc titre="Système">
        <LigneStat etiquette="Dernière sauvegarde" valeur={derniere?.quand.split(" ")[1] ?? "—"} ton="bon" />
        <LigneStat etiquette="Intégrations en erreur" valeur={String(enErreur)} ton={enErreur ? "critique" : "bon"} />
        <LigneStat etiquette="Mode maintenance" valeur="désactivé" />
        <LigneStat etiquette="Conservation des journaux" valeur="365 j" />
        <LigneStat etiquette="Mises à jour en attente" valeur={String(systeme.misesAJour.total)} ton="vigilance" />
        {enErreur > 0 && <Alerte texte="La liaison vers la paie est coupée depuis 2 jours." ton="critique" />}
      </Bloc>
    );
  }

  return null;
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-1">{titre}</h3>
      {children}
    </section>
  );
}

function Alerte({ texte, ton }: { texte: string; ton: "critique" | "vigilance" }) {
  return (
    <div className={`mt-3 flex items-start gap-2 p-[8px] rounded-[4px] text-[11.5px] leading-[16px] ${
      ton === "critique" ? "bg-critique-voile text-critique" : "bg-vigilance-voile text-vigilance"
    }`}>
      <Icone nom="alerte" taille="s" className="mt-[1px] shrink-0" />
      <span>{texte}</span>
    </div>
  );
}
