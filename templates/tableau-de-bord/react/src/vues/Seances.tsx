import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Onglets, TeteCarte } from "../composants/Primitives";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, normaliser } from "../lib/format";
import { seances as seancesInitiales, type EtatCompteRendu, type Seance } from "../lib/institution";

const TON: Record<EtatCompteRendu, "neutre" | "accent" | "vigilance" | "bon" | "critique"> = {
  "pas de compte rendu": "neutre", "brouillon": "neutre", "soumis": "accent",
  "retourné": "vigilance", "validé": "bon",
};

/* Séances : du calendrier au compte rendu officiel.
   Le compte rendu passe de brouillon à soumis, puis validé — et devient figé.
   La validation est collégiale, à la séance suivante, portée par le
   rapporteur : un compte rendu validé par un supérieur n'engage que lui ;
   validé par la séance, il engage ceux qui y étaient. Les décisions de
   séance n'entrent au registre qu'à ce moment-là. */
export function Seances() {
  const ui = useUI();
  const [seances, poserSeances] = useState<Seance[]>(seancesInitiales);
  const [onglet, poserOnglet] = useState("avenir");
  const [q, poserQ] = useState("");

  const aVenir = seances.filter((s) => s.dansXJours >= 0);
  const tenues = seances.filter((s) => s.dansXJours < 0);
  const aValider = seances.filter((s) => s.compteRendu === "soumis");
  const enSouffrance = seances.filter((s) => s.compteRendu === "brouillon" || s.compteRendu === "retourné");

  const base = onglet === "avenir" ? aVenir : onglet === "valider" ? aValider : onglet === "souffrance" ? enSouffrance : tenues;
  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return base.filter((s) => !n || normaliser(`${s.intitule} ${s.code} ${s.presidence} ${s.rapporteur}`).includes(n));
  }, [base, q]);

  async function valider(s: Seance) {
    const ok = await ui.confirmer({
      titre: `Valider le compte rendu de la séance ${s.code} ?`,
      texte: `La validation fige le texte : on ne le modifie plus, une réouverture laisse une trace. Les ${s.decisionsSeance} décisions de séance entrent au registre et deviennent exécutoires, avec leur chargé d'exécution. La validation est collégiale — elle engage ceux qui étaient présents, pas seulement vous.`,
      bouton: "Valider le compte rendu", ton: "vigilance",
    });
    if (!ok) return;
    poserSeances((l) => l.map((x) => x.code === s.code ? { ...x, compteRendu: "validé", motifRetour: "" } : x));
    ui.message(`Compte rendu validé. ${s.decisionsSeance} décisions inscrites au registre.`, "bon");
  }

  async function retourner(s: Seance) {
    const ok = await ui.confirmer({
      titre: "Retourner le compte rendu au rapporteur ?",
      texte: "Le texte repart en brouillon avec votre motif. Rien n'entre au registre tant qu'il n'est pas validé — un compte rendu retourné ne produit aucune décision.",
      bouton: "Retourner", ton: "vigilance",
    });
    if (!ok) return;
    poserSeances((l) => l.map((x) => x.code === s.code
      ? { ...x, compteRendu: "retourné", motifRetour: "Distinguer ce qui a été décidé de ce qui a été évoqué." } : x));
    ui.message("Compte rendu retourné au rapporteur.", "info");
  }

  function detail(s: Seance) {
    const dureeTotale = s.pointsOrdreDuJour.reduce((a, p) => a + p.duree, 0);
    ui.ouvrirTiroir({
      titre: s.intitule,
      sous: <><span className="font-mono">{s.code}</span> · {s.quand}</>,
      onglets: [
        { nom: "Séance", contenu: (
          <Definitions lignes={[
            ["Quand", s.quand],
            ["Lieu", <>{s.lieu}{s.visio && <Jeton ton="accent" point={false} enfants="visioconférence" />}</>],
            ["Présidence", s.presidence],
            ["Rapporteur", <><b>{s.rapporteur}</b> — c'est lui qui porte le compte rendu en validation</>],
            ["Maître du temps", s.maitreDuTemps],
            ["Dossier rattaché", s.dossier === "—" ? "aucun" : <span className="font-mono">{s.dossier}</span>],
            ["Série", s.recurrente ? "réunion récurrente" : "séance isolée"],
            ["Convoqués", String(s.convoques)],
            ...(s.dansXJours < 0 ? [
              ["Présents", `${s.presents} présents, ${s.excuses} excusés, ${s.representes} représentés`] as [string, string],
            ] : []),
          ]} />
        )},
        { nom: "Ordre du jour", contenu: (
          <>
            <p className="text-[12px] text-encre-3 mb-3">
              {s.pointsOrdreDuJour.length} points, {dureeTotale} minutes prévues.
            </p>
            <ListeEchelonnee>
              {s.pointsOrdreDuJour.map((p, i) => (
                <div key={i} className="flex items-start gap-3 py-[10px] border-b border-bordure last:border-0">
                  <span className={cx("w-[20px] h-[20px] rounded-full text-[10px] font-semibold grid place-items-center shrink-0 mt-[2px]",
                    p.traite ? "bg-bon text-white" : "bg-surface-3 text-encre-3")}>
                    {p.traite ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px]">{p.intitule}</span>
                    <span className="block text-[11px] text-encre-3 mt-[2px]">{p.porteur} · {p.duree} min</span>
                  </span>
                </div>
              ))}
            </ListeEchelonnee>
          </>
        )},
        ...(s.dansXJours < 0 ? [{
          nom: "Compte rendu",
          contenu: (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Jeton ton={TON[s.compteRendu]} enfants={s.compteRendu} />
                <span className="text-[12px] text-encre-3">rédigé par {s.rapporteur}</span>
              </div>
              {s.motifRetour && (
                <div className="p-3 rounded-[4px] bg-vigilance-voile mb-3 text-[12.5px] text-encre-2">
                  <b className="text-vigilance">Motif du retour. </b>{s.motifRetour}
                </div>
              )}
              <Definitions lignes={[
                ["Décisions de séance", `${s.decisionsSeance} — ${s.compteRendu === "validé" ? "inscrites au registre" : "en attente de validation"}`],
                ["Recommandations", `${s.recommandations} avec responsable et échéance`],
              ]} />
              <p className="text-[12px] text-encre-3 mt-4">
                {s.compteRendu === "validé"
                  ? "Le texte est figé. Une réouverture reste possible, mais elle laisse une trace."
                  : "Tant que le compte rendu n'est pas validé, aucune décision de séance n'entre au registre."}
              </p>
            </>
          ),
        }] : []),
      ],
      pied: s.compteRendu === "soumis" ? (
        <>
          <Bouton icone="croix" onClick={() => { ui.fermerTiroir(); retourner(s); }} enfants="Retourner" />
          <Bouton ton="principal" className="ml-auto" icone="check" onClick={() => { ui.fermerTiroir(); valider(s); }} enfants="Valider" />
        </>
      ) : s.compteRendu === "validé" ? (
        <Bouton icone="telecharger" onClick={() => ui.message("Compte rendu exporté au modèle officiel.", "bon")} enfants="Export Word (modèle officiel)" />
      ) : undefined,
    });
  }

  return (
    <>
      <Entete
        titre="Séances"
        sous="Du calendrier au compte rendu officiel, et le suivi de ce qui y a été décidé."
        actions={
          <>
            {aValider.length > 0 && <Jeton ton="accent" enfants={`${aValider.length} comptes rendus à valider`} />}
            <Bouton icone="telecharger" onClick={() => { exporterCSV("seances", filtres.map(({ pointsOrdreDuJour, ...r }) => ({ ...r, points: pointsOrdreDuJour.length }))); ui.message("Liste exportée.", "bon"); }} enfants="Exporter" />
            <Bouton ton="principal" icone="plus" onClick={() => ui.message("Création de séance à brancher.", "info")} enfants="Nouvelle séance" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="À venir" valeur={<NombreAnime valeur={aVenir.length} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="À valider" valeur={<NombreAnime valeur={aValider.length} />} ton={aValider.length ? "accent" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En souffrance" valeur={<NombreAnime valeur={enSouffrance.length} />} ton={enSouffrance.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Décisions de séance" valeur={<NombreAnime valeur={seances.reduce((a, s) => a + s.decisionsSeance, 0)} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Recommandations" valeur={<NombreAnime valeur={seances.reduce((a, s) => a + s.recommandations, 0)} />} />} />
      </div>

      {enSouffrance.length > 0 && (
        <Apparition className="mb-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-[4px] bg-vigilance-voile border border-vigilance/40">
            <Icone nom="rapport" className="text-vigilance mt-[2px]" />
            <div className="flex-1 min-w-0 text-[13px]">
              <b>{enSouffrance.length} comptes rendus n'avancent plus.</b>{" "}
              <span className="text-encre-2">
                Tant qu'ils ne sont pas validés, les décisions prises en séance n'existent nulle part :
                elles ne sont ni au registre, ni confiées à quelqu'un, ni suivies. C'est le point où un
                outil de pilotage se vide de sa substance.
              </span>
            </div>
            <Bouton taille="s" onClick={() => poserOnglet("souffrance")} enfants="Les voir" />
          </div>
        </Apparition>
      )}

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "avenir", nom: "À venir", compte: aVenir.length },
              { cle: "valider", nom: "À valider", compte: aValider.length },
              { cle: "souffrance", nom: "En souffrance", compte: enSouffrance.length },
              { cle: "tenues", nom: "Tenues", compte: tenues.length },
            ]}
          />

          <div className="pas-carte">
            <div className="flex items-center gap-2 h-8 px-[10px] max-w-[300px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi mb-3">
              <Icone nom="recherche" taille="s" />
              <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                placeholder="Intitulé, code, présidence…" aria-label="Rechercher une séance"
                className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
            </div>

            {filtres.length === 0 ? (
              <p className="text-[13px] text-encre-3 py-10 text-center">Aucune séance dans cette vue.</p>
            ) : (
              <ListeEchelonnee className="space-y-2">
                {filtres.map((s) => (
                  <div key={s.code} role="button" tabIndex={0} onClick={() => detail(s)}
                    onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); detail(s); } }}
                    className="w-full text-left p-4 rounded-[4px] border border-bordure bg-surface-2 hover:border-bordure-2 transi souleve cursor-pointer">
                    <div className="flex items-start gap-3 flex-wrap">
                      <span className={cx("w-[42px] h-[42px] rounded-[4px] grid place-items-center shrink-0 text-center",
                        s.dansXJours >= 0 ? "bg-accent-voile text-accent" : "bg-surface-3 text-encre-3")}>
                        <span>
                          <span className="block text-[14px] font-semibold leading-none">
                            {s.quand.slice(0, 2)}
                          </span>
                          <span className="block text-[9px] mt-[2px]">{s.quand.slice(3, 5)}</span>
                        </span>
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13.5px] font-semibold">{s.intitule}</span>
                          <span className="font-mono text-[11px] text-encre-4">{s.code}</span>
                          {s.recurrente && <Jeton ton="neutre" point={false} enfants="récurrente" />}
                          {s.visio && <Jeton ton="neutre" point={false} enfants="visio" />}
                        </div>
                        <div className="text-[11.5px] text-encre-3 mt-[3px]">
                          {s.quand} · {s.lieu} · présidée par {s.presidence} · rapporteur {s.rapporteur}
                        </div>
                        <div className="flex items-center gap-3 mt-[6px] text-[11px] text-encre-4 flex-wrap">
                          <span className="inline-flex items-center gap-[4px]"><Icone nom="utilisateurs" taille="s" />
                            {s.dansXJours >= 0 ? `${s.convoques} convoqués` : `${s.presents}/${s.convoques} présents`}
                          </span>
                          <span className="inline-flex items-center gap-[4px]"><Icone nom="rapport" taille="s" />{s.pointsOrdreDuJour.length} points</span>
                          {s.decisionsSeance > 0 && (
                            <span className="inline-flex items-center gap-[4px]"><Icone nom="balance" taille="s" />{s.decisionsSeance} décisions</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {s.dansXJours >= 0
                          ? <Jeton ton="accent" enfants={s.dansXJours === 0 ? "aujourd'hui" : `dans ${s.dansXJours} j`} />
                          : <Jeton ton={TON[s.compteRendu]} enfants={s.compteRendu} />}
                        {s.compteRendu === "soumis" && (
                          <span onClick={(e) => e.stopPropagation()}>
                            <Bouton taille="s" ton="principal" icone="check" onClick={() => valider(s)} enfants="Valider" />
                          </span>
                        )}
                      </div>
                    </div>

                    {s.motifRetour && (
                      <p className="text-[12px] text-encre-2 mt-3 pt-3 border-t border-bordure">
                        <b className="text-vigilance">Retourné. </b>{s.motifRetour}
                      </p>
                    )}
                  </div>
                ))}
              </ListeEchelonnee>
            )}
          </div>
        </>
      } />

      <Apparition delai={120}>
        <Carte className="mt-4" enfants={
          <>
            <TeteCarte titre="Qui valide un compte rendu" sous="La question se tranche une fois, et pour tout l'outil" />
            <div className="pas-carte pt-3 text-[13px] text-encre-2 leading-[20px]">
              <p>
                Un compte rendu validé par un supérieur n'engage que lui : il atteste qu'il a lu, pas que
                la séance reconnaît ce texte. Validé collégialement à la séance suivante, porté par le
                rapporteur, il engage ceux qui étaient là — et c'est précisément ce qu'on attend d'un
                relevé de décisions.
              </p>
              <p className="mt-3">
                C'est aussi pour cela que les décisions de séance n'entrent au registre qu'à la validation,
                et pas à la soumission : avant, elles ne sont que le souvenir d'une personne.
              </p>
            </div>
          </>
        } />
      </Apparition>
    </>
  );
}
