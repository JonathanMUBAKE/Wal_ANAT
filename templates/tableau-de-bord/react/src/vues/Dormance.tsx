import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Progression, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { CarteGraphique, Graphique, optionsCommunes } from "../composants/Graphique";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { ListeEchelonnee } from "../composants/Mouvement";
import { cx, exporterCSV, fmt, jeton, normaliser } from "../lib/format";
import {
  ACTIVITE_NON_RECONNUE, ACTIVITE_RECONNUE, comptesDormants as comptesInitiaux,
  gravite, politiquesVoisines, pourquoiCaCompte, SEUILS, vagues,
  type CompteDormant, type EtatDormance,
} from "../lib/dormance";
import type { ChartConfiguration } from "chart.js";

const TON_ETAT: Record<EtatDormance, "neutre" | "accent" | "vigilance" | "serieux" | "critique" | "bon"> = {
  "éveillé": "bon", averti: "vigilance", "proposé": "critique",
  "exempté": "accent", "désactivé": "neutre", "clôturé": "neutre",
};
const TON_GRAVITE = { faible: "neutre", moyen: "vigilance", "élevé": "critique" } as const;

/* Comptes dormants : la politique du trimestre sans activité.

   L'écran est bâti sur une idée simple — ce n'est pas la dormance qui est
   dangereuse, c'est la dormance avec des droits. Le tri par défaut suit donc
   le poids du compte, pas le nombre de jours : un ordonnateur absent depuis
   trois mois passe devant un lecteur absent depuis sept.

   Et la politique ne coupe personne toute seule. Elle avertit, elle marque,
   et elle dépose la vague du mois dans la file d'approbation. */
export function Dormance({ aller }: { aller: (cle: string) => void }) {
  const ui = useUI();
  const [comptes, poserComptes] = useState<CompteDormant[]>(comptesInitiaux);
  const [q, poserQ] = useState("");
  const [etat, poserEtat] = useState("");
  const [direction, poserDirection] = useState("");
  const [droitsSeuls, poserDroitsSeuls] = useState(false);
  const [vagueDeposee, poserVagueDeposee] = useState(false);

  const directions = [...new Set(comptes.map((c) => c.direction))].sort((a, b) => a.localeCompare(b, "fr"));

  const vivants = comptes.filter((c) => c.etat !== "désactivé" && c.etat !== "clôturé");
  const proposes = comptes.filter((c) => c.etat === "proposé");
  const avertis = comptes.filter((c) => c.etat === "averti");
  const perimees = comptes.filter((c) => c.exemption?.perimee);
  const droitsDormants = vivants.reduce((s, c) => s + c.droitsSensibles.length, 0);
  /* Une session ouverte sur un compte éveillé est normale : c'est quelqu'un
     qui travaille. Elle ne devient un signal que sur un compte qui, lui, ne
     fait plus rien depuis le premier seuil. */
  const sessionsOuvertes = vivants.filter((c) => c.sessionsOuvertes > 0 && c.jours >= SEUILS.avertissement);

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return comptes.filter((c) =>
      (!n || normaliser(`${c.agent} ${c.matricule} ${c.direction} ${c.fonction} ${c.id}`).includes(n)) &&
      (!etat || c.etat === etat) &&
      (!direction || c.direction === direction) &&
      (!droitsSeuls || c.droitsSensibles.length > 0));
  }, [comptes, q, etat, direction, droitsSeuls]);

  /* Répartition par tranche : montre où se situe la masse, et que le seuil
     de 90 jours ne coupe pas au milieu d'un peloton. */
  const tranches = [
    { nom: "0 – 59 j", min: 0, max: 59 },
    { nom: "60 – 89 j", min: 60, max: 89 },
    { nom: "90 – 179 j", min: 90, max: 179 },
    { nom: "180 j et plus", min: 180, max: 9999 },
  ];
  const parTranche = tranches.map((t) => ({
    ...t, compte: comptes.filter((c) => c.jours >= t.min && c.jours <= t.max).length,
  }));

  const configTranches = (): ChartConfiguration => ({
    type: "bar",
    data: {
      labels: parTranche.map((t) => t.nom),
      datasets: [{
        label: "Comptes",
        data: parTranche.map((t) => t.compte),
        backgroundColor: [jeton("--encre-4"), jeton("--serie-4"), jeton("--serie-2"), jeton("--serie-8")],
        borderRadius: 4, borderSkipped: false, barThickness: 26,
      }],
    },
    options: {
      ...optionsCommunes(),
      scales: {
        ...optionsCommunes().scales,
        y: { ...optionsCommunes().scales.y, ticks: { ...optionsCommunes().scales.y.ticks, precision: 0 } },
      },
    } as never,
  });

  const configVagues = (): ChartConfiguration => {
    const v = [...vagues].reverse();
    return {
      type: "line",
      data: {
        labels: v.map((x) => x.mois.split(" ")[0]),
        datasets: [
          { label: "Proposés", data: v.map((x) => x.proposes),
            borderColor: jeton("--serie-2"), backgroundColor: jeton("--serie-2"),
            borderWidth: 1.75, tension: 0.28, pointRadius: 3, pointHoverRadius: 6 },
          { label: "Réveillés après l'avertissement", data: v.map((x) => x.reveilles),
            borderColor: jeton("--serie-3"), backgroundColor: jeton("--serie-3"),
            borderWidth: 1.75, tension: 0.28, pointRadius: 3, pointHoverRadius: 6 },
        ],
      },
      options: { ...optionsCommunes() } as never,
    };
  };

  /* La vague ne désactive rien : elle dépose une demande par compte dans la
     file d'approbation. C'est ce qui distingue une politique d'un couperet. */
  async function deposerVague() {
    const ok = await ui.confirmer({
      titre: `Déposer la vague de novembre — ${proposes.length} comptes ?`,
      texte: `Chaque compte part dans la file d'approbation avec sa fiche : ce qu'il a fait en dernier, `
        + `les droits qu'il conserve, les dossiers qu'il laisserait sans propriétaire. Rien n'est désactivé ici. `
        + `Un humain tranche compte par compte, et toute désactivation se défait pendant ${SEUILS.retractation} jours.`,
      bouton: "Déposer dans la file", ton: "info",
    });
    if (!ok) return;
    poserVagueDeposee(true);
    ui.message(`${proposes.length} demandes déposées dans la file d'approbation.`, "bon", {
      annuler: () => poserVagueDeposee(false),
    });
  }

  async function exempter(c: CompteDormant) {
    const ok = await ui.confirmer({
      titre: `Exempter ${c.agent} de la politique ?`,
      texte: "Une exemption se signe comme un écart au registre : elle porte un motif, le nom de celui qui "
        + "l'assume, et une date de revue. Sans date de revue, l'écran la refuse — c'est ce qui empêche une "
        + "exemption « provisoire » de durer trois ans.",
      bouton: "Rédiger l'exemption", ton: "vigilance",
    });
    if (!ok) return;
    ui.message(`Exemption de ${c.agent} à rédiger — motif et date de revue obligatoires.`, "info");
  }

  async function reveiller(c: CompteDormant) {
    const ok = await ui.confirmer({
      titre: `Relancer ${c.agent} ?`,
      texte: `Un message part à l'agent et à son responsable : le compte sera proposé à la désactivation `
        + `dans ${SEUILS.preavis} jours, et une simple connexion remet le compteur à zéro.`,
      bouton: "Envoyer la relance", ton: "info",
    });
    if (!ok) return;
    const avant = comptes;
    poserComptes((l) => l.map((x) => x.id === c.id
      ? { ...x, etat: "averti" as const, avertiLe: "aujourd'hui" } : x));
    ui.message(`Relance envoyée à ${c.agent} et à sa direction.`, "bon", { annuler: () => poserComptes(avant) });
  }

  function detail(c: CompteDormant) {
    const alerte = pourquoiCaCompte(c);
    ui.ouvrirTiroir({
      titre: c.agent,
      sous: <><span className="font-mono">{c.id}</span> · matricule {c.matricule} · {c.direction}</>,
      onglets: [
        { nom: "Dormance", contenu: (
          <>
            {alerte && (
              <div className="flex items-start gap-[9px] px-3 py-[10px] rounded-[4px] mb-4 bg-critique-voile border border-critique/40">
                <Icone nom="halte" taille="s" className="text-critique mt-[1px]" />
                <p className="text-[12.5px] text-encre-2">{alerte}</p>
              </div>
            )}
            <Definitions lignes={[
              ["Fonction", c.fonction],
              ["Rôle dans l'outil", c.role],
              ["Sans activité depuis", <span className="tab-num">{fmt(c.jours)} jours</span>],
              ["Dernière activité", c.derniereActivite],
              ["Dernier geste", <span className="text-[12.5px]">{c.dernierGeste}</span>],
              ["État", <Jeton ton={TON_ETAT[c.etat]} enfants={c.etat} />],
              ["Gravité", <Jeton ton={TON_GRAVITE[gravite(c)]} enfants={gravite(c)} />],
              ["Deuxième facteur", c.deuxFacteurs
                ? <Jeton ton="bon" enfants="vérifié" /> : <Jeton ton="vigilance" enfants="non vérifié" />],
              ["Sessions ouvertes", c.sessionsOuvertes
                ? <Jeton ton="critique" enfants={`${c.sessionsOuvertes} encore ouverte`} />
                : <span className="text-encre-3">aucune</span>],
              ...(c.avertiLe ? [["Averti le", c.avertiLe] as [string, string]] : []),
              ...(c.echeance ? [["Vague", c.echeance] as [string, string]] : []),
            ]} />

            <div className="mt-4 pt-3 border-t border-bordure">
              <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-2">
                Ce que le compte garde pendant qu'il dort
              </div>
              {c.droitsSensibles.length ? (
                <div className="flex flex-wrap gap-[5px]">
                  {c.droitsSensibles.map((d) => (
                    <Jeton key={d} ton="vigilance" point={false} enfants={d} />
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-encre-3">
                  Aucun droit sensible. Le compte dort, mais il ne peut rien faire de grave s'il est repris.
                </p>
              )}
            </div>

            {c.dossiersOuverts > 0 && (
              <div className="mt-4 p-3 rounded-[4px] bg-surface-2 border border-bordure">
                <p className="text-[12.5px] text-encre-2">
                  <b>{c.dossiersOuverts} dossier{c.dossiersOuverts > 1 ? "s" : ""} ouvert{c.dossiersOuverts > 1 ? "s" : ""} à ce nom.</b>{" "}
                  La désactivation ne les supprime pas : ils passent sans propriétaire et remontent dans la
                  file de la direction. C'est la raison pour laquelle on nomme un repreneur avant de couper,
                  pas après.
                </p>
              </div>
            )}

            {c.exemption && (
              <div className={cx("mt-4 p-3 rounded-[4px] border",
                c.exemption.perimee ? "bg-critique-voile border-critique/40" : "bg-surface-2 border-accent/40")}>
                <div className="flex items-center gap-[7px] mb-[6px]">
                  <Icone nom="tampon" taille="s" className={c.exemption.perimee ? "text-critique" : "text-accent"} />
                  <span className="text-[12.5px] font-semibold">
                    Exemption — {c.exemption.motif}
                  </span>
                  <span className={cx("ml-auto text-[11px]", c.exemption.perimee ? "text-critique font-semibold" : "text-encre-4")}>
                    {c.exemption.perimee ? `périmée depuis le ${c.exemption.revoirLe}` : `à revoir le ${c.exemption.revoirLe}`}
                  </span>
                </div>
                <p className="text-[12.5px] text-encre-2 leading-[18px]">{c.exemption.precision}</p>
                <p className="text-[11.5px] text-encre-4 mt-[6px]">
                  Signée par {c.exemption.signePar}, le {c.exemption.le}.
                </p>
              </div>
            )}
          </>
        )},
      ],
      pied: (c.etat === "désactivé" || c.etat === "clôturé")
        ? <p className="text-[12px] text-encre-3">Ce compte est déjà tranché. Sa réactivation passe par la file d'approbation.</p>
        : (
          <>
            <Bouton icone="enveloppe" onClick={() => { ui.fermerTiroir(); reveiller(c); }} enfants="Relancer l'agent" />
            <Bouton ton="fantome" className="ml-auto" icone="tampon"
              onClick={() => { ui.fermerTiroir(); exempter(c); }} enfants="Exempter" />
          </>
        ),
    });
  }

  const colonnes: Colonne<CompteDormant>[] = [
    { cle: "agent", nom: "Agent", triable: true, fixe: true, rendu: (c) => (
      <div className="flex items-start gap-[9px] min-w-0">
        <span className={cx("w-[6px] h-[6px] rounded-full shrink-0 mt-[7px]",
          gravite(c) === "élevé" ? "bg-critique" : gravite(c) === "moyen" ? "bg-vigilance" : "bg-encre-4")} />
        <span className="flex flex-col min-w-0">
          <span className="font-medium truncate">{c.agent}</span>
          <span className="text-[11.5px] text-encre-3 truncate">{c.fonction} · {c.direction}</span>
        </span>
      </div>
    )},
    { cle: "jours", nom: "Sans activité", num: true, triable: true, rendu: (c) => (
      <span className="inline-flex items-center gap-[6px] whitespace-nowrap">
        <span className={cx("tab-num font-medium",
          c.jours >= SEUILS.proposition ? "text-critique"
            : c.jours >= SEUILS.avertissement ? "text-vigilance" : "text-encre-2")}>
          {fmt(c.jours)} j
        </span>
      </span>
    )},
    { cle: "derniereActivite", nom: "Dernière activité", triable: true, rendu: (c) => (
      <span className="flex flex-col min-w-0">
        <span className="text-encre-2 whitespace-nowrap">{c.derniereActivite}</span>
        <span className="text-[11px] text-encre-4 truncate max-w-[260px]">{c.dernierGeste}</span>
      </span>
    )},
    { cle: "droitsSensibles", nom: "Droits conservés", num: true,
      valeur: (c) => c.droitsSensibles.length,
      rendu: (c) => c.droitsSensibles.length
        ? <span title={c.droitsSensibles.join(" · ")}>
            <Jeton ton={c.droitsSensibles.length >= 3 ? "critique" : "vigilance"}
              enfants={`${c.droitsSensibles.length} droit${c.droitsSensibles.length > 1 ? "s" : ""}`} />
          </span>
        : <span className="text-encre-4">aucun</span> },
    { cle: "deuxFacteurs", nom: "2 facteurs", triable: true, rendu: (c) =>
      c.deuxFacteurs ? <Jeton ton="bon" enfants="oui" /> : <Jeton ton="vigilance" enfants="non" /> },
    { cle: "sessionsOuvertes", nom: "Session", num: true, triable: true, rendu: (c) =>
      c.sessionsOuvertes ? <Jeton ton="critique" enfants="ouverte" /> : <span className="text-encre-4">—</span> },
    { cle: "dossiersOuverts", nom: "Dossiers", num: true, triable: true, rendu: (c) =>
      c.dossiersOuverts ? <span className="tab-num text-vigilance">{c.dossiersOuverts}</span>
        : <span className="text-encre-4">—</span> },
    { cle: "etat", nom: "État", triable: true, rendu: (c) => (
      <span className="inline-flex items-center gap-[5px]">
        <Jeton ton={TON_ETAT[c.etat]} enfants={c.etat} />
        {c.exemption?.perimee && <Jeton ton="critique" point={false} enfants="périmée" />}
      </span>
    )},
  ];

  return (
    <>
      <Entete
        titre="Comptes dormants"
        sous={`Sans activité depuis plus de ${SEUILS.proposition} jours. Ce n'est pas la dormance qui est dangereuse, c'est la dormance avec des droits.`}
        actions={
          <>
            <Bouton icone="telecharger"
              onClick={() => { exporterCSV("comptes-dormants", comptes); ui.message("Liste exportée.", "bon"); }}
              enfants="Exporter" />
            <Bouton ton="principal" icone="tampon" disabled={vagueDeposee || proposes.length === 0}
              onClick={deposerVague}
              enfants={vagueDeposee ? "Vague déposée" : `Déposer la vague (${proposes.length})`} />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Proposés ce mois" valeur={fmt(proposes.length)} ton={proposes.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Avertis" valeur={fmt(avertis.length)} ton={avertis.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Droits qui dorment" valeur={fmt(droitsDormants)} ton={droitsDormants ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Comptes à regarder d'abord" valeur={fmt(vivants.filter((c) => gravite(c) === "élevé").length)} ton="critique" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Exemptions périmées" valeur={fmt(perimees.length)} ton={perimees.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Réveillés en 6 mois" valeur={fmt(vagues.reduce((s, v) => s + v.reveilles, 0))} ton="bon" />} />
      </div>

      {sessionsOuvertes.length > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-critique-voile border border-critique/40 anim-apparait">
          <Icone nom="halte" className="text-critique mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,260px)] text-[13px]">
            <b>
              {sessionsOuvertes.length} compte{sessionsOuvertes.length > 1 ? "s dormants gardent" : " dormant garde"} une
              session ouverte.
            </b>{" "}
            <span className="text-encre-2">
              Un compte qui ne fait rien depuis des mois mais dont une session tient encore debout, ce n'est pas
              de la dormance : c'est quelque chose qui reste connecté sans que personne s'en serve.
              {" "}{sessionsOuvertes.map((c) => c.agent).join(", ")} — à regarder avant la vague.
            </span>
          </div>
          <Bouton taille="s" onClick={() => aller("sessions")} enfants="Voir les sessions" />
        </div>
      )}

      {perimees.length > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-vigilance-voile border border-vigilance/40 anim-apparait">
          <Icone nom="tampon" className="text-vigilance mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,260px)] text-[13px]">
            <b>{perimees.length} exemption{perimees.length > 1 ? "s ont" : " a"} dépassé sa date de revue.</b>{" "}
            <span className="text-encre-2">
              {perimees.map((c) => `${c.agent} (${c.exemption?.motif}, à revoir le ${c.exemption?.revoirLe})`).join(" · ")}.
              Une exemption sans revue finit par devenir une exception permanente que plus personne n'a décidée.
            </span>
          </div>
          <Bouton taille="s" onClick={() => poserEtat("exempté")} enfants="Les lire" />
        </div>
      )}

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,340px), 1fr))" }}>
        <CarteGraphique
          titre="Où se situe la masse"
          sous={`Le seuil de ${SEUILS.proposition} jours ne coupe pas au milieu d'un peloton`}
          etiquettes={parTranche.map((t) => t.nom)}
          series={[{ nom: "Comptes", couleur: "--serie-2", valeurs: parTranche.map((t) => t.compte) }]}
          enfants={<div className="px-2 pb-2"><Graphique config={configTranches} hauteur={200} /></div>}
        />

        <CarteGraphique
          titre="Ce que la politique produit"
          sous="Les réveils disent si l'avertissement sert à quelque chose"
          etiquettes={[...vagues].reverse().map((v) => v.mois.split(" ")[0])}
          series={[
            { nom: "Proposés", couleur: "--serie-2", valeurs: [...vagues].reverse().map((v) => v.proposes) },
            { nom: "Réveillés", couleur: "--serie-3", valeurs: [...vagues].reverse().map((v) => v.reveilles) },
          ]}
          legende={
            <div className="flex items-center gap-4 px-[var(--pas-carte)] pt-2 text-[12px]">
              <span className="inline-flex items-center gap-[6px]">
                <i className="w-[8px] h-[8px] rounded-full" style={{ background: "var(--serie-2)" }} />
                Proposés à la désactivation
              </span>
              <span className="inline-flex items-center gap-[6px]">
                <i className="w-[8px] h-[8px] rounded-full" style={{ background: "var(--serie-3)" }} />
                Réveillés après l'avertissement
              </span>
            </div>
          }
          enfants={<div className="px-2 pb-2"><Graphique config={configVagues} hauteur={200} /></div>}
        />
      </div>

      <Carte className="mb-4" enfants={
        <>
          <TeteCarte titre="La politique, en trois seuils" sous="Et aucune coupure automatique" />
          <div className="pas-carte pt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
            {[
              [`${SEUILS.avertissement} jours`, "On prévient", `L'agent et son responsable reçoivent un message. Rien ne change sur le compte : c'est un rappel, pas une sanction. Une connexion remet le compteur à zéro.`, "vigilance"],
              [`${SEUILS.proposition} jours`, "On propose", `Le compte entre dans la vague du mois, déposée dans la file d'approbation avec sa fiche complète. Un humain tranche, compte par compte. La désactivation se défait pendant ${SEUILS.retractation} jours.`, "critique"],
              [`${SEUILS.cloture} jours`, "On clôture", "La clôture définitive est proposée : le compte sort du référentiel actif, et ses dossiers cherchent un repreneur nommé avant la coupure, jamais après.", "neutre"],
            ].map(([seuil, quoi, texte, ton]) => (
              <div key={seuil} className={cx("p-3 rounded-[4px] border bg-surface-2",
                ton === "critique" ? "border-critique/40" : ton === "vigilance" ? "border-vigilance/40" : "border-bordure")}>
                <div className={cx("text-[19px] font-semibold tab-num",
                  ton === "critique" ? "text-critique" : ton === "vigilance" ? "text-vigilance" : "text-encre-2")}>
                  {seuil}
                </div>
                <div className="text-[12.5px] font-semibold mt-[2px]">{quoi}</div>
                <p className="text-[12px] text-encre-3 mt-[6px] leading-[17px]">{texte}</p>
              </div>
            ))}
          </div>
        </>
      } />

      <Carte className="mb-4" enfants={
        <>
          <TeteCarte
            titre="Ce qui compte comme activité"
            sous="La liste est courte, et c'est pour cela qu'elle est écrite ici"
          />
          <div className="pas-carte pt-3 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div>
              <div className="flex items-center gap-[6px] text-[12px] font-semibold text-bon mb-2">
                <Icone nom="check" taille="s" /> Remet le compteur à zéro
              </div>
              <ListeEchelonnee className="grid gap-[6px]">
                {ACTIVITE_RECONNUE.map((a) => (
                  <p key={a} className="text-[12.5px] text-encre-2 pl-[18px] relative leading-[18px]">
                    <span className="absolute left-0 top-[7px] w-[5px] h-[5px] rounded-full bg-bon" />{a}
                  </p>
                ))}
              </ListeEchelonnee>
            </div>
            <div>
              <div className="flex items-center gap-[6px] text-[12px] font-semibold text-encre-3 mb-2">
                <Icone nom="croix" taille="s" /> Ne compte pas
              </div>
              <ListeEchelonnee className="grid gap-[6px]">
                {ACTIVITE_NON_RECONNUE.map((a) => (
                  <p key={a} className="text-[12.5px] text-encre-3 pl-[18px] relative leading-[18px]">
                    <span className="absolute left-0 top-[7px] w-[5px] h-[5px] rounded-full bg-encre-4" />{a}
                  </p>
                ))}
              </ListeEchelonnee>
            </div>
          </div>
          <p className="px-[var(--pas-carte)] pb-[var(--pas-carte)] text-[12px] text-encre-4 leading-[17px]">
            Un agent qui croit qu'ouvrir un courriel de la plateforme suffit se fait couper sans comprendre
            pourquoi. L'avertissement envoyé à {SEUILS.avertissement} jours reprend ces deux listes mot pour mot.
          </p>
        </>
      } />

      <Carte enfants={
        <TableauDonnees
          lignes={filtres} colonnes={colonnes} cle={(c) => c.id}
          totalBrut={comptes.length} nomEntite={["compte", "comptes"]}
          triInitial={{ cle: "droitsSensibles", sens: "desc" }}
          surLigne={detail}
          vide={{
            titre: "Aucun compte", texte: "Aucun compte ne correspond à ces filtres.",
            actions: <Bouton onClick={() => { poserQ(""); poserEtat(""); poserDirection(""); poserDroitsSeuls(false); }} enfants="Réinitialiser les filtres" />,
          }}
          barreOutils={
            <>
              <div className="flex items-center gap-2 h-8 px-[10px] min-w-[220px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                <Icone nom="recherche" taille="s" />
                <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                  placeholder="Agent, matricule, direction…" aria-label="Rechercher un compte"
                  className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
              </div>
              <select value={etat} onChange={(e) => poserEtat(e.target.value)} aria-label="Filtrer par état"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Tous les états</option>
                {["éveillé", "averti", "proposé", "exempté", "désactivé", "clôturé"].map((e) => <option key={e}>{e}</option>)}
              </select>
              <select value={direction} onChange={(e) => poserDirection(e.target.value)} aria-label="Filtrer par direction"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Toutes les directions</option>
                {directions.map((d) => <option key={d}>{d}</option>)}
              </select>
              <Bouton actif={droitsSeuls} icone="cle"
                onClick={() => poserDroitsSeuls((v) => !v)} enfants="Avec droits sensibles" />
            </>
          }
          actionsLigne={(c) => (c.etat === "désactivé" || c.etat === "clôturé") ? null : (
            <>
              <Bouton ton="fantome" taille="s" icone="oeil" title="Détail" onClick={() => detail(c)} />
              <Bouton ton="fantome" taille="s" icone="enveloppe" title="Relancer" onClick={() => reveiller(c)} />
              <Bouton ton="fantome" taille="s" icone="tampon" title="Exempter" onClick={() => exempter(c)} />
            </>
          )}
        />
      } />

      <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,340px), 1fr))" }}>
        <Carte enfants={
          <>
            <TeteCarte titre="Les vagues passées" sous="Ce que la politique a réellement coupé" />
            <div className="pas-carte pt-3 divide-y divide-bordure">
              {vagues.map((v) => (
                <div key={v.mois} className="py-[9px] first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-[6px]">
                    <span className="text-[12.5px] font-medium">{v.mois}</span>
                    {v.etat === "en cours" && <Jeton ton="accent" enfants="en cours" />}
                    <span className="ml-auto text-[11.5px] text-encre-3 tab-num">
                      {v.desactives} désactivé{v.desactives > 1 ? "s" : ""} sur {v.proposes} proposé{v.proposes > 1 ? "s" : ""}
                    </span>
                  </div>
                  <Progression valeur={(v.desactives / Math.max(1, v.proposes)) * 100}
                    ton={v.etat === "en cours" ? "accent" : "bon"} />
                  <p className="text-[11px] text-encre-4 mt-[5px]">
                    {v.reveilles} réveillé{v.reveilles > 1 ? "s" : ""} après l'avertissement ·{" "}
                    {v.exemptes} exempté{v.exemptes > 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>
          </>
        } />

        <Carte enfants={
          <>
            <TeteCarte
              titre="Les politiques voisines"
              sous="Même mécanique, autres objets"
              outils={<Bouton ton="fantome" taille="s" onClick={() => aller("controles")} enfants="Le registre" />}
            />
            <div className="pas-carte pt-3 divide-y divide-bordure">
              {politiquesVoisines.map((p) => (
                <div key={p.id} className="flex items-start gap-3 py-[9px] first:pt-0 last:pb-0">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12.5px] font-medium">{p.nom}</span>
                      <Jeton ton="neutre" point={false} enfants={p.seuil} />
                      {p.concernes > 0 && <Jeton ton={p.concernes > 2 ? "vigilance" : "accent"} enfants={`${p.concernes} concerné${p.concernes > 1 ? "s" : ""}`} />}
                    </span>
                    <span className="block text-[12px] text-encre-3 mt-[4px] leading-[17px]">{p.quoi}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        } />
      </div>
    </>
  );
}
