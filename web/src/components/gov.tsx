import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useState,
} from "react";
import { AlertTriangle, Check, CircleDashed, Clock, type LucideIcon, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "./ui";

// Composants de la version ANAT : libellé permanent, filet fin, halo à la saisie, erreur écrite sous le champ.
const fieldBase =
  "field-ring w-full rounded-xl border border-field bg-panel px-3.5 text-[13.5px] text-fg outline-none transition-[box-shadow,border-color] duration-150 placeholder:text-faint disabled:bg-hover disabled:text-muted disabled:shadow-none aria-[invalid=true]:border-danger";

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
  <input className={cn(fieldBase, "h-10", className)} {...p} />
);
export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(fieldBase, "h-10 pr-8", className)} {...p}>
    {children}
  </select>
);
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(fieldBase, "min-h-[88px] resize-y py-2 leading-relaxed", className)} {...p} />
);

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="relative isolate mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-7 sm:px-8">
      <div className="min-w-0">
        {subtitle && <p className="mb-1 max-w-2xl text-[14px] text-muted">{subtitle}</p>}
        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[38px]">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
      <div className="flex items-center justify-between gap-2 px-5 pb-1 pt-5">
        <h2 className="text-[16px] font-semibold tracking-[-0.015em]">{title}</h2>
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
  const { cls, Icon } = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11.5px] font-medium",
        cls,
      )}
    >
      <Icon className="size-3" strokeWidth={2.25} />
      {label}
    </span>
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

/** Tableau institutionnel : en-tête grisé, défilement horizontal sur téléphone. */
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-table-head text-left">
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="whitespace-nowrap px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-faint"
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
export const Tr = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
  <tr
    onClick={onClick}
    className={cn("border-t border-line", onClick && "cursor-pointer transition-colors hover:bg-hover")}
  >
    {children}
  </tr>
);
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
  return (
    <div
      role="tablist"
      className="mx-auto flex w-full max-w-[1240px] gap-2 overflow-x-auto px-4 pb-1 sm:px-8"
    >
      {items.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "h-10 shrink-0 whitespace-nowrap rounded-full border px-4.5 text-[13px] font-medium transition-colors",
            value === t.id
              ? "border-night bg-night text-white shadow-sm dark:border-primary dark:bg-primary dark:text-on-primary"
              : "border-line-strong bg-panel text-fg hover:bg-hover",
          )}
        >
          {t.label}
          {!!t.badge && (
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 text-[11px] font-semibold",
                value === t.id ? "bg-white/20 text-white" : "bg-brand-soft text-primary",
              )}
            >
              {t.badge}
            </span>
          )}
        </button>
      ))}
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
export const isLate = (d?: string | null, today = new Date().toISOString().slice(0, 10)) => !!d && d < today;
