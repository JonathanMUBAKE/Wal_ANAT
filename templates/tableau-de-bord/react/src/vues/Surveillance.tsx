import { useState } from "react";
import type { ChartConfiguration } from "chart.js";
import { BarreMini, Bouton, Carte, Entete, Interrupteur, Jeton, LigneStat, Onglets, Pastille, TeteCarte } from "../composants/Primitives";
import { AnneauTotal, Graphique, Legende, optionsCommunes } from "../composants/Graphique";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { AssistantIA } from "../composants/AssistantIA";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, fmt, jeton, NF, voiler } from "../lib/format";
import { HEURES } from "../lib/donnees";
import {
  connexions, listeBlanche, listeNoire, reglesDetection, traficReseau,
  type ConnexionObservee, type EntreeListe, type RegleDetection,
} from "../lib/exploitation";

const TON_RESEAU = {
  "Réseau de l'Agence": "bon", "Opérateur mobile": "neutre", "Fournisseur grand public": "neutre",
  "VPN commercial": "vigilance", "Hébergeur": "vigilance", "Réseau d'anonymisation": "critique",
} as const;

/* Surveillance réseau : d'où l'on se connecte, et ce qui sort de l'ordinaire.
   Trois mécanismes qui ne se remplacent pas :
   — la liste blanche dit ce qui est normal et n'a pas à être questionné ;
   — la liste noire dit ce qui est refusé, point ;
   — la détection repère ce qui n'est ni l'un ni l'autre et le signale.
   La plupart des règles signalent au lieu de bloquer, et c'est volontaire :
   un blocage automatique sur un signal faible enferme dehors un agent
   légitime un dimanche soir, sans personne pour lui ouvrir. */
export function Surveillance() {
  const ui = useUI();
  const [regles, poserRegles] = useState<RegleDetection[]>(reglesDetection);
  const [noire, poserNoire] = useState<EntreeListe[]>(listeNoire);
  const [onglet, poserOnglet] = useState("connexions");

  const bloquees = connexions.filter((c) => c.resultat === "bloquée" || c.resultat === "refusée");
  const risquees = connexions.filter((c) => c.risque >= 40);
  const horsReseau = connexions.filter((c) => c.typeReseau !== "Réseau de l'Agence");
  const anonymisation = connexions.filter((c) => c.typeReseau === "Réseau d'anonymisation");
  const fauxPositifs = regles.reduce((a, r) => a + r.fauxPositifs, 0);
  const declenchements = regles.reduce((a, r) => a + r.declenchements30j, 0);

  const configTrafic = (): ChartConfiguration => {
    const o = optionsCommunes();
    const series = [
      { nom: "Requêtes par minute", valeurs: traficReseau.requetesParMin, couleur: "--serie-1" },
      { nom: "Refusées", valeurs: traficReseau.refusees, couleur: "--serie-8" },
    ];
    return {
      type: "line",
      data: {
        labels: HEURES,
        datasets: series.map((s) => {
          const col = jeton(s.couleur);
          return {
            label: s.nom, data: s.valeurs, borderColor: col, backgroundColor: voiler(col, 0.14),
            borderWidth: 2, fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 5,
            pointBackgroundColor: col, pointBorderColor: jeton("--surface"), pointBorderWidth: 2,
          };
        }),
      },
      options: {
        ...o,
        scales: { ...o.scales, y: { ...o.scales.y, ticks: { ...o.scales.y.ticks, callback: (v) => fmt(Number(v), "compact") } } },
      },
    };
  };

  async function bloquer(c: ConnexionObservee) {
    const ok = await ui.confirmer({
      titre: `Bloquer ${c.ip} ?`,
      texte: `Toute connexion depuis cette adresse sera refusée. ${c.typeReseau === "VPN commercial" ? "Attention : c'est un VPN commercial. Si l'agent est en mission, il perdra l'accès sans message compréhensible — mieux vaut l'appeler avant." : ""} Le blocage est journalisé et peut être levé.`,
      bouton: "Bloquer l'adresse", ton: "danger",
    });
    if (!ok) return;
    poserNoire((l) => [{
      valeur: c.ip, type: "adresse",
      motif: `Bloquée après signalement : ${c.signaux.join(", ")}.`,
      ajoutePar: "Vous", ajouteLe: "à l'instant", expire: "dans 30 j", permanente: false, occurrences: 0,
    }, ...l]);
    ui.message(`${c.ip} ajoutée à la liste noire pour 30 jours.`, "bon");
  }

  async function autoriser(c: ConnexionObservee) {
    const ok = await ui.confirmer({
      titre: `Ajouter ${c.ip} à la liste blanche ?`,
      texte: "Les connexions depuis cette adresse ne seront plus questionnées par la détection. À ne faire qu'après avoir confirmé auprès de l'agent — une liste blanche posée par confort est un trou permanent.",
      bouton: "Autoriser", ton: "vigilance",
    });
    if (ok) ui.message(`${c.ip} autorisée pour 60 jours. L'entrée expire d'elle-même.`, "bon");
  }

  async function basculerRegle(r: RegleDetection) {
    if (r.active) {
      const ok = await ui.confirmer({
        titre: `Désactiver « ${r.nom} » ?`,
        texte: `Cette règle a signalé ${r.declenchements30j} fois sur 30 jours, dont ${r.fauxPositifs} à tort. La désactiver supprime les faux signalements — et les vrais aussi.`,
        bouton: "Désactiver", ton: "vigilance",
      });
      if (!ok) return;
    }
    poserRegles((l) => l.map((x) => x.cle === r.cle ? { ...x, active: !x.active } : x));
    ui.message(r.active ? `« ${r.nom} » désactivée.` : `« ${r.nom} » activée.`, "bon");
  }

  function detailConnexion(c: ConnexionObservee) {
    ui.ouvrirTiroir({
      titre: `${c.agent} — ${c.ville}`,
      sous: <><span className="font-mono">{c.ip}</span> · {c.quand}</>,
      onglets: [
        { nom: "Connexion", contenu: (
          <>
            <div className="flex items-center gap-3 p-3 rounded-[4px] bg-surface-2 border border-bordure mb-4">
              <div className="relative w-[52px] h-[52px] shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-3)" strokeWidth="12" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="12" strokeLinecap="round"
                    stroke={c.risque >= 70 ? "var(--critique)" : c.risque >= 40 ? "var(--vigilance)" : "var(--bon)"}
                    strokeDasharray={`${(c.risque / 100) * 264} 264`} />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-[14px] font-semibold tab-num">{c.risque}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">Indice de risque</div>
                <p className="text-[12px] text-encre-2">
                  {c.risque >= 70 ? "Plusieurs signaux forts se cumulent. Un indice élevé ne prouve rien : il dit qu'il faut regarder."
                    : c.risque >= 40 ? "Un ou deux signaux, chacun explicable séparément."
                      : "Rien d'inhabituel pour ce compte."}
                </p>
              </div>
            </div>
            <Definitions lignes={[
              ["Agent", c.agent],
              ["Adresse", <span className="font-mono">{c.ip}</span>],
              ["Lieu", `${c.ville}, ${c.pays}`],
              ["Fournisseur", c.fournisseur],
              ["Type de réseau", <Jeton ton={TON_RESEAU[c.typeReseau]} enfants={c.typeReseau} />],
              ["Appareil", <>{c.appareil}{c.nouvelAppareil && <Jeton ton="vigilance" enfants="jamais vu" />}</>],
              ["Résultat", <Jeton ton={c.resultat === "acceptée" ? "bon" : "critique"} enfants={c.resultat} />],
            ]} />
            {c.signaux.length > 0 && (
              <div className="mt-4">
                <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-2">
                  Ce qui a été signalé
                </div>
                <ListeEchelonnee className="space-y-[6px]">
                  {c.signaux.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-[8px] rounded-[4px] bg-vigilance-voile text-[12.5px] text-encre-2">
                      <Icone nom="alerte" taille="s" className="text-vigilance mt-[2px] shrink-0" />{s}
                    </div>
                  ))}
                </ListeEchelonnee>
              </div>
            )}
          </>
        )},
      ],
      pied: (
        <>
          <Bouton icone="check" onClick={() => { ui.fermerTiroir(); autoriser(c); }} enfants="Autoriser cette adresse" />
          <Bouton ton="danger" className="ml-auto" icone="croix" onClick={() => { ui.fermerTiroir(); bloquer(c); }} enfants="Bloquer" />
        </>
      ),
    });
  }

  return (
    <>
      <Entete
        titre="Surveillance réseau"
        sous="D'où l'on se connecte, ce qui sort de l'ordinaire, et ce qu'on refuse d'avance."
        actions={
          <>
            {anonymisation.length > 0 && <Jeton ton="critique" enfants="réseau d'anonymisation détecté" />}
            <Bouton icone="plus" onClick={() => poserOnglet("listes")} enfants="Gérer les listes" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Connexions observées" valeur={<NombreAnime valeur={connexions.length * 184} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Hors réseau" valeur={<NombreAnime valeur={horsReseau.length} />} ton={horsReseau.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="À risque élevé" valeur={<NombreAnime valeur={risquees.length} />} ton={risquees.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Refusées ou bloquées" valeur={<NombreAnime valeur={bloquees.length} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Bloquées (30 j)" valeur={<NombreAnime valeur={traficReseau.bloquees30j} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Faux signalements" valeur={<NombreAnime valeur={Math.round((fauxPositifs / declenchements) * 100)} suffixe=" %" />} ton={fauxPositifs / declenchements > 0.5 ? "vigilance" : "bon"} />} />
      </div>

      {risquees.length > 0 && (
        <Apparition className="mb-4">
          <AssistantIA
            titre="Lecture du trafic de connexion"
            invite="Sur les connexions des deux dernières heures, leurs origines et leurs signaux."
            cout={0.019}
            surAction={() => bloquer(connexions[2])}
            constat={{
              resume: "Une connexion au compte d'Idriss Kouassi est partie d'un réseau d'anonymisation aux Pays-Bas, 38 minutes après une connexion du même compte depuis Kinshasa.",
              cause: "Le trajet est physiquement impossible : aucun déplacement ne relie Kinshasa à Amsterdam en 38 minutes. Soit le compte est utilisé depuis deux endroits, soit l'une des deux connexions passe par un relais. Le réseau d'anonymisation, l'appareil jamais vu et le pays jamais vu pour ce compte vont dans le même sens — et la connexion a d'ailleurs été bloquée par la règle « voyage impossible ».",
              certitude: "élevée",
              preuves: [
                { source: "CX-9002 · il y a 11 min", extrait: "Moussa Traoré — 41.243.18.92, Kinshasa, opérateur national" },
                { source: "CX-9003 · il y a 26 min", extrait: "Idriss Kouassi — 185.220.101.44, Amsterdam, réseau d'anonymisation — bloquée" },
                { source: "Règle « voyage impossible »", extrait: "vitesse implicite au-delà de 900 km/h" },
              ],
              pistes: [
                "Appeler l'agent avant toute autre mesure : s'il est en déplacement avec un VPN mal configuré, l'explication s'arrête là.",
                "Si ce n'est pas lui, révoquer ses sessions et forcer un changement de mot de passe — dans cet ordre.",
                "Vérifier si le même compte a servi à une action critique depuis cette adresse ; la page Actions critiques le dirait.",
              ],
              action: {
                libelle: "Bloquer la plage d'anonymisation",
                consequence: "Toute connexion depuis 185.220.101.0/24 sera refusée pendant trente jours.",
              },
            }}
          />
        </Apparition>
      )}

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 360px)" }}>
        <Carte enfants={
          <>
            <TeteCarte titre="Trafic entrant" sous="Requêtes acceptées et refusées, sur 24 heures" />
            <Legende items={[
              { nom: "Requêtes par minute", couleur: "var(--serie-1)", valeur: fmt(traficReseau.requetesParMin.at(-1) ?? 0) },
              { nom: "Refusées", couleur: "var(--serie-8)", valeur: fmt(traficReseau.refusees.at(-1) ?? 0) },
            ]} />
            <Graphique config={configTrafic} hauteur={210} />
          </>
        } />

        <Carte enfants={
          <div className="pas-carte">
            <div className="flex items-start gap-4">
              <AnneauTotal taille={128}
                parts={traficReseau.parType.map((t, i) => ({ nom: t.nom, valeur: t.v, couleur: `--serie-${i + 1}` }))}
                total="100 %" intitule="des connexions" />
              <div className="min-w-0 flex-1">
                {traficReseau.parType.map((t, i) => (
                  <div key={t.nom} className="flex items-center gap-2 py-[3px] text-[11.5px]">
                    <i className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: `var(--serie-${i + 1})` }} />
                    <span className="truncate flex-1 min-w-0">{t.nom}</span>
                    <span className="tab-num text-encre-2">{NF(1).format(t.v)} %</span>
                  </div>
                ))}
                <p className="text-[11.5px] text-encre-3 mt-2">
                  Le dixième de pour cent venu d'un réseau d'anonymisation concentre l'essentiel
                  des blocages.
                </p>
              </div>
            </div>
          </div>
        } />
      </div>

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "connexions", nom: "Connexions", compte: connexions.length },
              { cle: "regles", nom: "Détection", compte: regles.filter((r) => r.active).length },
              { cle: "listes", nom: "Listes", compte: noire.length + listeBlanche.length },
            ]}
          />

          <div className="pas-carte">
            {onglet === "connexions" && (
              <div className="overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      {["Quand", "Agent", "Adresse et lieu", "Réseau", "Appareil", "Signaux", "Risque", "Résultat", ""].map((t, i) => (
                        <th key={t || i} className={cx(
                          "sticky top-0 bg-surface-2 px-3 py-[9px] border-b border-bordure whitespace-nowrap",
                          "text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3",
                          i === 6 ? "text-right" : "text-left")}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {connexions.map((c) => (
                      <tr key={c.id} className={cx("hover:bg-surface-2 transi cursor-pointer", c.risque >= 70 && "bg-critique-voile")}
                        onClick={() => detailConnexion(c)}>
                        <td className="px-3 pas-ligne border-b border-bordure text-encre-3 whitespace-nowrap">{c.quand}</td>
                        <td className="px-3 pas-ligne border-b border-bordure font-medium">{c.agent}</td>
                        <td className="px-3 pas-ligne border-b border-bordure">
                          <span className="font-mono text-[12px] block">{c.ip}</span>
                          <span className="text-[11px] text-encre-3">{c.ville}, {c.pays}</span>
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure">
                          <Jeton ton={TON_RESEAU[c.typeReseau]} enfants={c.typeReseau} />
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure text-encre-2">
                          {c.appareil}
                          {c.nouvelAppareil && <span className="block text-[11px] text-vigilance">jamais vu</span>}
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure">
                          {c.signaux.length === 0
                            ? <span className="text-encre-4">—</span>
                            : <span className="text-[11.5px] text-encre-2">{c.signaux.length} signal{c.signaux.length > 1 ? "ux" : ""}</span>}
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right">
                          <span className="inline-flex items-center gap-2 justify-end">
                            <BarreMini valeur={c.risque} ton={c.risque >= 70 ? "critique" : c.risque >= 40 ? "vigilance" : "bon"} largeur={44} />
                            <span className={cx("tab-num w-[26px] text-right font-semibold",
                              c.risque >= 70 ? "text-critique" : c.risque >= 40 ? "text-vigilance" : "")}>{c.risque}</span>
                          </span>
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure">
                          <Jeton ton={c.resultat === "acceptée" ? "bon" : "critique"} enfants={c.resultat} />
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure text-right">
                          {c.resultat === "acceptée" && c.risque >= 40 && (
                            <span onClick={(e) => e.stopPropagation()}>
                              <Bouton ton="fantome" taille="s" icone="croix" title="Bloquer" onClick={() => bloquer(c)} />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {onglet === "regles" && (
              <>
                <p className="text-[12px] text-encre-3 mb-3">
                  La colonne « à tort » est la plus importante. Une règle qui se trompe plus d'une fois
                  sur deux apprend aux opérateurs à ignorer ses signalements — y compris les bons.
                </p>
                <ListeEchelonnee>
                  {regles.map((r) => {
                    const tauxFaux = r.declenchements30j ? Math.round((r.fauxPositifs / r.declenchements30j) * 100) : 0;
                    return (
                      <div key={r.cle} className={cx("flex items-start gap-3 py-[12px] border-b border-bordure last:border-0", !r.active && "opacity-55")}>
                        <span className={cx("w-[26px] h-[26px] rounded-[4px] grid place-items-center shrink-0 mt-[2px]",
                          r.action === "bloquer" ? "bg-critique-voile text-critique"
                            : r.action === "demander un second facteur" ? "bg-vigilance-voile text-vigilance"
                            : "bg-surface-3 text-encre-3")}>
                          <Icone nom={r.action === "bloquer" ? "croix" : r.action === "signaler" ? "alerte" : "bouclier"} taille="s" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold">{r.nom}</span>
                            <Jeton ton={r.action === "bloquer" ? "critique" : r.action === "signaler" ? "neutre" : "vigilance"}
                              point={false} enfants={r.action} />
                            {tauxFaux > 50 && <Jeton ton="vigilance" enfants={`${tauxFaux} % à tort`} />}
                          </div>
                          <p className="text-[12px] text-encre-3 mt-[2px]">{r.description}</p>
                          <div className="flex items-center gap-4 mt-[5px] text-[11px] text-encre-4 flex-wrap">
                            <span>seuil : {r.seuil}</span>
                            <span>{r.declenchements30j} signalements sur 30 j</span>
                            {r.fauxPositifs > 0 && <span>dont {r.fauxPositifs} à tort</span>}
                          </div>
                        </div>
                        <Interrupteur actif={r.active} surChangement={() => basculerRegle(r)} etiquette={r.nom} />
                      </div>
                    );
                  })}
                </ListeEchelonnee>
              </>
            )}

            {onglet === "listes" && (
              <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
                <section>
                  <TeteCarte titre="Liste noire" sous="Refusé d'avance, sans question" />
                  <div className="pt-3">
                    <ListeEchelonnee>
                      {noire.map((e) => (
                        <div key={e.valeur} className="flex items-start gap-3 py-[11px] border-b border-bordure last:border-0">
                          <Pastille ton="critique" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[12.5px] font-semibold">{e.valeur}</span>
                              <Jeton ton="neutre" point={false} enfants={e.type} />
                              {e.permanente && <Jeton ton="critique" point={false} enfants="permanente" />}
                            </div>
                            <p className="text-[12px] text-encre-2 mt-[2px]">{e.motif}</p>
                            <div className="text-[11px] text-encre-4 mt-[3px]">
                              {e.ajoutePar}, {e.ajouteLe} · {e.expire} · {fmt(e.occurrences)} tentatives refusées
                            </div>
                          </div>
                          <Bouton ton="fantome" taille="s" icone="croix" title="Lever le blocage"
                            onClick={() => ui.message("La levée d'un blocage est journalisée.", "info")} />
                        </div>
                      ))}
                    </ListeEchelonnee>
                  </div>
                </section>

                <section>
                  <TeteCarte titre="Liste blanche" sous="Normal, et qui n'a pas à être questionné" />
                  <div className="pt-3">
                    <ListeEchelonnee>
                      {listeBlanche.map((e) => (
                        <div key={e.valeur} className="flex items-start gap-3 py-[11px] border-b border-bordure last:border-0">
                          <Pastille ton="bon" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[12.5px] font-semibold">{e.valeur}</span>
                              <Jeton ton="neutre" point={false} enfants={e.type} />
                              {e.permanente && <Jeton ton="vigilance" point={false} enfants="sans échéance" />}
                            </div>
                            <p className="text-[12px] text-encre-2 mt-[2px]">{e.motif}</p>
                            <div className="text-[11px] text-encre-4 mt-[3px]">
                              {e.ajoutePar}, {e.ajouteLe} · {e.expire} · {fmt(e.occurrences)} connexions
                            </div>
                          </div>
                        </div>
                      ))}
                    </ListeEchelonnee>
                    <div className="mt-3 p-3 rounded-[4px] bg-vigilance-voile text-[12px] text-encre-2">
                      Une entrée de liste blanche sans échéance est un trou permanent. Deux des quatre
                      entrées ci-dessus en sont — c'est assumé pour le réseau interne, moins pour la
                      liaison du prestataire.
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </>
      } />

      <Apparition delai={120}>
        <Carte className="mt-4" enfants={
          <>
            <TeteCarte titre="Pourquoi presque rien ne bloque automatiquement"
              sous="Trois règles bloquent sur neuf, et c'est voulu" />
            <div className="pas-carte pt-3 text-[13px] text-encre-2 leading-[20px]">
              <p>
                Un blocage automatique sur un signal faible enferme dehors un agent légitime, souvent
                un dimanche soir, sans personne pour lui ouvrir. Le coût de l'erreur n'est pas
                symétrique : un signalement de trop se traite en trente secondes, un blocage de trop
                coûte une soirée à deux personnes et une confiance à reconstruire.
              </p>
              <p className="mt-3">
                Les trois règles qui bloquent ont en commun de ne jamais se déclencher sur un usage
                normal : une rafale de vingt échecs, un trajet physiquement impossible, un réseau conçu
                pour masquer l'origine. Les six autres signalent — et c'est un humain qui tranche.
              </p>
            </div>
          </>
        } />
      </Apparition>
    </>
  );
}
