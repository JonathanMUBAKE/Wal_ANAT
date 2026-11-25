import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { exporterCSV, fmt, initiales, normaliser } from "../lib/format";
import { sessionsInitiales, type Session } from "../lib/sigrh";

/* Sessions : qui est connecté, depuis où, et depuis quand. La colonne « lieu »
   est la plus utile : une connexion hors du réseau de l'Agence mérite un
   regard, même quand tout le reste est normal. */
export function Sessions() {
  const ui = useUI();
  const [sessions, poserSessions] = useState<Session[]>(sessionsInitiales);
  const [q, poserQ] = useState("");
  const [risque, poserRisque] = useState("");
  const [sansDeuxFacteurs, poserSansDeuxFacteurs] = useState(false);

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return sessions.filter((s) =>
      (!n || normaliser(`${s.agent} ${s.direction} ${s.ip} ${s.navigateur} ${s.lieu}`).includes(n)) &&
      (!risque || s.risque === risque) &&
      (!sansDeuxFacteurs || !s.deuxFacteurs));
  }, [sessions, q, risque, sansDeuxFacteurs]);

  const aVerifier = sessions.filter((s) => s.risque === "à vérifier").length;
  const sans2F = sessions.filter((s) => !s.deuxFacteurs).length;

  async function revoquer(s: Session) {
    if (s.courante) return ui.message("Impossible de révoquer votre propre session depuis cet écran.", "critique");
    const ok = await ui.confirmer({
      titre: `Révoquer la session de ${s.agent} ?`,
      texte: `L'appareil (${s.navigateur}) sera déconnecté immédiatement. L'agent devra se reconnecter ; son compte reste actif.`,
      bouton: "Révoquer", ton: "danger",
    });
    if (!ok) return;
    const avant = s;
    poserSessions((l) => l.filter((x) => x.id !== s.id));
    ui.message(`Session de ${s.agent} révoquée.`, "bon", {
      annuler: () => poserSessions((l) => [...l, avant].sort((a, b) => a.id.localeCompare(b.id))),
    });
  }

  async function revoquerTout() {
    const cibles = sessions.filter((s) => !s.courante);
    const ok = await ui.confirmer({
      titre: `Révoquer ${cibles.length} sessions ?`,
      texte: "Tous les agents connectés, sauf vous, seront déconnectés immédiatement. Ils devront se reconnecter. C'est le geste à faire après une fuite de mot de passe.",
      bouton: "Tout révoquer", ton: "danger", mot: "REVOQUER",
    });
    if (!ok) return;
    poserSessions((l) => l.filter((s) => s.courante));
    ui.message(`${cibles.length} sessions révoquées.`, "bon");
  }

  function detail(s: Session) {
    ui.ouvrirTiroir({
      titre: s.agent,
      sous: <><span className="font-mono">{s.id}</span> · {s.direction}</>,
      onglets: [
        { nom: "Session", contenu: (
          <Definitions lignes={[
            ["Appareil", s.appareil],
            ["Navigateur", s.navigateur],
            ["Adresse", <span className="font-mono">{s.ip}</span>],
            ["Lieu", s.risque === "à vérifier"
              ? <span className="text-vigilance font-semibold">{s.lieu}</span> : s.lieu],
            ["Deux facteurs", s.deuxFacteurs
              ? <Jeton ton="bon" enfants="vérifié" />
              : <Jeton ton="vigilance" enfants="non vérifié" />],
            ["Ouverte", s.ouverte],
            ["Dernière action", s.derniereAction],
            ["Session courante", s.courante ? "oui — c'est la vôtre" : "non"],
          ]} />
        )},
      ],
      pied: s.courante
        ? <p className="text-[12px] text-encre-3">C'est votre session : elle ne peut pas être révoquée d'ici.</p>
        : <Bouton ton="danger" icone="deconnexion" onClick={() => { ui.fermerTiroir(); revoquer(s); }} enfants="Révoquer cette session" />,
    });
  }

  const colonnes: Colonne<Session>[] = [
    { cle: "agent", nom: "Agent", triable: true, fixe: true, rendu: (s) => (
      <div className="flex items-center gap-[9px] min-w-0">
        <span className="w-6 h-6 rounded-full bg-surface-3 border border-bordure grid place-items-center text-[10px] font-semibold shrink-0">
          {initiales(s.agent)}
        </span>
        <span className="flex flex-col min-w-0">
          <span className="font-medium truncate">{s.agent}{s.courante && <span className="ml-[6px] text-[11px] text-accent">vous</span>}</span>
          <span className="text-[11.5px] text-encre-3 truncate">{s.direction}</span>
        </span>
      </div>
    )},
    { cle: "appareil", nom: "Appareil", triable: true, rendu: (s) => (
      <span className="inline-flex items-center gap-[6px]">
        <Icone nom={s.appareil === "Téléphone" || s.appareil === "Tablette" ? "moniteur" : "serveur"} taille="s" className="text-encre-4" />
        {s.appareil}
      </span>
    )},
    { cle: "navigateur", nom: "Navigateur", triable: true, rendu: (s) => <span className="text-encre-2">{s.navigateur}</span> },
    { cle: "ip", nom: "Adresse", rendu: (s) => <span className="font-mono text-[12px] text-encre-3">{s.ip}</span> },
    { cle: "lieu", nom: "Lieu", triable: true, rendu: (s) =>
      s.risque === "à vérifier"
        ? <Jeton ton="vigilance" enfants={s.lieu} />
        : <span className="text-encre-2">{s.lieu}</span> },
    { cle: "deuxFacteurs", nom: "2 facteurs", triable: true, rendu: (s) =>
      s.deuxFacteurs ? <Jeton ton="bon" enfants="vérifié" /> : <Jeton ton="neutre" point={false} enfants="non" /> },
    { cle: "ouverte", nom: "Ouverte", triable: true, rendu: (s) => <span className="text-encre-2 whitespace-nowrap">{s.ouverte}</span> },
    { cle: "derniereAction", nom: "Dernière action", triable: true, rendu: (s) => <span className="text-encre-3 whitespace-nowrap">{s.derniereAction}</span> },
  ];

  return (
    <>
      <Entete
        titre="Sessions"
        sous="Qui est connecté au SIGRH, depuis quel appareil et depuis où."
        actions={
          <>
            <Bouton icone="telecharger" onClick={() => { exporterCSV("sessions", filtres); ui.message("Sessions exportées.", "bon"); }} enfants="Exporter" />
            <Bouton ton="danger" icone="deconnexion" onClick={revoquerTout} enfants="Tout révoquer" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sessions ouvertes" valeur={fmt(sessions.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="À vérifier" valeur={fmt(aVerifier)} ton={aVerifier ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Sans deuxième facteur" valeur={fmt(sans2F)} ton={sans2F ? "vigilance" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Durée autorisée" valeur="60 min d'inactivité" />} />
      </div>

      {aVerifier > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-[4px] mb-4 bg-vigilance-voile border border-vigilance/40 anim-apparait">
          <Icone nom="bouclier" className="text-vigilance mt-[2px]" />
          <div className="flex-1 min-w-0 text-[13px]">
            <b>{aVerifier} session{aVerifier > 1 ? "s sont ouvertes" : " est ouverte"} hors du réseau de l'Agence.</b>{" "}
            <span className="text-encre-2">Ce n'est pas anormal en télétravail, mais cela mérite un regard quand le deuxième facteur n'est pas vérifié.</span>
          </div>
          <Bouton taille="s" onClick={() => { poserRisque("à vérifier"); poserSansDeuxFacteurs(false); }} enfants="Les isoler" />
        </div>
      )}

      <Carte enfants={
        <TableauDonnees
          lignes={filtres} colonnes={colonnes} cle={(s) => s.id}
          totalBrut={sessions.length} nomEntite={["session", "sessions"]}
          triInitial={{ cle: "derniereAction", sens: "asc" }}
          surLigne={detail}
          vide={{
            titre: "Aucune session", texte: "Aucune session ne correspond à ces filtres.",
            actions: <Bouton onClick={() => { poserQ(""); poserRisque(""); poserSansDeuxFacteurs(false); }} enfants="Réinitialiser les filtres" />,
          }}
          barreOutils={
            <>
              <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                <Icone nom="recherche" taille="s" />
                <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                  placeholder="Agent, direction, adresse…" aria-label="Rechercher une session"
                  className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
              </div>
              <select value={risque} onChange={(e) => poserRisque(e.target.value)} aria-label="Filtrer par lieu"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Tous les lieux</option>
                <option value="normal">Réseau de l'Agence</option>
                <option value="à vérifier">Hors réseau</option>
              </select>
              <Bouton actif={sansDeuxFacteurs} icone="bouclier"
                onClick={() => poserSansDeuxFacteurs((v) => !v)} enfants="Sans deuxième facteur" />
            </>
          }
          actionsLigne={(s) => (
            <>
              <Bouton ton="fantome" taille="s" icone="oeil" title="Détail" onClick={() => detail(s)} />
              {!s.courante && <Bouton ton="fantome" taille="s" icone="deconnexion" title="Révoquer" onClick={() => revoquer(s)} />}
            </>
          )}
          actionsLot={(ids, vider) => (
            <Bouton taille="s" ton="danger" icone="deconnexion" onClick={async () => {
              const ok = await ui.confirmer({
                titre: `Révoquer ${ids.length} sessions ?`,
                texte: "Les appareils concernés seront déconnectés immédiatement. Les comptes restent actifs.",
                bouton: "Révoquer", ton: "danger",
              });
              if (!ok) return;
              poserSessions((l) => l.filter((s) => !ids.includes(s.id) || s.courante));
              vider(); ui.message(`${ids.length} sessions révoquées.`, "bon");
            }} enfants="Révoquer" />
          )}
        />
      } />
    </>
  );
}
