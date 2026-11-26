import { Bouton, LigneStat } from "./Primitives";
import { Etincelle } from "./Graphique";
import { Icone } from "./Icone";
import { fmt } from "../lib/format";
import { charge, comptes } from "../lib/donnees";
import { disponibilite, jetonsInitiaux, sessionsInitiales } from "../lib/sigrh";
import { agentsIA, executionsAgents } from "../lib/intelligence";
import { envois, smtp, sms, whatsapp } from "../lib/communication";
import { approbations, conforme, gardeFous, gestes } from "../lib/controles";
import { comptesDormants, gravite, SEUILS } from "../lib/dormance";

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

  if (groupe === "Sécurité") {
    const dormants = comptesDormants.filter((c) => c.etat === "proposé").length;
    return (
      <Bloc titre="Posture">
        <LigneStat etiquette="Sessions ouvertes" valeur={fmt(sessionsInitiales.length)} />
        <LigneStat etiquette="Comptes dormants" valeur={fmt(dormants)} ton={dormants ? "vigilance" : "bon"} />
        <Alerte texte="Les actes de sécurité de l'application sont effacés au bout d'un an." ton="vigilance" />
        <div className="mt-3">
          <Bouton taille="s" icone="audit" className="w-full" onClick={() => aller("audit")} enfants="Journal d'audit" />
        </div>
      </Bloc>
    );
  }

  if (groupe === "Système") {
    return (
      <Bloc titre="Système">
        <LigneStat etiquette="Jetons actifs" valeur={String(jetonsInitiaux.filter((j) => j.actif).length)} />
        <LigneStat etiquette="Disponibilité (90 j)" valeur={`${(disponibilite.reduce((a, s) => a + s.taux90, 0) / disponibilite.length).toFixed(2)} %`} />
        <div className="mt-3">
          <Bouton taille="s" icone="reglages" className="w-full" onClick={() => aller("parametres")} enfants="Paramètres" />
        </div>
      </Bloc>
    );
  }

  if (groupe === "Contrôles") {
    const attente = approbations.filter((a) => a.etat === "en attente").length;
    const eleves = approbations.filter((a) => a.etat === "en attente" && a.risque === "élevé").length;
    const defauts = gestes.filter((g) => !conforme(g)).length;
    const eteints = gardeFous.filter((g) => !g.actif).length;
    return (
      <Bloc titre="Ce qui attend une main">
        <LigneStat etiquette="Demandes en attente" valeur={String(attente)} ton={attente ? "vigilance" : "bon"} />
        <LigneStat etiquette="Dont à risque élevé" valeur={String(eleves)} ton={eleves ? "critique" : "bon"} />
        <LigneStat etiquette="Gestes recensés" valeur={String(gestes.length)} />
        <LigneStat etiquette="Gestes sous-contrôlés" valeur={String(defauts)} ton={defauts ? "critique" : "bon"} />
        <LigneStat etiquette="Garde-fous éteints" valeur={String(eteints)} ton={eteints ? "critique" : "bon"} />
        {eteints > 0 && <Alerte texte="Un modèle peut déclencher une écriture MCP sans accord humain : la règle GF-14 est éteinte." ton="critique" />}
        <div className="mt-3 space-y-2">
          <Bouton taille="s" icone="tampon" className="w-full" onClick={() => aller("approbations")} enfants="Vider la file" />
          <Bouton taille="s" icone="verrou" className="w-full" onClick={() => aller("controles")} enfants="Registre des contrôles" />
        </div>
      </Bloc>
    );
  }






  if (groupe === "Intelligence") {
    const actifs = agentsIA.filter((a) => a.etat === "actif").length;
    const enCours = executionsAgents.filter((e) => e.etat === "en attente").length;
    return (
      <Bloc titre="Coéquipiers IA">
        <LigneStat etiquette="Agents déclarés" valeur={String(agentsIA.length)} />
        <LigneStat etiquette="Actifs" valeur={String(actifs)} ton="bon" />
        <LigneStat etiquette="En attente de validation" valeur={String(enCours)} ton={enCours ? "vigilance" : "bon"} />
        <Alerte texte="L'IA propose, un humain décide : aucune action n'est exécutée sans accord." ton="vigilance" />
        <div className="mt-3">
          <Bouton taille="s" icone="robot" className="w-full" onClick={() => aller("agents")} enfants="Les agents" />
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
    const dormants = comptesDormants.filter((c) => c.etat === "proposé").length;
    const lourds = comptesDormants.filter((c) =>
      c.etat !== "désactivé" && c.etat !== "clôturé" && gravite(c) === "élevé").length;
    return (
      <Bloc titre="Accès et habilitations">
        <LigneStat etiquette="Comptes" valeur={fmt(comptes.length)} />
        <LigneStat etiquette="Suspendus" valeur={fmt(comptes.filter((c) => c.statut === "suspendu").length)} />
        <LigneStat etiquette="Sessions ouvertes" valeur={fmt(sessionsInitiales.length)} />
        <LigneStat etiquette="Sans deuxième facteur" valeur={fmt(sans2F)} ton={sans2F ? "vigilance" : "bon"} />
        <LigneStat etiquette="Jetons actifs" valeur={String(jetonsInitiaux.filter((j) => j.actif).length)} />
        <LigneStat etiquette={`Dormants (+${SEUILS.proposition} j)`} valeur={fmt(dormants)} ton={dormants ? "critique" : "bon"} />
        {expirants > 0 && <Alerte texte="Un jeton de l'interface paie expire bientôt." ton="vigilance" />}
        {lourds > 0 && <Alerte texte={`${lourds} comptes dorment en gardant des droits sensibles.`} ton="critique" />}
        <div className="mt-3">
          <Bouton taille="s" icone="horloge" className="w-full" onClick={() => aller("dormance")} enfants="Comptes dormants" />
        </div>
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
