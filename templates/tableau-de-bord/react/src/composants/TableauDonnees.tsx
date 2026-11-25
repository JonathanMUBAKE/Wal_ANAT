import { useMemo, useState, type ReactNode } from "react";
import { Icone } from "./Icone";
import { Bouton, CaseACocher, EtatVide, ItemMenu, Menu, TitreMenu } from "./Primitives";
import { cx, fmt } from "../lib/format";

/* =========================================================================
   TABLEAU DE DONNÉES
   Tri, colonnes masquables, sélection multiple avec actions groupées,
   pagination, panneau de détail au clic.
   Le filtrage reste au parent : il passe `lignes` déjà filtrées, ce qui
   évite de dupliquer sa logique métier ici.
   ========================================================================= */

export interface Colonne<T> {
  cle: string;
  nom: string;
  /** Aligné à droite et chiffres alignés. */
  num?: boolean;
  triable?: boolean;
  /** Colonne qu'on ne peut pas masquer. */
  fixe?: boolean;
  /** Valeur de tri si l'affichage n'est pas triable tel quel. */
  valeur?: (l: T) => string | number | boolean;
  rendu: (l: T) => ReactNode;
}

export interface TableauProps<T> {
  lignes: T[];
  colonnes: Colonne<T>[];
  cle: (l: T) => string;
  /** Total avant filtrage, pour dire « filtré sur N ». */
  totalBrut?: number;
  nomEntite?: [string, string];
  triInitial?: { cle: string; sens: "asc" | "desc" };
  barreOutils?: ReactNode;
  actionsLigne?: (l: T) => ReactNode;
  actionsLot?: (ids: string[], vider: () => void) => ReactNode;
  surLigne?: (l: T) => void;
  vide?: { titre: string; texte: string; actions?: ReactNode };
}

export function TableauDonnees<T>({
  lignes, colonnes, cle, totalBrut, nomEntite = ["ligne", "lignes"],
  triInitial, barreOutils, actionsLigne, actionsLot, surLigne, vide,
}: TableauProps<T>) {
  const [tri, poserTri] = useState(triInitial ?? { cle: colonnes[0].cle, sens: "asc" as const });
  const [page, poserPage] = useState(1);
  const [taille, poserTaille] = useState(25);
  const [selection, poserSelection] = useState<Set<string>>(new Set());
  const [visibles, poserVisibles] = useState<Set<string>>(new Set(colonnes.map((c) => c.cle)));

  const colonnesVues = colonnes.filter((c) => visibles.has(c.cle));

  const triees = useMemo(() => {
    const col = colonnes.find((c) => c.cle === tri.cle);
    if (!col) return lignes;
    const lire = col.valeur ?? ((l: T) => (l as Record<string, unknown>)[col.cle] as string | number);
    const signe = tri.sens === "asc" ? 1 : -1;
    return [...lignes].sort((a, b) => {
      const x = lire(a), y = lire(b);
      if (typeof x === "number" || typeof x === "boolean") return (Number(x) - Number(y)) * signe;
      return String(x).localeCompare(String(y), "fr") * signe;
    });
  }, [lignes, colonnes, tri]);

  const pages = Math.max(1, Math.ceil(triees.length / taille));
  const pageSure = Math.min(page, pages);
  const debut = (pageSure - 1) * taille;
  const visible = triees.slice(debut, debut + taille);
  const idsPage = visible.map(cle);
  const coches = idsPage.filter((i) => selection.has(i)).length;

  const basculer = (id: string) =>
    poserSelection((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const basculerPage = () =>
    poserSelection((s) => {
      const n = new Set(s);
      const tout = idsPage.every((i) => n.has(i));
      idsPage.forEach((i) => (tout ? n.delete(i) : n.add(i)));
      return n;
    });
  const vider = () => poserSelection(new Set());

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap pas-carte border-b border-bordure sans-impression">
        {barreOutils}
        <div className="ml-auto flex items-center gap-2">
          <Menu
            declencheur={({ basculer: b }) => (
              <Bouton icone="colonnes" onClick={b} enfants="Colonnes" />
            )}
            enfants={() => (
              <>
                <TitreMenu enfants="Colonnes affichées" />
                {colonnes.map((c) => (
                  <ItemMenu
                    key={c.cle} desactive={c.fixe}
                    onClick={() => poserVisibles((v) => {
                      const n = new Set(v); n.has(c.cle) ? n.delete(c.cle) : n.add(c.cle); return n;
                    })}
                    enfants={
                      <>
                        <CaseACocher checked={visibles.has(c.cle)} readOnly tabIndex={-1} className="pointer-events-none" />
                        {c.nom}
                      </>
                    }
                  />
                ))}
              </>
            )}
          />
        </div>
      </div>

      <div className="overflow-auto max-h-[560px]">
        {triees.length === 0 ? (
          <EtatVide icone="recherche" titre={vide?.titre ?? "Aucun résultat"}
            texte={vide?.texte ?? "Élargissez la recherche ou retirez un filtre."} actions={vide?.actions} />
        ) : (
          <table className="w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                <th className="sticky top-0 z-3 w-[38px] bg-surface-2 px-3 py-[9px] border-b border-bordure">
                  <CaseACocher
                    checked={coches > 0 && coches === idsPage.length}
                    indetermine={coches > 0 && coches < idsPage.length}
                    onChange={basculerPage} aria-label="Tout sélectionner sur la page"
                  />
                </th>
                {colonnesVues.map((c) => {
                  const actif = tri.cle === c.cle;
                  return (
                    <th
                      key={c.cle}
                      aria-sort={actif ? (tri.sens === "asc" ? "ascending" : "descending") : undefined}
                      onClick={() => c.triable && poserTri({
                        cle: c.cle, sens: actif && tri.sens === "asc" ? "desc" : "asc",
                      })}
                      className={cx(
                        "sticky top-0 z-3 bg-surface-2 px-3 py-[9px] whitespace-nowrap select-none",
                        "text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3 border-b border-bordure",
                        c.num ? "text-right" : "text-left",
                        c.triable && "cursor-pointer hover:text-encre",
                      )}
                    >
                      {c.nom}
                      {c.triable && (
                        <span className={cx("ml-1 inline-block transition-opacity", actif ? "opacity-100 text-accent" : "opacity-0")}>
                          {actif && tri.sens === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                  );
                })}
                {actionsLigne && (
                  <th className="sticky top-0 z-3 bg-surface-2 px-3 py-[9px] text-right text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3 border-b border-bordure">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => {
                const id = cle(l);
                const prise = selection.has(id);
                return (
                  <tr
                    key={id}
                    onClick={() => surLigne?.(l)}
                    className={cx(
                      "group transition-colors",
                      surLigne && "cursor-pointer",
                      prise ? "bg-accent-voile" : "hover:bg-surface-2",
                    )}
                  >
                    <td className="px-3 pas-ligne border-b border-bordure" onClick={(e) => e.stopPropagation()}>
                      <CaseACocher checked={prise} onChange={() => basculer(id)} aria-label={"Sélectionner " + id} />
                    </td>
                    {colonnesVues.map((c) => (
                      <td key={c.cle} className={cx("px-3 pas-ligne border-b border-bordure align-middle", c.num && "text-right tab-num")}>
                        {c.rendu(l)}
                      </td>
                    ))}
                    {actionsLigne && (
                      <td className="px-3 pas-ligne border-b border-bordure" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-[2px] justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          {actionsLigne(l)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <footer className="flex items-center gap-[10px] flex-wrap px-[var(--pas-carte)] py-[10px] border-t border-bordure text-[12.5px] text-encre-3 sans-impression">
        <span>
          {triees.length === 0 ? "Aucun résultat" : (
            <>
              <b className="text-encre">{fmt(debut + 1)}–{fmt(debut + visible.length)}</b> sur{" "}
              {fmt(triees.length)} {triees.length > 1 ? nomEntite[1] : nomEntite[0]}
              {totalBrut !== undefined && totalBrut !== triees.length && (
                <span className="text-encre-4"> (filtré sur {fmt(totalBrut)})</span>
              )}
            </>
          )}
        </span>
        <select
          value={taille} aria-label="Lignes par page"
          onChange={(e) => { poserTaille(Number(e.target.value)); poserPage(1); }}
          className="h-7 px-2 rounded-[4px] bg-surface-2 border border-bordure text-encre text-[12.5px]"
        >
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} par page</option>)}
        </select>
        <Pagination page={pageSure} pages={pages} aller={poserPage} />
      </footer>

      {selection.size > 0 && actionsLot && (
        <div className="fixed bottom-[22px] left-1/2 -translate-x-1/2 z-70 flex items-center gap-2 pl-[15px] pr-[10px] py-[9px] rounded-[8px] bg-surface border border-bordure-2 shadow-haute anim-monte sans-impression">
          <span className="text-[13px] font-semibold whitespace-nowrap">
            <span className="text-accent-fort">{selection.size}</span> sélectionné{selection.size > 1 ? "s" : ""}
          </span>
          <span className="w-px h-[22px] bg-bordure mx-[3px]" />
          {actionsLot([...selection], vider)}
          <Bouton ton="fantome" taille="s" icone="croix" aria-label="Vider la sélection" onClick={vider} />
        </div>
      )}
    </>
  );
}

function Pagination({ page, pages, aller }: { page: number; pages: number; aller: (n: number) => void }) {
  const nums = [...new Set([1, pages, page - 1, page, page + 1])]
    .filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  let dernier = 0;
  return (
    <nav className="flex items-center gap-[3px] ml-auto" aria-label="Pagination">
      <BoutonPage onClick={() => aller(page - 1)} desactive={page === 1} etiquette="Page précédente">
        <Icone nom="chevronGauche" taille="s" />
      </BoutonPage>
      {nums.map((n) => {
        const trou = n - dernier > 1;
        dernier = n;
        return (
          <span key={n} className="contents">
            {trou && <span className="px-1 text-encre-4">…</span>}
            <BoutonPage onClick={() => aller(n)} courante={n === page}>{n}</BoutonPage>
          </span>
        );
      })}
      <BoutonPage onClick={() => aller(page + 1)} desactive={page === pages} etiquette="Page suivante">
        <Icone nom="chevronDroite" taille="s" />
      </BoutonPage>
    </nav>
  );
}

function BoutonPage({ children, onClick, desactive, courante, etiquette }: {
  children: ReactNode; onClick: () => void; desactive?: boolean; courante?: boolean; etiquette?: string;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={desactive} aria-current={courante || undefined} aria-label={etiquette}
      className={cx(
        "min-w-[28px] h-7 px-[7px] rounded-[4px] text-[12.5px] tab-num",
        courante ? "bg-accent text-accent-encre font-semibold" : "text-encre-2 hover:bg-survol hover:text-encre",
        desactive && "opacity-35 pointer-events-none",
      )}
    >
      {children}
    </button>
  );
}
