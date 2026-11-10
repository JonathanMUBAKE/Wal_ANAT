import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Eye,
  FileCheck2,
  Hash,
  Plus,
  Send,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
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
  Section,
  Select,
  Stamp,
  Status,
  Table,
  Tabs,
  Td,
  Textarea,
  Tr,
  frDate,
  isLate,
  type Tone,
} from "@/components/gov";
import { api } from "@/lib/api";
import { useCan, useUsers } from "@/lib/hooks";

type DStatus = "prevu" | "en_cours" | "soumis" | "en_revue" | "a_corriger" | "valide";
interface Row {
  id: string;
  title: string;
  status: DStatus;
  due_on: string | null;
  version: number;
  responsible_name: string | null;
  validator_name: string | null;
  contract_title: string | null;
  to_pay: boolean;
  reception_ref: string | null;
}
interface Detail extends Row {
  description: string;
  criteria: string;
  review_comment: string;
  events: { id: string; actor_name: string | null; to_status: DStatus; comment: string; created_at: string }[];
  can: { edit: boolean; advance: boolean; review: boolean; decide: boolean };
}
interface Contract {
  id: string;
  consultant_name: string;
  title: string;
  start_on: string;
  end_on: string;
  amount: number | null;
  currency: string;
  status: "active" | "ended";
  supervisor_name: string | null;
  open_deliverables: number;
  to_pay: number;
  rating: number | null;
}
const STATE: Record<DStatus, { label: string; tone: Tone }> = {
  prevu: { label: "Prévu", tone: "neutral" },
  en_cours: { label: "En cours", tone: "info" },
  soumis: { label: "Soumis", tone: "warning" },
  en_revue: { label: "En revue", tone: "warning" },
  a_corriger: { label: "À corriger", tone: "danger" },
  valide: { label: "Validé", tone: "success" },
};
const HUE: Record<Tone, string> = {
  neutral: "var(--faint)",
  info: "var(--primary)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  success: "var(--success)",
};
const STAGE_ICON: Record<DStatus, typeof CircleDot> = {
  prevu: CircleDot,
  en_cours: CircleDashed,
  soumis: Send,
  en_revue: Eye,
  a_corriger: AlertCircle,
  valide: CheckCircle2,
};
const fail = (e: unknown) => toast.error((e as Error).message);

export function DeliverablesPage() {
  const can = useCan();
  const [tab, setTab] = useState<"all" | "contracts">("all");
  const [creating, setCreating] = useState<"deliverable" | "contract" | null>(null);
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={FileCheck2}
        crumbs={["Pilotage", "Livrables"]}
        title="Livrables et consultants"
        subtitle="Un livrable est validé par une autre personne que son auteur. Une mission suit ses livrables jusqu'au paiement."
        actions={
          <>
            {can("consultants.manage") && (
              <Button icon={<UserRoundCheck className="size-4" />} onClick={() => setCreating("contract")}>
                Nouvelle mission
              </Button>
            )}
            {can("deliverables.manage") && (
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating("deliverable")}>
                Nouveau livrable
              </Button>
            )}
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "all", label: "Livrables" },
          { id: "contracts", label: "Missions des consultants" },
        ]}
      />
      <div className="mx-auto max-w-[1240px] p-4 sm:px-8 sm:py-6">{tab === "all" ? <List /> : <Contracts />}</div>
      {creating === "deliverable" && <NewDeliverable onClose={() => setCreating(null)} />}
      {creating === "contract" && <NewContract onClose={() => setCreating(null)} />}
    </div>
  );
}

function List() {
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["deliverables"],
    queryFn: () => api.get<Row[]>("/api/deliverables"),
  });
  if (isLoading) return <LoadingRows />;
  const rows = [...(data ?? [])].sort((a, b) => (a.due_on ?? "9").localeCompare(b.due_on ?? "9"));
  return (
    <>
      <GroupedTable
        storageKey="anat.livrables.groupes"
        groups={(Object.keys(STATE) as DStatus[]).map((s) => ({
          id: s,
          label: STATE[s].label,
          hue: HUE[STATE[s].tone],
          Icon: STAGE_ICON[s],
          rows: rows.filter((d) => d.status === s),
        }))}
        rowKey={(d) => d.id}
        onOpen={(d) => setOpen(d.id)}
        columns={[
          {
            key: "titre",
            label: "Livrable",
            Icon: FileCheck2,
            width: "32%",
            render: (d) => (
              <span className="block min-w-0">
                <span className="block truncate font-medium">{d.title}</span>
                {d.contract_title && <span className="block truncate text-[12px] text-muted">{d.contract_title}</span>}
              </span>
            ),
          },
          {
            key: "resp",
            label: "Responsable",
            Icon: UserRound,
            width: "18%",
            render: (d) => <span className="text-muted">{d.responsible_name ?? "—"}</span>,
          },
          {
            key: "valid",
            label: "Valideur",
            Icon: ShieldCheck,
            width: "18%",
            render: (d) => <span className="text-muted">{d.validator_name ?? "—"}</span>,
          },
          {
            key: "due",
            label: "Échéance",
            Icon: CalendarDays,
            width: "13%",
            render: (d) => (
              <span className={cn("tabular", d.status !== "valide" && isLate(d.due_on) ? "font-medium text-danger" : "")}>
                {frDate(d.due_on)}
              </span>
            ),
          },
          {
            key: "suivi",
            label: "Suivi",
            Icon: Hash,
            width: "12%",
            render: (d) => (
              <span className="flex items-center gap-1.5">
                <Seal>v{d.version}</Seal>
                {d.to_pay && (
                  <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-primary">À payer</span>
                )}
              </span>
            ),
          },
        ]}
        empty={
          <Empty icon={<FileCheck2 className="size-6" />} title="Aucun livrable">
            Les livrables attendus et leur validation apparaîtront ici.
          </Empty>
        }
      />
      {open && <DeliverableDialog id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function DeliverableDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [stamp, setStamp] = useState(false);
  const { data: d } = useQuery({
    queryKey: ["deliverable", id],
    queryFn: () => api.get<Detail>(`/api/deliverables/${id}`),
  });
  const act = useMutation({
    mutationFn: (v: { path: string; body?: object }) =>
      api.post<Detail>(`/api/deliverables/${id}/${v.path}`, v.body ?? {}),
    onSuccess: (r) => {
      qc.setQueryData(["deliverable", id], r);
      qc.invalidateQueries({ queryKey: ["deliverables"] });
      if (r.status === "valide") setStamp(true);
      setComment("");
    },
    onError: fail,
  });
  if (!d) return null;
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={d.title}
      description={`Version ${d.version}`}
      width={620}
      footer={<Button onClick={onClose}>Fermer</Button>}
    >
      <div className="space-y-4 text-[13.5px]">
        <div className="flex flex-wrap items-center gap-2">
          {stamp ? <Stamp>Validé</Stamp> : <Status {...STATE[d.status]} />}
          {d.reception_ref && <span className="font-mono text-[12px] text-muted">{d.reception_ref}</span>}
        </div>
        {d.description && <p>{d.description}</p>}
        {d.criteria && (
          <div>
            <p className="text-[12.5px] font-medium text-muted">Critères d'acceptation</p>
            <p className="mt-0.5 whitespace-pre-wrap">{d.criteria}</p>
          </div>
        )}
        {d.review_comment && (
          <p className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-[13px]">
            {d.review_comment}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {d.can.advance && (d.status === "prevu" || d.status === "a_corriger") && (
            <Button variant="primary" loading={act.isPending} onClick={() => act.mutate({ path: "start" })}>
              Démarrer
            </Button>
          )}
          {d.can.advance && d.status === "en_cours" && (
            <Button variant="primary" loading={act.isPending} onClick={() => act.mutate({ path: "submit" })}>
              Soumettre pour validation
            </Button>
          )}
          {d.can.review && (
            <Button variant="primary" loading={act.isPending} onClick={() => act.mutate({ path: "review" })}>
              Prendre en revue
            </Button>
          )}
        </div>
        {d.can.decide && (
          <div className="space-y-2 border-t border-line pt-3">
            <Field label="Observations">
              {(a) => <Textarea {...a} value={comment} onChange={(e) => setComment(e.target.value)} />}
            </Field>
            <div className="flex gap-2">
              <Button
                variant="primary"
                loading={act.isPending}
                onClick={() => act.mutate({ path: "decide", body: { decision: "valide", comment } })}
              >
                Valider
              </Button>
              <Button
                disabled={!comment.trim()}
                onClick={() => act.mutate({ path: "decide", body: { decision: "a_corriger", comment } })}
              >
                Demander une correction
              </Button>
            </div>
          </div>
        )}
        {!!d.events.length && (
          <div className="border-t border-line pt-3">
            <p className="mb-1.5 text-[12.5px] font-medium text-muted">Historique</p>
            <ul className="stagger space-y-1 text-[12.5px]">
              {d.events.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{STATE[e.to_status].label}</span> · {e.actor_name} ·{" "}
                  {frDate(e.created_at.slice(0, 10))}
                  {e.comment && <span className="text-muted"> · {e.comment}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function NewDeliverable({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const { data: contracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => api.get<Contract[]>("/api/contracts"),
  });
  const [f, setF] = useState({
    title: "",
    responsible_id: "",
    validator_id: "",
    due_on: "",
    criteria: "",
    contract_id: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const create = useMutation({
    mutationFn: () =>
      api.post("/api/deliverables", { ...f, due_on: f.due_on || null, contract_id: f.contract_id || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliverables"] });
      onClose();
    },
    onError: fail,
  });
  const same = !!f.responsible_id && f.responsible_id === f.validator_id;
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Nouveau livrable"
      width={560}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!f.title.trim() || !f.responsible_id || !f.validator_id || same}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Créer
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Intitulé" required className="sm:col-span-2">
          {(a) => <Input {...a} autoFocus value={f.title} onChange={set("title")} />}
        </Field>
        <Field label="Responsable" required>
          {(a) => (
            <PeopleSelect
              {...a}
              people={users}
              value={f.responsible_id}
              onChange={(v) => setF({ ...f, responsible_id: v })}
            />
          )}
        </Field>
        <Field label="Valideur" required error={same ? "Le valideur doit être une autre personne" : null}>
          {(a) => (
            <PeopleSelect
              {...a}
              people={users}
              value={f.validator_id}
              onChange={(v) => setF({ ...f, validator_id: v })}
            />
          )}
        </Field>
        <Field label="Échéance">{(a) => <Input {...a} type="date" value={f.due_on} onChange={set("due_on")} />}</Field>
        <Field label="Mission de consultant">
          {(a) => (
            <Select {...a} value={f.contract_id} onChange={set("contract_id")}>
              <option value="">Aucune</option>
              {contracts
                ?.filter((c) => c.status === "active")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.consultant_name} · {c.title}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label="Critères d'acceptation" className="sm:col-span-2">
          {(a) => <Textarea {...a} value={f.criteria} onChange={set("criteria")} />}
        </Field>
      </div>
    </Dialog>
  );
}

function Contracts() {
  const { data, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => api.get<Contract[]>("/api/contracts"),
  });
  if (isLoading) return <LoadingRows />;
  return (
    <Section>
      {data?.length ? (
        <Table head={["Consultant", "Mission", "Superviseur", "Fin", "Livrables ouverts", "À payer", "Statut"]}>
          {data.map((c) => (
            <Tr key={c.id}>
              <Td className="font-medium">{c.consultant_name}</Td>
              <Td>{c.title}</Td>
              <Td>{c.supervisor_name ?? "—"}</Td>
              <Td className="tabular">{frDate(c.end_on)}</Td>
              <Td className="tabular">{c.open_deliverables}</Td>
              <Td className={c.to_pay ? "tabular font-semibold text-primary" : "tabular"}>{c.to_pay || "—"}</Td>
              <Td>
                <Status
                  label={c.status === "active" ? "En cours" : "Terminée"}
                  tone={c.status === "active" ? "info" : "neutral"}
                />
              </Td>
            </Tr>
          ))}
        </Table>
      ) : (
        <Empty icon={<UserRoundCheck className="size-6" />} title="Aucune mission">
          Enregistrez les termes de référence, les dates et le superviseur.
        </Empty>
      )}
    </Section>
  );
}

function NewContract({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const [f, setF] = useState({
    user_id: "",
    consultant_name: "",
    title: "",
    terms: "",
    start_on: "",
    end_on: "",
    amount: "",
    currency: "USD",
    supervisor_id: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const create = useMutation({
    mutationFn: () =>
      api.post("/api/contracts", { ...f, user_id: f.user_id || null, amount: f.amount ? Number(f.amount) : null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Nouvelle mission de consultant"
      description="À la fin de la mission, l'accès d'un consultant invité est fermé automatiquement. Le superviseur est prévenu 15 jours avant."
      width={600}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={
              !f.title.trim() ||
              !f.start_on ||
              !f.end_on ||
              !f.supervisor_id ||
              (!f.user_id && !f.consultant_name.trim())
            }
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Créer
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Compte du consultant" hint="S'il a été invité dans l'outil">
          {(a) => (
            <PeopleSelect
              {...a}
              people={users}
              placeholder="Aucun compte"
              value={f.user_id}
              onChange={(v) => setF({ ...f, user_id: v })}
            />
          )}
        </Field>
        <Field label="Nom du consultant">
          {(a) => <Input {...a} disabled={!!f.user_id} value={f.consultant_name} onChange={set("consultant_name")} />}
        </Field>
        <Field label="Intitulé de la mission" required className="sm:col-span-2">
          {(a) => <Input {...a} value={f.title} onChange={set("title")} />}
        </Field>
        <Field label="Début" required>
          {(a) => <Input {...a} type="date" value={f.start_on} onChange={set("start_on")} />}
        </Field>
        <Field label="Fin" required>
          {(a) => <Input {...a} type="date" value={f.end_on} onChange={set("end_on")} />}
        </Field>
        <Field label="Montant">
          {(a) => <Input {...a} inputMode="decimal" value={f.amount} onChange={set("amount")} />}
        </Field>
        <Field label="Superviseur" required>
          {(a) => (
            <PeopleSelect
              {...a}
              people={users}
              value={f.supervisor_id}
              onChange={(v) => setF({ ...f, supervisor_id: v })}
            />
          )}
        </Field>
        <Field label="Termes de référence" className="sm:col-span-2">
          {(a) => <Textarea {...a} value={f.terms} onChange={set("terms")} />}
        </Field>
      </div>
    </Dialog>
  );
}
