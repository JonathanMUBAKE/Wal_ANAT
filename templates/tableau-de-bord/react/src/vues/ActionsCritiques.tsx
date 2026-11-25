import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Interrupteur, Jeton, LigneStat, Onglets, TeteCarte } from "../composants/Primitives";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { Icone, type NomIcone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, normaliser } from "../lib/format";
import { actionsCritiques as gestesInitiaux, reglesGestes, type ActionCritique, type CategorieGeste } from "../lib/exploitation";

const ICONES: Record<CategorieGeste, NomIcone> = {
  "suppression": "corbeille", "export": "telecharger", "habilitation": "bouclier",
  "configuration": "reglages", "signature": "cle", "accès sensible": "oeil", "verrouillage": "puissance",
};

const TON = { "alerte": "critique", "inhabituel": "vigilance", "à surveiller": "neutre" } as const;

/* Actions critiques : le journal d'audit enregistre tout, cette liste ne
   retient que les gestes dont on voudra se souvenir — ce qui détruit, ce
   qui exfiltre, ce qui ouvre un droit, ce qui engage l'organisation.
   C'est la différence entre tracer et surveiller. Tracer, c'est garder ;
   surveiller, c'est décider à l'avance ce qu'on ira regarder. */
export function ActionsCritiques() {
  const ui = useUI();
  const [gestes, poserGestes] = useState<ActionCritique[]>(gestesInitiaux);
  const [onglet, poserOnglet] = useState("surveillance");
  const [q, poserQ] = useState("");
  const [categorie, poserCategorie] = useState("");

  const aJustifier = gestes.filter((g) => g.etat === "à justifier");
  const alertes = gestes.filter((g) => g.niveau === "alerte");
  const horsReseau = gestes.filter((g) => g.lieu.startsWith("Hors"));
  const suppressions = gestes.filter((g) => g.categorie === "suppression");

  const base = onglet === "justifier" ? aJustifier : gestes;
  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return base.filter((g) =>
      (!n || normaliser(`${g.libelle} ${g.cible} ${g.auteur} ${g.id}`).includes(n)) &&
      (!categorie || g.categorie === categorie));
  }, [base, q, categorie]);

  async function demanderJustification(g: ActionCritique) {
    const ok = await ui.confirmer({
      titre: `Demander une justification à ${g.auteur} ?`,
      texte: `Un message lui demandera d'expliquer « ${g.libelle.toLowerCase()} » sur ${g.cible}. La demande et la réponse sont jointes au geste. Ce n'est pas une sanction : c'est ce qui permet de distinguer, plus tard, un geste légitime d'un geste à expliquer.`,
      bouton: "Demander", ton: "info",
    });
    if (!ok) return;
    poserGestes((l) => l.map((x) => x.id === g.id ? { ...x, etat: "à justifier" } : x));
    ui.message(`Justification demandée à ${g.auteur}.`, "bon");
  }

  async function escalader(g: ActionCritique) {
    const ok = await ui.confirmer({
      titre: `Escalader ${g.id} ?`,
      texte: "Le geste part au responsable de la sécurité avec son contexte complet : auteur, origine, volume, règle déclenchée. Une escalade se justifie quand le geste est à la fois inhabituel et irréversible.",
      bouton: "Escalader", ton: "vigilance",
    });
    if (!ok) return;
    poserGestes((l) => l.map((x) => x.id === g.id ? { ...x, etat: "escaladée" } : x));
    ui.message(`${g.id} escaladé au responsable de la sécurité.`, "bon");
  }

  function detail(g: ActionCritique) {
    ui.ouvrirTiroir({
      titre: g.libelle,
      sous: <><span className="font-mono">{g.id}</span> · {g.quand}</>,
      onglets: [
        { nom: "Le geste", contenu: (
          <>
            <Definitions lignes={[
              ["Catégorie", g.categorie],
              ["Cible", <span className="font-mono">{g.cible}</span>],
              ["Volume", <b>{g.volume}</b>],
              ["Auteur", <>{g.auteur} <span className="text-encre-3">— {g.role}</span></>],
              ["Origine", <span className="font-mono">{g.ip}</span>],
              ["Lieu", g.lieu.startsWith("Hors")
                ? <span className="text-vigilance font-semibold">{g.lieu}</span> : g.lieu],
              ["Appareil", g.appareil],
              ["Niveau", <Jeton ton={TON[g.niveau]} enfants={g.niveau} />],
              ["État", <Jeton ton={g.etat === "justifiée" ? "bon" : g.etat === "escaladée" ? "critique" : g.etat === "à justifier" ? "vigilance" : "neutre"} enfants={g.etat} />],
            ]} />
            <div className="mt-4 p-3 rounded-[4px] bg-surface-2 border border-bordure">
              <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-1">
                Pourquoi ce geste remonte
              </div>
              <p className="text-[12.5px] text-encre-2">{g.regle}</p>
            </div>
            {g.justification && (
              <div className="mt-3 p-3 rounded-[4px] bg-bon-voile">
                <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-bon mb-1">Justification</div>
                <p className="text-[12.5px] text-encre-2">{g.justification}</p>
              </div>
            )}
          </>
        )},
      ],
      pied: g.etat === "vue" || g.etat === "à justifier" ? (
        <>
          <Bouton icone="cloche" onClick={() => { ui.fermerTiroir(); demanderJustification(g); }} enfants="Demander une justification" />
          <Bouton ton="danger" className="ml-auto" icone="escalade" onClick={() => { ui.fermerTiroir(); escalader(g); }} enfants="Escalader" />
        </>
      ) : undefined,
    });
  }

  const colonnes: Colonne<ActionCritique>[] = [
    { cle: "quand", nom: "Quand", triable: true, fixe: true, valeur: (g) => -g.minutes,
      rendu: (g) => <span className="text-encre-3 whitespace-nowrap">{g.quand}</span> },
    { cle: "libelle", nom: "Geste", triable: true, rendu: (g) => (
      <span className="flex items-center gap-[9px] min-w-0">
        <span className={cx("w-[24px] h-[24px] rounded-[4px] grid place-items-center shrink-0",
          g.categorie === "suppression" ? "bg-critique-voile text-critique"
            : g.categorie === "export" || g.categorie === "accès sensible" ? "bg-vigilance-voile text-vigilance"
            : "bg-surface-3 text-encre-3")}>
          <Icone nom={ICONES[g.categorie]} taille="s" />
        </span>
        <span className="flex flex-col min-w-0">
          <span className="font-medium truncate">{g.libelle}</span>
          <span className="font-mono text-[11px] text-encre-3 truncate">{g.cible}</span>
        </span>
      </span>
    )},
    { cle: "volume", nom: "Volume", triable: true, rendu: (g) => <span className="font-medium">{g.volume}</span> },
    { cle: "auteur", nom: "Auteur", triable: true, rendu: (g) => (
      <span className="flex flex-col min-w-0">
        <span className="truncate">{g.auteur}</span>
        <span className="text-[11px] text-encre-3 truncate">{g.role}</span>
      </span>
    )},
    { cle: "ip", nom: "Origine", rendu: (g) => (
      <span className="flex flex-col min-w-0">
        <span className="font-mono text-[12px]">{g.ip}</span>
        <span className={cx("text-[11px]", g.lieu.startsWith("Hors") ? "text-vigilance font-medium" : "text-encre-3")}>{g.lieu}</span>
      </span>
    )},
    { cle: "niveau", nom: "Niveau", triable: true, rendu: (g) => <Jeton ton={TON[g.niveau]} enfants={g.niveau} /> },
    { cle: "etat", nom: "Suite", triable: true, rendu: (g) => (
      <Jeton ton={g.etat === "justifiée" ? "bon" : g.etat === "escaladée" ? "critique" : g.etat === "à justifier" ? "vigilance" : "neutre"}
        enfants={g.etat} />
    )},
  ];

  return (
    <>
      <Entete
        titre="Actions critiques"
        sous="Ce qui détruit, ce qui exfiltre, ce qui ouvre un droit, ce qui engage l'organisation — avec qui, d'où, et combien."
        actions={
          <>
            {aJustifier.length > 0 && <Jeton ton="vigilance" enfants={`${aJustifier.length} à justifier`} />}
            <Bouton icone="telecharger"
              onClick={() => { exporterCSV("actions-critiques", filtres); ui.message("Liste exportée.", "bon"); }}
              enfants="Exporter" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Gestes surveillés" valeur={<NombreAnime valeur={gestes.length} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En alerte" valeur={<NombreAnime valeur={alertes.length} />} ton={alertes.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="À justifier" valeur={<NombreAnime valeur={aJustifier.length} />} ton={aJustifier.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Suppressions définitives" valeur={<NombreAnime valeur={suppressions.length} />} ton={suppressions.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Depuis hors réseau" valeur={<NombreAnime valeur={horsReseau.length} />} ton={horsReseau.length ? "vigilance" : "bon"} />} />
      </div>

      {alertes.length > 0 && (
        <Apparition className="mb-4">
          <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] bg-critique-voile border border-critique/40">
            <Icone nom="corbeille" className="text-critique mt-[2px]" />
            <div className="flex-1 min-w-[min(100%,220px)] text-[13px]">
              <b>{alertes[0].libelle} — {alertes[0].volume}.</b>{" "}
              <span className="text-encre-2">
                Par {alertes[0].auteur} ({alertes[0].role.toLowerCase()}), {alertes[0].quand}, depuis
                {" "}{alertes[0].lieu.toLowerCase()} — <span className="font-mono">{alertes[0].ip}</span>.
                Une suppression définitive de pièces d'un dossier individuel, faite hors du réseau de
                l'Agence, mérite une explication avant qu'on en perde le fil.
              </span>
            </div>
            <Bouton taille="s" ton="danger" onClick={() => detail(alertes[0])} enfants="Ouvrir" />
          </div>
        </Apparition>
      )}

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "surveillance", nom: "Gestes surveillés", compte: gestes.length },
              { cle: "justifier", nom: "À justifier", compte: aJustifier.length },
              { cle: "regles", nom: "Règles de remontée", compte: reglesGestes.length },
            ]}
          />

          {onglet === "regles" ? (
            <div className="pas-carte">
              <p className="text-[12px] text-encre-3 mb-3">
                Ce qu'on décide de regarder. Une règle trop large noie les gestes qui comptent ;
                une règle trop étroite laisse passer celui qu'on cherchera dans six mois.
              </p>
              <ListeEchelonnee>
                {reglesGestes.map((r) => (
                  <div key={r.categorie} className="flex items-start gap-3 py-[12px] border-b border-bordure last:border-0">
                    <span className={cx("w-[26px] h-[26px] rounded-[4px] grid place-items-center shrink-0 mt-[2px]",
                      r.categorie === "suppression" ? "bg-critique-voile text-critique" : "bg-surface-3 text-encre-3")}>
                      <Icone nom={ICONES[r.categorie]} taille="s" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold capitalize">{r.categorie}</div>
                      <p className="text-[12.5px] text-encre-2 mt-[2px]">{r.regle}</p>
                      <div className="text-[11px] text-encre-4 mt-[3px]">
                        {r.occurrences30j} gestes remontés sur 30 jours
                      </div>
                    </div>
                    <Interrupteur actif={r.active} surChangement={() => ui.message("La désactivation d'une règle de remontée est elle-même un geste critique — elle sera journalisée.", "info")}
                      etiquette={`Règle ${r.categorie}`} />
                  </div>
                ))}
              </ListeEchelonnee>
            </div>
          ) : (
            <TableauDonnees
              lignes={filtres} colonnes={colonnes} cle={(g) => g.id}
              totalBrut={gestes.length} nomEntite={["geste", "gestes"]}
              triInitial={{ cle: "quand", sens: "asc" }}
              surLigne={detail}
              vide={{ titre: "Rien à surveiller", texte: "Aucun geste critique dans cette vue." }}
              barreOutils={
                <>
                  <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                    <Icone nom="recherche" taille="s" />
                    <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                      placeholder="Geste, cible, auteur…" aria-label="Rechercher un geste"
                      className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
                  </div>
                  <select value={categorie} onChange={(e) => poserCategorie(e.target.value)} aria-label="Filtrer par catégorie"
                    className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                    <option value="">Toutes les catégories</option>
                    {reglesGestes.map((r) => <option key={r.categorie}>{r.categorie}</option>)}
                  </select>
                </>
              }
              actionsLigne={(g) => (
                <>
                  <Bouton ton="fantome" taille="s" icone="oeil" title="Ouvrir" onClick={() => detail(g)} />
                  {(g.etat === "vue" || g.etat === "à justifier") && (
                    <Bouton ton="fantome" taille="s" icone="escalade" title="Escalader" onClick={() => escalader(g)} />
                  )}
                </>
              )}
            />
          )}
        </>
      } />

      <Apparition delai={120}>
        <Carte className="mt-4" enfants={
          <>
            <TeteCarte titre="Tracer ou surveiller" sous="Deux choses différentes, souvent confondues" />
            <div className="pas-carte pt-3 text-[13px] text-encre-2 leading-[20px]">
              <p>
                Le journal d'audit <b>trace</b> : il garde tout, sans jugement, pour qu'on puisse
                reconstituer plus tard. Cette page <b>surveille</b> : elle décide à l'avance de ce qu'on
                ira regarder, et le remonte pendant qu'il est encore temps d'en parler.
              </p>
              <p className="mt-3">
                Les deux sont nécessaires, et ni l'un ni l'autre ne suffit. Un journal sans surveillance
                ne sert qu'après coup, quand le mal est fait. Une surveillance sans journal ne permet pas
                de vérifier ce qu'elle a laissé passer.
              </p>
            </div>
          </>
        } />
      </Apparition>
    </>
  );
}
