import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { LigneAssistant } from "../composants/AssistantIA";
import { Definitions, useUI } from "../composants/Superpositions";
import { exporterCSV, fmt, normaliser } from "../lib/format";
import { envois as envoisInitiaux, type Envoi } from "../lib/communication";

const TON = {
  "délivré": "bon", "lu": "bon", "envoyé": "accent", "en attente": "neutre", "échec": "critique",
} as const;
const ICONE = { "Messagerie": "enveloppe", "SMS": "telephone", "WhatsApp": "discussion" } as const;

/* Envois : la preuve qu'un message est parti, et la raison quand il n'est pas
   arrivé. C'est la page qu'on ouvre quand un agent dit « je n'ai rien reçu ». */
export function Envois() {
  const ui = useUI();
  const [envois, poserEnvois] = useState<Envoi[]>(envoisInitiaux);
  const [q, poserQ] = useState("");
  const [canal, poserCanal] = useState("");
  const [etat, poserEtat] = useState("");

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return envois.filter((e) =>
      (!n || normaliser(`${e.destinataire} ${e.destination} ${e.modele} ${e.id}`).includes(n)) &&
      (!canal || e.canal === canal) && (!etat || e.etat === etat));
  }, [envois, q, canal, etat]);

  const echecs = envois.filter((e) => e.etat === "échec");
  const enAttente = envois.filter((e) => e.etat === "en attente").length;
  const cout = envois.reduce((a, e) => a + e.cout, 0);
  const motifDominant = useMemo(() => {
    const compte = new Map<string, number>();
    echecs.forEach((e) => compte.set(e.motif, (compte.get(e.motif) ?? 0) + 1));
    return [...compte.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [echecs]);

  async function rejouer(ids: string[], vider?: () => void) {
    const ok = await ui.confirmer({
      titre: `Renvoyer ${ids.length} message${ids.length > 1 ? "s" : ""} ?`,
      texte: "Les messages repartent sur le même canal. Si la cause de l'échec n'est pas corrigée — une adresse qui n'existe pas, par exemple — ils échoueront de nouveau et abîmeront la réputation du domaine.",
      bouton: "Renvoyer", ton: "vigilance",
    });
    if (!ok) return;
    poserEnvois((l) => l.map((e) => ids.includes(e.id) ? { ...e, etat: "en attente", tentatives: e.tentatives + 1, motif: "" } : e));
    vider?.();
    ui.message(`${ids.length} message${ids.length > 1 ? "s remis" : " remis"} en file.`, "bon");
  }

  const colonnes: Colonne<Envoi>[] = [
    { cle: "quand", nom: "Quand", triable: true, fixe: true,
      rendu: (e) => <span className="text-encre-3 whitespace-nowrap">{e.quand}</span> },
    { cle: "canal", nom: "Canal", triable: true, rendu: (e) => (
      <span className="inline-flex items-center gap-[6px]">
        <Icone nom={ICONE[e.canal]} taille="s" className="text-encre-4" />{e.canal}
      </span>
    )},
    { cle: "modele", nom: "Modèle", triable: true, rendu: (e) => <span className="font-medium">{e.modele}</span> },
    { cle: "destinataire", nom: "Destinataire", triable: true, rendu: (e) => (
      <span className="flex flex-col min-w-0">
        <span className="truncate">{e.destinataire}</span>
        <span className="font-mono text-[11px] text-encre-3 truncate">{e.destination}</span>
      </span>
    )},
    { cle: "etat", nom: "État", triable: true, rendu: (e) => (
      <span title={e.motif}><Jeton ton={TON[e.etat]} enfants={e.etat} /></span>
    )},
    { cle: "tentatives", nom: "Tentatives", num: true, triable: true, rendu: (e) => e.tentatives },
    { cle: "motif", nom: "Motif", rendu: (e) =>
      e.motif ? <span className="text-critique text-[12px]">{e.motif}</span> : <span className="text-encre-4">—</span> },
    { cle: "declencheur", nom: "Déclenché par", triable: true, rendu: (e) => <span className="text-encre-2">{e.declencheur}</span> },
    { cle: "cout", nom: "Coût", num: true, triable: true, rendu: (e) =>
      e.cout ? <span className="tab-num">{e.cout.toFixed(3)} €</span> : <span className="text-encre-4">—</span> },
  ];

  return (
    <>
      <Entete
        titre="Envois"
        sous="La preuve qu'un message est parti, et la raison quand il n'est pas arrivé."
        actions={
          <Bouton icone="telecharger"
            onClick={() => { exporterCSV("envois", filtres); ui.message("Journal des envois exporté.", "bon"); }}
            enfants="Exporter" />
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Envois affichés" valeur={fmt(envois.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Remis ou lus" valeur={fmt(envois.filter((e) => e.etat === "délivré" || e.etat === "lu").length)} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En attente" valeur={String(enAttente)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En échec" valeur={String(echecs.length)} ton={echecs.length ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Coût cumulé" valeur={`${cout.toFixed(2)} €`} />} />
      </div>

      {motifDominant && (
        <div className="mb-4">
          <LigneAssistant
            texte={
              <>
                <b className="text-encre">Les échecs ne sont pas aléatoires.</b> Sur {echecs.length} messages
                en échec, {motifDominant[1]} portent le même motif — « {motifDominant[0].toLowerCase()} ».
                Renvoyer ne servira à rien tant que la cause n'est pas corrigée dans le référentiel ;
                et renvoyer sur des adresses inexistantes abîme la réputation du domaine d'envoi.
              </>
            }
            action={<Bouton taille="s" onClick={() => poserEtat("échec")} enfants="Voir les échecs" />}
          />
        </div>
      )}

      <Carte enfants={
        <TableauDonnees
          lignes={filtres} colonnes={colonnes} cle={(e) => e.id}
          totalBrut={envois.length} nomEntite={["envoi", "envois"]}
          triInitial={{ cle: "quand", sens: "asc" }}
          surLigne={(e) => ui.ouvrirTiroir({
            titre: e.modele,
            sous: <><span className="font-mono">{e.id}</span> · {e.canal}</>,
            onglets: [{
              nom: "Envoi",
              contenu: (
                <>
                  <Definitions lignes={[
                    ["Destinataire", e.destinataire],
                    ["Destination", <span className="font-mono">{e.destination}</span>],
                    ["État", <Jeton ton={TON[e.etat]} enfants={e.etat} />],
                    ["Tentatives", String(e.tentatives)],
                    ["Déclenché par", e.declencheur],
                    ["Quand", e.quand],
                    ["Coût", e.cout ? `${e.cout.toFixed(3)} €` : "—"],
                    ...(e.motif ? [["Motif", <span className="text-critique">{e.motif}</span>] as [string, React.ReactNode]] : []),
                  ]} />
                  {e.motif && (
                    <p className="text-[12px] text-encre-3 mt-4">
                      {e.motif.includes("inexistante") || e.motif.includes("invalide")
                        ? "Cette destination n'existe pas. Il faut la corriger dans la fiche de l'agent — un renvoi échouera de la même façon."
                        : e.motif.includes("fenêtre")
                          ? "WhatsApp n'autorise l'écriture libre que dans les 24 heures suivant le dernier message de l'agent. Au-delà, il faut passer par un modèle approuvé."
                          : "Un renvoi a des chances d'aboutir : la cause est temporaire."}
                    </p>
                  )}
                </>
              ),
            }],
            pied: e.etat === "échec"
              ? <Bouton icone="rafraichir" onClick={() => { ui.fermerTiroir(); rejouer([e.id]); }} enfants="Renvoyer" />
              : undefined,
          })}
          barreOutils={
            <>
              <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                <Icone nom="recherche" taille="s" />
                <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                  placeholder="Destinataire, adresse, modèle…" aria-label="Rechercher un envoi"
                  className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
              </div>
              <select value={canal} onChange={(e) => poserCanal(e.target.value)} aria-label="Filtrer par canal"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Tous les canaux</option>
                {["Messagerie", "SMS", "WhatsApp"].map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={etat} onChange={(e) => poserEtat(e.target.value)} aria-label="Filtrer par état"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Tous les états</option>
                {["délivré", "lu", "envoyé", "en attente", "échec"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </>
          }
          actionsLigne={(e) => e.etat === "échec"
            ? <Bouton ton="fantome" taille="s" icone="rafraichir" title="Renvoyer" onClick={() => rejouer([e.id])} />
            : null}
          actionsLot={(ids, vider) => (
            <>
              <Bouton taille="s" icone="rafraichir" onClick={() => rejouer(ids, vider)} enfants="Renvoyer" />
              <Bouton taille="s" icone="telecharger" onClick={() => {
                exporterCSV("envois-selection", envois.filter((e) => ids.includes(e.id)));
                ui.message(`${ids.length} envois exportés.`, "bon");
              }} enfants="Exporter" />
            </>
          )}
        />
      } />
    </>
  );
}
