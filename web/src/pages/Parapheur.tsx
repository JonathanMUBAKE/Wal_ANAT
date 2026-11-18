import { useOpenFromUrl } from "@/components/quick-entry";
import { ExportMenu, tableDoc } from "@/components/export-menu";
import { todayIso } from "@/lib/format";
import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  Check,
  CheckCircle2,
  Clock,
  FileSignature,
  Inbox,
  Mail,
  Plus,
  Trash2,
  UserRoundPlus,
  X,
} from "lucide-react";
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
import {
  PartnerSelect,
  usePartnerContacts,
  usePartnerOptions,
} from "@/components/partners";
import { RoundBtn } from "@/components/collection";
import { Drawer } from "@/components/drawer";
import { DossierDocuments } from "@/components/documents";
import { Fact, Facts, RowActions } from "@/components/record";
import {
  useCan,
  useMe,
  useMyUnits,
  useProjects,
  useUnits,
  useUsers,
} from "@/lib/hooks";

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
  /** Circuits précédents, clos par un rejet (thème 3, PH-5). */
  history?: { round: number; steps: Omit<Step, "id">[] }[];
  /** Fichier à signer (thème 6, PH-1), scellé par son empreinte. */
  file?: { name: string; mime: string; size: number; hash: string } | null;
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
  const [tab, setTab] = useState<
    "to_sign" | "mine" | "all" | "dg" | "delegations"
  >("to_sign");
  const [creating, setCreating] = useState(false);
  const can = useCan();
  // Le cabinet suit la pile de la DG, en lecture (PH-4) ; la DG la voit déjà dans « À traiter »
  const cabinet = can("pilotage.view") && !can("signature.institution");
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
          <Button
            variant="primary"
            icon={<Plus className="size-4" />}
            onClick={() => setCreating(true)}
          >
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
          ...(cabinet
            ? [{ id: "dg" as const, label: "Parapheur de la DG" }]
            : []),
          { id: "delegations", label: "Délégations" },
        ]}
      />
      <div className="mx-auto max-w-[1480px] p-4 sm:px-8 sm:py-6">
        {tab === "delegations" ? <Delegations /> : <Box box={tab} />}
      </div>
      {creating && <NewDoc onClose={() => setCreating(false)} />}
    </div>
  );
}

function Box({ box }: { box: "to_sign" | "mine" | "all" | "dg" }) {
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["signature", box],
    queryFn: () => api.get<Row[]>(`/api/signature?box=${box}`),
  });
  if (isLoading) return <LoadingRows />;
  return (
    <Section>
      {data?.length ? (
        <Table
          head={[
            "Référence",
            "Document",
            "Auteur",
            "Échéance",
            "Étape en cours",
            "Statut",
          ]}
        >
          {data.map((d) => (
            <Tr
              key={d.id}
              onClick={box === "dg" ? undefined : () => setOpen(d.id)}
            >
              <Td className="font-mono text-[12px]">{d.reference}</Td>
              <Td className="font-medium">
                {d.title}
                <span className="ml-2 text-[12px] font-normal text-muted">
                  {d.kind}
                </span>
              </Td>
              <Td>{d.author_name ?? "—"}</Td>
              <Td
                className={
                  d.status === "in_circuit" && isLate(d.due_on)
                    ? "font-medium text-danger tabular"
                    : "tabular"
                }
              >
                {frDate(d.due_on)}
              </Td>
              <Td>
                {d.pending_action
                  ? `${ACTION[d.pending_action as keyof typeof ACTION]} · ${d.pending_actor}`
                  : "—"}
              </Td>
              <Td>
                <Status {...STATE[d.status]} />
              </Td>
            </Tr>
          ))}
        </Table>
      ) : (
        <Empty
          icon={<Inbox className="size-6" />}
          title={
            box === "to_sign" || box === "dg"
              ? "Rien à traiter"
              : "Aucun document"
          }
        >
          {box === "dg"
            ? "Aucun document n'attend la signature de la DG."
            : box === "to_sign"
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
    mutationFn: (decision: string) =>
      api.post<Detail>(`/api/signature/${id}/decide`, { decision, comment }),
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
    <Drawer
      open
      onClose={onClose}
      title={d.title}
      subtitle={`${d.reference} · ${d.kind}`}
      footer={
        <>
          {d.status === "draft" && d.can.edit && (
            <Button variant="danger" onClick={() => remove.mutate()}>
              Supprimer
            </Button>
          )}
          <Button onClick={onClose}>Fermer</Button>
          {d.can.start && (
            <Button
              variant="primary"
              loading={start.isPending}
              onClick={() => start.mutate()}
            >
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
            <span className="text-[12px] text-muted">
              Contenu intact depuis l'entrée dans le circuit
            </span>
          )}
          {d.intact === false && (
            <Status label="Contenu altéré depuis le scellement" tone="danger" />
          )}
        </div>
        {d.body && (
          <p className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-bg px-3 py-2 text-[13.5px] leading-relaxed">
            {d.body}
          </p>
        )}
        {/* Le document réel à signer, scellé à l'entrée dans le circuit (PH-1) */}
        <div className="rounded-lg border border-line px-3 py-2.5 text-[13px]">
          {d.file ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{d.file.name}</span>
              <span className="text-muted">
                {Math.max(1, Math.round(d.file.size / 1024))} Ko
              </span>
              <a
                className="text-primary hover:underline"
                href={`/api/signature/${d.id}/file?inline=1`}
                target="_blank"
                rel="noreferrer"
              >
                Ouvrir
              </a>
              <a
                className="text-primary hover:underline"
                href={`/api/signature/${d.id}/file`}
              >
                Télécharger
              </a>
              <span
                className="w-full truncate font-mono text-[11px] text-faint"
                title="Empreinte SHA-256 du fichier"
              >
                Empreinte : {d.file.hash}
              </span>
            </div>
          ) : (
            <p className="text-muted">
              Aucun fichier joint : la signature porte sur le texte saisi.
            </p>
          )}
          {d.can.edit || d.can.start ? (
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-primary hover:underline">
              <input
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    api
                      .upload<Detail>(
                        `/api/signature/${d.id}/file?name=${encodeURIComponent(file.name)}`,
                        file,
                      )
                      .then((r) => {
                        qc.setQueryData(["signature-doc", id], r);
                        toast.success(
                          "Fichier joint : il sera scellé au lancement du circuit",
                        );
                      }, fail);
                }}
              />
              {d.file
                ? "Remplacer le fichier"
                : "Joindre le fichier à signer (PDF, Word…)"}
            </label>
          ) : null}
          {d.status === "signed" && (
            <p className="mt-2 flex flex-wrap gap-3 text-[12.5px]">
              Bordereau des visas et signatures :
              <a
                className="text-primary hover:underline"
                href={`/api/signature/${d.id}/bordereau?format=pdf`}
              >
                PDF
              </a>
              <a
                className="text-primary hover:underline"
                href={`/api/signature/${d.id}/bordereau?format=docx`}
              >
                Word
              </a>
            </p>
          )}
        </div>
        <ol className="stagger">
          {d.steps.map((s, i) => (
            <li key={s.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border",
                    s.status === "approved" &&
                      "border-success bg-success text-white",
                    s.status === "rejected" &&
                      "border-danger bg-danger text-white",
                    s.status === "pending" &&
                      "border-primary bg-brand-soft text-primary",
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
                {i < d.steps.length - 1 && (
                  <span className="my-0.5 w-px flex-1 bg-line-strong" />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-3 text-[13.5px]">
                <p className="font-medium">
                  {ACTION[s.action]} · {s.actor_name}
                </p>
                {s.acted_at && (
                  <p className="text-[12px] text-muted">
                    {frDate(s.acted_at.slice(0, 10))}
                    {s.acted_by !== s.actor_id &&
                      ` · par délégation : ${s.acted_by_name}`}
                  </p>
                )}
                {s.comment && (
                  <p className="mt-0.5 text-[13px] text-muted">{s.comment}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
        {!!d.history?.length && (
          <details className="rounded-lg border border-line px-3 py-2 text-[13px]">
            <summary className="cursor-pointer font-medium text-muted">
              Circuits précédents ({d.history.length}) : rejetés puis relancés
            </summary>
            {d.history.map((h) => (
              <div key={h.round} className="mt-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">
                  Circuit {h.round}
                </p>
                <ul className="mt-1 space-y-1">
                  {h.steps.map((s) => (
                    <li key={s.position}>
                      <span className="font-medium">
                        {ACTION[s.action]} · {s.actor_name}
                      </span>
                      <span
                        className={
                          s.status === "rejected" ? "text-danger" : "text-muted"
                        }
                      >
                        {" "}
                        ·{" "}
                        {s.status === "approved"
                          ? "accordé"
                          : s.status === "rejected"
                            ? "rejeté"
                            : s.status === "pending"
                              ? "en attente au moment du rejet"
                              : "non atteint"}
                        {s.acted_at && ` le ${frDate(s.acted_at.slice(0, 10))}`}
                        {s.acted_by &&
                          s.acted_by !== s.actor_id &&
                          ` par délégation : ${s.acted_by_name}`}
                      </span>
                      {s.comment && (
                        <span className="block text-muted">
                          « {s.comment} »
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        )}
        {d.can.decide && (
          <div className="space-y-2 border-t border-line pt-3">
            <Field label="Observation" hint="Obligatoire en cas de rejet.">
              {(a) => (
                <Textarea
                  {...a}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              )}
            </Field>
            <div className="flex gap-2">
              <Button
                variant="primary"
                loading={decide.isPending}
                onClick={() => decide.mutate("approve")}
              >
                Approuver
              </Button>
              <Button
                variant="danger"
                disabled={!comment.trim()}
                onClick={() => decide.mutate("reject")}
              >
                Rejeter
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
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
  const [steps, setSteps] = useState<
    { actor_id: string; action: "avis" | "visa" | "signature" }[]
  >([{ actor_id: "", action: "signature" }]);
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
  const valid =
    f.title.trim() &&
    steps.every((s) => s.actor_id) &&
    steps.at(-1)?.action === "signature";
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Nouveau document"
      width={640}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!valid}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Enregistrer le brouillon
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <Field label="Objet" required>
            {(a) => (
              <Input
                {...a}
                autoFocus
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
              />
            )}
          </Field>
          <Field label="Nature">
            {(a) => (
              <Select
                {...a}
                value={f.kind}
                onChange={(e) => setF({ ...f, kind: e.target.value })}
              >
                {[
                  "Note",
                  "Lettre",
                  "Rapport",
                  "Décision",
                  "Contrat",
                  "Convention",
                  "Avenant",
                  "Protocole d'accord",
                ].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {/(convention|accord|avenant|contrat|protocole|m[ée]morandum|arr[êe]t[ée]|engagement)/i.test(
          f.kind,
        ) && (
          <p className="rounded-lg border border-line bg-warning-soft/40 px-3 py-2 text-[12.5px]">
            Ce document engage l'Agence : la signature finale revient à la DG,
            ou à la personne qui a reçu sa délégation de signature.
          </p>
        )}
        <Field label="Contenu">
          {(a) => (
            <Textarea
              {...a}
              rows={6}
              value={f.body}
              onChange={(e) => setF({ ...f, body: e.target.value })}
            />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Domaine d'activité" className="sm:col-span-2">
            {(a) => (
              <DomainSelect
                {...a}
                value={f.domain_id}
                onChange={(v) => setF({ ...f, domain_id: v })}
              />
            )}
          </Field>
          <Field label="Échéance">
            {(a) => (
              <Input
                {...a}
                type="date"
                value={f.due_on}
                onChange={(e) => setF({ ...f, due_on: e.target.value })}
              />
            )}
          </Field>
          <Field label="Entité émettrice">
            {(a) => (
              <Select
                {...a}
                value={f.unit_id}
                onChange={(e) => setF({ ...f, unit_id: e.target.value })}
              >
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
              onClick={() =>
                setSteps([{ actor_id: "", action: "visa" }, ...steps])
              }
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
                    // L'auteur peut signer en dernier, après le visa ou l'avis d'une autre personne
                    people={i === steps.length - 1 ? users : others}
                    value={s.actor_id}
                    onChange={(v) =>
                      setSteps(
                        steps.map((x, n) =>
                          n === i ? { ...x, actor_id: v } : x,
                        ),
                      )
                    }
                  />
                  <Select
                    aria-label="Action"
                    value={s.action}
                    disabled={i === steps.length - 1}
                    onChange={(e) =>
                      setSteps(
                        steps.map((x, n) =>
                          n === i
                            ? {
                                ...x,
                                action: e.target.value as "avis" | "visa",
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    <option value="avis">Avis</option>
                    <option value="visa">Visa</option>
                    {i === steps.length - 1 && (
                      <option value="signature">Signature</option>
                    )}
                  </Select>
                  {steps.length > 1 && i < steps.length - 1 ? (
                    <IconButton
                      label="Retirer"
                      onClick={() => setSteps(steps.filter((_, n) => n !== i))}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  ) : (
                    <span />
                  )}
                </div>
                {i < steps.length - 1 && (
                  <ArrowDown className="mx-auto my-0.5 size-3 text-faint" />
                )}
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
        {
          id: string;
          from_user: string;
          from_name: string;
          to_name: string;
          start_on: string;
          end_on: string;
          scope: "visa" | "signature";
          revoked_at: string | null;
        }[]
      >("/api/delegations"),
  });
  const [f, setF] = useState({
    to_user: "",
    start_on: "",
    end_on: "",
    scope: "signature",
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["delegations"] });
  const add = useMutation({
    mutationFn: () => api.post("/api/delegations", f),
    onSuccess: () => {
      setF({ to_user: "", start_on: "", end_on: "", scope: "signature" });
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
      <Section title="Déléguer mon parapheur en cas d'absence (30 jours au plus)">
        <div className="grid items-end gap-3 p-4 sm:grid-cols-[1fr_150px_150px_170px_auto]">
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
              <Input
                {...a}
                type="date"
                value={f.start_on}
                onChange={(e) => setF({ ...f, start_on: e.target.value })}
              />
            )}
          </Field>
          <Field label="Au">
            {(a) => (
              <Input
                {...a}
                type="date"
                value={f.end_on}
                onChange={(e) => setF({ ...f, end_on: e.target.value })}
              />
            )}
          </Field>
          <Field label="Portée">
            {(a) => (
              <Select
                {...a}
                value={f.scope}
                onChange={(e) => setF({ ...f, scope: e.target.value })}
              >
                <option value="signature">Visa et signature</option>
                <option value="visa">Visa et avis seulement</option>
              </Select>
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
          <Table head={["De", "À", "Du", "Au", "Portée", ""]}>
            {data.map((d) => (
              <Tr key={d.id}>
                <Td>{d.from_name}</Td>
                <Td>{d.to_name}</Td>
                <Td className="tabular">{frDate(d.start_on)}</Td>
                <Td className="tabular">{frDate(d.end_on)}</Td>
                <Td>
                  {d.scope === "visa" ? "Visa et avis" : "Visa et signature"}
                </Td>
                <Td className="text-right">
                  {d.revoked_at && (
                    <span className="text-[12px] text-faint">
                      Retirée le {frDate(d.revoked_at.slice(0, 10))}
                    </span>
                  )}
                  {d.from_user === me?.id && !d.revoked_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => del.mutate(d.id)}
                    >
                      Retirer
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        ) : (
          <Empty title="Aucune délégation">
            Une délégation vaut seulement pour la période indiquée.
          </Empty>
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
  status: "enregistre" | "impute" | "en_traitement" | "traite" | "classe";
  unit_id: string | null;
  filed_reason?: string;
  unit_name: string | null;
  assignee_name: string | null;
  instruction: string;
  reply_to_reference: string | null;
  response_reference: string | null;
  project_id: string | null;
  project_name: string | null;
  activity_id: string | null;
  activity_title: string | null;
  partner_id: string | null;
  partner_name: string | null;
  contact_name: string | null;
  doc_date: string | null;
  confidential: boolean;
  assignee_id: string | null;
}
/** Instructions d'imputation usuelles du bureau d'ordre. */
const INSTRUCTIONS = ["Pour traitement", "Pour avis", "Pour information"];
const MAIL: Record<MailRow["status"], { label: string; tone: Tone }> = {
  enregistre: { label: "Enregistré", tone: "neutral" },
  impute: { label: "Imputé", tone: "info" },
  en_traitement: { label: "En traitement", tone: "warning" },
  traite: { label: "Traité", tone: "success" },
  classe: { label: "Classé sans suite", tone: "neutral" },
};
const closedMail = (m: Pick<MailRow, "status">) =>
  m.status === "traite" || m.status === "classe";
interface MailSummary {
  to_assign: number;
  in_progress: number;
  late: number;
  done_month: number;
  mine: { open: number; late: number };
}
export function CourrierPage() {
  const can = useCan();
  const { data: me } = useMe();
  const { data: myUnits } = useMyUnits();
  const heads = new Set(
    (myUnits ?? []).filter((u) => u.role === "responsable").map((u) => u.id),
  );
  const registry = can("correspondence.view") || can("correspondence.manage");
  const [tab, setTab] = useState<"mine" | "entrant" | "sortant">(
    registry ? "entrant" : "mine",
  );
  const { data: summary } = useQuery({
    queryKey: ["correspondence", "summary"],
    queryFn: () => api.get<MailSummary>("/api/correspondence/summary"),
  });
  const [creating, setCreating] = useState(false);
  useOpenFromUrl(() => setCreating(true));
  const [assign, setAssign] = useState<MailRow | null>(null);
  const [open, setOpen] = useState<MailRow | null>(null);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["correspondence", tab],
    queryFn: () =>
      api
        .get<MailRow[]>(
          tab === "mine"
            ? "/api/correspondence"
            : `/api/correspondence?direction=${tab}`,
        )
        .then((rows) =>
          // « Mon courrier » : ce qui m'est imputé, en copie, ou imputé à une entité que je dirige
          tab === "mine" && registry
            ? rows.filter(
                (m) =>
                  m.assignee_id === me?.id ||
                  (m.unit_id && heads.has(m.unit_id)),
              )
            : rows,
        ),
  });
  const canAssign = (m: MailRow) =>
    can("correspondence.manage") || (!!m.unit_id && heads.has(m.unit_id));
  const canClose = (m: MailRow) => canAssign(m) || m.assignee_id === me?.id;
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
        subtitle="Le circuit du courrier : enregistrement, annotation et imputation par la direction, imputation par le chef d'entité, prise en charge, traitement ou classement motivé. Chaque étape est tracée ; un retard remonte à l'entité."
        actions={
          <>
            <ExportMenu
              disabled={!data?.length}
              build={() =>
                tableDoc(
                  tab === "mine"
                    ? "Mon courrier"
                    : tab === "entrant"
                      ? "Registre du courrier entrant"
                      : "Registre du courrier sortant",
                  [
                    "Numéro",
                    "Objet",
                    "Correspondant",
                    "Reçu le",
                    "Imputé à",
                    "Délai",
                    "État",
                  ],
                  (data ?? []).map((m) => [
                    m.reference,
                    m.subject,
                    m.partner_name ?? m.correspondent,
                    frDate(m.received_on),
                    [m.unit_name, m.assignee_name].filter(Boolean).join(" · "),
                    frDate(m.due_on),
                    MAIL[m.status].label,
                  ]),
                  {
                    filename: `courrier-${tab}`,
                    widths: [2, 5, 3, 1.5, 3, 1.5, 1.8],
                  },
                )
              }
            />
            {can("correspondence.manage") && (
              <Button
                variant="primary"
                icon={<Plus className="size-4" />}
                onClick={() => setCreating(true)}
              >
                Enregistrer un courrier
              </Button>
            )}
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          {
            id: "mine" as const,
            label: "Mon courrier",
            badge: summary?.mine.open,
          },
          ...(registry
            ? [
                { id: "entrant" as const, label: "Courrier entrant" },
                { id: "sortant" as const, label: "Courrier sortant" },
              ]
            : []),
        ]}
      />
      <div className="mx-auto max-w-[1480px] space-y-4 p-4 sm:px-8 sm:py-6">
        {summary && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {(
              [
                ["À imputer", summary.to_assign, false],
                ["En cours", summary.in_progress, false],
                ["En retard", summary.late, summary.late > 0],
                ["Traités ce mois", summary.done_month, false],
                [
                  "À moi · en retard",
                  `${summary.mine.open} · ${summary.mine.late}`,
                  summary.mine.late > 0,
                ],
              ] as const
            ).map(([label, v, alert]) => (
              <div
                key={label}
                className="rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm"
              >
                <p className="text-[12.5px] text-muted">{label}</p>
                <p
                  className={cn(
                    "mt-0.5 text-[24px] font-semibold tabular-nums",
                    alert && "text-danger",
                  )}
                >
                  {v}
                </p>
              </div>
            ))}
          </div>
        )}
        <Section>
          {isLoading ? (
            <LoadingRows />
          ) : data?.length ? (
            <Table
              head={[
                "N°",
                "Objet",
                tab === "sortant" ? "Destinataire" : "Correspondant",
                "Date",
                "Imputation",
                "Délai",
                "Statut",
                "",
              ]}
            >
              {data.map((m) => (
                <Tr key={m.id} onClick={() => setOpen(m)}>
                  <Td className="whitespace-nowrap font-mono text-[12px]">
                    {m.reference}
                  </Td>
                  <Td className="font-medium">
                    {m.subject}
                    {(m.reply_to_reference ||
                      m.response_reference ||
                      m.project_name ||
                      m.activity_title) && (
                      <span className="mt-0.5 block space-x-2 text-[12px] font-normal text-muted">
                        {m.reply_to_reference && (
                          <span>Répond à {m.reply_to_reference}</span>
                        )}
                        {m.response_reference && (
                          <span>Réponse : {m.response_reference}</span>
                        )}
                        {(m.project_name || m.activity_title) && (
                          <span>
                            Dossier : {m.project_name ?? m.activity_title}
                          </span>
                        )}
                      </span>
                    )}
                  </Td>
                  <Td>{m.correspondent}</Td>
                  <Td className="tabular">{frDate(m.received_on)}</Td>
                  <Td>
                    {m.assignee_name ?? m.unit_name ?? "—"}
                    {m.instruction && (
                      <span className="block text-[12px] text-muted">
                        {m.instruction}
                      </span>
                    )}
                  </Td>
                  <Td
                    className={
                      !closedMail(m) && isLate(m.due_on)
                        ? "font-medium text-danger tabular"
                        : "tabular"
                    }
                  >
                    {frDate(m.due_on)}
                  </Td>
                  <Td>
                    <Status {...MAIL[m.status]} />
                  </Td>
                  <Td>
                    <RowActions label={m.reference} onView={() => setOpen(m)}>
                      {!closedMail(m) && canAssign(m) && (
                        <RoundBtn
                          label={`Imputer ${m.reference}`}
                          onClick={() => setAssign(m)}
                        >
                          <UserRoundPlus className="size-4" />
                        </RoundBtn>
                      )}
                      {!closedMail(m) && canClose(m) && (
                        <RoundBtn
                          label={`Clôturer ${m.reference}`}
                          onClick={() => close.mutate(m.id)}
                        >
                          <CheckCircle2 className="size-4" />
                        </RoundBtn>
                      )}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <Empty
              icon={<Mail className="size-6" />}
              title={
                tab === "mine" ? "Aucun courrier pour vous" : "Registre vide"
              }
            >
              {tab === "mine"
                ? "Le courrier qui vous est imputé, ou en copie, apparaît ici."
                : "Enregistrez le premier courrier."}
            </Empty>
          )}
        </Section>
      </div>
      {creating && (
        <NewMail
          direction={tab === "sortant" ? "sortant" : "entrant"}
          onClose={() => setCreating(false)}
        />
      )}
      {assign && <Assign m={assign} onClose={() => setAssign(null)} />}
      {open && (
        <MailDialog
          m={open}
          canManage={can("correspondence.manage")}
          canAssign={canAssign(open)}
          canClose={canClose(open)}
          meId={me?.id}
          onAssign={() => {
            setAssign(open);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
function NewMail({
  direction,
  onClose,
}: {
  direction: "entrant" | "sortant";
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: projects } = useProjects();
  // Un courrier sortant peut répondre à un courrier entrant : l'entrant sera clos par la réponse (lot P3b)
  const { data: incoming } = useQuery({
    queryKey: ["correspondence", "entrant"],
    queryFn: () => api.get<MailRow[]>("/api/correspondence?direction=entrant"),
    enabled: direction === "sortant",
  });
  const { data: activities } = useQuery({
    queryKey: ["activities"],
    queryFn: () => api.get<{ id: string; title: string }[]>("/api/activities"),
    retry: false,
  });
  const [f, setF] = useState({
    direction,
    subject: "",
    correspondent: "",
    received_on: todayIso(),
    due_on: "",
    confidential: false,
    reply_to_id: "",
    dossier: "",
    partner_id: "",
    contact_id: "",
  });
  const contacts = usePartnerContacts(f.partner_id ? [f.partner_id] : []);
  // Un correspondant tapé à la main qui ressemble à une fiche de l'annuaire : proposer de l'y rattacher (C-4)
  const { data: partnerOptions } = usePartnerOptions();
  const norm = (x: string) =>
    x
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const typed = norm(f.correspondent);
  const lookalike =
    !f.partner_id && typed.length >= 3
      ? (partnerOptions ?? []).find((p) => {
          const n = norm(p.name);
          const acr = norm(p.acronym ?? "");
          return (
            n.includes(typed) ||
            typed.includes(n) ||
            (!!acr && (acr === typed || typed.split(" ").includes(acr)))
          );
        })
      : undefined;
  const save = useMutation({
    mutationFn: () =>
      api.post("/api/correspondence", {
        direction: f.direction,
        subject: f.subject,
        correspondent: f.correspondent.trim() || undefined,
        partner_id: f.partner_id || null,
        contact_id: f.contact_id || null,
        received_on: f.received_on,
        due_on: f.due_on || null,
        confidential: f.confidential,
        reply_to_id: f.reply_to_id || null,
        project_id: f.dossier.startsWith("prj:") ? f.dossier.slice(4) : null,
        activity_id: f.dossier.startsWith("act:") ? f.dossier.slice(4) : null,
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
      title="Enregistrer un courrier"
      width={520}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={
              !f.subject.trim() ||
              (!f.correspondent.trim() && !f.partner_id && !f.reply_to_id)
            }
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
            <Input
              {...a}
              autoFocus
              value={f.subject}
              onChange={(e) => setF({ ...f, subject: e.target.value })}
            />
          )}
        </Field>
        <Field
          label={
            direction === "entrant"
              ? "Expéditeur (annuaire)"
              : "Destinataire (annuaire)"
          }
        >
          {(a) => (
            <PartnerSelect
              {...a}
              value={f.partner_id}
              onChange={(id, p) =>
                setF({
                  ...f,
                  partner_id: id,
                  contact_id: "",
                  correspondent: p ? p.name : f.correspondent,
                })
              }
            />
          )}
        </Field>
        <Field label="Contact">
          {(a) => (
            <Select
              {...a}
              disabled={!f.partner_id}
              value={f.contact_id}
              onChange={(e) => setF({ ...f, contact_id: e.target.value })}
            >
              <option value="">Aucun contact en particulier</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.title ? ` — ${c.title}` : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label={direction === "entrant" ? "Expéditeur" : "Destinataire"}
          required={!f.partner_id && !f.reply_to_id}
          className="sm:col-span-2"
          hint="Tel qu'il figure sur le courrier ; rempli d'après le partenaire s'il est choisi."
        >
          {(a) => (
            <>
              <Input
                {...a}
                value={f.correspondent}
                onChange={(e) => setF({ ...f, correspondent: e.target.value })}
              />
              {lookalike && (
                <button
                  type="button"
                  className="mt-1.5 text-left text-[12.5px] text-primary hover:underline"
                  onClick={() =>
                    setF({
                      ...f,
                      partner_id: lookalike.id,
                      contact_id: "",
                      correspondent: lookalike.name,
                    })
                  }
                >
                  Rattacher à la fiche partenaire « {lookalike.name} »
                </button>
              )}
              {!lookalike && !f.partner_id && typed.length >= 3 && (
                <Link
                  to="/partenaires"
                  className="mt-1.5 block text-[12.5px] text-muted hover:underline"
                >
                  Correspondant absent de l'annuaire : ouvrir l'annuaire pour
                  créer sa fiche
                </Link>
              )}
            </>
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
            <Input
              {...a}
              type="date"
              value={f.due_on}
              onChange={(e) => setF({ ...f, due_on: e.target.value })}
            />
          )}
        </Field>
        {direction === "sortant" && (
          <Field
            label="Répond au courrier entrant"
            className="sm:col-span-2"
            hint="L'entrant encore ouvert sera clôturé par cette réponse."
          >
            {(a) => (
              <Select
                {...a}
                value={f.reply_to_id}
                onChange={(e) => setF({ ...f, reply_to_id: e.target.value })}
              >
                <option value="">Aucun</option>
                {incoming?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.reference} — {m.subject}
                    {m.status === "traite" ? " (déjà traité)" : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field
          label="Dossier"
          className="sm:col-span-2"
          hint="Le courrier se retrouvera dans ce projet ou cette activité."
        >
          {(a) => (
            <Select
              {...a}
              value={f.dossier}
              onChange={(e) => setF({ ...f, dossier: e.target.value })}
            >
              <option value="">Aucun</option>
              {!!projects?.length && (
                <optgroup label="Projets">
                  {projects.map((p) => (
                    <option key={p.id} value={`prj:${p.id}`}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {!!activities?.length && (
                <optgroup label="Activités">
                  {activities.map((x) => (
                    <option key={x.id} value={`act:${x.id}`}>
                      {x.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
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
  const [f, setF] = useState({
    unit_id: "",
    assignee_id: "",
    due_on: m.due_on ?? "",
    instruction: m.instruction ?? "",
    annotation: "",
  });
  const [copies, setCopies] = useState<
    { user_id: string; purpose: "information" | "avis" }[]
  >([]);
  const [copy, setCopy] = useState({
    user_id: "",
    purpose: "information" as "information" | "avis",
  });
  const save = useMutation({
    mutationFn: () =>
      api.post(`/api/correspondence/${m.id}/assign`, {
        unit_id: f.unit_id || null,
        assignee_id: f.assignee_id || null,
        due_on: f.due_on || null,
        instruction: f.instruction || undefined,
        annotation: f.annotation.trim() || undefined,
        copies,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["correspondence"] });
      qc.invalidateQueries({ queryKey: ["mail-annotations", m.id] });
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
            disabled={
              !f.unit_id &&
              !f.assignee_id &&
              !copies.length &&
              !f.annotation.trim()
            }
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
            <Select
              {...a}
              value={f.unit_id}
              onChange={(e) => setF({ ...f, unit_id: e.target.value })}
            >
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
            <Input
              {...a}
              type="date"
              value={f.due_on}
              onChange={(e) => setF({ ...f, due_on: e.target.value })}
            />
          )}
        </Field>
        <Field
          label="Instruction"
          hint="L'annotation du bureau d'ordre, transmise à l'agent imputé."
        >
          {(a) => (
            <Select
              {...a}
              value={f.instruction}
              onChange={(e) => setF({ ...f, instruction: e.target.value })}
            >
              <option value="">Aucune</option>
              {INSTRUCTIONS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Annotation"
          hint="Consigne de la direction ou du chef d'entité, inscrite au fil du courrier."
        >
          {(a) => (
            <textarea
              {...a}
              rows={3}
              value={f.annotation}
              onChange={(e) => setF({ ...f, annotation: e.target.value })}
              className="field-ring w-full rounded-[10px] border border-field bg-panel px-3 py-2 text-[13.5px] outline-none"
            />
          )}
        </Field>
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-muted">Copies</p>
          {copies.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {copies.map((c) => (
                <li
                  key={c.user_id}
                  className="flex items-center gap-1 rounded-full bg-hover px-2.5 py-0.5 text-[12px]"
                >
                  {users?.find((u) => u.id === c.user_id)?.name} ·{" "}
                  {c.purpose === "avis" ? "pour avis" : "pour information"}
                  <button
                    type="button"
                    aria-label="Retirer la copie"
                    className="text-muted hover:text-fg"
                    onClick={() =>
                      setCopies((x) => x.filter((y) => y.user_id !== c.user_id))
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <PeopleSelect
              people={users?.filter(
                (u) => !copies.some((c) => c.user_id === u.id),
              )}
              value={copy.user_id}
              onChange={(v) => setCopy({ ...copy, user_id: v })}
            />
            <Select
              aria-label="Objet de la copie"
              value={copy.purpose}
              onChange={(e) =>
                setCopy({
                  ...copy,
                  purpose: e.target.value as "information" | "avis",
                })
              }
              className="w-[150px]"
            >
              <option value="information">Pour information</option>
              <option value="avis">Pour avis</option>
            </Select>
            <Button
              disabled={!copy.user_id}
              onClick={() => {
                setCopies((x) => [...x, copy]);
                setCopy({ user_id: "", purpose: "information" });
              }}
            >
              Ajouter
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/** Fiche d'un courrier : le registre en lecture, la pièce numérisée et les documents, puis les actes (imputer). */
function MailDialog({
  m,
  canManage,
  canAssign,
  canClose,
  meId,
  onAssign,
  onClose,
}: {
  m: MailRow;
  canManage: boolean;
  canAssign: boolean;
  canClose: boolean;
  meId?: string;
  onAssign: () => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [filing, setFiling] = useState(false);
  // Clôturer en choisissant le courrier sortant de réponse (C-2)
  const [closing, setClosing] = useState(false);
  const [replyId, setReplyId] = useState("");
  const { data: outgoing } = useQuery({
    queryKey: ["correspondence", "sortant"],
    queryFn: () => api.get<MailRow[]>("/api/correspondence?direction=sortant"),
    enabled: closing,
  });
  const [reason, setReason] = useState("");
  const act = (path: string, body: unknown, ok: string) =>
    api.post(`/api/correspondence/${m.id}/${path}`, body).then(() => {
      toast.success(ok);
      qc.invalidateQueries({ queryKey: ["correspondence"] });
      qc.invalidateQueries({ queryKey: ["mail-annotations", m.id] });
      onClose();
    }, fail);
  const open = !closedMail(m);
  return (
    <Drawer
      open
      onClose={onClose}
      title={m.subject}
      subtitle={`${m.reference} · courrier ${m.direction}${m.confidential ? " · confidentiel" : ""}`}
      footer={
        <>
          {open && canManage && (
            <Button onClick={() => setFiling(true)}>Classer sans suite</Button>
          )}
          {open && canAssign && (
            <Button
              icon={<UserRoundPlus className="size-4" />}
              onClick={onAssign}
            >
              Imputer
            </Button>
          )}
          {m.status === "impute" && m.assignee_id === meId && (
            <Button
              variant="primary"
              onClick={() => act("start", {}, "Courrier pris en charge")}
            >
              Prendre en charge
            </Button>
          )}
          {open && canClose && (m.status !== "impute" || canManage) && (
            <Button
              variant={m.assignee_id === meId ? "primary" : undefined}
              icon={<CheckCircle2 className="size-4" />}
              onClick={() =>
                m.direction === "entrant"
                  ? setClosing(true)
                  : act("close", {}, "Courrier traité")
              }
            >
              Clôturer
            </Button>
          )}
          <Button onClick={onClose}>Fermer</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Facts className="p-0 pt-0">
          <Fact
            label={m.direction === "entrant" ? "Expéditeur" : "Destinataire"}
          >
            {m.partner_id ? (
              <Link
                to={`/partenaires/${m.partner_id}`}
                className="text-primary hover:underline"
              >
                {m.correspondent}
              </Link>
            ) : (
              m.correspondent
            )}
            {m.contact_name && (
              <span className="block text-[12px] font-normal text-muted">
                {m.contact_name}
              </span>
            )}
          </Fact>
          <Fact label="État">
            <Status {...MAIL[m.status]} />
          </Fact>
          <Fact label="Date du courrier">
            {m.doc_date && frDate(m.doc_date)}
          </Fact>
          <Fact label={m.direction === "entrant" ? "Reçu le" : "Envoyé le"}>
            {frDate(m.received_on)}
          </Fact>
          <Fact label="Imputation">
            {m.assignee_name ?? m.unit_name}
            {m.instruction && (
              <span className="block text-[12px] font-normal text-muted">
                {m.instruction}
              </span>
            )}
          </Fact>
          <Fact label="Délai de réponse">
            {m.due_on && (
              <span
                className={
                  m.status !== "traite" && isLate(m.due_on) ? "text-danger" : ""
                }
              >
                {frDate(m.due_on)}
              </span>
            )}
          </Fact>
          <Fact label="Dossier">{m.project_name ?? m.activity_title}</Fact>
          <Fact label="Lien">
            {m.reply_to_reference
              ? `Répond à ${m.reply_to_reference}`
              : m.response_reference
                ? `Réponse : ${m.response_reference}`
                : null}
          </Fact>
        </Facts>
        {m.status === "classe" && m.filed_reason && (
          <p className="rounded-[10px] bg-hover px-3 py-2 text-[13px]">
            Classé sans suite : {m.filed_reason}
          </p>
        )}
        <DossierDocuments
          owner="mail"
          ownerId={m.id}
          title="Pièce numérisée et documents"
        />
        <MailThread id={m.id} />
      </div>
      {closing && (
        <Dialog
          open
          onOpenChange={() => setClosing(false)}
          title="Clôturer le courrier"
          description="Choisissez le courrier sortant qui y répond : les deux courriers sont reliés au registre."
          footer={
            <>
              <Button onClick={() => setClosing(false)}>Annuler</Button>
              <Button
                variant="primary"
                onClick={() =>
                  act(
                    "close",
                    replyId ? { reply_id: replyId } : {},
                    "Courrier traité",
                  )
                }
              >
                Clôturer
              </Button>
            </>
          }
        >
          <Field label="Réponse">
            {(a) => (
              <select
                {...a}
                className="h-9 w-full rounded-lg border border-line bg-panel px-2 text-[13px]"
                value={replyId}
                onChange={(e) => setReplyId(e.target.value)}
              >
                <option value="">Sans réponse écrite</option>
                {(outgoing ?? [])
                  .filter(
                    (o) =>
                      !o.reply_to_reference ||
                      o.reply_to_reference === m.reference,
                  )
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.reference} · {o.subject}
                    </option>
                  ))}
              </select>
            )}
          </Field>
        </Dialog>
      )}
      {filing && (
        <Dialog
          open
          onOpenChange={() => setFiling(false)}
          title="Classer sans suite"
          description="Le motif est inscrit au fil du courrier et au journal ; le courrier sort des délais."
          footer={
            <>
              <Button onClick={() => setFiling(false)}>Annuler</Button>
              <Button
                variant="primary"
                disabled={!reason.trim()}
                onClick={() =>
                  act("file", { reason }, "Courrier classé sans suite")
                }
              >
                Classer
              </Button>
            </>
          }
        >
          <Field label="Motif" required>
            {(a) => (
              <Input
                {...a}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
              />
            )}
          </Field>
        </Dialog>
      )}
    </Drawer>
  );
}

const THREAD_LABEL: Record<string, string> = {
  enregistrement: "Enregistrement",
  imputation: "Imputation",
  annotation: "Annotation",
  copie: "Copie",
  prise_en_charge: "Prise en charge",
  note: "Note",
  cloture: "Clôture",
  classement: "Classement",
};
/** Le fil du courrier : chaque étape du circuit et chaque annotation, dans l'ordre. */
function MailThread({ id }: { id: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data } = useQuery({
    queryKey: ["mail-annotations", id],
    queryFn: () =>
      api.get<
        {
          id: string;
          kind: string;
          text: string;
          created_at: string;
          author_name: string | null;
        }[]
      >(`/api/correspondence/${id}/annotations`),
  });
  const add = () =>
    api.post(`/api/correspondence/${id}/annotations`, { text }).then(() => {
      setText("");
      toast.success("Annotation ajoutée au fil");
      qc.invalidateQueries({ queryKey: ["mail-annotations", id] });
    }, fail);
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
        Circuit et annotations
      </h3>
      <ol className="relative space-y-3 border-l border-line pl-4">
        {(data ?? []).map((a) => (
          <li key={a.id} className="relative">
            <span
              className={cn(
                "absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-panel",
                a.kind === "annotation"
                  ? "bg-primary"
                  : a.kind === "note"
                    ? "bg-ai"
                    : "bg-line-strong",
              )}
            />
            <p className="text-[12px] text-muted">
              <span className="font-medium text-fg">
                {THREAD_LABEL[a.kind] ?? a.kind}
              </span>{" "}
              · {a.author_name ?? "—"} ·{" "}
              {new Date(a.created_at).toLocaleString("fr-FR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
            {a.text && (
              <p className="mt-0.5 whitespace-pre-wrap text-[13.5px]">
                {a.text}
              </p>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <Input
          aria-label="Nouvelle annotation"
          placeholder="Ajouter une annotation ou une note…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button disabled={!text.trim()} onClick={add}>
          Annoter
        </Button>
      </div>
    </section>
  );
}
