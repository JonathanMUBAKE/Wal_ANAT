import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { cn } from "@/components/ui";
import type { Task } from "@/lib/types";
import { TaskGroupHeader, TaskRow } from "@/components/TaskRow";
import { SectionMenu } from "@/components/SectionMenu";
import { useCreateTask, useUpdateTask, useUserMap } from "@/lib/hooks";
import { useShell } from "@/lib/shell";
import { api } from "@/lib/api";
import type { ViewProps } from "@/pages/Project";

export function ListView({ project, tasks, aiActive, canEdit }: ViewProps) {
  const users = useUserMap();
  const shell = useShell();
  const update = useUpdateTask();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hideDone, setHideDone] = useState(false);
  const qc = useQueryClient();
  const [newSection, setNewSection] = useState("");

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2 text-[12.5px] text-muted sm:px-8">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
            className="accent-[var(--fg)]"
          />
          Masquer les terminées
        </label>
        <span className="ml-auto tabular">
          {tasks.filter((t) => t.completed).length}/{tasks.length} terminées
        </span>
      </div>
      {project.sections.map((s) => {
        const items = tasks
          .filter((t) => t.section_id === s.id && !(hideDone && t.completed))
          .sort((a, b) => a.position - b.position);
        return (
          <section key={s.id}>
            <TaskGroupHeader
              label={s.name}
              count={items.length}
              open={!collapsed[s.id]}
              onToggle={() => setCollapsed({ ...collapsed, [s.id]: !collapsed[s.id] })}
              aside={
                canEdit ? (
                  <SectionMenu
                    section={s}
                    sections={project.sections}
                    axis="vertical"
                    taskCount={tasks.filter((t) => t.section_id === s.id).length}
                    canDelete={project.role === "admin"}
                  />
                ) : undefined
              }
            />
            {!collapsed[s.id] && (
              <div className="sm:px-4">
                {items.map((t) => (
                  <TaskRow
                    key={t.id}
                    t={t}
                    assignee={t.assignee_id ? users.get(t.assignee_id) : null}
                    aiActive={aiActive.has(t.id)}
                    canEdit={canEdit}
                    onOpen={() => shell.openTask(t.id)}
                    onToggle={(v) => update.mutate({ id: t.id, completed: v })}
                  />
                ))}
                {canEdit && <InlineAdd projectId={project.id} sectionId={s.id} />}
              </div>
            )}
          </section>
        );
      })}
      {canEdit && (
        <div className="flex items-center gap-2 px-4 py-4 sm:px-8">
          <Plus className="size-4 text-faint" />
          <input
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            placeholder="Ajouter une section"
            onKeyDown={async (e) => {
              if (e.key === "Enter" && newSection.trim()) {
                await api
                  .post(`/api/projects/${project.id}/sections`, { name: newSection })
                  .catch((x) => toast.error(x.message));
                setNewSection("");
                qc.invalidateQueries({ queryKey: ["project", project.id] });
              }
            }}
            className="bg-transparent text-[13.5px] font-medium outline-none placeholder:text-faint"
          />
        </div>
      )}
    </div>
  );
}

export function InlineAdd({
  projectId,
  sectionId,
  compact,
  extra,
}: {
  projectId: string;
  sectionId?: string;
  compact?: boolean;
  /** Ce que la tâche reçoit d'office là où on l'ajoute (personne chargée, échéance). */
  extra?: Partial<Task>;
}) {
  const create = useCreateTask();
  const [v, setV] = useState("");
  const add = () => {
    if (!v.trim()) return;
    create.mutate({ ...extra, project_id: projectId, ...(sectionId ? { section_id: sectionId } : {}), title: v.trim() });
    setV("");
  };
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-faint",
        compact ? "h-9 px-2" : "h-11 border-b border-line px-3 sm:px-4",
      )}
    >
      <Plus className="size-4" />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder="Ajouter une tâche"
        className="flex-1 bg-transparent text-[13.5px] text-fg outline-none placeholder:text-faint"
      />
    </div>
  );
}
