import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { exporterCSV, fmt, initiales, normaliser } from "../lib/format";
import { alea, audit as auditCourt, choix, entre, type EntreeAudit } from "../lib/donnees";
import { AGENTS_NOMS, DIRECTIONS } from "../lib/sigrh";
import { Empechement, Tronquee, useDistant } from "../composants/Distant";
import { journal as lireJournal, type EntreeJournal, type Gravite } from "../lib/api/anat";
import { useSource } from "../lib/api/source";

const TON_GRAVITE: Record<Gravite, "critique" | "vigilance" | "neutre"> = {
  critique: "critique", importante: "vigilance", normale: "neutre",
};

/* Du journal d'ANAT Pilotage vers les lignes de l'écran.

   Ce que l'application ne dit pas, l'écran ne l'invente pas : il n'y a ni
   « résultat » (accepté / refusé), ni valeur avant et après. Ces colonnes
   disparaissent en direct. En revanche la gravité, elle, est réelle et vaut
   mieux que tout ce que j'avais imaginé : 42 genres d'actes sont classés
   critiques par le serveur, dont tout ce qui supprime. */
const depuis = (e: EntreeJournal): LigneAudit & { kind: string; gravite: Gravite; resume: string } => ({
  id: e.id,
  horo: new Date(e.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
  auteur: e.actor_name ?? "le système",
  direction: e.org_name ?? "—",
  module: e.category,
  /* `label` est ce que l'application disait à ce moment-là. On ne le
     reconstruit jamais à partir de `kind`, et on ne filtre jamais dessus. */
  action: e.label,
  cible: e.target_id ?? e.object_id ?? "—",
  origine: e.ip ?? "—",
  resultat: "accepté",
  avant: "—", apres: "—",
  kind: e.kind,
  gravite: e.severity,
  resume: e.summary,
});

/* Journal d'audit : qui a fait quoi, quand, depuis où, et avec quel résultat.
   C'est la page qu'on ouvre quand quelque chose a changé sans qu'on sache
   pourquoi. Elle ne se modifie pas et ne se vide pas depuis l'interface —
   c'est précisément ce qui lui donne sa valeur. */

interface LigneAudit extends EntreeAudit {
  id: string; direction: string; module: string; avant: string; apres: string;
}

const MODULES = ["Comptes", "Habilitations", "Exploitation", "Données", "Paramètres", "Sécurité"];

const GESTES: Array<[string, string, string, string]> = [
  ["Suspension d'un compte", "Comptes", "actif", "suspendu"],
  ["Réactivation d'un compte", "Comptes", "suspendu", "actif"],
  ["Création d'un agent", "Comptes", "—", "matricule attribué"],
  ["Modification des droits d'un rôle", "Habilitations", "lecture", "complet"],
  ["Retrait d'une habilitation", "Habilitations", "complet", "aucun"],
  ["Création d'un jeton d'API", "Sécurité", "—", "portée : lecture"],
  ["Révocation d'un jeton d'API", "Sécurité", "actif", "révoqué"],
  ["Redémarrage d'un service", "Exploitation", "en service", "redémarré"],
  ["Mise en maintenance", "Exploitation", "ouvert", "maintenance"],
  ["Export de données", "Données", "—", "412 lignes"],
  ["Restauration d'une sauvegarde", "Données", "—", "instantané B-820"],
  ["Modification des horaires", "Paramètres", "07:45", "07:30"],
  ["Durée de session modifiée", "Paramètres", "120 min", "60 min"],
  ["Connexion refusée", "Sécurité", "—", "deuxième facteur invalide"],
  ["Révocation de sessions", "Sécurité", "41 ouvertes", "1 ouverte"],
];

const entrees: LigneAudit[] = Array.from({ length: 180 }, (_, i) => {
  const [action, module, avant, apres] = choix(GESTES);
  const refus = alea() < 0.11;
  return {
    id: "A-" + (50000 - i),
    horo: new Date(Date.now() - i * Math.round(entre(60, 900)) * 1000)
      .toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    auteur: choix(AGENTS_NOMS),
    direction: choix(DIRECTIONS),
    module, action,
    cible: choix(["matricule A-1182", "rôle Gestionnaire", "sigrh-presences", "jeton sk_paie_7d21", "412 comptes", "paramètre horaires"]),
    origine: [Math.floor(entre(10, 200)), Math.floor(entre(0, 255)), Math.floor(entre(0, 255)), Math.floor(entre(1, 254))].join("."),
    resultat: refus ? "refusé" : "accepté",
    avant, apres,
  };
});

export function Audit() {
  const ui = useUI();
  const { source } = useSource();
  const direct = source === "application";
  const distant = useDistant(() => lireJournal(300));
  const [q, poserQ] = useState("");
  const [module, poserModule] = useState("");
  const [resultat, poserResultat] = useState("");
  const [auteur, poserAuteur] = useState("");
  const [gravite, poserGravite] = useState("");

  const lues = direct ? (distant.donnees?.entries ?? []).map(depuis) : entrees;
  const categories = direct
    ? (distant.donnees?.categories ?? [])
    : MODULES;

  const auteurs = useMemo(() => [...new Set(lues.map((e) => e.auteur))].sort(), [lues]);
  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return lues.filter((e) =>
      (!n || normaliser(`${e.auteur} ${e.action} ${e.cible} ${e.origine} ${e.id}`).includes(n)) &&
      (!module || e.module === module) &&
      (!gravite || ("gravite" in e && (e as { gravite: string }).gravite === gravite)) &&
      (!direct && resultat ? e.resultat === resultat : true) &&
      (!auteur || e.auteur === auteur));
  }, [lues, q, module, resultat, auteur, gravite, direct]);

  const refus = lues.filter((e) => e.resultat === "refusé").length;
  const sensibles = lues.filter((e) => ["Habilitations", "Sécurité", "Données"].includes(e.module)).length;
  const parGravite = (g: Gravite) => lues.filter((e) => "gravite" in e && (e as { gravite: string }).gravite === g).length;

  function detail(e: LigneAudit) {
    ui.ouvrirTiroir({
      titre: e.action,
      sous: <><span className="font-mono">{e.id}</span> · {e.horo}</>,
      onglets: [
        { nom: "Trace", contenu: (
          <>
            <Definitions lignes={[
              ["Auteur", <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-surface-3 grid place-items-center text-[9px] font-semibold">{initiales(e.auteur)}</span>
                {e.auteur}
              </span>],
              ["Direction", e.direction],
              ["Module", e.module],
              ["Objet", <span className="font-mono">{e.cible}</span>],
              ["Adresse d'origine", <span className="font-mono">{e.origine}</span>],
              ["Horodatage", e.horo],
              ["Résultat", <Jeton ton={e.resultat === "accepté" ? "bon" : "critique"} enfants={e.resultat} />],
            ]} />

            <div className="mt-4 p-3 rounded-[4px] border border-bordure bg-surface-2">
              <div className="text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3 mb-2">Ce qui a changé</div>
              <div className="flex items-center gap-3 text-[13px] font-mono flex-wrap">
                <span className="px-[8px] py-[3px] rounded-[4px] bg-critique-voile text-critique line-through">{e.avant}</span>
                <Icone nom="chevronDroite" taille="s" className="text-encre-4" />
                <span className="px-[8px] py-[3px] rounded-[4px] bg-bon-voile text-bon">{e.apres}</span>
              </div>
            </div>
          </>
        )},
        { nom: "Autour", contenu: (
          <div>
            <p className="text-[12px] text-encre-3 mb-3">Les gestes du même auteur, dans la même tranche horaire.</p>
            {entrees.filter((x) => x.auteur === e.auteur).slice(0, 10).map((x) => (
              <div key={x.id} className="flex items-center gap-2 py-[8px] border-b border-bordure last:border-0 text-[12px]">
                <span className="text-encre-3 tab-num whitespace-nowrap">{x.horo}</span>
                <span className="truncate">{x.action}</span>
                <span className="ml-auto"><Jeton ton={x.resultat === "accepté" ? "bon" : "critique"} enfants={x.resultat} /></span>
              </div>
            ))}
          </div>
        )},
      ],
    });
  }

  const colonneGravite: Colonne<LigneAudit> = {
    cle: "gravite", nom: "Gravité", triable: true,
    valeur: (e) => ({ critique: 0, importante: 1, normale: 2 }[("gravite" in e ? (e as { gravite: Gravite }).gravite : "normale")]),
    rendu: (e) => {
      const g = "gravite" in e ? (e as { gravite: Gravite }).gravite : "normale";
      return <Jeton ton={TON_GRAVITE[g]} enfants={g} />;
    },
  };

  const toutesColonnes: Colonne<LigneAudit>[] = [
    { cle: "horo", nom: "Horodatage", triable: true, fixe: true,
      rendu: (e) => <span className="font-mono text-[12px] text-encre-3 whitespace-nowrap">{e.horo}</span> },
    { cle: "auteur", nom: "Auteur", triable: true, rendu: (e) => (
      <div className="flex items-center gap-[8px] min-w-0">
        <span className="w-5 h-5 rounded-full bg-surface-3 border border-bordure grid place-items-center text-[9px] font-semibold shrink-0">
          {initiales(e.auteur)}
        </span>
        <span className="truncate">{e.auteur}</span>
      </div>
    )},
    { cle: "direction", nom: "Direction", triable: true, rendu: (e) => <span className="text-encre-2">{e.direction}</span> },
    { cle: "module", nom: "Module", triable: true, rendu: (e) => <Jeton ton="neutre" point={false} enfants={e.module} /> },
    { cle: "action", nom: "Geste", triable: true, rendu: (e) => <span className="font-medium">{e.action}</span> },
    { cle: "cible", nom: "Objet", rendu: (e) => <span className="font-mono text-[12px] text-encre-2">{e.cible}</span> },
    { cle: "changement", nom: "Changement", rendu: (e) => (
      <span className="inline-flex items-center gap-[6px] font-mono text-[11px]">
        <span className="text-encre-4 line-through">{e.avant}</span>
        <Icone nom="chevronDroite" taille="s" className="text-encre-4" />
        <span className="text-encre-2">{e.apres}</span>
      </span>
    )},
    { cle: "origine", nom: "Origine", rendu: (e) => <span className="font-mono text-[12px] text-encre-3">{e.origine}</span> },
    { cle: "resultat", nom: "Résultat", num: true, triable: true, rendu: (e) => (
      <Jeton ton={e.resultat === "accepté" ? "bon" : "critique"} enfants={e.resultat} />
    )},
  ];

  /* En direct, deux colonnes disparaissent parce que l'application ne les
     connaît pas : le résultat d'un geste (elle ne journalise que ce qui a
     eu lieu) et la valeur avant/après. Une colonne « accepté » partout serait
     une affirmation sans source. La gravité la remplace, et elle est vraie. */
  const colonnes = direct
    ? [toutesColonnes[0], colonneGravite, ...toutesColonnes.slice(1).filter((c) => !["resultat", "changement"].includes(c.cle))]
    : toutesColonnes;

  return (
    <>
      <Entete
        titre="Journal d'audit"
        sous="Qui a fait quoi, quand, depuis où, et avec quel résultat. Ce journal ne se modifie pas depuis l'interface."
        actions={
          <Bouton icone="telecharger"
            onClick={() => { exporterCSV("journal-audit", filtres); ui.message("Journal d'audit exporté.", "bon"); }}
            enfants="Exporter la sélection" />
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        {direct ? (
          <>
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Entrées affichées" valeur={distant.etat === "ok" ? fmt(lues.length) : "—"} />} />
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Critiques" valeur={distant.etat === "ok" ? fmt(parGravite("critique")) : "—"} ton={parGravite("critique") ? "critique" : "bon"} />} />
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Importantes" valeur={distant.etat === "ok" ? fmt(parGravite("importante")) : "—"} ton={parGravite("importante") ? "vigilance" : undefined} />} />
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Genres distincts" valeur={distant.etat === "ok" ? fmt(new Set(lues.map((e) => ("kind" in e ? (e as { kind: string }).kind : ""))).size) : "—"} />} />
          </>
        ) : (
          <>
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Gestes tracés (30 j)" valeur={fmt(entrees.length * 24)} />} />
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Refusés" valeur={fmt(refus)} ton={refus ? "vigilance" : "bon"} />} />
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Gestes sensibles" valeur={fmt(sensibles)} />} />
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Conservation" valeur="365 jours" />} />
          </>
        )}
      </div>

      {direct && (
        <div className="mb-4">
          <Empechement etat={distant.etat} echec={distant.echec} relancer={distant.relancer} />
        </div>
      )}

      {direct && distant.donnees?.truncated && <Tronquee combien={lues.length} />}

      <Carte className="mb-4" enfants={
        <>
          <TeteCarte titre={direct ? "Ce que ce journal garde, et ce qu'il perd" : "Pourquoi ce journal ne s'efface pas"}
            sous="Une trace qu'on peut supprimer ne prouve rien" />
          <div className="pas-carte pt-3 text-[13px] text-encre-2 leading-[20px]">
            {direct ? (
              <>
                Aucun écran ne permet de modifier ni de vider ce journal. Mais deux limites doivent être
                dites plutôt que tues. <b>Les actes de sécurité sont effacés au bout d'un an</b> —
                connexions, échecs, verrouillages, droits changés : passé ce délai, l'application n'en garde
                rien. Et l'enregistrement d'un acte au journal se fait juste après l'acte, hors transaction :
                si le serveur s'arrête entre les deux, l'acte a eu lieu sans laisser de trace. La fenêtre est
                étroite, elle existait avant ce tableau de bord, et le journal scellé du centre de commande
                est précisément ce qui refermera les deux.
              </>
            ) : (
              <>
                Aucun écran ne permet de modifier ni de vider ce journal, pas même pour un administrateur système.
                Les lignes disparaissent uniquement par l'effet de la durée de conservation, elle-même tracée quand
                on la change. Si l'on pouvait y toucher, il n'aurait plus aucune valeur le jour où il faudrait
                établir ce qui s'est réellement passé.
              </>
            )}
          </div>
        </>
      } />

      <Carte enfants={
        <TableauDonnees
          lignes={filtres} colonnes={colonnes} cle={(e) => e.id}
          totalBrut={lues.length} nomEntite={["geste", "gestes"]}
          triInitial={{ cle: "horo", sens: "desc" }}
          surLigne={detail}
          vide={{
            titre: "Aucun geste tracé", texte: "Aucune entrée ne correspond à ces filtres sur la période conservée.",
            actions: <Bouton onClick={() => { poserQ(""); poserModule(""); poserResultat(""); poserAuteur(""); }} enfants="Réinitialiser les filtres" />,
          }}
          barreOutils={
            <>
              <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                <Icone nom="recherche" taille="s" />
                <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                  placeholder="Auteur, geste, objet, adresse…" aria-label="Rechercher dans le journal"
                  className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
              </div>
              {direct && (
                <select value={gravite} onChange={(e) => poserGravite(e.target.value)} aria-label="Filtrer par gravité"
                  className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                  <option value="">Toutes gravités</option>
                  {(["critique", "importante", "normale"] as const).map((g) => <option key={g}>{g}</option>)}
                </select>
              )}
              <select value={auteur} onChange={(e) => poserAuteur(e.target.value)} aria-label="Filtrer par auteur"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Tous les auteurs</option>
                {auteurs.map((a) => <option key={a}>{a}</option>)}
              </select>
              <select value={module} onChange={(e) => poserModule(e.target.value)} aria-label="Filtrer par module"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Tous les modules</option>
                {categories.map((m) => <option key={m}>{m}</option>)}
              </select>
              {!direct && (
              <select value={resultat} onChange={(e) => poserResultat(e.target.value)} aria-label="Filtrer par résultat"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Tous les résultats</option>
                <option value="accepté">Accepté</option>
                <option value="refusé">Refusé</option>
              </select>)}
            </>
          }
          actionsLigne={(e) => (
            <Bouton ton="fantome" taille="s" icone="oeil" title="Voir la trace" onClick={() => detail(e)} />
          )}
        />
      } />

      <p className="text-[11px] text-encre-4 mt-3">
        Les {auditCourt.length} dernières lignes sont également visibles depuis la vue d'ensemble.
      </p>
    </>
  );
}
