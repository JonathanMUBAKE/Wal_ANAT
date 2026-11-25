import { useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, Onglets, Pastille, Progression } from "../composants/Primitives";
import { Apparition, ListeEchelonnee, NombreAnime } from "../composants/Mouvement";
import { Etincelle } from "../composants/Graphique";
import { AssistantIA } from "../composants/AssistantIA";
import { Icone } from "../composants/Icone";
import { useUI } from "../composants/Superpositions";
import { cx, fmt } from "../lib/format";
import {
  anomalies, conformite, reglesPareFeu, scoreSecurite, secrets,
  tentatives, vulnerabilites, type Gravite4,
} from "../lib/exploitation";

const TON: Record<Gravite4, "critique" | "serieux" | "vigilance" | "neutre"> = {
  critique: "critique", "élevée": "serieux", moyenne: "vigilance", faible: "neutre",
};

/* Sécurité : ce qui est exposé, ce qui a été tenté, et ce qui n'est pas
   conforme. Le score du haut n'est pas une note : c'est un résumé qui
   renvoie vers l'axe le plus faible. Un score de 72 ne veut rien dire ;
   « correctifs à 48 » veut dire quelque chose. */
export function Securite() {
  const ui = useUI();
  const [onglet, poserOnglet] = useState("vulnerabilites");

  const exposees = vulnerabilites.filter((v) => v.exposee);
  const rafale = tentatives.filter((t) => t.tentatives > 20);
  const nonConformes = conformite.filter((c) => c.etat === "non conforme" || c.etat === "partiel");
  const secretsEnRetard = secrets.filter((s) => s.etat === "critique" || s.etat === "vigilance");
  const bloquees = tentatives.filter((t) => t.bloquee).length;
  const axeFaible = [...scoreSecurite.axes].sort((a, b) => a.note - b.note)[0];

  async function bloquerPlage(origine: string) {
    const ok = await ui.confirmer({
      titre: `Bloquer la plage de ${origine} ?`,
      texte: "Une règle de pare-feu refusera toute connexion depuis cette plage. Si un agent légitime s'y trouve — en déplacement, par exemple — il perdra l'accès sans message explicite.",
      bouton: "Bloquer la plage", ton: "danger",
    });
    if (ok) ui.message("Plage bloquée. La règle apparaît dans l'onglet Pare-feu.", "bon");
  }

  async function tournerSecret(nom: string) {
    const ok = await ui.confirmer({
      titre: `Renouveler « ${nom} » ?`,
      texte: "Un nouveau secret est généré et déployé sur les services qui s'en servent. L'ancien reste valable une heure, le temps du déploiement. Les services non redéployés dans ce délai cesseront de répondre.",
      bouton: "Renouveler", ton: "danger", mot: "RENOUVELER",
    });
    if (ok) ui.message(`« ${nom} » renouvelé. Déploiement en cours sur les services concernés.`, "bon");
  }

  return (
    <>
      <Entete
        titre="Sécurité"
        sous="Ce qui est exposé, ce qui a été tenté, et ce qui n'est pas conforme."
        actions={
          <>
            <Bouton icone="rafraichir" onClick={() => ui.message("Nouvelle passe d'analyse lancée : dépendances, configuration, habilitations.", "bon")} enfants="Analyser maintenant" />
            <Bouton icone="telecharger" onClick={() => ui.message("Rapport de sécurité en préparation.", "bon")} enfants="Rapport" />
          </>
        }
      />

      {/* Le score, et surtout l'axe qui le tire vers le bas */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)" }}>
        <Carte enfants={
          <div className="pas-carte">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0 w-[92px] h-[92px]">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-3)" strokeWidth="9" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" strokeLinecap="round"
                    stroke={scoreSecurite.global >= 85 ? "var(--bon)" : scoreSecurite.global >= 65 ? "var(--vigilance)" : "var(--critique)"}
                    strokeDasharray={`${(scoreSecurite.global / 100) * 264} 264`}
                    className="transition-[stroke-dasharray] duration-700 ease-[cubic-bezier(0,0,.2,1)]" />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-[23px] font-semibold tab-num leading-none">
                      <NombreAnime valeur={scoreSecurite.global} />
                    </div>
                    <div className="text-[10px] text-encre-3 mt-[2px]">sur 100</div>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold mb-1">Posture de sécurité</div>
                <p className="text-[12px] text-encre-2 leading-[17px]">
                  Le chiffre ne dit rien à lui seul. Ce qui compte est l'axe le plus faible :
                  <b className="text-encre"> {axeFaible.nom.toLowerCase()}, à {axeFaible.note}</b>.
                </p>
                <Etincelle valeurs={scoreSecurite.historique} couleur="--serie-1" hauteur={26} />
              </div>
            </div>
          </div>
        } />

        <Carte enfants={
          <div className="pas-carte grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {scoreSecurite.axes.map((a) => (
              <div key={a.nom}>
                <div className="flex items-baseline gap-2 mb-[4px]">
                  <span className="text-[12px] text-encre-3">{a.nom}</span>
                  <span className={cx("ml-auto text-[13px] font-semibold tab-num",
                    a.note >= 85 ? "text-bon" : a.note >= 65 ? "text-vigilance" : "text-critique")}>{a.note}</span>
                </div>
                <Progression valeur={a.note} ton={a.note >= 85 ? "bon" : a.note >= 65 ? "accent" : "critique"} />
                <div className="text-[10px] text-encre-4 mt-[3px]">poids {a.poids}</div>
              </div>
            ))}
          </div>
        } />
      </div>

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Failles exposées" valeur={<NombreAnime valeur={exposees.length} />} ton={exposees.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Failles connues" valeur={<NombreAnime valeur={vulnerabilites.length} />} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Tentatives bloquées" valeur={<NombreAnime valeur={bloquees} />} ton={bloquees ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Contrôles non tenus" valeur={<NombreAnime valeur={nonConformes.length} />} ton={nonConformes.length ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Secrets à renouveler" valeur={<NombreAnime valeur={secretsEnRetard.length} />} ton={secretsEnRetard.length ? "critique" : "bon"} />} />
      </div>

      {rafale.length > 0 && (
        <Apparition className="mb-4">
          <AssistantIA
            titre="Lecture des tentatives de connexion"
            invite={`Sur les ${tentatives.length} tentatives refusées des trois dernières heures.`}
            cout={0.016}
            surAction={() => bloquerPlage(rafale[0].origine)}
            constat={{
              resume: `Une rafale de ${fmt(rafale.reduce((a, t) => a + t.tentatives, 0))} tentatives vise le compte « admin » depuis quatre adresses d'une même plage, hors zone habituelle.`,
              cause: "Essai automatisé de mots de passe sur un nom de compte générique. Le compte « admin » n'existe pas dans le référentiel — toutes les tentatives échouent en « compte inconnu », ce qui exclut une fuite d'identifiants. Le rythme et la régularité des intervalles désignent un outil, pas une personne.",
              certitude: "élevée",
              preuves: rafale.slice(0, 3).map((t) => ({
                source: `${t.origine} · ${t.quand}`,
                extrait: `${t.tentatives} tentatives sur « ${t.compte} » — ${t.motif}`,
              })),
              pistes: [
                "Vérifier qu'aucun compte réel ne porte un nom générique : « admin », « root », « test ».",
                "Confirmer que la plage n'est pas celle d'un agent en déplacement avant de la bloquer.",
                "Si la rafale persiste après blocage, la source change d'adresse : passer à une limitation par débit plutôt que par plage.",
              ],
              action: {
                libelle: "Bloquer la plage au pare-feu",
                consequence: "Une règle refusera toute connexion depuis cette plage, y compris d'un agent légitime qui s'y trouverait.",
              },
            }}
          />
        </Apparition>
      )}

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "vulnerabilites", nom: "Failles", compte: vulnerabilites.length },
              { cle: "tentatives", nom: "Tentatives", compte: tentatives.length },
              { cle: "conformite", nom: "Conformité", compte: nonConformes.length },
              { cle: "pare-feu", nom: "Pare-feu", compte: reglesPareFeu.length },
              { cle: "secrets", nom: "Secrets", compte: secretsEnRetard.length },
            ]}
          />

          <div className="pas-carte">
            {onglet === "vulnerabilites" && (
              <ListeEchelonnee className="space-y-2">
                {vulnerabilites.map((v) => {
                  const anomalie = anomalies.find((a) => a.titre.includes(v.titre.slice(0, 24)));
                  return (
                    <div key={v.code} className={cx("p-4 rounded-[4px] border",
                      v.exposee ? "border-critique/45 bg-critique-voile" : "border-bordure bg-surface-2")}>
                      <div className="flex items-start gap-3 flex-wrap mb-2">
                        <Pastille ton={TON[v.gravite] === "neutre" ? "neutre" : TON[v.gravite]} pulse={v.exposee} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-semibold">{v.titre}</span>
                            <Jeton ton={TON[v.gravite]} enfants={`${v.gravite} · ${v.score}`} />
                            {v.exposee && <Jeton ton="critique" enfants="exposée" />}
                          </div>
                          <div className="text-[11px] text-encre-3 mt-[2px]">
                            <span className="font-mono">{v.code}</span> · {v.composant} {v.version} · publiée {v.publiee}
                          </div>
                        </div>
                      </div>
                      <p className="text-[12.5px] text-encre-2 mb-2">{v.effet}</p>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-encre-3 mb-3">
                        Services touchés :
                        {v.servicesTouches.map((s) => (
                          <span key={s} className="font-mono px-[6px] py-[1px] rounded-[3px] bg-surface-3">{s}</span>
                        ))}
                      </div>
                      <div className="flex items-start gap-2 p-[10px] rounded-[4px] bg-surface border border-bordure">
                        <Icone nom="check" taille="s" className="text-bon mt-[2px] shrink-0" />
                        <p className="text-[12.5px] text-encre-2 flex-1">{v.correction}</p>
                        {anomalie?.correctif && (
                          <Bouton taille="s" ton="principal" icone="etoiles" className="shrink-0"
                            onClick={() => ui.message(`Le correctif est prêt dans Anomalies · ${anomalie.code}.`, "info")}
                            enfants="Correctif prêt" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </ListeEchelonnee>
            )}

            {onglet === "tentatives" && (
              <div className="overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      {["Quand", "Compte visé", "Origine", "Motif", "Tentatives", "Appareil", "Suite"].map((t, i) => (
                        <th key={t} className={cx(
                          "sticky top-0 bg-surface-2 px-3 py-[9px] border-b border-bordure whitespace-nowrap",
                          "text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3",
                          i === 4 ? "text-right" : "text-left")}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tentatives.map((t) => (
                      <tr key={t.id} className={cx("hover:bg-surface-2 transi", t.tentatives > 20 && "bg-critique-voile")}>
                        <td className="px-3 pas-ligne border-b border-bordure text-encre-3 whitespace-nowrap">{t.quand}</td>
                        <td className="px-3 pas-ligne border-b border-bordure font-mono">{t.compte}</td>
                        <td className="px-3 pas-ligne border-b border-bordure">
                          <span className="font-mono text-[12px]">{t.origine}</span>
                          <span className={cx("block text-[11px]", t.pays.startsWith("Hors") ? "text-critique" : "text-encre-3")}>{t.pays}</span>
                        </td>
                        <td className="px-3 pas-ligne border-b border-bordure text-encre-2">{t.motif}</td>
                        <td className={cx("px-3 pas-ligne border-b border-bordure text-right tab-num", t.tentatives > 20 && "text-critique font-semibold")}>{t.tentatives}</td>
                        <td className="px-3 pas-ligne border-b border-bordure text-encre-3">{t.appareil}</td>
                        <td className="px-3 pas-ligne border-b border-bordure">
                          {t.bloquee ? <Jeton ton="critique" enfants="bloquée" /> : <span className="text-encre-4">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {onglet === "conformite" && (
              <ListeEchelonnee>
                {conformite.map((c) => (
                  <div key={c.cle} className="flex items-start gap-3 py-[12px] border-b border-bordure last:border-0">
                    <span className={cx("w-[24px] h-[24px] rounded-[4px] grid place-items-center shrink-0 mt-[2px]",
                      c.etat === "conforme" ? "bg-bon-voile text-bon"
                        : c.etat === "partiel" ? "bg-vigilance-voile text-vigilance"
                        : c.etat === "non conforme" ? "bg-critique-voile text-critique" : "bg-surface-3 text-encre-4")}>
                      <Icone nom={c.etat === "conforme" ? "check" : c.etat === "non conforme" ? "croix" : "alerte"} taille="s" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold">{c.intitule}</span>
                        <Jeton ton={c.etat === "conforme" ? "bon" : c.etat === "partiel" ? "vigilance" : c.etat === "non conforme" ? "critique" : "neutre"}
                          enfants={c.etat} />
                      </div>
                      <p className="text-[12px] text-encre-3 mt-[2px]">{c.exigence}</p>
                      <p className="text-[12.5px] text-encre-2 mt-[4px]">{c.constat}</p>
                      <div className="text-[11px] text-encre-4 mt-[4px]">
                        Preuve : {c.preuve} · vérifié {c.verifie}
                      </div>
                    </div>
                  </div>
                ))}
              </ListeEchelonnee>
            )}

            {onglet === "pare-feu" && (
              <ListeEchelonnee>
                {reglesPareFeu.map((r) => (
                  <div key={r.nom} className="flex items-start gap-3 py-[11px] border-b border-bordure last:border-0">
                    <Jeton ton={r.action === "autoriser" ? "bon" : "critique"} point={false} enfants={r.action} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold">{r.nom}</div>
                      <div className="font-mono text-[11.5px] text-encre-2 mt-[2px]">
                        {r.sens === "Entrant" ? "↓" : "↑"} {r.source} → {r.destination}
                      </div>
                      {r.commentaire && <p className="text-[12px] text-encre-3 mt-[3px]">{r.commentaire}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px] tab-num">{fmt(r.paquets30j, "compact")}</div>
                      <div className="text-[11px] text-encre-4">{r.derniere}</div>
                    </div>
                  </div>
                ))}
              </ListeEchelonnee>
            )}

            {onglet === "secrets" && (
              <>
                <p className="text-[12px] text-encre-3 mb-3">
                  Un secret qui ne tourne jamais finit par circuler : il se retrouve dans un ancien
                  fichier de configuration, dans un message, dans la tête de quelqu'un qui est parti.
                </p>
                <ListeEchelonnee>
                  {secrets.map((s) => (
                    <div key={s.nom} className="flex items-center gap-3 py-[11px] border-b border-bordure last:border-0">
                      <Pastille ton={s.etat} pulse={s.etat === "bon"} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold">{s.nom}</div>
                        <div className="text-[11px] text-encre-3 mt-[2px]">
                          {s.type} · rotation {s.rotation} · dernière {s.derniereRotation}
                        </div>
                      </div>
                      <span className={cx("text-[12px] tab-num shrink-0",
                        s.etat === "critique" ? "text-critique font-semibold" : s.etat === "vigilance" ? "text-vigilance" : "text-encre-2")}>
                        {s.prochaine}
                      </span>
                      {s.etat !== "bon" && (
                        <Bouton taille="s" ton={s.etat === "critique" ? "danger" : "neutre"}
                          onClick={() => tournerSecret(s.nom)} enfants="Renouveler" />
                      )}
                    </div>
                  ))}
                </ListeEchelonnee>
              </>
            )}
          </div>
        </>
      } />
    </>
  );
}
