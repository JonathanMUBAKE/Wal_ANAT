import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, fmt, normaliser } from "../lib/format";
import { modelesMessages, type ModeleMessage } from "../lib/communication";

const TON = { "approuvé": "bon", "en attente": "vigilance", "refusé": "critique", "brouillon": "neutre" } as const;
const ICONE = { "Messagerie": "enveloppe", "SMS": "telephone", "WhatsApp": "discussion" } as const;

/* Modèles de messages : le texte exact que l'agent recevra. Deux choses
   doivent se voir — les variables qui seront remplacées, et l'état
   d'approbation, car un modèle WhatsApp non approuvé ne part pas. */
export function ModelesMessages() {
  const ui = useUI();
  const [modeles, poserModeles] = useState<ModeleMessage[]>(modelesMessages);
  const [q, poserQ] = useState("");
  const [canal, poserCanal] = useState("");
  const [etat, poserEtat] = useState("");
  const [apercu, poserApercu] = useState<ModeleMessage | null>(modelesMessages[0]);

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return modeles.filter((m) =>
      (!n || normaliser(`${m.nom} ${m.corps} ${m.categorie}`).includes(n)) &&
      (!canal || m.canal === canal) && (!etat || m.etat === etat));
  }, [modeles, q, canal, etat]);

  const enAttente = modeles.filter((m) => m.etat === "en attente").length;
  const refuses = modeles.filter((m) => m.etat === "refusé").length;

  async function soumettre(m: ModeleMessage) {
    const ok = await ui.confirmer({
      titre: `Soumettre « ${m.nom} » à l'approbation ?`,
      texte: m.canal === "WhatsApp"
        ? "Le modèle part à l'examen du fournisseur. Comptez quelques heures à deux jours. Un refus pour cause de contenu promotionnel classé en « service » fait baisser la qualité du numéro."
        : "Le modèle part à la validation de la direction des ressources humaines avant mise en service.",
      bouton: "Soumettre", ton: "info",
    });
    if (!ok) return;
    poserModeles((l) => l.map((x) => x.id === m.id ? { ...x, etat: "en attente" } : x));
    ui.message(`« ${m.nom} » soumis à l'approbation.`, "bon");
  }

  const rendre = (texte: string) =>
    texte.split(/(\{\{[a-z_]+\}\})/g).map((p, i) =>
      p.startsWith("{{")
        ? <span key={i} className="px-[5px] py-[1px] rounded-[3px] bg-accent-voile text-accent font-mono text-[11.5px]">{p.slice(2, -2)}</span>
        : <span key={i}>{p}</span>);

  return (
    <>
      <Entete
        titre="Modèles de messages"
        sous="Le texte exact que les agents recevront, et l'état d'approbation de chaque modèle."
        actions={<Bouton ton="principal" icone="plus" onClick={() => ui.message("Éditeur de modèle à brancher.", "info")} enfants="Nouveau modèle" />}
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Modèles" valeur={String(modeles.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Approuvés" valeur={String(modeles.filter((m) => m.etat === "approuvé").length)} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En attente" valeur={String(enAttente)} ton={enAttente ? "vigilance" : undefined} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Refusés" valeur={String(refuses)} ton={refuses ? "critique" : "bon"} />} />
      </div>

      {refuses > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-critique-voile border border-critique/40 anim-apparait">
          <Icone nom="discussion" className="text-critique mt-[2px]" />
          <div className="flex-1 min-w-[min(100%,220px)] text-[13px]">
            <b>Un modèle WhatsApp a été refusé.</b>{" "}
            <span className="text-encre-2">{modeles.find((m) => m.etat === "refusé")?.motifRefus}</span>
          </div>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 420px)" }}>
        <Carte enfants={
          <>
            <div className="flex items-center gap-2 flex-wrap pas-carte border-b border-bordure sans-impression">
              <div className="flex items-center gap-2 h-8 px-[10px] min-w-[200px] flex-1 rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                <Icone nom="recherche" taille="s" />
                <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                  placeholder="Nom, texte, catégorie…" aria-label="Rechercher un modèle"
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
                {["approuvé", "en attente", "refusé", "brouillon"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="divide-y divide-bordure">
              {filtres.map((m, i) => (
                <button key={m.id} type="button" onClick={() => poserApercu(m)}
                  className={cx("flex items-start gap-3 pas-carte w-full text-left transi anim-entre",
                    apercu?.id === m.id ? "bg-accent-voile" : "hover:bg-surface-2")}
                  style={{ animationDelay: i * 25 + "ms" }}>
                  <span className="w-[26px] h-[26px] rounded-[4px] grid place-items-center shrink-0 bg-surface-3 text-encre-3 mt-[2px]">
                    <Icone nom={ICONE[m.canal]} taille="s" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold">{m.nom}</span>
                      <Jeton ton={TON[m.etat]} enfants={m.etat} />
                      <Jeton ton="neutre" point={false} enfants={m.categorie} />
                    </span>
                    <span className="block text-[12px] text-encre-3 mt-[3px] line-clamp-2">{m.corps.replace(/\n+/g, " · ")}</span>
                    <span className="block text-[11px] text-encre-4 mt-[4px]">
                      {m.canal} · {fmt(m.envois30j)} envois sur 30 j · modifié le {m.derniereModification}
                    </span>
                  </span>
                </button>
              ))}
              {filtres.length === 0 && (
                <p className="px-4 py-10 text-center text-[13px] text-encre-3">Aucun modèle ne correspond.</p>
              )}
            </div>
          </>
        } />

        <div className="max-xl:hidden">
          {apercu && (
            <Carte className="sticky top-0" enfants={
              <>
                <div className="flex items-start gap-2 pas-carte border-b border-bordure">
                  <div className="min-w-0">
                    <h2 className="text-[13.5px] font-semibold">{apercu.nom}</h2>
                    <p className="text-[12px] text-encre-3">{apercu.canal} · {apercu.langue}</p>
                  </div>
                  <Jeton ton={TON[apercu.etat]} enfants={apercu.etat} />
                </div>

                <div className="pas-carte">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-2">Aperçu</div>
                  <div className="rounded-[4px] border border-bordure bg-surface-2 p-3">
                    {apercu.objet !== "—" && (
                      <div className="pb-2 mb-2 border-b border-bordure text-[13px] font-semibold">{rendre(apercu.objet)}</div>
                    )}
                    <div className="text-[13px] leading-[19px] whitespace-pre-wrap">{rendre(apercu.corps)}</div>
                  </div>

                  <div className="mt-3">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-encre-4 mb-2">
                      Variables remplacées à l'envoi
                    </div>
                    <div className="flex flex-wrap gap-[5px]">
                      {apercu.variables.map((v) => (
                        <span key={v} className="font-mono text-[11px] px-[6px] py-[2px] rounded-[3px] bg-accent-voile text-accent">{v}</span>
                      ))}
                    </div>
                  </div>

                  {apercu.motifRefus && (
                    <div className="mt-3 p-3 rounded-[4px] bg-critique-voile text-[12px] text-encre-2">
                      <b className="text-critique">Motif du refus. </b>{apercu.motifRefus}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-bordure">
                    <Definitions lignes={[
                      ["Catégorie", apercu.categorie],
                      ["Envois (30 j)", fmt(apercu.envois30j)],
                      ["Auteur", apercu.auteur],
                      ["Modifié", apercu.derniereModification],
                    ]} />
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Bouton taille="s" icone="eclair"
                      onClick={() => ui.message("Message d'essai envoyé sur votre compte.", "bon")} enfants="Essayer" />
                    {(apercu.etat === "brouillon" || apercu.etat === "refusé") && (
                      <Bouton taille="s" ton="principal" className="ml-auto" icone="check"
                        onClick={() => soumettre(apercu)} enfants="Soumettre" />
                    )}
                  </div>
                </div>
              </>
            } />
          )}
        </div>
      </div>
    </>
  );
}
