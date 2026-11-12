import { ExportMenu, tableDoc } from "@/components/export-menu";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCheck, ClipboardList, Pencil, Plus, Send, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, Empty, IconButton } from "@/components/ui";
import {
  DomainSelect,
  Field,
  Input,
  LoadingRows,
  PageHeader,
  PeopleSelect,
  ProgressBar,
  Section,
  Select,
  Status,
  Table,
  Td,
  Textarea,
  Tr,
  frDate,
  isLate,
  type Tone,
} from "@/components/gov";
import { api } from "@/lib/api";
import { useCan, useUnits, useUsers } from "@/lib/hooks";
import { QuarterReviews, type ReviewRef } from "@/components/plan-reviews";

type PlanStatus = "draft" | "submitted" | "approved";
interface PlanRow {
  id: string;
  title: string;
  year: number;
  status: PlanStatus;
  unit_name: string;
  activity_count: number;
  progress: number;
  late: number;
}
interface PlanActivity {
  id: string;
  title: string;
  responsible_id: string | null;
  responsible_name: string | null;
  domain_id: string | null;
  domain_name: string | null;
  objective: string;
  target_value: number | null;
  actual_value: number | null;
  unit_label: string;
  start_on: string | null;
  end_on: string | null;
  budget_planned: number | null;
  budget_spent: number | null;
  progress: number;
  baseline: { end_on?: string } | null;
  /** Les dossiers (projets, activités) qui réalisent cette activité : leur avancement remonte ici (lot P3c). */
  dossiers: { kind: "project" | "activity"; id: string; label: string; progress: number; href: string }[];
  progress_effective: number;
}
interface Plan extends PlanRow {
  return_comment: string;
  activities: PlanActivity[];
  revisions: {
    id: string;
    field: string;
    old_value: string | null;
    new_value: string | null;
    reason: string;
    author_name: string | null;
  }[];
  reviews: ReviewRef[];
  can: { edit: boolean; submit: boolean; approve: boolean; revise: boolean; review: boolean };
}
const STATE: Record<PlanStatus, { label: string; tone: Tone }> = {
  draft: { label: "En préparation", tone: "neutral" },
  submitted: { label: "En attente d'approbation", tone: "warning" },
  approved: { label: "Approuvé", tone: "success" },
};
const FIELD: Record<string, string> = {
  title: "Intitulé",
  responsible_id: "Responsable",
  objective: "Objectif",
  target_value: "Cible",
  start_on: "Début",
  end_on: "Fin",
  budget_planned: "Budget",
};
const fail = (e: unknown) => toast.error((e as Error).message);
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\s/g, "").replace(",", ".")));

export function PlansPage() {
  const can = useCan();
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["plans"], queryFn: () => api.get<PlanRow[]>("/api/plans") });
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={ClipboardList}
        crumbs={["Suivi-évaluation", "Plans de travail"]}
        title="Plans de travail"
        subtitle="Un plan annuel par entité. Une fois approuvé, il devient la référence et toute révision reste tracée."
        actions={
          <>
            <ExportMenu
              disabled={!data?.length}
              build={() =>
                tableDoc(
                  "Plans de travail",
                  ["Plan", "Entité", "Année", "Activités", "Avancement", "Activités échues", "Statut"],
                  (data ?? []).map((p) => [
                    p.title,
                    p.unit_name,
                    p.year,
                    p.activity_count,
                    `${p.progress} %`,
                    p.late,
                    STATE[p.status].label,
                  ]),
                  { filename: "plans-de-travail", widths: [4, 3, 1, 1.2, 1.5, 1.5, 2] },
                )
              }
            />
            {can("plans.manage") && (
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Nouveau plan
              </Button>
            )}
          </>
        }
      />
      <div className="mx-auto max-w-[1480px] p-4 sm:px-8 sm:py-6">
        <Section>
          {isLoading ? (
            <LoadingRows />
          ) : data?.length ? (
            <Table head={["Plan", "Entité", "Année", "Activités", "Avancement", "Retards", "Statut"]}>
              {data.map((p) => (
                <Tr key={p.id} onClick={() => nav(`/plans/${p.id}`)}>
                  <Td className="font-medium">{p.title}</Td>
                  <Td>{p.unit_name}</Td>
                  <Td className="tabular">{p.year}</Td>
                  <Td className="tabular">{p.activity_count}</Td>
                  <Td className="min-w-[130px]">
                    <span className="flex items-center gap-2">
                      <ProgressBar value={p.progress} />
                      <span className="tabular shrink-0 whitespace-nowrap text-[12px] text-muted">{p.progress} %</span>
                    </span>
                  </Td>
                  <Td className={p.late ? "tabular font-semibold text-danger" : "tabular"}>{p.late || "—"}</Td>
                  <Td>
                    <Status {...STATE[p.status]} />
                  </Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <Empty icon={<ClipboardList className="size-6" />} title="Aucun plan de travail">
              Créez le plan annuel d'une entité.
            </Empty>
          )}
        </Section>
      </div>
      {creating && <NewPlan onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewPlan({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: units } = useUnits();
  const [f, setF] = useState({ unit_id: "", year: String(new Date().getFullYear() + 1), title: "" });
  const create = useMutation({
    mutationFn: () => api.post<Plan>("/api/plans", { ...f, year: Number(f.year) }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      nav(`/plans/${p.id}`);
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Nouveau plan de travail"
      width={480}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!f.unit_id || !f.title.trim()}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Créer
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Entité" required>
          {(a) => (
            <Select {...a} value={f.unit_id} onChange={(e) => setF({ ...f, unit_id: e.target.value })}>
              <option value="">Choisir…</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Année" required>
          {(a) => <Input {...a} type="number" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} />}
        </Field>
        <Field label="Intitulé" required>
          {(a) => <Input {...a} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}
        </Field>
      </div>
    </Dialog>
  );
}

export function PlanPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: users } = useUsers();
  const {
    data: p,
    isLoading,
    error,
  } = useQuery({ queryKey: ["plan", id], queryFn: () => api.get<Plan>(`/api/plans/${id}`) });
  const [edit, setEdit] = useState<PlanActivity | "new" | null>(null);
  const [follow, setFollow] = useState<PlanActivity | null>(null);
  const [revise, setRevise] = useState<PlanActivity | null>(null);
  const [returning, setReturning] = useState(false);
  const [comment, setComment] = useState("");
  const done = (r: Plan) => {
    qc.setQueryData(["plan", id], r);
    qc.invalidateQueries({ queryKey: ["plans"] });
  };
  const act = useMutation({
    mutationFn: (a: string) => api.post<Plan>(`/api/plans/${id}/${a}`),
    onSuccess: done,
    onError: fail,
  });
  const ret = useMutation({
    mutationFn: () => api.post<Plan>(`/api/plans/${id}/return`, { comment }),
    onSuccess: (r) => {
      done(r);
      setReturning(false);
    },
    onError: fail,
  });
  const del = useMutation({
    mutationFn: (a: string) => api.del<Plan>(`/api/plan-activities/${a}`),
    onSuccess: done,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/api/plans/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      nav("/plans");
    },
    onError: fail,
  });
  if (isLoading) return <LoadingRows rows={8} />;
  if (error || !p) return <Empty title="Plan inaccessible">{(error as Error)?.message}</Empty>;
  return (
    <div className="min-h-full pb-10">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link to="/plans" aria-label="Retour aux plans" className="text-muted hover:text-fg">
              <ArrowLeft className="size-5" />
            </Link>
            {p.title}
          </span>
        }
        subtitle={`${p.unit_name} · ${p.year}`}
        actions={
          <>
            <Status {...STATE[p.status]} />
            {p.can.edit && (
              <IconButton label="Supprimer le plan" onClick={() => remove.mutate()}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
            {p.can.submit && (
              <Button
                variant="primary"
                icon={<Send className="size-4" />}
                loading={act.isPending}
                onClick={() => act.mutate("submit")}
              >
                Soumettre
              </Button>
            )}
            {p.can.approve && (
              <>
                <Button icon={<Undo2 className="size-4" />} onClick={() => setReturning(true)}>
                  Retourner
                </Button>
                <Button
                  variant="primary"
                  icon={<CheckCheck className="size-4" />}
                  loading={act.isPending}
                  onClick={() => act.mutate("approve")}
                >
                  Approuver
                </Button>
              </>
            )}
          </>
        }
      />
      <div className="mx-auto max-w-[1480px] space-y-4 p-4 sm:px-8 sm:py-6">
        {p.return_comment && (
          <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13px]">
            <strong>Plan retourné :</strong> {p.return_comment}
          </p>
        )}
        <Section
          title={`Activités · ${p.activities.length}`}
          aside={
            p.can.edit && (
              <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setEdit("new")}>
                Ajouter
              </Button>
            )
          }
        >
          {p.activities.length ? (
            <Table head={["Activité", "Responsable", "Cible", "Échéance", "Avancement", ""]}>
              {p.activities.map((a) => (
                <Tr key={a.id}>
                  <Td className="max-w-sm">
                    <span className="font-medium">{a.title}</span>
                    {a.objective && <span className="block text-[12px] text-muted">{a.objective}</span>}
                    {!!a.dossiers.length && (
                      <span className="mt-0.5 block space-x-2 text-[12px]">
                        {a.dossiers.map((x) => (
                          <Link key={x.id} to={x.href} className="text-primary hover:underline">
                            {x.label} ({x.progress} %)
                          </Link>
                        ))}
                      </span>
                    )}
                  </Td>
                  <Td>{a.responsible_name ?? <span className="text-danger">À désigner</span>}</Td>
                  <Td className="whitespace-nowrap tabular">
                    {a.actual_value !== null && `${a.actual_value} / `}
                    {a.target_value ?? "—"} {a.unit_label}
                  </Td>
                  <Td
                    className={
                      a.progress_effective < 100 && isLate(a.end_on)
                        ? "whitespace-nowrap font-medium text-danger tabular"
                        : "whitespace-nowrap tabular"
                    }
                  >
                    {frDate(a.end_on)}
                    {a.baseline?.end_on && a.baseline.end_on !== a.end_on && (
                      <span className="block text-[11.5px] font-normal text-muted">
                        prévu : {frDate(a.baseline.end_on)}
                      </span>
                    )}
                  </Td>
                  <Td className="min-w-[120px]">
                    <span
                      className="flex items-center gap-2"
                      title={a.dossiers.length ? "Avancement remonté des dossiers" : undefined}
                    >
                      <ProgressBar value={a.progress_effective} />
                      <span className="tabular shrink-0 whitespace-nowrap text-[12px] text-muted">
                        {a.progress_effective} %
                      </span>
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    {p.can.edit && (
                      <>
                        <IconButton label="Modifier" size="sm" onClick={() => setEdit(a)}>
                          <Pencil className="size-3.5" />
                        </IconButton>
                        <IconButton label="Retirer" size="sm" onClick={() => del.mutate(a.id)}>
                          <Trash2 className="size-3.5" />
                        </IconButton>
                      </>
                    )}
                    {p.status === "approved" && (
                      <Button size="sm" variant="ghost" onClick={() => setFollow(a)}>
                        Suivi
                      </Button>
                    )}
                    {p.can.revise && (
                      <Button size="sm" variant="ghost" onClick={() => setRevise(a)}>
                        Réviser
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <Empty title="Aucune activité">
              Ajoutez les activités avec un responsable, une cible et une date de fin.
            </Empty>
          )}
        </Section>
        {p.status === "approved" && (
          <QuarterReviews planId={p.id} year={p.year} reviews={p.reviews} canOpen={p.can.review} />
        )}
        {!!p.revisions.length && (
          <Section title="Révisions tracées">
            <Table head={["Élément", "Avant", "Après", "Motif", "Décidé par"]}>
              {p.revisions.map((r) => (
                <Tr key={r.id}>
                  <Td>{FIELD[r.field] ?? r.field}</Td>
                  <Td className="tabular">{r.old_value ?? "—"}</Td>
                  <Td className="tabular">{r.new_value ?? "—"}</Td>
                  <Td>{r.reason}</Td>
                  <Td>{r.author_name}</Td>
                </Tr>
              ))}
            </Table>
          </Section>
        )}
      </div>
      {edit && (
        <ActivityDialog
          planId={p.id}
          activity={edit === "new" ? null : edit}
          people={users}
          onDone={done}
          onClose={() => setEdit(null)}
        />
      )}
      {follow && <Follow a={follow} onDone={done} onClose={() => setFollow(null)} />}
      {revise && <Revise a={revise} people={users} onDone={done} onClose={() => setRevise(null)} />}
      <Dialog
        open={returning}
        onOpenChange={setReturning}
        title="Retourner le plan"
        width={480}
        footer={
          <>
            <Button onClick={() => setReturning(false)}>Annuler</Button>
            <Button variant="primary" disabled={!comment.trim()} loading={ret.isPending} onClick={() => ret.mutate()}>
              Retourner
            </Button>
          </>
        }
      >
        <Field label="Motif" required>
          {(a) => <Textarea {...a} value={comment} onChange={(e) => setComment(e.target.value)} />}
        </Field>
      </Dialog>
    </div>
  );
}

type People = { id: string; name: string; is_ai?: boolean }[] | undefined;
function ActivityDialog({
  planId,
  activity,
  people,
  onDone,
  onClose,
}: {
  planId: string;
  activity: PlanActivity | null;
  people: People;
  onDone: (p: Plan) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    title: activity?.title ?? "",
    responsible_id: activity?.responsible_id ?? "",
    objective: activity?.objective ?? "",
    target_value: activity?.target_value?.toString() ?? "",
    unit_label: activity?.unit_label ?? "",
    domain_id: activity?.domain_id ?? "",
    start_on: activity?.start_on ?? "",
    end_on: activity?.end_on ?? "",
    budget_planned: activity?.budget_planned?.toString() ?? "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...f,
        responsible_id: f.responsible_id || null,
        domain_id: f.domain_id || null,
        target_value: num(f.target_value),
        start_on: f.start_on || null,
        end_on: f.end_on || null,
        budget_planned: num(f.budget_planned),
      };
      return activity
        ? api.patch<Plan>(`/api/plan-activities/${activity.id}`, body)
        : api.post<Plan>(`/api/plans/${planId}/activities`, body);
    },
    onSuccess: (r) => {
      onDone(r);
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={activity ? "Modifier l'activité" : "Nouvelle activité"}
      description="Quoi, combien, pour quand : responsable unique, cible chiffrée et date de fin sont requis pour soumettre le plan."
      width={600}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!f.title.trim()} loading={save.isPending} onClick={() => save.mutate()}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Intitulé" required className="sm:col-span-2">
          {(a) => <Input {...a} autoFocus value={f.title} onChange={set("title")} />}
        </Field>
        <Field label="Responsable unique">
          {(a) => (
            <PeopleSelect
              {...a}
              people={people}
              value={f.responsible_id}
              onChange={(v) => setF({ ...f, responsible_id: v })}
            />
          )}
        </Field>
        <Field label="Domaine d'activité">
          {(a) => <DomainSelect {...a} value={f.domain_id} onChange={(v) => setF({ ...f, domain_id: v })} />}
        </Field>
        <Field label="Objectif">{(a) => <Input {...a} value={f.objective} onChange={set("objective")} />}</Field>
        <Field label="Cible chiffrée">
          {(a) => <Input {...a} inputMode="decimal" value={f.target_value} onChange={set("target_value")} />}
        </Field>
        <Field label="Unité" hint="Exemple : rapports, ateliers">
          {(a) => <Input {...a} value={f.unit_label} onChange={set("unit_label")} />}
        </Field>
        <Field label="Début">{(a) => <Input {...a} type="date" value={f.start_on} onChange={set("start_on")} />}</Field>
        <Field label="Fin">{(a) => <Input {...a} type="date" value={f.end_on} onChange={set("end_on")} />}</Field>
        <Field label="Budget prévu" className="sm:col-span-2">
          {(a) => <Input {...a} inputMode="decimal" value={f.budget_planned} onChange={set("budget_planned")} />}
        </Field>
      </div>
    </Dialog>
  );
}

function Follow({ a, onDone, onClose }: { a: PlanActivity; onDone: (p: Plan) => void; onClose: () => void }) {
  // Dès qu'un dossier réalise l'activité, l'avancement remonte de lui : il ne se saisit plus à la main (lot P3c)
  const linked = a.dossiers.length > 0;
  const [progress, setProgress] = useState(a.progress);
  const [actual, setActual] = useState(a.actual_value?.toString() ?? "");
  const [spent, setSpent] = useState(a.budget_spent?.toString() ?? "");
  const save = useMutation({
    mutationFn: () =>
      api.patch<Plan>(`/api/plan-activities/${a.id}/progress`, {
        ...(linked ? {} : { progress }),
        actual_value: num(actual),
        budget_spent: num(spent),
      }),
    onSuccess: (r) => {
      onDone(r);
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Suivi de l'activité"
      description={a.title}
      width={480}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {linked ? (
          <p className="rounded-lg border border-line bg-hover/40 px-3 py-2 text-[12.5px] text-muted">
            Avancement : <b className="font-semibold text-fg">{a.progress_effective} %</b>, remonté de{" "}
            {a.dossiers.map((d) => d.label).join(", ")}. Il se met à jour depuis les dossiers.
          </p>
        ) : (
          <Field label={`Avancement : ${progress} %`}>
            {(f) => (
              <input
                {...f}
                type="range"
                min={0}
                max={100}
                step={5}
                className="w-full accent-[var(--primary)]"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
              />
            )}
          </Field>
        )}
        <Field label={`Réalisé (cible : ${a.target_value ?? "—"} ${a.unit_label})`}>
          {(f) => <Input {...f} inputMode="decimal" value={actual} onChange={(e) => setActual(e.target.value)} />}
        </Field>
        <Field label="Budget dépensé">
          {(f) => <Input {...f} inputMode="decimal" value={spent} onChange={(e) => setSpent(e.target.value)} />}
        </Field>
      </div>
    </Dialog>
  );
}

function Revise({
  a,
  people,
  onDone,
  onClose,
}: {
  a: PlanActivity;
  people: People;
  onDone: (p: Plan) => void;
  onClose: () => void;
}) {
  const [end, setEnd] = useState(a.end_on ?? "");
  const [target, setTarget] = useState(a.target_value?.toString() ?? "");
  const [lead, setLead] = useState(a.responsible_id ?? "");
  const [reason, setReason] = useState("");
  const save = useMutation({
    mutationFn: () =>
      api.post<Plan>(`/api/plan-activities/${a.id}/revise`, {
        changes: { end_on: end || null, target_value: num(target), responsible_id: lead || null },
        reason,
      }),
    onSuccess: (r) => {
      onDone(r);
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Réviser l'activité"
      description="L'ancienne valeur, la nouvelle, le motif et votre nom seront conservés."
      width={520}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!reason.trim()} loading={save.isPending} onClick={() => save.mutate()}>
            Réviser
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Échéance">
          {(f) => <Input {...f} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />}
        </Field>
        <Field label="Cible">
          {(f) => <Input {...f} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />}
        </Field>
        <Field label="Responsable">
          {(f) => <PeopleSelect {...f} people={people} value={lead} onChange={setLead} />}
        </Field>
        <Field label="Motif de la révision" required>
          {(f) => <Textarea {...f} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </div>
    </Dialog>
  );
}
