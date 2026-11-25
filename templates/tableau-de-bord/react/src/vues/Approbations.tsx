import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Progression, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { AssistantIA, type Constat } from "../composants/AssistantIA";
import { ListeEchelonnee } from "../composants/Mouvement";
import { useUI } from "../composants/Superpositions";
import { cx, fmt, normaliser } from "../lib/format";
import { approbations as fileInitiale, NIVEAUX, gestes, type Approbation } from "../lib/controles";

const TON_RISQUE = { faible: "neutre", moyen: "vigilance", élevé: "critique" } as const;
const ICONE_NATURE = {
  correctif: "eclair", opération: "serveur", "appel MCP": "branche", suppression: "corbeille",
  accès: "cle", envoi: "enveloppe", dépense: "monnaie", contrôle: "verrou",
} as const;

/* Approbations : tout ce qui attend une main humaine, dans une seule file.
   Deux écrans différents pour les correctifs, les opérations et les appels MCP
   produisent trois files qu'on ne regarde plus. Une seule file se vide.

   La règle tenue ici : un avis sans motif n'est pas un avis. Les boutons
   restent inertes tant que rien n'est écrit — ce n'est pas une politesse,
   c'est ce qui rend le journal relisible dans six mois. */
export function Approbations() {
  const ui = useUI();
  const [file, poserFile] = useState<Approbation[]>(fileInitiale);
  const [q, poserQ] = useState("");
  const [nature, poserNature] = useState("");
  const [parIA, poserParIA] = useState(false);
  const [vues, poserVues] = useState<"attente" | "tranchées">("attente");
  const [ouverte, poserOuverte] = useState<string | null>(fileInitiale[0]?.id ?? null);
  const [motif, poserMotif] = useState("");

  const moi = "Awa Diallo";

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return file.filter((a) =>
      (vues === "attente" ? a.etat === "en attente" : a.etat !== "en attente") &&
      (!n || normaliser(`${a.id} ${a.objet} ${a.demandeur} ${a.justification}`).includes(n)) &&
      (!nature || a.nature === nature) &&
      (!parIA || a.parIA));
  }, [file, q, nature, parIA, vues]);

  const courante = file.find((a) => a.id === ouverte) ?? filtres[0] ?? null;
  const enAttente = file.filter((a) => a.etat === "en attente");
  const eleves = enAttente.filter((a) => a.risque === "élevé").length;
  const dIA = enAttente.filter((a) => a.parIA).length;
  const irreversibles = enAttente.filter((a) => a.reversible === "non").length;

  /* On ne peut pas donner deux fois son avis sur la même demande : c'est le
     garde-fou GF-13, et il vaut aussi pour celui qui tient l'écran. */
  const dejaDonne = courante?.avis.some((v) => v.qui === moi) ?? false;

  async function trancher(a: Approbation, sens: "pour" | "contre") {
    if (!motif.trim()) return;
    const dernier = a.obtenus + 1 >= a.requis;
    const ok = await ui.confirmer({
      titre: sens === "pour"
        ? (dernier ? `Approuver et exécuter « ${a.objet} » ?` : `Donner votre accord sur « ${a.objet} » ?`)
        : `Refuser « ${a.objet} » ?`,
      texte: sens === "contre"
        ? "Le demandeur est averti avec votre motif. La demande sort de la file et ne s'exécutera pas."
        : dernier
          ? `${a.consequence}${a.reversible === "non" ? " Cette action ne se défait pas." : ""}`
          : `Votre accord est enregistré. La demande attendra encore ${a.requis - a.obtenus - 1} approbateur${a.requis - a.obtenus - 1 > 1 ? "s" : ""} avant d'être exécutée.`,
      bouton: sens === "pour" ? (dernier ? "Approuver et exécuter" : "Donner mon accord") : "Refuser",
      ton: sens === "contre" ? "danger" : a.reversible === "non" && dernier ? "vigilance" : "info",
      mot: sens === "pour" && dernier && a.reversible === "non" ? "APPROUVER" : undefined,
    });
    if (!ok) return;

    const avant = file;
    poserFile((l) => l.map((x) => {
      if (x.id !== a.id) return x;
      const avis = [...x.avis, { qui: moi, sens, motif: motif.trim(), quand: "à l'instant" }];
      if (sens === "contre") return { ...x, avis, etat: "refusée" as const };
      const obtenus = x.obtenus + 1;
      return { ...x, avis, obtenus, etat: obtenus >= x.requis ? ("approuvée" as const) : x.etat };
    }));
    poserMotif("");
    ui.message(
      sens === "contre" ? `${a.id} refusée — le demandeur est averti.`
        : dernier ? `${a.id} approuvée — ${a.nature === "correctif" ? "le correctif part en exécution" : "le geste part en exécution"}.`
          : `Votre accord est enregistré sur ${a.id}.`,
      sens === "contre" ? "critique" : "bon",
      { annuler: () => poserFile(avant) },
    );
  }

  const constat: Constat = {
    resume: `${enAttente.length} demandes attendent, dont ${dIA} déposées par un agent IA et ${irreversibles} qui ne se défont pas.`,
    cause: "La demande A-4809 est celle qui mérite le plus d'attention : elle propose de couper une détection pour tout le monde là où une liste blanche sur six adresses suffirait.",
    certitude: "moyenne",
    preuves: [
      { source: "A-4809 — pièces jointes", extrait: "61 alertes en 4 jours, dont 58 attribuées à la mission de Nouakchott et 1 non expliquée." },
      { source: "Registre des contrôles — G-032", extrait: "Couper une détection est le premier geste de qui veut passer inaperçu." },
      { source: "Garde-fou GF-14", extrait: "Désactivé le 18 novembre — un modèle peut déclencher une écriture MCP sans accord humain." },
    ],
    pistes: [
      "Trancher A-4809 par la liste blanche plutôt que par la désactivation de la règle.",
      "Lire l'alerte non expliquée des trois qui restent avant de classer les soixante autres.",
      "Réactiver GF-14, désactivé depuis sept jours sans motif consigné.",
    ],
    action: {
      libelle: "Proposer la liste blanche à la place de A-4809",
      consequence: "Une nouvelle demande est déposée dans la file, portant sur les six adresses de la mission. A-4809 reste en attente : rien n'est tranché à votre place.",
    },
  };

  return (
    <>
      <Entete
        titre="Approbations"
        sous="Tout ce qui attend une main humaine, dans une seule file. Un avis sans motif n'est pas un avis."
        actions={
          <>
            <Bouton actif={vues === "tranchées"} icone="audit"
              onClick={() => poserVues((v) => v === "attente" ? "tranchées" : "attente")}
              enfants={vues === "attente" ? "Voir les décisions prises" : "Revenir à la file"} />
            <Bouton ton="principal" icone="tampon"
              onClick={() => ui.message(`${enAttente.length} demandes en attente — la plus ancienne depuis 6 h.`, "info")}
              enfants={`${enAttente.length} en attente`} />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En attente" valeur={fmt(enAttente.length)} ton={enAttente.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Risque élevé" valeur={fmt(eleves)} ton={eleves ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Demandées par l'IA" valeur={fmt(dIA)} ton="accent" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Qui ne se défont pas" valeur={fmt(irreversibles)} ton={irreversibles ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Délai médian de décision" valeur="2 h 10" />} />
      </div>

      {irreversibles > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-vigilance-voile border border-vigilance/40 anim-apparait">
          <Icone nom="halte" className="text-vigilance mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,260px)] text-[13px]">
            <b>{irreversibles} demande{irreversibles > 1 ? "s" : ""} dans la file ne se défai{irreversibles > 1 ? "ront" : "ra"} pas.</b>{" "}
            <span className="text-encre-2">
              Un envoi parti ne se rappelle pas, une file vidée ne se remplit pas. Pour celles-là, le registre
              exige de retaper un mot avant l'exécution — c'est le seul garde-fou qui résiste à la fatigue.
            </span>
          </div>
        </div>
      )}

      {/* Sous 1280 px la file passe au-dessus du détail : le détail reste la
          page, il ne se masque pas comme un panneau d'appoint. */}
      <div className="grid gap-4 items-start xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* --- La file ------------------------------------------------- */}
        <Carte enfants={
          <>
            <div className="flex items-center gap-2 flex-wrap pas-carte border-b border-bordure sans-impression">
              <div className="flex items-center gap-2 h-8 px-[10px] flex-1 min-w-[150px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                <Icone nom="recherche" taille="s" />
                <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                  placeholder="Objet, demandeur…" aria-label="Rechercher une demande"
                  className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
              </div>
              <select value={nature} onChange={(e) => poserNature(e.target.value)} aria-label="Filtrer par nature"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Toutes natures</option>
                {Object.keys(ICONE_NATURE).map((n) => <option key={n}>{n}</option>)}
              </select>
              <Bouton taille="s" actif={parIA} icone="robot" title="Demandes déposées par un agent IA"
                onClick={() => poserParIA((v) => !v)} enfants="IA" />
            </div>

            <ListeEchelonnee className="divide-y divide-bordure max-h-[420px] xl:max-h-[620px] overflow-y-auto">
              {filtres.map((a) => (
                <button key={a.id} type="button" onClick={() => { poserOuverte(a.id); poserMotif(""); }}
                  className={cx("flex items-start gap-[10px] pas-carte w-full text-left transi",
                    courante?.id === a.id ? "bg-accent-voile" : "hover:bg-surface-2")}>
                  <span className={cx("w-[26px] h-[26px] rounded-[4px] grid place-items-center shrink-0 mt-[2px]",
                    a.risque === "élevé" ? "bg-critique-voile text-critique"
                      : a.parIA ? "bg-accent-voile text-accent" : "bg-surface-3 text-encre-3")}>
                    <Icone nom={ICONE_NATURE[a.nature]} taille="s" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium leading-[18px] line-clamp-2">{a.objet}</span>
                    <span className="flex items-center gap-[5px] flex-wrap mt-[5px]">
                      <Jeton ton={TON_RISQUE[a.risque]} enfants={a.risque} />
                      {a.parIA && <Jeton ton="accent" point={false} enfants="IA" />}
                      {a.etat !== "en attente" && <Jeton ton={a.etat === "approuvée" ? "bon" : "critique"} enfants={a.etat} />}
                    </span>
                    <span className="block text-[11px] text-encre-4 mt-[5px]">
                      <span className="font-mono">{a.id}</span> · {a.demandeur} · {a.quand}
                      {a.etat === "en attente" && ` · échéance ${a.echeance}`}
                    </span>
                    {a.requis > 1 && a.etat === "en attente" && (
                      <span className="flex items-center gap-2 mt-[6px]">
                        <Progression valeur={(a.obtenus / a.requis) * 100} ton={a.obtenus ? "bon" : "accent"} />
                        <span className="text-[11px] tab-num text-encre-3 shrink-0">{a.obtenus}/{a.requis}</span>
                      </span>
                    )}
                  </span>
                </button>
              ))}
              {filtres.length === 0 && (
                <p className="px-4 py-12 text-center text-[13px] text-encre-3">
                  {vues === "attente" ? "La file est vide. Rien n'attend." : "Aucune décision ne correspond."}
                </p>
              )}
            </ListeEchelonnee>
          </>
        } />

        {/* --- La demande ouverte -------------------------------------- */}
        <div className="grid gap-4">
          {courante ? (
            <>
              <Carte className={courante.risque === "élevé" ? "border-critique/30" : undefined} enfants={
                <>
                  <div className="flex items-start gap-3 flex-wrap pas-carte border-b border-bordure">
                    <div className="min-w-[min(100%,240px)] flex-1">
                      <h2 className="text-[14.5px] font-semibold leading-[20px]">{courante.objet}</h2>
                      <p className="text-[12px] text-encre-3 mt-[3px]">
                        <span className="font-mono">{courante.id}</span> · demandé par {courante.demandeur}
                        {courante.parIA && " (agent IA)"} · {courante.quand}
                      </p>
                    </div>
                    <div className="flex items-center gap-[5px] flex-wrap">
                      <Jeton ton={TON_RISQUE[courante.risque]} enfants={`risque ${courante.risque}`} />
                      <Jeton ton="neutre" point={false} enfants={courante.nature} />
                      {courante.etat !== "en attente" && (
                        <Jeton ton={courante.etat === "approuvée" ? "bon" : "critique"} enfants={courante.etat} />
                      )}
                    </div>
                  </div>

                  <div className="pas-carte grid gap-4">
                    <section>
                      <h3 className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-[6px]">
                        Pourquoi c'est demandé
                      </h3>
                      <p className="text-[13px] leading-[19px] text-encre-2">{courante.justification}</p>
                    </section>

                    <section>
                      <h3 className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-[6px]">
                        Ce qui change si vous approuvez
                      </h3>
                      <div className={cx("p-3 rounded-[4px] border text-[13px] leading-[19px]",
                        courante.reversible === "non"
                          ? "bg-critique-voile border-critique/40" : "bg-surface-2 border-bordure")}>
                        <p className="text-encre-2">{courante.consequence}</p>
                        <p className="mt-2 flex items-center gap-[6px] text-[12px]">
                          <Icone nom={courante.reversible === "non" ? "halte" : "rafraichir"} taille="s"
                            className={courante.reversible === "non" ? "text-critique" : "text-bon"} />
                          {courante.reversible === "oui" ? <span className="text-bon">Se défait d'un clic.</span>
                            : courante.reversible === "fenêtre" ? <span className="text-vigilance">Se défait dans une fenêtre, pas après.</span>
                              : <span className="text-critique font-semibold">Ne se défait pas.</span>}
                        </p>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-[6px]">
                        Les pièces lues avant de décider
                      </h3>
                      <div className="rounded-[4px] border border-bordure divide-y divide-bordure">
                        {courante.pieces.map((p) => (
                          <div key={p.nom} className="flex items-start gap-3 px-3 py-[8px]">
                            <span className="text-[12.5px] font-medium shrink-0 min-w-[130px]">{p.nom}</span>
                            <span className="text-[12px] text-encre-3 min-w-0">{p.detail}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-[6px]">
                        Le contrôle à traverser
                      </h3>
                      {(() => {
                        const g = gestes.find((x) => x.id === courante.geste);
                        if (!g) return <p className="text-[12.5px] text-encre-3">Geste non recensé.</p>;
                        return (
                          <div className="flex items-start gap-3 flex-wrap p-3 rounded-[4px] bg-surface-2 border border-bordure">
                            <Jeton ton={NIVEAUX[g.niveau].ton} enfants={NIVEAUX[g.niveau].nom} />
                            <p className="flex-1 min-w-[min(100%,220px)] text-[12.5px] text-encre-2">
                              {NIVEAUX[g.niveau].traverse}
                              {g.delai && g.delai !== "aucun" && ` Le geste ne part pas avant ${g.delai} après l'accord.`}
                            </p>
                            <span className="font-mono text-[11px] text-encre-4">{g.id}</span>
                          </div>
                        );
                      })()}
                    </section>

                    {courante.avis.length > 0 && (
                      <section>
                        <h3 className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-[6px]">
                          Avis déjà donnés
                        </h3>
                        <div className="grid gap-2">
                          {courante.avis.map((v, i) => (
                            <div key={i} className="flex items-start gap-[9px] p-3 rounded-[4px] bg-surface-2 border border-bordure">
                              <Icone nom={v.sens === "pour" ? "check" : "croix"} taille="s"
                                className={cx("mt-[2px] shrink-0", v.sens === "pour" ? "text-bon" : "text-critique")} />
                              <div className="min-w-0">
                                <p className="text-[12.5px]"><b>{v.qui}</b> · {v.sens === "pour" ? "pour" : "contre"} · <span className="text-encre-4">{v.quand}</span></p>
                                <p className="text-[12.5px] text-encre-2 mt-[2px]">{v.motif}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {courante.etat === "en attente" && (
                      <section className="pt-1 border-t border-bordure">
                        <label htmlFor="motif" className="block text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-[6px] mt-3">
                          Votre motif {courante.requis > 1 && `(${courante.obtenus} accord${courante.obtenus > 1 ? "s" : ""} sur ${courante.requis})`}
                        </label>
                        {dejaDonne ? (
                          <p className="flex items-start gap-[7px] text-[12.5px] text-encre-3 p-3 rounded-[4px] bg-surface-2 border border-bordure">
                            <Icone nom="verrou" taille="s" className="mt-[2px] shrink-0" />
                            Vous avez déjà donné votre avis sur cette demande. Un agent n'en donne qu'un, quel qu'en
                            soit le sens — c'est le garde-fou GF-13, et il vaut aussi pour vous.
                          </p>
                        ) : (
                          <>
                            <textarea id="motif" value={motif} onChange={(e) => poserMotif(e.target.value)}
                              rows={2} placeholder="Ce que vous avez vérifié, et ce qui fait pencher votre avis…"
                              className="w-full px-3 py-2 rounded-[4px] bg-surface-2 border border-bordure text-[13px] text-encre
                                         placeholder:text-encre-4 outline-none focus:border-accent transi resize-y" />
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              <Bouton ton="principal" icone="check" disabled={!motif.trim()}
                                onClick={() => trancher(courante, "pour")}
                                enfants={courante.obtenus + 1 >= courante.requis ? "Approuver et exécuter" : "Donner mon accord"} />
                              <Bouton ton="danger" icone="croix" disabled={!motif.trim()}
                                onClick={() => trancher(courante, "contre")} enfants="Refuser" />
                              <p className="text-[11.5px] text-encre-4 ml-auto">
                                {motif.trim() ? "Votre motif sera inscrit au journal, sous votre nom."
                                  : "Écrivez un motif : les deux boutons restent inertes sans lui."}
                              </p>
                            </div>
                          </>
                        )}
                      </section>
                    )}
                  </div>
                </>
              } />

              <AssistantIA
                titre="Lecture de la file"
                invite="Ce qui mérite d'être regardé en premier dans les demandes en attente, et pourquoi."
                constat={constat}
                modele="Modèle de raisonnement · 8 k jetons lus"
                cout={0.019}
                surAction={() => ui.message("Demande déposée dans la file — liste blanche sur 6 adresses. A-4809 reste en attente.", "bon")}
              />
            </>
          ) : (
            <Carte enfants={
              <div className="px-6 py-16 text-center">
                <Icone nom="tampon" className="text-encre-4 mx-auto mb-3" taille="l" />
                <p className="text-[13.5px] font-semibold">La file est vide</p>
                <p className="text-[12.5px] text-encre-3 mt-1">Rien n'attend de main humaine en ce moment.</p>
              </div>
            } />
          )}
        </div>
      </div>

      <Carte className="mt-4" enfants={
        <>
          <TeteCarte titre="Ce que cette file garantit" sous="Les quatre règles que l'écran tient sans qu'on les lui demande" />
          <div className="pas-carte pt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
            {[
              ["Un avis sans motif n'est pas un avis", "Les boutons restent inertes tant que rien n'est écrit. Le motif part au journal sous le nom de son auteur."],
              ["Jamais deux fois le même avis", "Un agent ne donne qu'un avis par demande. Le demandeur ne peut jamais être l'un de ses approbateurs."],
              ["L'expiration ne vaut pas accord", "Une demande non tranchée dans son délai expire et ne s'exécute pas. Le silence ne décide de rien."],
              ["L'IA propose, un humain décide", "Une demande déposée par un modèle porte son nom, mais c'est celui de l'approbateur qui est inscrit au journal."],
            ].map(([titre, texte]) => (
              <div key={titre} className="p-3 rounded-[4px] border border-bordure bg-surface-2">
                <div className="flex items-start gap-[7px]">
                  <Icone nom="verrou" taille="s" className="text-accent mt-[2px] shrink-0" />
                  <div className="text-[12.5px] font-semibold leading-[17px]">{titre}</div>
                </div>
                <p className="text-[12px] text-encre-3 mt-[6px] leading-[17px]">{texte}</p>
              </div>
            ))}
          </div>
        </>
      } />
    </>
  );
}
