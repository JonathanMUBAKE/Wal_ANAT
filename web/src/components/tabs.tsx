import { useId, type ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./ui";

/*
 * Onglets soulignés : un seul composant pour toutes les pages (demande de l'utilisateur, 20/11/2026). Vues d'un
 * projet, d'une entité, de Mes tâches, des réunions, sections d'une fiche : même hauteur, même trait qui glisse
 * d'un onglet à l'autre, même ressort. Un onglet est un bouton, ou un lien quand la vue a sa propre adresse.
 */
export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  Icon?: LucideIcon;
  iconClass?: string;
  badge?: number;
  /** Adresse de la vue : l'onglet devient un lien. */
  to?: string;
  /** Un filet sépare cet onglet du groupe précédent. */
  divided?: boolean;
}

export function TabBar<T extends string>({
  value,
  onChange,
  items,
  label,
  className,
}: {
  value: T;
  onChange?: (v: T) => void;
  items: TabItem<T>[];
  label?: string;
  className?: string;
}) {
  const group = useId();
  return (
    <div role="tablist" aria-label={label} className={cn("flex overflow-x-auto", className)}>
      {items.map((t) => {
        const on = value === t.id;
        const cls = cn(
          "group/tab relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-[13px] font-medium transition-colors duration-200 first:pl-0",
          on ? "text-fg" : "text-muted hover:text-fg",
        );
        const body = (
          <>
            {on && (
              <motion.span
                layoutId={`tab-${group}`}
                className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-primary group-first/tab:left-0"
                transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.7 }}
              />
            )}
            {t.Icon && <t.Icon className={cn("size-3.5", t.iconClass)} />}
            {t.label}
            {!!t.badge && (
              <span className="rounded-md bg-brand-soft px-1.5 text-[11px] font-semibold tabular text-primary">{t.badge}</span>
            )}
          </>
        );
        const tab = t.to ? (
          <Link key={t.id} to={t.to} role="tab" aria-selected={on} className={cls}>
            {body}
          </Link>
        ) : (
          <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => onChange?.(t.id)} className={cls}>
            {body}
          </button>
        );
        return t.divided ? [<span key={`${t.id}-sep`} aria-hidden className="mx-2 my-3 w-px shrink-0 bg-line" />, tab] : tab;
      })}
    </div>
  );
}
