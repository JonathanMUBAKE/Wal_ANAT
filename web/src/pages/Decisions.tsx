import { useOpenFromUrl } from "@/components/quick-entry";
import { ExportMenu, tableDoc } from "@/components/export-menu";
import { todayIso } from "@/lib/format";
import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  FolderOpen,
  Hash,
  Lock,
  Plus,
  Repeat2,
  Scale,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, Empty, cn } from "@/components/ui";
import { GroupedTable, Seal } from "@/components/collection";
import {
  Field,
  Input,
  LoadingRows,
  PageHeader,
  PeopleSelect,
  Stamp,
  Status,
  Tabs,
  Textarea,
  frDate,
  type Tone,
} from "@/components/gov";
import { api } from "@/lib/api";
import { Drawer } from "@/components/drawer";
import { useCan, useMe, useUsers } from "@/lib/hooks";

export type DecisionStatus = "a_executer" | "en_cours" | "executee" | "remplacee";
interface Decision {
  id: string;
  reference: string;
  title: string;
  content: string;
  decided_on: string;
  status: DecisionStatus;
  owner_id: string | null;
  owner_name: string | null;
  recorded_by_name: string | null;
  due_on: string | null;
  confidential: boolean;
  execution_note: string;
  executed_at: string | null;
  late: boolean;
  source: { kind: "project" | "activity" | "meeting"; id: string; href: string; label: string } | null;
  replaces_reference: string | null;
  replaced_by_reference: string | null;
  /** Décision sans exécution à suivre (DEC-2). */
  no_execution?: boolean;
  /** Inscrite par le secrétariat, pas encore confirmée par la DG (thème 2, DEC-1). */
  to_confirm: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  /** Exécution déclarée par le chargé, à confirmer par le secrétariat de la DG (DEC-3). */
  execution_declared_by: string | null;
  execution_declared_at: string | null;
  execution_confirmed_by: string | null;
}
interface Detail extends Decision {
  can: { execute: boolean; replace: boolean; confirm: boolean; confirm_execution: boolean };
}
/** Dossier dont la décision est attendue : il est prérempli quand on arbitre depuis le tableau de bord. */
export interface DecisionSource {
  kind: "project" | "activity" | "meeting";
  id: string;
  label: string;
  question?: string;
}

export const DECISION_STATE: Record<DecisionStatus, { label: string; tone: Tone; Icon: typeof CircleDot }> = {
  a_executer: { label: "À exécuter", tone: "warning", Icon: CircleDot },
  en_cours: { label: "En cours d'exécution", tone: "info", Icon: CircleDashed },
  executee: { label: "Exécutée", tone: "success", Icon: CheckCircle2 },
  remplacee: { label: "Remplacée", tone: "neutral", Icon: Repeat2 },
};
const HUE: Record<Tone, string> = {
  neutral: "var(--faint)",
  info: "var(--primary)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  success: "var(--success)",
};
const SOURCE_LABEL = { project: "Projet", activity: "Activité", meeting: "Réunion" } as const;
const fail = (e: unknown) => toast.error((e as Error).message);
const today = () => todayIso();

export function DecisionsPage() {
  const can = useCan();
  const { data: me } = useMe();
  const [tab, setTab] = useState<"all" | "mine" | "confirm">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  useOpenFromUrl(() => setCreating(true));
  const { data, isLoading } = useQuery({
    queryKey: ["decisions"],
    queryFn: () => api.get<Decision[]>("/api/decisions"),
  });
  const rows = (data ?? []).filter(
    (d) =>
      tab === "all" ||
      (tab === "mine" && d.owner_id === me?.id) ||
      (tab === "confirm" && (d.to_confirm || (!!d.execution_declared_at && d.status === "en_cours"))),
  );
  const toConfirm = (data ?? []).filter((d) => d.to_confirm || (!!d.execution_declared_at && d.status === "en_cours"));
  const mine = (data ?? []).filter(
    (d) => d.owner_id === me?.id && (d.status === "a_executer" || d.status === "en_cours"),
  );
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={Scale}
        crumbs={["Pilotage", "Décisions"]}
        title="Registre des décisions"
        subtitle="Chaque décision de la DG est numérotée, figée et suivie jusqu'à son exécution."
        actions={
          <>
            <ExportMenu
              disabled={!rows.length}
              build={() =>
                tableDoc(
                  "Registre des décisions",
                  ["Référence", "Décision", "Décidée le", "Source", "Chargé d'exécution", "Échéance", "État"],
                  rows.map((d) => [
                    d.reference,
                    d.title,
                    frDate(d.decided_on),
                    d.source ? `${SOURCE_LABEL[d.source.kind]} · ${d.source.label}` : "",
                    d.owner_name,
                    frDate(d.due_on),
                    DECISION_STATE[d.status].label + (d.late ? " (en retard)" : ""),
                  ]),
                  {
                    filename: "registre-des-decisions",
                    subtitle: tab === "mine" ? "À exécuter par moi" : "Toutes les décisions",
                    widths: [2, 5, 1.5, 3, 2.5, 1.5, 2],
                  },
                )
              }
            />
            {can("decisions.record") && (
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Enregistrer une décision
              </Button>
            )}
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "all", label: "Toutes les décisions" },
          { id: "mine", label: "À exécuter par moi", badge: mine.length },
          ...(can("decisions.confirm") || can("decisions.record")
            ? [{ id: "confirm" as const, label: "À confirmer", badge: toConfirm.length }]
            : []),
        ]}
      />
      <div className="mx-auto max-w-[1480px] p-4 sm:px-8 sm:py-6">
        {isLoading ? (
          <LoadingRows />
        ) : (
          <GroupedTable
            storageKey="anat.decisions.groupes"
            groups={(Object.keys(DECISION_STATE) as DecisionStatus[]).map((s) => ({
              id: s,
              label: DECISION_STATE[s].label,
              hue: HUE[DECISION_STATE[s].tone],
              Icon: DECISION_STATE[s].Icon,
              rows: rows.filter((d) => d.status === s),
            }))}
            rowKey={(d) => d.id}
            onOpen={(d) => setOpen(d.id)}
            columns={[
              {
                key: "ref",
                label: "Numéro",
                Icon: Hash,
                width: "15%",
                render: (d) => <span className="font-mono text-[12px] text-muted">{d.reference}</span>,
              },
              {
                key: "titre",
                label: "Décision",
                Icon: Scale,
                width: "37%",
                render: (d) => (
                  <span className="block min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{d.title}</span>
                      {d.confidential && <Lock className="size-3 shrink-0 text-faint" aria-label="Confidentielle" />}
                      {d.to_confirm && (
                        <span className="shrink-0 rounded-full bg-warning-soft px-1.5 text-[11px] font-medium text-warning">
                          À confirmer par la DG
                        </span>
                      )}
                      {d.execution_declared_at && d.status === "en_cours" && (
                        <span className="shrink-0 rounded-full bg-info-soft px-1.5 text-[11px] font-medium text-primary">
                          Exécution déclarée
                        </span>
                      )}
                    </span>
                    {d.source && (
                      <span className="block truncate text-[12px] text-muted">
                        {SOURCE_LABEL[d.source.kind]} · {d.source.label}
                      </span>
                    )}
                  </span>
                ),
              },
              {
                key: "owner",
                label: "Chargé d'exécution",
                Icon: UserRound,
                width: "19%",
                render: (d) => <span className="text-muted">{d.owner_name ?? "—"}</span>,
              },
              {
                key: "due",
                label: "Échéance",
                Icon: CalendarDays,
                width: "14%",
                render: (d) => (
                  <span className={cn("tabular", d.late ? "font-medium text-danger" : "")}>{frDate(d.due_on)}</span>
                ),
              },
              {
                key: "date",
                label: "Décidée le",
                Icon: CalendarDays,
                width: "15%",
                render: (d) => <span className="tabular text-muted">{frDate(d.decided_on)}</span>,
              },
            ]}
            empty={
              <Empty icon={<Scale className="size-6" />} title="Aucune décision enregistrée">
                Les décisions de la DG apparaissent ici dès qu'elles sont enregistrées, par exemple depuis « Arbitrer »
                au tableau de bord.
              </Empty>
            }
          />
        )}
      </div>
      {open && <DecisionPanel id={open} onClose={() => setOpen(null)} />}
      {creating && <DecisionDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function DecisionPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [returning, setReturning] = useState(false);
  const [motive, setMotive] = useState("");
  const { data: users } = useUsers();
  const nameOf = (uid: string | null) => users?.find((u) => u.id === uid)?.name ?? "—";
  const after = (r: Detail, msg: string) => {
    qc.setQueryData(["decision", id], r);
    qc.invalidateQueries({ queryKey: ["decisions"] });
    qc.invalidateQueries({ queryKey: ["pilotage"] });
    toast.success(msg);
  };
  const confirm = useMutation({
    mutationFn: () => api.post<Detail>(`/api/decisions/${id}/confirm`),
    onSuccess: (r) => after(r, "Décision confirmée"),
    onError: fail,
  });
  const confirmExec = useMutation({
    mutationFn: () => api.post<Detail>(`/api/decisions/${id}/execution/confirm`),
    onSuccess: (r) => after(r, "Exécution confirmée : la décision est close"),
    onError: fail,
  });
  const returnExec = useMutation({
    mutationFn: () => api.post<Detail>(`/api/decisions/${id}/execution/return`, { comment: motive }),
    onSuccess: (r) => {
      setReturning(false);
      setMotive("");
      after(r, "Exécution renvoyée au chargé");
    },
    onError: fail,
  });
  const { data: d } = useQuery({
    queryKey: ["decision", id],
    queryFn: () => api.get<Detail>(`/api/decisions/${id}`),
  });
  const move = useMutation({
    mutationFn: (status: "en_cours" | "executee") =>
      api.patch<Detail>(`/api/decisions/${id}/execution`, { status, note: note.trim() || undefined }),
    onSuccess: (r) => {
      qc.setQueryData(["decision", id], r);
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["pilotage"] });
      setNote("");
      toast.success(
        r.status === "executee"
          ? "Exécution enregistrée"
          : r.execution_declared_at
            ? "Exécution déclarée : le secrétariat de la DG la confirmera"
            : "Décision passée en cours d'exécution",
      );
    },
    onError: fail,
  });
  if (!d) return null;
  if (replacing)
    return (
      <DecisionDialog
        replaces={d}
        source={d.source ? { ...d.source } : undefined}
        onClose={() => setReplacing(false)}
        onDone={onClose}
      />
    );
  const S = DECISION_STATE[d.status];
  return (
    <Drawer
      open
      onClose={onClose}
      title={d.title}
      subtitle={`Décision ${d.reference} du ${frDate(d.decided_on)}`}
      footer={
        <>
          {d.can.replace && (
            <Button icon={<Repeat2 className="size-4" />} onClick={() => setReplacing(true)}>
              Remplacer
            </Button>
          )}
          <Button onClick={onClose}>Fermer</Button>
        </>
      }
    >
      <div className="space-y-4 text-[13.5px]">
        <div className="flex flex-wrap items-center gap-2">
          {d.no_execution ? (
            <Status label="Sans exécution à suivre" tone="neutral" />
          ) : d.status === "executee" ? (
            <Stamp>Exécutée</Stamp>
          ) : (
            <Status label={S.label} tone={d.late ? "danger" : S.tone} />
          )}
          <Seal>{d.reference}</Seal>
          {d.confidential && (
            <span className="inline-flex items-center gap-1 text-[12px] text-muted">
              <Lock className="size-3" /> Confidentielle
            </span>
          )}
        </div>
        {d.to_confirm && (
          <div className="rounded-xl border border-line bg-warning-soft/40 px-4 py-3 text-[13px]">
            <p>
              Inscrite par {d.recorded_by_name ?? "le secrétariat"} au nom de la DG, en attente de sa confirmation. La
              décision est numérotée et suivie dès son inscription.
            </p>
            {d.can.confirm && (
              <Button className="mt-2" size="sm" variant="primary" loading={confirm.isPending} onClick={() => confirm.mutate()}>
                Confirmer la décision
              </Button>
            )}
          </div>
        )}
        {d.confirmed_at && d.confirmed_by && d.recorded_by_name && nameOf(d.confirmed_by) !== d.recorded_by_name && (
          <p className="text-[12.5px] text-muted">
            Confirmée par {nameOf(d.confirmed_by)} le {frDate(d.confirmed_at.slice(0, 10))}
          </p>
        )}
        {d.execution_declared_at && d.status === "en_cours" && (
          <div className="rounded-xl border border-line bg-hover/40 px-4 py-3 text-[13px]">
            <p>
              Exécution déclarée par {nameOf(d.execution_declared_by)} le {frDate(d.execution_declared_at.slice(0, 10))}
              , en attente de la confirmation du secrétariat de la DG.
            </p>
            {d.can.confirm_execution && !returning && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="primary" loading={confirmExec.isPending} onClick={() => confirmExec.mutate()}>
                  Confirmer l'exécution
                </Button>
                <Button size="sm" onClick={() => setReturning(true)}>
                  Renvoyer
                </Button>
              </div>
            )}
            {returning && (
              <div className="mt-2 space-y-2">
                <Field label="Motif du renvoi" hint="Ce qui manque pour clore la décision">
                  {(a) => <Textarea {...a} value={motive} onChange={(e) => setMotive(e.target.value)} />}
                </Field>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!motive.trim()}
                    loading={returnExec.isPending}
                    onClick={() => returnExec.mutate()}
                  >
                    Renvoyer au chargé
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setReturning(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        <blockquote className="whitespace-pre-wrap rounded-xl border border-line bg-hover/40 px-4 py-3 leading-relaxed">
          {d.content}
        </blockquote>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]">
          <Meta label="Chargé d'exécution">{d.owner_name ?? "Non désigné"}</Meta>
          <Meta label="Échéance">
            <span className={d.late ? "font-medium text-danger" : ""}>{frDate(d.due_on)}</span>
          </Meta>
          <Meta label="Enregistrée par">{d.recorded_by_name ?? "—"}</Meta>
          <Meta label="Dossier">
            {d.source ? (
              <Link to={d.source.href} className="inline-flex items-center gap-1 text-primary hover:underline">
                <FolderOpen className="size-3.5" />
                {d.source.label || SOURCE_LABEL[d.source.kind]}
              </Link>
            ) : (
              "Aucun"
            )}
          </Meta>
        </dl>
        {(d.replaces_reference || d.replaced_by_reference) && (
          <p className="rounded-lg border border-line px-3 py-2 text-[12.5px] text-muted">
            {d.replaces_reference && <>Remplace la décision {d.replaces_reference}. </>}
            {d.replaced_by_reference && <>Remplacée par la décision {d.replaced_by_reference}.</>}
          </p>
        )}
        {d.execution_note && (
          <div>
            <p className="text-[12.5px] font-medium text-muted">Compte rendu d'exécution</p>
            <p className="mt-0.5 whitespace-pre-wrap">{d.execution_note}</p>
            {d.executed_at && <p className="mt-1 text-[12px] text-muted">Le {frDate(d.executed_at.slice(0, 10))}</p>}
          </div>
        )}
        {d.can.execute && (
          <div className="space-y-2 border-t border-line pt-3">
            <Field label="Compte rendu d'exécution" hint="Ce qui a été fait, la référence de l'acte…">
              {(a) => <Textarea {...a} value={note} onChange={(e) => setNote(e.target.value)} />}
            </Field>
            <div className="flex flex-wrap gap-2">
              {d.status === "a_executer" && (
                <Button loading={move.isPending} onClick={() => move.mutate("en_cours")}>
                  Passer en cours
                </Button>
              )}
              <Button variant="primary" loading={move.isPending} onClick={() => move.mutate("executee")}>
                Déclarer exécutée
              </Button>
            </div>
          </div>
        )}
        <p className="text-[12px] text-faint">
          Une décision enregistrée ne se modifie pas : une erreur se corrige par une nouvelle décision qui la remplace.
        </p>
      </div>
    </Drawer>
  );
}

const Meta = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-[12px] text-muted">{label}</dt>
    <dd className="mt-0.5 truncate font-medium">{children}</dd>
  </div>
);

/** Enregistrer une décision : depuis le registre, depuis « Arbitrer » (dossier prérempli) ou pour en remplacer une. */
export function DecisionDialog({
  source,
  replaces,
  onClose,
  onDone,
}: {
  source?: DecisionSource;
  replaces?: {
    id: string;
    reference: string;
    title: string;
    content: string;
    owner_id: string | null;
    due_on: string | null;
  };
  onClose: () => void;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const [f, setF] = useState({
    title: replaces?.title ?? source?.question ?? "",
    content: replaces?.content ?? "",
    decided_on: today(),
    owner_id: replaces?.owner_id ?? "",
    due_on: replaces?.due_on ?? "",
    confidential: false,
    no_execution: false,
  });
  const set = (k: "title" | "content" | "decided_on" | "due_on") => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const record = useMutation({
    mutationFn: () =>
      api.post<Detail>("/api/decisions", {
        ...f,
        owner_id: f.no_execution ? null : f.owner_id || null,
        due_on: f.no_execution ? null : f.due_on || null,
        project_id: source?.kind === "project" ? source.id : null,
        activity_id: source?.kind === "activity" ? source.id : null,
        meeting_id: source?.kind === "meeting" ? source.id : null,
        replaces_id: replaces?.id ?? null,
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["pilotage"] });
      qc.invalidateQueries({ queryKey: ["decision"] });
      toast.success(`Décision ${r.reference} enregistrée`);
      onClose();
      onDone?.();
    },
    onError: fail,
  });
  const dueBefore = !!f.due_on && f.due_on < f.decided_on;
  const future = f.decided_on > today();
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={replaces ? `Remplacer la décision ${replaces.reference}` : "Enregistrer une décision"}
      description={
        source
          ? `${SOURCE_LABEL[source.kind]} · ${source.label}`
          : "La décision reçoit un numéro annuel et ne pourra plus être modifiée."
      }
      width={600}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={
              !f.title.trim() ||
              !f.content.trim() ||
              !f.decided_on ||
              dueBefore ||
              future ||
              // Une décision a un chargé et une échéance, sauf décision sans exécution (DEC-2)
              (!f.no_execution && (!f.owner_id || !f.due_on))
            }
            loading={record.isPending}
            onClick={() => record.mutate()}
          >
            Enregistrer au registre
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Objet" required className="sm:col-span-2">
          {(a) => <Input {...a} autoFocus value={f.title} onChange={set("title")} />}
        </Field>
        <Field
          label="Texte de la décision"
          required
          className="sm:col-span-2"
          hint="Ce que la DG a décidé, tel qu'il sera archivé."
        >
          {(a) => <Textarea {...a} rows={4} value={f.content} onChange={set("content")} />}
        </Field>
        <Field label="Date de la décision" required error={future ? "La date ne peut pas être dans le futur" : null}>
          {(a) => <Input {...a} type="date" max={today()} value={f.decided_on} onChange={set("decided_on")} />}
        </Field>
        <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={f.no_execution}
            onChange={(e) => setF({ ...f, no_execution: e.target.checked })}
          />
          Décision sans exécution à suivre (prise de position, orientation)
        </label>
        {!f.no_execution && (
          <>
            <Field label="Chargé d'exécution" required>
              {(a) => (
                <PeopleSelect
                  {...a}
                  people={users}
                  placeholder="Choisir…"
                  value={f.owner_id}
                  onChange={(v) => setF({ ...f, owner_id: v })}
                />
              )}
            </Field>
            <Field
              label="Échéance d'exécution"
              required
              error={dueBefore ? "L'échéance précède la date de la décision" : null}
            >
              {(a) => <Input {...a} type="date" min={f.decided_on} value={f.due_on} onChange={set("due_on")} />}
            </Field>
          </>
        )}
        <label className="flex items-center gap-2 self-end pb-2 text-[13px]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={f.confidential}
            onChange={(e) => setF({ ...f, confidential: e.target.checked })}
          />
          Décision confidentielle
        </label>
      </div>
    </Dialog>
  );
}
