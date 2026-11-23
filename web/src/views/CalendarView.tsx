import { useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Avatar, Button, IconButton, cn } from "@/components/ui";
import { useCreateTask, useUserMap } from "@/lib/hooks";
import { useShell } from "@/lib/shell";
import { priorityMeta, todayIso, pl } from "@/lib/format";
import type { ViewProps } from "@/pages/Project";

export function CalendarView({ project, tasks, canEdit }: ViewProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const users = useUserMap();
  const shell = useShell();
  const create = useCreateTask();
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);
  const byDay = useMemo(() => {
    const m = new Map<string, typeof tasks>();
    for (const t of tasks) if (t.due_on) m.set(t.due_on, [...(m.get(t.due_on) ?? []), t]);
    return m;
  }, [tasks]);
  const noDate = tasks.filter((t) => !t.due_on && !t.completed).length;
  // Sur téléphone, la grille montre des pastilles : le jour touché déroule ses tâches sous le mois
  const [picked, setPicked] = useState<string | null>(null);
  const hue = (t: (typeof tasks)[number]) =>
    t.priority === "none" ? "var(--line-strong)" : priorityMeta(t.priority).color;
  const row = (t: (typeof tasks)[number]) => (
    <button
      key={t.id}
      onClick={() => shell.openTask(t.id)}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md border-l-2 bg-hover px-1.5 py-1 text-left text-[12px] leading-tight hover:bg-active",
        t.completed && "opacity-50",
      )}
      style={{ borderLeftColor: hue(t) }}
    >
      <span className={cn("min-w-0 flex-1 truncate", t.completed && "line-through")}>{t.title}</span>
      {t.assignee_id && <Avatar user={users.get(t.assignee_id)} size={14} />}
    </button>
  );

  return (
    <div className="px-4 py-5 sm:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="min-w-[160px] text-[18px] font-semibold first-letter:uppercase">
          {format(month, "MMMM yyyy", { locale: fr })}
        </h2>
        <IconButton label="Mois précédent" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft className="size-4" />
        </IconButton>
        <IconButton label="Mois suivant" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight className="size-4" />
        </IconButton>
        <Button size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
          Aujourd'hui
        </Button>
        {noDate > 0 && (
          <span className="order-last w-full text-[12.5px] text-faint sm:order-none sm:ml-auto sm:w-auto">
            {noDate} {pl(noDate, "tâche(s)")} sans échéance
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 sm:min-w-[760px] overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
          {["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."].map((d) => (
            <div
              key={d}
              className="border-b border-line px-1 py-2 text-center text-[10.5px] font-medium uppercase tracking-wider text-faint sm:px-2 sm:text-left sm:text-[11.5px]"
            >
              {d}
            </div>
          ))}
          {days.map((d, i) => {
            const iso = format(d, "yyyy-MM-dd");
            const items = byDay.get(iso) ?? [];
            const isToday = iso === todayIso();
            return (
              <div
                key={iso}
                onClick={() => setPicked(items.length ? iso : null)}
                className={cn(
                  "group relative min-h-[62px] border-line p-1 sm:min-h-[118px] sm:p-2",
                  i % 7 !== 6 && "border-r",
                  i < days.length - 7 && "border-b",
                  !isSameMonth(d, month) && "bg-sidebar/50",
                )}
              >
                <div className="mb-1 flex items-center justify-between sm:justify-between">
                  {/* Le quantième part de la même verticale que le nom du jour : sa pastille déborde dans la marge */}
                  <span
                    className={cn(
                      "-ml-1.5 inline-flex h-[22px] items-center rounded-md px-1.5 text-[12px] tabular",
                      isToday ? "bg-fg font-semibold text-bg" : isSameMonth(d, month) ? "text-muted" : "text-faint",
                      picked === iso && !isToday && "bg-hover text-fg",
                    )}
                  >
                    {format(d, "d")}
                  </span>
                  {canEdit && (
                    <button
                      aria-label="Ajouter une tâche ce jour"
                      onClick={() =>
                        create.mutate(
                          { project_id: project.id, title: "Nouvelle tâche", due_on: iso },
                          { onSuccess: (t) => shell.openTask(t.id) },
                        )
                      }
                      className="rounded p-0.5 text-faint opacity-0 hover:bg-hover hover:text-fg group-hover:opacity-100"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </div>
                {/* Téléphone : une pastille par tâche ; à partir de la tablette, les intitulés */}
                <div className="flex flex-wrap gap-1 pl-0.5 sm:hidden">
                  {items.slice(0, 4).map((t) => (
                    <span key={t.id} className="size-1.5 rounded-full" style={{ background: hue(t) }} />
                  ))}
                </div>
                <div className="hidden space-y-1 sm:block">
                  {items.slice(0, 4).map(row)}
                  {items.length > 4 && <p className="pl-2 pt-0.5 text-[11.5px] text-faint">+{items.length - 4} {pl(items.length - 4, "autre(s)")}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Le jour touché sur téléphone : ses tâches, en entier, sous le mois */}
      {picked && (
        <section className="mt-3 space-y-1 sm:hidden">
          <p className="text-[12.5px] font-medium first-letter:uppercase">
            {format(parseISO(picked), "EEEE d MMMM", { locale: fr })}
          </p>
          {(byDay.get(picked) ?? []).map(row)}
        </section>
      )}
    </div>
  );
}
