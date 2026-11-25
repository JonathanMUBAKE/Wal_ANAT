import { useMemo, useState } from "react";
import { BarreMini, Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, Progression, TeteCarte } from "../composants/Primitives";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { Icone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, fmt, normaliser } from "../lib/format";
import { accords as accordsInitiaux, partenaires, type Accord, type EtatAccord } from "../lib/institution";

const TON: Record<EtatAccord, "neutre" | "accent" | "bon" | "vigilance" | "critique"> = {
  "en négociation": "neutre", "en signature": "accent", "en vigueur": "bon",
  "échu": "vigilance", "dénoncé": "critique",
};

/* Accords et partenaires : une convention vit — elle se négocie, se signe,
   entre en vigueur, s'éteint. Deux choses comptent dans un tableau de bord :
   l'échéance qu'on va rater, et l'engagement qu'on a pris sans le suivre.
   La reconduction tacite est le piège classique : elle se renouvelle toute
   seule si personne ne dénonce dans le préavis. */
export function Accords() {
  const ui = useUI();
  const [accords, poserAccords] = useState<Accord[]>(accordsInitiaux);
  const [onglet, poserOnglet] = useState("accords");
  const [q, poserQ] = useState("");
  const [etat, poserEtat] = useState("");

  const enVigueur = accords.filter((a) => a.etat === "en vigueur");
  const echeancesProches = enVigueur.filter((a) => a.joursAvantEcheance <= 60 && a.joursAvantEcheance > 0);
  const depassees = accords.filter((a) => a.joursAvantEcheance < 0 && a.etat === "en vigueur");
  const engagementsNonTenus = accords.flatMap((a) =>
    a.engagements.filter((e) => !e.tenu).map((e) => ({ accord: a, engagement: e })));
  const montantTotal = enVigueur.reduce((a, x) => a + x.montant, 0);
  const verseTotal = enVigueur.reduce((a, x) => a + x.verse, 0);

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return accords.filter((a) =>
      (!n || normaliser(`${a.intitule} ${a.partenaire} ${a.code} ${a.referent}`).includes(n)) &&
      (!etat || a.etat === etat));
  }, [accords, q, etat]);

  async function denoncer(a: Accord) {
    const ok = await ui.confirmer({
      titre: `Dénoncer « ${a.intitule} » ?`,
      texte: `La dénonciation doit être notifiée au partenaire ${a.preavis ? `au moins ${a.preavis} jours avant l'échéance — soit avant le ${a.echeance}` : "par courrier recommandé"}. Passé ce délai, la convention se reconduit pour une période entière. La dénonciation est définitive.`,
      bouton: "Préparer la dénonciation", ton: "danger", mot: a.code,
    });
    if (!ok) return;
    poserAccords((l) => l.map((x) => x.code === a.code ? { ...x, etat: "dénoncé" } : x));
    ui.message(`Dénonciation de ${a.code} préparée. Elle part au signataire.`, "bon");
  }

  function detail(a: Accord) {
    ui.ouvrirTiroir({
      titre: a.intitule,
      sous: <><span className="font-mono">{a.code}</span> · {a.partenaire}</>,
      onglets: [
        { nom: "Fiche", contenu: (
          <>
            <Definitions lignes={[
              ["Partenaire", a.partenaire], ["Type", a.type],
              ["État", <Jeton ton={TON[a.etat]} enfants={a.etat} />],
              ["Signé le", a.signeLe], ["Entrée en vigueur", a.entreeEnVigueur],
              ["Échéance", <span className={a.joursAvantEcheance < 0 ? "text-critique font-semibold" : a.joursAvantEcheance <= 60 ? "text-vigilance font-semibold" : ""}>
                {a.echeance}
                {a.joursAvantEcheance !== 999 && (a.joursAvantEcheance < 0
                  ? ` — dépassée de ${-a.joursAvantEcheance} j`
                  : ` — dans ${a.joursAvantEcheance} j`)}
              </span>],
              ["Reconduction", a.reconductionTacite
                ? <span className="text-vigilance">tacite — préavis de {a.preavis} jours</span>
                : "expresse"],
              ["Référent", a.referent],
              ["Dossier rattaché", a.dossier === "—" ? "aucun" : <span className="font-mono">{a.dossier}</span>],
            ]} />
            {a.montant > 0 && (
              <div className="mt-4">
                <div className="flex items-baseline gap-2 mb-[5px] text-[12px]">
                  <span className="text-encre-3">Versé</span>
                  <span className="ml-auto tab-num text-[13px]">{fmt(a.verse)} / {fmt(a.montant)} €</span>
                </div>
                <Progression valeur={(a.verse / a.montant) * 100} ton="accent" />
              </div>
            )}
            {a.reconductionTacite && a.joursAvantEcheance <= a.preavis && a.joursAvantEcheance > 0 && (
              <div className="mt-4 p-3 rounded-[4px] bg-critique-voile text-[12.5px] text-encre-2">
                <b className="text-critique">Le préavis est dépassé. </b>
                Il fallait dénoncer {a.preavis} jours avant l'échéance. La convention se reconduira pour
                une période entière, sauf accord du partenaire pour y mettre fin autrement.
              </div>
            )}
          </>
        )},
        { nom: "Engagements", contenu: a.engagements.length === 0
          ? <p className="text-[13px] text-encre-3">Aucun engagement daté dans cette convention.</p>
          : (
            <ListeEchelonnee>
              {a.engagements.map((e, i) => (
                <div key={i} className="flex items-start gap-3 py-[10px] border-b border-bordure last:border-0">
                  <span className={cx("w-[18px] h-[18px] rounded-[4px] border grid place-items-center shrink-0 mt-[2px]",
                    e.tenu ? "bg-bon border-bon text-white" : "border-bordure-2")}>
                    {e.tenu && <Icone nom="check" taille="s" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px]">{e.intitule}</span>
                    <span className="block text-[11px] text-encre-3 mt-[2px]">Pour le {e.echeance}</span>
                  </span>
                  {!e.tenu && <Jeton ton="vigilance" enfants="non tenu" />}
                </div>
              ))}
            </ListeEchelonnee>
          )},
      ],
      pied: a.etat === "en vigueur" ? (
        <>
          <Bouton icone="rapport" onClick={() => ui.message("Projet d'avenant ouvert.", "info")} enfants="Préparer un avenant" />
          <Bouton ton="danger" className="ml-auto" icone="croix" onClick={() => { ui.fermerTiroir(); denoncer(a); }} enfants="Dénoncer" />
        </>
      ) : undefined,
    });
  }

  const colonnes: Colonne<Accord>[] = [
    { cle: "code", nom: "Référence", triable: true, fixe: true, rendu: (a) => (
      <span className="flex items-center gap-[9px] min-w-0">
        <Pastille ton={a.joursAvantEcheance < 0 && a.etat === "en vigueur" ? "critique"
          : a.joursAvantEcheance <= 60 && a.etat === "en vigueur" ? "vigilance"
          : a.etat === "en signature" ? "bon" : (TON[a.etat] as "bon" | "vigilance" | "critique" | "neutre")} />
        <span className="flex flex-col min-w-0">
          <span className="font-mono text-[12px] font-semibold">{a.code}</span>
          <span className="text-[11px] text-encre-3 truncate">{a.type}</span>
        </span>
      </span>
    )},
    { cle: "intitule", nom: "Intitulé", triable: true, rendu: (a) => (
      <span className="flex flex-col min-w-0">
        <span className="font-medium truncate">{a.intitule}</span>
        <span className="text-[11px] text-encre-3 truncate">{a.partenaire}</span>
      </span>
    )},
    { cle: "etat", nom: "État", triable: true, rendu: (a) => <Jeton ton={TON[a.etat]} enfants={a.etat} /> },
    { cle: "echeance", nom: "Échéance", num: true, triable: true, valeur: (a) => a.joursAvantEcheance, rendu: (a) =>
      a.joursAvantEcheance === 999 ? <span className="text-encre-4">—</span>
        : <span className={cx("tab-num", a.joursAvantEcheance < 0 ? "text-critique font-semibold" : a.joursAvantEcheance <= 60 ? "text-vigilance" : "")}>
            {a.joursAvantEcheance < 0 ? `dépassée de ${-a.joursAvantEcheance} j` : `dans ${a.joursAvantEcheance} j`}
          </span> },
    { cle: "reconductionTacite", nom: "Reconduction", triable: true, rendu: (a) =>
      a.reconductionTacite ? <Jeton ton="vigilance" point={false} enfants={`tacite · ${a.preavis} j`} /> : <span className="text-encre-3">expresse</span> },
    { cle: "montant", nom: "Montant", num: true, triable: true, rendu: (a) =>
      a.montant ? (
        <span className="inline-flex items-center gap-2 justify-end">
          <BarreMini valeur={(a.verse / a.montant) * 100} largeur={44} />
          <span className="tab-num">{fmt(a.montant, "compact")} €</span>
        </span>
      ) : <span className="text-encre-4">—</span> },
    { cle: "referent", nom: "Référent", triable: true, rendu: (a) => a.referent },
  ];

  return (
    <>
      <Entete
        titre="Accords et partenaires"
        sous="Les conventions qui engagent l'Agence : leurs échéances, leurs engagements, et ce qui se reconduit tout seul."
        actions={
          <>
            {echeancesProches.length > 0 && <Jeton ton="vigilance" enfants={`${echeancesProches.length} échéances sous 60 jours`} />}
            <Bouton icone="telecharger" onClick={() => { exporterCSV("accords", filtres.map(({ engagements, ...r }) => ({ ...r, engagements: engagements.length }))); ui.message("Portefeuille d'accords exporté.", "bon"); }} enfants="Exporter" />
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Création d'accord à brancher.", "info")} enfants="Nouvel accord" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En vigueur" valeur={<NombreAnime valeur={enVigueur.length} />} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Échéances sous 60 j" valeur={<NombreAnime valeur={echeancesProches.length} />} ton={echeancesProches.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Échéances dépassées" valeur={<NombreAnime valeur={depassees.length} />} ton={depassees.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Engagements non tenus" valeur={<NombreAnime valeur={engagementsNonTenus.length} />} ton={engagementsNonTenus.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={
          <>
            <LigneStat etiquette="Financements" valeur={`${fmt(verseTotal, "compact")} / ${fmt(montantTotal, "compact")} €`} />
            <Progression valeur={(verseTotal / (montantTotal || 1)) * 100} ton="accent" />
          </>
        } />
      </div>

      {(() => {
        const piege = enVigueur.find((a) => a.reconductionTacite && a.joursAvantEcheance <= a.preavis && a.joursAvantEcheance > 0);
        return piege ? (
          <Apparition className="mb-4">
            <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] bg-critique-voile border border-critique/40">
              <Icone nom="horloge" className="text-critique mt-[2px]" />
              <div className="flex-1 min-w-[min(100%,220px)] text-[13px]">
                <b>« {piege.intitule} » va se reconduire toute seule.</b>{" "}
                <span className="text-encre-2">
                  L'échéance tombe dans {piege.joursAvantEcheance} jours et le préavis de dénonciation est
                  de {piege.preavis} jours : il est déjà dépassé. Sauf accord du partenaire, la convention
                  repart pour une période entière. C'est le piège classique de la reconduction tacite —
                  elle ne prévient personne.
                </span>
              </div>
              <Bouton taille="s" onClick={() => detail(piege)} enfants="Ouvrir" />
            </div>
          </Apparition>
        ) : null;
      })()}

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "accords", nom: "Accords", compte: accords.length },
              { cle: "echeances", nom: "Échéances", compte: echeancesProches.length + depassees.length },
              { cle: "engagements", nom: "Engagements", compte: engagementsNonTenus.length },
              { cle: "partenaires", nom: "Partenaires", compte: partenaires.length },
            ]}
          />

          {onglet === "accords" && (
            <TableauDonnees
              lignes={filtres} colonnes={colonnes} cle={(a) => a.code}
              totalBrut={accords.length} nomEntite={["accord", "accords"]}
              triInitial={{ cle: "echeance", sens: "asc" }}
              surLigne={detail}
              vide={{ titre: "Aucun accord", texte: "Aucun accord ne correspond à cette recherche." }}
              barreOutils={
                <>
                  <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                    <Icone nom="recherche" taille="s" />
                    <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                      placeholder="Intitulé, partenaire, référent…" aria-label="Rechercher un accord"
                      className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
                  </div>
                  <select value={etat} onChange={(e) => poserEtat(e.target.value)} aria-label="Filtrer par état"
                    className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                    <option value="">Tous les états</option>
                    {["en négociation", "en signature", "en vigueur", "échu", "dénoncé"].map((e) => <option key={e}>{e}</option>)}
                  </select>
                </>
              }
              actionsLigne={(a) => <Bouton ton="fantome" taille="s" icone="oeil" title="Ouvrir" onClick={() => detail(a)} />}
            />
          )}

          {onglet === "echeances" && (
            <div className="pas-carte">
              <p className="text-[12px] text-encre-3 mb-3">
                Classées par urgence. Une échéance dépassée sur une convention en vigueur veut dire
                qu'on travaille sans cadre — ou qu'on a oublié de dire qu'elle était reconduite.
              </p>
              <ListeEchelonnee className="space-y-2">
                {[...depassees, ...echeancesProches].map((a) => (
                  <button key={a.code} type="button" onClick={() => detail(a)}
                    className={cx("w-full text-left flex items-start gap-3 p-3 rounded-[4px] border transi souleve",
                      a.joursAvantEcheance < 0 ? "border-critique/40 bg-critique-voile" : "border-vigilance/40 bg-vigilance-voile")}>
                    <Icone nom="horloge" className={a.joursAvantEcheance < 0 ? "text-critique" : "text-vigilance"} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold">{a.intitule}</span>
                      <span className="block text-[11.5px] text-encre-3 mt-[2px]">
                        {a.partenaire} · <span className="font-mono">{a.code}</span> · référent {a.referent}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={cx("block text-[13px] font-semibold tab-num", a.joursAvantEcheance < 0 ? "text-critique" : "text-vigilance")}>
                        {a.joursAvantEcheance < 0 ? `+${-a.joursAvantEcheance} j` : `${a.joursAvantEcheance} j`}
                      </span>
                      <span className="block text-[11px] text-encre-3">{a.echeance}</span>
                    </span>
                  </button>
                ))}
              </ListeEchelonnee>
            </div>
          )}

          {onglet === "engagements" && (
            <div className="pas-carte">
              <p className="text-[12px] text-encre-3 mb-3">
                Ce que l'Agence a promis dans ses conventions, et qui n'est pas encore fait. Un engagement
                non tenu se discute mieux avant l'échéance qu'au comité de suivi.
              </p>
              <ListeEchelonnee className="space-y-2">
                {engagementsNonTenus.map(({ accord, engagement }, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-[4px] border border-bordure bg-surface-2">
                    <span className="w-[18px] h-[18px] rounded-[4px] border border-bordure-2 shrink-0 mt-[2px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px]">{engagement.intitule}</span>
                      <span className="block text-[11.5px] text-encre-3 mt-[2px]">
                        {accord.intitule} · {accord.partenaire} · référent {accord.referent}
                      </span>
                    </span>
                    <span className="text-[12px] tab-num text-encre-2 shrink-0">pour le {engagement.echeance}</span>
                  </div>
                ))}
                {engagementsNonTenus.length === 0 && (
                  <p className="text-[13px] text-encre-3 py-8 text-center">Tous les engagements datés sont tenus.</p>
                )}
              </ListeEchelonnee>
            </div>
          )}

          {onglet === "partenaires" && (
            <div className="pas-carte">
              <ListeEchelonnee className="grid gap-3" >
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {partenaires.map((p) => (
                    <div key={p.code} className="p-4 rounded-[4px] border border-bordure bg-surface-2 souleve transi">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="w-[30px] h-[30px] rounded-[4px] grid place-items-center shrink-0 bg-surface-3 text-encre-3">
                          <Icone nom="utilisateurs" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold truncate">{p.nom}</div>
                          <div className="text-[11px] text-encre-3">{p.type} · {p.pays}</div>
                        </div>
                      </div>
                      <LigneStat etiquette="Accords" valeur={`${p.accordsActifs} actifs sur ${p.accords}`} />
                      <LigneStat etiquette="Référent" valeur={p.referent} />
                      <LigneStat etiquette="Partenaire depuis" valeur={p.depuis} />
                      <LigneStat etiquette="Dernier contact" valeur={p.dernierContact}
                        ton={p.dernierContact.includes("28") ? "vigilance" : undefined} />
                    </div>
                  ))}
                </div>
              </ListeEchelonnee>
            </div>
          )}
        </>
      } />

      <Apparition delai={120}>
        <Carte className="mt-4" enfants={
          <>
            <TeteCarte titre="La reconduction tacite" sous="Le seul mécanisme de cette page qui agit sans qu'on fasse rien" />
            <div className="pas-carte pt-3 text-[13px] text-encre-2 leading-[20px]">
              <p>
                Une convention à reconduction tacite se renouvelle d'elle-même si personne ne la dénonce
                dans le préavis. L'inaction produit un effet juridique — c'est l'inverse de tout le reste
                de l'outil, où rien n'arrive tant que quelqu'un n'a pas agi.
              </p>
              <p className="mt-3">
                D'où l'alerte, calculée non pas sur l'échéance mais sur <b>l'échéance moins le préavis</b>.
                Prévenir le jour de l'échéance ne sert à rien : il est déjà trop tard depuis trois mois.
              </p>
            </div>
          </>
        } />
      </Apparition>
    </>
  );
}
