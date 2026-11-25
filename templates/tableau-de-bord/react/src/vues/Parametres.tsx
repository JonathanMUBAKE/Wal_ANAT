import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Interrupteur, Jeton, LigneReglage, Onglets, TeteCarte } from "../composants/Primitives";
import { useUI } from "../composants/Superpositions";
import { parametresInitiaux, type Parametres as TypeParametres } from "../lib/sigrh";

/* Paramètres : les règles que le système applique à tout le monde. Rien n'est
   enregistré tant qu'on n'a pas confirmé — et les réglages qui touchent la
   sécurité ou la paie le disent avant d'être changés. */
export function Parametres() {
  const ui = useUI();
  const [reference, poserReference] = useState<TypeParametres>(parametresInitiaux);
  const [brouillon, poserBrouillon] = useState<TypeParametres>(parametresInitiaux);
  const [onglet, poserOnglet] = useState("general");

  const modifie = useMemo(
    () => JSON.stringify(brouillon) !== JSON.stringify(reference), [brouillon, reference]);

  const poser = <K extends keyof TypeParametres>(cle: K, v: TypeParametres[K]) =>
    poserBrouillon((b) => ({ ...b, [cle]: v }));

  async function enregistrer() {
    const changes = (Object.keys(brouillon) as Array<keyof TypeParametres>)
      .filter((k) => brouillon[k] !== reference[k]);
    const sensibles = changes.filter((k) =>
      ["deuxFacteursObligatoire", "dureeSession", "longueurMotDePasse", "modeMaintenance", "anonymisationDeparts"].includes(k as string));

    const ok = await ui.confirmer({
      titre: `Appliquer ${changes.length} modification${changes.length > 1 ? "s" : ""} ?`,
      texte: sensibles.length
        ? "Certains réglages touchent la sécurité ou la conservation des données. Ils prennent effet à la prochaine requête de chaque session, pour tous les agents."
        : "Les réglages prennent effet immédiatement pour tous les agents.",
      bouton: "Appliquer", ton: sensibles.length ? "vigilance" : "info",
    });
    if (!ok) return;
    poserReference(brouillon);
    ui.message("Paramètres enregistrés et journalisés.", "bon");
  }

  const Nombre = ({ cle, min, max, unite }: { cle: keyof TypeParametres; min: number; max: number; unite: string }) => (
    <span className="inline-flex items-center gap-2">
      <input
        type="number" min={min} max={max} value={brouillon[cle] as number}
        onChange={(e) => poser(cle, Number(e.target.value) as never)}
        aria-label={String(cle)}
        className="w-[84px] h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px] tab-num focus:border-accent outline-none transi"
      />
      <span className="text-[12px] text-encre-3">{unite}</span>
    </span>
  );

  const Texte = ({ cle, large }: { cle: keyof TypeParametres; large?: boolean }) => (
    <input
      type="text" value={brouillon[cle] as string}
      onChange={(e) => poser(cle, e.target.value as never)} aria-label={String(cle)}
      className={`h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px] focus:border-accent outline-none transi ${large ? "w-[240px]" : "w-[150px]"}`}
    />
  );

  const Liste = ({ cle, options }: { cle: keyof TypeParametres; options: string[] }) => (
    <select value={brouillon[cle] as string} onChange={(e) => poser(cle, e.target.value as never)} aria-label={String(cle)}
      className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  const Bascule = ({ cle, etiquette }: { cle: keyof TypeParametres; etiquette: string }) => (
    <Interrupteur actif={brouillon[cle] as boolean} surChangement={(v) => poser(cle, v as never)} etiquette={etiquette} />
  );

  return (
    <>
      <Entete
        titre="Paramètres"
        sous="Les règles que le SIGRH applique à tous les agents : horaires, congés, sécurité, conservation."
        actions={
          <>
            {modifie && <Jeton ton="vigilance" enfants="Modifications non enregistrées" />}
            <Bouton disabled={!modifie} onClick={() => { poserBrouillon(reference); ui.message("Modifications abandonnées.", "info"); }} enfants="Annuler" />
            <Bouton ton="principal" icone="check" disabled={!modifie} onClick={enregistrer} enfants="Enregistrer" />
          </>
        }
      />

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "general", nom: "Général" },
              { cle: "temps", nom: "Temps de travail" },
              { cle: "conges", nom: "Congés" },
              { cle: "securite", nom: "Sécurité" },
              { cle: "donnees", nom: "Conservation" },
              { cle: "service", nom: "Service" },
            ]}
          />

          <div className="pas-carte">
            {onglet === "general" && (
              <>
                <LigneReglage titre="Nom de l'organisation" texte="Apparaît dans l'en-tête, les exports et les documents signés."
                  controle={<Texte cle="organisation" large />} />
                <LigneReglage titre="Fuseau horaire" texte="Sert de référence à tous les pointages et à toutes les échéances."
                  controle={<Liste cle="fuseau" options={["Afrique/Kinshasa (UTC+1)", "Afrique/Lubumbashi (UTC+2)", "Europe/Paris (UTC+1)", "UTC"]} />} />
                <LigneReglage titre="Langue de l'interface" texte="S'applique aux écrans, aux messages et aux rapports générés."
                  controle={<Liste cle="langue" options={["Français", "English"]} />} />
                <LigneReglage titre="Premier jour de la semaine" texte="Détermine le découpage des semaines dans les plannings et les rapports."
                  controle={<Liste cle="debutSemaine" options={["Lundi", "Dimanche"]} />} />
              </>
            )}

            {onglet === "temps" && (
              <>
                <LigneReglage titre="Heure d'arrivée théorique" texte="Au-delà, le pointage est compté comme un retard."
                  controle={<Texte cle="heureArrivee" />} />
                <LigneReglage titre="Heure de départ théorique" texte="En deçà, le pointage est compté comme un départ anticipé."
                  controle={<Texte cle="heureDepart" />} />
                <LigneReglage titre="Tolérance de retard" texte="Marge accordée avant qu'un retard ne soit enregistré comme tel."
                  controle={<Nombre cle="toleranceRetard" min={0} max={60} unite="minutes" />} />
                <LigneReglage titre="Seuil des heures supplémentaires" texte="Au-delà de ce dépassement quotidien, les heures sont proposées à validation."
                  avertissement="Ce réglage change les montants transmis à la paie. Prévenez la direction des finances avant de le modifier."
                  controle={<Nombre cle="seuilHeuresSup" min={0} max={8} unite="heures" />} />
              </>
            )}

            {onglet === "conges" && (
              <>
                <LigneReglage titre="Droit annuel" texte="Nombre de jours ouvrables acquis par année pleine de service."
                  controle={<Nombre cle="joursCongesAnnuels" min={0} max={60} unite="jours" />} />
                <LigneReglage titre="Report des reliquats" texte="Les jours non pris sont reportés sur l'année suivante au lieu d'être perdus."
                  controle={<Bascule cle="reportReliquats" etiquette="Report des reliquats" />} />
                <LigneReglage titre="Validation hiérarchique" texte="Toute demande passe par le responsable direct avant d'être accordée."
                  controle={<Bascule cle="validationHierarchique" etiquette="Validation hiérarchique" />} />
                <LigneReglage titre="Double validation pour les cadres" texte="Les demandes des agents de catégorie A passent en plus par la direction générale."
                  controle={<Bascule cle="doubleValidationCadres" etiquette="Double validation" />} />
              </>
            )}

            {onglet === "securite" && (
              <>
                <LigneReglage titre="Deuxième facteur obligatoire" texte="Impose une vérification supplémentaire à la connexion, pour tous les rôles d'administration."
                  avertissement="En l'activant, les agents sans deuxième facteur configuré ne pourront plus se connecter tant qu'ils n'en auront pas enregistré un."
                  controle={<Bascule cle="deuxFacteursObligatoire" etiquette="Deuxième facteur obligatoire" />} />
                <LigneReglage titre="Durée d'inactivité avant déconnexion" texte="Une session inactive plus longtemps est fermée automatiquement."
                  controle={<Nombre cle="dureeSession" min={5} max={480} unite="minutes" />} />
                <LigneReglage titre="Longueur minimale du mot de passe" texte="S'applique aux prochains changements, pas aux mots de passe en cours."
                  controle={<Nombre cle="longueurMotDePasse" min={8} max={32} unite="caractères" />} />
                <LigneReglage titre="Renouvellement du mot de passe" texte="Mettre zéro pour ne jamais forcer le renouvellement."
                  controle={<Nombre cle="renouvellementMotDePasse" min={0} max={730} unite="jours" />} />
              </>
            )}

            {onglet === "donnees" && (
              <>
                <LigneReglage titre="Conservation des journaux" texte="Durée pendant laquelle les journaux techniques restent consultables."
                  controle={<Nombre cle="retentionJournaux" min={30} max={1825} unite="jours" />} />
                <LigneReglage titre="Conservation des sauvegardes" texte="Au-delà, les instantanés les plus anciens sont détruits automatiquement."
                  avertissement="Réduire cette durée détruit immédiatement les sauvegardes plus anciennes que la nouvelle valeur."
                  controle={<Nombre cle="retentionSauvegardes" min={7} max={730} unite="jours" />} />
                <LigneReglage titre="Anonymisation après un départ" texte="Délai après lequel les données personnelles d'un agent parti sont effacées, les données de gestion restant agrégées."
                  controle={<Nombre cle="anonymisationDeparts" min={365} max={3650} unite="jours" />} />
              </>
            )}

            {onglet === "service" && (
              <>
                <LigneReglage titre="Mode maintenance" texte="Les agents non administrateurs voient une page d'indisponibilité ; les traitements en cours vont à leur terme."
                  avertissement="À activer avant une opération lourde, et à retirer juste après : personne ne pourra travailler entre-temps."
                  controle={<Bascule cle="modeMaintenance" etiquette="Mode maintenance" />} />
                <LigneReglage titre="Bandeau d'information" texte="Affiche un message en haut de toutes les pages, par exemple pour annoncer une intervention."
                  controle={<Bascule cle="banniereInformation" etiquette="Bandeau d'information" />} />
              </>
            )}
          </div>
        </>
      } />

      <Carte className="mt-4" enfants={
        <>
          <TeteCarte titre="Ce que le serveur contrôle de toute façon"
            sous="Ces réglages décrivent l'intention ; la décision finale appartient au serveur" />
          <div className="pas-carte pt-3 text-[13px] text-encre-2 leading-[20px]">
            <p>
              Aucun de ces paramètres n'est une sécurité à lui seul. Un agent qui modifierait la requête envoyée
              par son navigateur se heurterait quand même aux contrôles du serveur : c'est là que les règles sont
              appliquées, pas ici. Cet écran sert à les écrire une fois, lisiblement, au lieu de les répartir
              dans le code.
            </p>
            <p className="mt-3">
              Chaque modification est journalisée avec son auteur, l'ancienne valeur et la nouvelle.
              Le journal d'audit en garde la trace aussi longtemps que la conservation des journaux le permet.
            </p>
          </div>
        </>
      } />
    </>
  );
}
