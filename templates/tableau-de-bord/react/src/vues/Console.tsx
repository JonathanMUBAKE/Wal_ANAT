import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, TeteCarte } from "../composants/Primitives";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { Icone } from "../composants/Icone";
import { useUI } from "../composants/Superpositions";
import { cx, exporterCSV, normaliser } from "../lib/format";
import { executionsOperations, operations, type Operation } from "../lib/exploitation";

const NIVEAUX = {
  "lecture": { ton: "neutre", nom: "lecture seule", texte: "Aucun effet sur le système." },
  "sûr": { ton: "bon", nom: "sans danger", texte: "Effet limité et réversible." },
  "sensible": { ton: "vigilance", nom: "sensible", texte: "Effet visible pour les agents ou pour les données." },
  "destructif": { ton: "critique", nom: "destructif", texte: "Irréversible, ou coupe le service." },
} as const;

/* Console d'exploitation : des gestes préparés d'avance, avec leur portée,
   leur garde-fou et leur trace.
   Ce n'est volontairement pas un terminal libre. Un terminal libre sur la
   production ne se journalise pas utilement : on sait qu'une commande a été
   tapée, pas ce qu'elle a changé. Ici, chaque opération déclare son effet,
   sa réversibilité et sa portée avant d'être lancée — c'est ce qui permet
   de la refuser en connaissance de cause. */
export function Console() {
  const ui = useUI();
  const [onglet, poserOnglet] = useState("operations");
  const [q, poserQ] = useState("");
  const [choisie, poserChoisie] = useState<Operation>(operations[0]);
  const [valeurs, poserValeurs] = useState<Record<string, string>>({});
  const [sortie, poserSortie] = useState<string | null>(null);
  const [enCours, poserEnCours] = useState(false);

  const categories = useMemo(() => [...new Set(operations.map((o) => o.categorie))], []);
  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return operations.filter((o) => !n || normaliser(`${o.nom} ${o.description} ${o.categorie}`).includes(n));
  }, [q]);

  const parametresRemplis = choisie.parametres.every((p) => valeurs[p.nom]?.trim() || p.defaut);

  async function executer() {
    const n = NIVEAUX[choisie.niveau];
    if (choisie.niveau !== "lecture") {
      const ok = await ui.confirmer({
        titre: `Exécuter « ${choisie.nom} » ?`,
        texte: `${choisie.effet} ${choisie.reversible ? "L'opération est réversible." : "L'opération n'est pas réversible."} Elle sera exécutée à votre nom et inscrite au journal d'audit.`,
        bouton: "Exécuter", ton: choisie.niveau === "destructif" ? "danger" : "vigilance",
        mot: choisie.niveau === "destructif" ? choisie.cle.toUpperCase() : undefined,
      });
      if (!ok) return;
    }
    poserEnCours(true);
    poserSortie(null);
    setTimeout(() => {
      poserEnCours(false);
      poserSortie(
        choisie.cle === "diag"
          ? `Service : ${valeurs.service ?? "passerelle-api"}\nÉtat : dégradé\nLatence p95 : 842 ms (seuil 250 ms)\nErreurs 500 : 14 sur les 10 dernières minutes\nConnexions base : 12 actives, 1 en attente de verrou\nVersion déployée : v3.4.0 (il y a 42 min)\n\nToutes les erreurs 500 sont précédées d'un délai de connexion base dépassé.`
          : `Opération « ${choisie.nom} » terminée.\nParamètres : ${JSON.stringify(valeurs)}\nDurée : ${choisie.duree}\nRésultat : réussi.\n\nL'opération est inscrite au journal d'audit sous votre nom.`);
      ui.message(`« ${choisie.nom} » exécutée${n.ton === "neutre" ? "" : " et journalisée"}.`, "bon");
    }, 1400);
  }

  return (
    <>
      <Entete
        titre="Console d'exploitation"
        sous="Les gestes d'exploitation, avec leur portée annoncée avant exécution et leur trace après."
        actions={
          <Bouton icone="telecharger"
            onClick={() => { exporterCSV("executions", executionsOperations); ui.message("Journal des exécutions exporté.", "bon"); }}
            enfants="Exporter le journal" />
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Opérations" valeur={<NombreAnime valeur={operations.length} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sans danger" valeur={<NombreAnime valeur={operations.filter((o) => o.niveau === "lecture" || o.niveau === "sûr").length} />} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sensibles" valeur={<NombreAnime valeur={operations.filter((o) => o.niveau === "sensible").length} />} ton="vigilance" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Destructives" valeur={<NombreAnime valeur={operations.filter((o) => o.niveau === "destructif").length} />} ton="critique" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Exécutions (30 j)" valeur={<NombreAnime valeur={operations.reduce((a, o) => a + o.executions30j, 0)} />} />} />
      </div>

      <Carte enfants={
        <Onglets actif={onglet} surChoix={poserOnglet}
          onglets={[
            { cle: "operations", nom: "Opérations", compte: operations.length },
            { cle: "journal", nom: "Journal des exécutions", compte: executionsOperations.length },
          ]} />
      } />

      {onglet === "operations" ? (
        <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)" }}>
          <Carte className="self-start" enfants={
            <>
              <div className="pas-carte border-b border-bordure">
                <div className="flex items-center gap-2 h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                  <Icone nom="recherche" taille="s" />
                  <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                    placeholder="Nom ou description…" aria-label="Rechercher une opération"
                    className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
                </div>
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                {categories.map((cat) => {
                  const dedans = filtres.filter((o) => o.categorie === cat);
                  if (!dedans.length) return null;
                  return (
                    <div key={cat}>
                      <div className="px-3 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4">{cat}</div>
                      {dedans.map((o, i) => (
                        <button key={o.cle} type="button"
                          onClick={() => { poserChoisie(o); poserValeurs({}); poserSortie(null); }}
                          className={cx("flex items-start gap-3 px-3 py-[10px] w-full text-left transi anim-pousse",
                            choisie.cle === o.cle ? "bg-accent-voile" : "hover:bg-surface-2")}
                          style={{ animationDelay: i * 20 + "ms" }}>
                          <Pastille ton={NIVEAUX[o.niveau].ton} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium">{o.nom}</span>
                            <span className="block text-[11px] text-encre-3 mt-[2px] line-clamp-1">{o.description}</span>
                          </span>
                          <span className="text-[11px] text-encre-4 tab-num shrink-0">{o.executions30j}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          } />

          <div className="min-w-0">
            <Carte className="anim-pousse" enfants={
              <>
                <div className="flex items-start gap-3 pas-carte border-b border-bordure">
                  <span className={cx("w-[32px] h-[32px] rounded-[4px] grid place-items-center shrink-0",
                    choisie.niveau === "destructif" ? "bg-critique-voile text-critique"
                      : choisie.niveau === "sensible" ? "bg-vigilance-voile text-vigilance"
                      : "bg-surface-3 text-encre-3")}>
                    <Icone nom="terminal" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[15px] font-semibold">{choisie.nom}</h2>
                      <Jeton ton={NIVEAUX[choisie.niveau].ton} enfants={NIVEAUX[choisie.niveau].nom} />
                      <Jeton ton="neutre" point={false} enfants={choisie.categorie} />
                    </div>
                    <p className="text-[12.5px] text-encre-3 mt-[2px]">{choisie.description}</p>
                  </div>
                </div>

                <div className="pas-carte space-y-4">
                  <section className={cx("p-3 rounded-[4px]",
                    choisie.niveau === "destructif" ? "bg-critique-voile"
                      : choisie.niveau === "sensible" ? "bg-vigilance-voile" : "bg-surface-2")}>
                    <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-1">
                      Ce que ça fait
                    </div>
                    <p className="text-[13px] text-encre-2">{choisie.effet}</p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-encre-3 flex-wrap">
                      <span>{choisie.reversible ? "réversible" : "non réversible"}</span>
                      <span>durée {choisie.duree}</span>
                      <span>droit requis : <span className="font-mono">{choisie.droit}</span></span>
                      <span>{choisie.executions30j} exécutions sur 30 jours</span>
                    </div>
                  </section>

                  {choisie.parametres.length > 0 && (
                    <section>
                      <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-2">Paramètres</div>
                      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                        {choisie.parametres.map((p) => (
                          <div key={p.nom}>
                            <label htmlFor={"p-" + p.nom} className="block text-[12px] text-encre-3 mb-[5px]">{p.nom}</label>
                            {p.type === "choix" ? (
                              <select id={"p-" + p.nom} value={valeurs[p.nom] ?? ""}
                                onChange={(e) => poserValeurs((v) => ({ ...v, [p.nom]: e.target.value }))}
                                className="w-full h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                                <option value="">Choisir…</option>
                                {p.options?.map((o) => <option key={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input id={"p-" + p.nom} type={p.type === "nombre" ? "number" : "text"}
                                value={valeurs[p.nom] ?? p.defaut ?? ""}
                                onChange={(e) => poserValeurs((v) => ({ ...v, [p.nom]: e.target.value }))}
                                className="w-full h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px] outline-none focus:border-accent transi" />
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <Bouton
                      ton={choisie.niveau === "destructif" ? "danger" : choisie.niveau === "lecture" ? "neutre" : "principal"}
                      icone={enCours ? "rafraichir" : "lecture"} disabled={!parametresRemplis || enCours}
                      onClick={executer}
                      enfants={enCours ? "Exécution…" : choisie.niveau === "lecture" ? "Lancer la lecture" : "Exécuter"} />
                    {!parametresRemplis && (
                      <span className="text-[12px] text-encre-3">Renseignez les paramètres pour continuer.</span>
                    )}
                    {choisie.niveau === "destructif" && parametresRemplis && (
                      <span className="text-[12px] text-critique">
                        Cette opération demandera de retaper son nom avant exécution.
                      </span>
                    )}
                  </div>

                  {(enCours || sortie) && (
                    <section>
                      <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-2">Sortie</div>
                      <pre className={cx("font-mono text-[12px] leading-[18px] p-3 rounded-[4px] bg-fond border border-bordure whitespace-pre-wrap min-h-[80px]",
                        enCours && "relative barre-charge")}>
                        {enCours ? "Exécution en cours…" : sortie}
                      </pre>
                    </section>
                  )}
                </div>
              </>
            } />
          </div>
        </div>
      ) : (
        <Carte className="mt-4" enfants={
          <div className="pas-carte">
            <p className="text-[12px] text-encre-3 mb-3">
              Chaque exécution garde son opération, ses paramètres exacts, son auteur, sa durée et sa
              sortie. C'est ce qui permet, trois semaines plus tard, de savoir qui a vidé quelle file.
            </p>
            <ListeEchelonnee className="space-y-2">
              {executionsOperations.map((e) => (
                <div key={e.id} className={cx("p-3 rounded-[4px] border",
                  e.resultat === "échoué" ? "border-critique/40 bg-critique-voile"
                    : e.resultat === "annulé" ? "border-bordure bg-surface-2 opacity-75"
                    : "border-bordure bg-surface-2")}>
                  <div className="flex items-start gap-3 flex-wrap mb-2">
                    <Pastille ton={e.resultat === "réussi" ? "bon" : e.resultat === "échoué" ? "critique" : "neutre"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold">{e.operation}</span>
                        <span className="font-mono text-[11px] px-[6px] py-[1px] rounded-[3px] bg-surface-3 text-encre-3">{e.parametres}</span>
                        <Jeton ton={NIVEAUX[e.niveau].ton} point={false} enfants={NIVEAUX[e.niveau].nom} />
                      </div>
                      <div className="text-[11px] text-encre-3 mt-[3px]">
                        {e.par} · {e.quand} · {e.duree} · <span className="font-mono">{e.id}</span>
                      </div>
                    </div>
                    <Jeton ton={e.resultat === "réussi" ? "bon" : e.resultat === "échoué" ? "critique" : "neutre"} enfants={e.resultat} />
                  </div>
                  <pre className="font-mono text-[11.5px] leading-[17px] p-[10px] rounded-[4px] bg-fond border border-bordure whitespace-pre-wrap text-encre-2">
                    {e.sortie}
                  </pre>
                </div>
              ))}
            </ListeEchelonnee>
          </div>
        } />
      )}

      <Apparition delai={120}>
        <Carte className="mt-4" enfants={
          <>
            <TeteCarte titre="Pourquoi pas un terminal libre" sous="La question revient à chaque fois" />
            <div className="pas-carte pt-3 text-[13px] text-encre-2 leading-[20px]">
              <p>
                Un terminal libre sur la production se journalise mal : on garde la commande tapée,
                pas ce qu'elle a changé. Trois semaines plus tard, personne ne sait si le
                <span className="font-mono text-[12px]"> DELETE </span> portait sur sept lignes ou
                sur sept cent mille.
              </p>
              <p className="mt-3">
                Une opération déclarée annonce sa portée avant d'être lancée. C'est ce qui permet de
                la refuser en connaissance de cause — et, quand elle a été lancée, de retrouver
                exactement ce qu'elle a fait. Le prix à payer est qu'il faut déclarer chaque geste.
                C'est un prix raisonnable sur un système qui porte la paie de quatre cents personnes.
              </p>
            </div>
          </>
        } />
      </Apparition>
    </>
  );
}
