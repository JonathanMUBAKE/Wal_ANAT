import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { Icone, type NomIcone } from "./Icone";
import { Bouton, Kbd } from "./Primitives";
import { cx } from "../lib/format";
import { useEchap } from "../lib/preferences";

/* =========================================================================
   Un seul fournisseur pour les trois superpositions transverses :
   messages, confirmation et panneau de détail.
      const ui = useUI();
      ui.message("Compte suspendu.", "bon", { annuler });
      if (await ui.confirmer({ titre, texte, mot: "SUPPRIMER" })) { … }
      ui.ouvrirTiroir({ titre, onglets: [...] });
   ========================================================================= */

export type TonMessage = "info" | "bon" | "critique";
interface Message { id: number; texte: string; ton: TonMessage; annuler?: () => void }

export interface DemandeConfirmation {
  titre: string;
  texte: string;
  bouton?: string;
  ton?: "danger" | "vigilance" | "info";
  /** Mot à retaper : garde-fou des actions irréversibles. */
  mot?: string;
}
export interface Onglet { nom: string; contenu: ReactNode }
export interface DemandeTiroir { titre: string; sous?: ReactNode; onglets: Onglet[]; pied?: ReactNode }

interface API {
  message: (texte: string, ton?: TonMessage, o?: { annuler?: () => void; duree?: number }) => void;
  confirmer: (d: DemandeConfirmation) => Promise<boolean>;
  ouvrirTiroir: (d: DemandeTiroir) => void;
  fermerTiroir: () => void;
}
const Contexte = createContext<API | null>(null);
export function useUI(): API {
  const c = useContext(Contexte);
  if (!c) throw new Error("useUI doit être appelé sous <FournisseurUI>");
  return c;
}

export function FournisseurUI({ enfants }: { enfants: ReactNode }) {
  const [messages, poserMessages] = useState<Message[]>([]);
  const [confirmation, poserConfirmation] = useState<
    (DemandeConfirmation & { repondre: (ok: boolean) => void }) | null
  >(null);
  const [tiroir, poserTiroir] = useState<DemandeTiroir | null>(null);
  const compteur = useRef(0);

  const message = useCallback<API["message"]>((texte, ton = "info", o = {}) => {
    const id = ++compteur.current;
    poserMessages((m) => [...m, { id, texte, ton, annuler: o.annuler }]);
    setTimeout(() => poserMessages((m) => m.filter((x) => x.id !== id)), o.duree ?? 4200);
  }, []);

  const confirmer = useCallback<API["confirmer"]>(
    (d) => new Promise<boolean>((repondre) => poserConfirmation({ ...d, repondre })), []);

  const api = useMemo<API>(() => ({
    message, confirmer,
    ouvrirTiroir: (d) => poserTiroir(d),
    fermerTiroir: () => poserTiroir(null),
  }), [message, confirmer]);

  return (
    <Contexte.Provider value={api}>
      {enfants}
      {confirmation && (
        <Modale
          demande={confirmation}
          fermer={(ok) => { confirmation.repondre(ok); poserConfirmation(null); }}
        />
      )}
      <Tiroir demande={tiroir} fermer={() => poserTiroir(null)} />
      <div className="fixed bottom-[18px] right-[18px] z-100 flex flex-col gap-2 items-end sans-impression" role="status" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className="flex items-center gap-[10px] px-[14px] py-[11px] rounded-[4px] bg-surface border border-bordure-2 shadow-haute text-[13px] min-w-[252px] anim-glisse">
            <Icone
              nom={m.ton === "bon" ? "checkCercle" : m.ton === "critique" ? "alerte" : "info"}
              className={m.ton === "bon" ? "text-bon" : m.ton === "critique" ? "text-critique" : "text-accent-fort"}
            />
            <span>{m.texte}</span>
            {m.annuler && (
              <button
                type="button"
                className="ml-auto text-[12.5px] font-semibold text-accent-fort px-[6px] py-[3px] rounded-[4px] hover:bg-accent-voile"
                onClick={() => { m.annuler?.(); poserMessages((x) => x.filter((y) => y.id !== m.id)); }}
              >
                Annuler
              </button>
            )}
          </div>
        ))}
      </div>
    </Contexte.Provider>
  );
}

/* --- Voile partagé -------------------------------------------------------- */
export function Voile({ onClick }: { onClick: () => void }) {
  return <div className="fixed inset-0 z-80 bg-black/55 backdrop-blur-[2px] anim-apparait" onClick={onClick} />;
}

/* --- Modale de confirmation ----------------------------------------------- */
function Modale({ demande, fermer }: { demande: DemandeConfirmation; fermer: (ok: boolean) => void }) {
  const [saisie, poserSaisie] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const valide = !demande.mot || saisie.trim() === demande.mot;
  useEchap(true, () => fermer(false));
  useEffect(() => { ref.current?.focus(); }, []);

  const ton = demande.ton ?? "danger";
  const icones: Record<string, NomIcone> = { danger: "alerte", vigilance: "puissance", info: "info" };
  const fonds = {
    danger: "bg-critique-voile text-critique",
    vigilance: "bg-vigilance-voile text-vigilance",
    info: "bg-accent-voile text-accent-fort",
  }[ton];

  return (
    <>
      <Voile onClick={() => fermer(false)} />
      <div
        role="dialog" aria-modal="true" aria-labelledby="titre-modale"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-90 w-[min(460px,calc(100vw-32px))] rounded-[8px] bg-surface border border-bordure-2 shadow-haute anim-monte"
      >
        <div className="px-5 pt-5 pb-4">
          <div className={cx("w-[38px] h-[38px] rounded-[4px] grid place-items-center mb-[13px]", fonds)}>
            <Icone nom={icones[ton]} taille="l" />
          </div>
          <h2 id="titre-modale" className="text-[16px] font-semibold mb-[6px]">{demande.titre}</h2>
          <p className="text-[13.5px] text-encre-2">{demande.texte}</p>
          {demande.mot && (
            <div className="mt-[15px]">
              <label htmlFor="garde" className="block text-[12.5px] text-encre-3 mb-[6px]">
                Pour confirmer, saisissez{" "}
                <code className="font-mono text-encre bg-surface-3 px-[5px] rounded">{demande.mot}</code>
              </label>
              <div className="flex items-center h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure focus-within:border-accent">
                <input
                  id="garde" ref={ref} value={saisie} autoComplete="off" spellCheck={false}
                  onChange={(e) => poserSaisie(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && valide) fermer(true); }}
                  className="w-full bg-transparent outline-none text-[13px]"
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-[13px] border-t border-bordure bg-surface-2 rounded-b-[8px]">
          <Bouton onClick={() => fermer(false)} enfants="Annuler" />
          <Bouton
            ton={ton === "danger" ? "danger" : "principal"} disabled={!valide}
            onClick={() => fermer(true)} enfants={demande.bouton ?? "Confirmer"}
          />
        </div>
      </div>
    </>
  );
}

/* --- Tiroir de détail ------------------------------------------------------ */
function Tiroir({ demande, fermer }: { demande: DemandeTiroir | null; fermer: () => void }) {
  const [onglet, poserOnglet] = useState(0);
  useEffect(() => { poserOnglet(0); }, [demande]);
  useEchap(Boolean(demande), fermer);
  return (
    <>
      {demande && <Voile onClick={fermer} />}
      <aside
        role="dialog" aria-hidden={!demande} aria-label={demande?.titre}
        className={cx(
          "fixed top-0 right-0 bottom-0 z-90 w-[min(460px,100vw)] bg-surface border-l border-bordure shadow-haute",
          "flex flex-col transition-transform duration-200 ease-out sans-impression",
          demande ? "translate-x-0" : "translate-x-full",
        )}
      >
        {demande && (
          <>
            <header className="flex items-start gap-3 p-4 border-b border-bordure">
              <div className="flex-1 min-w-0">
                <h2 className="text-[13.5px] font-semibold">{demande.titre}</h2>
                {demande.sous && <div className="text-[12px] text-encre-3">{demande.sous}</div>}
              </div>
              <Bouton ton="fantome" icone="croix" aria-label="Fermer le panneau" onClick={fermer} />
            </header>
            <div className="flex gap-[2px] border-b border-bordure px-4" role="tablist">
              {demande.onglets.map((o, i) => (
                <button
                  key={o.nom} role="tab" type="button" aria-selected={i === onglet}
                  onClick={() => poserOnglet(i)}
                  className={cx(
                    "px-[11px] py-[9px] text-[13px] border-b-2 -mb-px",
                    i === onglet ? "text-encre border-accent font-medium" : "text-encre-3 border-transparent hover:text-encre",
                  )}
                >
                  {o.nom}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">{demande.onglets[onglet]?.contenu}</div>
            {demande.pied && (
              <footer className="flex gap-2 p-[12px_16px] border-t border-bordure bg-surface-2">{demande.pied}</footer>
            )}
          </>
        )}
      </aside>
    </>
  );
}

/* --- Liste de définitions, pour les panneaux de détail --------------------- */
export function Definitions({ lignes }: { lignes: Array<[ReactNode, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[124px_1fr] gap-x-[14px] gap-y-[9px] text-[13px]">
      {lignes.map(([t, v], i) => (
        <div key={i} className="contents">
          <dt className="text-encre-3">{t}</dt>
          <dd className="text-encre [overflow-wrap:anywhere]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export { Kbd };
