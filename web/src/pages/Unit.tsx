import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Plus, Users } from "lucide-react";
import { Button, Empty, Spinner, cn } from "@/components/ui";
import { Drawer, DrawerSection } from "@/components/drawer";
import { Field, Input, PageHeader, Section, Select, Status, Table, Tabs, Td, Tr, frDate } from "@/components/gov";
import { useMe, useMyUnits, useProjectTasks } from "@/lib/hooks";
import { useShell } from "@/lib/shell";
import { todayIso } from "@/lib/format";
import { api } from "@/lib/api";
import type { Task, UnitBoard, UnitFollowUp } from "@/lib/types";

/*
 * Mon entité (lot T1). Le responsable confie des tâches à ses agents et suit l'état de chacun, tâches de l'entité et
 * tâches portées dans les projets. L'agent y retrouve le registre des tâches de son entité. Une tâche d'entité
 * n'appartient à aucun projet ; elle a les mêmes vues, rappels et traces que toute tâche.
 */
export function UnitPage() {
  const { data: units } = useMyUnits();
  const [params, setParams] = useSearchParams();
  const unitId = params.get("unite") || units?.[0]?.id || "";
  const unit = units?.find((u) => u.id === unitId);
  const { data: board, error } = useQuery({
    queryKey: ["unit-board", unitId],
    queryFn: () => api.get<UnitBoard>(`/api/units/${unitId}/board`),
    enabled: !!unitId,
  });
  const responsable = board?.role === "responsable";
  const [tab, setTab] = useState<"suivi" | "registre">("suivi");
  const [giving, setGiving] = useState(false);
  const nav = useNavigate();
  const current = responsable ? tab : "registre";

  if (!units) return <Spinner />;
  if (!units.length)
    return (
      <Empty icon={<Users className="size-6" />} title="Aucune entité">
        Vous n'êtes rattaché·e à aucune entité. Demandez à l'administration de vous y ranger.
      </Empty>
    );
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={Users}
        crumbs={["Mon entité", board?.unit.name ?? unit?.name ?? ""]}
        title={board?.unit.name ?? unit?.name ?? "Mon entité"}
        subtitle={
          responsable
            ? "Vous en êtes responsable : vous confiez des tâches à vos agents et suivez l'état de chacun, y compris leurs tâches de projet."
            : "Les tâches de votre entité qui ne relèvent d'aucun projet. Vous y notez les vôtres ; le responsable y confie les tâches."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {units.length > 1 && (
              <Select
                aria-label="Entité"
                value={unitId}
                onChange={(e) => setParams({ unite: e.target.value })}
                className="w-auto min-w-[200px]"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {"  ".repeat(u.depth)}
                    {u.name} — {u.role === "responsable" ? "responsable" : "agent"}
                  </option>
                ))}
              </Select>
            )}
            {board && (
              <Button icon={<ExternalLink className="size-4" />} onClick={() => nav(`/projects/${board.project_id}`)}>
                Ouvrir le registre
              </Button>
            )}
            {board && (
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setGiving(true)}>
                {responsable ? "Confier une tâche" : "Noter une tâche"}
              </Button>
            )}
          </div>
        }
      />
      {responsable && (
        <Tabs
          value={current}
          onChange={setTab}
          items={[
            { id: "suivi" as const, label: "Suivi des agents" },
            { id: "registre" as const, label: "Tâches de l'entité" },
          ]}
        />
      )}
      <div className="mx-auto max-w-[1240px] space-y-4 px-4 pb-16 pt-5 sm:px-8">
        {error ? (
          <p className="text-[13px] text-danger">{(error as Error).message}</p>
        ) : !board ? (
          <Spinner />
        ) : current === "suivi" ? (
          <FollowUp unitId={unitId} />
        ) : (
          <Register board={board} />
        )}
      </div>
      {giving && board && <GiveTask board={board} onClose={() => setGiving(false)} />}
    </div>
  );
}

const PRIORITY: Record<string, string> = {
  none: "—",
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

function FollowUp({ unitId }: { unitId: string }) {
  const { data } = useQuery({
    queryKey: ["unit-follow-up", unitId],
    queryFn: () => api.get<UnitFollowUp>(`/api/units/${unitId}/follow-up`),
  });
  const shell = useShell();
  const [agent, setAgent] = useState<string | null>(null);
  const [state, setState] = useState<"open" | "overdue" | "done">("open");
  if (!data) return <Spinner />;
  const total = (k: "open" | "overdue" | "due_soon" | "done_30") => data.agents.reduce((n, a) => n + a[k], 0);
  const names = new Map(data.agents.map((a) => [a.user_id, a.name]));
  const tasks = data.tasks.filter(
    (t) =>
      (!agent || t.assignee_id === agent) &&
      (state === "done" ? t.completed : state === "overdue" ? t.overdue : !t.completed),
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["Agents suivis", data.agents.length],
            ["Tâches ouvertes", total("open")],
            ["En retard", total("overdue")],
            ["Dues sous 7 jours", total("due_soon")],
            ["Terminées (30 j)", total("done_30")],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="rounded-2xl border border-line bg-panel px-4 py-3">
            <p className="text-[12px] text-muted">{label}</p>
            <p
              className={cn("text-[22px] font-semibold tabular-nums", label === "En retard" && v > 0 && "text-danger")}
            >
              {v}
            </p>
          </div>
        ))}
      </div>
      <Section
        title="Agents"
        aside={
          agent && (
            <Button size="sm" onClick={() => setAgent(null)}>
              Tous les agents
            </Button>
          )
        }
      >
        {data.agents.length === 0 ? (
          <Empty title="Aucun agent">Aucune personne n'est rangée dans cette entité.</Empty>
        ) : (
          <Table head={["Agent", "Entité", "Ouvertes", "En retard", "Sous 7 jours", "Terminées (30 j)"]}>
            {data.agents.map((a) => (
              <Tr key={a.user_id} onClick={() => setAgent(agent === a.user_id ? null : a.user_id)}>
                <Td>
                  <span className={cn("block font-medium", agent === a.user_id && "underline")}>{a.name}</span>
                  {a.title && <span className="block text-[12px] text-muted">{a.title}</span>}
                </Td>
                <Td className="text-muted">{a.unit_name}</Td>
                <Td className="tabular-nums">{a.open}</Td>
                <Td className="tabular-nums">
                  {a.overdue > 0 ? <Status tone="danger" label={String(a.overdue)} /> : "0"}
                </Td>
                <Td className="tabular-nums">{a.due_soon}</Td>
                <Td className="tabular-nums">{a.done_30}</Td>
              </Tr>
            ))}
          </Table>
        )}
        <div className="h-3" />
      </Section>
      <Section
        title={agent ? `Tâches de ${names.get(agent)}` : "Tâches des agents"}
        aside={
          <Select
            aria-label="État des tâches"
            value={state}
            onChange={(e) => setState(e.target.value as typeof state)}
            className="w-auto"
          >
            <option value="open">Ouvertes</option>
            <option value="overdue">En retard</option>
            <option value="done">Terminées (30 jours)</option>
          </Select>
        }
      >
        {tasks.length === 0 ? (
          <Empty title="Rien à signaler">Aucune tâche dans cet état.</Empty>
        ) : (
          <Table head={["Tâche", "Agent", "Dossier", "Colonne", "Priorité", "Échéance"]}>
            {tasks.map((t) => (
              <Tr key={t.id} onClick={() => shell.openTask(t.id)}>
                <Td>
                  <span className="block font-medium">{t.title}</span>
                  <span className="font-mono text-[11.5px] text-faint">{t.key}</span>
                </Td>
                <Td className="text-muted">{names.get(t.assignee_id) ?? "—"}</Td>
                <Td className="text-muted">{t.in_unit_board ? "Tâche de l'entité" : `Projet ${t.project_name}`}</Td>
                <Td className="text-muted">{t.completed ? "Terminée" : (t.section_name ?? "—")}</Td>
                <Td className="text-muted">{PRIORITY[t.priority] ?? "—"}</Td>
                <Td>
                  {t.overdue ? (
                    <Status tone="danger" label={`${frDate(t.due_on)} · en retard`} />
                  ) : (
                    <span className="text-muted">{frDate(t.due_on)}</span>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
        <div className="h-3" />
      </Section>
      <p className="text-[12px] text-muted">
        Le suivi couvre l'entité et les entités qui lui sont rattachées. Les tâches d'un projet auquel vous n'avez pas
        accès ne sont pas montrées.
      </p>
    </>
  );
}

function Register({ board }: { board: UnitBoard }) {
  const { data: tasks } = useProjectTasks(board.project_id);
  const shell = useShell();
  const [done, setDone] = useState(false);
  if (!tasks) return <Spinner />;
  const names = new Map(board.members.map((m) => [m.id, m.name]));
  const today = todayIso();
  const rows = tasks
    .filter((t: Task) => !t.parent_id && t.completed === done)
    .sort((a, b) => ((a.due_on ?? "9") < (b.due_on ?? "9") ? -1 : 1));
  return (
    <Section
      title="Tâches de l'entité"
      aside={
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
          Terminées
        </label>
      }
    >
      {rows.length === 0 ? (
        <Empty title={done ? "Aucune tâche terminée" : "Aucune tâche ouverte"}>
          {board.can.assign
            ? "Confiez une tâche à un agent : il est prévenu et la retrouve dans « Mes tâches »."
            : "Notez vos tâches qui ne relèvent d'aucun projet."}
        </Empty>
      ) : (
        <Table head={["Tâche", "Confiée à", "Échéance"]}>
          {rows.map((t) => (
            <Tr key={t.id} onClick={() => shell.openTask(t.id)}>
              <Td>
                <span className="block font-medium">{t.title}</span>
                <span className="font-mono text-[11.5px] text-faint">{t.key}</span>
              </Td>
              <Td className="text-muted">{t.assignee_id ? (names.get(t.assignee_id) ?? "—") : "Non attribuée"}</Td>
              <Td>
                {!t.completed && t.due_on && t.due_on < today ? (
                  <Status tone="danger" label={`${frDate(t.due_on)} · en retard`} />
                ) : (
                  <span className="text-muted">{frDate(t.due_on)}</span>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
      <div className="h-3" />
    </Section>
  );
}

/** Confier (responsable) ou noter (agent) une tâche d'entité. Un agent ne se l'attribue qu'à lui-même. */
export function GiveTask({ board, onClose }: { board: UnitBoard; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [f, setF] = useState({ title: "", description: "", assignee_id: "", due_on: "", priority: "none" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const assignee = board.can.assign ? f.assignee_id : (me?.id ?? "");
  const pastDue = !!f.due_on && f.due_on < todayIso();
  const submit = async () => {
    setBusy(true);
    // Un agent d'une entité rattachée : la tâche va dans le registre de son entité, où il a accès
    const target = board.members.find((m) => m.id === assignee && !m.manager);
    const projectId =
      target && target.unit_id !== board.unit.id
        ? await api.get<UnitBoard>(`/api/units/${target.unit_id}/board`).then(
            (b) => b.project_id,
            () => board.project_id,
          )
        : board.project_id;
    api
      .post<Task>("/api/tasks", {
        project_id: projectId,
        title: f.title.trim(),
        description: f.description.trim() || undefined,
        assignee_id: assignee || null,
        due_on: f.due_on || undefined,
        priority: f.priority,
      })
      .then(
        () => {
          qc.invalidateQueries({ queryKey: ["tasks"] });
          qc.invalidateQueries({ queryKey: ["unit-follow-up"] });
          toast.success(
            board.can.assign && assignee && assignee !== me?.id
              ? "Tâche confiée : l'agent est prévenu"
              : "Tâche enregistrée dans le registre de l'entité",
          );
          onClose();
        },
        (e: Error) => toast.error(e.message),
      )
      .finally(() => setBusy(false));
  };
  return (
    <Drawer
      open
      onClose={onClose}
      dirty={!!(f.title || f.description) && !busy}
      width={560}
      subtitle={`Mon entité · ${board.unit.name}`}
      title={board.can.assign ? "Confier une tâche" : "Noter une tâche"}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!f.title.trim() || pastDue || busy} onClick={submit}>
            {board.can.assign ? "Confier la tâche" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <DrawerSection title="La tâche">
          <div className="grid gap-3">
            <Field label="Intitulé" required>
              {(a) => (
                <Input {...a} value={f.title} onChange={set("title")} placeholder="Commencez par un verbe" autoFocus />
              )}
            </Field>
            <Field label="Précisions">
              {(a) => (
                <textarea
                  {...a}
                  value={f.description}
                  onChange={set("description")}
                  rows={4}
                  className="field-ring w-full rounded-[10px] border border-field bg-panel px-3 py-2 text-[13.5px] outline-none"
                />
              )}
            </Field>
          </div>
        </DrawerSection>
        <DrawerSection title="Attribution et échéance">
          <div className="grid gap-3 sm:grid-cols-2">
            {board.can.assign ? (
              <Field label="Confiée à" hint="Agent de l'entité ; il est prévenu par notification et courriel.">
                {(a) => (
                  <Select {...a} value={f.assignee_id} onChange={set("assignee_id")}>
                    <option value="">Non attribuée pour l'instant</option>
                    {board.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.manager
                          ? " (responsable)"
                          : m.unit_id !== board.unit.id
                            ? ` — ${m.unit_name}`
                            : m.title
                              ? ` — ${m.title}`
                              : ""}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : (
              <p className="text-[13px] text-muted sm:col-span-2">
                La tâche vous est attribuée. Confier une tâche à un collègue revient au responsable de l'entité.
              </p>
            )}
            <Field label="Échéance" error={pastDue ? "L'échéance ne peut pas être passée" : null}>
              {(a) => <Input {...a} type="date" min={todayIso()} value={f.due_on} onChange={set("due_on")} />}
            </Field>
            <Field label="Priorité">
              {(a) => (
                <Select {...a} value={f.priority} onChange={set("priority")}>
                  {Object.entries(PRIORITY).map(([v, l]) => (
                    <option key={v} value={v}>
                      {v === "none" ? "Aucune" : l}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </DrawerSection>
      </div>
    </Drawer>
  );
}
