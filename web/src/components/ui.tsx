import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";
import * as DM from "@radix-ui/react-dropdown-menu";
import * as PO from "@radix-ui/react-popover";
import * as DI from "@radix-ui/react-dialog";
import * as TT from "@radix-ui/react-tooltip";
import {
  Info,
  Check,
  Globe,
  LoaderCircle,
  Lock,
  Megaphone,
  Rocket,
  Smartphone,
  Sparkles,
  Target,
  X,
  Folder,
  Users,
  Brain,
} from "lucide-react";
import type { User } from "@/lib/types";

export const cn = clsx;

/**
 * La carte de la maison, écrite une seule fois (docs/DESIGN-SYSTEM.md § 2, « Retenue »). Filet net et ombre à
 * peine posée ; en thème sombre, --shadow-sm ajoute le filet de lumière au sommet. Les marges restent au
 * point d'appel : p-5 pour une carte pleine, rien quand la carte est découpée en en-tête et en corps.
 */
export const CARD = "rounded-2xl border border-line bg-panel shadow-sm";

/** Modal centré : la même parcelle, mais détachée — l'ombre portée dit qu'elle flotte au-dessus de la page. */
export const MODAL = "rounded-2xl border border-line bg-panel shadow-lg";

/** Panneau latéral (tiroir, assistant) : plein écran sur téléphone, parcelle détachée à partir de la tablette. */
export const PANEL = "border-line bg-panel shadow-lg sm:rounded-2xl sm:border";

// ------------------------------------------------------------------ repères de registre
/*
 * Nos écrans sont des registres : ils sont pleins de numéros officiels (ENT/2026/0142), de dates (23/11/2026),
 * de matricules et de montants. Écrits dans la chasse du texte courant, ces repères flottent d'une ligne à
 * l'autre ; en chasse fixe tabulaire, ils se rangent en colonne et se comparent sans les lire. La reconnaissance
 * se fait ici, une fois, pour tout ce qui passe par une cellule de tableau ou par la valeur d'un fait : aucune
 * page n'a à le savoir. Un texte ordinaire n'est jamais touché.
 */
const REPERE = /^(?:\d[\dh\s.,:'/-]*(?:\s?(?:%|€|\$|[A-Z]{2,4}))?|[A-Z0-9]{2,8}(?:[/-][A-Z0-9]{1,8}){1,4})$/u;
/**
 * Vrai si la valeur est un repère : une chaîne courte faite de chiffres (date « 23/11/2026 », heure « 16 h 00 »,
 * montant, pourcentage) ou un numéro officiel à segments (« ENT/2026/0142 », « 0007/ANAT/DG »). Une phrase, un nom
 * ou un libellé contiennent d'autres lettres : ils ne sont jamais touchés.
 */
export const estRepere = (v: ReactNode): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= 32 && REPERE.test(v.trim());
/** Pose la chasse fixe sur un repère et laisse tout le reste exactement en l'état. */
export const repere = (v: ReactNode): ReactNode => (estRepere(v) ? <span className="repere">{v}</span> : v);

// ------------------------------------------------------------------ boutons
type Variant = "primary" | "secondary" | "ghost" | "ai" | "danger";
type Size = "sm" | "md" | "lg";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-[background,color,box-shadow,border-color,transform] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 select-none",
        size === "sm" && "h-8 rounded-lg px-2.5 text-[12.5px]",
        size === "md" && "h-9 rounded-lg px-3.5 text-[13px]",
        size === "lg" && "h-10 rounded-lg px-4 text-sm",
        variant === "primary" && "btn-brand text-on-primary",
        variant === "secondary" && "border border-line-strong bg-raised text-fg hover:bg-hover",
        variant === "ghost" && "text-muted hover:bg-hover hover:text-fg",
        variant === "ai" &&
          "border border-ai-line bg-ai-soft text-ai-fg hover:bg-[color-mix(in_oklab,var(--ai)_16%,transparent)]",
        variant === "danger" && "border border-line bg-raised text-danger hover:bg-danger-soft",
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: "sm" | "md" }
>(function IconButton({ label, size = "md", className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-fg disabled:opacity-40",
        size === "sm" ? "size-6" : "size-8",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export const Spinner = ({ className }: { className?: string }) => (
  <LoaderCircle className={cn("size-4 animate-spin text-faint", className)} />
);
export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-line bg-panel px-1 font-mono text-[11px] text-faint">
    {children}
  </kbd>
);

// ------------------------------------------------------------------ avatars
export function Avatar({ user, size = 22, ring }: { user?: User | null; size?: number; ring?: boolean }) {
  const [broken, setBroken] = useState<string | null>(null);
  if (!user) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-faint"
        style={{ width: size, height: size }}
      >
        <Users style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }
  if (user.avatar_url && broken !== user.avatar_url) {
    return (
      <span
        title={user.name}
        className={cn("relative inline-flex shrink-0", ring && "rounded-full ring-2 ring-panel")}
        style={{ width: size, height: size }}
      >
        <img
          src={user.avatar_url}
          alt={user.name}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(user.avatar_url!)}
          className={cn("size-full rounded-full object-cover", user.is_ai && "ring-1 ring-ai-line")}
        />
        {/* Une photo ne doit pas faire oublier qu'il s'agit d'une IA */}
        {user.is_ai && size >= 18 && (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-ai text-white ring-2 ring-panel"
            style={{ width: Math.max(10, size * 0.42), height: Math.max(10, size * 0.42) }}
          >
            <Sparkles style={{ width: Math.max(6, size * 0.26), height: Math.max(6, size * 0.26) }} strokeWidth={2.6} />
          </span>
        )}
      </span>
    );
  }
  if (user.is_ai) {
    return (
      <span
        title={user.name}
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-full text-white",
          ring && "ring-2 ring-panel",
        )}
        style={{
          width: size,
          height: size,
          background: `conic-gradient(from 210deg, ${user.avatar_color}, var(--highlight), ${user.avatar_color})`,
        }}
      >
        <Sparkles style={{ width: size * 0.52, height: size * 0.52 }} strokeWidth={2.2} />
      </span>
    );
  }
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      title={user.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        ring && "ring-2 ring-panel",
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(140deg, ${user.avatar_color}, color-mix(in oklab, ${user.avatar_color} 70%, black))`,
      }}
    >
      {initials}
    </span>
  );
}
export function AvatarStack({
  users,
  max = 4,
  size = 22,
}: {
  users: (User | undefined)[];
  max?: number;
  size?: number;
}) {
  const list = users.filter(Boolean) as User[];
  return (
    <span className="flex items-center -space-x-1.5">
      {list.slice(0, max).map((u) => (
        <Avatar key={u.id} user={u} size={size} ring />
      ))}
      {list.length > max && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-active text-[11px] font-medium text-muted ring-2 ring-panel"
          style={{ width: size, height: size }}
        >
          +{list.length - max}
        </span>
      )}
    </span>
  );
}

// ------------------------------------------------------------------ pastilles
export function Chip({
  children,
  tone = "muted",
  className,
  icon,
}: {
  children: ReactNode;
  tone?: "muted" | "danger" | "warning" | "success" | "ai" | "info";
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[12px] font-medium",
        tone === "muted" && "bg-hover text-muted",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "warning" && "bg-warning-soft text-warning",
        tone === "success" && "bg-success-soft text-success",
        tone === "info" && "bg-info-soft text-info",
        tone === "ai" && "bg-ai-soft text-ai-fg",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const ICONS: Record<string, typeof Rocket> = {
  rocket: Rocket,
  smartphone: Smartphone,
  megaphone: Megaphone,
  globe: Globe,
  lock: Lock,
  target: Target,
  folder: Folder,
  brain: Brain,
  users: Users,
};
export const PROJECT_ICONS = Object.keys(ICONS);
export function ProjectIcon({ icon, color, size = 22 }: { icon: string; color: string; size?: number }) {
  const I = ICONS[icon] ?? Folder;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md"
      style={{ width: size, height: size, background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
    >
      <I style={{ width: size * 0.58, height: size * 0.58 }} strokeWidth={2} />
    </span>
  );
}

export function ProgressRing({
  value,
  size = 36,
  stroke = 3.5,
  color = "var(--fg)",
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
        style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.2,.8,.2,1)" }}
      />
    </svg>
  );
}

export function Checkbox({
  checked,
  onChange,
  size = 18,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: number;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? (checked ? "Marquer non terminée" : "Marquer terminée")}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "group/cb inline-flex shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        checked
          ? "border-success bg-success text-on-success"
          : "border-line-strong text-transparent hover:border-success hover:text-success",
      )}
      style={{ width: size, height: size }}
    >
      <Check style={{ width: size * 0.6, height: size * 0.6 }} strokeWidth={3} />
    </button>
  );
}

export function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  // Rien ne flotte : la liste vide se range sur la marge de la carte, à la place qu'occuperait la première ligne,
  // et dit en deux phrases ce qui manque et quoi faire (docs/DESIGN-SYSTEM.md § 5.6, règle 16).
  return (
    <div className="flex items-start gap-3 px-5 py-8">
      {icon && <span className="mt-px shrink-0 text-faint [&_svg]:size-[18px]">{icon}</span>}
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-fg">{title}</p>
        {children && <p className="mt-1 max-w-[62ch] text-[13px] text-muted">{children}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ menus, popovers, dialogues, infobulles
export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;
export function MenuContent({
  children,
  align = "start",
  className,
}: {
  children: ReactNode;
  align?: "start" | "end" | "center";
  className?: string;
}) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={6}
        collisionPadding={12}
        className={cn(
          "z-50 min-w-[200px] overflow-hidden rounded-xl border border-line bg-raised p-1 pop shadow-lg",
          className,
        )}
      >
        {children}
      </DM.Content>
    </DM.Portal>
  );
}
export function MenuItem({
  children,
  onSelect,
  icon,
  danger,
  right,
}: {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  danger?: boolean;
  right?: ReactNode;
}) {
  return (
    <DM.Item
      onSelect={onSelect}
      className={cn(
        "flex h-8 cursor-default select-none items-center gap-2 rounded-md px-2 text-[13px] outline-none transition-colors duration-100 data-[highlighted]:bg-hover",
        danger ? "text-danger" : "text-fg",
      )}
    >
      {icon && <span className="flex w-4 justify-center text-muted">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {right}
    </DM.Item>
  );
}
export const MenuSeparator = () => <DM.Separator className="my-1 h-px bg-line" />;
export function MenuSub({ label, icon, children }: { label: ReactNode; icon?: ReactNode; children: ReactNode }) {
  return (
    <DM.Sub>
      <DM.SubTrigger className="flex h-8 cursor-default select-none items-center gap-2 rounded-md px-2 text-[13px] text-fg outline-none data-[highlighted]:bg-hover data-[state=open]:bg-hover">
        {icon && <span className="flex w-4 justify-center text-muted">{icon}</span>}
        <span className="flex-1 truncate">{label}</span>
        <span className="text-faint">›</span>
      </DM.SubTrigger>
      <DM.Portal>
        <DM.SubContent
          sideOffset={6}
          collisionPadding={12}
          className="pop z-50 max-h-[320px] min-w-[220px] overflow-y-auto rounded-xl border border-line bg-raised p-1 shadow-lg"
        >
          {children}
        </DM.SubContent>
      </DM.Portal>
    </DM.Sub>
  );
}
export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <DM.Label className="px-2 pb-1 pt-1.5 text-[11.5px] font-medium text-faint">{children}</DM.Label>
);

export const Popover = PO.Root;
export const PopoverTrigger = PO.Trigger;
export function PopoverContent({
  children,
  className,
  align = "start",
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}) {
  return (
    <PO.Portal>
      <PO.Content
        align={align}
        sideOffset={6}
        collisionPadding={12}
        className={cn("pop z-50 rounded-xl border border-line bg-raised p-1 shadow-lg outline-none", className)}
      >
        {children}
      </PO.Content>
    </PO.Portal>
  );
}
export const PopoverClose = PO.Close;

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = 560,
  footer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}) {
  return (
    <DI.Root open={open} onOpenChange={onOpenChange}>
      <DI.Portal>
        <DI.Overlay className="overlay-in fixed inset-0 z-50 bg-night/35 backdrop-blur-[3px] dark:bg-black/60" />
        <DI.Content
          className={cn(
            MODAL,
            "dialog-in fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[calc(100vw-24px)] -translate-x-1/2 flex-col overflow-hidden outline-none",
          )}
          style={{ maxWidth: width }}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 pb-3.5 pt-4">
            <div className="min-w-0 flex-1">
              <DI.Title className="text-[15px] font-semibold">{title}</DI.Title>
              {description ? (
                <DI.Description className="mt-0.5 text-[13px] text-muted">{description}</DI.Description>
              ) : (
                <DI.Description className="sr-only">{String(title)}</DI.Description>
              )}
            </div>
            <DI.Close asChild>
              <IconButton label="Fermer" size="sm">
                <X className="size-4" />
              </IconButton>
            </DI.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-line bg-bg/50 px-5 py-3">{footer}</div>
          )}
        </DI.Content>
      </DI.Portal>
    </DI.Root>
  );
}

/** Demande de confirmation avant une action qu'on ne peut pas annuler. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      width={440}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            variant="danger"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13.5px] text-muted">{description}</p>
    </Dialog>
  );
}

/**
 * Explication repliée (écrans sobres, 20/11/2026) : une seule ligne discrète précédée d'une icône ; un clic ou une
 * pression du doigt affiche le texte entier. L'explication reste disponible sans encombrer l'écran.
 */
export function Hint({
  children,
  className,
  iconOnly,
}: {
  children: ReactNode;
  className?: string;
  iconOnly?: boolean;
}) {
  return (
    <PO.Root>
      <PO.Trigger asChild>
        <button
          type="button"
          /* Quand la première ligne est visible, c'est elle qui nomme le bouton : un libellé posé par-dessus la
             masquerait à l'assistance. Il ne sert donc qu'à l'icône seule. */
          aria-label={iconOnly ? "Afficher l'explication" : undefined}
          className={cn(
            "flex max-w-full min-w-0 items-center gap-1.5 text-left text-[12.5px] text-faint transition-colors hover:text-muted",
            className,
          )}
        >
          <Info className={iconOnly ? "size-4 shrink-0" : "size-3.5 shrink-0"} />
          {!iconOnly && <span className="min-w-0 max-w-[46ch] truncate">{children}</span>}
        </button>
      </PO.Trigger>
      <PopoverContent className="max-w-sm p-3 text-[13px] leading-relaxed text-muted">{children}</PopoverContent>
    </PO.Root>
  );
}

export const TooltipProvider = TT.Provider;
export function Tip({
  label,
  children,
  side = "top",
}: {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TT.Root delayDuration={350}>
      <TT.Trigger asChild>{children}</TT.Trigger>
      <TT.Portal>
        <TT.Content
          side={side}
          sideOffset={6}
          className="pop z-[60] max-w-xs rounded-md bg-fg px-2 py-1 text-[12px] text-bg shadow-md"
        >
          {label}
        </TT.Content>
      </TT.Portal>
    </TT.Root>
  );
}

// ------------------------------------------------------------------ Markdown minimal (gras, listes, code)
export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const inline = (s: string, k: string | number) => {
    const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`|\b[A-Z][A-Z0-9]{1,9}-\d+\b|#\d+|@\p{L}+)/gu);
    return (
      <span key={k}>
        {parts.map((p, i) => {
          if (/^\*\*.+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
          if (/^`.+`$/.test(p)) return <code key={i}>{p.slice(1, -1)}</code>;
          if (/^(#\d+|[A-Z][A-Z0-9]{1,9}-\d+)$/.test(p))
            return (
              <span key={i} className="font-mono text-[0.92em] text-ai-fg">
                {p}
              </span>
            );
          if (/^@\p{L}+$/u.test(p))
            return (
              <span key={i} className="rounded bg-info-soft px-0.5 font-medium text-info">
                {p}
              </span>
            );
          return p;
        })}
      </span>
    );
  };
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`l${blocks.length}`}>
          {list.map((l, i) => (
            <li key={i}>{inline(l, i)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (m) {
      list.push(m[1]);
      continue;
    }
    flush();
    if (line.trim()) blocks.push(<p key={`p${blocks.length}`}>{inline(line.replace(/^#+\s*/, ""), 0)}</p>);
  }
  flush();
  return <div className={cn("prose-ai", className)}>{blocks}</div>;
}
