import { motion } from "motion/react";
import { todayIso } from "@/lib/format";
import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useState,
} from "react";
import { AlertTriangle, Check, ChevronRight, CircleDashed, Clock, type LucideIcon, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Hint, cn } from "./ui";
import { useRowMenu } from "@/lib/context-menu";

// Composants de la version ANAT : libellé permanent, filet fin, halo à la saisie, erreur écrite sous le champ.
const fieldBase =
  "field-ring w-full rounded-lg border border-field bg-panel px-3 text-[13.5px] text-fg outline-none transition-[box-shadow,border-color] duration-150 placeholder:text-faint disabled:bg-hover disabled:text-muted disabled:shadow-none aria-[invalid=true]:border-danger";

export function Field({
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  children: (a: { id: string; "aria-invalid"?: boolean; "aria-required"?: boolean }) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-medium text-muted">
        {label}
        {required && (
          <>
            <span aria-hidden className="ml-0.5 text-danger">
              *
            </span>
            <span className="sr-only"> (obligatoire)</span>
          </>
        )}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-required": required || undefined })}
      {hint && !error && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-[12px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(fieldBase, "h-9", className)} {...p} />
);
export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(fieldBase, "h-9 pr-8", className)} {...p}>
    {children}
  </select>
);
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(fieldBase, "min-h-[88px] resize-y py-2 leading-relaxed", className)} {...p} />
);

/** En-tête de page du gabarit Cadastre : fil d'Ariane, carré d'icône, titre 24 px, aide d'une ligne, actions à droite. */
export function PageHeader({
  title,
  subtitle,
  actions,
  Icon,
  crumbs,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  Icon?: LucideIcon;
  crumbs?: string[];
}) {
  return (
    <header className="mx-auto w-full max-w-[1480px] px-4 pb-3 pt-5 sm:px-6">
      {crumbs && (
        <p className="mb-2.5 flex items-center gap-1.5 text-[12.5px] text-muted">
          {crumbs.map((c, i) => (
            <span key={c} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3 text-faint" />}
              <span className={i === crumbs.length - 1 ? "text-fg" : ""}>{c}</span>
            </span>
          ))}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
              <Icon className="size-[18px]" />
            </span>
          )}
          <h1 className="min-w-0 text-[22px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
          {typeof subtitle === "string" && subtitle.length > 70 && <Hint iconOnly>{subtitle}</Hint>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {/* Un sous-titre court (date, numéro) reste sous le titre ; une explication passe derrière ⓘ */}
      {subtitle && !(typeof subtitle === "string" && subtitle.length > 70) && (
        <p className="mt-1 max-w-2xl text-[13px] text-muted">{subtitle}</p>
      )}
    </header>
  );
}

export const Section = ({
  title,
  aside,
  children,
  className,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cn("rounded-2xl border border-line bg-panel shadow-sm", className)}>
    {title && (
      <div className="flex items-center justify-between gap-2 px-5 pb-1 pt-4">
        <h2 className="text-[14.5px] font-medium tracking-[-0.01em]">{title}</h2>
        {aside}
      </div>
    )}
    {children}
  </section>
);

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";
const TONES: Record<Tone, { cls: string; Icon: LucideIcon }> = {
  neutral: { cls: "bg-hover text-muted", Icon: CircleDashed },
  info: { cls: "bg-info-soft text-info", Icon: Clock },
  success: { cls: "bg-success-soft text-success", Icon: Check },
  warning: { cls: "bg-warning-soft text-warning", Icon: AlertTriangle },
  danger: { cls: "bg-danger-soft text-danger", Icon: X },
};
/** Statut toujours écrit, avec couleur et icône : jamais la couleur seule. */
export function Status({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const { cls } = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 text-[12px] font-medium text-fg",
        cls.split(" ").find((c) => c.startsWith("bg-")),
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-[2px] bg-current", cls.split(" ").find((c) => c.startsWith("text-")))} />
      {label}
    </span>
  );
}

export type StatTone = "danger" | "warning" | "success" | "info" | "neutral";
const STAT_TILE: Record<StatTone, string> = {
  danger: "bg-danger text-white",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  neutral: "bg-hover text-muted",
};
/**
 * Un chiffre clé : un libellé court, une pastille d'icône dont la couleur dit s'il faut agir, le chiffre. Un point
 * d'attention majeur (`strong`) teinte la carte entière.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  strong,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  strong?: boolean;
}) {
  return (
    <div className={cn("card-hover min-w-0 rounded-2xl border p-3.5 shadow-sm", strong ? "border-danger/40 bg-danger-soft" : "border-line bg-panel")}>
      <p className="truncate text-[13px] font-medium">{label}</p>
      <p className="mt-3 flex items-center gap-2.5">
        {icon && <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", STAT_TILE[tone])}>{icon}</span>}
        <span className={cn("text-[26px] font-medium leading-none tracking-[-0.02em] tabular", (strong || tone === "danger") && "text-danger")}>
          {typeof value === "number" ? <CountUp value={value} duration={700} /> : value}
        </span>
      </p>
      {hint && <p className="mt-2 truncate text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => (
  <div aria-hidden className={cn("skeleton rounded-md", className)} />
);
export const LoadingRows = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2 p-4" role="status" aria-label="Chargement">
    {Array.from({ length: rows }, (_, i) => (
      <Skeleton key={i} className="h-10 w-full" />
    ))}
  </div>
);

export function ProgressBar({
  value,
  tone = "info",
}: {
  value: number;
  tone?: "info" | "success" | "warning" | "danger";
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-sm bg-hover"
    >
      <div
        className="bar-fill h-full"
        style={{ width: `${v}%`, background: `var(--${tone === "info" ? "primary" : tone})` }}
      />
    </div>
  );
}

/** Comptage jusqu'à la valeur, supprimé si le poste demande de réduire les animations. */
export function CountUp({ value, duration = 500 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(value);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="tabular">{shown.toLocaleString("fr-FR")}</span>;
}

/** Tampon officiel, imprimé une seule fois quand le document vient d'être validé. */
export const Stamp = ({ children }: { children: ReactNode }) => (
  <span className="stamp-in inline-block rotate-[-4deg] rounded-md border-2 border-success px-3 py-1 text-[13px] font-extrabold uppercase tracking-wider text-success">
    {children}
  </span>
);

/** Tableau institutionnel : en-tête discret sur un filet, défilement horizontal sur téléphone. */
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="relative overflow-x-auto px-3 pt-2">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-left">
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="whitespace-nowrap bg-bg px-3 py-2.5 text-[12px] font-medium text-muted first:rounded-l-lg last:rounded-r-lg"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="stagger">{children}</tbody>
      </table>
    </div>
  );
}
export const Tr = ({
  children,
  onClick,
  onContextMenu,
  href,
  reference,
}: {
  children: ReactNode;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  /** Adresse de la fiche : « Ouvrir dans un nouvel onglet » et « Copier le lien » au clic droit. */
  href?: string;
  /** Numéro officiel : « Copier le numéro » au clic droit. */
  reference?: string;
}) => {
  const rowMenu = useRowMenu();
  return (
    <tr
      onClick={onClick}
      onContextMenu={onContextMenu ?? rowMenu({ open: onClick, href, reference })}
      className={cn("border-t border-line", onClick && "cursor-pointer transition-colors hover:bg-hover")}
    >
      {children}
    </tr>
  );
};
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cn("px-3 py-2.5 align-top", className)}>{children}</td>
);

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; badge?: number }[];
}) {
  const group = useId();
  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 sm:px-8">
      {/* Les onglets passent à la ligne dès la tablette ; ils ne défilent que sur téléphone (E-10) */}
      <div role="tablist" className="flex overflow-x-auto border-b border-line sm:flex-wrap sm:overflow-visible">
        {items.map((t) => {
          const on = value === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => onChange(t.id)}
              className={cn(
                "group/tab relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-[13px] font-medium transition-colors duration-200 first:pl-0",
                on ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {on && (
                <motion.span
                  layoutId={`tab-${group}`}
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-primary group-first/tab:left-0"
                  transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.7 }}
                />
              )}
              {t.label}
              {!!t.badge && (
                <span className="rounded-md bg-brand-soft px-1.5 text-[11px] font-semibold tabular text-primary">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Domaine du catalogue commun : c'est lui qui permet de comparer l'activité aux attributions. */
export function DomainSelect({
  value,
  onChange,
  ...a
}: { value: string | null | undefined; onChange: (v: string) => void } & Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
>) {
  const { data } = useQuery({
    queryKey: ["domains"],
    queryFn: () => api.get<{ id: string; name: string; archived: boolean }[]>("/api/domains"),
  });
  return (
    <Select {...a} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">Non précisé</option>
      {data
        ?.filter((d) => !d.archived || d.id === value)
        .map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
    </Select>
  );
}

/** L'activité du plan de travail que ce dossier réalise : son avancement y remontera (lot P3c). */
export function PlanActivitySelect({
  value,
  onChange,
  ...a
}: { value: string | null | undefined; onChange: (v: string) => void } & Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
>) {
  const { data } = useQuery({
    queryKey: ["plan-activities"],
    queryFn: () =>
      api.get<{ id: string; title: string; year: number; unit_name: string; plan_status: string }[]>(
        "/api/plan-activities",
      ),
    retry: false,
  });
  return (
    <Select {...a} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">Hors plan de travail</option>
      {data
        ?.filter((p) => p.plan_status === "approved" || p.id === value)
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.title} — {p.unit_name}, {p.year}
          </option>
        ))}
    </Select>
  );
}

export function PeopleSelect({
  value,
  onChange,
  people,
  placeholder = "Choisir…",
  ...a
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  people: { id: string; name: string; is_ai?: boolean }[] | undefined;
  placeholder?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  return (
    <Select {...a} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {people
        ?.filter((p) => !p.is_ai)
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
    </Select>
  );
}

export const frDate = (d?: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—");
export const isLate = (d?: string | null, today = todayIso()) => !!d && d < today;
