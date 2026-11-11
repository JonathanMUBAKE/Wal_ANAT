import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  CircleDot,
  Globe,
  Handshake,
  History,
  Lock,
  Mail,
  Pencil,
  MessageSquarePlus,
  Plus,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  ConfirmDialog,
  Dialog,
  Empty,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  cn,
} from "@/components/ui";
import {
  Field,
  Input,
  LoadingRows,
  PageHeader,
  PeopleSelect,
  Section,
  Select,
  Status,
  Table,
  Tabs,
  Td,
  Textarea,
  Tr,
  frDate,
  type Tone,
} from "@/components/gov";
import { ApiError, api } from "@/lib/api";
import { type AgreementRow, PartnerAgreements } from "./Agreements";
import { DocumentsPanel, type PartnerDocument, partnerDocs } from "@/components/documents";
import { DossiersTab, MailTab, MeetingsTab, type PartnerLinks } from "./PartnerLinks";
import { useCan, useMe, useUnits, useUsers } from "@/lib/hooks";
import { RoundBtn } from "@/components/collection";
import { AddTypeButton, RefSelect } from "@/components/refselect";
import { Fact, Facts, LongText, RecordActions, RowActions, useRecord } from "@/components/record";
import { HUES, REF_ICONS, type RefValue, useReferentials } from "@/lib/referentials";

/* Partenariats › Partenaires — lot PA1 (docs/CONCEPTION.md, partie 4) : l'annuaire unique des tiers de l'institution. */

export type PartnerState = "identifie" | "en_discussion" | "actif" | "suspendu" | "clos";
export const PARTNER_STATE: Record<PartnerState, { label: string; tone: Tone }> = {
  identifie: { label: "Identifié", tone: "neutral" },
  en_discussion: { label: "En discussion", tone: "info" },
  actif: { label: "Actif", tone: "success" },
  suspendu: { label: "Suspendu", tone: "warning" },
  clos: { label: "Clos", tone: "neutral" },
};
/** Libellé de l'action qui mène à chaque état. */
const MOVE_LABEL: Record<PartnerState, string> = {
  identifie: "Revenir à « Identifié »",
  en_discussion: "Ouvrir la discussion",
  actif: "Déclarer la relation active",
  suspendu: "Suspendre la relation",
  clos: "Clore la relation",
};

interface Partner {
  id: string;
  name: string;
  acronym: string;
  official_id: string;
  type_code: string;
  categories: string[];
  state: PartnerState;
  state_reason: string;
  country: string;
  city: string;
  address: string;
  website: string;
  email: string;
  phone: string;
  description: string;
  unit_id: string | null;
  unit_name: string | null;
  focal_id: string | null;
  focal_name: string | null;
  focal_ids: string[];
  confidential: boolean;
  merged_into: string | null;
  merged_into_name: string | null;
  contacts_count: number;
  deletable: boolean;
  last_note_on: string | null;
  created_at: string;
  closed_at: string | null;
}
interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  notes: string;
  principal: boolean;
  archived: boolean;
  /** Jamais cité (courrier, réunion) : il peut être supprimé ; sinon il s'archive. */
  deletable: boolean;
}
interface HistoryItem {
  id: string;
  kind: "created" | "state" | "note" | "merged" | "absorbed" | "contact" | "updated" | "agreement" | "document";
  body: string;
  happened_on: string;
  data: { from?: PartnerState; to?: PartnerState };
  author_name: string | null;
  created_at: string;
}
interface Detail extends Partner, PartnerLinks {
  focals: { id: string; name: string }[];
  agreements: (AgreementRow & { lead: boolean })[];
  documents: PartnerDocument[];
  contacts: Contact[];
  notes: HistoryItem[];
  history: HistoryItem[];
  can: { edit: boolean; manage: boolean; states: PartnerState[]; delete: boolean };
}

const fail = (e: unknown) => toast.error((e as Error).message);
const today = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------------ pays (norme ISO, noms en français)
const REGIONS = new Intl.DisplayNames(["fr"], { type: "region" });
export const countryName = (c: string) => (c ? (REGIONS.of(c) ?? c) : "");
const COUNTRIES = (() => {
  const out: { code: string; name: string }[] = [];
  for (let a = 65; a <= 90; a++)
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      const name = REGIONS.of(code);
      if (name && name !== code) out.push({ code, name });
    }
  return out.sort((x, y) => x.name.localeCompare(y.name, "fr"));
})();

function CountrySelect({
  value,
  onChange,
  ...a
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <Select {...a} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Non précisé</option>
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </Select>
  );
}

/** Repère d'une valeur de référentiel : pastille de couleur, icône et libellé (jamais la couleur seule). */
function RefTag({ value, code }: { value?: RefValue; code: string }) {
  const Icon = REF_ICONS[value?.icon ?? "circle"] ?? REF_ICONS.circle;
  const hue = HUES[value?.color ?? "slate"] ?? HUES.slate;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line px-1.5 py-0.5 text-[12px]">
      <Icon className="size-3 shrink-0" style={{ color: hue }} />
      <span className="truncate">{value?.label ?? code}</span>
    </span>
  );
}

// ------------------------------------------------------------------ annuaire
type TabId = "open" | PartnerState;

export function PartnersPage() {
  const can = useCan();
  const nav = useNavigate();
  const { data: refs } = useReferentials();
  const [tab, setTab] = useState<TabId>("open");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Partner | null>(null);
  const { data: me } = useMe();
  const manager = can("partners.manage");
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/partners/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Fiche supprimée");
    },
    onError: fail,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: () => api.get<Partner[]>("/api/partners"),
  });
  const types = refs?.partner_type ?? [];
  const cats = refs?.partner_category ?? [];
  const typeOf = (c: string) => types.find((t) => t.code === c);
  const key = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const rows = (data ?? []).filter(
    (p) =>
      (tab === "open" ? p.state !== "clos" : p.state === tab) &&
      (!type || p.type_code === type) &&
      (!category || p.categories.includes(category)) &&
      (!q.trim() || key(`${p.name} ${p.acronym}`).includes(key(q.trim()))),
  );
  const count = (s: PartnerState) => data?.filter((p) => p.state === s).length;
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={Handshake}
        crumbs={["Partenariats", "Partenaires"]}
        title="Partenaires"
        subtitle="L'annuaire unique des tiers de l'Agence : institutions, entreprises, établissements publics, bailleurs… avec qui nous travaillons, et où en est chaque relation."
        actions={
          can("partners.manage") && (
            <>
              <Button icon={<ArrowRightLeft className="size-4" />} onClick={() => nav("/partenaires/rapprochement")}>
                Rapprocher l'existant
              </Button>
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Nouveau partenaire
              </Button>
            </>
          )
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "open" as const, label: "En cours", badge: data?.filter((p) => p.state !== "clos").length },
          { id: "actif" as const, label: "Actifs", badge: count("actif") },
          { id: "en_discussion" as const, label: "En discussion", badge: count("en_discussion") },
          { id: "identifie" as const, label: "Identifiés", badge: count("identifie") },
          { id: "suspendu" as const, label: "Suspendus", badge: count("suspendu") },
          { id: "clos" as const, label: "Clos", badge: count("clos") },
        ]}
      />
      <div className="mx-auto max-w-[1240px] space-y-3 p-4 sm:px-8 sm:py-6">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_260px]">
          <Input
            aria-label="Rechercher un partenaire"
            placeholder="Rechercher par nom ou sigle…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tous les types</option>
            {types.map((t) => (
              <option key={t.code} value={t.code}>
                {t.plural || t.label}
              </option>
            ))}
          </Select>
          <Select aria-label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Toutes les catégories</option>
            {cats.map((c) => (
              <option key={c.code} value={c.code}>
                {c.plural || c.label}
              </option>
            ))}
          </Select>
        </div>
        <Section>
          {isLoading ? (
            <LoadingRows />
          ) : rows.length ? (
            <Table head={["Partenaire", "État", "Type", "Catégories", "Point focal", "Dernier échange", ""]}>
              {rows.map((p) => (
                <Tr key={p.id} onClick={() => nav(`/partenaires/${p.id}`)}>
                  <Td className="min-w-[220px]">
                    <span className="flex items-center gap-1.5 font-medium">
                      {p.name}
                      {p.confidential && <Lock aria-label="Confidentiel" className="size-3 shrink-0 text-warning" />}
                    </span>
                    <span className="block text-[12px] text-muted">
                      {[
                        p.acronym,
                        countryName(p.country),
                        p.contacts_count ? `${p.contacts_count} contact${p.contacts_count > 1 ? "s" : ""}` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ") || " "}
                    </span>
                  </Td>
                  <Td>
                    <Status label={PARTNER_STATE[p.state].label} tone={PARTNER_STATE[p.state].tone} />
                  </Td>
                  <Td>
                    <RefTag value={typeOf(p.type_code)} code={p.type_code} />
                  </Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      {p.categories.length
                        ? p.categories.map((c) => <RefTag key={c} value={cats.find((x) => x.code === c)} code={c} />)
                        : "—"}
                    </span>
                  </Td>
                  <Td className="text-muted">{p.focal_name ?? "—"}</Td>
                  <Td className="tabular text-muted">{frDate(p.last_note_on)}</Td>
                  <Td>
                    <RowActions
                      label={p.name}
                      onView={() => nav(`/partenaires/${p.id}`)}
                      onEdit={() => nav(`/partenaires/${p.id}?modifier=1`)}
                      canEdit={manager || p.focal_id === me?.id || p.focal_ids.includes(me?.id ?? "")}
                      onDelete={() => setRemoving(p)}
                      canDelete={manager && p.deletable}
                    />
                  </Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <Empty
              icon={<Handshake className="size-6" />}
              title={data?.length ? "Aucun partenaire ne correspond" : "Aucun partenaire"}
            >
              {data?.length
                ? "Modifiez la recherche ou les filtres."
                : "Enregistrez les institutions, entreprises, établissements publics et bailleurs avec qui l'Agence travaille."}
            </Empty>
          )}
        </Section>
      </div>
      {creating && <NewPartner onClose={() => setCreating(false)} />}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={`Supprimer « ${removing?.name} » ?`}
        description="Cette fiche n'a aucune histoire (ni échange, ni accord, ni lien) : elle peut être supprimée. Une fiche qui a vécu se clôt. La suppression est tracée."
        confirmLabel="Supprimer"
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </div>
  );
}

function CategoryChecks({
  values,
  selected,
  onChange,
  disabled,
}: {
  values: RefValue[];
  selected: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="grid gap-1.5 sm:grid-cols-2" disabled={disabled}>
      <legend className="mb-1.5 text-[12.5px] font-medium text-muted">Catégories</legend>
      {values
        .filter((c) => !c.archived || selected.includes(c.code))
        .map((c) => (
          <label key={c.code} className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={selected.includes(c.code)}
              onChange={(e) =>
                onChange(e.target.checked ? [...selected, c.code] : selected.filter((x) => x !== c.code))
              }
            />
            {c.label}
          </label>
        ))}
      {!disabled && (
        <span className="sm:col-span-2">
          <AddTypeButton list="partner_category" onCreated={(v) => onChange([...selected, v.code])} />
        </span>
      )}
    </fieldset>
  );
}

function NewPartner({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const { data: refs } = useReferentials();
  const [f, setF] = useState({
    name: "",
    acronym: "",
    type_code: "",
    categories: [] as string[],
    country: "",
    focal_id: "",
    unit_id: "",
    confidential: false,
  });
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);
  const set = (k: "name" | "acronym" | "type_code" | "unit_id") => (e: { target: { value: string } }) => {
    setF({ ...f, [k]: e.target.value });
    setDuplicate(null);
  };
  const create = useMutation({
    mutationFn: () =>
      api.post<Detail>("/api/partners", {
        ...f,
        focal_id: f.focal_id || null,
        unit_id: f.unit_id || null,
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Partenaire enregistré");
      nav(`/partenaires/${p.id}`);
    },
    onError: (e) => {
      // Un doublon renvoie vers la fiche existante plutôt que d'en créer une seconde
      if (e instanceof ApiError && e.status === 409) {
        const found = e.data?.duplicate as { id: string; name: string } | undefined;
        setDuplicate(found ?? { id: "", name: "" });
        return;
      }
      fail(e);
    },
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Nouveau partenaire"
      description="La fiche est créée à l'état « Identifié ». Un nom, un sigle ou un identifiant déjà présents dans l'annuaire sont refusés."
      width={600}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            loading={create.isPending}
            disabled={!f.name.trim() || !f.type_code}
            onClick={() => create.mutate()}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nom" required className="sm:col-span-2">
          {(a) => <Input {...a} autoFocus value={f.name} onChange={set("name")} />}
        </Field>
        <Field label="Sigle">{(a) => <Input {...a} value={f.acronym} onChange={set("acronym")} />}</Field>
        <Field label="Type" required>
          {(a) => (
            <RefSelect
              {...a}
              list="partner_type"
              value={f.type_code}
              onChange={(type_code) => setF({ ...f, type_code })}
            />
          )}
        </Field>
        <div className="sm:col-span-2">
          <CategoryChecks
            values={refs?.partner_category ?? []}
            selected={f.categories}
            onChange={(categories) => setF({ ...f, categories })}
          />
        </div>
        <Field label="Pays">
          {(a) => <CountrySelect {...a} value={f.country} onChange={(country) => setF({ ...f, country })} />}
        </Field>
        <Field label="Point focal" hint="L'agent de l'Agence qui suit la relation.">
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
        <Field label="Entité porteuse">
          {(a) => (
            <Select {...a} value={f.unit_id} onChange={set("unit_id")}>
              <option value="">Aucune</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-[13px]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={f.confidential}
            onChange={(e) => setF({ ...f, confidential: e.target.checked })}
          />
          Fiche confidentielle
        </label>
        {duplicate && (
          <p
            role="alert"
            className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] sm:col-span-2"
          >
            Ce partenaire existe déjà dans l'annuaire.{" "}
            {duplicate.id && (
              <Link
                to={`/partenaires/${duplicate.id}`}
                className="font-medium text-primary hover:underline"
                onClick={onClose}
              >
                Ouvrir la fiche « {duplicate.name} »
              </Link>
            )}
          </p>
        )}
      </div>
    </Dialog>
  );
}

// ------------------------------------------------------------------ fiche
type DetailTab = "overview" | "agreements" | "dossiers" | "meetings" | "mail" | "contacts" | "documents" | "history";

export function PartnerPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { data: refs } = useReferentials();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const [tab, setTab] = useState<DetailTab>("overview");
  const {
    data: p,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["partner", id],
    queryFn: () => api.get<Detail>(`/api/partners/${id}`),
  });
  const rec = useRecord(p);
  const d = rec.draft;
  const [moving, setMoving] = useState<PartnerState | null>(null);
  const [merging, setMerging] = useState(false);
  const [removing, setRemoving] = useState(false);
  // « Modifier » depuis la grille de l'annuaire : la fiche s'ouvre directement en modification
  useEffect(() => {
    if (p && params.get("modifier") === "1") {
      if (p.can.edit) {
        setTab("overview");
        rec.edit();
      }
      setParams({}, { replace: true });
    }
  }, [p, params, setParams, rec]);
  const refresh = (r: Detail) => {
    qc.setQueryData(["partner", r.id], r);
    qc.invalidateQueries({ queryKey: ["partners"] });
  };
  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        name: d!.name,
        acronym: d!.acronym,
        official_id: d!.official_id,
        country: d!.country,
        city: d!.city,
        address: d!.address,
        website: d!.website,
        email: d!.email,
        phone: d!.phone,
        description: d!.description,
      };
      // Le classement et les points focaux ne partent que s'ils sont modifiables
      if (d!.can.manage)
        Object.assign(body, {
          type_code: d!.type_code,
          categories: d!.categories,
          unit_id: d!.unit_id,
          focal_id: d!.focal_id,
          focal_ids: d!.focal_ids,
          confidential: d!.confidential,
        });
      return api.patch<Detail>(`/api/partners/${id}`, body);
    },
    onSuccess: (r) => {
      rec.done();
      refresh(r);
      toast.success("Fiche enregistrée");
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/api/partners/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Fiche supprimée");
      nav("/partenaires");
    },
    onError: fail,
  });
  if (isLoading || (!d && !error)) return <LoadingRows rows={8} />;
  if (error || !d) return <Empty title="Partenaire inaccessible">{(error as Error)?.message}</Empty>;
  const editing = rec.editing;
  const text = (k: "name" | "acronym" | "official_id" | "city" | "address" | "website" | "email" | "phone") => ({
    value: d[k],
    onChange: (e: { target: { value: string } }) => rec.patch({ [k]: e.target.value }),
  });
  const S = PARTNER_STATE[d.state];
  const types = refs?.partner_type ?? [];
  const people = users?.filter((u) => !u.is_ai) ?? [];
  const startEdit = () => {
    setTab("overview");
    rec.edit();
  };
  return (
    <div className="min-h-full pb-10">
      <PageHeader
        crumbs={["Partenariats", "Partenaires", d.acronym || d.name]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link to="/partenaires" aria-label="Retour à l'annuaire" className="text-muted hover:text-fg">
              <ArrowLeft className="size-5" />
            </Link>
            {p?.name}
            {p?.acronym && <span className="text-[16px] font-medium text-muted">({p.acronym})</span>}
            {d.confidential && <Lock aria-label="Confidentiel" className="size-4 text-warning" />}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            <RefTag value={types.find((t) => t.code === p?.type_code)} code={p?.type_code ?? ""} />
            {p?.categories.map((c) => (
              <RefTag key={c} value={refs?.partner_category.find((x) => x.code === c)} code={c} />
            ))}
          </span>
        }
        actions={
          <>
            <Status label={S.label} tone={S.tone} />
            {!editing && d.can.states.length > 0 && (
              <Menu>
                <MenuTrigger asChild>
                  <Button icon={<CircleDot className="size-4" />}>Changer l'état</Button>
                </MenuTrigger>
                <MenuContent align="end">
                  {d.can.states.map((s) => (
                    <MenuItem key={s} danger={s === "clos" || s === "suspendu"} onSelect={() => setMoving(s)}>
                      {d.state === "clos" ? "Rouvrir la relation" : MOVE_LABEL[s]}
                    </MenuItem>
                  ))}
                </MenuContent>
              </Menu>
            )}
            {!editing && d.can.manage && (
              <IconButton label="Fusionner avec une autre fiche" onClick={() => setMerging(true)}>
                <ArrowRightLeft className="size-4" />
              </IconButton>
            )}
            {!editing && d.can.delete && (
              <IconButton label="Supprimer la fiche" onClick={() => setRemoving(true)}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
            <RecordActions
              editing={editing}
              canEdit={d.can.edit}
              onEdit={startEdit}
              onCancel={rec.cancel}
              onSave={() => save.mutate()}
              saving={save.isPending}
              disabled={!rec.dirty || !d.name.trim()}
            />
          </>
        }
      />
      {d.merged_into && (
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <p className="mb-3 rounded-xl border border-line bg-hover/50 px-4 py-3 text-[13px]">
            Cette fiche a été fusionnée dans{" "}
            <Link to={`/partenaires/${d.merged_into}`} className="font-medium text-primary hover:underline">
              « {d.merged_into_name} »
            </Link>
            . Elle reste consultable mais ne se modifie plus.
          </p>
        </div>
      )}
      {!editing && (
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "overview" as const, label: "Vue d'ensemble" },
            { id: "agreements" as const, label: "Accords", badge: d.agreements.length },
            { id: "dossiers" as const, label: "Dossiers", badge: d.dossiers.length + d.contracts.length },
            { id: "meetings" as const, label: "Réunions", badge: d.meetings.length },
            { id: "mail" as const, label: "Courrier", badge: d.mail.length },
            { id: "contacts" as const, label: "Contacts", badge: d.contacts.filter((c) => !c.archived).length },
            { id: "documents" as const, label: "Documents", badge: d.documents.length },
            { id: "history" as const, label: "Historique", badge: d.notes.length },
          ]}
        />
      )}
      {editing && (
        <p className="mx-auto max-w-[1240px] px-4 text-[13px] text-muted sm:px-8">
          Modification de la fiche : enregistrez pour valider, ou annulez pour revenir à la lecture sans rien changer.
        </p>
      )}
      <div
        className={cn(
          "mx-auto grid max-w-[1240px] grid-cols-1 gap-4 p-4 sm:px-8",
          tab === "overview" && "lg:grid-cols-[minmax(0,1fr)_340px]",
        )}
      >
        <div className="min-w-0 space-y-4">
          {tab === "overview" &&
            (editing ? (
              <>
                <Section title="Présentation">
                  <div className="p-4 pt-2">
                    <Textarea
                      aria-label="Présentation du partenaire"
                      rows={4}
                      placeholder="Mission, domaines d'intervention, programmes en cours…"
                      value={d.description}
                      onChange={(e) => rec.patch({ description: e.target.value })}
                    />
                  </div>
                </Section>
                <Section title="Identification">
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <Field
                      label="Nom"
                      required
                      className="sm:col-span-2"
                      error={!d.name.trim() ? "Le nom est obligatoire" : null}
                    >
                      {(a) => <Input {...a} {...text("name")} />}
                    </Field>
                    <Field label="Sigle">{(a) => <Input {...a} {...text("acronym")} />}</Field>
                    <Field label="Identifiant officiel" hint="NIF, RCCM, numéro d'enregistrement…">
                      {(a) => <Input {...a} {...text("official_id")} />}
                    </Field>
                    <Field
                      label="Type"
                      required
                      hint={!d.can.manage ? "Le classement revient aux gestionnaires des partenariats." : undefined}
                    >
                      {(a) => (
                        <RefSelect
                          {...a}
                          list="partner_type"
                          disabled={!d.can.manage}
                          value={d.type_code}
                          onChange={(type_code) => type_code && rec.patch({ type_code })}
                        />
                      )}
                    </Field>
                    <Field label="Entité porteuse">
                      {(a) => (
                        <Select
                          {...a}
                          disabled={!d.can.manage}
                          value={d.unit_id ?? ""}
                          onChange={(e) => rec.patch({ unit_id: e.target.value || null })}
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
                    <div className="sm:col-span-2">
                      <CategoryChecks
                        values={refs?.partner_category ?? []}
                        selected={d.categories}
                        disabled={!d.can.manage}
                        onChange={(categories) => rec.patch({ categories })}
                      />
                    </div>
                  </div>
                </Section>
                <Section title="Coordonnées">
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <Field label="Pays">
                      {(a) => <CountrySelect {...a} value={d.country} onChange={(country) => rec.patch({ country })} />}
                    </Field>
                    <Field label="Ville">{(a) => <Input {...a} {...text("city")} />}</Field>
                    <Field label="Adresse" className="sm:col-span-2">
                      {(a) => <Input {...a} {...text("address")} />}
                    </Field>
                    <Field label="Site">{(a) => <Input {...a} {...text("website")} placeholder="https://" />}</Field>
                    <Field label="Courriel">{(a) => <Input {...a} type="email" {...text("email")} />}</Field>
                    <Field label="Téléphone">{(a) => <Input {...a} {...text("phone")} />}</Field>
                  </div>
                </Section>
              </>
            ) : (
              <>
                <Section title="Présentation">
                  <div className="p-5 pt-2">
                    <LongText empty="Aucune présentation : « Modifier » pour la rédiger.">{d.description}</LongText>
                  </div>
                </Section>
                <Section title="Identification">
                  <Facts>
                    <Fact label="Nom" wide>
                      {d.name}
                    </Fact>
                    <Fact label="Sigle">{d.acronym}</Fact>
                    <Fact label="Identifiant officiel">{d.official_id}</Fact>
                    <Fact label="Type">
                      <RefTag value={types.find((t) => t.code === d.type_code)} code={d.type_code} />
                    </Fact>
                    <Fact label="Entité porteuse">{d.unit_name}</Fact>
                    <Fact label="Catégories" wide>
                      {d.categories.length ? (
                        <span className="flex flex-wrap gap-1.5">
                          {d.categories.map((c) => (
                            <RefTag key={c} value={refs?.partner_category.find((x) => x.code === c)} code={c} />
                          ))}
                        </span>
                      ) : null}
                    </Fact>
                  </Facts>
                </Section>
                <Section title="Coordonnées">
                  <Facts>
                    <Fact label="Pays">{countryName(d.country)}</Fact>
                    <Fact label="Ville">{d.city}</Fact>
                    <Fact label="Adresse" wide>
                      {d.address}
                    </Fact>
                    <Fact label="Site">
                      {d.website && (
                        <a href={d.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {d.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </Fact>
                    <Fact label="Courriel">
                      {d.email && (
                        <a href={`mailto:${d.email}`} className="text-primary hover:underline">
                          {d.email}
                        </a>
                      )}
                    </Fact>
                    <Fact label="Téléphone">{d.phone}</Fact>
                  </Facts>
                </Section>
              </>
            ))}
          {tab === "contacts" && <ContactsTab partner={d} onChange={refresh} />}
          {tab === "history" && <HistoryTab partner={d} onChange={refresh} />}
          {tab === "agreements" && (
            <PartnerAgreements
              partner={d}
              agreements={d.agreements}
              canCreate={d.can.edit && d.state !== "suspendu" && d.state !== "clos"}
            />
          )}
          {tab === "dossiers" && <DossiersTab links={d} />}
          {tab === "meetings" && <MeetingsTab partner={d} links={d} />}
          {tab === "mail" && <MailTab links={d} />}
          {tab === "documents" && (
            <DocumentsPanel
              ends={partnerDocs(d.id)}
              documents={d.documents}
              agreements={d.agreements}
              canAdd={d.can.edit}
              onChange={() => qc.invalidateQueries({ queryKey: ["partner", id] })}
            />
          )}
        </div>
        {tab === "overview" && (
          <aside className="space-y-4">
            <Section title="Suivi de la relation">
              {editing && d.can.manage ? (
                <div className="space-y-3 p-4 pt-2 text-[13px]">
                  <Field label="Point focal">
                    {(a) => (
                      <PeopleSelect
                        {...a}
                        people={people}
                        placeholder="Non désigné"
                        value={d.focal_id}
                        onChange={(v) =>
                          rec.patch({ focal_id: v || null, focal_ids: d.focal_ids.filter((x) => x !== v) })
                        }
                      />
                    )}
                  </Field>
                  <div>
                    <p className="mb-1.5 text-[12.5px] font-medium text-muted">Autres points focaux</p>
                    <FocalPicker
                      people={people.filter((u) => u.id !== d.focal_id)}
                      value={d.focal_ids}
                      onChange={(focal_ids) => rec.patch({ focal_ids })}
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary)]"
                      checked={d.confidential}
                      onChange={(e) => rec.patch({ confidential: e.target.checked })}
                    />
                    Fiche confidentielle
                  </label>
                </div>
              ) : (
                <Facts className="sm:grid-cols-1">
                  <Fact label="État">
                    <Status label={S.label} tone={S.tone} />
                    {d.state_reason && (
                      <span className="mt-1 block text-[12.5px] font-normal text-muted">{d.state_reason}</span>
                    )}
                  </Fact>
                  <Fact label="Point focal">{d.focal_name}</Fact>
                  <Fact label="Autres points focaux">{d.focals.map((f) => f.name).join(", ")}</Fact>
                  <Fact label="Dernier échange">{d.last_note_on && frDate(d.last_note_on)}</Fact>
                  <Fact label="Dans l'annuaire depuis">{frDate(d.created_at.slice(0, 10))}</Fact>
                  {d.confidential && <Fact label="Diffusion">Fiche confidentielle</Fact>}
                </Facts>
              )}
            </Section>
          </aside>
        )}
      </div>
      {moving && <StateDialog partner={d} target={moving} onClose={() => setMoving(null)} onDone={refresh} />}
      {merging && <MergeDialog partner={d} onClose={() => setMerging(false)} />}
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={`Supprimer « ${d.name} » ?`}
        description="La fiche n'a jamais quitté l'état « Identifié » et ne porte aucun échange : elle peut être supprimée. Cette action est tracée."
        confirmLabel="Supprimer"
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}

function FocalPicker({
  people,
  value,
  onChange,
}: {
  people: { id: string; name: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [adding, setAdding] = useState("");
  return (
    <div className="space-y-1.5">
      {value.map((u) => (
        <span
          key={u}
          className="flex items-center justify-between gap-2 rounded-lg border border-line px-2 py-1 font-normal"
        >
          {people.find((p) => p.id === u)?.name ?? u}
          <button
            type="button"
            className="text-[12px] text-muted hover:text-danger"
            onClick={() => onChange(value.filter((x) => x !== u))}
          >
            Retirer
          </button>
        </span>
      ))}
      <PeopleSelect
        aria-label="Ajouter un point focal"
        people={people.filter((p) => !value.includes(p.id))}
        placeholder="Ajouter…"
        value={adding}
        onChange={(v) => {
          if (v) onChange([...value, v]);
          setAdding("");
        }}
      />
    </div>
  );
}

function StateDialog({
  partner,
  target,
  onClose,
  onDone,
}: {
  partner: Detail;
  target: PartnerState;
  onClose: () => void;
  onDone: (r: Detail) => void;
}) {
  const [reason, setReason] = useState("");
  const needed = target === "suspendu" || target === "clos" || partner.state === "clos";
  const move = useMutation({
    mutationFn: () =>
      api.post<Detail>(`/api/partners/${partner.id}/state`, { state: target, reason: reason.trim() || undefined }),
    onSuccess: (r) => {
      onDone(r);
      toast.success(`Relation « ${PARTNER_STATE[target].label} »`);
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={partner.state === "clos" ? "Rouvrir la relation" : MOVE_LABEL[target]}
      description={`${partner.name} : « ${PARTNER_STATE[partner.state].label} » devient « ${PARTNER_STATE[target].label} ».`}
      width={520}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant={target === "clos" || target === "suspendu" ? "danger" : "primary"}
            disabled={needed && !reason.trim()}
            loading={move.isPending}
            onClick={() => move.mutate()}
          >
            Confirmer
          </Button>
        </>
      }
    >
      <Field
        label="Motif"
        required={needed}
        hint={needed ? "Il est conservé à l'historique de la fiche." : "Facultatif."}
      >
        {(a) => <Textarea {...a} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />}
      </Field>
    </Dialog>
  );
}

function MergeDialog({ partner, onClose }: { partner: Detail; onClose: () => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [into, setInto] = useState("");
  const { data } = useQuery({ queryKey: ["partners"], queryFn: () => api.get<Partner[]>("/api/partners") });
  const others = useMemo(() => (data ?? []).filter((p) => p.id !== partner.id), [data, partner.id]);
  const merge = useMutation({
    mutationFn: () => api.post<Detail>(`/api/partners/${partner.id}/merge`, { into_id: into }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      qc.invalidateQueries({ queryKey: ["partner"] });
      toast.success(`Fiches fusionnées dans « ${r.name} »`);
      onClose();
      nav(`/partenaires/${r.id}`);
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Fusionner un doublon"
      description={`« ${partner.name} » rejoint la fiche choisie : contacts, échanges, catégories et points focaux y sont déplacés. Cette fiche reste consultable et renvoie vers l'autre.`}
      width={540}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="danger" disabled={!into} loading={merge.isPending} onClick={() => merge.mutate()}>
            Fusionner
          </Button>
        </>
      }
    >
      <Field label="Fiche à garder" required>
        {(a) => (
          <Select {...a} value={into} onChange={(e) => setInto(e.target.value)}>
            <option value="">Choisir…</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.acronym ? ` (${p.acronym})` : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </Dialog>
  );
}

// ------------------------------------------------------------------ contacts
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type ContactForm = { name: string; title: string; email: string; phone: string; notes: string; principal: boolean };
const emptyContact: ContactForm = { name: "", title: "", email: "", phone: "", notes: "", principal: false };

function ContactsTab({ partner, onChange }: { partner: Detail; onChange: (r: Detail) => void }) {
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState<{ contact: Contact | null; editing: boolean } | null>(null);
  const [removing, setRemoving] = useState<Contact | null>(null);
  const reload = async () => onChange(await api.get<Detail>(`/api/partners/${partner.id}`));
  const edit = useMutation({
    mutationFn: (v: { id: string; body: Partial<Contact> }) =>
      api.patch<Detail>(`/api/partner-contacts/${v.id}`, v.body),
    onSuccess: (r) => {
      onChange(r);
      qc.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/partner-contacts/${id}`),
    onSuccess: async () => {
      await reload();
      toast.success("Contact supprimé");
    },
    onError: fail,
  });
  const can = partner.can.edit;
  const shown = partner.contacts.filter((c) => showArchived || !c.archived);
  const archived = partner.contacts.filter((c) => c.archived).length;
  return (
    <Section
      title="Personnes chez le partenaire"
      aside={
        <span className="flex items-center gap-3">
          {archived > 0 && (
            <button
              type="button"
              className="text-[12.5px] text-muted hover:text-fg"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? "Masquer les archivés" : `Voir les archivés (${archived})`}
            </button>
          )}
          {can && (
            <Button icon={<Plus className="size-4" />} onClick={() => setOpen({ contact: null, editing: true })}>
              Ajouter un contact
            </Button>
          )}
        </span>
      }
    >
      {shown.length ? (
        <Table head={["Nom", "Fonction", "Courriel", "Téléphone", ""]}>
          {shown.map((c) => (
            <Tr key={c.id} onClick={() => setOpen({ contact: c, editing: false })}>
              <Td className={cn("min-w-[180px]", c.archived && "opacity-60")}>
                <span className="flex items-center gap-1.5 font-medium">
                  {c.name}
                  {c.principal && <Star className="size-3.5 shrink-0 text-primary" aria-label="Contact principal" />}
                </span>
                {c.archived && <span className="text-[12px] text-muted">Archivé</span>}
              </Td>
              <Td className="text-muted">{c.title || "—"}</Td>
              <Td className="text-muted">{c.email || "—"}</Td>
              <Td className="tabular text-muted">{c.phone || "—"}</Td>
              <Td>
                <RowActions
                  label={c.name}
                  onView={() => setOpen({ contact: c, editing: false })}
                  onEdit={() => setOpen({ contact: c, editing: true })}
                  canEdit={can}
                  onDelete={() => setRemoving(c)}
                  canDelete={can && c.deletable}
                >
                  {can && !c.archived && !c.principal && (
                    <RoundBtn
                      label={`Désigner ${c.name} contact principal`}
                      onClick={() => edit.mutate({ id: c.id, body: { principal: true } })}
                    >
                      <Star className="size-4" />
                    </RoundBtn>
                  )}
                  {can && (
                    <RoundBtn
                      label={`${c.archived ? "Réactiver" : "Archiver"} ${c.name}`}
                      onClick={() => edit.mutate({ id: c.id, body: { archived: !c.archived } })}
                    >
                      {c.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                    </RoundBtn>
                  )}
                </RowActions>
              </Td>
            </Tr>
          ))}
        </Table>
      ) : (
        <Empty icon={<Users className="size-6" />} title="Aucun contact">
          Les personnes chez le partenaire n'ont pas de compte dans l'outil : elles sont seulement répertoriées ici.
        </Empty>
      )}
      {open && (
        <ContactDialog
          partner={partner}
          contact={open.contact}
          startEditing={open.editing}
          onClose={() => setOpen(null)}
          onSaved={reload}
        />
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={`Supprimer ${removing?.name} ?`}
        description="Ce contact n'est cité dans aucun courrier ni aucune réunion : il peut être supprimé. La suppression est tracée."
        confirmLabel="Supprimer"
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </Section>
  );
}

/** Fiche d'un contact : lecture, puis « Modifier » ; en création, le formulaire s'ouvre directement. */
function ContactDialog({
  partner,
  contact,
  startEditing,
  onClose,
  onSaved,
}: {
  partner: Detail;
  contact: Contact | null;
  startEditing: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(startEditing || !contact);
  const [f, setF] = useState<ContactForm>(
    contact
      ? {
          name: contact.name,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          notes: contact.notes,
          principal: contact.principal,
        }
      : emptyContact,
  );
  const save = useMutation({
    mutationFn: () =>
      contact
        ? api.patch(`/api/partner-contacts/${contact.id}`, f)
        : api.post(`/api/partners/${partner.id}/contacts`, f),
    onSuccess: async () => {
      await onSaved();
      toast.success(contact ? "Contact modifié" : "Contact ajouté");
      onClose();
    },
    onError: fail,
  });
  const set = (k: "name" | "title" | "email" | "phone" | "notes") => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const badEmail = !!f.email.trim() && !EMAIL.test(f.email.trim());
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={contact ? contact.name : "Ajouter un contact"}
      description={`Contact chez ${partner.acronym || partner.name}`}
      width={540}
      footer={
        editing ? (
          <>
            <Button onClick={contact ? () => setEditing(false) : onClose}>Annuler</Button>
            <Button
              variant="primary"
              disabled={!f.name.trim() || badEmail}
              loading={save.isPending}
              onClick={() => save.mutate()}
            >
              Enregistrer
            </Button>
          </>
        ) : (
          <>
            {partner.can.edit && (
              <Button icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                Modifier
              </Button>
            )}
            <Button onClick={onClose}>Fermer</Button>
          </>
        )
      }
    >
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom" required error={!f.name.trim() && contact ? "Le nom est obligatoire" : null}>
            {(a) => <Input {...a} autoFocus value={f.name} onChange={set("name")} />}
          </Field>
          <Field label="Fonction">{(a) => <Input {...a} value={f.title} onChange={set("title")} />}</Field>
          <Field label="Courriel" error={badEmail ? "Adresse électronique invalide" : null}>
            {(a) => <Input {...a} type="email" value={f.email} onChange={set("email")} />}
          </Field>
          <Field label="Téléphone">{(a) => <Input {...a} value={f.phone} onChange={set("phone")} />}</Field>
          <Field label="Notes" className="sm:col-span-2">
            {(a) => <Textarea {...a} rows={3} value={f.notes} onChange={set("notes")} />}
          </Field>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={f.principal}
              onChange={(e) => setF({ ...f, principal: e.target.checked })}
            />
            Contact principal
          </label>
        </div>
      ) : (
        contact && (
          <Facts className="p-0 pt-0">
            <Fact label="Fonction">{contact.title}</Fact>
            <Fact label="Rôle">{contact.principal ? "Contact principal" : contact.archived ? "Archivé" : null}</Fact>
            <Fact label="Courriel">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                  {contact.email}
                </a>
              )}
            </Fact>
            <Fact label="Téléphone">{contact.phone}</Fact>
            <Fact label="Notes" wide>
              {contact.notes && <span className="whitespace-pre-wrap font-normal">{contact.notes}</span>}
            </Fact>
          </Facts>
        )
      )}
    </Dialog>
  );
}

// ------------------------------------------------------------------ historique
const EVENT: Record<HistoryItem["kind"], { label: string; Icon: typeof History }> = {
  created: { label: "Fiche créée", Icon: Building2 },
  state: { label: "Changement d'état", Icon: CircleDot },
  note: { label: "Échange", Icon: MessageSquarePlus },
  merged: { label: "Fusion", Icon: ArrowRightLeft },
  absorbed: { label: "Fusion", Icon: ArrowRightLeft },
  contact: { label: "Contacts", Icon: Users },
  updated: { label: "Modification", Icon: Globe },
  agreement: { label: "Accord", Icon: Handshake },
  document: { label: "Pièce jointe", Icon: Mail },
};

function HistoryTab({ partner, onChange }: { partner: Detail; onChange: (r: Detail) => void }) {
  const [note, setNote] = useState({ body: "", happened_on: today() });
  const add = useMutation({
    mutationFn: () => api.post<Detail>(`/api/partners/${partner.id}/notes`, note),
    onSuccess: (r) => {
      onChange(r);
      setNote({ body: "", happened_on: today() });
      toast.success("Échange noté");
    },
    onError: fail,
  });
  return (
    <>
      {partner.can.edit && (
        <Section title="Noter un échange">
          <div className="grid gap-3 p-4 pt-2 sm:grid-cols-[minmax(0,1fr)_170px]">
            <Field
              label="Ce qui s'est dit ou fait"
              required
              hint="Appel, visite, mission, courriel… Une note ne se modifie plus."
            >
              {(a) => (
                <Textarea
                  {...a}
                  rows={3}
                  value={note.body}
                  onChange={(e) => setNote({ ...note, body: e.target.value })}
                />
              )}
            </Field>
            <div className="flex flex-col justify-between gap-3">
              <Field label="Date">
                {(a) => (
                  <Input
                    {...a}
                    type="date"
                    max={today()}
                    value={note.happened_on}
                    onChange={(e) => setNote({ ...note, happened_on: e.target.value })}
                  />
                )}
              </Field>
              <Button
                variant="primary"
                disabled={!note.body.trim() || !note.happened_on || note.happened_on > today()}
                loading={add.isPending}
                onClick={() => add.mutate()}
              >
                Noter
              </Button>
            </div>
          </div>
        </Section>
      )}
      <Section title="Fil de la relation">
        <ol className="space-y-0 px-5 pb-5 pt-2">
          {partner.history.map((h) => {
            const E = EVENT[h.kind];
            return (
              <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-muted">
                  <E.Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 pt-1 text-[13px]">
                  <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                    <span className="font-medium text-fg">
                      {h.kind === "state" && h.data.to ? `État : ${PARTNER_STATE[h.data.to].label}` : E.label}
                    </span>
                    <span className="tabular">{frDate(h.happened_on)}</span>
                    {h.author_name && <span>· {h.author_name}</span>}
                  </span>
                  {h.body && <span className="mt-0.5 block whitespace-pre-wrap">{h.body}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </Section>
    </>
  );
}
