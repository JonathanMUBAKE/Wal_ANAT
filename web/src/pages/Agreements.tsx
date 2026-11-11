import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  Download,
  FilePlus2,
  FileSignature,
  FileText,
  Hash,
  Handshake,
  Lock,
  Paperclip,
  Plus,
  Save,
  ScrollText,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, ConfirmDialog, Dialog, Empty, IconButton, cn } from "@/components/ui";
import { Seal } from "@/components/collection";
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
  type Tone,
} from "@/components/gov";
import { api } from "@/lib/api";
import { useCan, useMe, useUnits, useUsers } from "@/lib/hooks";
import { HUES, REF_ICONS, type RefValue, useReferentials } from "@/lib/referentials";

/* Partenariats › Conventions — lot PA2 (docs/CONCEPTION.md § 4.4 à 4.6) : accords, avenants, pièces de collaboration. */

export type AgreementState = "preparation" | "signature" | "vigueur" | "resilie" | "echu";
export const AGREEMENT_STATE: Record<AgreementState, { label: string; tone: Tone }> = {
  preparation: { label: "En préparation", tone: "neutral" },
  signature: { label: "Au parapheur", tone: "info" },
  vigueur: { label: "En vigueur", tone: "success" },
  echu: { label: "Échu", tone: "warning" },
  resilie: { label: "Résilié", tone: "neutral" },
};

interface Party {
  id: string;
  name: string;
  acronym: string;
  state: string;
  lead: boolean;
}
export interface AgreementRow {
  id: string;
  reference: string | null;
  type_code: string;
  title: string;
  state: AgreementState;
  partner_ref: string;
  signed_on: string | null;
  effective_on: string | null;
  end_on: string | null;
  tacit_renewal: boolean;
  focal_id: string | null;
  focal_name: string | null;
  unit_id: string | null;
  unit_name: string | null;
  confidential: boolean;
  parent_id: string | null;
  amendment_no: number | null;
  parties: Party[];
}
export interface PartnerDocument {
  id: string;
  agreement_id?: string | null;
  nature_code: string;
  official: boolean;
  filename: string;
  size: number;
  created_at: string;
  uploader_id: string | null;
  uploader_name: string | null;
}
interface Detail extends AgreementRow {
  content: string;
  signed_outside: boolean;
  new_end_on: string | null;
  ended_on: string | null;
  ended_reason: string;
  binding: boolean;
  parent: { id: string; title: string; reference: string | null } | null;
  amendments: { id: string; title: string; state: AgreementState; reference: string | null; amendment_no: number }[];
  documents: PartnerDocument[];
  sign_document: { id: string; status: string; reference: string } | null;
  can: { edit: boolean; sign: boolean; activate: boolean; amend: boolean; terminate: boolean; delete: boolean };
}

const fail = (e: unknown) => toast.error((e as Error).message);
const today = () => new Date().toISOString().slice(0, 10);
const daysTo = (d: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 864e5);
const kb = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1)} Mo`;

function TypeTag({ value, code }: { value?: RefValue; code: string }) {
  const Icon = REF_ICONS[value?.icon ?? "circle"] ?? REF_ICONS.circle;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 text-[12.5px]">
      <Icon className="size-3.5 shrink-0" style={{ color: HUES[value?.color ?? "slate"] }} />
      <span className="truncate">{value?.label ?? code}</span>
    </span>
  );
}

/** Échéance, avec un repère quand elle approche (90 jours). */
function EndOn({ a }: { a: Pick<AgreementRow, "end_on" | "state" | "tacit_renewal"> }) {
  if (!a.end_on) return <span className="text-muted">—</span>;
  const left = daysTo(a.end_on);
  const soon = a.state === "vigueur" && left >= 0 && left <= 90;
  return (
    <span className={cn("tabular", soon && "font-medium text-warning")}>
      {frDate(a.end_on)}
      {soon && (
        <span className="block text-[11.5px] font-normal">
          dans {left} j{a.tacit_renewal ? " · tacite" : ""}
        </span>
      )}
    </span>
  );
}

const partiesLabel = (p: Party[]) => p.map((x) => x.acronym || x.name).join(" · ");

// ------------------------------------------------------------------ registre
type TabId = "all" | AgreementState;

export function AgreementsPage() {
  const nav = useNavigate();
  const can = useCan();
  const { data: refs } = useReferentials();
  const [tab, setTab] = useState<TabId>("all");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["agreements"],
    queryFn: () => api.get<AgreementRow[]>("/api/agreements"),
  });
  const types = refs?.agreement_type ?? [];
  const rows = (data ?? []).filter(
    (a) =>
      (tab === "all" || a.state === tab) &&
      (!type || a.type_code === type) &&
      (!q.trim() ||
        `${a.title} ${a.reference ?? ""} ${a.partner_ref} ${partiesLabel(a.parties)} ${a.parties.map((p) => p.name).join(" ")}`
          .toLowerCase()
          .includes(q.trim().toLowerCase())),
  );
  const count = (s: AgreementState) => data?.filter((a) => a.state === s).length;
  const soon = (data ?? []).filter((a) => a.state === "vigueur" && a.end_on && daysTo(a.end_on) <= 90).length;
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={ScrollText}
        crumbs={["Partenariats", "Conventions"]}
        title="Conventions et accords"
        subtitle="Le registre des actes conclus avec les partenaires : chaque accord reçoit son numéro à l'entrée en vigueur, son texte est alors figé et toute modification passe par un avenant."
        actions={
          can("partners.manage") && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Nouvel accord
            </Button>
          )
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "all" as const, label: "Tous", badge: data?.length },
          { id: "vigueur" as const, label: "En vigueur", badge: count("vigueur") },
          { id: "preparation" as const, label: "En préparation", badge: count("preparation") },
          { id: "signature" as const, label: "Au parapheur", badge: count("signature") },
          { id: "echu" as const, label: "Échus", badge: count("echu") },
          { id: "resilie" as const, label: "Résiliés", badge: count("resilie") },
        ]}
      />
      <div className="mx-auto max-w-[1240px] space-y-3 p-4 sm:px-8 sm:py-6">
        {soon > 0 && (
          <p className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-[13px]">
            <CalendarDays className="size-4 shrink-0 text-warning" />
            {soon} accord{soon > 1 ? "s" : ""} en vigueur arrive{soon > 1 ? "nt" : ""} à échéance dans les 90 jours : à
            prolonger par avenant, à dénoncer ou à laisser échoir.
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_260px]">
          <Input
            aria-label="Rechercher un accord"
            placeholder="Rechercher par objet, numéro, référence ou partenaire…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select aria-label="Type d'accord" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tous les types</option>
            {types.map((t) => (
              <option key={t.code} value={t.code}>
                {t.plural || t.label}
              </option>
            ))}
          </Select>
        </div>
        <Section>
          {isLoading ? (
            <LoadingRows />
          ) : rows.length ? (
            <Table head={["Numéro", "Accord", "État", "Partenaires", "Échéance", "Point focal"]}>
              {rows.map((a) => (
                <Tr key={a.id} onClick={() => nav(`/conventions/${a.id}`)}>
                  <Td className="whitespace-nowrap font-mono text-[12px] text-muted">{a.reference ?? "—"}</Td>
                  <Td className="min-w-[240px]">
                    <span className="flex items-center gap-1.5 font-medium">
                      {a.amendment_no ? `Avenant n° ${a.amendment_no} — ` : ""}
                      {a.title}
                      {a.confidential && <Lock aria-label="Confidentiel" className="size-3 shrink-0 text-warning" />}
                    </span>
                    <TypeTag value={types.find((t) => t.code === a.type_code)} code={a.type_code} />
                  </Td>
                  <Td>
                    <Status label={AGREEMENT_STATE[a.state].label} tone={AGREEMENT_STATE[a.state].tone} />
                  </Td>
                  <Td className="text-muted">{partiesLabel(a.parties)}</Td>
                  <Td>
                    <EndOn a={a} />
                  </Td>
                  <Td className="text-muted">{a.focal_name ?? "—"}</Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <Empty
              icon={<ScrollText className="size-6" />}
              title={data?.length ? "Aucun accord ne correspond" : "Aucun accord"}
            >
              {data?.length
                ? "Modifiez la recherche ou le filtre."
                : "Préparez une convention, un protocole ou un accord de financement avec un partenaire de l'annuaire."}
            </Empty>
          )}
        </Section>
      </div>
      {creating && <NewAgreement onClose={() => setCreating(false)} />}
    </div>
  );
}

// ------------------------------------------------------------------ création
export function NewAgreement({ partner, onClose }: { partner?: { id: string; name: string }; onClose: () => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: refs } = useReferentials();
  const { data: users } = useUsers();
  const { data: partners } = useQuery({
    queryKey: ["partners", "selectable"],
    queryFn: () => api.get<{ id: string; name: string; acronym: string }[]>("/api/partners?selectable=1"),
  });
  const types = refs?.agreement_type.filter((t) => !t.archived) ?? [];
  const [f, setF] = useState({
    type_code: "",
    title: "",
    partner_ids: partner ? [partner.id] : ([] as string[]),
    end_on: "",
    focal_id: "",
  });
  const [adding, setAdding] = useState("");
  const create = useMutation({
    mutationFn: () =>
      api.post<Detail>("/api/agreements", {
        ...f,
        end_on: f.end_on || null,
        focal_id: f.focal_id || null,
        lead_partner_id: f.partner_ids[0],
      }),
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["agreements"] });
      qc.invalidateQueries({ queryKey: ["partner"] });
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Accord en préparation");
      nav(`/conventions/${a.id}`);
    },
    onError: fail,
  });
  const type = types.find((t) => t.code === f.type_code);
  const name = (id: string) => partners?.find((p) => p.id === id)?.name ?? (id === partner?.id ? partner.name : id);
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Nouvel accord"
      description="L'accord naît en préparation : son texte se rédige, puis il entre en vigueur par la signature."
      width={600}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!f.title.trim() || !f.type_code || !f.partner_ids.length}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            Créer
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Type"
          required
          hint={
            type ? (type.props.binding ? "Contraignant : signature au parapheur." : "Non contraignant.") : undefined
          }
        >
          {(a) => (
            <Select {...a} value={f.type_code} onChange={(e) => setF({ ...f, type_code: e.target.value })}>
              <option value="">Choisir…</option>
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Échéance">
          {(a) => (
            <Input {...a} type="date" value={f.end_on} onChange={(e) => setF({ ...f, end_on: e.target.value })} />
          )}
        </Field>
        <Field label="Objet" required className="sm:col-span-2">
          {(a) => <Input {...a} autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[12.5px] font-medium text-muted">
            Partenaires <span className="text-danger">*</span>{" "}
            <span className="font-normal">(le premier est chef de file)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {f.partner_ids.map((id, i) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[12.5px]"
              >
                {name(id)}
                {i === 0 && <span className="text-[11px] text-primary">chef de file</span>}
                <button
                  type="button"
                  aria-label={`Retirer ${name(id)}`}
                  className="text-muted hover:text-danger"
                  onClick={() => setF({ ...f, partner_ids: f.partner_ids.filter((x) => x !== id) })}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <Select
            aria-label="Ajouter un partenaire"
            className="mt-1.5"
            value={adding}
            onChange={(e) => {
              if (e.target.value) setF({ ...f, partner_ids: [...f.partner_ids, e.target.value] });
              setAdding("");
            }}
          >
            <option value="">Ajouter un partenaire…</option>
            {partners
              ?.filter((p) => !f.partner_ids.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.acronym ? ` (${p.acronym})` : ""}
                </option>
              ))}
          </Select>
        </div>
        <Field label="Point focal de l'accord">
          {(a) => (
            <PeopleSelect
              {...a}
              people={users}
              placeholder="Non désigné"
              value={f.focal_id}
              onChange={(focal_id) => setF({ ...f, focal_id })}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

// ------------------------------------------------------------------ fiche accord
export function AgreementPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: refs } = useReferentials();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const {
    data: a,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agreement", id],
    queryFn: () => api.get<Detail>(`/api/agreements/${id}`),
  });
  const [d, setD] = useState<Detail | null>(null);
  const [dirty, setDirty] = useState(false);
  const [dialog, setDialog] = useState<"sign" | "activate" | "amend" | "terminate" | "delete" | null>(null);
  useEffect(() => {
    if (a) {
      setD(a);
      setDirty(false);
    }
  }, [a]);
  const refresh = (r: Detail) => {
    qc.setQueryData(["agreement", r.id], r);
    qc.invalidateQueries({ queryKey: ["agreements"] });
    qc.invalidateQueries({ queryKey: ["partner"] });
    qc.invalidateQueries({ queryKey: ["partners"] });
  };
  const save = useMutation({
    mutationFn: () =>
      api.patch<Detail>(`/api/agreements/${id}`, {
        title: d!.title,
        content: d!.content,
        partner_ref: d!.partner_ref,
        effective_on: d!.effective_on || null,
        end_on: d!.end_on || null,
        tacit_renewal: d!.tacit_renewal,
        unit_id: d!.unit_id,
        ...(d!.parent_id ? { new_end_on: d!.new_end_on || null } : {}),
      }),
    onSuccess: (r) => {
      refresh(r);
      toast.success("Accord enregistré");
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/api/agreements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agreements"] });
      qc.invalidateQueries({ queryKey: ["partner"] });
      toast.success("Préparation abandonnée");
      nav("/conventions");
    },
    onError: fail,
  });
  if (isLoading || (!d && !error)) return <LoadingRows rows={8} />;
  if (error || !d) return <Empty title="Accord inaccessible">{(error as Error)?.message}</Empty>;
  const ro = !d.can.edit;
  const patch = (x: Partial<Detail>) => {
    setD({ ...d, ...x });
    setDirty(true);
  };
  const S = AGREEMENT_STATE[d.state];
  const type = refs?.agreement_type.find((t) => t.code === d.type_code);
  return (
    <div className="min-h-full pb-10">
      <PageHeader
        crumbs={["Partenariats", "Conventions", d.reference ?? "En préparation"]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link to="/conventions" aria-label="Retour au registre" className="text-muted hover:text-fg">
              <ArrowLeft className="size-5" />
            </Link>
            {d.amendment_no ? `Avenant n° ${d.amendment_no} — ` : ""}
            {d.title}
            {d.confidential && <Lock aria-label="Confidentiel" className="size-4 text-warning" />}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <TypeTag value={type} code={d.type_code} />
            {d.parent && (
              <Link to={`/conventions/${d.parent.id}`} className="text-primary hover:underline">
                Modifie {d.parent.reference ?? d.parent.title}
              </Link>
            )}
          </span>
        }
        actions={
          <>
            {d.state === "vigueur" ? <Stamp>En vigueur</Stamp> : <Status label={S.label} tone={S.tone} />}
            {d.reference && <Seal>{d.reference}</Seal>}
            {d.can.sign && d.binding && (
              <Button icon={<FileSignature className="size-4" />} onClick={() => setDialog("sign")}>
                Soumettre au parapheur
              </Button>
            )}
            {d.can.activate && (
              <Button icon={<CheckCircle2 className="size-4" />} onClick={() => setDialog("activate")}>
                {d.binding ? "Déclarer signé hors parapheur" : "Déclarer en vigueur"}
              </Button>
            )}
            {d.can.amend && (
              <Button icon={<FilePlus2 className="size-4" />} onClick={() => setDialog("amend")}>
                Préparer un avenant
              </Button>
            )}
            {d.can.terminate && (
              <Button variant="danger" icon={<Ban className="size-4" />} onClick={() => setDialog("terminate")}>
                Résilier
              </Button>
            )}
            {d.can.delete && (
              <IconButton label="Abandonner la préparation" onClick={() => setDialog("delete")}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
            {!ro && (
              <Button
                variant="primary"
                icon={<Save className="size-4" />}
                disabled={!dirty || !d.title.trim()}
                loading={save.isPending}
                onClick={() => save.mutate()}
              >
                Enregistrer
              </Button>
            )}
          </>
        }
      />
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-4 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {d.state === "signature" && d.sign_document && (
            <p className="rounded-xl border border-line bg-hover/50 px-4 py-3 text-[13px]">
              Au parapheur sous le numéro <span className="font-mono">{d.sign_document.reference}</span> : le texte est
              scellé pendant le circuit. L'accord entrera en vigueur à la signature ; un rejet le renverra en
              préparation.{" "}
              <Link to="/parapheur" className="font-medium text-primary hover:underline">
                Ouvrir le parapheur
              </Link>
            </p>
          )}
          {d.state === "resilie" && (
            <p className="rounded-xl border border-line bg-hover/50 px-4 py-3 text-[13px]">
              Résilié le {frDate(d.ended_on)} : {d.ended_reason}
            </p>
          )}
          <Section title="Texte de l'accord">
            <div className="space-y-3 p-4 pt-2">
              {!ro && (
                <Field label="Objet" required>
                  {(x) => <Input {...x} value={d.title} onChange={(e) => patch({ title: e.target.value })} />}
                </Field>
              )}
              {ro ? (
                <div className="whitespace-pre-wrap rounded-xl border border-line bg-hover/40 px-4 py-3 text-[13.5px] leading-relaxed">
                  {d.content || <span className="text-muted">Aucun texte saisi.</span>}
                </div>
              ) : (
                <Textarea
                  aria-label="Texte de l'accord"
                  rows={12}
                  placeholder="Préambule, objet, engagements des parties, durée, résiliation…"
                  value={d.content}
                  onChange={(e) => patch({ content: e.target.value })}
                />
              )}
              {d.state !== "preparation" && (
                <p className="text-[12px] text-faint">
                  Le texte d'un accord passé au parapheur ou conclu ne se modifie plus : un avenant le complète.
                </p>
              )}
            </div>
          </Section>
          <DocumentsPanel
            partnerId={(d.parties.find((p) => p.lead) ?? d.parties[0]).id}
            agreementId={d.id}
            documents={d.documents}
            canAdd={d.can.edit || d.can.amend || d.can.terminate}
            onChange={() => qc.invalidateQueries({ queryKey: ["agreement", id] })}
          />
          {!d.parent_id && (
            <Section title="Avenants">
              {d.amendments.length ? (
                <ul className="divide-y divide-line">
                  {d.amendments.map((x) => (
                    <li key={x.id}>
                      <Link
                        to={`/conventions/${x.id}`}
                        className="flex items-center gap-3 px-5 py-3 text-[13px] hover:bg-hover"
                      >
                        <span className="font-medium">Avenant n° {x.amendment_no}</span>
                        <span className="min-w-0 flex-1 truncate text-muted">{x.title}</span>
                        {x.reference && <span className="font-mono text-[12px] text-muted">{x.reference}</span>}
                        <Status label={AGREEMENT_STATE[x.state].label} tone={AGREEMENT_STATE[x.state].tone} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 pb-5 pt-1 text-[13px] text-muted">Aucun avenant.</p>
              )}
            </Section>
          )}
        </div>
        <aside className="space-y-4">
          <Section title="Parties">
            <ul className="space-y-2 p-4 pt-2 text-[13px]">
              <li className="flex items-center gap-2">
                <Handshake className="size-4 text-muted" /> L'Agence
              </li>
              {d.parties.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <Handshake className="size-4 text-muted" />
                  <Link
                    to={`/partenaires/${p.id}`}
                    className="min-w-0 truncate font-medium text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                  {p.lead && d.parties.length > 1 && <span className="text-[11.5px] text-muted">chef de file</span>}
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Dates et suivi">
            <div className="space-y-3 p-4 pt-2 text-[13px]">
              <Field label="Référence du partenaire">
                {(x) => (
                  <Input
                    {...x}
                    disabled={ro}
                    value={d.partner_ref}
                    onChange={(e) => patch({ partner_ref: e.target.value })}
                  />
                )}
              </Field>
              <Meta label="Signé le" Icon={Hash}>
                {frDate(d.signed_on)}
                {d.signed_outside && (
                  <span className="block text-[12px] font-normal text-muted">Exemplaire signé hors parapheur</span>
                )}
              </Meta>
              <Field label="Entrée en vigueur">
                {(x) => (
                  <Input
                    {...x}
                    type="date"
                    disabled={ro}
                    value={d.effective_on ?? ""}
                    onChange={(e) => patch({ effective_on: e.target.value || null })}
                  />
                )}
              </Field>
              {d.parent_id ? (
                <Field label="Nouvelle échéance portée par l'avenant">
                  {(x) => (
                    <Input
                      {...x}
                      type="date"
                      disabled={ro}
                      value={d.new_end_on ?? ""}
                      onChange={(e) => patch({ new_end_on: e.target.value || null })}
                    />
                  )}
                </Field>
              ) : (
                <>
                  <Field label="Échéance">
                    {(x) =>
                      ro ? (
                        <div id={x.id} className="font-medium">
                          <EndOn a={d} />
                        </div>
                      ) : (
                        <Input
                          {...x}
                          type="date"
                          value={d.end_on ?? ""}
                          onChange={(e) => patch({ end_on: e.target.value || null })}
                        />
                      )
                    }
                  </Field>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary)]"
                      disabled={ro}
                      checked={d.tacit_renewal}
                      onChange={(e) => patch({ tacit_renewal: e.target.checked })}
                    />
                    Reconduction tacite
                  </label>
                </>
              )}
              <Field label="Entité porteuse">
                {(x) => (
                  <Select
                    {...x}
                    disabled={ro}
                    value={d.unit_id ?? ""}
                    onChange={(e) => patch({ unit_id: e.target.value || null })}
                  >
                    <option value="">Aucune</option>
                    {units?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Meta label="Point focal">{users?.find((u) => u.id === d.focal_id)?.name ?? "Non désigné"}</Meta>
            </div>
          </Section>
        </aside>
      </div>
      {dialog === "sign" && <SignDialog agreement={d} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === "activate" && <ActivateDialog agreement={d} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === "amend" && <AmendDialog agreement={d} onClose={() => setDialog(null)} />}
      {dialog === "terminate" && <TerminateDialog agreement={d} onClose={() => setDialog(null)} onDone={refresh} />}
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(v) => setDialog(v ? "delete" : null)}
        title="Abandonner cette préparation ?"
        description="L'accord n'a jamais été signé : il disparaît du registre. Ses pièces restent rangées chez le partenaire. Cette action est tracée."
        confirmLabel="Abandonner"
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}

const Meta = ({ label, children, Icon }: { label: string; children: React.ReactNode; Icon?: typeof Hash }) => (
  <div className="min-w-0">
    <dt className="flex items-center gap-1 text-[12px] text-muted">
      {Icon && <Icon className="size-3" />}
      {label}
    </dt>
    <dd className="mt-0.5 font-medium">{children}</dd>
  </div>
);

function SignDialog({
  agreement,
  onClose,
  onDone,
}: {
  agreement: Detail;
  onClose: () => void;
  onDone: (r: Detail) => void;
}) {
  const { data: users } = useUsers();
  const [visa, setVisa] = useState<string[]>([]);
  const [signer, setSigner] = useState("");
  const [adding, setAdding] = useState("");
  const sign = useMutation({
    mutationFn: () =>
      api.post<Detail>(`/api/agreements/${agreement.id}/sign`, {
        steps: [...visa.map((u) => ({ actor_id: u, action: "visa" })), { actor_id: signer, action: "signature" }],
      }),
    onSuccess: (r) => {
      onDone(r);
      toast.success(`Soumis au parapheur (${r.sign_document?.reference})`);
      onClose();
    },
    onError: fail,
  });
  const people = users?.filter((u) => !u.is_ai) ?? [];
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Soumettre au parapheur"
      description="Le texte est scellé pendant le circuit. À la signature, l'accord entre en vigueur et reçoit son numéro."
      width={520}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!signer} loading={sign.isPending} onClick={() => sign.mutate()}>
            Lancer le circuit
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-muted">Visas, dans l'ordre</p>
          {visa.map((u, i) => (
            <p
              key={u}
              className="mb-1 flex items-center justify-between rounded-lg border border-line px-2.5 py-1.5 text-[13px]"
            >
              {i + 1}. {people.find((p) => p.id === u)?.name}
              <button
                type="button"
                className="text-[12px] text-muted hover:text-danger"
                onClick={() => setVisa(visa.filter((x) => x !== u))}
              >
                Retirer
              </button>
            </p>
          ))}
          <PeopleSelect
            aria-label="Ajouter un visa"
            people={people.filter((p) => !visa.includes(p.id) && p.id !== signer)}
            placeholder="Ajouter un visa…"
            value={adding}
            onChange={(v) => {
              if (v) setVisa([...visa, v]);
              setAdding("");
            }}
          />
        </div>
        <Field label="Signataire" required hint="En principe la Directrice générale.">
          {(a) => (
            <PeopleSelect
              {...a}
              people={people.filter((p) => !visa.includes(p.id))}
              value={signer}
              onChange={setSigner}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

function ActivateDialog({
  agreement,
  onClose,
  onDone,
}: {
  agreement: Detail;
  onClose: () => void;
  onDone: (r: Detail) => void;
}) {
  const [f, setF] = useState({ signed_on: today(), effective_on: agreement.effective_on ?? "" });
  const go = useMutation({
    mutationFn: () =>
      api.post<Detail>(`/api/agreements/${agreement.id}/activate`, {
        signed_on: f.signed_on,
        effective_on: f.effective_on || null,
      }),
    onSuccess: (r) => {
      onDone(r);
      toast.success(`Accord en vigueur : ${r.reference}`);
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={agreement.binding ? "Déclarer l'accord signé hors parapheur" : "Déclarer l'accord en vigueur"}
      description={
        agreement.binding
          ? "Réservé aux gestionnaires : l'exemplaire signé doit être joint comme pièce officielle. L'accord reçoit son numéro et son texte est figé."
          : "L'accord reçoit son numéro et son texte est figé : toute modification passera par un avenant."
      }
      width={480}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!f.signed_on || f.signed_on > today()}
            loading={go.isPending}
            onClick={() => go.mutate()}
          >
            Confirmer
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Signé le" required>
          {(a) => (
            <Input
              {...a}
              type="date"
              max={today()}
              value={f.signed_on}
              onChange={(e) => setF({ ...f, signed_on: e.target.value })}
            />
          )}
        </Field>
        <Field label="Entrée en vigueur" hint="Par défaut, la date de signature.">
          {(a) => (
            <Input
              {...a}
              type="date"
              value={f.effective_on}
              onChange={(e) => setF({ ...f, effective_on: e.target.value })}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

function AmendDialog({ agreement, onClose }: { agreement: Detail; onClose: () => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", content: "", new_end_on: "" });
  const go = useMutation({
    mutationFn: () =>
      api.post<Detail>(`/api/agreements/${agreement.id}/amend`, { ...f, new_end_on: f.new_end_on || null }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["agreements"] });
      qc.invalidateQueries({ queryKey: ["agreement", agreement.id] });
      toast.success(`Avenant n° ${r.amendment_no} en préparation`);
      onClose();
      nav(`/conventions/${r.id}`);
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={`Préparer un avenant à ${agreement.reference}`}
      description="L'avenant suit le même circuit que l'accord. À son entrée en vigueur, la nouvelle échéance s'applique à l'accord."
      width={560}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!f.title.trim()} loading={go.isPending} onClick={() => go.mutate()}>
            Créer l'avenant
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label="Objet" required>
          {(a) => <Input {...a} autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}
        </Field>
        <Field label="Texte">
          {(a) => (
            <Textarea {...a} rows={5} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
          )}
        </Field>
        <Field label="Nouvelle échéance" hint="Facultatif : pour un avenant de prolongation.">
          {(a) => (
            <Input
              {...a}
              type="date"
              value={f.new_end_on}
              onChange={(e) => setF({ ...f, new_end_on: e.target.value })}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

function TerminateDialog({
  agreement,
  onClose,
  onDone,
}: {
  agreement: Detail;
  onClose: () => void;
  onDone: (r: Detail) => void;
}) {
  const [f, setF] = useState({ reason: "", ended_on: today() });
  const go = useMutation({
    mutationFn: () => api.post<Detail>(`/api/agreements/${agreement.id}/terminate`, f),
    onSuccess: (r) => {
      onDone(r);
      toast.success("Accord résilié");
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={`Résilier ${agreement.reference}`}
      description="La résiliation est définitive et tracée ; l'accord reste au registre."
      width={500}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="danger" disabled={!f.reason.trim()} loading={go.isPending} onClick={() => go.mutate()}>
            Résilier
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label="Motif" required>
          {(a) => <Textarea {...a} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />}
        </Field>
        <Field label="Date d'effet" required>
          {(a) => (
            <Input {...a} type="date" value={f.ended_on} onChange={(e) => setF({ ...f, ended_on: e.target.value })} />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

// ------------------------------------------------------------------ pièces de collaboration
export function DocumentsPanel({
  partnerId,
  agreementId,
  documents,
  agreements,
  canAdd,
  onChange,
}: {
  partnerId: string;
  agreementId?: string;
  documents: PartnerDocument[];
  agreements?: { id: string; reference: string | null; title: string }[];
  canAdd: boolean;
  onChange: () => void;
}) {
  const { data: refs } = useReferentials();
  const { data: me } = useMe();
  const can = useCan();
  const natures = refs?.partner_doc_nature ?? [];
  const [nature, setNature] = useState("");
  const [target, setTarget] = useState(agreementId ?? "");
  const file = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState<PartnerDocument | null>(null);
  const upload = useMutation({
    mutationFn: (f: File) =>
      api.upload(
        `/api/partners/${partnerId}/documents?nature=${encodeURIComponent(nature)}${target ? `&agreement_id=${target}` : ""}`,
        f,
      ),
    onSuccess: () => {
      onChange();
      toast.success("Pièce jointe");
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/partner-documents/${id}`),
    onSuccess: () => {
      onChange();
      toast.success("Pièce supprimée");
    },
    onError: fail,
  });
  const natureOf = (c: string) => natures.find((n) => n.code === c);
  return (
    <Section title={agreementId ? "Pièces de l'accord" : "Pièces de collaboration"}>
      {documents.length ? (
        <ul className="divide-y divide-line">
          {documents.map((doc) => {
            const ag = agreements?.find((x) => x.id === doc.agreement_id);
            const deletable = !doc.official && (can("partners.manage") || doc.uploader_id === me?.id);
            return (
              <li key={doc.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-[13px]">
                <FileText className="size-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{doc.filename}</span>
                  <span className="block text-[12px] text-muted">
                    {natureOf(doc.nature_code)?.label ?? doc.nature_code}
                    {doc.official && " · officielle"}
                    {ag && ` · ${ag.reference ?? ag.title}`} · {kb(doc.size)} · {frDate(doc.created_at.slice(0, 10))}
                    {doc.uploader_name && ` · ${doc.uploader_name}`}
                  </span>
                </span>
                <a
                  href={`/api/partner-documents/${doc.id}`}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg"
                  aria-label={`Télécharger ${doc.filename}`}
                  title="Télécharger"
                >
                  <Download className="size-4" />
                </a>
                {deletable && (
                  <IconButton label="Supprimer la pièce" onClick={() => setRemoving(doc)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty icon={<Paperclip className="size-6" />} title="Aucune pièce">
          Conventions signées, avenants, rapports, comptes rendus : chaque pièce est rangée par nature.
        </Empty>
      )}
      {canAdd && (
        <div className="grid gap-2 border-t border-line p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Select aria-label="Nature de la pièce" value={nature} onChange={(e) => setNature(e.target.value)}>
            <option value="">Nature de la pièce…</option>
            {natures
              .filter((n) => !n.archived)
              .map((n) => (
                <option key={n.code} value={n.code}>
                  {n.label}
                  {n.props.official ? " (officielle)" : ""}
                </option>
              ))}
          </Select>
          {agreementId ? (
            <span />
          ) : (
            <Select aria-label="Accord concerné" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Aucun accord en particulier</option>
              {agreements?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.reference ?? "En préparation"} — {x.title}
                </option>
              ))}
            </Select>
          )}
          <Button
            icon={<Upload className="size-4" />}
            disabled={!nature}
            loading={upload.isPending}
            onClick={() => file.current?.click()}
          >
            Joindre
          </Button>
          <input
            ref={file}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              e.target.value = "";
            }}
          />
          {natureOf(nature)?.props.official && (
            <p className="text-[12px] text-muted sm:col-span-3">
              Une pièce officielle reste au dossier : elle ne pourra pas être supprimée.
            </p>
          )}
        </div>
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={`Supprimer « ${removing?.filename} » ?`}
        description="La suppression est tracée."
        confirmLabel="Supprimer"
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </Section>
  );
}

// ------------------------------------------------------------------ onglet Accords de la fiche partenaire
export function PartnerAgreements({
  partner,
  agreements,
  canCreate,
}: {
  partner: { id: string; name: string };
  agreements: (Pick<
    AgreementRow,
    "id" | "reference" | "type_code" | "title" | "state" | "end_on" | "tacit_renewal" | "amendment_no"
  > & {
    lead: boolean;
    signed_on: string | null;
  })[];
  canCreate: boolean;
}) {
  const nav = useNavigate();
  const { data: refs } = useReferentials();
  const [creating, setCreating] = useState(false);
  return (
    <Section
      title="Accords"
      aside={
        canCreate && (
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Nouvel accord
          </Button>
        )
      }
    >
      {agreements.length ? (
        <Table head={["Numéro", "Accord", "État", "Signé le", "Échéance"]}>
          {agreements.map((a) => (
            <Tr key={a.id} onClick={() => nav(`/conventions/${a.id}`)}>
              <Td className="whitespace-nowrap font-mono text-[12px] text-muted">{a.reference ?? "—"}</Td>
              <Td className="min-w-[200px]">
                <span className="block font-medium">
                  {a.amendment_no ? `Avenant n° ${a.amendment_no} — ` : ""}
                  {a.title}
                </span>
                <TypeTag value={refs?.agreement_type.find((t) => t.code === a.type_code)} code={a.type_code} />
              </Td>
              <Td>
                <Status label={AGREEMENT_STATE[a.state].label} tone={AGREEMENT_STATE[a.state].tone} />
              </Td>
              <Td className="tabular text-muted">{frDate(a.signed_on)}</Td>
              <Td>
                <EndOn a={a} />
              </Td>
            </Tr>
          ))}
        </Table>
      ) : (
        <Empty icon={<ScrollText className="size-6" />} title="Aucun accord">
          Préparez une convention, un protocole ou un accord de financement avec ce partenaire.
        </Empty>
      )}
      {creating && <NewAgreement partner={partner} onClose={() => setCreating(false)} />}
    </Section>
  );
}
