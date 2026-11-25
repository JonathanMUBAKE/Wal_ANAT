import { useMemo, useState } from "react";
import { Bouton, Carte, Jeton } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { comptes as comptesInitiaux, ESPACES, ROLES, permissions, rolesDroits, droitsInitiaux, type Compte } from "../lib/donnees";
import { exporterCSV, initiales, normaliser } from "../lib/format";

const ETIQUETTE_STATUT = { actif: "Actif", invite: "Invité", suspendu: "Suspendu" } as const;
const TON_STATUT = { actif: "bon", invite: "vigilance", suspendu: "critique" } as const;

export function Utilisateurs() {
  const ui = useUI();
  const [comptes, poserComptes] = useState<Compte[]>(comptesInitiaux);
  const [q, poserQ] = useState("");
  const [role, poserRole] = useState("");
  const [statut, poserStatut] = useState("");
  const [espace, poserEspace] = useState("");

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return comptes.filter((u) =>
      (!n || normaliser(`${u.nom} ${u.courriel} ${u.id}`).includes(n)) &&
      (!role || u.role === role) && (!statut || u.statut === statut) && (!espace || u.espace === espace));
  }, [comptes, q, role, statut, espace]);

  const reinitialiser = () => { poserQ(""); poserRole(""); poserStatut(""); poserEspace(""); };

  const majStatut = (ids: string[], valeur: Compte["statut"]) =>
    poserComptes((l) => l.map((u) => ids.includes(u.id) ? { ...u, statut: valeur } : u));

  async function suspendre(u: Compte) {
    if (u.statut === "suspendu") {
      majStatut([u.id], "actif");
      return ui.message(`${u.nom} a été réactivé.`, "bon");
    }
    const ok = await ui.confirmer({
      titre: `Suspendre ${u.nom} ?`,
      texte: "Ses sessions seront fermées immédiatement et il ne pourra plus se connecter. Les données et l'historique sont conservés.",
      bouton: "Suspendre", ton: "danger",
    });
    if (!ok) return;
    const avant = u.statut;
    majStatut([u.id], "suspendu");
    ui.message(`${u.nom} a été suspendu.`, "bon", {
      annuler: () => { majStatut([u.id], avant); ui.message("Suspension annulée.", "info"); },
    });
  }

  async function reinitialiserAcces(u: Compte) {
    const ok = await ui.confirmer({
      titre: `Réinitialiser l'accès de ${u.nom} ?`,
      texte: `Un lien à usage unique, valable 30 minutes, sera envoyé à ${u.courriel}. Les sessions ouvertes restent actives.`,
      bouton: "Envoyer le lien", ton: "info",
    });
    if (ok) ui.message(`Lien de réinitialisation envoyé à ${u.courriel}`, "bon");
  }

  function detail(u: Compte) {
    const i = rolesDroits.indexOf(u.role);
    ui.ouvrirTiroir({
      titre: u.nom,
      sous: <><span className="font-mono">{u.id}</span> · {u.courriel}</>,
      onglets: [
        { nom: "Profil", contenu: (
          <Definitions lignes={[
            ["Rôle", u.role], ["Espace", u.espace],
            ["Statut", <Jeton ton={TON_STATUT[u.statut]} enfants={ETIQUETTE_STATUT[u.statut]} />],
            ["Deux facteurs", u.deuxFacteurs ? "activé" : <b className="text-vigilance">non activé</b>],
            ["Créé le", new Date(u.cree).toLocaleDateString("fr-FR")],
            ["Sessions ouvertes", String(u.sessions)],
          ]} />
        )},
        { nom: "Sessions", contenu: u.sessions === 0
          ? <p className="text-[13px] text-encre-3">Aucune session ouverte.</p>
          : (
            <div>
              {Array.from({ length: u.sessions }, (_, k) => (
                <div key={k} className="flex items-center gap-2 py-[9px] border-b border-bordure last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">
                      {["Chrome · Windows", "Safari · iPhone", "Firefox · Linux"][k % 3]}
                      {k === 0 && <span className="ml-1"><Jeton ton="bon" enfants="courante" /></span>}
                    </div>
                    <div className="text-[12px] text-encre-3">Libreville · ouverte il y a {(k + 1) * 7} h</div>
                  </div>
                  <Bouton taille="s" onClick={() => ui.message("Session révoquée. L'appareil devra se reconnecter.", "bon")} enfants="Révoquer" />
                </div>
              ))}
            </div>
          )},
        { nom: "Droits", contenu: (
          <>
            <p className="text-[12px] text-encre-3 mb-3">Droits hérités du rôle « {u.role} ».</p>
            <Definitions lignes={permissions.map((p) => [
              p.nom,
              <Jeton ton={i >= 0 && droitsInitiaux[p.cle][i].etat === "complet" ? "bon" : "neutre"}
                enfants={i >= 0 ? droitsInitiaux[p.cle][i].etat : "aucun"} />,
            ])} />
          </>
        )},
      ],
      pied: (
        <>
          <Bouton icone="cle" onClick={() => reinitialiserAcces(u)} enfants="Réinitialiser l'accès" />
          <Bouton ton={u.statut === "suspendu" ? "neutre" : "danger"} className="ml-auto"
            onClick={() => { ui.fermerTiroir(); suspendre(u); }}
            enfants={u.statut === "suspendu" ? "Réactiver le compte" : "Suspendre le compte"} />
        </>
      ),
    });
  }

  const colonnes: Colonne<Compte>[] = [
    { cle: "nom", nom: "Compte", triable: true, fixe: true, rendu: (u) => (
      <div className="flex items-center gap-[9px] min-w-0">
        <span className="w-6 h-6 rounded-full bg-surface-3 border border-bordure-2 grid place-items-center text-[10.5px] font-semibold shrink-0">
          {initiales(u.nom)}
        </span>
        <span className="flex flex-col min-w-0">
          <span className="font-medium truncate">{u.nom}</span>
          <span className="text-[11.5px] text-encre-3 truncate">{u.courriel}</span>
        </span>
      </div>
    )},
    { cle: "role", nom: "Rôle", triable: true, rendu: (u) => u.role },
    { cle: "espace", nom: "Espace", triable: true, rendu: (u) => u.espace },
    { cle: "statut", nom: "Statut", triable: true, rendu: (u) => (
      <Jeton ton={TON_STATUT[u.statut]} enfants={ETIQUETTE_STATUT[u.statut]} />
    )},
    { cle: "deuxFacteurs", nom: "2 facteurs", triable: true, rendu: (u) =>
      u.deuxFacteurs ? <Jeton ton="bon" enfants="activé" /> : <Jeton ton="neutre" point={false} enfants="non activé" /> },
    { cle: "sessions", nom: "Sessions", num: true, triable: true, rendu: (u) => u.sessions || "—" },
    { cle: "derniere", nom: "Dernière activité", triable: true, rendu: (u) =>
      u.derniere === 0 ? "à l'instant" : u.derniere < 24 ? `il y a ${u.derniere} h` : `il y a ${Math.round(u.derniere / 24)} j` },
    { cle: "cree", nom: "Créé le", triable: true, rendu: (u) => new Date(u.cree).toLocaleDateString("fr-FR") },
  ];

  return (
    <Carte enfants={
      <TableauDonnees
        lignes={filtres} colonnes={colonnes} cle={(u) => u.id}
        totalBrut={comptes.length} nomEntite={["compte", "comptes"]}
        triInitial={{ cle: "derniere", sens: "asc" }}
        surLigne={detail}
        vide={{
          titre: "Aucun compte ne correspond",
          texte: "Élargissez la recherche ou retirez un filtre pour retrouver des résultats.",
          actions: <Bouton onClick={reinitialiser} enfants="Réinitialiser les filtres" />,
        }}
        barreOutils={
          <>
            <div className="flex items-center gap-2 h-8 px-[10px] min-w-[250px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent">
              <Icone nom="recherche" taille="s" />
              <input
                type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                placeholder="Nom, adresse, identifiant…" aria-label="Rechercher un compte"
                className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4"
              />
            </div>
            <Select valeur={role} poser={poserRole} tout="Tous les rôles" options={ROLES} />
            <Select valeur={statut} poser={poserStatut} tout="Tous les statuts"
              options={["actif", "invite", "suspendu"]} etiquettes={ETIQUETTE_STATUT} />
            <Select valeur={espace} poser={poserEspace} tout="Tous les espaces" options={ESPACES} />
            <Bouton icone="croix" aria-label="Réinitialiser les filtres" title="Réinitialiser les filtres" onClick={reinitialiser} />
            <Bouton icone="telecharger" onClick={() => {
              exporterCSV("comptes", filtres); ui.message("Export des comptes filtrés lancé.", "bon");
            }} enfants="Exporter" />
            <Bouton ton="principal" icone="plus"
              onClick={() => ui.message("Formulaire d'invitation à brancher sur POST /invitations.", "info")} enfants="Inviter" />
          </>
        }
        actionsLigne={(u) => (
          <>
            <Bouton ton="fantome" taille="s" icone="oeil" title="Détail" onClick={() => detail(u)} />
            <Bouton ton="fantome" taille="s" icone="cle" title="Réinitialiser le mot de passe" onClick={() => reinitialiserAcces(u)} />
            <Bouton ton="fantome" taille="s" icone={u.statut === "suspendu" ? "lecture" : "pause"}
              title={u.statut === "suspendu" ? "Réactiver" : "Suspendre"} onClick={() => suspendre(u)} />
          </>
        )}
        actionsLot={(ids, vider) => (
          <>
            <Bouton taille="s" icone="pause" onClick={async () => {
              const ok = await ui.confirmer({
                titre: `Suspendre ${ids.length} comptes ?`,
                texte: "Toutes leurs sessions seront fermées immédiatement. L'opération est réversible et journalisée.",
                bouton: "Suspendre", ton: "danger",
              });
              if (!ok) return;
              const avant = comptes.filter((u) => ids.includes(u.id)).map((u) => [u.id, u.statut] as const);
              majStatut(ids, "suspendu"); vider();
              ui.message(`${ids.length} comptes suspendus.`, "bon", {
                annuler: () => {
                  poserComptes((l) => l.map((u) => {
                    const a = avant.find(([id]) => id === u.id);
                    return a ? { ...u, statut: a[1] } : u;
                  }));
                  ui.message("Opération annulée.", "info");
                },
              });
            }} enfants="Suspendre" />
            <Bouton taille="s" icone="lecture" onClick={() => { majStatut(ids, "actif"); vider(); ui.message(`${ids.length} comptes réactivés.`, "bon"); }} enfants="Réactiver" />
            <Bouton taille="s" icone="cle" onClick={async () => {
              const ok = await ui.confirmer({
                titre: `Réinitialiser l'accès de ${ids.length} comptes ?`,
                texte: "Chaque compte recevra un lien à usage unique valable 30 minutes.",
                bouton: "Envoyer les liens", ton: "info",
              });
              if (ok) { ui.message(`${ids.length} liens envoyés.`, "bon"); vider(); }
            }} enfants="Réinitialiser le mot de passe" />
            <Bouton taille="s" icone="telecharger" onClick={() => {
              exporterCSV("comptes-selection", comptes.filter((u) => ids.includes(u.id)));
              ui.message(`${ids.length} comptes exportés.`, "bon");
            }} enfants="Exporter" />
            <Bouton taille="s" ton="danger" icone="corbeille" onClick={async () => {
              const ok = await ui.confirmer({
                titre: `Supprimer ${ids.length} comptes ?`,
                texte: "La suppression est définitive : identités, sessions et jetons sont effacés. Le journal d'audit conserve la trace de l'opération.",
                bouton: "Supprimer définitivement", ton: "danger", mot: "SUPPRIMER",
              });
              if (!ok) return;
              poserComptes((l) => l.filter((u) => !ids.includes(u.id)));
              vider(); ui.message(`${ids.length} comptes supprimés.`, "bon");
            }} enfants="Supprimer" />
          </>
        )}
      />
    } />
  );
}

function Select({ valeur, poser, tout, options, etiquettes }: {
  valeur: string; poser: (v: string) => void; tout: string;
  options: readonly string[]; etiquettes?: Record<string, string>;
}) {
  return (
    <select
      value={valeur} onChange={(e) => poser(e.target.value)} aria-label={tout}
      className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px] cursor-pointer"
    >
      <option value="">{tout}</option>
      {options.map((o) => <option key={o} value={o}>{etiquettes?.[o] ?? o}</option>)}
    </select>
  );
}
