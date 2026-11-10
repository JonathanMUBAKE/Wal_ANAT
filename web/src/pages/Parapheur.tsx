import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, Check, Clock, FileSignature, Inbox, Mail, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, Empty, IconButton, cn } from "@/components/ui";
import {
  DomainSelect,
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
import { useCan, useMe, useUnits, useUsers } from "@/lib/hooks";

type DocStatus = "draft" | "in_circuit" | "signed" | "rejected";
interface Row {
  id: string;
  reference: string;
  title: string;
  kind: string;
  status: DocStatus;
  due_on: string | null;
  author_name: string | null;
  pending_action: string | null;
  pending_actor: string | null;
}
interface Step {
  id: string;
  position: number;
  actor_id: string;
  actor_name: string | null;
  action: "avis" | "visa" | "signature";
  status: "waiting" | "pending" | "approved" | "rejected";
  acted_by: string | null;
  acted_by_name: string | null;
  acted_at: string | null;
  comment: string;
}
interface Detail extends Row {
  body: string;
  content_hash: string | null;
  intact: boolean | null;
  steps: Step[];
  can: { edit: boolean; start: boolean; decide: boolean };
}
const STATE: Record<DocStatus, { label: string; tone: Tone }> = {
  draft: { label: "Brouillon", tone: "neutral" },
  in_circuit: { label: "Dans le circuit", tone: "warning" },
  signed: { label: "Signé", tone: "success" },
  rejected: { label: "Rejeté", tone: "danger" },
};
const ACTION = { avis: "Avis", visa: "Visa", signature: "Signature" };
const fail = (e: unknown) => toast.error((e as Error).message);

export function ParapheurPage() {
  const [tab, setTab] = useState<"to_sign" | "mine" | "all" | "delegations">("to_sign");
  const [creating, setCreating] = useState(false);
  const { data: pending } = useQuery({
    queryKey: ["signature", "to_sign"],
    queryFn: () => api.get<Row[]>("/api/signature?box=to_sign"),
  });
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={FileSignature}
        crumbs={["Secrétariat", "Parapheur"]}
        title="Parapheur"
        subtitle="Chaque document suit son circuit dans l'ordre. Son contenu est scellé dès l'entrée dans le circuit."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Nouveau document
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "to_sign", label: "À traiter", badge: pending?.length },
          { id: "mine", label: "Mes documents" },
          { id: "all", label: "Tous mes circuits" },
          { id: "delegations", label: "Délégations" },
        ]}
      />
      <div className="mx-auto max-w-[1240px] p-4 sm:px-8 sm:py-6">
        {tab === "delegations" ? <Delegations /> : <Box box={tab} />}
      </div>
      {creating && <NewDoc onClose={() => setCreating(false)} />}
    </div>
  );
}

function Box({ box }: { box: "to_sign" | "mine" | "all" }) {
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["signature", box],
    queryFn: () => api.get<Row[]>(`/api/signature?box=${box}`),
  });
  if (isLoading) return <LoadingRows />;
  return (
    <Section>
      {data?.length ? (
        <Table head={["Référence", "Document", "Auteur", "Échéance", "Étape en cours", "Statut"]}>
          {data.map((d) => (
            <Tr key={d.id} onClick={() => setOpen(d.id)}>
              <Td className="font-mono text-[12px]">{d.reference}</Td>
              <Td className="font-medium">
                {d.title}
                <span className="ml-2 text-[12px] font-normal text-muted">{d.kind}</span>
              </Td>
              <Td>{d.author_name ?? "—"}</Td>
              <Td
                className={
                  d.status === "in_circuit" && isLate(d.due_on) ? "font-medium text-danger tabular" : "tabular"
                }
              >
                {frDate(d.due_on)}
              </Td>
              <Td>
                {d.pending_action ? `${ACTION[d.pending_action as keyof typeof ACTION]} · ${d.pending_actor}` : "—"}
              </Td>
              <Td>
                <Status {...STATE[d.status]} />
              </Td>
            </Tr>
          ))}
        </Table>
      ) : (
        <Empty icon={<Inbox className="size-6" />} title={box === "to_sign" ? "Rien à traiter" : "Aucun document"}>
          {box === "to_sign"
            ? "Les documents qui attendent votre visa ou votre signature apparaîtront ici."
            : "Créez un document et définissez son circuit."}
        </Empty>
      )}
      {open && <DocDialog id={open} onClose={() => setOpen(null)} />}
    </Section>
  );
}

function DocDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [stamp, setStamp] = useState(false);
  const { data: d, error } = useQuery({
    queryKey: ["signature-doc", id],
    queryFn: () => api.get<Detail>(`/api/signature/${id}`),
  });
  const refresh = (r: Detail) => {
    qc.setQueryData(["signature-doc", id], r);
    qc.invalidateQueries({ queryKey: ["signature"] });
    qc.invalidateQueries({ queryKey: ["pilotage"] });
    if (r.status === "signed") setStamp(true);
    setComment("");
  };
  const start = useMutation({
    mutationFn: () => api.post<Detail>(`/api/signature/${id}/start`),
    onSuccess: refresh,
    onError: fail,
  });
  const decide = useMutation({
    mutationFn: (decision: string) => api.post<Detail>(`/api/signature/${id}/decide`, { decision, comment }),
    onSuccess: refresh,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/api/signature/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signature"] });
      onClose();
    },
    onError: fail,
  });
  if (error) return null;
  if (!d) return null;
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={d.title}
      description={`${d.reference} · ${d.kind}`}
      width={680}
      footer={
        <>
          {d.status === "draft" && d.can.edit && (
            <Button variant="danger" onClick={() => remove.mutate()}>
              Supprimer
            </Button>
          )}
          <Button onClick={onClose}>Fermer</Button>
          {d.can.start && (
            <Button variant="primary" loading={start.isPending} onClick={() => start.mutate()}>
              Lancer le circuit
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {stamp ? <Stamp>Signé</Stamp> : <Status {...STATE[d.status]} />}
          {d.intact === true && (
            <span className="text-[12px] text-muted">Contenu intact depuis l'entrée dans le circuit</span>
          )}
          {d.intact === false && <Status label="Contenu altéré depuis le scellement" tone="danger" />}
        </div>
        {d.body && (
          <p className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-bg px-3 py-2 text-[13.5px] leading-relaxed">
            {d.body}
          </p>
        )}
        <ol className="stagger">
          {d.steps.map((s, i) => (
            <li key={s.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border",
                    s.status === "approved" && "border-success bg-success text-white",
                    s.status === "rejected" && "border-danger bg-danger text-white",
                    s.status === "pending" && "border-primary bg-brand-soft text-primary",
                    s.status === "waiting" && "border-line-strong text-faint",
                  )}
                >
                  {s.status === "approved" ? (
                    <Check className="size-3.5" />
                  ) : s.status === "rejected" ? (
                    <X className="size-3.5" />
                  ) : s.status === "pending" ? (
                    <Clock className="size-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                {i < d.steps.length - 1 && <span className="my-0.5 w-px flex-1 bg-line-strong" />}
              </div>
              <div className="min-w-0 flex-1 pb-3 text-[13.5px]">
                <p className="font-medium">
                  {ACTION[s.action]} · {s.actor_name}
                </p>
                {s.acted_at && (
                  <p className="text-[12px] text-muted">
                    {frDate(s.acted_at.slice(0, 10))}
                    {s.acted_by !== s.actor_id && ` · par délégation : ${s.acted_by_name}`}
                  </p>
                )}
                {s.comment && <p className="mt-0.5 text-[13px] text-muted">{s.comment}</p>}
              </div>
            </li>
          ))}
        </ol>
        {d.can.decide && (
          <div className="space-y-2 border-t border-line pt-3">
            <Field label="Observation" hint="Obligatoire en cas de rejet.">
              {(a) => <Textarea {...a} value={comment} onChange={(e) => setComment(e.target.value)} />}
            </Field>
            <div className="flex gap-2">
              <Button variant="primary" loading={decide.isPending} onClick={() => decide.mutate("approve")}>
                Approuver
              </Button>
              <Button variant="danger" disabled={!comment.trim()} onClick={() => decide.mutate("reject")}>
                Rejeter
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function NewDoc({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const [f, setF] = useState({
    title: "",
    kind: "Note",
    body: "",
    due_on: "",
    unit_id: "",
    domain_id: "",
    confidential: false,
  });
  const [steps, setSteps] = useState<{ actor_id: string; action: "avis" | "visa" | "signature" }[]>([
    { actor_id: "", action: "signature" },
  ]);
  const others = users?.filter((u) => u.id !== me?.id);
  const create = useMutation({
    mutationFn: () =>
      api.post("/api/signature", {
        ...f,
        due_on: f.due_on || null,
        unit_id: f.unit_id || null,
        domain_id: f.domain_id || null,
        steps,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signature"] });
      onClose();
    },
    onError: fail,
  });
  const valid = f.title.trim() && steps.every((s) => s.actor_id) && steps.at(-1)?.action === "signature";
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Nouveau document"
      width={640}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!valid} loading={create.isPending} onClick={() => create.mutate()}>
            Enregistrer le brouillon
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <Field label="Objet" required>
            {(a) => <Input {...a} autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}
          </Field>
          <Field label="Nature">
            {(a) => (
              <Select {...a} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                {["Note", "Lettre", "Rapport", "Décision", "Contrat"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Contenu">
          {(a) => <Textarea {...a} rows={6} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Domaine d'activité" className="sm:col-span-2">
            {(a) => <DomainSelect {...a} value={f.domain_id} onChange={(v) => setF({ ...f, domain_id: v })} />}
          </Field>
          <Field label="Échéance">
            {(a) => (
              <Input {...a} type="date" value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} />
            )}
          </Field>
          <Field label="Entité émettrice">
            {(a) => (
              <Select {...a} value={f.unit_id} onChange={(e) => setF({ ...f, unit_id: e.target.value })}>
                <option value="">—</option>
                {units?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold">Circuit</p>
            <Button
              size="sm"
              variant="ghost"
              icon={<Plus className="size-3.5" />}
              onClick={() => setSteps([{ actor_id: "", action: "visa" }, ...steps])}
            >
              Ajouter une étape avant
            </Button>
          </div>
          <div className="space-y-1">
            {steps.map((s, i) => (
              <div key={i}>
                <div className="grid grid-cols-[1fr_130px_32px] items-center gap-2">
                  <PeopleSelect
                    aria-label="Intervenant"
                    people={others}
                    value={s.actor_id}
                    onChange={(v) => setSteps(steps.map((x, n) => (n === i ? { ...x, actor_id: v } : x)))}
                  />
                  <Select
                    aria-label="Action"
                    value={s.action}
                    disabled={i === steps.length - 1}
                    onChange={(e) =>
                      setSteps(steps.map((x, n) => (n === i ? { ...x, action: e.target.value as "avis" | "visa" } : x)))
                    }
                  >
                    <option value="avis">Avis</option>
                    <option value="visa">Visa</option>
                    {i === steps.length - 1 && <option value="signature">Signature</option>}
                  </Select>
                  {steps.length > 1 && i < steps.length - 1 ? (
                    <IconButton label="Retirer" onClick={() => setSteps(steps.filter((_, n) => n !== i))}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  ) : (
                    <span />
                  )}
                </div>
                {i < steps.length - 1 && <ArrowDown className="mx-auto my-0.5 size-3 text-faint" />}
              </div>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={f.confidential}
            onChange={(e) => setF({ ...f, confidential: e.target.checked })}
          />
          Confidentiel : visible des seuls intervenants
        </label>
      </div>
    </Dialog>
  );
}

function Delegations() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: users } = useUsers();
  const { data } = useQuery({
    queryKey: ["delegations"],
    queryFn: () =>
      api.get<
        { id: string; from_user: string; from_name: string; to_name: string; start_on: string; end_on: string }[]
      >("/api/delegations"),
  });
  const [f, setF] = useState({ to_user: "", start_on: "", end_on: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["delegations"] });
  const add = useMutation({
    mutationFn: () => api.post("/api/delegations", f),
    onSuccess: () => {
      setF({ to_user: "", start_on: "", end_on: "" });
      refresh();
    },
    onError: fail,
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/api/delegations/${id}`),
    onSuccess: refresh,
    onError: fail,
  });
  return (
    <div className="space-y-4">
      <Section title="Déléguer ma signature en cas d'absence">
        <div className="grid items-end gap-3 p-4 sm:grid-cols-[1fr_170px_170px_auto]">
          <Field label="Délégataire">
            {(a) => (
              <PeopleSelect
                {...a}
                people={users?.filter((u) => u.id !== me?.id)}
                value={f.to_user}
                onChange={(v) => setF({ ...f, to_user: v })}
              />
            )}
          </Field>
          <Field label="Du">
            {(a) => (
              <Input {...a} type="date" value={f.start_on} onChange={(e) => setF({ ...f, start_on: e.target.value })} />
            )}
          </Field>
          <Field label="Au">
            {(a) => (
              <Input {...a} type="date" value={f.end_on} onChange={(e) => setF({ ...f, end_on: e.target.value })} />
            )}
          </Field>
          <Button
            variant="primary"
            disabled={!f.to_user || !f.start_on || !f.end_on}
            loading={add.isPending}
            onClick={() => add.mutate()}
          >
            Déléguer
          </Button>
        </div>
      </Section>
      <Section>
        {data?.length ? (
          <Table head={["De", "À", "Du", "Au", ""]}>
            {data.map((d) => (
              <Tr key={d.id}>
                <Td>{d.from_name}</Td>
                <Td>{d.to_name}</Td>
                <Td className="tabular">{frDate(d.start_on)}</Td>
                <Td className="tabular">{frDate(d.end_on)}</Td>
                <Td className="text-right">
                  {d.from_user === me?.id && (
                    <Button size="sm" variant="ghost" onClick={() => del.mutate(d.id)}>
                      Retirer
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        ) : (
          <Empty title="Aucune délégation">Une délégation vaut seulement pour la période indiquée.</Empty>
        )}
      </Section>
    </div>
  );
}

// ------------------------------------------------------------------ courrier
interface MailRow {
  id: string;
  reference: string;
  direction: "entrant" | "sortant";
  subject: string;
  correspondent: string;
  received_on: string;
  due_on: string | null;
  status: "enregistre" | "impute" | "traite";
  unit_name: string | null;
  assignee_name: string | null;
}
const MAIL: Record<MailRow["status"], { label: string; tone: Tone }> = {
  enregistre: { label: "Enregistré", tone: "neutral" },
  impute: { label: "Imputé", tone: "info" },
  traite: { label: "Traité", tone: "success" },
};
export function CourrierPage() {
  const can = useCan();
  const [tab, setTab] = useState<"entrant" | "sortant">("entrant");
  const [creating, setCreating] = useState(false);
  const [assign, setAssign] = useState<MailRow | null>(null);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["correspondence", tab],
    queryFn: () => api.get<MailRow[]>(`/api/correspondence?direction=${tab}`),
  });
  const close = useMutation({
    mutationFn: (id: string) => api.post(`/api/correspondence/${id}/close`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["correspondence"] }),
    onError: fail,
  });
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={Mail}
        crumbs={["Secrétariat", "Courrier"]}
        title="Courrier"
        subtitle="Chaque courrier reçoit un numéro, une imputation et un délai. Un retard remonte automatiquement à l'entité."
        actions={
          can("correspondence.manage") && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Enregistrer un courrier
            </Button>
          )
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "entrant", label: "Courrier entrant" },
          { id: "sortant", label: "Courrier sortant" },
        ]}
      />
      <div className="mx-auto max-w-[1240px] p-4 sm:px-8 sm:py-6">
        <Section>
          {isLoading ? (
            <LoadingRows />
          ) : data?.length ? (
            <Table
              head={[
                "N°",
                "Objet",
                tab === "entrant" ? "Expéditeur" : "Destinataire",
                "Date",
                "Imputation",
                "Délai",
                "Statut",
                "",
              ]}
            >
              {data.map((m) => (
                <Tr key={m.id}>
                  <Td className="whitespace-nowrap font-mono text-[12px]">{m.reference}</Td>
                  <Td className="font-medium">{m.subject}</Td>
                  <Td>{m.correspondent}</Td>
                  <Td className="tabular">{frDate(m.received_on)}</Td>
                  <Td>{m.assignee_name ?? m.unit_name ?? "—"}</Td>
                  <Td
                    className={
                      m.status !== "traite" && isLate(m.due_on) ? "font-medium text-danger tabular" : "tabular"
                    }
                  >
                    {frDate(m.due_on)}
                  </Td>
                  <Td>
                    <Status {...MAIL[m.status]} />
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    {m.status !== "traite" && can("correspondence.manage") && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setAssign(m)}>
                          Imputer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => close.mutate(m.id)}>
                          Clôturer
                        </Button>
                      </>
                    )}
                  </Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <Empty icon={<Mail className="size-6" />} title="Registre vide">
              Enregistrez le premier courrier.
            </Empty>
          )}
        </Section>
      </div>
      {creating && <NewMail direction={tab} onClose={() => setCreating(false)} />}
      {assign && <Assign m={assign} onClose={() => setAssign(null)} />}
    </div>
  );
}
function NewMail({ direction, onClose }: { direction: "entrant" | "sortant"; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    direction,
    subject: "",
    correspondent: "",
    received_on: new Date().toISOString().slice(0, 10),
    due_on: "",
    confidential: false,
  });
  const save = useMutation({
    mutationFn: () => api.post("/api/correspondence", { ...f, due_on: f.due_on || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["correspondence"] });
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Enregistrer un courrier"
      width={520}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!f.subject.trim() || !f.correspondent.trim()}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Objet" required className="sm:col-span-2">
          {(a) => (
            <Input {...a} autoFocus value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
          )}
        </Field>
        <Field label={direction === "entrant" ? "Expéditeur" : "Destinataire"} required className="sm:col-span-2">
          {(a) => (
            <Input {...a} value={f.correspondent} onChange={(e) => setF({ ...f, correspondent: e.target.value })} />
          )}
        </Field>
        <Field label="Date" required>
          {(a) => (
            <Input
              {...a}
              type="date"
              value={f.received_on}
              onChange={(e) => setF({ ...f, received_on: e.target.value })}
            />
          )}
        </Field>
        <Field label="Délai de réponse">
          {(a) => (
            <Input {...a} type="date" value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} />
          )}
        </Field>
        <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
          <input
            type="checkbox"
            checked={f.confidential}
            onChange={(e) => setF({ ...f, confidential: e.target.checked })}
          />
          Confidentiel
        </label>
      </div>
    </Dialog>
  );
}
function Assign({ m, onClose }: { m: MailRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: units } = useUnits();
  const { data: users } = useUsers();
  const [f, setF] = useState({ unit_id: "", assignee_id: "", due_on: m.due_on ?? "" });
  const save = useMutation({
    mutationFn: () =>
      api.post(`/api/correspondence/${m.id}/assign`, {
        unit_id: f.unit_id || null,
        assignee_id: f.assignee_id || null,
        due_on: f.due_on || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["correspondence"] });
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Imputer le courrier"
      description={m.subject}
      width={480}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!f.unit_id && !f.assignee_id}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Imputer
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Entité">
          {(a) => (
            <Select {...a} value={f.unit_id} onChange={(e) => setF({ ...f, unit_id: e.target.value })}>
              <option value="">—</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Agent chargé du traitement">
          {(a) => (
            <PeopleSelect
              {...a}
              people={users}
              value={f.assignee_id}
              onChange={(v) => setF({ ...f, assignee_id: v })}
            />
          )}
        </Field>
        <Field label="Délai de réponse">
          {(a) => (
            <Input {...a} type="date" value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} />
          )}
        </Field>
      </div>
    </Dialog>
  );
}
