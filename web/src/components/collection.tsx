import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  type LucideIcon,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "./ui";

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
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-primary">
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

/** Onglet souligné : vue ou section d'une même page. */
export function TabLink({
  on,
  onClick,
  Icon,
  children,
  count,
}: {
  on: boolean;
  onClick: () => void;
  Icon?: LucideIcon;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-[13px] font-medium transition-colors",
        "after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:rounded-full after:transition-colors",
        on ? "text-fg after:bg-primary" : "text-muted after:bg-transparent hover:text-fg",
      )}
    >
      {Icon && <Icon className={cn("size-4", on ? "text-primary" : "")} />}
      {children}
      {count !== undefined && count > 0 && (
        <span className="rounded-md bg-hover px-1.5 text-[11px] font-semibold tabular text-muted">{count}</span>
      )}
    </button>
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
  actions,
  bulk,
  empty,
  storageKey,
}: {
  groups: Group<T>[];
  columns: (Column<T> & { Icon?: LucideIcon; width?: string })[];
  rowKey: (r: T) => string;
  onOpen?: (r: T) => void;
  actions?: (r: T) => ReactNode;
  bulk?: (selected: T[], clear: () => void) => ReactNode;
  empty: ReactNode;
  storageKey: string;
}) {
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
  if (!all.length) return <div className="rounded-2xl border border-line bg-panel">{empty}</div>;
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
            <section key={g.id} className="rounded-2xl border border-line bg-panel p-1.5">
              <div
                className="flex items-center gap-2 rounded-[10px] px-2.5 py-2"
                style={{ background: `color-mix(in oklab, ${g.hue} 8%, var(--panel))` }}
              >
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
                <h3 className="text-[13.5px] font-semibold" title={g.hint}>
                  {g.label}
                </h3>
                <span
                  className="rounded-md px-1.5 text-[11.5px] font-semibold tabular"
                  style={{ color: g.hue, background: `color-mix(in oklab, ${g.hue} 12%, transparent)` }}
                >
                  {g.rows.length}
                </span>
              </div>
              {open && (
                <div className="relative overflow-x-auto">
                  <table className="w-full table-fixed border-collapse text-[13px]" style={{ minWidth: 760 }}>
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
                          <th className="bg-bg py-2.5 pl-3 first:rounded-l-[10px]">
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
                            className="bg-bg px-3 py-2.5 text-[12px] font-medium text-muted first:rounded-l-[10px] last:rounded-r-[10px]"
                          >
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              {c.Icon && <c.Icon className="size-3.5 text-faint" />}
                              {c.label}
                            </span>
                          </th>
                        ))}
                        {actions && (
                          <th className="bg-bg last:rounded-r-[10px]">
                            <span className="sr-only">Actions</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => {
                        const id = rowKey(r);
                        const on = selected.has(id);
                        return (
                          <tr
                            key={id}
                            onClick={() => onOpen?.(r)}
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
        "inline-flex h-9 items-center gap-2 rounded-[10px] border px-3 text-[13px] font-medium transition-colors",
        open ? "border-primary/40 bg-brand-soft text-primary" : "border-line-strong bg-panel text-fg hover:bg-hover",
      )}
    >
      <SlidersHorizontal className="size-4" />
      Filtres
      {count > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10.5px] font-semibold text-on-primary">
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
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; Icon?: LucideIcon }[];
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-9 items-center gap-0.5 rounded-[10px] bg-hover p-[3px]">
      {items.map(({ id, label: l, Icon }) => {
        const on = value === id;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-[8px] px-3 text-[12.5px] font-medium transition-all duration-200",
              on ? "bg-panel text-fg shadow-sm ring-1 ring-line" : "text-muted hover:text-fg",
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {l}
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
        "field-ring flex h-9 min-w-[180px] items-center gap-2 rounded-[10px] border border-line-strong bg-panel px-3 focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--ring)]",
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
    <aside className="rise-in w-full shrink-0 self-start rounded-2xl border border-line bg-panel p-3 shadow-sm lg:w-[236px]">
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
          type === "radio" ? "rounded-full" : "rounded-[5px]",
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
  <span className="inline-flex whitespace-nowrap rounded-md bg-hover px-1.5 py-0.5 font-mono text-[11px] text-muted">
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
  actions,
  bulk,
  empty,
  pageSizes = [10, 20, 50],
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (r: T) => string;
  onOpen?: (r: T) => void;
  actions?: (r: T) => ReactNode;
  bulk?: (selected: T[], clear: () => void) => ReactNode;
  empty: ReactNode;
  pageSizes?: number[];
}) {
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

  if (!rows.length) return <div className="rounded-2xl border border-line bg-panel shadow-sm">{empty}</div>;
  return (
    <div className="relative min-w-0 rounded-2xl border border-line bg-panel shadow-sm">
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
      <div className="relative overflow-x-auto px-3 pt-3">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-left">
              {bulk && (
                <th className="w-10 rounded-l-[10px] bg-bg py-2.5 pl-4 pr-1">
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
                    className="whitespace-nowrap bg-bg px-3 py-2.5 text-[12px] font-medium text-muted first:rounded-l-[10px] first:pl-4 last:rounded-r-[10px]"
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
                <th className="rounded-r-[10px] bg-bg px-3 py-2.5 pr-4 text-right text-[12px] font-medium text-muted">
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
    className="size-4 cursor-pointer rounded-[5px] accent-[var(--primary)]"
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
    <section className="flex w-[290px] shrink-0 flex-col rounded-2xl border border-line bg-panel/60 p-2 shadow-sm">
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
    <div className="rounded-2xl border border-line bg-panel p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[16px] font-semibold capitalize tracking-[-0.02em]">{format(month, "MMMM yyyy", { locale: fr })}</p>
        <span className="flex">
          <button aria-label="Mois précédent" onClick={() => setMonth(addMonths(month, -1))} className="rounded-full p-1.5 text-muted hover:bg-hover">
            <ChevronLeft className="size-4" />
          </button>
          <button aria-label="Mois suivant" onClick={() => setMonth(addMonths(month, 1))} className="rounded-full p-1.5 text-muted hover:bg-hover">
            <ChevronRight className="size-4" />
          </button>
        </span>
      </div>
      <div className="grid grid-cols-7 text-center text-[10.5px] uppercase text-faint">
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

export function TimeGrid({
  days,
  events,
  selected,
  onSelect,
  from = 7,
  to = 19,
}: {
  days: Date[];
  events: CalEvent[];
  selected?: string | null;
  onSelect: (e: CalEvent) => void;
  from?: number;
  to?: number;
}) {
  const H = 64;
  const today = dkey(new Date());
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: days.length > 1 ? days.length * 128 + 56 : undefined }}>
        <div className="grid gap-2 pb-3" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
          <span />
          {days.map((d) => {
            const isT = dkey(d) === today;
            return (
              <div
                key={dkey(d)}
                className={cn(
                  "rounded-xl px-2 py-2.5 text-center",
                  isT ? "bg-night text-white shadow-md dark:bg-primary dark:text-on-primary" : "bg-bg",
                )}
              >
                <p className={cn("text-[11.5px] capitalize", isT ? "text-white/70" : "text-muted")}>
                  {format(d, "EEEE", { locale: fr })}
                </p>
                <p className="text-[24px] font-semibold leading-tight tracking-[-0.03em]">{format(d, "d")}</p>
              </div>
            );
          })}
        </div>
        <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: H }} className="pr-2 text-right text-[11px] tabular text-faint">
                <span className="relative -top-2">{h} h</span>
              </div>
            ))}
          </div>
          {days.map((d) => {
            const k = dkey(d);
            const list = events.filter((e) => e.date === k);
            return (
              <div key={k} className="relative border-l border-line" style={{ height: hours.length * H }}>
                {hours.map((h) => (
                  <div key={h} className="border-t border-dashed border-line" style={{ height: H }} />
                ))}
                {k === today && nowMin > from * 60 && nowMin < to * 60 && (
                  <div className="absolute inset-x-0 z-20 flex items-center" style={{ top: ((nowMin - from * 60) / 60) * H }}>
                    <span className="-ml-1 size-2 rounded-full bg-danger" />
                    <span className="h-px flex-1 bg-danger" />
                  </div>
                )}
                {list.map((e, i) => {
                  const s = e.start ? toMin(e.start) : 9 * 60;
                  const en = e.end ? Math.max(toMin(e.end), s + 30) : s + 60;
                  const top = ((Math.max(s, from * 60) - from * 60) / 60) * H;
                  const h = Math.max(((en - Math.max(s, from * 60)) / 60) * H - 4, 34);
                  const overlap = list.filter((o) => (o.start ?? "09:00") === (e.start ?? "09:00")).length > 1;
                  const sel = selected === e.id;
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelect(e)}
                      className={cn(
                        "absolute z-10 overflow-hidden rounded-[12px] border-l-[3px] px-2.5 py-1.5 text-left transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-md",
                        sel && "shadow-md ring-2 ring-[var(--ring)]",
                        e.muted && "opacity-60",
                      )}
                      style={{
                        top: top + 2,
                        height: h,
                        left: overlap ? `calc(${(i % 2) * 50}% + 3px)` : 3,
                        right: overlap ? `calc(${(1 - (i % 2)) * 50}% + 3px)` : 3,
                        borderLeftColor: e.hue,
                        background: `color-mix(in oklab, ${e.hue} 13%, var(--panel))`,
                      }}
                    >
                      <p className={cn("line-clamp-2 text-[12.5px] font-semibold leading-snug", e.muted && "line-through")}>
                        {e.title}
                      </p>
                      {h > 46 && (
                        <p className="mt-0.5 truncate text-[11.5px] text-muted">
                          {e.start ? `${hhmm(e.start)}${e.end ? ` – ${hhmm(e.end)}` : ""}` : "Horaire à préciser"}
                        </p>
                      )}
                      {h > 70 && e.subtitle && <p className="truncate text-[11.5px] text-muted">{e.subtitle}</p>}
                    </button>
                  );
                })}
              </div>
            );
          })}
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
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-7 gap-1.5">
        {["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"].map((w) => (
          <p key={w} className="pb-1 text-center text-[11.5px] capitalize text-muted">
            {w}
          </p>
        ))}
        {days.map((d) => {
          const k = dkey(d);
          const list = events.filter((e) => e.date === k);
          return (
            <div
              key={k}
              className={cn(
                "min-h-[104px] rounded-[14px] p-1.5",
                isSameMonth(d, month) ? "bg-bg/80" : "bg-bg/30 opacity-60",
              )}
            >
              <span
                className={cn(
                  "mb-1 flex size-6 items-center justify-center rounded-full text-[12px] font-medium tabular",
                  k === today && "bg-night text-white dark:bg-primary dark:text-on-primary",
                )}
              >
                {format(d, "d")}
              </span>
              <div className="space-y-1">
                {list.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelect(e)}
                    className={cn(
                      "block w-full truncate rounded-md border-l-2 px-1.5 py-0.5 text-left text-[11.5px] font-medium",
                      selected === e.id && "ring-2 ring-[var(--ring)]",
                      e.muted && "line-through opacity-60",
                    )}
                    style={{ borderLeftColor: e.hue, background: `color-mix(in oklab, ${e.hue} 13%, var(--panel))` }}
                  >
                    {e.start && <span className="tabular text-muted">{e.start.slice(0, 5)} </span>}
                    {e.title}
                  </button>
                ))}
                {list.length > 3 && <p className="px-1 text-[11px] text-faint">+{list.length - 3} autres</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const weekOf = (d: Date) => eachDayOfInterval({ start: startOfWeek(d, { weekStartsOn: 1 }), end: addDays(startOfWeek(d, { weekStartsOn: 1 }), 6) });
export { parseISO };
