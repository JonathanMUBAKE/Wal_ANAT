import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Interrupteur, Jeton, LigneStat, Onglets, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, fmt, normaliser } from "../lib/format";
import { executionsRapports, rapports as rapportsInitiaux, type Rapport } from "../lib/sigrh";

/* Rapports : le catalogue de ce que la direction reçoit, et la preuve que les
   envois ont bien eu lieu. Un rapport qui ne part pas est un rapport qui
   n'existe pas — d'où la colonne « dernier envoi » et l'onglet exécutions. */
export function Rapports() {
  const ui = useUI();
  const [rapports, poserRapports] = useState<Rapport[]>(rapportsInitiaux);
  const [onglet, poserOnglet] = useState("catalogue");
  const [q, poserQ] = useState("");
  const [famille, poserFamille] = useState("");

  const familles = useMemo(() => [...new Set(rapportsInitiaux.map((r) => r.famille))].sort(), []);
  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return rapports.filter((r) =>
      (!n || normaliser(`${r.nom} ${r.description} ${r.famille}`).includes(n)) &&
      (!famille || r.famille === famille));
  }, [rapports, q, famille]);

  const actifs = rapports.filter((r) => r.actif).length;
  const programmes = rapports.filter((r) => r.actif && r.frequence !== "À la demande").length;
  const echecs = executionsRapports.filter((x) => x.etat === "échoué").length;

  const basculer = (r: Rapport) => {
    poserRapports((l) => l.map((x) => x.id === r.id ? { ...x, actif: !x.actif } : x));
    ui.message(r.actif ? `« ${r.nom} » désactivé — plus aucun envoi programmé.` : `« ${r.nom} » réactivé.`, "bon");
  };

  const favori = (r: Rapport) =>
    poserRapports((l) => l.map((x) => x.id === r.id ? { ...x, favori: !x.favori } : x));

  async function executer(r: Rapport) {
    const ok = await ui.confirmer({
      titre: `Générer « ${r.nom} » maintenant ?`,
      texte: `Le rapport sera produit sur les données du jour et envoyé à ses ${r.destinataires} destinataires. Durée habituelle : ${r.duree}.`,
      bouton: "Générer et envoyer", ton: "info",
    });
    if (ok) ui.message(`« ${r.nom} » en cours de génération.`, "bon");
  }

  function detail(r: Rapport) {
    ui.ouvrirTiroir({
      titre: r.nom,
      sous: <>{r.famille} · <span className="font-mono">{r.id}</span></>,
      onglets: [
        { nom: "Fiche", contenu: (
          <>
            <p className="text-[13px] text-encre-2 mb-4">{r.description}</p>
            <Definitions lignes={[
              ["Famille", r.famille],
              ["Fréquence", r.frequence],
              ["Destinataires", `${r.destinataires} personnes`],
              ["Format", r.format],
              ["Dernier envoi", r.dernier],
              ["Durée habituelle", r.duree],
              ["État", <Jeton ton={r.actif ? "bon" : "neutre"} enfants={r.actif ? "actif" : "désactivé"} />],
            ]} />
          </>
        )},
        { nom: "Derniers envois", contenu: (
          <div>
            {executionsRapports.filter((x) => x.rapport === r.nom).slice(0, 8).map((x) => (
              <div key={x.id} className="flex items-center gap-2 py-[9px] border-b border-bordure last:border-0">
                <Jeton ton={x.etat === "réussi" ? "bon" : "critique"} enfants={x.etat} />
                <span className="text-[12px] text-encre-2">{x.quand}</span>
                <span className="ml-auto text-[12px] text-encre-3 tab-num">{fmt(x.lignes)} lignes · {x.duree}</span>
              </div>
            ))}
            {executionsRapports.filter((x) => x.rapport === r.nom).length === 0 && (
              <p className="text-[13px] text-encre-3">Aucun envoi sur la période conservée.</p>
            )}
          </div>
        )},
      ],
      pied: (
        <>
          <Bouton icone="rafraichir" onClick={() => { ui.fermerTiroir(); executer(r); }} enfants="Générer maintenant" />
          <Bouton className="ml-auto" icone="telecharger"
            onClick={() => ui.message("Dernier exemplaire téléchargé.", "bon")} enfants="Dernier exemplaire" />
        </>
      ),
    });
  }

  return (
    <>
      <Entete
        titre="Rapports"
        sous="Le catalogue des éditions destinées à la direction, leur programmation et la preuve de leur envoi."
        actions={
          <>
            <Bouton icone="telecharger" onClick={() => { exporterCSV("catalogue-rapports", filtres); ui.message("Catalogue exporté.", "bon"); }} enfants="Exporter le catalogue" />
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Assistant de création de rapport à brancher.", "info")} enfants="Nouveau rapport" />
          </>
        }
      />

      <div className="grid grid-cols-12 gap-4 mb-4">
        <Carte className="col-span-12 md:col-span-4" enfants={
          <div className="pas-carte">
            <LigneStat etiquette="Rapports au catalogue" valeur={fmt(rapports.length)} />
            <LigneStat etiquette="Actifs" valeur={fmt(actifs)} ton="bon" />
            <LigneStat etiquette="Programmés" valeur={fmt(programmes)} />
            <LigneStat etiquette="Envois en échec (30 j)" valeur={fmt(echecs)} ton={echecs ? "critique" : "bon"} />
          </div>
        } />

        <Carte className="col-span-12 md:col-span-8" enfants={
          <>
            <TeteCarte titre="Mis en avant" sous="Les rapports que la direction consulte le plus" />
            <div className="pas-carte pt-2 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
              {rapports.filter((r) => r.favori).map((r) => (
                <button key={r.id} type="button" onClick={() => detail(r)}
                  className="text-left p-3 rounded-[4px] border border-bordure bg-surface-2 hover:border-bordure-2 transi">
                  <div className="flex items-center gap-2 mb-1">
                    <Icone nom="rapport" taille="s" className="text-accent" />
                    <span className="text-[13px] font-semibold truncate">{r.nom}</span>
                  </div>
                  <div className="text-[11px] text-encre-3">{r.frequence} · {r.destinataires} destinataires</div>
                  <div className="text-[11px] text-encre-4 mt-[2px]">Dernier envoi : {r.dernier}</div>
                </button>
              ))}
            </div>
          </>
        } />
      </div>

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "catalogue", nom: "Catalogue", compte: filtres.length },
              { cle: "executions", nom: "Derniers envois", compte: executionsRapports.length },
            ]}
          />

          {onglet === "catalogue" ? (
            <>
              <div className="flex items-center gap-2 flex-wrap pas-carte border-b border-bordure sans-impression">
                <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                  <Icone nom="recherche" taille="s" />
                  <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                    placeholder="Nom ou description du rapport…" aria-label="Rechercher un rapport"
                    className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
                </div>
                <select value={famille} onChange={(e) => poserFamille(e.target.value)} aria-label="Filtrer par famille"
                  className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                  <option value="">Toutes les familles</option>
                  {familles.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>

              <div className="divide-y divide-bordure">
                {filtres.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 pas-carte hover:bg-surface-2 transi">
                    <button type="button" aria-label={r.favori ? "Retirer des favoris" : "Mettre en avant"}
                      onClick={() => favori(r)}
                      className={cx("mt-[2px] shrink-0", r.favori ? "text-accent" : "text-encre-4 hover:text-encre-2")}>
                      <Icone nom={r.favori ? "checkCercle" : "plus"} taille="s" />
                    </button>

                    <button type="button" onClick={() => detail(r)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold">{r.nom}</span>
                        <Jeton ton="neutre" point={false} enfants={r.famille} />
                        <Jeton ton="accent" point={false} enfants={r.format} />
                      </div>
                      <p className="text-[12px] text-encre-3 mt-[2px]">{r.description}</p>
                      <div className="flex items-center gap-3 mt-[6px] text-[11px] text-encre-4 flex-wrap">
                        <span className="inline-flex items-center gap-[4px]"><Icone nom="horloge" taille="s" />{r.frequence}</span>
                        <span className="inline-flex items-center gap-[4px]"><Icone nom="utilisateurs" taille="s" />{r.destinataires} destinataires</span>
                        <span className="inline-flex items-center gap-[4px]"><Icone nom="check" taille="s" />Dernier envoi : {r.dernier}</span>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <Bouton taille="s" icone="rafraichir" title="Générer maintenant" onClick={() => executer(r)} />
                      <Interrupteur actif={r.actif} surChangement={() => basculer(r)} etiquette={`Activer ${r.nom}`} />
                    </div>
                  </div>
                ))}
                {filtres.length === 0 && (
                  <p className="px-4 py-10 text-center text-[13px] text-encre-3">Aucun rapport ne correspond à cette recherche.</p>
                )}
              </div>
            </>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    {["Rapport", "Quand", "Déclencheur", "Lignes", "Durée", "Résultat"].map((t, i) => (
                      <th key={t} className={cx(
                        "sticky top-0 z-3 bg-surface-2 px-3 py-[9px] border-b border-bordure whitespace-nowrap",
                        "text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3",
                        i >= 3 ? "text-right" : "text-left",
                      )}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {executionsRapports.map((x) => (
                    <tr key={x.id} className="hover:bg-surface-2 transi">
                      <td className="px-3 pas-ligne border-b border-bordure font-medium">{x.rapport}</td>
                      <td className="px-3 pas-ligne border-b border-bordure text-encre-2 whitespace-nowrap">{x.quand}</td>
                      <td className="px-3 pas-ligne border-b border-bordure text-encre-2">{x.declencheur}</td>
                      <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{fmt(x.lignes)}</td>
                      <td className="px-3 pas-ligne border-b border-bordure text-right tab-num">{x.duree}</td>
                      <td className="px-3 pas-ligne border-b border-bordure text-right">
                        <span title={x.motif}>
                          <Jeton ton={x.etat === "réussi" ? "bon" : "critique"} enfants={x.etat} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      } />
    </>
  );
}
