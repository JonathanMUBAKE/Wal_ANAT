import { useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Pastille, Progression, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV } from "../lib/format";
import { sauvegardes as sauvegardesInitiales } from "../lib/sigrh";

type Sauvegarde = (typeof sauvegardesInitiales)[number];

/* Sauvegardes : la seule page dont on espère ne jamais se servir. Deux chiffres
   comptent — la date de la dernière sauvegarde vérifiée, et le temps qu'il
   faudrait pour restaurer. Une sauvegarde non vérifiée n'est pas une sauvegarde. */
export function Sauvegardes() {
  const ui = useUI();
  const [sauvegardes, poserSauvegardes] = useState<Sauvegarde[]>(sauvegardesInitiales);
  const [enCours, poserEnCours] = useState(false);
  const [avancement, poserAvancement] = useState(0);

  const reussies = sauvegardes.filter((s) => s.etat === "réussie");
  const derniere = reussies[0];
  const derniereVerifiee = reussies.find((s) => s.verifiee);
  const nonVerifiees = reussies.filter((s) => !s.verifiee).length;
  const echecs = sauvegardes.filter((s) => s.etat === "échouée").length;

  async function lancer() {
    const ok = await ui.confirmer({
      titre: "Lancer une sauvegarde complète ?",
      texte: "L'opération dure une dizaine de minutes et sollicite fortement la base. Mieux vaut la lancer hors des heures de travail — pendant ce temps, les écrans restent utilisables mais lents.",
      bouton: "Lancer maintenant", ton: "vigilance",
    });
    if (!ok) return;
    poserEnCours(true);
    poserAvancement(0);
    ui.message("Sauvegarde complète lancée.", "bon");
    const minuteur = setInterval(() => {
      poserAvancement((a) => {
        if (a >= 100) {
          clearInterval(minuteur);
          poserEnCours(false);
          ui.message("Sauvegarde terminée et déposée hors site.", "bon");
          return 100;
        }
        return a + 4;
      });
    }, 180);
  }

  async function restaurer(s: Sauvegarde) {
    const ok = await ui.confirmer({
      titre: `Restaurer la sauvegarde du ${s.quand} ?`,
      texte: `Toutes les données enregistrées depuis cette sauvegarde seront perdues — pointages, demandes de congé, décisions. La plateforme sera indisponible pendant la restauration. Cette action ne peut pas être annulée.`,
      bouton: "Restaurer", ton: "danger", mot: "RESTAURER",
    });
    if (!ok) return;
    ui.message(`Restauration depuis ${s.id} demandée — la plateforme va passer en maintenance.`, "bon");
  }

  async function verifier(s: Sauvegarde) {
    ui.message(`Vérification de ${s.id} en cours…`, "info", { duree: 1400 });
    setTimeout(() => {
      poserSauvegardes((l) => l.map((x) => x.id === s.id ? { ...x, verifiee: true } : x));
      ui.message(`${s.id} : restauration à blanc réussie, la sauvegarde est exploitable.`, "bon");
    }, 1600);
  }

  const colonnes: Colonne<Sauvegarde>[] = [
    { cle: "quand", nom: "Date", triable: true, fixe: true, rendu: (s) => (
      <div className="flex items-center gap-[9px] min-w-0">
        <Pastille ton={s.etat === "échouée" ? "critique" : s.verifiee ? "bon" : "vigilance"} />
        <span className="flex flex-col min-w-0">
          <span className="font-medium whitespace-nowrap">{s.quand}</span>
          <span className="font-mono text-[11px] text-encre-3">{s.id}</span>
        </span>
      </div>
    )},
    { cle: "type", nom: "Type", triable: true, rendu: (s) => (
      <Jeton ton={s.type === "Complète" ? "accent" : "neutre"} point={false} enfants={s.type} />
    )},
    { cle: "taille", nom: "Taille", num: true, triable: true, rendu: (s) => <span className="tab-num">{s.taille}</span> },
    { cle: "duree", nom: "Durée", num: true, triable: true, rendu: (s) => <span className="tab-num text-encre-2">{s.duree}</span> },
    { cle: "emplacement", nom: "Emplacement", rendu: (s) => <span className="text-encre-2">{s.emplacement}</span> },
    { cle: "chiffree", nom: "Chiffrée", triable: true, rendu: (s) =>
      s.chiffree ? <Jeton ton="bon" enfants="oui" /> : <Jeton ton="critique" enfants="non" /> },
    { cle: "verifiee", nom: "Vérifiée", triable: true, rendu: (s) =>
      s.etat === "échouée" ? <span className="text-encre-4">—</span>
        : s.verifiee ? <Jeton ton="bon" enfants="restauration à blanc" />
          : <Jeton ton="vigilance" enfants="non vérifiée" /> },
    { cle: "etat", nom: "Résultat", triable: true, rendu: (s) => (
      <span title={s.motif}><Jeton ton={s.etat === "réussie" ? "bon" : "critique"} enfants={s.etat} /></span>
    )},
  ];

  return (
    <>
      <Entete
        titre="Sauvegardes"
        sous="La seule page dont on espère ne jamais se servir — et la seule qu'il faut vérifier régulièrement."
        actions={
          <>
            <Bouton icone="telecharger" onClick={() => { exporterCSV("sauvegardes", sauvegardes); ui.message("Inventaire exporté.", "bon"); }} enfants="Exporter" />
            <Bouton ton="principal" icone="base" disabled={enCours} onClick={lancer}
              enfants={enCours ? "Sauvegarde en cours…" : "Lancer une sauvegarde"} />
          </>
        }
      />

      {enCours && (
        <Carte className="mb-4 border-accent/40" enfants={
          <div className="pas-carte">
            <div className="flex items-center gap-2 mb-2">
              <Pastille ton="bon" pulse />
              <span className="text-[13px] font-semibold">Sauvegarde complète en cours</span>
              <span className="ml-auto text-[13px] tab-num text-accent">{avancement} %</span>
            </div>
            <Progression valeur={avancement} />
            <p className="text-[12px] text-encre-3 mt-2">
              {avancement < 40 ? "Instantané de la base en cours…"
                : avancement < 75 ? "Archivage des documents…"
                  : "Chiffrement et dépôt hors site…"}
            </p>
          </div>
        } />
      )}

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Dernière sauvegarde" valeur={derniere?.quand ?? "—"} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Dernière vérifiée" valeur={derniereVerifiee?.quand ?? "aucune"} ton={derniereVerifiee ? "bon" : "critique"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Non vérifiées" valeur={String(nonVerifiees)} ton={nonVerifiees > 3 ? "vigilance" : undefined} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Échecs (30 j)" valeur={String(echecs)} ton={echecs ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Conservation" valeur="90 jours" />} />
      </div>

      {nonVerifiees > 3 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-vigilance-voile border border-vigilance/40 anim-apparait">
          <Icone nom="base" className="text-vigilance mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,220px)] text-[13px]">
            <b>{nonVerifiees} sauvegardes n'ont jamais été restaurées à blanc.</b>{" "}
            <span className="text-encre-2">
              Une sauvegarde qu'on n'a jamais tenté de restaurer n'est pas une sauvegarde : c'est un fichier
              dont on espère qu'il marche. La vérification se fait sur un environnement jetable, sans toucher
              à la production.
            </span>
          </div>
          <Bouton taille="s" onClick={() => derniere && verifier(derniere)} enfants="Vérifier la dernière" />
        </div>
      )}

      <Carte enfants={
        <TableauDonnees
          lignes={sauvegardes} colonnes={colonnes} cle={(s) => s.id}
          nomEntite={["sauvegarde", "sauvegardes"]}
          triInitial={{ cle: "quand", sens: "desc" }}
          surLigne={(s) => ui.ouvrirTiroir({
            titre: `Sauvegarde du ${s.quand}`,
            sous: <span className="font-mono">{s.id}</span>,
            onglets: [{
              nom: "Fiche",
              contenu: (
                <>
                  <Definitions lignes={[
                    ["Type", s.type],
                    ["Taille", s.taille],
                    ["Durée", s.duree],
                    ["Emplacement", s.emplacement],
                    ["Chiffrement", s.chiffree ? "AES-256, clé détenue par l'Agence" : "aucun"],
                    ["Vérification", s.verifiee ? "restauration à blanc réussie" : "jamais vérifiée"],
                    ["Résultat", <Jeton ton={s.etat === "réussie" ? "bon" : "critique"} enfants={s.etat} />],
                    ...(s.motif ? [["Motif de l'échec", s.motif] as [string, string]] : []),
                  ]} />
                  <p className="text-[12px] text-encre-3 mt-4">
                    Une restauration remet la plateforme dans l'état où elle était à cette date.
                    Tout ce qui a été saisi depuis est perdu : pointages, demandes, décisions.
                  </p>
                </>
              ),
            }],
            pied: s.etat === "réussie" ? (
              <>
                {!s.verifiee && <Bouton icone="check" onClick={() => { ui.fermerTiroir(); verifier(s); }} enfants="Vérifier" />}
                <Bouton ton="danger" className="ml-auto" icone="rafraichir"
                  onClick={() => { ui.fermerTiroir(); restaurer(s); }} enfants="Restaurer" />
              </>
            ) : <p className="text-[12px] text-encre-3">Cette sauvegarde a échoué : elle ne peut pas être restaurée.</p>,
          })}
          actionsLigne={(s) => s.etat === "réussie" ? (
            <>
              {!s.verifiee && <Bouton ton="fantome" taille="s" icone="check" title="Vérifier" onClick={() => verifier(s)} />}
              <Bouton ton="fantome" taille="s" icone="telecharger" title="Télécharger"
                onClick={() => ui.message("Téléchargement chiffré préparé — lien valable 1 heure.", "bon")} />
              <Bouton ton="fantome" taille="s" icone="rafraichir" title="Restaurer" onClick={() => restaurer(s)} />
            </>
          ) : null}
        />
      } />

      <Carte className="mt-4" enfants={
        <>
          <TeteCarte titre="Politique de conservation" sous="Ce que le système garde, et pendant combien de temps" />
          <div className="pas-carte pt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {[
              ["Quotidiennes", "7 jours", "Incrémentales, site de secours", "bon"],
              ["Hebdomadaires", "4 semaines", "Complètes, site de secours", "bon"],
              ["Mensuelles", "12 mois", "Complètes, archive froide", "accent"],
              ["Annuelles", "5 ans", "Complètes, archive froide hors ligne", "accent"],
            ].map(([quoi, duree, ou, ton]) => (
              <div key={quoi} className="p-3 rounded-[4px] border border-bordure bg-surface-2">
                <div className="text-[13px] font-semibold">{quoi}</div>
                <div className={cx("text-[19px] font-semibold tab-num mt-1", ton === "bon" ? "text-bon" : "text-accent")}>{duree}</div>
                <div className="text-[11px] text-encre-3 mt-1">{ou}</div>
              </div>
            ))}
          </div>
        </>
      } />
    </>
  );
}
