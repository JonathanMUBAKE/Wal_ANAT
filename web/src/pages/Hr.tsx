import { ExportMenu, tableDoc } from "@/components/export-menu";
import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, GraduationCap, IdCard, Pencil, Phone, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { Button, Chip, Empty, IconButton, Spinner } from "@/components/ui";
import { Drawer, DrawerSection } from "@/components/drawer";
import { Field, Input, PageHeader, Section, Select, Table, Tabs, Td, Tr, frDate } from "@/components/gov";
import { Fact, Facts } from "@/components/record";
import { useUnits } from "@/lib/hooks";
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
}
export interface AgentDetail extends AgentRow {
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
}

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
export function HrPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"agents" | "a-identifier">("agents");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
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
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
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
            </div>
            <Section>
              {rows.length ? (
                <Table head={["Matricule", "Agent", "Entité", "Fonction", "Grade", "Statut", "Compte"]}>
                  {rows.map((a) => (
                    <Tr key={a.user_id} onClick={() => nav(`/rh/${a.user_id}`)}>
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
          <p className="rounded-[10px] bg-info-soft px-3 py-2 text-[13px] text-info">
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
                {(a) => <Input {...a} type="email" value={f.email} onChange={set("email")} autoComplete="off" />}
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
            className="field-ring w-full rounded-[10px] border border-field bg-panel px-3 py-2 text-[13.5px] outline-none"
          />
        </DrawerSection>
      </div>
    </Drawer>
  );
}

/** Fiche d'un agent : lecture d'abord ; le service RH modifie, l'agent tient ses coordonnées. */
export function AgentPage({ self }: { self?: boolean }) {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: a, error } = useQuery({
    queryKey: ["hr-agent", self ? "me" : id],
    queryFn: () => api.get<AgentDetail | null>(self ? "/api/hr/me" : `/api/hr/agents/${id}`),
  });
  const [editing, setEditing] = useState(false);
  const [contactsEdit, setContactsEdit] = useState(false);
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
            {a.can.self && !a.can.manage && (
              <Button icon={<Phone className="size-4" />} onClick={() => setContactsEdit(true)}>
                Mettre à jour mes coordonnées
              </Button>
            )}
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
          <Section title="Identité">
            <Facts>
              <Fact label="Matricule">{a.matricule}</Fact>
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
        </div>
        <div className="min-w-0 space-y-4">
          <Section title="Coordonnées">
            <Facts className="sm:grid-cols-1">
              <Fact label="Adresse professionnelle">{a.email}</Fact>
              <Fact label="Téléphone">{a.phone}</Fact>
              <Fact label="Courriel personnel">{a.personal_email}</Fact>
              <Fact label="Adresse">{a.address}</Fact>
            </Facts>
          </Section>
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
      {contactsEdit && <SelfContacts agent={a} onClose={() => setContactsEdit(false)} />}
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
  kind: "diplomas" | "contacts";
  rows: { id: string; main: string; sub: string }[];
  empty: string;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const canEdit = agent.can.manage || agent.can.self;
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
      : [
          ["name", "Nom", true],
          ["relation", "Lien", false],
          ["phone", "Téléphone", false],
          ["email", "Courriel", false],
        ];
  const save = () => {
    const body: Record<string, unknown> = { ...f };
    if (kind === "diplomas") body.year = f.year ? Number(f.year) : null;
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
          title={kind === "diplomas" ? "Ajouter un diplôme" : "Ajouter une personne à prévenir"}
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
                {(a) => (
                  <Input
                    {...a}
                    type={k === "year" ? "number" : "text"}
                    value={f[k as string] ?? ""}
                    onChange={(e) => setF((x) => ({ ...x, [k as string]: e.target.value }))}
                  />
                )}
              </Field>
            ))}
          </div>
        </Drawer>
      )}
    </Section>
  );
}

function SelfContacts({ agent, onClose }: { agent: AgentDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ phone: agent.phone, address: agent.address, personal_email: agent.personal_email });
  const save = () =>
    api.patch("/api/hr/me", f).then(() => {
      toast.success("Coordonnées mises à jour");
      qc.invalidateQueries({ queryKey: ["hr-agent"] });
      onClose();
    }, fail);
  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      subtitle="Mon dossier"
      title="Mes coordonnées"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={save}>
            Enregistrer
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[13px] text-muted">
        Vous tenez vos coordonnées. Identité, grade, fonction et affectation relèvent du service des ressources
        humaines.
      </p>
      <div className="grid gap-3">
        <Field label="Téléphone">
          {(a) => <Input {...a} value={f.phone} onChange={(e) => setF((x) => ({ ...x, phone: e.target.value }))} />}
        </Field>
        <Field label="Courriel personnel">
          {(a) => (
            <Input
              {...a}
              value={f.personal_email}
              onChange={(e) => setF((x) => ({ ...x, personal_email: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Adresse">
          {(a) => <Input {...a} value={f.address} onChange={(e) => setF((x) => ({ ...x, address: e.target.value }))} />}
        </Field>
      </div>
    </Drawer>
  );
}
