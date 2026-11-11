import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
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
  MessageSquarePlus,
  Phone,
  Plus,
  Save,
  Star,
  Trash2,
  UserRound,
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
import { type AgreementRow, DocumentsPanel, PartnerAgreements, type PartnerDocument } from "./Agreements";
import { DossiersTab, MailTab, MeetingsTab, type PartnerLinks } from "./PartnerLinks";
import { useCan, useUnits, useUsers } from "@/lib/hooks";
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
            <Table head={["Partenaire", "État", "Type", "Catégories", "Point focal", "Dernier échange"]}>
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
    </fieldset>
  );
}

function NewPartner({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const { data: refs } = useReferentials();
  const types = refs?.partner_type.filter((t) => !t.archived) ?? [];
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
            <Select {...a} value={f.type_code} onChange={set("type_code")}>
              <option value="">Choisir…</option>
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </Select>
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
  const [d, setD] = useState<Detail | null>(null);
  const [dirty, setDirty] = useState(false);
  const [moving, setMoving] = useState<PartnerState | null>(null);
  const [merging, setMerging] = useState(false);
  const [removing, setRemoving] = useState(false);
  useEffect(() => {
    if (p) {
      setD(p);
      setDirty(false);
    }
  }, [p]);
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
  const ro = !d.can.edit;
  const roManage = !d.can.manage;
  const patch = (x: Partial<Detail>) => {
    setD({ ...d, ...x });
    setDirty(true);
  };
  const text = (k: "name" | "acronym" | "official_id" | "city" | "address" | "website" | "email" | "phone") => ({
    disabled: ro,
    value: d[k],
    onChange: (e: { target: { value: string } }) => patch({ [k]: e.target.value }),
  });
  const S = PARTNER_STATE[d.state];
  const types = refs?.partner_type ?? [];
  const people = users?.filter((u) => !u.is_ai) ?? [];
  return (
    <div className="min-h-full pb-10">
      <PageHeader
        crumbs={["Partenariats", "Partenaires", d.acronym || d.name]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link to="/partenaires" aria-label="Retour à l'annuaire" className="text-muted hover:text-fg">
              <ArrowLeft className="size-5" />
            </Link>
            {d.name}
            {d.acronym && <span className="text-[16px] font-medium text-muted">({d.acronym})</span>}
            {d.confidential && <Lock aria-label="Confidentiel" className="size-4 text-warning" />}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            <RefTag value={types.find((t) => t.code === d.type_code)} code={d.type_code} />
            {d.categories.map((c) => (
              <RefTag key={c} value={refs?.partner_category.find((x) => x.code === c)} code={c} />
            ))}
          </span>
        }
        actions={
          <>
            <Status label={S.label} tone={S.tone} />
            {d.can.states.length > 0 && (
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
            {d.can.manage && (
              <IconButton label="Fusionner avec une autre fiche" onClick={() => setMerging(true)}>
                <ArrowRightLeft className="size-4" />
              </IconButton>
            )}
            {d.can.delete && (
              <IconButton label="Supprimer la fiche" onClick={() => setRemoving(true)}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
            {!ro && (
              <Button
                variant="primary"
                icon={<Save className="size-4" />}
                disabled={!dirty || !d.name.trim()}
                loading={save.isPending}
                onClick={() => save.mutate()}
              >
                Enregistrer
              </Button>
            )}
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
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-4 p-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {tab === "overview" && (
            <>
              <Section title="Présentation">
                <div className="p-4 pt-2">
                  <Textarea
                    aria-label="Présentation du partenaire"
                    rows={4}
                    disabled={ro}
                    placeholder="Mission, domaines d'intervention, programmes en cours…"
                    value={d.description}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </div>
              </Section>
              <Section title="Identification">
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <Field label="Nom" required className="sm:col-span-2">
                    {(a) => <Input {...a} {...text("name")} />}
                  </Field>
                  <Field label="Sigle">{(a) => <Input {...a} {...text("acronym")} />}</Field>
                  <Field label="Identifiant officiel" hint="NIF, RCCM, numéro d'enregistrement…">
                    {(a) => <Input {...a} {...text("official_id")} />}
                  </Field>
                  <Field label="Type" required>
                    {(a) => (
                      <Select
                        {...a}
                        disabled={roManage}
                        value={d.type_code}
                        onChange={(e) => patch({ type_code: e.target.value })}
                      >
                        {types
                          .filter((t) => !t.archived || t.code === d.type_code)
                          .map((t) => (
                            <option key={t.code} value={t.code}>
                              {t.label}
                            </option>
                          ))}
                      </Select>
                    )}
                  </Field>
                  <Field label="Entité porteuse">
                    {(a) => (
                      <Select
                        {...a}
                        disabled={roManage}
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
                  <div className="sm:col-span-2">
                    <CategoryChecks
                      values={refs?.partner_category ?? []}
                      selected={d.categories}
                      disabled={roManage}
                      onChange={(categories) => patch({ categories })}
                    />
                  </div>
                </div>
              </Section>
              <Section title="Coordonnées">
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <Field label="Pays">
                    {(a) => (
                      <CountrySelect
                        {...a}
                        disabled={ro}
                        value={d.country}
                        onChange={(country) => patch({ country })}
                      />
                    )}
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
          )}
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
              partnerId={d.id}
              documents={d.documents}
              agreements={d.agreements}
              canAdd={d.can.edit}
              onChange={() => qc.invalidateQueries({ queryKey: ["partner", id] })}
            />
          )}
        </div>
        <aside className="space-y-4">
          <Section title="Suivi de la relation">
            <dl className="space-y-3 p-4 pt-2 text-[13px]">
              <Meta label="État">
                <Status label={S.label} tone={S.tone} />
                {d.state_reason && (
                  <span className="mt-1 block text-[12.5px] font-normal text-muted">{d.state_reason}</span>
                )}
              </Meta>
              <Meta label="Point focal">
                {d.can.manage ? (
                  <PeopleSelect
                    aria-label="Point focal"
                    people={people}
                    placeholder="Non désigné"
                    value={d.focal_id}
                    onChange={(v) => patch({ focal_id: v || null, focal_ids: d.focal_ids.filter((x) => x !== v) })}
                  />
                ) : (
                  (d.focal_name ?? "Non désigné")
                )}
              </Meta>
              <Meta label="Autres points focaux">
                {d.can.manage ? (
                  <FocalPicker
                    people={people.filter((u) => u.id !== d.focal_id)}
                    value={d.focal_ids}
                    onChange={(focal_ids) => patch({ focal_ids })}
                  />
                ) : d.focals.length ? (
                  d.focals.map((f) => f.name).join(", ")
                ) : (
                  "Aucun"
                )}
              </Meta>
              <Meta label="Entité porteuse">{d.unit_name ?? "Aucune"}</Meta>
              <Meta label="Dernier échange">{frDate(d.last_note_on)}</Meta>
              <Meta label="Dans l'annuaire depuis">{frDate(d.created_at.slice(0, 10))}</Meta>
              {d.can.manage && (
                <label className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={d.confidential}
                    onChange={(e) => patch({ confidential: e.target.checked })}
                  />
                  Fiche confidentielle
                </label>
              )}
            </dl>
          </Section>
          <p className="px-1 text-[12px] text-faint">Les engagements financiers rejoindront cette fiche au lot PA4.</p>
        </aside>
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

const Meta = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-[12px] text-muted">{label}</dt>
    <dd className="mt-0.5 font-medium">{children}</dd>
  </div>
);

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
function ContactsTab({ partner, onChange }: { partner: Detail; onChange: (r: Detail) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", title: "", email: "", phone: "", principal: false });
  const [showArchived, setShowArchived] = useState(false);
  const reload = async () => onChange(await api.get<Detail>(`/api/partners/${partner.id}`));
  const add = useMutation({
    mutationFn: () => api.post(`/api/partners/${partner.id}/contacts`, f),
    onSuccess: async () => {
      setF({ name: "", title: "", email: "", phone: "", principal: false });
      await reload();
      toast.success("Contact ajouté");
    },
    onError: fail,
  });
  const edit = useMutation({
    mutationFn: (v: { id: string; body: Partial<Contact> }) =>
      api.patch<Detail>(`/api/partner-contacts/${v.id}`, v.body),
    onSuccess: (r) => {
      onChange(r);
      qc.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: fail,
  });
  const shown = partner.contacts.filter((c) => showArchived || !c.archived);
  const archived = partner.contacts.filter((c) => c.archived).length;
  return (
    <>
      <Section
        title="Personnes chez le partenaire"
        aside={
          archived > 0 && (
            <button
              type="button"
              className="text-[12.5px] text-muted hover:text-fg"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? "Masquer les archivés" : `Voir les archivés (${archived})`}
            </button>
          )
        }
      >
        {shown.length ? (
          <ul className="divide-y divide-line">
            {shown.map((c) => (
              <li key={c.id} className={cn("flex flex-wrap items-start gap-3 px-5 py-3", c.archived && "opacity-60")}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hover text-muted">
                  <UserRound className="size-4" />
                </span>
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {c.name}
                    {c.principal && (
                      <span className="inline-flex items-center gap-1 text-[12px] font-normal text-primary">
                        <Star className="size-3" /> Contact principal
                      </span>
                    )}
                    {c.archived && <span className="text-[12px] font-normal text-muted">Archivé</span>}
                  </span>
                  {c.title && <span className="block text-muted">{c.title}</span>}
                  <span className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px] text-muted">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                        <Mail className="size-3" /> {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" /> {c.phone}
                      </span>
                    )}
                  </span>
                </span>
                {partner.can.edit && (
                  <span className="flex shrink-0 items-center gap-1">
                    {!c.archived && !c.principal && (
                      <IconButton
                        label="Désigner contact principal"
                        onClick={() => edit.mutate({ id: c.id, body: { principal: true } })}
                      >
                        <Star className="size-4" />
                      </IconButton>
                    )}
                    <IconButton
                      label={c.archived ? "Réactiver" : "Archiver"}
                      onClick={() => edit.mutate({ id: c.id, body: { archived: !c.archived } })}
                    >
                      {c.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                    </IconButton>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={<Users className="size-6" />} title="Aucun contact">
            Les personnes chez le partenaire n'ont pas de compte dans l'outil : elles sont seulement répertoriées ici.
          </Empty>
        )}
      </Section>
      {partner.can.edit && (
        <Section title="Ajouter un contact">
          <div className="grid gap-3 p-4 pt-2 sm:grid-cols-2">
            <Field label="Nom" required>
              {(a) => <Input {...a} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
            </Field>
            <Field label="Fonction">
              {(a) => <Input {...a} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}
            </Field>
            <Field label="Courriel">
              {(a) => (
                <Input {...a} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              )}
            </Field>
            <Field label="Téléphone">
              {(a) => <Input {...a} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />}
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
            <div className="flex justify-end">
              <Button
                variant="primary"
                icon={<Plus className="size-4" />}
                disabled={!f.name.trim()}
                loading={add.isPending}
                onClick={() => add.mutate()}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </Section>
      )}
    </>
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
