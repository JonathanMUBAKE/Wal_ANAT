import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Eye,
  FileCheck2,
  FileSignature,
  FolderOpen,
  Hash,
  Plus,
  Send,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, Empty, cn } from "@/components/ui";
import { Badge, GroupedTable, Seal } from "@/components/collection";
import { STAGE, stageOf } from "@/components/MeetingViews";
import { type MeetingRow, NewMeeting } from "./Meetings";
import { PartnerSelect } from "@/components/partners";
import {
  Field,
  Input,
  LoadingRows,
  PeopleSelect,
  ProgressBar,
  Section,
  Select,
  Stamp,
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
import { useCan, useMe, useUsers } from "@/lib/hooks";

/*
 * Le projet est le dossier complet (docs/PARCOURS-METIER.md, lot P1) : ses livrables et ses contrats y sont rangés.
 * Les mêmes briques servent aux vues transverses : « Mes tâches » et « Contrats et paiements ».
 */
type DStatus = "prevu" | "en_cours" | "soumis" | "en_revue" | "a_corriger" | "valide";
export interface DeliverableRow {
  id: string;
  project_id: string | null;
  project_name: string | null;
  title: string;
  status: DStatus;
  due_on: string | null;
  version: number;
  responsible_id: string | null;
  validator_id: string | null;
  responsible_name: string | null;
  validator_name: string | null;
  contract_id: string | null;
  contract_title: string | null;
  payment_percent: number | null;
  amount_due: number | null;
  currency: string | null;
  to_pay: boolean;
  paid_at: string | null;
  reception_ref: string | null;
}
interface Detail extends DeliverableRow {
  description: string;
  criteria: string;
  review_comment: string;
  events: { id: string; actor_name: string | null; to_status: DStatus; comment: string; created_at: string }[];
  can: { edit: boolean; advance: boolean; review: boolean; decide: boolean };
}
export interface ContractRow {
  id: string;
  project_id: string | null;
  project_name: string | null;
  user_id: string | null;
  consultant_name: string;
  title: string;
  terms: string;
  start_on: string;
  end_on: string;
  amount: number | null;
  currency: string;
  status: "active" | "ended";
  supervisor_id: string | null;
  supervisor_name: string | null;
  open_deliverables: number;
  scheduled_percent: number;
  to_pay_amount: number;
  paid_amount: number;
  evaluation: string;
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
export const money = (n: number | null | undefined, cur = "USD") =>
  n === null || n === undefined
    ? "—"
    : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)} ${cur}`;

/** Ce que porte la colonne « Paiement » : la tranche, puis son état. */
function Tranche({ d }: { d: DeliverableRow }) {
  if (!d.payment_percent) return <span className="text-faint">—</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="tabular">{d.payment_percent} %</span>
      {d.paid_at ? (
        <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[11px] font-medium text-success">Payée</span>
      ) : d.to_pay ? (
        <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-primary">À payer</span>
      ) : null}
    </span>
  );
}

// ---------------------------------------------------------------- onglet « Livrables » du projet
export function ProjectDeliverables({ projectId }: { projectId: string }) {
  const can = useCan();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["deliverables", { project: projectId }],
    queryFn: () => api.get<DeliverableRow[]>(`/api/deliverables?project_id=${projectId}`),
  });
  const rows = [...(data ?? [])].sort((a, b) => (a.due_on ?? "9").localeCompare(b.due_on ?? "9"));
  return (
    <div className="mx-auto max-w-[1480px] space-y-4 p-4 sm:px-8 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          Chaque livrable est validé par une autre personne que son auteur. Un livrable de contrat porte sa tranche de
          paiement.
        </p>
        {can("deliverables.manage") && (
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Nouveau livrable
          </Button>
        )}
      </div>
      {isLoading ? (
        <LoadingRows />
      ) : (
        <GroupedTable
          storageKey="anat.projet.livrables"
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
                  {d.contract_title && (
                    <span className="block truncate text-[12px] text-muted">{d.contract_title}</span>
                  )}
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
              width: "14%",
              render: (d) => (
                <span
                  className={cn("tabular", d.status !== "valide" && isLate(d.due_on) ? "font-medium text-danger" : "")}
                >
                  {frDate(d.due_on)}
                </span>
              ),
            },
            { key: "pay", label: "Paiement", Icon: Hash, width: "18%", render: (d) => <Tranche d={d} /> },
          ]}
          empty={
            <Empty icon={<FileCheck2 className="size-6" />} title="Aucun livrable dans ce projet">
              Les produits attendus du projet, et ceux des contrats de prestataires, apparaissent ici.
            </Empty>
          }
        />
      )}
      {open && <DeliverableDialog id={open} onClose={() => setOpen(null)} />}
      {creating && <NewDeliverable projectId={projectId} onClose={() => setCreating(false)} />}
    </div>
  );
}

export function DeliverableDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const can = useCan();
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
      qc.invalidateQueries({ queryKey: ["contracts"] });
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
      description={`Version ${d.version}${d.project_name ? ` · ${d.project_name}` : ""}`}
      width={620}
      footer={<Button onClick={onClose}>Fermer</Button>}
    >
      <div className="space-y-4 text-[13.5px]">
        <div className="flex flex-wrap items-center gap-2">
          {stamp ? <Stamp>Validé</Stamp> : <Status {...STATE[d.status]} />}
          {d.reception_ref && <Seal>{d.reception_ref}</Seal>}
          {d.project_id && (
            <Link
              to={`/projects/${d.project_id}/livrables`}
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[12.5px] text-primary hover:underline"
            >
              <FolderOpen className="size-3.5" />
              Ouvrir le dossier
            </Link>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
          <Meta label="Responsable">{d.responsible_name ?? "—"}</Meta>
          <Meta label="Valideur">{d.validator_name ?? "—"}</Meta>
          <Meta label="Échéance">
            <span className={d.status !== "valide" && isLate(d.due_on) ? "text-danger" : ""}>{frDate(d.due_on)}</span>
          </Meta>
          <Meta label="Contrat">{d.contract_title ?? "Aucun"}</Meta>
          {d.payment_percent ? (
            <Meta label="Tranche de paiement">
              {d.payment_percent} % · {money(d.amount_due, d.currency ?? "USD")}
            </Meta>
          ) : null}
        </dl>
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
        {(d.to_pay || d.paid_at) && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
            <span className="text-[13px]">
              {d.paid_at ? (
                <>
                  Paiement constaté le <b className="font-medium">{frDate(d.paid_at.slice(0, 10))}</b>
                </>
              ) : (
                <>
                  Livrable reçu, <b className="font-medium text-primary">à payer</b>
                  {d.amount_due ? ` : ${money(d.amount_due, d.currency ?? "USD")}` : ""}
                  {d.reception_ref ? ` · procès-verbal ${d.reception_ref}` : ""}
                </>
              )}
            </span>
            {d.to_pay && can("consultants.manage") && (
              <Button size="sm" variant="primary" loading={act.isPending} onClick={() => act.mutate({ path: "paid" })}>
                Constater le paiement
              </Button>
            )}
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

const Meta = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-[12px] text-muted">{label}</dt>
    <dd className="mt-0.5 truncate font-medium">{children}</dd>
  </div>
);

function NewDeliverable({
  projectId,
  contractId,
  onClose,
}: {
  projectId: string;
  contractId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const { data: contracts } = useQuery({
    queryKey: ["contracts", { project: projectId }],
    queryFn: () => api.get<ContractRow[]>(`/api/contracts?project_id=${projectId}`),
  });
  const [f, setF] = useState({
    title: "",
    responsible_id: "",
    validator_id: "",
    due_on: "",
    criteria: "",
    contract_id: contractId ?? "",
    payment_percent: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const contract = contracts?.find((c) => c.id === f.contract_id);
  const left = contract ? Math.max(0, 100 - contract.scheduled_percent) : 0;
  const pct = f.payment_percent ? Number(f.payment_percent) : null;
  const tooMuch = pct !== null && (pct <= 0 || pct > left);
  const create = useMutation({
    mutationFn: () =>
      api.post("/api/deliverables", {
        project_id: projectId,
        title: f.title,
        responsible_id: f.responsible_id,
        validator_id: f.validator_id,
        criteria: f.criteria,
        due_on: f.due_on || null,
        contract_id: f.contract_id || null,
        payment_percent: f.contract_id && pct ? pct : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliverables"] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
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
      description="Le livrable est rangé dans ce projet. Son valideur doit être une autre personne que son responsable."
      width={580}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!f.title.trim() || !f.responsible_id || !f.validator_id || same || tooMuch}
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
        <Field label="Contrat de prestataire">
          {(a) => (
            <Select
              {...a}
              value={f.contract_id}
              onChange={(e) => setF({ ...f, contract_id: e.target.value, payment_percent: "" })}
            >
              <option value="">Aucun (livrable interne)</option>
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
        {contract && (
          <Field
            label="Tranche de paiement (%)"
            className="sm:col-span-2"
            hint={`Reste à répartir sur ce contrat : ${left} %${contract.amount ? ` · ${money(((pct ?? 0) * contract.amount) / 100, contract.currency)}` : ""}`}
            error={tooMuch ? `Entre 0 et ${left} %` : null}
          >
            {(a) => <Input {...a} inputMode="decimal" value={f.payment_percent} onChange={set("payment_percent")} />}
          </Field>
        )}
        <Field label="Critères d'acceptation" className="sm:col-span-2">
          {(a) => <Textarea {...a} value={f.criteria} onChange={set("criteria")} />}
        </Field>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- onglet « Contrats » du projet
export function ProjectContracts({ projectId }: { projectId: string }) {
  const can = useCan();
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState<ContractRow | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { data: me } = useMe();
  const { data, isLoading } = useQuery({
    queryKey: ["contracts", { project: projectId }],
    queryFn: () => api.get<ContractRow[]>(`/api/contracts?project_id=${projectId}`),
  });
  const { data: items } = useQuery({
    queryKey: ["deliverables", { project: projectId }],
    queryFn: () => api.get<DeliverableRow[]>(`/api/deliverables?project_id=${projectId}`),
  });
  return (
    <div className="mx-auto max-w-[1480px] space-y-4 p-4 sm:px-8 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          Consultants et cabinets engagés pour ce projet : termes de référence, durée, montant et échéancier de paiement
          par livrable. À la fin du contrat, l'accès d'un consultant externe est fermé.
        </p>
        {can("consultants.manage") && (
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Nouveau contrat
          </Button>
        )}
      </div>
      {isLoading ? (
        <LoadingRows />
      ) : data?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((c) => {
            const mine = (items ?? []).filter((d) => d.contract_id === c.id);
            const paidPct = c.amount ? Math.round((c.paid_amount / c.amount) * 100) : 0;
            return (
              <section key={c.id} className="rounded-2xl border border-line bg-panel">
                <header className="flex items-start gap-3 border-b border-line px-5 py-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-primary">
                    <FileSignature className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">{c.title}</span>
                    <span className="block text-[12.5px] text-muted">
                      {c.consultant_name} · supervision {c.supervisor_name ?? "—"} · {frDate(c.start_on)} →{" "}
                      {frDate(c.end_on)}
                    </span>
                  </span>
                  <Status
                    label={c.status === "active" ? "En cours" : "Terminé"}
                    tone={c.status === "active" ? "info" : "neutral"}
                  />
                </header>
                <div className="space-y-3 px-5 py-4">
                  <div className="grid grid-cols-3 gap-3 text-[12.5px]">
                    <Figure label="Montant" value={money(c.amount, c.currency)} />
                    <Figure label="Payé" value={money(c.paid_amount, c.currency)} />
                    <Figure label="À payer" value={money(c.to_pay_amount, c.currency)} accent={c.to_pay_amount > 0} />
                  </div>
                  {c.amount ? (
                    <span className="flex items-center gap-2">
                      <ProgressBar value={paidPct} />
                      <span className="w-24 text-right text-[12px] tabular text-muted">{paidPct} % payé</span>
                    </span>
                  ) : null}
                  {c.scheduled_percent < 100 && (
                    <p className="text-[12px] text-warning">
                      Échéancier incomplet : {c.scheduled_percent} % du montant réparti sur les livrables.
                    </p>
                  )}
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {mine.length ? (
                      mine.map((d) => (
                        <li key={d.id}>
                          <button
                            onClick={() => setOpen(d.id)}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] hover:bg-hover/60"
                          >
                            <span className="min-w-0 flex-1 truncate">{d.title}</span>
                            <span className="text-[12px] tabular text-muted">{frDate(d.due_on)}</span>
                            <Tranche d={d} />
                            <Status {...STATE[d.status]} />
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-[12.5px] text-muted">
                        Aucun livrable : créez-les d'après les termes de référence.
                      </li>
                    )}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    {can("deliverables.manage") && c.status === "active" && (
                      <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setAdding(c.id)}>
                        Livrable du contrat
                      </Button>
                    )}
                    {(c.supervisor_id === me?.id || can("consultants.manage")) && (
                      <Button size="sm" icon={<Star className="size-3.5" />} onClick={() => setEvaluating(c)}>
                        {c.rating ? `Évaluation : ${c.rating}/5` : "Évaluer le prestataire"}
                      </Button>
                    )}
                  </div>
                  {c.terms && (
                    <details className="text-[12.5px]">
                      <summary className="cursor-pointer text-muted">Termes de référence</summary>
                      <p className="mt-1.5 whitespace-pre-wrap">{c.terms}</p>
                    </details>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <Section>
          <Empty icon={<FileSignature className="size-6" />} title="Aucun contrat dans ce projet">
            Un consultant ou un cabinet se recrute pour un projet : son contrat, ses termes de référence et ses
            livrables se rangent ici.
          </Empty>
        </Section>
      )}
      {creating && <NewContract projectId={projectId} onClose={() => setCreating(false)} />}
      {adding && <NewDeliverable projectId={projectId} contractId={adding} onClose={() => setAdding(null)} />}
      {evaluating && <Evaluate contract={evaluating} onClose={() => setEvaluating(null)} />}
      {open && <DeliverableDialog id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

const Figure = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div>
    <p className="text-muted">{label}</p>
    <p className={cn("mt-0.5 text-[14px] font-semibold tabular", accent && "text-primary")}>{value}</p>
  </div>
);

function NewContract({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const [f, setF] = useState({
    user_id: "",
    partner_id: "",
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
      api.post("/api/contracts", {
        ...f,
        project_id: projectId,
        user_id: f.user_id || null,
        partner_id: f.partner_id || null,
        amount: f.amount ? Number(f.amount) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrat créé. Ajoutez maintenant ses livrables et leurs tranches de paiement.");
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Nouveau contrat de prestataire"
      description="Le contrat est rangé dans ce projet. À sa fin, l'accès d'un consultant externe est fermé ; le superviseur est prévenu 15 jours avant."
      width={620}
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
              (!f.user_id && !f.partner_id && !f.consultant_name.trim())
            }
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Créer le contrat
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Compte du consultant" hint="S'il a été invité comme personne externe">
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
        <Field label="Cabinet (annuaire)" hint="Partenaire classé « prestataire ».">
          {(a) => (
            <PartnerSelect
              {...a}
              supplier
              placeholder="Aucun cabinet de l'annuaire"
              value={f.partner_id}
              onChange={(id, p) => setF({ ...f, partner_id: id, consultant_name: p ? p.name : f.consultant_name })}
            />
          )}
        </Field>
        <Field label="Consultant ou cabinet">
          {(a) => <Input {...a} disabled={!!f.user_id} value={f.consultant_name} onChange={set("consultant_name")} />}
        </Field>
        <Field label="Objet de la mission" required className="sm:col-span-2">
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
        <Field label="Devise">
          {(a) => (
            <Select {...a} value={f.currency} onChange={set("currency")}>
              {["USD", "CDF", "EUR", "XAF", "XOF"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Superviseur" required className="sm:col-span-2">
          {(a) => (
            <PeopleSelect
              {...a}
              people={users}
              value={f.supervisor_id}
              onChange={(v) => setF({ ...f, supervisor_id: v })}
            />
          )}
        </Field>
        <Field
          label="Termes de référence"
          className="sm:col-span-2"
          hint="Contexte, objectifs, tâches, livrables attendus, profil : ce sont les attributions du consultant."
        >
          {(a) => <Textarea {...a} rows={5} value={f.terms} onChange={set("terms")} />}
        </Field>
      </div>
    </Dialog>
  );
}

function Evaluate({ contract, onClose }: { contract: ContractRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ evaluation: contract.evaluation ?? "", rating: contract.rating ?? 0 });
  const save = useMutation({
    mutationFn: () => api.post(`/api/contracts/${contract.id}/evaluate`, f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Évaluation enregistrée");
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={`Évaluer ${contract.consultant_name}`}
      description={contract.title}
      width={520}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!f.rating || !f.evaluation.trim()}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <fieldset>
          <legend className="mb-1.5 text-[12.5px] font-medium text-muted">Note</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} sur 5`}
                aria-pressed={f.rating === n}
                onClick={() => setF({ ...f, rating: n })}
                className={cn("rounded-md p-1", n <= f.rating ? "text-warning" : "text-faint hover:text-muted")}
              >
                <Star className={cn("size-5", n <= f.rating && "fill-current")} />
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Appréciation" required hint="Qualité des livrables, respect des délais, collaboration.">
          {(a) => <Textarea {...a} value={f.evaluation} onChange={(e) => setF({ ...f, evaluation: e.target.value })} />}
        </Field>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- vue « Mes tâches » : livrables à produire, à valider
const useMyDeliverables = () =>
  useQuery({
    queryKey: ["deliverables", { mine: true }],
    queryFn: () => api.get<DeliverableRow[]>("/api/deliverables?mine=true"),
  });
const TO_PRODUCE = ["prevu", "en_cours", "a_corriger"];
/** Nombre de livrables à produire dont l'échéance est passée : ils comptent avec les retards (T-6). */
export function useLateDeliverables(meId: string | undefined) {
  const { data } = useMyDeliverables();
  return (data ?? []).filter((d) => d.responsible_id === meId && TO_PRODUCE.includes(d.status) && isLate(d.due_on))
    .length;
}

export function MyDeliverables() {
  const { data: me } = useMe();
  const [open, setOpen] = useState<string | null>(null);
  const { data } = useMyDeliverables();
  if (!data || !me) return null;
  const mine = data.filter((d) => d.responsible_id === me.id && TO_PRODUCE.includes(d.status));
  // Un livrable en retard se range avec les retards, en tête (T-6)
  const late = mine.filter((d) => isLate(d.due_on));
  const produce = mine.filter((d) => !isLate(d.due_on));
  const check = data.filter((d) => d.validator_id === me.id && ["soumis", "en_revue"].includes(d.status));
  // Le valideur voit ce qu'on lui remettra, avant la remise, retards en tête (T-7)
  const expected = data
    .filter((d) => d.validator_id === me.id && d.responsible_id !== me.id && TO_PRODUCE.includes(d.status))
    .sort((a, b) => Number(isLate(b.due_on)) - Number(isLate(a.due_on)));
  if (!produce.length && !check.length && !late.length && !expected.length) return null;
  const block = (title: string, rows: DeliverableRow[], Icon: typeof Send, danger = false) =>
    rows.length ? (
      <div>
        <p
          className={cn(
            "mb-1.5 flex items-center gap-1.5 text-[12.5px] font-medium",
            danger ? "text-danger" : "text-muted",
          )}
        >
          <Icon className="size-3.5" />
          {title} · {rows.length}
        </p>
        <ul className="divide-y divide-line rounded-xl border border-line bg-panel">
          {rows.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => setOpen(d.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-hover/60"
              >
                <FileCheck2 className="size-4 shrink-0 text-faint" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{d.title}</span>
                  <span className="block truncate text-[12px] text-muted">{d.project_name ?? "Sans projet"}</span>
                </span>
                <span
                  className={cn("text-[12px] tabular", isLate(d.due_on) ? "font-medium text-danger" : "text-muted")}
                >
                  {frDate(d.due_on)}
                </span>
                <Status {...STATE[d.status]} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null;
  return (
    <section className="space-y-3">
      <h2 className="text-[15px] font-semibold">Livrables</h2>
      {block("En retard", late, Send, true)}
      {block("À valider", check, ShieldCheck)}
      {block("À produire", produce, Send)}
      {block("Attendus de vos équipes", expected, ShieldCheck)}
      {open && <DeliverableDialog id={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

// ---------------------------------------------------------------- onglet « Réunions » du projet
/** Comités de pilotage, réunions de démarrage : les réunions du dossier, rattachées au projet. */
export function ProjectMeetings({ projectId }: { projectId: string }) {
  const can = useCan();
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["meetings", { project: projectId }],
    queryFn: () => api.get<MeetingRow[]>(`/api/meetings?project_id=${projectId}`),
  });
  return (
    <div className="mx-auto max-w-[1480px] space-y-4 p-4 sm:px-8 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          Les réunions de ce dossier : comité de pilotage, démarrage, revues. Leur compte rendu suit le circuit officiel
          (soumis au rédacteur, validé par la présidence).
        </p>
        {can("meetings.manage") && (
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Programmer une réunion
          </Button>
        )}
      </div>
      {isLoading ? (
        <LoadingRows />
      ) : data?.length ? (
        <Section>
          <Table head={["Numéro", "Réunion", "Date", "Étape", "Recommandations ouvertes"]}>
            {data.map((m) => {
              const s = stageOf(m);
              return (
                <Tr key={m.id} onClick={() => nav(`/reunions/${m.id}`)}>
                  <Td>
                    <Seal>{m.reference}</Seal>
                  </Td>
                  <Td className="font-medium">{m.meeting_type}</Td>
                  <Td className="tabular">
                    {frDate(m.meeting_date)}
                    {m.start_time ? ` · ${m.start_time}` : ""}
                  </Td>
                  <Td>
                    <Badge tone={STAGE[s].tone} label={STAGE[s].label} />
                  </Td>
                  <Td className="tabular">{m.open_actions || "—"}</Td>
                </Tr>
              );
            })}
          </Table>
        </Section>
      ) : (
        <Section>
          <Empty icon={<CalendarDays className="size-6" />} title="Aucune réunion dans ce dossier">
            Programmez un comité de pilotage ou une réunion de démarrage : elle restera rattachée à ce projet.
          </Empty>
        </Section>
      )}
      {creating && <NewMeeting projectId={projectId} onClose={() => setCreating(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------- vue transverse « Contrats et paiements »
export function ContractsPayments() {
  const [open, setOpen] = useState<string | null>(null);
  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => api.get<ContractRow[]>("/api/contracts"),
  });
  const { data: items } = useQuery({
    queryKey: ["deliverables", { all: true }],
    queryFn: () => api.get<DeliverableRow[]>("/api/deliverables"),
  });
  const toPay = (items ?? []).filter((d) => d.to_pay);
  if (isLoading) return <LoadingRows />;
  return (
    <div className="space-y-5">
      <Section title={`Tranches à payer · ${toPay.length}`}>
        {toPay.length ? (
          <Table head={["Livrable", "Projet", "Procès-verbal", "Tranche", "Montant"]}>
            {toPay.map((d) => (
              <Tr key={d.id} onClick={() => setOpen(d.id)}>
                <Td className="font-medium">{d.title}</Td>
                <Td>{d.project_name ?? "—"}</Td>
                <Td className="font-mono text-[12px]">{d.reception_ref ?? "—"}</Td>
                <Td className="tabular">{d.payment_percent ? `${d.payment_percent} %` : "—"}</Td>
                <Td className="tabular font-medium text-primary">{money(d.amount_due, d.currency ?? "USD")}</Td>
              </Tr>
            ))}
          </Table>
        ) : (
          <p className="px-5 py-4 text-[13px] text-muted">Aucune tranche en attente de paiement.</p>
        )}
      </Section>
      <Section title="Tous les contrats">
        {contracts?.length ? (
          <Table head={["Projet", "Prestataire", "Mission", "Fin", "Montant", "Payé", "À payer", "Statut"]}>
            {contracts.map((c) => (
              <Tr key={c.id}>
                <Td>
                  {c.project_id ? (
                    <Link to={`/projects/${c.project_id}/contrats`} className="text-primary hover:underline">
                      {c.project_name}
                    </Link>
                  ) : (
                    <span className="text-faint">Sans projet</span>
                  )}
                </Td>
                <Td className="font-medium">{c.consultant_name}</Td>
                <Td>{c.title}</Td>
                <Td className={cn("tabular", c.status === "active" && isLate(c.end_on) && "text-danger")}>
                  {frDate(c.end_on)}
                </Td>
                <Td className="tabular">{money(c.amount, c.currency)}</Td>
                <Td className="tabular">{money(c.paid_amount, c.currency)}</Td>
                <Td className={cn("tabular", c.to_pay_amount > 0 && "font-semibold text-primary")}>
                  {c.to_pay_amount ? money(c.to_pay_amount, c.currency) : "—"}
                </Td>
                <Td>
                  <Status
                    label={c.status === "active" ? "En cours" : "Terminé"}
                    tone={c.status === "active" ? "info" : "neutral"}
                  />
                </Td>
              </Tr>
            ))}
          </Table>
        ) : (
          <Empty icon={<FileSignature className="size-6" />} title="Aucun contrat">
            Les contrats se créent dans le projet qu'ils servent, onglet « Contrats ».
          </Empty>
        )}
      </Section>
      {open && <DeliverableDialog id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
