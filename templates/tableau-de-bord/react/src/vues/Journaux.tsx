import { useEffect, useMemo, useRef, useState } from "react";
import { Icone } from "../composants/Icone";
import { Bouton, Carte } from "../composants/Primitives";
import { Definitions, useUI } from "../composants/Superpositions";
import { AssistantIA } from "../composants/AssistantIA";
import { journauxInitiaux, ligneJournal, type LigneJournal, type NiveauJournal } from "../lib/donnees";
import { cx, exporterCSV, fmt, normaliser } from "../lib/format";

const NIVEAUX: Array<{ cle: NiveauJournal; nom: string; bord: string; texte: string }> = [
  { cle: "ERREUR", nom: "Erreur", bord: "border-l-critique", texte: "text-critique" },
  { cle: "ALERTE", nom: "Alerte", bord: "border-l-vigilance", texte: "text-vigilance" },
  { cle: "INFO", nom: "Info", bord: "border-l-transparent", texte: "text-accent" },
  { cle: "DEBUG", nom: "Débogage", bord: "border-l-transparent", texte: "text-encre-4" },
];

export function Journaux() {
  const ui = useUI();
  const [lignes, poserLignes] = useState<LigneJournal[]>(journauxInitiaux);
  const [actifs, poserActifs] = useState<Set<NiveauJournal>>(new Set(["ERREUR", "ALERTE", "INFO"]));
  const [q, poserQ] = useState("");
  const [flux, poserFlux] = useState(true);
  const boite = useRef<HTMLDivElement>(null);

  /* Flux en direct : une ligne toutes les 1,6 s, fenêtre glissante de 900. */
  useEffect(() => {
    if (!flux) return;
    const t = setInterval(() => {
      poserLignes((l) => [...l.slice(-899), ligneJournal(0)]);
    }, 1600);
    return () => clearInterval(t);
  }, [flux]);

  const filtrees = useMemo(() => {
    const n = normaliser(q.trim());
    return lignes.filter((l) => actifs.has(l.niveau) &&
      (!n || normaliser(`${l.message} ${l.source} ${l.requete}`).includes(n))).slice(-400);
  }, [lignes, actifs, q]);

  useEffect(() => {
    if (flux && boite.current) boite.current.scrollTop = boite.current.scrollHeight;
  }, [filtrees, flux]);

  const detail = (l: LigneJournal) => ui.ouvrirTiroir({
    titre: "Ligne de journal",
    sous: <span className="font-mono">{l.requete}</span>,
    onglets: [{
      nom: "Contexte",
      contenu: <Definitions lignes={[
        ["Niveau", l.niveau],
        ["Horodatage", <span className="font-mono">{l.horo}</span>],
        ["Service", <span className="font-mono">{l.source}</span>],
        ["Requête", <span className="font-mono">{l.requete}</span>],
        ["Message", l.message],
      ]} />,
    }],
    pied: (
      <>
        <Bouton onClick={() => ui.message("Requête rejouée en bac à sable.", "bon")} enfants="Rejouer la requête" />
        <Bouton ton="principal" className="ml-auto"
          onClick={() => ui.message("Alerte créée à partir de ce motif.", "bon")} enfants="Créer une alerte" />
      </>
    ),
  });

  return (
    <Carte enfants={
      <>
        <div className="flex items-center gap-2 flex-wrap pas-carte border-b border-bordure sans-impression">
          <div className="flex items-center gap-2 h-8 px-[10px] min-w-[280px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent">
            <Icone nom="recherche" taille="s" />
            <input
              type="search" value={q} onChange={(e) => poserQ(e.target.value)}
              placeholder="Filtrer les lignes (texte, service, identifiant de requête…)"
              aria-label="Filtrer les journaux"
              className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4"
            />
          </div>
          <div className="flex gap-[6px] flex-wrap" role="group" aria-label="Niveaux de gravité">
            {NIVEAUX.map((n) => {
              const on = actifs.has(n.cle);
              return (
                <button
                  key={n.cle} type="button" aria-pressed={on}
                  onClick={() => poserActifs((s) => {
                    const c = new Set(s); c.has(n.cle) ? c.delete(n.cle) : c.add(n.cle); return c;
                  })}
                  className={cx(
                    "h-[27px] px-[10px] rounded-full border text-[12.5px] inline-flex items-center gap-[6px]",
                    on ? "bg-accent-voile border-accent text-accent-fort font-medium"
                       : "bg-surface-2 border-bordure text-encre-3 hover:text-encre hover:border-bordure-2",
                  )}
                >
                  <i className={cx("w-[6px] h-[6px] rounded-full", n.texte.replace("text-", "bg-"))} />
                  {n.nom}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex gap-2">
            <Bouton taille="s" icone={flux ? "pause" : "lecture"} actif={flux} aria-pressed={flux}
              onClick={() => poserFlux((f) => !f)} enfants={flux ? "Flux en direct" : "Flux en pause"} />
            <Bouton taille="s" icone="telecharger" onClick={() => {
              exporterCSV("journaux", filtrees); ui.message("Export des journaux lancé.", "bon");
            }} enfants="Exporter" />
          </div>
        </div>

        <div className="pas-carte">
          {/* L'assistant lit la sélection courante. Il ne touche à rien :
              il rend une lecture, l'opérateur la retient ou l'écarte. */}
          <div className="mb-4">
            <AssistantIA
              invite={`Sur les ${filtrees.filter((l) => l.niveau === "ERREUR" || l.niveau === "ALERTE").length} lignes d'erreur et d'alerte affichées.`}
              cout={0.014}
              constat={{
                resume:
                  "Les erreurs de base de données et les réponses 500 de la passerelle forment une seule suite : chaque 500 suit un délai dépassé de moins d'une seconde.",
                cause:
                  "Le délai de connexion à la base est atteint, et la passerelle renvoie un 500 faute de pouvoir répondre. La cause est donc en amont de l'applicatif — ce n'est pas la passerelle qu'il faut regarder, mais ce qui tient la base occupée.",
                certitude: "moyenne",
                preuves: filtrees
                  .filter((l) => l.niveau === "ERREUR")
                  .slice(-3)
                  .map((l) => ({ source: `${l.source} · ${l.horo}`, extrait: l.message })),
                pistes: [
                  "Vérifier les verrous en cours sur la base : une transaction restée ouverte produit exactement ce motif.",
                  "Comparer l'heure du premier délai dépassé avec le dernier déploiement de la passerelle.",
                  "Si les deux ne coïncident pas, écarter le code et chercher du côté des travaux de nettoyage.",
                ],
                action: {
                  libelle: "Créer une alerte sur ce motif",
                  consequence:
                    "Une règle se déclenchera dès que trois délais dépassés surviendront en moins d'une minute.",
                },
              }}
              surAction={() => ui.message("Règle d'alerte créée sur ce motif.", "bon")}
            />
          </div>

          <div ref={boite} role="log" aria-live="polite"
            className="font-mono text-[12px] leading-[1.75] max-h-[520px] overflow-auto bg-fond rounded-[4px] border border-bordure">
            {filtrees.length === 0 && (
              <p className="px-4 py-10 text-center text-encre-3">Aucune ligne ne correspond à ce filtre.</p>
            )}
            {filtrees.map((l) => {
              const n = NIVEAUX.find((x) => x.cle === l.niveau)!;
              return (
                <div
                  key={l.id} tabIndex={0} onClick={() => detail(l)}
                  onKeyDown={(e) => { if (e.key === "Enter") detail(l); }}
                  className={cx(
                    "grid grid-cols-[86px_62px_128px_1fr] gap-3 px-3 py-[3px] border-l-2 cursor-pointer hover:bg-surface-2",
                    n.bord,
                  )}
                >
                  <span className="text-encre-4">{l.horo}</span>
                  <span className={cx("font-bold text-[10.5px] tracking-[.05em]", n.texte)}>{l.niveau}</span>
                  <span className="text-encre-3 truncate">{l.source}</span>
                  <span className={cx("[overflow-wrap:anywhere]", l.niveau === "ERREUR" ? "text-encre" : l.niveau === "DEBUG" ? "text-encre-3" : "text-encre-2")}>
                    {l.message}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-[11px] text-[12px] text-encre-3">
            <span>{fmt(filtrees.length)} lignes affichées sur {fmt(lignes.length)} collectées</span>
            <span className="ml-auto">Cliquez une ligne pour ouvrir le contexte complet de la requête.</span>
          </div>
        </div>
      </>
    } />
  );
}
