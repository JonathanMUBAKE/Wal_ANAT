import { memo, type MouseEvent, type ReactNode } from "react";
import { ChevronDown, CornerDownRight, Sparkles } from "lucide-react";
import { Avatar, Checkbox, ProjectIcon, cn } from "./ui";
import { DueChip, PriorityFlag } from "./pickers";
import { TaskMetaRow } from "./TaskDrawer";
import type { ProjectSummary, Task, User } from "@/lib/types";
import { useTaskMenu } from "@/lib/context-menu";

/*
 * Une seule ligne pour tout ce qui est une tâche (demande de l'utilisateur, 20/11/2026) : tâche, sous-tâche et tâche
 * confiée partagent les mêmes colonnes, dans le même ordre, aux mêmes largeurs. D'une section à l'autre, le lieu,
 * la priorité, l'échéance et la personne tombent donc à la verticale les uns des autres.
 *
 *   [état] [↳ titre · précision]        [repères] [lieu] [priorité] [échéance] [personne]
 */
export function TaskLine({
  leading,
  title,
  detail,
  done,
  sub,
  nested,
  badges,
  meta,
  place,
  flag,
  due,
  person,
  dense,
  onOpen,
  onContextMenu,
}: {
  /** Case à cocher, ou repère d'état quand la personne ne peut pas cocher elle-même. */
  leading: ReactNode;
  title: ReactNode;
  /** Précision à la suite du titre, en retrait de ton : tâche parente, personne chargée. */
  detail?: ReactNode;
  done?: boolean;
  /** Sous-tâche : une flèche de rattachement précède le titre. */
  sub?: boolean;
  /** Sous-tâche affichée sous sa tâche : elle se décale d'un cran. */
  nested?: boolean;
  /** États à signaler tout de suite (IA au travail, à valider, report demandé). */
  badges?: ReactNode;
  /** Repères discrets : sous-tâches, commentaires, étiquettes. */
  meta?: ReactNode;
  /** Projet ou entité. `undefined` : la colonne n'existe pas (liste d'un seul projet). */
  place?: ReactNode | null;
  flag?: ReactNode;
  due?: ReactNode;
  person?: ReactNode;
  dense?: boolean;
  onOpen: () => void;
  onContextMenu?: (e: MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={cn(
        "group flex cursor-default items-center gap-3 border-b border-line px-3 transition-colors hover:bg-hover sm:px-4",
        dense ? "h-10" : "h-11",
        nested && "pl-9 sm:pl-10",
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">{leading}</span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[13.5px]">
        {sub && <CornerDownRight className="size-3.5 shrink-0 text-faint" aria-label="Sous-tâche" />}
        <span className={cn("truncate", done && "text-faint line-through decoration-1")}>{title}</span>
        {detail && <span className="hidden min-w-0 shrink truncate text-[12px] text-faint sm:inline">{detail}</span>}
      </span>
      {badges}
      {meta && <span className="hidden shrink-0 items-center gap-3 md:flex">{meta}</span>}
      {place !== undefined && (
        <span className="hidden w-[200px] shrink-0 items-center gap-1.5 text-[12px] text-muted lg:flex">{place}</span>
      )}
      <span className="flex w-5 shrink-0 justify-center">{flag}</span>
      <span className="w-[92px] shrink-0 text-right">{due}</span>
      <span className="flex w-6 shrink-0 justify-end">{person}</span>
    </div>
  );
}

/** En-tête repliable d'un groupe de tâches : section d'un projet, échéance de Mes tâches, tâches confiées. */
export function TaskGroupHeader({
  label,
  count,
  note,
  danger,
  open,
  onToggle,
  aside,
}: {
  label: string;
  count: number;
  /** Précision d'alerte à la suite du compteur (« 2 en retard »). */
  note?: string;
  danger?: boolean;
  open: boolean;
  onToggle: () => void;
  /** Actions de la section, à droite. */
  aside?: ReactNode;
}) {
  return (
    <div className="group sticky top-0 z-10 flex h-11 items-center gap-2 border-b border-line bg-bg/90 px-4 backdrop-blur sm:px-8">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex items-center gap-2 text-left">
        <ChevronDown className={cn("size-4 text-faint transition-transform duration-200", !open && "-rotate-90")} />
        <span className={cn("text-[13.5px] font-semibold", danger && "text-danger")}>{label}</span>
      </button>
      <span className="text-[12px] tabular text-faint">{count}</span>
      {note && <span className="text-[12px] text-danger">{note}</span>}
      {aside && <span className="ml-auto opacity-60 transition-opacity group-hover:opacity-100">{aside}</span>}
    </div>
  );
}

/** Étiquette d'état d'une ligne : même forme partout. */
export const LineBadge = ({ tone, children }: { tone: "ai" | "info" | "warning"; children: ReactNode }) => (
  <span
    className={cn(
      "inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11.5px] font-medium",
      tone === "ai" && "bg-ai-soft text-ai-fg",
      tone === "info" && "bg-info-soft text-info",
      tone === "warning" && "bg-warning-soft text-warning",
    )}
  >
    {children}
  </span>
);

/** Ligne de tâche réutilisée par la vue Liste, Mes tâches et l'accueil. */
export const TaskRow = memo(function TaskRow({
  t,
  assignee,
  onOpen,
  onToggle,
  aiActive,
  project,
  dense,
  nested,
  canEdit = true,
}: {
  t: Task;
  assignee?: User | null;
  onOpen: () => void;
  onToggle: (v: boolean) => void;
  aiActive?: boolean;
  project?: ProjectSummary;
  dense?: boolean;
  /** Sous-tâche rangée sous sa tâche : inutile alors de répéter le nom de la tâche. */
  nested?: boolean;
  canEdit?: boolean;
}) {
  const taskMenu = useTaskMenu();
  return (
    <TaskLine
      leading={<Checkbox checked={t.completed} onChange={(v) => canEdit && onToggle(v)} />}
      title={t.title}
      detail={!nested && t.parent_title ? t.parent_title : undefined}
      done={t.completed}
      sub={!!t.parent_id}
      nested={nested}
      dense={dense}
      badges={
        aiActive ? (
          <LineBadge tone="ai">
            <Sparkles className="pulse-dot size-3" />
            IA au travail
          </LineBadge>
        ) : undefined
      }
      meta={<TaskMetaRow t={t} />}
      place={
        project ? (
          <>
            <ProjectIcon icon={project.icon} color={project.color} size={16} />
            <span className="truncate">{project.name}</span>
          </>
        ) : undefined
      }
      flag={<PriorityFlag p={t.priority} />}
      due={<DueChip due={t.due_on} done={t.completed} />}
      person={<Avatar user={assignee} size={22} />}
      onOpen={onOpen}
      onContextMenu={taskMenu(t, { onOpen, onToggle, canEdit })}
    />
  );
});
