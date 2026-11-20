import { createContext, useCallback, useContext, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import * as DM from "@radix-ui/react-dropdown-menu";
import {
  ArrowLeft,
  CheckCircle2,
  Hash,
  Copy,
  ExternalLink,
  Link2,
  type LucideIcon,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  SquareArrowOutUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { MenuContent, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui";
import { useShell } from "./shell";

/*
 * Clic droit comme dans un logiciel de bureau (20/11/2026). Un élément peut proposer ses propres actions (une tâche :
 * l'ouvrir, la terminer, copier sa référence…) ; tout lien interne offre « Ouvrir », « Ouvrir dans un nouvel onglet »
 * et « Copier le lien » ; partout, les actions générales de l'outil suivent. Les champs de saisie, le texte
 * sélectionné et Maj + clic droit gardent le menu du navigateur (copier, coller, correcteur).
 * Ces actions ne font que ce que l'écran permet déjà : le serveur contrôle les droits comme pour un clic ordinaire.
 */
export type CtxItem =
  | { label: string; icon?: LucideIcon; onSelect: () => void; danger?: boolean; hint?: string }
  | { title: string }
  | "-";

type Open = (x: number, y: number, items: CtxItem[], target: EventTarget | null) => void;
const Ctx = createContext<Open | null>(null);

/** Le navigateur garde la main là où son menu sert : saisie, texte sélectionné, Maj + clic droit. */
function wantsNative(e: { target: EventTarget | null; shiftKey: boolean }) {
  if (e.shiftKey) return true;
  const el = e.target instanceof Element ? e.target : null;
  if (el?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [data-native-menu]"))
    return true;
  return !!window.getSelection()?.toString().trim();
}

export async function copy(text: string, done = "Copié") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error("La copie n'est pas autorisée par le navigateur");
  }
}

/** Actions propres à un élément : `onContextMenu={menu(() => [...])}`. */
export function useContextMenu() {
  const open = useContext(Ctx);
  return (items: CtxItem[] | (() => CtxItem[])) => (e: MouseEvent) => {
    if (!open || wantsNative(e)) return;
    e.preventDefault();
    e.stopPropagation();
    open(e.clientX, e.clientY, typeof items === "function" ? items() : items, e.target);
  };
}

/** Les actions d'une tâche au clic droit : celles que la ligne permet déjà, plus la copie et l'assistant. */
export function useTaskMenu() {
  const menu = useContextMenu();
  const shell = useShell();
  return (
    t: { id: string; key?: string; title: string; completed?: boolean; project_id?: string },
    opts: { onOpen?: () => void; onToggle?: (v: boolean) => void; canEdit?: boolean } = {},
  ) =>
    menu(() => [
      { title: t.key ? `Tâche ${t.key}` : "Tâche" },
      { label: "Ouvrir la tâche", icon: SquareArrowOutUpRight, onSelect: opts.onOpen ?? (() => shell.openTask(t.id)) },
      ...(opts.onToggle && opts.canEdit !== false && t.completed !== undefined
        ? [
            {
              label: t.completed ? "Rouvrir la tâche" : "Marquer comme terminée",
              icon: CheckCircle2,
              onSelect: () => opts.onToggle!(!t.completed),
            },
          ]
        : []),
      ...(t.key ? [{ label: "Copier la référence", icon: Hash, onSelect: () => copy(t.key!, `Référence ${t.key} copiée`) }] : []),
      {
        label: "Copier le lien de la tâche",
        icon: Link2,
        onSelect: () => copy(`${location.origin}${location.pathname}?task=${t.id}`, "Lien copié"),
      },
      ...(t.project_id
        ? [{ label: "Nouvelle tâche dans ce projet", icon: Plus, onSelect: () => shell.openQuickAdd(t.project_id!) }]
        : []),
      {
        label: "Demander à l'assistant",
        icon: Sparkles,
        onSelect: () => shell.openAssistant(`Fais le point sur la tâche ${t.key ?? t.title} et propose les prochaines étapes.`),
      },
    ]);
}

/**
 * Une ligne de registre (décision, réunion, courrier, convention, dossier d'agent…) : l'ouvrir, l'ouvrir à côté,
 * copier son lien ou son numéro. Rien n'est proposé à une ligne qui ne mène nulle part.
 */
export function useRowMenu() {
  const menu = useContextMenu();
  const nav = useNavigate();
  return (o: { open?: () => void; href?: string; reference?: string; label?: string }) => {
    if (!o.open && !o.href && !o.reference) return undefined;
    const url = o.href ? new URL(o.href, location.href).href : undefined;
    return menu(() => [
      ...(o.label ? [{ title: o.label }] : []),
      ...(o.open || o.href
        ? [{ label: "Ouvrir", icon: SquareArrowOutUpRight, onSelect: o.open ?? (() => nav(o.href!)) }]
        : []),
      ...(url
        ? [
            { label: "Ouvrir dans un nouvel onglet", icon: ExternalLink, onSelect: () => window.open(url, "_blank", "noopener") },
            { label: "Copier le lien", icon: Link2, onSelect: () => copy(url, "Lien copié") },
          ]
        : []),
      ...(o.reference
        ? [{ label: "Copier le numéro", icon: Hash, onSelect: () => copy(o.reference!, `${o.reference} copié`) }]
        : []),
    ]);
  };
}

/** Nettoie les séparateurs en trop (en tête, en fin, doublés) et les actions répétées. */
function tidy(items: CtxItem[]) {
  const out: CtxItem[] = [];
  const seen = new Set<string>();
  for (const i of items) {
    if (i !== "-" && "label" in i) {
      if (seen.has(i.label)) continue;
      seen.add(i.label);
    }
    if (i === "-" && (!out.length || out[out.length - 1] === "-")) continue;
    out.push(i);
  }
  while (out[out.length - 1] === "-") out.pop();
  return out;
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const shell = useShell();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [state, setState] = useState<{ x: number; y: number; items: CtxItem[] } | null>(null);

  const open = useCallback<Open>(
    (x, y, own, target) => {
      const el = target instanceof Element ? target : null;
      const a = el?.closest<HTMLAnchorElement>("a[href]");
      const url = a ? new URL(a.href, location.href) : null;
      const internal = url && url.origin === location.origin;
      const path = url ? url.pathname + url.search + url.hash : "";
      const project = internal ? /^\/projects\/([^/?#]+)/.exec(url.pathname)?.[1] : undefined;
      const link: CtxItem[] = url
        ? [
            ...(internal ? [{ label: "Ouvrir", icon: SquareArrowOutUpRight, onSelect: () => nav(path) }] : []),
            {
              label: "Ouvrir dans un nouvel onglet",
              icon: ExternalLink,
              onSelect: () => window.open(url.href, "_blank", "noopener"),
            },
            { label: "Copier le lien", icon: Link2, onSelect: () => copy(url.href, "Lien copié") },
            ...(project
              ? [{ label: "Nouvelle tâche dans ce projet", icon: Plus, onSelect: () => shell.openQuickAdd(project) }]
              : []),
          ]
        : [];
      const general: CtxItem[] = [
        { label: "Rechercher…", icon: Search, hint: "Ctrl K", onSelect: () => shell.setPalette(true) },
        { label: "Nouvelle tâche", icon: Plus, onSelect: () => shell.openQuickAdd(null) },
        { label: "Demander à l'assistant", icon: Sparkles, onSelect: () => shell.openAssistant() },
        "-",
        { label: "Retour", icon: ArrowLeft, onSelect: () => nav(-1) },
        {
          label: "Actualiser",
          icon: RefreshCw,
          onSelect: () => {
            qc.invalidateQueries();
            toast.success("Données actualisées");
          },
        },
        { label: "Copier le lien de cette page", icon: Copy, onSelect: () => copy(location.href, "Lien copié") },
        {
          label: shell.theme === "dark" ? "Thème clair" : "Thème sombre",
          icon: shell.theme === "dark" ? Sun : Moon,
          onSelect: shell.toggleTheme,
        },
      ];
      setState({ x, y, items: tidy([...own, "-", ...link, "-", ...general]) });
    },
    [nav, qc, shell],
  );

  // Partout ailleurs : liens et actions générales
  useEffect(() => {
    const onMenu = (e: globalThis.MouseEvent) => {
      if (e.defaultPrevented || wantsNative(e)) return;
      const el = e.target instanceof Element ? e.target : null;
      // Les fenêtres et menus déjà ouverts gardent leur comportement
      if (el?.closest("[role='menu']")) return;
      e.preventDefault();
      open(e.clientX, e.clientY, [], e.target);
    };
    window.addEventListener("contextmenu", onMenu);
    return () => window.removeEventListener("contextmenu", onMenu);
  }, [open]);

  return (
    <Ctx.Provider value={open}>
      {children}
      {state && (
        <DM.Root key={`${state.x}-${state.y}`} open onOpenChange={(v) => !v && setState(null)}>
          <DM.Trigger asChild>
            <span
              aria-hidden
              style={{ position: "fixed", left: state.x, top: state.y, width: 0, height: 0, pointerEvents: "none" }}
            />
          </DM.Trigger>
          <MenuContent className="min-w-[230px]">
            {state.items.map((i, n) =>
              i === "-" ? (
                <MenuSeparator key={n} />
              ) : "title" in i ? (
                <MenuLabel key={n}>{i.title}</MenuLabel>
              ) : (
                <MenuItem
                  key={n}
                  danger={i.danger}
                  icon={i.icon ? <i.icon className="size-3.5" /> : undefined}
                  right={i.hint ? <span className="text-[11px] text-faint">{i.hint}</span> : undefined}
                  onSelect={i.onSelect}
                >
                  {i.label}
                </MenuItem>
              ),
            )}
          </MenuContent>
        </DM.Root>
      )}
    </Ctx.Provider>
  );
}
