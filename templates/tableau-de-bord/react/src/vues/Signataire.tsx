import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, TeteCarte } from "../composants/Primitives";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, normaliser } from "../lib/format";
import { circuits as circuitsInitiaux, delegations, type Circuit, type EtatCircuit } from "../lib/institution";

const TON: Record<EtatCircuit, "neutre" | "accent" | "bon" | "critique"> = {
  "préparé": "neutre", "en circuit": "accent", "signé": "bon", "rejeté": "critique",
};

/* Le signataire — et pas « le parapheur ». Le mot désigne la personne qui
   engage, pas le classeur qui transporte. C'est une correction de vocabulaire
   qui change la lecture de l'écran : on ne consulte pas un meuble, on suit
   ce que quelqu'un va signer en son nom.
   Un document en circuit est figé. Chaque signataire est prévenu à son tour.
   Une signature alimente le dossier d'origine : la convention entre en
   vigueur, le courrier part. */
export function Signataire() {
  const ui = useUI();
  const [circuits, poserCircuits] = useState<Circuit[]>(circuitsInitiaux);
  const [onglet, poserOnglet] = useState("moi");
  const [q, poserQ] = useState("");

  const MOI = "Awa Diallo";
  const aMoi = circuits.filter((c) => c.etat === "en circuit" && c.etapes.some((e) => e.etat === "en cours" && e.personne === MOI));
  const enCircuit = circuits.filter((c) => c.etat === "en circuit");
  const mesEnvois = circuits.filter((c) => c.preparePar === "Nadia Camara" || c.preparePar === "Thomas Diop");
  const rejetes = circuits.filter((c) => c.etat === "rejeté");

  const base = onglet === "moi" ? aMoi : onglet === "circuit" ? enCircuit : onglet === "envois" ? mesEnvois : circuits;
  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return base.filter((c) => !n || normaliser(`${c.document} ${c.code} ${c.preparePar} ${c.type}`).includes(n));
  }, [base, q]);

  const etapeCourante = (c: Circuit) => c.etapes.find((e) => e.etat === "en cours");

  async function signer(c: Circuit) {
    const e = etapeCourante(c);
    if (!e) return;
    const derniere = c.etapes[c.etapes.length - 1].ordre === e.ordre;
    const ok = await ui.confirmer({
      titre: e.role === "Signature" ? `Signer « ${c.document} » ?` : `Viser « ${c.document} » ?`,
      texte: e.role === "Signature"
        ? `Votre signature engage l'Agence. ${derniere ? "Le circuit se clôt et le document produit ses effets dans son dossier d'origine." : ""} Le document restera figé tel qu'il est aujourd'hui.`
        : `Votre visa atteste que vous avez vérifié ce qui relève de vous. Le document passe ensuite à ${c.etapes.find((x) => x.ordre === e.ordre + 1)?.personne ?? "l'étape suivante"}.`,
      bouton: e.role === "Signature" ? "Signer" : "Viser", ton: "vigilance",
    });
    if (!ok) return;
    poserCircuits((l) => l.map((x) => {
      if (x.code !== c.code) return x;
      const etapes = x.etapes.map((et) => et.ordre === e.ordre ? { ...et, etat: "faite" as const, quand: "à l'instant" } : et);
      const suivante = etapes.find((et) => et.etat === "attente");
      if (suivante) suivante.etat = "en cours";
      return { ...x, etapes, etat: suivante ? x.etat : ("signé" as const) };
    }));
    ui.message(e.role === "Signature" && derniere
      ? `« ${c.document} » signé. Le dossier d'origine est mis à jour.`
      : `Visa apposé. Le document passe à l'étape suivante.`, "bon");
  }

  async function rejeter(c: Circuit) {
    const ok = await ui.confirmer({
      titre: `Rejeter « ${c.document} » ?`,
      texte: "Le circuit s'arrête et le document repart à son préparateur avec votre motif. Les visas déjà apposés ne valent plus : un document repris devra refaire le circuit en entier.",
      bouton: "Rejeter", ton: "danger",
    });
    if (!ok) return;
    poserCircuits((l) => l.map((x) => x.code === c.code
      ? { ...x, etat: "rejeté", motifRejet: "Rejeté en cours de circuit.",
          etapes: x.etapes.map((e) => e.etat === "en cours" ? { ...e, etat: "rejetée" as const } : e) }
      : x));
    ui.message(`« ${c.document} » rejeté et renvoyé à son préparateur.`, "info");
  }

  function detail(c: Circuit) {
    ui.ouvrirTiroir({
      titre: c.document,
      sous: <><span className="font-mono">{c.code}</span> · {c.type}</>,
      onglets: [
        { nom: "Circuit", contenu: (
          <>
            <ListeEchelonnee>
              {c.etapes.map((e) => (
                <div key={e.ordre} className="flex items-start gap-3 py-[11px] border-b border-bordure last:border-0">
                  <span className={cx("w-[26px] h-[26px] rounded-full grid place-items-center shrink-0 text-[11px] font-semibold",
                    e.etat === "faite" ? "bg-bon text-white"
                      : e.etat === "en cours" ? "bg-accent text-white anim-attire"
                      : e.etat === "rejetée" ? "bg-critique text-white" : "bg-surface-3 text-encre-3")}>
                    {e.etat === "faite" ? "✓" : e.etat === "rejetée" ? "✕" : e.ordre}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold">{e.personne}</span>
                      <Jeton ton={e.role === "Signature" ? "accent" : "neutre"} point={false} enfants={e.role} />
                      {e.etat === "en cours" && <Jeton ton="accent" enfants="en attente de lui" />}
                    </span>
                    {e.quand && <span className="block text-[11px] text-encre-3 mt-[2px]">{e.quand}</span>}
                    {e.commentaire && (
                      <span className={cx("block text-[12px] mt-[4px] p-[8px] rounded-[4px]",
                        e.etat === "rejetée" ? "bg-critique-voile text-encre-2" : "bg-surface-2 text-encre-2")}>
                        « {e.commentaire} »
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </ListeEchelonnee>
            <p className="text-[12px] text-encre-3 mt-4">
              Le document est figé pendant tout le circuit. Personne ne peut le modifier entre deux visas —
              c'est ce qui donne sa valeur au visa précédent.
            </p>
          </>
        )},
        { nom: "Fiche", contenu: (
          <Definitions lignes={[
            ["Type", c.type],
            ["Dossier d'origine", <span className="font-mono">{c.dossier}</span>],
            ["Préparé par", c.preparePar],
            ["Préparé le", c.prepare],
            ["État", <Jeton ton={TON[c.etat]} enfants={c.etat} />],
            ["Urgence", c.urgence === "urgente" ? <Jeton ton="vigilance" enfants="urgente" /> : "normale"],
            ["Étapes", `${c.etapes.filter((e) => e.etat === "faite").length} sur ${c.etapes.length}`],
          ]} />
        )},
      ],
      pied: etapeCourante(c)?.personne === MOI ? (
        <>
          <Bouton ton="danger" icone="croix" onClick={() => { ui.fermerTiroir(); rejeter(c); }} enfants="Rejeter" />
          <Bouton ton="principal" className="ml-auto" icone="check" onClick={() => { ui.fermerTiroir(); signer(c); }}
            enfants={etapeCourante(c)?.role === "Signature" ? "Signer" : "Viser"} />
        </>
      ) : undefined,
    });
  }

  return (
    <>
      <Entete
        titre="Signataire"
        sous="Le circuit de visa et de signature. Un document en circuit est figé ; chaque signataire est prévenu à son tour."
        actions={
          <>
            {aMoi.length > 0 && <Jeton ton="accent" enfants={`${aMoi.length} vous attendent`} />}
            <Bouton icone="telecharger" onClick={() => { exporterCSV("signataire", filtres.map(({ etapes, ...r }) => ({ ...r, etapes: etapes.length }))); ui.message("Suivi exporté.", "bon"); }} enfants="Exporter" />
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Mise en circuit à brancher.", "info")} enfants="Mettre en circuit" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Vous attendent" valeur={<NombreAnime valeur={aMoi.length} />} ton={aMoi.length ? "accent" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En circuit" valeur={<NombreAnime valeur={enCircuit.length} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Rejetés" valeur={<NombreAnime valeur={rejetes.length} />} ton={rejetes.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Signés ce mois" valeur={<NombreAnime valeur={circuits.filter((c) => c.etat === "signé").length} />} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Délégations actives" valeur={<NombreAnime valeur={delegations.filter((d) => d.active).length} />} ton={delegations.some((d) => d.active) ? "vigilance" : undefined} />} />
      </div>

      {delegations.filter((d) => d.active).map((d) => (
        <Apparition key={d.de} className="mb-4">
          <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] bg-vigilance-voile border border-vigilance/40">
            <Icone nom="cle" className="text-vigilance mt-[2px]" />
            <div className="flex-1 min-w-[min(100%,220px)] text-[13px]">
              <b>Délégation de signature en cours.</b>{" "}
              <span className="text-encre-2">
                {d.de} a délégué à {d.a} — {d.portee.toLowerCase()} — du {d.du} au {d.au} ({d.motif.toLowerCase()}).
                Les documents signés pendant cette période portent le nom du délégataire et la mention de la
                délégation : c'est ce qui les rend opposables.
              </span>
            </div>
          </div>
        </Apparition>
      ))}

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "moi", nom: "À viser ou signer", compte: aMoi.length },
              { cle: "circuit", nom: "En circuit", compte: enCircuit.length },
              { cle: "envois", nom: "Mes envois", compte: mesEnvois.length },
              { cle: "tout", nom: "Tout le suivi", compte: circuits.length },
            ]}
          />

          <div className="pas-carte">
            <div className="flex items-center gap-2 h-8 px-[10px] max-w-[300px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi mb-3">
              <Icone nom="recherche" taille="s" />
              <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                placeholder="Document, référence, préparateur…" aria-label="Rechercher un document"
                className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
            </div>

            {filtres.length === 0 ? (
              <p className="text-[13px] text-encre-3 py-10 text-center">Rien dans cette vue.</p>
            ) : (
              <ListeEchelonnee className="space-y-2">
                {filtres.map((c) => {
                  const e = etapeCourante(c);
                  const faites = c.etapes.filter((x) => x.etat === "faite").length;
                  return (
                    <div key={c.code} role="button" tabIndex={0} onClick={() => detail(c)}
                      onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); detail(c); } }}
                      className={cx("w-full text-left p-4 rounded-[4px] border transi souleve cursor-pointer",
                        c.etat === "rejeté" ? "border-critique/40 bg-critique-voile"
                          : e?.personne === MOI ? "border-accent/40 bg-accent-voile"
                          : "border-bordure bg-surface-2 hover:border-bordure-2")}>
                      <div className="flex items-start gap-3 flex-wrap">
                        <Pastille ton={TON[c.etat] === "accent" ? "bon" : TON[c.etat]} pulse={c.etat === "en circuit"} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-semibold">{c.document}</span>
                            <Jeton ton="neutre" point={false} enfants={c.type} />
                            <span className="font-mono text-[11px] text-encre-4">{c.code}</span>
                            {c.urgence === "urgente" && <Jeton ton="vigilance" enfants="urgent" />}
                          </div>
                          <div className="text-[11.5px] text-encre-3 mt-[3px]">
                            Préparé par {c.preparePar} le {c.prepare} · dossier{" "}
                            <span className="font-mono">{c.dossier}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Jeton ton={TON[c.etat]} enfants={c.etat} />
                          {e?.personne === MOI && (
                            <span onClick={(ev) => ev.stopPropagation()} className="flex gap-2">
                              <Bouton taille="s" icone="croix" onClick={() => rejeter(c)} enfants="Rejeter" />
                              <Bouton taille="s" ton="principal" icone="check" onClick={() => signer(c)}
                                enfants={e.role === "Signature" ? "Signer" : "Viser"} />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Le circuit en une ligne : où en est le document */}
                      <div className="flex items-center gap-[3px] mt-3">
                        {c.etapes.map((et, i) => (
                          <span key={i} className="flex items-center gap-[3px] flex-1">
                            <span className={cx("h-[4px] rounded-full flex-1 transi",
                              et.etat === "faite" ? "bg-bon"
                                : et.etat === "en cours" ? "bg-accent"
                                : et.etat === "rejetée" ? "bg-critique" : "bg-surface-3")} />
                          </span>
                        ))}
                        <span className="text-[11px] text-encre-3 tab-num shrink-0 ml-2">
                          {faites} / {c.etapes.length}
                        </span>
                      </div>
                      <div className="text-[11px] text-encre-4 mt-[4px]">
                        {c.etat === "rejeté" ? c.motifRejet
                          : e ? `En attente de ${e.personne} (${e.role.toLowerCase()})`
                          : "Circuit terminé"}
                      </div>
                    </div>
                  );
                })}
              </ListeEchelonnee>
            )}
          </div>
        </>
      } />

      <Apparition delai={120}>
        <Carte className="mt-4" enfants={
          <>
            <TeteCarte titre="Délégations de signature" sous="Datées, bornées, et visibles de tous" />
            <div className="pas-carte pt-3">
              {delegations.map((d) => (
                <div key={d.de + d.au} className={cx("flex items-start gap-3 py-[11px] border-b border-bordure last:border-0", !d.active && "opacity-55")}>
                  <Pastille ton={d.active ? "bon" : "neutre"} pulse={d.active} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px]">
                      <b>{d.de}</b> → <b>{d.a}</b>
                    </div>
                    <div className="text-[11.5px] text-encre-3 mt-[2px]">
                      {d.portee} · du {d.du} au {d.au} · {d.motif}
                    </div>
                  </div>
                  <Jeton ton={d.active ? "bon" : "neutre"} enfants={d.active ? "en cours" : "terminée"} />
                </div>
              ))}
              <p className="text-[12px] text-encre-3 mt-3">
                Une délégation sans dates n'en est pas une : c'est un transfert de pouvoir que personne
                ne pense à reprendre. Celles-ci s'éteignent toutes seules.
              </p>
            </div>
          </>
        } />
      </Apparition>
    </>
  );
}
