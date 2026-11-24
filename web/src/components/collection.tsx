import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsDownUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  type LucideIcon,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { CARD, cn } from "./ui";
import { useRowMenu } from "@/lib/context-menu";

/* Cadastre — briques des collections : en-tête, barre d'outils, filtres, tableau, kanban, calendrier.
   Voir docs/DESIGN-SYSTEM.md. */

// ------------------------------------------------------------------ mémoire locale (confort, jamais critique)
export function useLocalPref<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T) || initial;
    } catch {
      return initial;
    }
  });
  const set = (x: T) => {
    setV(x);
    try {
      localStorage.setItem(key, x);
    } catch {
      /* stockage indisponible : la préférence n'est simplement pas retenue */
    }
  };
  return [v, set];
}

// ------------------------------------------------------------------ en-tête
/** En-tête d'espace de travail (gabarit Asana) : fil d'Ariane, titre, aide, action principale,
 *  puis une seule rangée d'onglets soulignés avec les outils à droite. */
export function CollectionHeader({
  Icon,
  title,
  count,
  unit,
  subtitle,
  actions,
  crumbs,
  tabs,
  tools,
}: {
  Icon: LucideIcon;
  title: string;
  count?: number;
  unit?: [string, string];
  subtitle?: string;
  actions?: ReactNode;
  crumbs?: string[];
  tabs?: ReactNode;
  tools?: ReactNode;
}) {
  return (
    <header className="border-b border-line">
      {crumbs && (
        <p className="mb-3 flex items-center gap-1.5 text-[12.5px] text-muted">
          {crumbs.map((c, i) => (
            <span key={c} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3 text-faint" />}
              <span className={i === crumbs.length - 1 ? "text-fg" : ""}>{c}</span>
            </span>
          ))}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
            <Icon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2.5 text-[24px] font-semibold leading-tight tracking-[-0.025em]">
              {title}
              {count !== undefined && (
                <span className="rounded-md bg-hover px-1.5 py-0.5 text-[12px] font-medium tracking-normal text-muted">
                  {count} {unit ? (count > 1 ? unit[1] : unit[0]) : ""}
                </span>
              )}
            </h1>
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {subtitle && <p className="mt-1.5 max-w-2xl text-[13px] text-muted">{subtitle}</p>}
      {(tabs || tools) && (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="-mb-px flex min-w-0 max-w-full overflow-x-auto">{tabs}</div>
          {tools && <div className="flex flex-wrap items-center gap-2 pb-2">{tools}</div>}
        </div>
      )}
    </header>
  );
}

// ------------------------------------------------------------------ liste groupée (sections repliables)
export interface Group<T> {
  id: string;
  label: string;
  hue: string;
  Icon?: LucideIcon;
  hint?: string;
  rows: T[];
}

export function GroupedTable<T>({
  groups,
  columns,
  rowKey,
  onOpen,
  rowHref,
  rowRef,
  actions,
  bulk,
  empty,
  storageKey,
}: {
  groups: Group<T>[];
  columns: (Column<T> & { Icon?: LucideIcon; width?: string })[];
  rowKey: (r: T) => string;
  onOpen?: (r: T) => void;
  /** Clic droit : adresse et numéro de la ligne. */
  rowHref?: (r: T) => string | undefined;
  rowRef?: (r: T) => string | undefined;
  actions?: (r: T) => ReactNode;
  bulk?: (selected: T[], clear: () => void) => ReactNode;
  empty: ReactNode;
  storageKey: string;
}) {
  const rowMenu = useRowMenu();
  const [closed, setClosedRaw] = useLocalPref<string>(storageKey, "");
  const shut = new Set(closed.split(",").filter(Boolean));
  const toggleGroup = (id: string) => {
    if (shut.has(id)) shut.delete(id);
    else shut.add(id);
    setClosedRaw([...shut].join(","));
  };
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const all = groups.flatMap((g) => g.rows);
  const chosen = all.filter((r) => selected.has(rowKey(r)));
  const clear = () => setSelected(new Set());
  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  };
  if (!all.length) return <div className={CARD}>{empty}</div>;
  return (
    <div className="space-y-3">
      {bulk && chosen.length > 0 && (
        <div className="rise-in sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-panel px-4 py-2 text-[13px] shadow-md">
          <span className="font-semibold text-primary">
            {chosen.length} sélectionnée{chosen.length > 1 ? "s" : ""}
          </span>
          {bulk(chosen, clear)}
          <button onClick={clear} className="ml-auto text-[12.5px] font-medium text-muted hover:text-fg">
            Désélectionner
          </button>
        </div>
      )}
      {groups
        .filter((g) => g.rows.length)
        .map((g) => {
          const open = !shut.has(g.id);
          const ids = g.rows.map(rowKey);
          const allOn = ids.every((i) => selected.has(i));
          return (
            <section key={g.id} className={cn(CARD, "overflow-hidden")}>
              <div className={cn("grid-group", !open && "border-b-0")}>
                <button
                  onClick={() => toggleGroup(g.id)}
                  aria-expanded={open}
                  aria-label={open ? `Replier ${g.label}` : `Déplier ${g.label}`}
                  className="flex size-6 items-center justify-center rounded-md text-muted hover:bg-panel/70"
                >
                  <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
                </button>
                {g.Icon ? (
                  <g.Icon className="size-4" style={{ color: g.hue }} />
                ) : (
                  <span className="size-2.5 rounded-full" style={{ background: g.hue }} />
                )}
                {/* Premier niveau sous le titre de page : un h2, sans saut de niveau. */}
                <h2 className="text-[13.5px] font-medium" title={g.hint}>
                  {g.label}
                </h2>
                <span className="text-[12.5px] tabular text-faint">{g.rows.length}</span>
              </div>
              {open && (
                <div
                  className="grid-scroll relative"
                  tabIndex={0}
                  role="group"
                  aria-label="Tableau défilant"
                >
                  <table className="grid-table table-fixed" style={{ minWidth: 760 }}>
                    <colgroup>
                      {bulk && <col style={{ width: 40 }} />}
                      {columns.map((c) => (
                        <col key={c.key} style={{ width: c.width }} />
                      ))}
                      {actions && <col style={{ width: 84 }} />}
                    </colgroup>
                    <thead>
                      <tr className="text-left">
                        {bulk && (
                          <th className="bg-bg py-2.5 pl-3 first:rounded-l-lg">
                            <Check
                              on={allOn}
                              label={`Tout sélectionner : ${g.label}`}
                              onChange={() => {
                                const s = new Set(selected);
                                for (const i of ids) {
                                  if (allOn) s.delete(i);
                                  else s.add(i);
                                }
                                setSelected(s);
                              }}
                            />
                          </th>
                        )}
                        {columns.map((c) => (
                          <th
                            key={c.key}
                            scope="col"
                            className="text-left"
                          >
                            {c.label}
                          </th>
                        ))}
                        {actions && (
                          <th>
                            <span className="sr-only">Actions</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="stagger">
                      {g.rows.map((r) => {
                        const id = rowKey(r);
                        const on = selected.has(id);
                        return (
                          <tr
                            key={id}
                            onClick={() => onOpen?.(r)}
                            onContextMenu={rowMenu({ open: onOpen && (() => onOpen(r)), href: rowHref?.(r), reference: rowRef?.(r) })}
                            className={cn(
                              "group border-t border-line transition-colors",
                              onOpen && "cursor-pointer",
                              on ? "bg-brand-soft/60" : "hover:bg-hover/60",
                            )}
                          >
                            {bulk && (
                              <td className="py-2.5 pl-3" onClick={(e) => e.stopPropagation()}>
                                <Check on={on} label="Sélectionner" onChange={() => toggle(id)} />
                              </td>
                            )}
                            {columns.map((c) => (
                              <td key={c.key} className={cn("truncate px-3 py-2.5 align-middle", c.className)}>
                                {c.render(r)}
                              </td>
                            ))}
                            {actions && (
                              <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                                  {actions(r)}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
    </div>
  );
}

// ------------------------------------------------------------------ barre d'outils
export const Toolbar = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2">{children}</div>
);

export function FilterToggle({ open, count, onClick }: { open: boolean; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors",
        open ? "border-primary/40 bg-brand-soft text-primary" : "border-line-strong bg-panel text-fg hover:bg-hover",
      )}
    >
      <SlidersHorizontal className="size-4" />
      Filtres
      {count > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-on-primary">
          {count}
        </span>
      )}
    </button>
  );
}

export function ViewSwitch<T extends string>({
  value,
  onChange,
  items,
  label = "Affichage",
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; Icon?: LucideIcon }[];
  label?: string;
  /** « sm » dans l'en-tête d'un bloc, « md » dans une barre d'outils. */
  size?: "sm" | "md";
}) {
  const group = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex items-center gap-0.5 rounded-lg bg-hover p-[3px]", size === "sm" ? "h-7" : "h-9")}
    >
      {items.map(({ id, label: l, Icon }) => {
        const on = value === id;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(id)}
            className={cn(
              "relative inline-flex h-full items-center rounded-md font-medium transition-colors duration-200",
              size === "sm" ? "px-2 text-[12px]" : "px-3 text-[12.5px]",
              on ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {on && (
              <motion.span
                layoutId={`switch-${group}`}
                className="absolute inset-0 rounded-md bg-panel shadow-sm ring-1 ring-line"
                transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.7 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {Icon && <Icon className="size-3.5" />}
              {l}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <label
      className={cn(
        "field-ring flex h-9 min-w-[180px] items-center gap-2 rounded-lg border border-line-strong bg-panel px-3 focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--ring)]",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-faint" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-faint"
      />
      {value ? (
        <button onClick={() => onChange("")} aria-label="Effacer la recherche" className="text-faint hover:text-fg">
          <X className="size-4" />
        </button>
      ) : (
        <kbd className="rounded-md border border-line bg-bg px-1.5 font-mono text-[11px] text-faint">/</kbd>
      )}
    </label>
  );
}

// ------------------------------------------------------------------ filtres
export function FilterPanel({ children, onClear, active }: { children: ReactNode; onClear: () => void; active: number }) {
  return (
    <aside className={cn(CARD, "rise-in w-full shrink-0 self-start p-3 lg:w-[236px]")}>
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <p className="text-[15px] font-semibold">Filtres</p>
        {active > 0 && (
          <button onClick={onClear} className="text-[12px] font-medium text-primary hover:underline">
            Effacer
          </button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </aside>
  );
}

export function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl bg-bg/70 p-1">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-2.5 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-faint hover:text-muted"
      >
        {title}
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && <div className="space-y-0.5 px-1 pb-1.5">{children}</div>}
    </div>
  );
}

export function CheckOption({
  checked,
  onChange,
  label,
  color,
  count,
  type = "checkbox",
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  color?: string;
  count?: number;
  type?: "checkbox" | "radio";
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] transition-colors hover:bg-panel">
      <input type={type} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)]",
          type === "radio" ? "rounded-full" : "rounded-md",
          checked ? "border-primary bg-primary text-on-primary" : "border-faint/70 bg-panel",
        )}
      >
        {checked &&
          (type === "radio" ? (
            <span className="size-1.5 rounded-full bg-current" />
          ) : (
            <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2.5 6.2 5 8.5l4.5-5" />
            </svg>
          ))}
      </span>
      {color && <span className="size-2 rounded-full" style={{ background: color }} />}
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="tabular text-[12px] text-faint">{count}</span>}
    </label>
  );
}

// ------------------------------------------------------------------ statut et sceau
export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "primary";
const BADGE: Record<BadgeTone, string> = {
  neutral: "border-line-strong bg-hover text-muted",
  info: "border-[color-mix(in_oklab,var(--info)_30%,transparent)] bg-info-soft text-info",
  primary: "border-[color-mix(in_oklab,var(--primary)_30%,transparent)] bg-brand-soft text-primary",
  success: "border-[color-mix(in_oklab,var(--success)_30%,transparent)] bg-success-soft text-success",
  warning: "border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-warning-soft text-warning",
  danger: "border-[color-mix(in_oklab,var(--danger)_30%,transparent)] bg-danger-soft text-danger",
};
export const Badge = ({ tone, label, count }: { tone: BadgeTone; label: string; count?: number }) => (
  <span
    className={cn(
      "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[11.5px] font-medium",
      BADGE[tone],
    )}
  >
    <span className="size-1.5 rounded-full bg-current" />
    {label}
    {count !== undefined && <span className="tabular opacity-70">{count}</span>}
  </span>
);

/** Numéro officiel : se lit comme un tampon, jamais tronqué. */
export const Seal = ({ children }: { children: ReactNode }) => (
  <span className="whitespace-nowrap font-mono text-[12px] text-muted">
    {children}
  </span>
);

// ------------------------------------------------------------------ tableau de données
export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
  className?: string;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onOpen,
  rowHref,
  rowRef,
  actions,
  bulk,
  empty,
  pageSizes = [10, 20, 50],
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (r: T) => string;
  onOpen?: (r: T) => void;
  /** Clic droit : adresse et numéro de la ligne. */
  rowHref?: (r: T) => string | undefined;
  rowRef?: (r: T) => string | undefined;
  actions?: (r: T) => ReactNode;
  bulk?: (selected: T[], clear: () => void) => ReactNode;
  empty: ReactNode;
  pageSizes?: number[];
}) {
  const rowMenu = useRowMenu();
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(pageSizes[0]);
  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const get = col.sort;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr")) * sort!.dir;
    });
  }, [rows, sort, columns]);
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  useEffect(() => {
    if (page > pages - 1) setPage(0);
  }, [page, pages]);
  const shown = sorted.slice(page * size, page * size + size);
  const ids = shown.map(rowKey);
  const allOn = ids.length > 0 && ids.every((i) => selected.has(i));
  const chosen = rows.filter((r) => selected.has(rowKey(r)));
  const clear = () => setSelected(new Set());
  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  };

  if (!rows.length) return <div className={CARD}>{empty}</div>;
  return (
    <div className={cn(CARD, "relative min-w-0")}>
      {bulk && chosen.length > 0 && (
        <div className="rise-in flex flex-wrap items-center gap-3 border-b border-line bg-brand-soft px-4 py-2.5 text-[13px] first:rounded-t-2xl">
          <span className="font-semibold text-primary">
            {chosen.length} sélectionnée{chosen.length > 1 ? "s" : ""}
          </span>
          {bulk(chosen, clear)}
          <button onClick={clear} className="ml-auto text-[12.5px] font-medium text-muted hover:text-fg">
            Désélectionner
          </button>
        </div>
      )}
      <div className="grid-scroll relative" tabIndex={0} role="group" aria-label="Tableau défilant">
        <table className="grid-table">
          <thead>
            <tr className="text-left">
              {bulk && (
                <th className="w-10 rounded-l-lg bg-bg py-2.5 pl-4 pr-1">
                  <Check
                    on={allOn}
                    label="Tout sélectionner sur cette page"
                    onChange={() => {
                      const s = new Set(selected);
                      for (const i of ids) {
                        if (allOn) s.delete(i);
                        else s.add(i);
                      }
                      setSelected(s);
                    }}
                  />
                </th>
              )}
              {columns.map((c) => {
                const on = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={on ? (sort!.dir === 1 ? "ascending" : "descending") : undefined}
                    className="text-left"
                  >
                    {c.sort ? (
                      <button
                        onClick={() => setSort(on ? (sort!.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 })}
                        className={cn("inline-flex items-center gap-1 hover:text-fg", on && "text-fg")}
                      >
                        {c.label}
                        {on ? (
                          sort!.dir === 1 ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
              {actions && (
                <th className="text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="stagger">
            {shown.map((r) => {
              const id = rowKey(r);
              const on = selected.has(id);
              return (
                <tr
                  key={id}
                  onClick={() => onOpen?.(r)}
                  onContextMenu={rowMenu({ open: onOpen && (() => onOpen(r)), href: rowHref?.(r), reference: rowRef?.(r) })}
                  className={cn(
                    "group border-t border-line transition-colors",
                    onOpen && "cursor-pointer",
                    on ? "bg-brand-soft/60" : "hover:bg-hover/70",
                  )}
                >
                  {bulk && (
                    <td className="py-3 pl-5 pr-1" onClick={(e) => e.stopPropagation()}>
                      <Check on={on} label="Sélectionner" onChange={() => toggle(id)} />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-3 py-3 align-middle first:pl-5", c.className)}>
                      {c.render(r)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-3 py-3 pr-5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">{actions(r)}</div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[12.5px] text-muted">
        <span>
          Page <b className="font-semibold text-fg">{page + 1}</b> sur {pages} · {rows.length} au total
        </span>
        <span className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Lignes
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
              className="h-8 rounded-full border border-line-strong bg-panel px-2.5 text-[12.5px] text-fg outline-none"
            >
              {pageSizes.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <RoundBtn label="Page précédente" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="size-4" />
          </RoundBtn>
          <RoundBtn label="Page suivante" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="size-4" />
          </RoundBtn>
        </span>
      </div>
    </div>
  );
}

const Check = ({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) => (
  <input
    type="checkbox"
    aria-label={label}
    checked={on}
    onChange={onChange}
    className="size-4 cursor-pointer rounded-md accent-[var(--primary)]"
  />
);

export function RoundBtn({
  label,
  onClick,
  disabled,
  children,
  href,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  href?: string;
}) {
  const cls =
    "inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-40";
  return href ? (
    <a href={href} aria-label={label} title={label} className={cls}>
      {children}
    </a>
  ) : (
    <button aria-label={label} title={label} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ kanban
export function BoardColumn({
  title,
  tone,
  count,
  hint,
  children,
}: {
  title: string;
  tone: BadgeTone;
  count: number;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className={"flex w-[290px] shrink-0 flex-col rounded-2xl border border-line bg-panel/60 p-2 shadow-sm"}>
      <header className="flex items-center justify-between px-2 pb-2 pt-1.5" title={hint}>
        <Badge tone={tone} label={title} />
        <span className="flex size-6 items-center justify-center rounded-full bg-hover text-[11.5px] font-semibold tabular text-muted">
          {count}
        </span>
      </header>
      <div className="stagger flex min-h-[120px] flex-col gap-2">
        {count ? children : <p className="px-3 py-6 text-center text-[12.5px] text-faint">Rien à cette étape.</p>}
      </div>
    </section>
  );
}

export const Prop = ({ label, children, Icon }: { label: string; children: ReactNode; Icon?: LucideIcon }) => (
  <div>
    <p className="text-[11.5px] text-faint">{label}</p>
    <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium">
      {Icon && <Icon className="size-3.5 shrink-0 text-muted" />}
      <span className="truncate">{children}</span>
    </p>
  </div>
);

// ------------------------------------------------------------------ calendrier
export interface CalEvent {
  id: string;
  date: string;
  start?: string | null;
  end?: string | null;
  title: string;
  subtitle?: string;
  hue: string;
  muted?: boolean;
  /** Rendez-vous sans heure : il se range dans la bande « Journée », au-dessus des heures. */
  allDay?: boolean;
}
const dkey = (d: Date) => format(d, "yyyy-MM-dd");
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const hhmm = (t?: string | null) => (t ? `${Number(t.slice(0, 2))} h ${t.slice(3, 5)}` : "");

export function MiniMonth({
  value,
  onPick,
  marks,
  range,
}: {
  value: Date;
  onPick: (d: Date) => void;
  marks: Set<string>;
  range?: [Date, Date];
}) {
  const [month, setMonth] = useState(() => startOfMonth(value));
  useEffect(() => setMonth(startOfMonth(value)), [value]);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const today = dkey(new Date());
  const inRange = (d: Date) => range && d >= range[0] && d <= range[1];
  return (
    <div className={cn(CARD, "p-4")}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[15px] font-semibold capitalize tracking-[-0.02em]">{format(month, "MMMM yyyy", { locale: fr })}</p>
        <span className="flex">
          <button aria-label="Mois précédent" onClick={() => setMonth(addMonths(month, -1))} className="rounded-full p-1.5 text-muted hover:bg-hover">
            <ChevronLeft className="size-4" />
          </button>
          <button aria-label="Mois suivant" onClick={() => setMonth(addMonths(month, 1))} className="rounded-full p-1.5 text-muted hover:bg-hover">
            <ChevronRight className="size-4" />
          </button>
        </span>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] uppercase text-faint">
        {["l", "m", "m", "j", "v", "s", "d"].map((w, i) => (
          <span key={i} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d) => {
          const k = dkey(d);
          const sel = dkey(value) === k;
          const band = inRange(d);
          return (
            <button
              key={k}
              onClick={() => onPick(d)}
              aria-label={format(d, "EEEE d MMMM", { locale: fr })}
              className={cn(
                "relative flex h-9 items-center justify-center text-[12.5px] tabular",
                band && "bg-brand-soft first:rounded-l-full last:rounded-r-full",
                band && d.getDay() === 1 && "rounded-l-full",
                band && d.getDay() === 0 && "rounded-r-full",
                !isSameMonth(d, month) && "text-faint/60",
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full transition-colors",
                  sel ? "bg-primary font-semibold text-on-primary" : k === today ? "font-semibold text-primary ring-1 ring-primary/40" : "hover:bg-hover",
                )}
              >
                {format(d, "d")}
              </span>
              {marks.has(k) && !sel && <span className="absolute bottom-0.5 size-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Densité d'une grille horaire : plus la journée est haute, plus chaque rendez-vous en dit. */
type Density = "compacte" | "normale" | "detaillee";
const ROW: Record<Density, number> = { compacte: 38, normale: 56, detaillee: 84 };
const DENSITIES: Density[] = ["compacte", "normale", "detaillee"];
/** Hauteur d'une bande d'heures repliées : assez pour son libellé, sans gêner celui de l'heure suivante. */
const FOLDED = 24;

/**
 * La semaine (ou la journée) heure par heure : le même composant pour l'agenda de l'accueil et le calendrier des
 * réunions. La journée se déroule en hauteur — trois densités, retenues d'une visite à l'autre — et les heures sans
 * rendez-vous se replient quand la place manque.
 */
export function TimeGrid({
  days,
  events,
  selected,
  onSelect,
  from = 7,
  to = 19,
  minColumn = 128,
  density: fixedDensity,
}: {
  days: Date[];
  events: CalEvent[];
  selected?: string | null;
  onSelect: (e: CalEvent) => void;
  from?: number;
  to?: number;
  /** Largeur minimale d'un jour avant de faire défiler. */
  minColumn?: number;
  /** Densité imposée (sinon celle que la personne a choisie). */
  density?: Density;
}) {
  const [chosen, setChosen] = useLocalPref<Density>("anat.calendrier.densite", "normale");
  const [folding, setFolding] = useLocalPref<"oui" | "non">("anat.calendrier.heures-creuses", "oui");
  const density = fixedDensity ?? chosen;
  const H = ROW[density];
  const tint = (hue: string) => ({
    backgroundColor: `color-mix(in oklab, ${hue} 13%, var(--panel))`,
    backgroundImage: `repeating-linear-gradient(135deg, color-mix(in oklab, ${hue} 10%, transparent) 0 1px, transparent 1px 7px)`,
    border: `1px solid color-mix(in oklab, ${hue} 36%, transparent)`,
    color: `color-mix(in oklab, ${hue} 60%, var(--fg))`,
  });
  const cols = { gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` };
  const now = new Date();
  const today = dkey(now);
  const shown = days.map(dkey);
  // L'heure en cours reste dépliée : c'est le repère du jour
  const nowHour = shown.includes(today) ? now.getHours() : -1;
  const timed = events.filter((e) => !e.allDay && shown.includes(e.date));
  // Rien à replier quand la période n'a aucun rendez-vous à l'heure : la journée reste lisible
  const fold = folding === "oui" && timed.length > 0;
  const span = (e: CalEvent) => {
    const s = e.start ? toMin(e.start) : 9 * 60;
    return [s, e.end ? Math.max(toMin(e.end), s + 30) : s + 60] as const;
  };
  // Une heure se replie si aucun rendez-vous de la période ne la traverse ; les heures creuses qui se
  // suivent ne font qu'une bande, pour ne pas empiler des libellés dans la marge
  const bands: { from: number; to: number; folded: boolean }[] = [];
  for (let h = from; h < to; h++) {
    const busy = timed.some((e) => {
      const [s, en] = span(e);
      return s < (h + 1) * 60 && en > h * 60;
    });
    const folded = fold && !busy && h !== nowHour;
    const last = bands.at(-1);
    if (folded && last?.folded) last.to = h + 1;
    else bands.push({ from: h, to: h + 1, folded });
  }
  const heightOf = (b: { from: number; to: number; folded: boolean }) => (b.folded ? FOLDED : (b.to - b.from) * H);
  const total = bands.reduce((n, b) => n + heightOf(b), 0);
  const bandLabel = (b: { from: number; to: number; folded: boolean }) =>
    b.to - b.from > 1 ? `${b.from} – ${b.to - 1} h` : `${b.from} h`;
  // La position d'une minute, en tenant compte des bandes repliées
  const yOf = (min: number) => {
    let y = 0;
    for (const b of bands) {
      const [start, end] = [b.from * 60, b.to * 60];
      if (min >= end) {
        y += heightOf(b);
        continue;
      }
      return y + ((Math.max(min, start) - start) / (end - start)) * heightOf(b);
    }
    return y;
  };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = days.some((d) => dkey(d) === today) && nowMin > from * 60 && nowMin < to * 60;
  const PAD = 10;
  const level = DENSITIES.indexOf(density);
  const zoom = (step: number) => setChosen(DENSITIES[Math.min(DENSITIES.length - 1, Math.max(0, level + step))]);
  const foldable = timed.length > 0;
  return (
    <div>
      {/* Dérouler la journée ou la replier : le réglage vaut pour tous les calendriers */}
      <div className="flex items-center justify-end gap-1 px-2 pb-1">
        {foldable && (
          <button
            type="button"
            onClick={() => setFolding(fold ? "non" : "oui")}
            aria-pressed={fold}
            title={fold ? "Dérouler toute la journée" : "Replier les heures sans rendez-vous"}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-lg px-2 text-[12px] transition-colors",
              fold ? "text-muted hover:bg-hover hover:text-fg" : "bg-hover text-fg",
            )}
          >
            {fold ? <ChevronsUpDown className="size-3.5" /> : <ChevronsDownUp className="size-3.5" />}
            {fold ? "Journée entière" : "Replier les heures creuses"}
          </button>
        )}
        {!fixedDensity && (
          <span className="flex items-center rounded-lg bg-hover p-[3px]">
            <button
              type="button"
              onClick={() => zoom(-1)}
              disabled={level === 0}
              aria-label="Moins de détails"
              title="Moins de détails"
              className="flex size-6 items-center justify-center rounded-md text-muted transition-colors hover:text-fg disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => zoom(1)}
              disabled={level === DENSITIES.length - 1}
              aria-label="Plus de détails"
              title="Plus de détails"
              className="flex size-6 items-center justify-center rounded-md text-muted transition-colors hover:text-fg disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: days.length > 1 ? days.length * minColumn + 56 : undefined }}>
          <div className="grid border-b border-line" style={cols}>
            <span />
            {days.map((d) => {
              const isT = dkey(d) === today;
              return (
                <div key={dkey(d)} className="flex h-11 items-center justify-center gap-1.5 border-l border-line">
                  <span className={cn("text-[12.5px] capitalize", isT ? "font-medium text-fg" : "text-muted")}>
                    {format(d, "EEE", { locale: fr }).replace(".", "")}
                  </span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-[12.5px] font-semibold tabular",
                      isT && "bg-primary text-on-primary",
                    )}
                  >
                    {format(d, "d")}
                  </span>
                </div>
              );
            })}
          </div>
          {events.some((e) => e.allDay) && (
            <div className="grid border-b border-line" style={cols}>
              <span className="pr-2.5 pt-2.5 text-right text-[11px] text-muted">Journée</span>
              {days.map((d) => {
                const k = dkey(d);
                return (
                  <div key={k} className="min-w-0 space-y-1 border-l border-line p-1">
                    {events
                      .filter((e) => e.allDay && e.date === k)
                      .map((e) => (
                        <button
                          key={e.id}
                          onClick={() => onSelect(e)}
                          title={[e.title, e.subtitle].filter(Boolean).join(", ")}
                          className={cn(
                            "block w-full truncate rounded-md px-2 py-1 text-left text-[12px] font-medium transition-[filter] duration-200 hover:brightness-110",
                            selected === e.id && "ring-2 ring-[var(--ring)]",
                          )}
                          style={tint(e.hue)}
                        >
                          {e.title}
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>
          )}
          <div className="relative grid" style={{ ...cols, paddingTop: PAD }}>
            <div>
              {bands.map((b) => (
                <div
                  key={b.from}
                  style={{ height: heightOf(b) }}
                  className={cn(
                    "pr-2.5 text-right tabular",
                    b.folded ? "flex items-center justify-end text-[11px] text-faint" : "text-[11px] text-muted",
                  )}
                >
                  {b.folded ? bandLabel(b) : <span className="relative -top-2">{b.from} h</span>}
                </div>
              ))}
            </div>
            {days.map((d) => {
              const k = dkey(d);
              const list = timed.filter((e) => e.date === k);
              return (
                <div key={k} className="relative border-l border-line" style={{ height: total }}>
                  {bands.map((b) => (
                    <div
                      key={b.from}
                      className={cn("border-t border-line", b.folded && "bg-[color-mix(in_oklab,var(--fg)_3%,transparent)]")}
                      style={{ height: heightOf(b) }}
                    >
                      {/* La demi-heure : un filet plus discret, inutile sur une bande repliée */}
                      {!b.folded && <div className="h-1/2 border-b border-line/50" />}
                    </div>
                  ))}
                  {list.map((e, n) => {
                    const [s, en] = span(e);
                    const top = yOf(Math.max(s, from * 60));
                    const h = Math.max(yOf(Math.min(en, to * 60)) - top - 3, 26);
                    const overlap = list.filter((o) => (o.start ?? "09:00") === (e.start ?? "09:00")).length > 1;
                    const time = e.start ? `${hhmm(e.start)}${e.end ? ` – ${hhmm(e.end)}` : ""}` : "Horaire à préciser";
                    return (
                      <button
                        key={e.id}
                        onClick={() => onSelect(e)}
                        title={[e.title, time, e.subtitle].filter(Boolean).join(", ")}
                        className={cn(
                          "rise-in absolute z-10 overflow-hidden rounded-lg px-2 text-left transition-[transform,filter] duration-200 ease-out hover:-translate-y-px hover:brightness-110",
                          h < 44 ? "py-0.5" : "py-1.5",
                          selected === e.id && "ring-2 ring-[var(--ring)]",
                          e.muted && "opacity-60",
                        )}
                        style={{
                          top: top + 2,
                          height: h,
                          left: overlap ? `calc(${(n % 2) * 50}% + 3px)` : 3,
                          right: overlap ? `calc(${(1 - (n % 2)) * 50}% + 3px)` : 3,
                          ...tint(e.hue),
                        }}
                      >
                        <p
                          className={cn(
                            "text-[12.5px] font-semibold leading-snug",
                            h >= 76 ? "line-clamp-2" : "truncate",
                            e.muted && "line-through",
                          )}
                        >
                          {e.title}
                        </p>
                        {h >= 40 && <p className="truncate text-[11.5px] leading-snug opacity-85">{time}</p>}
                        {h >= 92 && e.subtitle && <p className="truncate text-[11.5px] leading-snug opacity-70">{e.subtitle}</p>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {showNow && (
              // L'heure courante : un pointillé rouge sur toute la semaine, son heure dans la marge
              <div
                className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                style={{ top: PAD + yOf(nowMin) - 8 }}
              >
                <span className="w-[56px] shrink-0 bg-panel pr-2 text-right text-[11px] font-medium leading-4 tabular text-danger">
                  {hhmm(format(now, "HH:mm"))}
                </span>
                <span className="-ml-[3px] size-1.5 shrink-0 rounded-full bg-danger" />
                <span className="flex-1 border-t border-dotted border-danger" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonthGrid({
  month,
  events,
  onSelect,
  selected,
}: {
  month: Date;
  events: CalEvent[];
  onSelect: (e: CalEvent) => void;
  selected?: string | null;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const today = dkey(new Date());
  // Sur téléphone, le mois tient dans la largeur : une pastille par rendez-vous, le jour touché se déroule dessous
  const [picked, setPicked] = useState<string | null>(null);
  const line = (e: CalEvent) => (
    <button
      key={e.id}
      onClick={() => onSelect(e)}
      title={e.start ? `${e.start.slice(0, 5)} · ${e.title}` : e.title}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11.5px] transition-colors hover:bg-hover",
        selected === e.id && "bg-hover ring-1 ring-[var(--ring)]",
        e.muted && "line-through opacity-60",
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: e.hue }} />
      <span className="truncate font-medium">{e.title}</span>
    </button>
  );
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 sm:min-w-[640px] overflow-hidden rounded-xl border border-line [&>*:nth-child(7n)]:border-r-0">
        {["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."].map((w) => (
          <p
            key={w}
            className="border-b border-r border-line px-1 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-faint sm:px-2 sm:text-left sm:text-[11.5px]"
          >
            {w}
          </p>
        ))}
        {days.map((d, n) => {
          const k = dkey(d);
          const list = events.filter((e) => e.date === k);
          return (
            <div
              key={k}
              onClick={() => setPicked(list.length ? k : null)}
              className={cn(
                "min-h-[58px] border-r border-line p-1 sm:min-h-[104px] sm:p-2",
                n < days.length - 7 && "border-b",
                !isSameMonth(d, month) && "bg-bg/60",
                k === today && "bg-brand-soft/50",
              )}
            >
              {/* Le quantième part de la même verticale que le nom du jour et que les rendez-vous */}
              <div className="mb-1 flex items-center">
                <span
                  className={cn(
                    "-ml-1.5 inline-flex h-[22px] items-center rounded-md px-1.5 text-[12px] font-medium tabular",
                    k === today ? "bg-primary text-on-primary" : !isSameMonth(d, month) ? "text-faint" : "text-muted",
                  )}
                >
                  {format(d, "d")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pl-0.5 sm:hidden">
                {list.slice(0, 4).map((e) => (
                  <span key={e.id} className="size-1.5 rounded-full" style={{ background: e.hue }} />
                ))}
              </div>
              <div className="hidden space-y-0.5 sm:block">
                {list.slice(0, 3).map(line)}
                {list.length > 3 && <p className="pl-1.5 pt-0.5 text-[11px] text-faint">+{list.length - 3} autres</p>}
              </div>
            </div>
          );
        })}
      </div>
      {picked && (
        <section className="mt-3 space-y-0.5 sm:hidden">
          <p className="mb-1 text-[12.5px] font-medium first-letter:uppercase">
            {format(parseISO(picked), "EEEE d MMMM", { locale: fr })}
          </p>
          {events.filter((e) => e.date === picked).map(line)}
        </section>
      )}
    </div>
  );
}

export const weekOf = (d: Date) => eachDayOfInterval({ start: startOfWeek(d, { weekStartsOn: 1 }), end: addDays(startOfWeek(d, { weekStartsOn: 1 }), 6) });
export { parseISO };
