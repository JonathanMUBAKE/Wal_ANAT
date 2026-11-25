import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Pastille } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, fmt, normaliser } from "../lib/format";
import { jetonsInitiaux, type JetonAPI } from "../lib/sigrh";

/* Jetons d'API : les clés qui ouvrent le SIGRH à d'autres logiciels. Deux
   choses doivent sauter aux yeux — un jeton qui expire bientôt, et un jeton
   que plus personne n'utilise. Les deux sont des problèmes, dans les deux
   sens opposés. */
export function Jetons() {
  const ui = useUI();
  const [jetons, poserJetons] = useState<JetonAPI[]>(jetonsInitiaux);
  const [q, poserQ] = useState("");
  const [montrerInactifs, poserMontrerInactifs] = useState(true);

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return jetons.filter((j) =>
      (!n || normaliser(`${j.nom} ${j.prefixe} ${j.creePar} ${j.portee.join(" ")}`).includes(n)) &&
      (montrerInactifs || j.actif));
  }, [jetons, q, montrerInactifs]);

  const actifs = jetons.filter((j) => j.actif).length;
  const expirants = jetons.filter((j) => j.expireBientot && j.actif);
  const dormants = jetons.filter((j) => j.actif && j.appels30j === 0);

  async function revoquer(j: JetonAPI) {
    const ok = await ui.confirmer({
      titre: `Révoquer « ${j.nom} » ?`,
      texte: `Toute application qui présente ce jeton sera refusée dès la prochaine requête. ${j.appels30j > 0 ? `Il a servi ${fmt(j.appels30j)} fois ces trente derniers jours — vérifiez ce qui en dépend avant de le couper.` : "Il n'a servi à rien ces trente derniers jours."} La révocation est définitive.`,
      bouton: "Révoquer définitivement", ton: "danger", mot: j.prefixe,
    });
    if (!ok) return;
    poserJetons((l) => l.map((x) => x.id === j.id ? { ...x, actif: false, derniereUtilisation: "révoqué" } : x));
    ui.message(`« ${j.nom} » révoqué.`, "bon");
  }

  async function renouveler(j: JetonAPI) {
    const ok = await ui.confirmer({
      titre: `Renouveler « ${j.nom} » ?`,
      texte: "Un nouveau jeton sera créé avec la même portée. L'ancien reste valable vingt-quatre heures, le temps de mettre à jour l'application qui s'en sert, puis il est coupé.",
      bouton: "Renouveler", ton: "vigilance",
    });
    if (!ok) return;
    poserJetons((l) => l.map((x) => x.id === j.id ? { ...x, expireBientot: false, expire: "dans 1 an" } : x));
    ui.message(`« ${j.nom} » renouvelé. L'ancien expire dans 24 heures.`, "bon");
  }

  function detail(j: JetonAPI) {
    ui.ouvrirTiroir({
      titre: j.nom,
      sous: <span className="font-mono">{j.prefixe}•••••••</span>,
      onglets: [
        { nom: "Fiche", contenu: (
          <>
            <Definitions lignes={[
              ["Préfixe", <span className="font-mono">{j.prefixe}•••••••</span>],
              ["État", <Jeton ton={j.actif ? "bon" : "neutre"} enfants={j.actif ? "actif" : "révoqué"} />],
              ["Créé par", j.creePar],
              ["Créé le", j.creeLe],
              ["Expire", j.expireBientot
                ? <span className="text-vigilance font-semibold">{j.expire} — bientôt</span>
                : j.expire],
              ["Dernière utilisation", j.derniereUtilisation],
              ["Appels (30 jours)", fmt(j.appels30j)],
            ]} />
            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3 mb-2">Portée</div>
              <div className="flex flex-wrap gap-[6px]">
                {j.portee.map((p) => (
                  <span key={p} className="font-mono text-[11px] px-[7px] py-[3px] rounded-[4px] bg-surface-3 text-encre-2">{p}</span>
                ))}
              </div>
              <p className="text-[12px] text-encre-3 mt-3">
                Un jeton ne peut rien faire au-delà de cette liste, quelles que soient les requêtes envoyées.
                C'est le serveur qui tranche, pas l'application appelante.
              </p>
            </div>
          </>
        )},
      ],
      pied: j.actif ? (
        <>
          <Bouton icone="rafraichir" onClick={() => { ui.fermerTiroir(); renouveler(j); }} enfants="Renouveler" />
          <Bouton ton="danger" className="ml-auto" icone="corbeille" onClick={() => { ui.fermerTiroir(); revoquer(j); }} enfants="Révoquer" />
        </>
      ) : <p className="text-[12px] text-encre-3">Ce jeton est révoqué ; il ne peut plus servir.</p>,
    });
  }

  return (
    <>
      <Entete
        titre="Jetons d'API"
        sous="Les clés qui ouvrent le SIGRH à d'autres logiciels : paie, pointeuses, portail mobile, supervision."
        actions={
          <>
            <Bouton icone="telecharger" onClick={() => { exporterCSV("jetons", filtres.map(({ portee, ...r }) => ({ ...r, portee: portee.join(" ") }))); ui.message("Inventaire des jetons exporté.", "bon"); }} enfants="Exporter" />
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Le jeton ne s'affiche qu'une fois, à sa création — assistant à brancher.", "info")} enfants="Créer un jeton" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Jetons actifs" valeur={String(actifs)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Expirent bientôt" valeur={String(expirants.length)} ton={expirants.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Jamais utilisés (30 j)" valeur={String(dormants.length)} ton={dormants.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Appels (30 j)" valeur={fmt(jetons.reduce((a, j) => a + j.appels30j, 0), "compact")} />} />
      </div>

      {expirants.length > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-vigilance-voile border border-vigilance/40 anim-apparait">
          <Icone nom="cle" className="text-vigilance mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,220px)] text-[13px]">
            <b>« {expirants[0].nom} » expire le {expirants[0].expire}.</b>{" "}
            <span className="text-encre-2">
              Ce jeton porte {fmt(expirants[0].appels30j)} appels par mois : s'il expire sans être renouvelé,
              l'interface concernée s'arrête d'un coup, sans message.
            </span>
          </div>
          <Bouton taille="s" onClick={() => renouveler(expirants[0])} enfants="Renouveler" />
        </div>
      )}

      <Carte enfants={
        <>
          <div className="flex items-center gap-2 flex-wrap pas-carte border-b border-bordure sans-impression">
            <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
              <Icone nom="recherche" taille="s" />
              <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                placeholder="Nom, préfixe, portée, auteur…" aria-label="Rechercher un jeton"
                className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
            </div>
            <Bouton actif={montrerInactifs} icone="oeil"
              onClick={() => poserMontrerInactifs((v) => !v)} enfants="Afficher les révoqués" />
          </div>

          <div className="divide-y divide-bordure">
            {filtres.map((j, i) => (
              <div key={j.id} className={cx("flex items-start gap-3 pas-carte hover:bg-surface-2 transi anim-entre", !j.actif && "opacity-55")}
                   style={{ animationDelay: i * 25 + "ms" }}>
                <span className="mt-[5px]"><Pastille ton={!j.actif ? "neutre" : j.expireBientot ? "vigilance" : j.appels30j === 0 ? "vigilance" : "bon"} pulse={j.actif && j.appels30j > 0} /></span>

                <button type="button" onClick={() => detail(j)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold">{j.nom}</span>
                    <span className="font-mono text-[11px] text-encre-3 px-[6px] py-[1px] rounded-[3px] bg-surface-3">{j.prefixe}•••••••</span>
                    {!j.actif && <Jeton ton="neutre" enfants="révoqué" />}
                    {j.actif && j.expireBientot && <Jeton ton="vigilance" enfants={`expire le ${j.expire}`} />}
                    {j.actif && j.appels30j === 0 && <Jeton ton="vigilance" enfants="inutilisé" />}
                  </div>
                  <div className="flex flex-wrap gap-[5px] mt-[6px]">
                    {j.portee.map((p) => (
                      <span key={p} className="font-mono text-[10.5px] px-[6px] py-[2px] rounded-[3px] bg-surface-3 text-encre-3">{p}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-x-4 gap-y-1 mt-[6px] text-[11px] text-encre-4 flex-wrap">
                    <span className="inline-flex items-center gap-[4px]"><Icone nom="utilisateurs" taille="s" />{j.creePar}, le {j.creeLe}</span>
                    <span className="inline-flex items-center gap-[4px]"><Icone nom="horloge" taille="s" />{j.derniereUtilisation}</span>
                    <span className="inline-flex items-center gap-[4px]"><Icone nom="eclair" taille="s" />{fmt(j.appels30j)} appels sur 30 jours</span>
                  </div>
                </button>

                {j.actif && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Bouton taille="s" icone="rafraichir" title="Renouveler" onClick={() => renouveler(j)} />
                    <Bouton taille="s" ton="danger" icone="corbeille" title="Révoquer" onClick={() => revoquer(j)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      } />
    </>
  );
}
