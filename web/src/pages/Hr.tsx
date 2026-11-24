import { pl } from "@/lib/format";
import { ExportMenu, tableDoc } from "@/components/export-menu";
import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, GraduationCap, IdCard, Pencil, Phone, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { Button, Chip, Empty, IconButton, Spinner, Hint } from "@/components/ui";
import { DossierDocuments } from "@/components/documents";
import { Textarea } from "@/components/gov";
import { Drawer, DrawerSection } from "@/components/drawer";
import { Field, Input, PageHeader, Section, Select, Table, Tabs, Td, Tr, frDate } from "@/components/gov";
import { Fact, Facts } from "@/components/record";
import { usePrimaryDomain, useUnits } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { InviteResult } from "@/lib/types";
import { LinkResult } from "./OrgAccess";

/*
 * Ressources humaines — identification des agents. Le registre (service RH), la fiche d'un agent (consulter puis
 * modifier), la création d'un agent qui ouvre son compte, et « Mon dossier » pour chaque agent.
 */

export interface AgentRow {
  user_id: string;
  matricule: string;
  civility: string;
  last_name: string;
  first_names: string;
  status: string;
  grade: string;
  category: string;
  function_title: string;
  hired_on: string | null;
  contract_end_on: string | null;
  email: string;
  account_status: string;
  unit_id: string | null;
  unit_name: string | null;
  profile_name: string | null;
  diploma_count: number;
  contact_count: number;
  /** Indicateurs du service (RH-4) : tranche d'âge et date de départ en retraite. */
  age_band?: string | null;
  retire_on?: string | null;
}
export interface AgentDetail extends AgentRow {
  /** Lu par le chef : partie administrative seulement (thème 5, D-2). */
  restricted?: boolean;
  birth_date: string | null;
  birth_place: string;
  nationality: string;
  gender: string;
  marital_status: string;
  children_count: number | null;
  id_document_type: string;
  id_document_number: string;
  address: string;
  phone: string;
  personal_email: string;
  echelon: string;
  function_since: string | null;
  notes: string;
  manager_name: string | null;
  diplomas: { id: string; title: string; field: string; institution: string; year: number | null; level: string }[];
  contacts: { id: string; name: string; relation: string; phone: string; email: string }[];
  assignments: {
    id: string;
    unit_id: string | null;
    unit_name: string | null;
    function_title: string;
    started_on: string;
    ended_on: string | null;
    reference: string;
  }[];
  can: { manage: boolean; self: boolean };
  /** Sortie de l'agent (thème 6, RH-1). */
  exit_on?: string | null;
  exit_reason?: string | null;
  exit_reference?: string;
  trainings?: { id: string; title: string; provider: string; start_on: string | null; end_on: string | null }[];
  evaluations?: { id: string; year: number; rating: string; comment: string; evaluator_name: string | null }[];
  corrections?: { id: string; message: string; status: "open" | "done"; response: string; created_at: string }[];
}

const EXIT_LABEL: Record<string, string> = {
  retraite: "Départ à la retraite",
  fin_contrat: "Fin de contrat",
  mutation: "Mutation",
  demission: "Démission",
  licenciement: "Licenciement",
  deces: "Décès",
  autre: "Autre motif",
};
const RATING_LABEL: Record<string, string> = {
  excellent: "Excellent",
  tres_bien: "Très bien",
  bien: "Bien",
  passable: "Passable",
  insuffisant: "Insuffisant",
};

export const STATUS_LABEL: Record<string, string> = {
  fonctionnaire: "Fonctionnaire",
  contractuel: "Contractuel·le",
  detache: "Détaché·e",
  stagiaire: "Stagiaire",
  consultant: "Consultant·e",
  autre: "Autre",
};
const ACCOUNT: Record<string, { label: string; tone: "success" | "info" | "danger" | "muted" }> = {
  active: { label: "Compte actif", tone: "success" },
  invited: { label: "Lien envoyé", tone: "info" },
  suspended: { label: "Suspendu", tone: "danger" },
};
const fail = (e: unknown) => toast.error((e as Error).message);
const fullName = (a: Pick<AgentRow, "civility" | "first_names" | "last_name">) =>
  [a.civility, a.first_names, a.last_name.toUpperCase()].filter(Boolean).join(" ");

/** Registre des agents (service RH). */
const AGE_BANDS = ["moins de 30 ans", "30 à 39 ans", "40 à 49 ans", "50 à 59 ans", "60 ans et plus"];
/** Effectifs par entité, pyramide des âges, départs des douze prochains mois (RH-4). */
function HrIndicators({ rows }: { rows: AgentRow[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const inYear = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  const byUnit = Object.entries(
    rows.reduce<Record<string, number>>(
      (m, a) => ({ ...m, [a.unit_name ?? "Non rattaché"]: (m[a.unit_name ?? "Non rattaché"] ?? 0) + 1 }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);
  const ages = AGE_BANDS.map((b) => [b, rows.filter((a) => a.age_band === b).length] as const);
  const maxAge = Math.max(1, ...ages.map(([, n]) => n));
  const leaving = rows.filter(
    (a) =>
      (a.contract_end_on && a.contract_end_on >= today && a.contract_end_on <= inYear) ||
      (a.retire_on && a.retire_on >= today && a.retire_on <= inYear),
  );
  const box = "rounded-2xl border border-line bg-panel p-4";
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <section className={box}>
        <h2 className="mb-2 text-[13px] font-semibold">Effectifs par entité · {rows.length}</h2>
        <ul className="space-y-1 text-[12.5px]">
          {byUnit.slice(0, 6).map(([u, n]) => (
            <li key={u} className="flex justify-between gap-2">
              <span className="truncate text-muted">{u}</span>
              <span className="tabular font-medium">{n}</span>
            </li>
          ))}
          {byUnit.length > 6 && <li className="text-faint">et {byUnit.length - 6} autres entités</li>}
        </ul>
      </section>
      <section className={box}>
        <h2 className="mb-2 text-[13px] font-semibold">Pyramide des âges</h2>
        {/* Un graphique sans données n'apprend rien : il laisse la place à ce qui manque (écrans sobres) */}
        {!rows.some((a) => a.age_band) ? (
          <p className="text-[12.5px] text-muted">
            Aucune date de naissance n'est renseignée : la pyramide apparaîtra dès que les dossiers seront complétés.
          </p>
        ) : (
          <ul className="space-y-1.5 text-[12.5px]">
            {ages.map(([b, n]) => (
              <li key={b} className="grid grid-cols-[110px_1fr_24px] items-center gap-2">
                <span className="text-muted">{b}</span>
                <span className="h-2 rounded-full bg-hover">
                  <span className="block h-2 rounded-full bg-primary" style={{ width: `${(100 * n) / maxAge}%` }} />
                </span>
                <span className="text-right tabular">{n}</span>
              </li>
            ))}
          </ul>
        )}
        {rows.some((a) => a.age_band) && rows.some((a) => !a.age_band) && (
          <p className="mt-2 text-[11.5px] text-faint">
            {rows.filter((a) => !a.age_band).length} {pl(rows.filter((a) => !a.age_band).length, "dossier(s)")} sans
            date de naissance
          </p>
        )}
      </section>
      <section className={box}>
        <h2 className="mb-2 text-[13px] font-semibold">Départs prévus sous 12 mois · {leaving.length}</h2>
        <ul className="space-y-1 text-[12.5px]">
          {leaving.slice(0, 6).map((a) => (
            <li key={a.user_id} className="flex justify-between gap-2">
              <span className="truncate">{fullName(a)}</span>
              <span className="shrink-0 text-muted">
                {a.retire_on && a.retire_on <= inYear && a.retire_on >= today
                  ? `retraite ${frDate(a.retire_on)}`
                  : `fin de contrat ${frDate(a.contract_end_on)}`}
              </span>
            </li>
          ))}
          {!leaving.length && <li className="text-faint">Aucun départ prévu</li>}
        </ul>
      </section>
    </div>
  );
}

export function HrPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"agents" | "a-identifier">("agents");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  // Filtres par entité et par grade (RH-4)
  const [unitF, setUnitF] = useState("");
  const [gradeF, setGradeF] = useState("");
  const [creating, setCreating] = useState<{ user_id?: string; name?: string } | null>(null);
  const { data, error } = useQuery({ queryKey: ["hr-agents"], queryFn: () => api.get<AgentRow[]>("/api/hr/agents") });
  const { data: pending } = useQuery({
    queryKey: ["hr-unregistered"],
    queryFn: () => api.get<{ id: string; name: string; email: string; title: string | null }[]>("/api/hr/unregistered"),
    retry: false,
  });
  const rows = (data ?? []).filter(
    (a) =>
      (!status || a.status === status) &&
      (!unitF || (a.unit_name ?? "") === unitF) &&
      (!gradeF || a.grade === gradeF) &&
      (!q ||
        [a.matricule, a.last_name, a.first_names, a.function_title, a.grade, a.unit_name ?? "", a.email]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())),
  );
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={IdCard}
        crumbs={["Organisation", "Ressources humaines"]}
        title="Ressources humaines"
        subtitle="Le dossier de chaque agent : identité, situation administrative, affectation, diplômes et personnes à prévenir. Créer un agent ouvre son compte : il reçoit un lien et accède à la vue Agent."
        actions={
          <>
            <ExportMenu
              disabled={!rows.length}
              build={() =>
                tableDoc(
                  "Registre des agents",
                  [
                    "Matricule",
                    "Agent",
                    "Adresse",
                    "Entité",
                    "Fonction",
                    "Grade",
                    "Statut",
                    "Entrée",
                    "Fin de contrat",
                  ],
                  rows.map((a) => [
                    a.matricule,
                    fullName(a),
                    a.email,
                    a.unit_name,
                    a.function_title,
                    [a.grade, a.category].filter(Boolean).join(" · "),
                    STATUS_LABEL[a.status] ?? a.status,
                    frDate(a.hired_on),
                    a.contract_end_on ? frDate(a.contract_end_on) : "",
                  ]),
                  { filename: "registre-des-agents", widths: [1.6, 3, 3, 2.5, 2.5, 2, 1.6, 1.4, 1.5] },
                )
              }
            />
            {pending !== undefined && (
              <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setCreating({})}>
                Nouvel agent
              </Button>
            )}
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "agents" as const, label: "Agents", badge: data?.length },
          ...(pending ? [{ id: "a-identifier" as const, label: "À identifier", badge: pending.length }] : []),
        ]}
      />
      <div className="mx-auto max-w-[1480px] space-y-3 px-4 pb-16 pt-5 sm:px-8">
        {error ? (
          <p className="text-[13px] text-danger">{(error as Error).message}</p>
        ) : !data ? (
          <Spinner />
        ) : tab === "agents" ? (
          <>
            <HrInbox />
            <HrIndicators rows={data} />
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px_200px_200px]">
              <Input
                aria-label="Rechercher un agent"
                placeholder="Rechercher par nom, matricule, fonction, grade, entité…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
              <Select aria-label="Entité" value={unitF} onChange={(e) => setUnitF(e.target.value)}>
                <option value="">Toutes les entités</option>
                {[...new Set(data.map((a) => a.unit_name ?? "").filter(Boolean))].sort().map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
              <Select aria-label="Grade" value={gradeF} onChange={(e) => setGradeF(e.target.value)}>
                <option value="">Tous les grades</option>
                {[...new Set(data.map((a) => a.grade).filter(Boolean))].sort().map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
            </div>
            <Section>
              {rows.length ? (
                <Table head={["Matricule", "Agent", "Entité", "Fonction", "Grade", "Statut", "Compte"]}>
                  {rows.map((a) => (
                    <Tr
                      key={a.user_id}
                      onClick={() => nav(`/rh/${a.user_id}`)}
                      href={`/rh/${a.user_id}`}
                      reference={a.matricule}
                    >
                      <Td className="whitespace-nowrap font-mono text-[12px] text-muted">{a.matricule}</Td>
                      <Td className="min-w-[200px]">
                        <span className="block font-medium">{fullName(a)}</span>
                        <span className="block text-[12px] text-muted">{a.email}</span>
                      </Td>
                      <Td className="text-muted">{a.unit_name ?? "—"}</Td>
                      <Td className="text-muted">{a.function_title || "—"}</Td>
                      <Td className="text-muted">{[a.grade, a.category].filter(Boolean).join(" · ") || "—"}</Td>
                      <Td>{STATUS_LABEL[a.status] ?? a.status}</Td>
                      <Td>
                        <Chip tone={ACCOUNT[a.account_status]?.tone ?? "muted"}>
                          {ACCOUNT[a.account_status]?.label ?? a.account_status}
                        </Chip>
                      </Td>
                    </Tr>
                  ))}
                </Table>
              ) : (
                <Empty
                  icon={<Users className="size-6" />}
                  title={data.length ? "Aucun agent ne correspond" : "Aucun agent"}
                >
                  Créez un agent : son dossier est ouvert et il reçoit un lien pour accéder à l'outil.
                </Empty>
              )}
              <div className="h-3" />
            </Section>
          </>
        ) : (
          <Section title="Personnes sans dossier d'agent">
            <p className="px-5 pb-2 text-[13px] text-muted">
              Comptes créés avant le module RH ou par invitation : ouvrez leur dossier pour les identifier.
            </p>
            {pending?.length ? (
              <Table head={["Personne", "Adresse", "Fonction", ""]}>
                {pending.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-medium">{p.name}</Td>
                    <Td className="text-muted">{p.email}</Td>
                    <Td className="text-muted">{p.title ?? "—"}</Td>
                    <Td className="text-right">
                      <Button size="sm" onClick={() => setCreating({ user_id: p.id, name: p.name })}>
                        Ouvrir son dossier
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Table>
            ) : (
              <Empty title="Tout le monde est identifié">Chaque membre de l'institution a son dossier.</Empty>
            )}
            <div className="h-3" />
          </Section>
        )}
      </div>
      {creating && <AgentForm existing={creating} onClose={() => setCreating(null)} />}
    </div>
  );
}

type Form = Record<string, string>;
const EMPTY: Form = {
  civility: "",
  last_name: "",
  first_names: "",
  email: "",
  birth_date: "",
  birth_place: "",
  nationality: "",
  gender: "",
  marital_status: "",
  children_count: "",
  id_document_type: "",
  id_document_number: "",
  address: "",
  phone: "",
  personal_email: "",
  status: "fonctionnaire",
  grade: "",
  category: "",
  echelon: "",
  function_title: "",
  unit_id: "",
  hired_on: "",
  function_since: "",
  contract_end_on: "",
  matricule: "",
  notes: "",
  assignment_reference: "",
};
const DATES = ["birth_date", "hired_on", "function_since", "contract_end_on"];

/** Formulaire d'agent : création (ouvre le compte) ou modification d'un dossier par le service RH. */
function AgentForm({
  existing,
  agent,
  onClose,
}: {
  existing?: { user_id?: string; name?: string };
  agent?: AgentDetail;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: units } = useUnits();
  const domain = usePrimaryDomain();
  const [f, setF] = useState<Form>(() => {
    if (!agent) {
      const [first, ...rest] = (existing?.name ?? "").split(" ");
      return { ...EMPTY, first_names: existing?.name ? first : "", last_name: rest.join(" ") };
    }
    const out: Form = { ...EMPTY };
    for (const k of Object.keys(EMPTY)) {
      const v = (agent as unknown as Record<string, unknown>)[k];
      out[k] = v === null || v === undefined ? "" : String(v);
    }
    return out;
  });
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<InviteResult | null>(null);
  const set = (k: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const creating = !agent;
  const needsEmail = creating && !existing?.user_id;
  const emailError =
    f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? "Adresse électronique invalide" : null;
  const ready = !!f.last_name.trim() && (!needsEmail || (!!f.email.trim() && !emailError));
  const body = () => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(f)) {
      if (k === "email" && !needsEmail) continue;
      if (k === "assignment_reference" && creating) continue;
      if (k === "children_count") out[k] = v === "" ? null : Number(v);
      else if (DATES.includes(k)) out[k] = v || null;
      else if (k === "unit_id") out[k] = v || null;
      else if (k === "matricule" && !v) continue;
      else out[k] = v;
    }
    if (existing?.user_id) out.user_id = existing.user_id;
    return out;
  };
  const submit = () => {
    setBusy(true);
    const req = creating
      ? api.post<{ agent: AgentRow; sent: boolean; link?: string }>("/api/hr/agents", body())
      : api.patch<AgentDetail>(`/api/hr/agents/${agent.user_id}`, body());
    req
      .then((r) => {
        qc.invalidateQueries({ queryKey: ["hr-agents"] });
        qc.invalidateQueries({ queryKey: ["hr-unregistered"] });
        qc.invalidateQueries({ queryKey: ["hr-agent"] });
        if (creating) {
          const res = r as { agent: AgentRow; sent: boolean; link?: string };
          toast.success(
            existing?.user_id
              ? "Dossier ouvert"
              : res.link
                ? "Agent créé : transmettez-lui son lien personnel"
                : "Agent créé : son lien d'accès est parti par courriel",
          );
          if (res.link) setLink({ sent: false, link: res.link });
          else {
            onClose();
            nav(`/rh/${res.agent.user_id}`);
          }
        } else {
          toast.success("Dossier enregistré");
          onClose();
        }
      }, fail)
      .finally(() => setBusy(false));
  };
  if (link) return <LinkResult result={link} onClose={onClose} />;
  const text = (
    k: string,
    label: string,
    opts: { required?: boolean; hint?: string; type?: string; wide?: boolean } = {},
  ) => (
    <Field label={label} required={opts.required} hint={opts.hint} className={opts.wide ? "sm:col-span-2" : ""}>
      {(a) => <Input {...a} type={opts.type ?? "text"} value={f[k]} onChange={set(k)} />}
    </Field>
  );
  return (
    <Drawer
      open
      onClose={onClose}
      dirty={!busy && JSON.stringify(f) !== JSON.stringify(EMPTY)}
      width={720}
      subtitle={creating ? "Ressources humaines · Nouvel agent" : `Ressources humaines · ${agent.matricule}`}
      title={
        creating
          ? existing?.name
            ? `Ouvrir le dossier de ${existing.name}`
            : "Nouvel agent"
          : `Modifier le dossier de ${fullName(agent)}`
      }
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!ready || busy} onClick={submit}>
            {creating ? (needsEmail ? "Créer l'agent et envoyer le lien" : "Ouvrir le dossier") : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {needsEmail && (
          <p className="rounded-lg bg-info-soft px-3 py-2 text-[13px] text-info">
            Créer un agent ouvre son compte : il reçoit à cette adresse un lien personnel pour choisir son mot de passe
            et accède à la vue Agent (stagiaire et consultant reçoivent leur profil propre).
          </p>
        )}
        <DrawerSection title="Identité">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Civilité">
              {(a) => (
                <Select {...a} value={f.civility} onChange={set("civility")}>
                  <option value="">—</option>
                  <option>Mme</option>
                  <option>M.</option>
                </Select>
              )}
            </Field>
            {text("last_name", "Nom", { required: true })}
            {text("first_names", "Prénoms", { wide: true })}
            {needsEmail && (
              <Field label="Adresse électronique professionnelle" required error={emailError} className="sm:col-span-2">
                {(a) => (
                  <Input
                    {...a}
                    type="email"
                    value={f.email}
                    onChange={set("email")}
                    autoComplete="off"
                    placeholder={`prénom.nom@${domain || "agence.gouv.cd"}`}
                  />
                )}
              </Field>
            )}
            {text("birth_date", "Date de naissance", { type: "date" })}
            {text("birth_place", "Lieu de naissance")}
            {text("nationality", "Nationalité")}
            <Field label="Sexe">
              {(a) => (
                <Select {...a} value={f.gender} onChange={set("gender")}>
                  <option value="">—</option>
                  <option value="F">Féminin</option>
                  <option value="M">Masculin</option>
                </Select>
              )}
            </Field>
            {text("marital_status", "Situation de famille")}
            {text("children_count", "Enfants à charge", { type: "number" })}
            {text("id_document_type", "Pièce d'identité", { hint: "Carte d'identité, passeport…" })}
            {text("id_document_number", "Numéro de la pièce")}
          </div>
        </DrawerSection>
        <DrawerSection title="Coordonnées">
          <div className="grid gap-3 sm:grid-cols-2">
            {text("phone", "Téléphone")}
            {text("personal_email", "Adresse personnelle (courriel)")}
            {text("address", "Adresse", { wide: true })}
          </div>
        </DrawerSection>
        <DrawerSection title="Situation administrative">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Statut" required>
              {(a) => (
                <Select {...a} value={f.status} onChange={set("status")}>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {text("matricule", "Matricule", {
              hint: creating ? "Attribué automatiquement s'il est laissé vide." : undefined,
            })}
            {text("grade", "Grade")}
            {text("category", "Catégorie")}
            {text("echelon", "Échelon")}
            {text("hired_on", "Date d'entrée", { type: "date" })}
            {(f.status === "contractuel" || f.status === "stagiaire" || f.status === "consultant") &&
              text("contract_end_on", "Fin de contrat ou de stage", { type: "date" })}
          </div>
        </DrawerSection>
        <DrawerSection title="Affectation">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Entité"
              hint={!creating ? "Changer d'entité ou de fonction ouvre une nouvelle affectation." : undefined}
            >
              {(a) => (
                <Select {...a} value={f.unit_id} onChange={set("unit_id")}>
                  <option value="">Non affecté·e</option>
                  {(units ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {"— ".repeat(u.depth ?? 0)}
                      {u.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {text("function_title", "Fonction")}
            {text("function_since", "En fonction depuis", { type: "date" })}
            {!creating && text("assignment_reference", "Acte d'affectation", { hint: "Note de service, décision…" })}
          </div>
        </DrawerSection>
        <DrawerSection title="Observations">
          <textarea
            aria-label="Observations"
            rows={3}
            value={f.notes}
            onChange={set("notes")}
            className="field-ring w-full rounded-lg border border-field bg-panel px-3 py-2 text-[13.5px] outline-none"
          />
        </DrawerSection>
      </div>
    </Drawer>
  );
}

/** Fiche d'un agent : lecture d'abord ; seul le service RH modifie, et jamais son propre dossier. */
export function AgentPage({ self }: { self?: boolean }) {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: a, error } = useQuery({
    queryKey: ["hr-agent", self ? "me" : id],
    queryFn: () => api.get<AgentDetail | null>(self ? "/api/hr/me" : `/api/hr/agents/${id}`),
  });
  const [editing, setEditing] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  if (error) return <Empty title="Dossier inaccessible">{(error as Error).message}</Empty>;
  if (a === undefined) return <Spinner />;
  if (a === null)
    return (
      <Empty icon={<IdCard className="size-6" />} title="Pas encore de dossier">
        Votre dossier d'agent n'a pas encore été ouvert par le service des ressources humaines.
      </Empty>
    );
  const current = a.assignments.find((s) => !s.ended_on);
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={IdCard}
        crumbs={self ? ["Mon dossier"] : ["Ressources humaines", a.matricule]}
        title={fullName(a)}
        subtitle={[a.function_title, a.unit_name, STATUS_LABEL[a.status]].filter(Boolean).join(" · ")}
        actions={
          <div className="flex flex-wrap gap-2">
            {!self && (
              <Button icon={<ArrowLeft className="size-4" />} onClick={() => nav("/rh")}>
                Registre
              </Button>
            )}
            {a.can.self && <Button onClick={() => setCorrecting(true)}>Demander une correction</Button>}
            {a.can.manage && !a.exit_on && <Button onClick={() => setExiting(true)}>Enregistrer la sortie</Button>}
            {a.can.manage && (
              <Button variant="primary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                Modifier
              </Button>
            )}
          </div>
        }
      />
      <div className="mx-auto grid max-w-[1480px] gap-4 px-4 pb-16 pt-2 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {a.can.self && (
            <Hint>
              Votre dossier est tenu par le service des ressources humaines. Pour corriger une information,
              adressez-vous à lui : vous ne pouvez pas la modifier vous-même.
            </Hint>
          )}
          {a.exit_on && (
            <p className="rounded-lg border border-line bg-danger-soft/40 px-4 py-3 text-[13px]">
              Sortie le {frDate(a.exit_on)} : {EXIT_LABEL[a.exit_reason ?? ""] ?? a.exit_reason}
              {a.exit_reference ? ` · ${a.exit_reference}` : ""}. À cette date, l'affectation se clôt et le compte est
              suspendu.
            </p>
          )}
          {a.restricted && (
            <Hint>
              Vous lisez la partie administrative du dossier : situation, affectations et diplômes. Les données
              personnelles (famille, pièce d'identité, coordonnées, personnes à prévenir) restent à l'agent et au
              service des ressources humaines.
            </Hint>
          )}
          <Section title="Identité">
            <Facts>
              <Fact label="Matricule">{a.matricule}</Fact>
              {!a.restricted && (
                <>
                  <Fact label="Né·e le">
                    {a.birth_date ? `${frDate(a.birth_date)}${a.birth_place ? ` à ${a.birth_place}` : ""}` : ""}
                  </Fact>
                  <Fact label="Nationalité">{a.nationality}</Fact>
                  <Fact label="Sexe">{a.gender === "F" ? "Féminin" : a.gender === "M" ? "Masculin" : ""}</Fact>
                  <Fact label="Situation de famille">{a.marital_status}</Fact>
                  <Fact label="Enfants à charge">{a.children_count ?? ""}</Fact>
                  <Fact label="Pièce d'identité">
                    {[a.id_document_type, a.id_document_number].filter(Boolean).join(" n° ")}
                  </Fact>
                </>
              )}
            </Facts>
          </Section>
          <Section title="Situation administrative">
            <Facts>
              <Fact label="Statut">{STATUS_LABEL[a.status] ?? a.status}</Fact>
              <Fact label="Grade">{a.grade}</Fact>
              <Fact label="Catégorie · échelon">{[a.category, a.echelon].filter(Boolean).join(" · ")}</Fact>
              <Fact label="Date d'entrée">{a.hired_on ? frDate(a.hired_on) : ""}</Fact>
              {a.contract_end_on && <Fact label="Fin de contrat">{frDate(a.contract_end_on)}</Fact>}
              <Fact label="Fonction">{a.function_title}</Fact>
              <Fact label="En fonction depuis">{a.function_since ? frDate(a.function_since) : ""}</Fact>
              <Fact label="Entité">{a.unit_name}</Fact>
              <Fact label="Supérieur hiérarchique">{a.manager_name}</Fact>
            </Facts>
          </Section>
          <Section title="Historique des affectations">
            <Table head={["Entité", "Fonction", "Du", "Au", "Acte"]}>
              {a.assignments.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-medium">{s.unit_name ?? "—"}</Td>
                  <Td className="text-muted">{s.function_title || "—"}</Td>
                  <Td className="text-muted">{frDate(s.started_on)}</Td>
                  <Td className="text-muted">
                    {s.ended_on ? frDate(s.ended_on) : <Chip tone="success">En cours</Chip>}
                  </Td>
                  <Td className="text-muted">{s.reference || "—"}</Td>
                </Tr>
              ))}
            </Table>
            <div className="h-3" />
          </Section>
          <ListBlock
            title="Diplômes"
            icon={<GraduationCap className="size-6" />}
            agent={a}
            kind="diplomas"
            empty="Aucun diplôme enregistré."
            rows={a.diplomas.map((d) => ({
              id: d.id,
              main: d.title,
              sub: [d.level, d.field, d.institution, d.year].filter(Boolean).join(" · "),
            }))}
          />
          <ListBlock
            title="Formations"
            icon={<GraduationCap className="size-6" />}
            agent={a}
            kind="trainings"
            empty="Aucune formation enregistrée."
            rows={(a.trainings ?? []).map((t) => ({
              id: t.id,
              main: t.title,
              sub: [t.provider, t.start_on && frDate(t.start_on), t.end_on && `au ${frDate(t.end_on)}`]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
          {(a.can.self || !a.restricted) && (
            <ListBlock
              title="Évaluations"
              icon={<GraduationCap className="size-6" />}
              agent={a}
              kind="evaluations"
              empty="Aucune évaluation enregistrée."
              rows={(a.evaluations ?? []).map((e) => ({
                id: e.id,
                main: `${e.year} · ${RATING_LABEL[e.rating] ?? e.rating}`,
                sub: e.comment,
              }))}
            />
          )}
          {!a.restricted && <DossierDocuments owner="agent" ownerId={a.user_id} title="Pièces du dossier" />}
          {!!a.corrections?.length && (
            <Section title="Demandes de correction">
              <ul className="divide-y divide-line px-5 pb-3">
                {a.corrections.map((c) => (
                  <li key={c.id} className="py-2.5 text-[13px]">
                    <span className="flex items-center gap-2">
                      <Chip tone={c.status === "open" ? "info" : "success"}>
                        {c.status === "open" ? "En attente" : "Traitée"}
                      </Chip>
                      <span className="text-muted">{frDate(c.created_at.slice(0, 10))}</span>
                    </span>
                    <span className="mt-1 block">{c.message}</span>
                    {c.response && <span className="mt-0.5 block text-muted">Réponse : {c.response}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
        <div className="min-w-0 space-y-4">
          <Section title="Coordonnées">
            <Facts className="sm:grid-cols-1">
              <Fact label="Adresse professionnelle">{a.email}</Fact>
              {!a.restricted && (
                <>
                  <Fact label="Téléphone">{a.phone}</Fact>
                  <Fact label="Courriel personnel">{a.personal_email}</Fact>
                  <Fact label="Adresse">{a.address}</Fact>
                </>
              )}
            </Facts>
          </Section>
          {!a.restricted && (
            <ListBlock
              title="Personnes à prévenir"
              icon={<Phone className="size-6" />}
              agent={a}
              kind="contacts"
              empty="Aucune personne à prévenir."
              rows={a.contacts.map((c) => ({
                id: c.id,
                main: c.name,
                sub: [c.relation, c.phone, c.email].filter(Boolean).join(" · "),
              }))}
            />
          )}
          <Section title="Compte">
            <Facts className="sm:grid-cols-1">
              <Fact label="Accès">
                <Chip tone={ACCOUNT[a.account_status]?.tone ?? "muted"}>
                  {ACCOUNT[a.account_status]?.label ?? a.account_status}
                </Chip>
              </Fact>
              <Fact label="Profil">{a.profile_name}</Fact>
              {current && <Fact label="Affectation en cours depuis">{frDate(current.started_on)}</Fact>}
            </Facts>
          </Section>
          {a.notes && a.can.manage && (
            <Section title="Observations">
              <p className="whitespace-pre-wrap px-5 pb-5 text-[13.5px]">{a.notes}</p>
            </Section>
          )}
        </div>
      </div>
      {editing && <AgentForm agent={a} onClose={() => setEditing(false)} />}
      {exiting && <ExitDialog agent={a} onClose={() => setExiting(false)} />}
      {correcting && <CorrectionDialog onClose={() => setCorrecting(false)} />}
    </div>
  );
}

/** Diplômes et personnes à prévenir : le service RH, ou l'agent pour lui-même. */
function ListBlock({
  title,
  icon,
  agent,
  kind,
  rows,
  empty,
}: {
  title: string;
  icon: ReactNode;
  agent: AgentDetail;
  kind: "diplomas" | "contacts" | "trainings" | "evaluations";
  rows: { id: string; main: string; sub: string }[];
  empty: string;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const canEdit = agent.can.manage;
  const [f, setF] = useState<Form>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ["hr-agent"] });
  const fields =
    kind === "diplomas"
      ? [
          ["title", "Intitulé", true],
          ["level", "Niveau", false],
          ["field", "Spécialité", false],
          ["institution", "Établissement", false],
          ["year", "Année", false],
        ]
      : kind === "trainings"
        ? [
            ["title", "Intitulé", true],
            ["provider", "Organisme", false],
            ["start_on", "Du", false],
            ["end_on", "Au", false],
          ]
        : kind === "evaluations"
          ? [
              ["year", "Année", true],
              ["rating", "Appréciation", true],
              ["comment", "Commentaire", false],
            ]
          : [
              ["name", "Nom", true],
              ["relation", "Lien", false],
              ["phone", "Téléphone", false],
              ["email", "Courriel", false],
            ];
  const save = () => {
    const body: Record<string, unknown> = { ...f };
    if (kind === "diplomas") body.year = f.year ? Number(f.year) : null;
    if (kind === "evaluations") body.year = Number(f.year);
    if (kind === "trainings") {
      body.start_on = f.start_on || null;
      body.end_on = f.end_on || null;
    }
    api.post(`/api/hr/agents/${agent.user_id}/${kind}`, body).then(() => {
      toast.success("Ajouté au dossier");
      setAdding(false);
      setF({});
      refresh();
    }, fail);
  };
  return (
    <Section
      title={title}
      aside={
        canEdit && (
          <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setAdding(true)}>
            Ajouter
          </Button>
        )
      }
    >
      {rows.length ? (
        <ul className="divide-y divide-line px-5 pb-3">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium">{r.main}</span>
                {r.sub && <span className="block text-[12.5px] text-muted">{r.sub}</span>}
              </span>
              {canEdit && (
                <IconButton
                  label={`Retirer ${r.main}`}
                  size="sm"
                  onClick={() =>
                    api.del(`/api/hr/${kind}/${r.id}`).then(() => {
                      toast.success("Retiré du dossier");
                      refresh();
                    }, fail)
                  }
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-5 pb-5">
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <span className="text-faint">{icon}</span>
            {empty}
          </p>
        </div>
      )}
      {adding && (
        <Drawer
          open
          onClose={() => setAdding(false)}
          dirty={Object.values(f).some(Boolean)}
          width={520}
          subtitle={`Dossier de ${fullName(agent)}`}
          title={
            kind === "diplomas"
              ? "Ajouter un diplôme"
              : kind === "trainings"
                ? "Ajouter une formation"
                : kind === "evaluations"
                  ? "Ajouter une évaluation"
                  : "Ajouter une personne à prévenir"
          }
          footer={
            <>
              <Button onClick={() => setAdding(false)}>Annuler</Button>
              <Button variant="primary" disabled={!f[fields[0][0] as string]?.trim()} onClick={save}>
                Ajouter
              </Button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(([k, label, required]) => (
              <Field key={k as string} label={label as string} required={required as boolean}>
                {(a) =>
                  k === "rating" ? (
                    <Select
                      {...a}
                      value={f.rating ?? ""}
                      onChange={(e) => setF((x) => ({ ...x, rating: e.target.value }))}
                    >
                      <option value="">Choisir…</option>
                      {Object.entries(RATING_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      {...a}
                      type={k === "year" ? "number" : k === "start_on" || k === "end_on" ? "date" : "text"}
                      value={f[k as string] ?? ""}
                      onChange={(e) => setF((x) => ({ ...x, [k as string]: e.target.value }))}
                    />
                  )
                }
              </Field>
            ))}
          </div>
        </Drawer>
      )}
    </Section>
  );
}

/** Acte de sortie (thème 6, RH-1) : à sa date, l'affectation se clôt et le compte est suspendu. */
function ExitDialog({ agent, onClose }: { agent: AgentDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ exit_on: "", reason: "", reference: "" });
  const [busy, setBusy] = useState(false);
  const save = () => {
    setBusy(true);
    api
      .post(`/api/hr/agents/${agent.user_id}/exit`, f)
      .then(() => {
        toast.success("Sortie enregistrée");
        qc.invalidateQueries({ queryKey: ["hr-agent"] });
        qc.invalidateQueries({ queryKey: ["hr-agents"] });
        onClose();
      }, fail)
      .finally(() => setBusy(false));
  };
  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      subtitle={`Dossier de ${fullName(agent)}`}
      title="Enregistrer la sortie"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" loading={busy} disabled={!f.exit_on || !f.reason} onClick={save}>
            Enregistrer
          </Button>
        </>
      }
    >
      <p className="mb-3 text-[13px] text-muted">
        À la date de sortie, l'affectation en cours se clôt, le compte est suspendu et son chef est prévenu des tâches
        encore ouvertes. Un chef en poste est d'abord remplacé à la tête de son entité.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date de sortie" required>
          {(a) => (
            <Input {...a} type="date" value={f.exit_on} onChange={(e) => setF({ ...f, exit_on: e.target.value })} />
          )}
        </Field>
        <Field label="Motif" required>
          {(a) => (
            <Select {...a} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>
              <option value="">Choisir…</option>
              {Object.entries(EXIT_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Référence de l'acte" className="sm:col-span-2">
          {(a) => <Input {...a} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />}
        </Field>
      </div>
    </Drawer>
  );
}

/** L'agent signale une erreur de son dossier au service RH (thème 6, D-4). */
function CorrectionDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const send = () =>
    api.post("/api/hr/me/corrections", { message }).then(() => {
      toast.success("Demande envoyée au service des ressources humaines");
      qc.invalidateQueries({ queryKey: ["hr-agent"] });
      onClose();
    }, fail);
  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      subtitle="Mon dossier"
      title="Demander une correction"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!message.trim()} onClick={send}>
            Envoyer
          </Button>
        </>
      }
    >
      <Field
        label="Ce qui doit être corrigé"
        required
        hint="Le service des ressources humaines vérifie et vous répond."
      >
        {(a) => <Textarea {...a} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />}
      </Field>
    </Drawer>
  );
}

/** Pour le service RH : échéances à 90 jours et demandes de correction en attente (thème 6, RH-3 et D-4). */
function HrInbox() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: due } = useQuery({
    queryKey: ["hr-deadlines"],
    queryFn: () =>
      api.get<{ user_id: string; name: string; kind: "fin_contrat" | "retraite"; on: string; days: number }[]>(
        "/api/hr/deadlines",
      ),
    retry: false,
  });
  const { data: asks } = useQuery({
    queryKey: ["hr-corrections"],
    queryFn: () =>
      api.get<{ id: string; user_id: string; name: string; message: string; status: string }[]>("/api/hr/corrections"),
    retry: false,
  });
  const open = (asks ?? []).filter((c) => c.status === "open");
  if (!due?.length && !open.length) return null;
  const close = (id: string) => {
    const response = window.prompt("Réponse à l'agent (facultatif)") ?? "";
    api.post(`/api/hr/corrections/${id}/close`, { response }).then(() => {
      toast.success("Demande traitée : l'agent est prévenu");
      qc.invalidateQueries({ queryKey: ["hr-corrections"] });
    }, fail);
  };
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {!!due?.length && (
        <Section title="Échéances à 90 jours">
          <ul className="divide-y divide-line px-5 pb-3">
            {due.map((d) => (
              <li key={`${d.user_id}-${d.kind}`} className="flex items-center gap-3 py-2 text-[13px]">
                <button
                  className="min-w-0 flex-1 truncate text-left font-medium hover:underline"
                  onClick={() => nav(`/rh/${d.user_id}`)}
                >
                  {d.name}
                </button>
                <span className="text-muted">{d.kind === "fin_contrat" ? "Fin de contrat" : "Retraite"}</span>
                <Chip tone={d.days <= 30 ? "danger" : "info"}>{frDate(d.on)}</Chip>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {!!open.length && (
        <Section title="Demandes de correction">
          <ul className="divide-y divide-line px-5 pb-3">
            {open.map((c) => (
              <li key={c.id} className="flex items-start gap-3 py-2 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-muted">{c.message}</span>
                </span>
                <Button size="sm" onClick={() => close(c.id)}>
                  Traitée
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
