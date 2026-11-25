import { useState } from "react";
import { BarreMini, Bouton, Carte, Entete, Jeton, LigneStat, Pastille, Progression, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, fmt } from "../lib/format";
import { filesInitiales, type FileAttente } from "../lib/sigrh";

/* Files d'attente : les travaux que le système s'est promis de faire et n'a
   pas encore faits. Deux chiffres comptent vraiment — l'âge du plus vieux
   message, et le nombre d'échecs. Le reste est du décor. */
export function Files() {
  const ui = useUI();
  const [files, poserFiles] = useState<FileAttente[]>(filesInitiales);

  const totalAttente = files.reduce((a, f) => a + f.enAttente, 0);
  const totalEchecs = files.reduce((a, f) => a + f.echecs, 0);
  const enPause = files.filter((f) => f.enPause).length;
  const sansConsommateur = files.filter((f) => f.consommateurs === 0);

  const etat = (f: FileAttente) =>
    f.consommateurs === 0 ? "critique" : f.echecs > 20 ? "critique" : f.echecs > 0 ? "vigilance" : "bon";

  async function pause(f: FileAttente) {
    if (!f.enPause) {
      const ok = await ui.confirmer({
        titre: `Mettre « ${f.nom} » en pause ?`,
        texte: "Les messages continuent d'arriver mais ne sont plus traités. La file va grossir — pensez à la reprendre.",
        bouton: "Mettre en pause", ton: "vigilance",
      });
      if (!ok) return;
    }
    poserFiles((l) => l.map((x) => x.nom === f.nom ? { ...x, enPause: !x.enPause, debit: x.enPause ? 120 : 0 } : x));
    ui.message(f.enPause ? `« ${f.nom} » reprise.` : `« ${f.nom} » mise en pause.`, "bon");
  }

  async function rejouer(f: FileAttente) {
    const ok = await ui.confirmer({
      titre: `Rejouer les ${f.echecs} échecs de « ${f.nom} » ?`,
      texte: "Les messages en échec repartent en tête de file. Si la cause n'est pas corrigée, ils échoueront de nouveau.",
      bouton: "Rejouer", ton: "info",
    });
    if (!ok) return;
    const avant = f.echecs;
    poserFiles((l) => l.map((x) => x.nom === f.nom ? { ...x, echecs: 0, enAttente: x.enAttente + avant } : x));
    ui.message(`${avant} messages remis en file.`, "bon", {
      annuler: () => poserFiles((l) => l.map((x) => x.nom === f.nom ? { ...x, echecs: avant, enAttente: x.enAttente - avant } : x)),
    });
  }

  async function purger(f: FileAttente) {
    const ok = await ui.confirmer({
      titre: `Vider « ${f.nom} » ?`,
      texte: `Les ${fmt(f.enAttente)} messages en attente et les ${f.echecs} messages en échec seront détruits. Rien ne sera traité, et rien ne pourra être récupéré.`,
      bouton: "Vider définitivement", ton: "danger", mot: f.nom,
    });
    if (!ok) return;
    poserFiles((l) => l.map((x) => x.nom === f.nom ? { ...x, enAttente: 0, echecs: 0, plusVieux: "—" } : x));
    ui.message(`« ${f.nom} » vidée.`, "bon");
  }

  function detail(f: FileAttente) {
    ui.ouvrirTiroir({
      titre: f.nom,
      sous: f.role,
      onglets: [
        { nom: "État", contenu: (
          <Definitions lignes={[
            ["Rôle", f.role],
            ["En attente", fmt(f.enAttente)],
            ["En cours de traitement", fmt(f.enCours)],
            ["En échec", <span className={f.echecs ? "text-critique font-semibold" : ""}>{fmt(f.echecs)}</span>],
            ["Débit", f.debit ? `${fmt(f.debit)} messages/min` : "arrêté"],
            ["Âge du plus ancien", f.plusVieux],
            ["Consommateurs", f.consommateurs === 0
              ? <span className="text-critique font-semibold">aucun — personne ne dépile</span>
              : `${f.consommateurs} en service`],
            ["État", <Jeton ton={etat(f)} enfants={f.enPause ? "en pause" : f.consommateurs === 0 ? "abandonnée" : "active"} />],
          ]} />
        )},
        { nom: "Derniers échecs", contenu: f.echecs === 0
          ? <p className="text-[13px] text-encre-3">Aucun message en échec sur cette file.</p>
          : (
            <div className="font-mono text-[12px] leading-[1.7] bg-fond rounded-[4px] border border-bordure p-3">
              {Array.from({ length: Math.min(6, f.echecs) }, (_, i) => (
                <div key={i} className="py-[2px] border-b border-bordure last:border-0">
                  <span className="text-encre-4">msg_{(1000 + i).toString(36)}</span>{" "}
                  <span className="text-critique">échec</span>{" "}
                  <span className="text-encre-2">destinataire injoignable après 3 tentatives</span>
                </div>
              ))}
            </div>
          )},
      ],
      pied: (
        <>
          {f.echecs > 0 && <Bouton icone="rafraichir" onClick={() => { ui.fermerTiroir(); rejouer(f); }} enfants="Rejouer les échecs" />}
          <Bouton ton="danger" className="ml-auto" icone="corbeille" onClick={() => { ui.fermerTiroir(); purger(f); }} enfants="Vider la file" />
        </>
      ),
    });
  }

  return (
    <>
      <Entete
        titre="Files d'attente"
        sous="Les travaux que le système s'est promis de faire et n'a pas encore faits."
        actions={
          <Bouton icone="rafraichir" onClick={() => ui.message("État des files rafraîchi.", "bon", { duree: 1500 })} enfants="Actualiser" />
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Messages en attente" valeur={fmt(totalAttente)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En échec" valeur={fmt(totalEchecs)} ton={totalEchecs ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Files en pause" valeur={String(enPause)} ton={enPause ? "vigilance" : undefined} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sans consommateur" valeur={String(sansConsommateur.length)} ton={sansConsommateur.length ? "critique" : "bon"} />} />
      </div>

      {sansConsommateur.length > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-critique-voile border border-critique/40 anim-apparait">
          <Icone nom="alerte" className="text-critique mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,220px)] text-[13px]">
            <b>Personne ne dépile « {sansConsommateur.map((f) => f.nom).join(", ")} ».</b>{" "}
            <span className="text-encre-2">
              Les messages s'accumulent sans être traités — ici, {fmt(sansConsommateur.reduce((a, f) => a + f.echecs, 0))} écritures
              de paie restent en échec depuis plus de deux heures.
            </span>
          </div>
          <Bouton taille="s" onClick={() => ui.message("Demande de redémarrage des consommateurs transmise.", "bon")} enfants="Redémarrer les consommateurs" />
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))" }}>
        {files.map((f, i) => {
          const charge = Math.min(100, (f.enAttente / 1500) * 100);
          return (
            <Carte key={f.nom} className={cx("anim-entre", etat(f) === "critique" && "border-critique/50")} enfants={
              <div style={{ animationDelay: i * 30 + "ms" }}>
                <TeteCarte
                  titre={f.nom}
                  sous={f.role}
                  outils={
                    <>
                      <Bouton taille="s" icone={f.enPause ? "lecture" : "pause"} title={f.enPause ? "Reprendre" : "Mettre en pause"} onClick={() => pause(f)} />
                      <Bouton taille="s" icone="oeil" title="Détail" onClick={() => detail(f)} />
                    </>
                  }
                />
                <div className="pas-carte pt-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Pastille ton={etat(f)} pulse={!f.enPause && f.consommateurs > 0} />
                    <span className="text-[12px] text-encre-2">
                      {f.enPause ? "en pause" : f.consommateurs === 0 ? "abandonnée — aucun consommateur" : `${f.consommateurs} consommateurs · ${fmt(f.debit)}/min`}
                    </span>
                  </div>

                  <div className="flex items-end gap-4 mb-3">
                    <div>
                      <div className="text-[23px] font-semibold tab-num leading-[1.1]">{fmt(f.enAttente)}</div>
                      <div className="text-[11px] text-encre-3">en attente</div>
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold tab-num text-accent">{fmt(f.enCours)}</div>
                      <div className="text-[11px] text-encre-3">en cours</div>
                    </div>
                    <div>
                      <div className={cx("text-[15px] font-semibold tab-num", f.echecs ? "text-critique" : "text-encre-3")}>{fmt(f.echecs)}</div>
                      <div className="text-[11px] text-encre-3">en échec</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-[13px] tab-num">{f.plusVieux}</div>
                      <div className="text-[11px] text-encre-3">plus ancien</div>
                    </div>
                  </div>

                  <Progression valeur={charge} ton={charge > 80 ? "critique" : charge > 50 ? "accent" : "bon"} />

                  <div className="flex items-center gap-2 mt-3">
                    {f.echecs > 0 && <Bouton taille="s" icone="rafraichir" onClick={() => rejouer(f)} enfants={`Rejouer ${f.echecs}`} />}
                    <Bouton taille="s" ton="fantome" className="ml-auto" icone="corbeille" onClick={() => purger(f)} enfants="Vider" />
                  </div>
                </div>
              </div>
            } />
          );
        })}
      </div>

      <Carte className="mt-4" enfants={
        <>
          <TeteCarte titre="Débit comparé" sous="Messages traités par minute, sur la dernière heure" />
          <div className="pas-carte pt-3">
            {files.map((f) => (
              <div key={f.nom} className="flex items-center gap-3 py-[6px] text-[13px]">
                <span className="w-[140px] shrink-0 font-mono text-[12px] truncate">{f.nom}</span>
                <BarreMini valeur={(f.debit / 1300) * 100} ton={f.debit === 0 ? "critique" : "accent"} largeur={180} />
                <span className="ml-auto tab-num text-encre-2">{f.debit ? fmt(f.debit) + " /min" : "arrêté"}</span>
              </div>
            ))}
          </div>
        </>
      } />
    </>
  );
}
