import { ExportMenu } from "@/components/export-menu";
import { useState } from "react";
import { Navigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button, Chip, Dialog, Empty, Menu, MenuContent, MenuItem, MenuTrigger, Spinner, cn } from "@/components/ui";
import { Drawer, DrawerSection } from "@/components/drawer";
import { useMe, usePrimaryDomain } from "@/lib/hooks";
import { ago } from "@/lib/format";
import { api } from "@/lib/api";
import type {
  AdminOrg,
  AdminUser,
  AuditAnalysis,
  AuditEntry,
  InviteResult,
  Severity,
  UserJournalData,
} from "@/lib/types";
import { LinkResult } from "./OrgAccess";
import { Field, Input, PageHeader, Select, Tabs } from "@/components/gov";
import { InstitutionSettings } from "./AdminReferentials";
import { OrgMail } from "./OrgMail";
import { ActiveSessions, RolesMatrix, SystemHealth } from "./AdminPlus";

const STATUS: Record<
  AdminUser["status"],
  { label: string; tone: "success" | "warning" | "danger" | "muted" | "info" }
> = {
  active: { label: "Actif", tone: "success" },
  invited: { label: "Invité", tone: "info" },
  pending: { label: "À valider", tone: "warning" },
  suspended: { label: "Suspendu", tone: "danger" },
  rejected: { label: "Refusé", tone: "muted" },
};
const failure = (e: unknown) => toast.error((e as Error).message);

/** Console de l'administrateur système : tous les comptes, inscriptions et journal de sécurité. */
export function AdminPage() {
  const { data: me } = useMe();
  const [tab, setTab] = useState<
    "health" | "institution" | "mail" | "users" | "sessions" | "roles" | "settings" | "events"
  >("health");
  const org = me?.orgs.find((o) => o.id === me.org_id);
  if (me && !me.platform_role) return <Navigate to="/" replace />;
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={ShieldCheck}
        crumbs={["Administration système"]}
        title="Administration système"
        subtitle="Réservée à l'administrateur système : état du système, paramètres, messagerie, comptes, sessions, rôles et droits, inscriptions, journal d'audit."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "health", label: "État du système" },
          { id: "institution", label: "Paramètres de l'institution" },
          { id: "mail", label: "Messagerie" },
          { id: "users", label: "Comptes" },
          { id: "sessions", label: "Sessions" },
          { id: "roles", label: "Rôles et droits" },
          { id: "settings", label: "Inscriptions" },
          { id: "events", label: "Journal d'audit" },
        ]}
      />
      <div className="mx-auto max-w-[1480px] px-4 pb-16 pt-5 sm:px-8">
        {me && !me.mfa_enabled && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-warning">
            <AlertTriangle className="size-4 shrink-0" />
            Ce compte contrôle toute l'institution : activez la double authentification dans « Sécurité du compte ».
          </p>
        )}
        {tab === "health" ? (
          <SystemHealth />
        ) : tab === "sessions" ? (
          <ActiveSessions />
        ) : tab === "roles" ? (
          <RolesMatrix />
        ) : tab === "institution" ? (
          <InstitutionSettings />
        ) : tab === "mail" ? (
          <OrgMail orgName={org?.name ?? ""} primaryDomain={org?.domains?.[0] ?? ""} />
        ) : tab === "users" ? (
          <Users meId={me?.id} />
        ) : tab === "settings" ? (
          <Settings />
        ) : (
          <AuditJournal />
        )}
      </div>
    </div>
  );
}

function Users({ meId }: { meId?: string }) {
  const qc = useQueryClient();
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<AdminUser[]>("/api/admin/users"),
  });
  const [approving, setApproving] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [journal, setJournal] = useState<string | null>(null);
  const [link, setLink] = useState<InviteResult | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });
  const act = (id: string, action: string, ok: string, body: unknown = {}) =>
    api.post(`/api/admin/users/${id}/${action}`, body).then(() => {
      refresh();
      toast.success(ok);
    }, failure);
  const reset = (u: AdminUser, clear_mfa: boolean) =>
    api.post<InviteResult>(`/api/admin/users/${u.id}/reset`, { clear_mfa }).then((r) => {
      if (r.link) setLink(r);
      else toast.success("Lien envoyé par e-mail");
      refresh();
    }, failure);
  const setRole = (u: AdminUser, on: boolean) =>
    api.put(`/api/admin/users/${u.id}/platform-role`, { super_admin: on }).then(() => {
      refresh();
      toast.success("Rôle modifié");
    }, failure);
  const resend = (u: AdminUser) =>
    api.post<InviteResult>(`/api/admin/users/${u.id}/resend-invitation`).then((r) => {
      if (r.link) setLink(r);
      else toast.success("Nouveau lien envoyé par e-mail ; le précédent n'est plus valable");
      refresh();
    }, failure);
  if (!users) return <Spinner />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-muted">
          {users.length} compte(s). Un compte créé ici reste « Invité » tant que la personne n'a pas choisi son mot de
          passe.
        </p>
        <span className="ml-auto">
          <ExportMenu label="Exporter les comptes" href={(f) => `/api/admin/accounts/export?format=${f}`} />
        </span>
        <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setCreating(true)}>
          Créer un compte
        </Button>
      </div>
      {journal && <UserJournal userId={journal} onClose={() => setJournal(null)} />}
      {creating && (
        <CreateAccount
          onClose={() => setCreating(false)}
          onDone={(r) => {
            setCreating(false);
            refresh();
            if (r.link) setLink(r);
            else toast.success("Compte créé : le lien de finalisation est parti par e-mail");
          }}
        />
      )}
      <div className="overflow-x-auto rounded-2xl border border-line bg-panel shadow-sm">
        {link && <LinkResult result={link} onClose={() => setLink(null)} />}
        {approving && (
          <Approve
            user={approving}
            onClose={() => setApproving(null)}
            onDone={(r) => {
              setApproving(null);
              refresh();
              if (r.link) setLink(r);
              else toast.success("Invitation envoyée");
            }}
          />
        )}
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead className="border-b border-line text-[12px] text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Compte</th>
              <th className="px-2 font-medium">État</th>
              <th className="px-2 font-medium">Organisations</th>
              <th className="px-2 font-medium">Sécurité</th>
              <th className="px-2 font-medium">Dernière connexion</th>
              <th className="px-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    className="block text-left font-medium hover:underline"
                    onClick={() => setJournal(u.id)}
                  >
                    {u.name}
                    {u.platform_role && <span className="ml-1.5 text-[11px] text-ai-fg">Admin système</span>}
                  </button>
                  <span className="block text-[12px] text-faint">{u.email}</span>
                  {u.access_request_note && (
                    <span className="block text-[12px] text-muted">« {u.access_request_note} »</span>
                  )}
                </td>
                <td className="px-2">
                  <Chip tone={STATUS[u.status].tone}>{STATUS[u.status].label}</Chip>
                </td>
                <td className="max-w-[200px] truncate px-2 text-[12.5px] text-muted">
                  {u.orgs.map((o) => o.org_name).join(", ") || "—"}
                </td>
                <td className="px-2 text-[12.5px] text-muted">
                  {u.totp_enabled ? "2FA active" : "Sans 2FA"} · {u.active_sessions} session(s)
                </td>
                <td className="px-2 text-[12.5px] text-muted">{u.last_login_at ? ago(u.last_login_at) : "Jamais"}</td>
                <td className="px-2 py-2 text-right">
                  {u.status === "pending" ? (
                    <span className="flex justify-end gap-1">
                      <Button size="sm" variant="primary" onClick={() => setApproving(u)}>
                        Valider
                      </Button>
                      <Button size="sm" onClick={() => act(u.id, "reject", "Demande refusée")}>
                        Refuser
                      </Button>
                    </span>
                  ) : (
                    u.id !== meId && (
                      <Menu>
                        <MenuTrigger asChild>
                          <Button size="sm">Actions</Button>
                        </MenuTrigger>
                        <MenuContent align="end">
                          <MenuItem onSelect={() => setJournal(u.id)}>Journal de la personne</MenuItem>
                          {u.status === "invited" && (
                            <MenuItem onSelect={() => resend(u)}>Renvoyer le lien de finalisation</MenuItem>
                          )}
                          {u.status === "suspended" && (
                            <MenuItem onSelect={() => act(u.id, "reactivate", "Compte réactivé")}>Réactiver</MenuItem>
                          )}
                          {u.status === "active" && (
                            <>
                              <MenuItem onSelect={() => reset(u, false)}>Envoyer un lien de mot de passe</MenuItem>
                              {u.totp_enabled && (
                                <MenuItem onSelect={() => reset(u, true)}>Réinitialiser aussi la 2FA</MenuItem>
                              )}
                              <MenuItem onSelect={() => act(u.id, "revoke-sessions", "Sessions fermées")}>
                                Fermer ses sessions
                              </MenuItem>
                              <MenuItem onSelect={() => setRole(u, !u.platform_role)}>
                                {u.platform_role ? "Retirer le rôle système" : "Nommer administrateur système"}
                              </MenuItem>
                              <MenuItem danger onSelect={() => act(u.id, "suspend", "Compte suspendu")}>
                                Suspendre
                              </MenuItem>
                            </>
                          )}
                        </MenuContent>
                      </Menu>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Créer un compte : l'administrateur renseigne la personne (identité, fonction, entité, profil). Elle reçoit un lien
 * personnel, valable une durée limitée, pour choisir elle-même son mot de passe. Personne d'autre ne le connaît.
 */
function CreateAccount({ onClose, onDone }: { onClose: () => void; onDone: (r: InviteResult) => void }) {
  const domain = usePrimaryDomain();
  const { data: orgs } = useQuery({ queryKey: ["admin-orgs"], queryFn: () => api.get<AdminOrg[]>("/api/admin/orgs") });
  const [f, setF] = useState({ org_id: "", name: "", email: "", title: "", unit_id: "", profile_id: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const org = orgs?.find((o) => o.id === f.org_id) ?? orgs?.[0];
  const profiles = org?.profiles.filter((p) => p.base_role !== "owner") ?? [];
  const profile =
    profiles.find((p) => p.id === f.profile_id) ?? profiles.find((p) => p.base_role === "member") ?? profiles[0];
  const emailError =
    f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? "Adresse électronique invalide" : null;
  const ready = !!org && !!profile && !!f.name.trim() && !!f.email.trim() && !emailError;
  const dirty = !!(f.name || f.email || f.title);
  const submit = () => {
    setBusy(true);
    api
      .post<InviteResult>("/api/admin/accounts", {
        org_id: org!.id,
        name: f.name.trim(),
        email: f.email.trim(),
        title: f.title.trim() || undefined,
        unit_id: f.unit_id || null,
        profile_id: profile!.id,
      })
      .then(onDone, failure)
      .finally(() => setBusy(false));
  };
  return (
    <Drawer
      open
      onClose={onClose}
      dirty={dirty && !busy}
      width={560}
      subtitle="Administration système · Comptes"
      title="Créer un compte"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!ready || busy} onClick={submit}>
            Créer et envoyer le lien
          </Button>
        </>
      }
    >
      {!orgs ? (
        <Spinner />
      ) : (
        <div className="space-y-5">
          <p className="rounded-[10px] bg-info-soft px-3 py-2 text-[13px] text-info">
            La personne reçoit un lien personnel pour choisir son mot de passe et finaliser son accès. Le compte reste «
            Invité » jusque-là ; vous pouvez renvoyer le lien depuis la liste, l'ancien cesse alors d'être valable.
          </p>
          <DrawerSection title="Identité">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom complet" required className="sm:col-span-2">
                {(a) => <Input {...a} value={f.name} onChange={set("name")} placeholder="Prénom et nom" autoFocus />}
              </Field>
              <Field label="Adresse électronique" required error={emailError} hint="Le lien y sera envoyé.">
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
              <Field label="Fonction">
                {(a) => <Input {...a} value={f.title} onChange={set("title")} placeholder="Ex. Chargé d'études" />}
              </Field>
            </div>
          </DrawerSection>
          <DrawerSection title="Rattachement et droits">
            <div className="grid gap-3 sm:grid-cols-2">
              {orgs.length > 1 && (
                <Field label="Institution" required className="sm:col-span-2">
                  {(a) => (
                    <Select
                      {...a}
                      value={org?.id ?? ""}
                      onChange={(e) => setF((x) => ({ ...x, org_id: e.target.value, unit_id: "", profile_id: "" }))}
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
              <Field label="Entité" hint="Direction, service ou cellule de la personne.">
                {(a) => (
                  <Select {...a} value={f.unit_id} onChange={set("unit_id")}>
                    <option value="">Non rattachée pour l'instant</option>
                    {(org?.units ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Profil d'accès" required hint="Détermine ce que la personne peut voir et faire.">
                {(a) => (
                  <Select {...a} value={profile?.id ?? ""} onChange={set("profile_id")}>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </DrawerSection>
        </div>
      )}
    </Drawer>
  );
}

function Approve({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: (r: InviteResult) => void;
}) {
  const { data: orgs } = useQuery({ queryKey: ["admin-orgs"], queryFn: () => api.get<AdminOrg[]>("/api/admin/orgs") });
  const [orgId, setOrgId] = useState("");
  const [profileId, setProfileId] = useState("");
  const org = orgs?.find((o) => o.id === orgId) ?? orgs?.[0];
  const profiles = org?.profiles.filter((p) => p.base_role !== "owner") ?? [];
  const profile =
    profiles.find((p) => p.id === profileId) ?? profiles.find((p) => p.base_role === "member") ?? profiles[0];
  const sel = "mt-1 h-9 w-full rounded-lg border border-line bg-bg/60 px-2.5 text-[13.5px] outline-none";
  const submit = () =>
    api
      .post<InviteResult>(`/api/admin/users/${user.id}/approve`, { org_id: org!.id, profile_id: profile!.id })
      .then(onDone, failure);
  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      width={460}
      title={`Valider ${user.name}`}
      description="La personne recevra une invitation pour choisir son mot de passe."
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!org || !profile} onClick={submit}>
            Valider et inviter
          </Button>
        </>
      }
    >
      {!orgs ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          <label className="block text-[12.5px] text-muted">
            Organisation
            <select
              value={org?.id ?? ""}
              onChange={(e) => {
                setOrgId(e.target.value);
                setProfileId("");
              }}
              className={sel}
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[12.5px] text-muted">
            Profil
            <select value={profile?.id ?? ""} onChange={(e) => setProfileId(e.target.value)} className={sel}>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </Dialog>
  );
}

function Settings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<{ registration: "invite" | "approval" }>("/api/admin/settings"),
  });
  const set = (registration: "invite" | "approval") =>
    api.patch("/api/admin/settings", { registration }).then(() => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Réglage enregistré");
    }, failure);
  if (!data) return <Spinner />;
  const options = [
    {
      v: "invite" as const,
      title: "Sur invitation uniquement (recommandé)",
      text: "Seuls les administrateurs créent des comptes. La personne reçoit un lien et choisit son mot de passe.",
    },
    {
      v: "approval" as const,
      title: "Demande d'accès avec validation",
      text: "La page de connexion propose de demander un accès. Rien n'est ouvert avant votre validation, qui déclenche une invitation.",
    },
  ];
  return (
    <div className="max-w-2xl space-y-2">
      <NewOrganization />
      <h3 className="pt-4 text-[14px] font-semibold">Création des comptes</h3>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => set(o.v)}
          className={cn(
            "w-full rounded-xl border p-4 text-left",
            data.registration === o.v ? "border-fg bg-hover" : "border-line hover:border-line-strong",
          )}
        >
          <p className="text-[14px] font-medium">{o.title}</p>
          <p className="mt-0.5 text-[13px] text-muted">{o.text}</p>
        </button>
      ))}
    </div>
  );
}

function NewOrganization() {
  const [name, setName] = useState("");
  const create = () => api.post("/api/orgs", { name }).then(() => window.location.assign("/org"), failure);
  return (
    <section className="rounded-xl border border-line p-4">
      <h3 className="text-[14px] font-semibold">Nouvelle organisation</h3>
      <p className="mt-0.5 text-[13px] text-muted">Vous en serez propriétaire et pourrez y inviter ses membres.</p>
      <div className="mt-2 flex gap-2">
        <input
          aria-label="Nom de l'organisation"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de l'organisation"
          className="h-9 flex-1 rounded-lg border border-line bg-bg/60 px-2.5 text-[13.5px] outline-none"
        />
        <Button variant="primary" className="h-9" disabled={!name.trim()} onClick={create}>
          Créer
        </Button>
      </div>
    </section>
  );
}

const when = (iso: string) => format(new Date(iso), "d MMM yyyy 'à' HH:mm", { locale: fr });

const SEVERITY: Record<Severity, { label: string; tone: "danger" | "warning" | "muted" }> = {
  critique: { label: "Critique", tone: "danger" },
  importante: { label: "Importante", tone: "warning" },
  normale: { label: "Normale", tone: "muted" },
};
const EMPTY_FILTER = { from: "", to: "", category: "", severity: "", actor_id: "", q: "" };
type AuditFilterState = typeof EMPTY_FILTER;
const queryOf = (f: Partial<AuditFilterState> & { user_id?: string }) =>
  new URLSearchParams(Object.entries(f).filter(([, v]) => !!v?.trim()) as [string, string][]).toString();

/**
 * Journal d'audit : tout ce que l'outil trace, métier et sécurité, en clair. Lecture seule : une trace ne se modifie
 * ni ne se supprime. Filtres par période, domaine, gravité, auteur et texte ; export tableur et analyse avec les
 * mêmes filtres. Consulter un export ou lancer une analyse laisse aussi une trace.
 */
function AuditJournal() {
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<AdminUser[]>("/api/admin/users"),
  });
  const [f, setF] = useState<AuditFilterState>(EMPTY_FILTER);
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const [person, setPerson] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const query = queryOf(f);
  const { data, isFetching } = useQuery({
    queryKey: ["admin-audit", query],
    queryFn: () =>
      api.get<{ entries: AuditEntry[]; categories: string[]; truncated: boolean }>(`/api/admin/audit?${query}`),
    placeholderData: (prev) => prev,
  });
  const set = (k: keyof AuditFilterState) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.value }));
  const filtered = Object.values(f).some((v) => v.trim());
  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-2xl border border-line bg-panel p-4 sm:grid-cols-2 xl:grid-cols-6 xl:items-end">
        <Field label="Rechercher" className="sm:col-span-2">
          {(a) => <Input {...a} type="search" value={f.q} onChange={set("q")} placeholder="Action, objet, auteur…" />}
        </Field>
        <Field label="Domaine">
          {(a) => (
            <Select {...a} value={f.category} onChange={set("category")}>
              <option value="">Tous les domaines</option>
              {(data?.categories ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Gravité">
          {(a) => (
            <Select {...a} value={f.severity} onChange={set("severity")}>
              <option value="">Toutes</option>
              {(Object.keys(SEVERITY) as Severity[]).map((s) => (
                <option key={s} value={s}>
                  {SEVERITY[s].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Auteur">
          {(a) => (
            <Select {...a} value={f.actor_id} onChange={set("actor_id")}>
              <option value="">Tous</option>
              {(users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Du">
            {(a) => <Input {...a} type="date" value={f.from} max={f.to || undefined} onChange={set("from")} />}
          </Field>
          <Field label="Au">
            {(a) => <Input {...a} type="date" value={f.to} min={f.from || undefined} onChange={set("to")} />}
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-6">
          <Button variant="primary" icon={<Sparkles className="size-4" />} onClick={() => setAnalysing(true)}>
            Analyser avec l'IA
          </Button>
          <ExportMenu href={(fmt) => `/api/admin/audit/export?${query}${query ? "&" : ""}format=${fmt}`} />
          {filtered && <Button onClick={() => setF(EMPTY_FILTER)}>Effacer les filtres</Button>}
          <span className="ml-auto text-[12.5px] text-muted" aria-live="polite">
            {!data
              ? ""
              : isFetching
                ? "Mise à jour…"
                : `${data.entries.length} trace(s)${data.truncated ? " — les plus récentes ; affinez ou exportez" : ""}`}
          </span>
        </div>
      </div>
      {!data ? <Spinner /> : <AuditTable entries={data.entries} onOpen={setOpen} onPerson={setPerson} />}
      {open && <EntryDrawer entry={open} onClose={() => setOpen(null)} onPerson={setPerson} />}
      {person && <UserJournal userId={person} onClose={() => setPerson(null)} />}
      {analysing && (
        <AnalysisDrawer
          filter={f}
          scope={filtered ? "Traces correspondant aux filtres en cours" : "Toutes les traces"}
          onClose={() => setAnalysing(false)}
        />
      )}
    </div>
  );
}

function AuditTable({
  entries,
  onOpen,
  onPerson,
  hideActor,
}: {
  entries: AuditEntry[];
  onOpen: (e: AuditEntry) => void;
  onPerson?: (id: string) => void;
  hideActor?: boolean;
}) {
  if (!entries.length)
    return (
      <div className="rounded-2xl border border-line bg-panel">
        <Empty title="Aucune trace">Aucune action ne correspond à ces critères.</Empty>
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel shadow-sm">
      <table className="w-full min-w-[860px] text-left text-[13px]">
        <thead className="border-b border-line text-[12px] text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Date</th>
            {!hideActor && <th className="px-2 font-medium">Auteur</th>}
            <th className="px-2 font-medium">Gravité</th>
            <th className="px-2 font-medium">Domaine</th>
            <th className="px-2 font-medium">Action</th>
            <th className="px-2 font-medium">Objet</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={`${e.source}-${e.id}`}
              tabIndex={0}
              onClick={() => onOpen(e)}
              onKeyDown={(k) => k.key === "Enter" && onOpen(e)}
              className="cursor-pointer border-b border-line last:border-b-0 hover:bg-hover focus-visible:bg-hover focus-visible:outline-none"
            >
              <td className="whitespace-nowrap px-4 py-2 text-muted">{when(e.created_at)}</td>
              {!hideActor && (
                <td className="px-2">
                  {e.actor_id && onPerson ? (
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onPerson(e.actor_id!);
                      }}
                    >
                      {e.actor_name}
                    </button>
                  ) : (
                    e.actor_name
                  )}
                </td>
              )}
              <td className="px-2">
                <Chip tone={SEVERITY[e.severity].tone}>{SEVERITY[e.severity].label}</Chip>
              </td>
              <td className="px-2 text-muted">{e.category}</td>
              <td className="px-2 font-medium">{e.label}</td>
              <td className="max-w-[360px] truncate px-2 text-muted">{e.summary || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntryDrawer({
  entry,
  onClose,
  onPerson,
}: {
  entry: AuditEntry;
  onClose: () => void;
  onPerson?: (id: string) => void;
}) {
  return (
    <Drawer
      open
      onClose={onClose}
      subtitle={`Journal d'audit · ${entry.category}`}
      title={entry.label}
      badges={<Chip tone={SEVERITY[entry.severity].tone}>Gravité {SEVERITY[entry.severity].label.toLowerCase()}</Chip>}
      footer={
        <>
          {entry.actor_id && onPerson && (
            <Button
              onClick={() => {
                onClose();
                onPerson(entry.actor_id!);
              }}
            >
              Journal de {entry.actor_name}
            </Button>
          )}
          <Button onClick={onClose}>Fermer</Button>
        </>
      }
    >
      <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 text-[13.5px]">
        <dt className="text-muted">Date</dt>
        <dd>{when(entry.created_at)}</dd>
        <dt className="text-muted">Auteur</dt>
        <dd>{entry.actor_name}</dd>
        <dt className="text-muted">Objet</dt>
        <dd>{entry.summary || "—"}</dd>
        <dt className="text-muted">Institution</dt>
        <dd>{entry.org_name ?? "—"}</dd>
        {entry.ip && (
          <>
            <dt className="text-muted">Adresse IP</dt>
            <dd className="font-mono text-[12.5px]">{entry.ip}</dd>
          </>
        )}
        <dt className="text-muted">Source</dt>
        <dd>{entry.source === "security" ? "Journal de sécurité" : "Fil d'activité"}</dd>
        <dt className="text-muted">Code</dt>
        <dd className="font-mono text-[12.5px] text-faint">{entry.kind}</dd>
      </dl>
      <p className="mt-5 text-[12.5px] text-muted">Une trace ne se modifie ni ne se supprime.</p>
    </Drawer>
  );
}

/** Journal d'une personne : ses connexions et tout ce qui touche à son compte, puis ses activités. */
function UserJournal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [tab, setTab] = useState<"connections" | "activities">("connections");
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const { data } = useQuery({
    queryKey: ["admin-user-journal", userId],
    queryFn: () => api.get<UserJournalData>(`/api/admin/users/${userId}/journal`),
  });
  const st = data?.stats;
  return (
    <Drawer
      open
      onClose={onClose}
      width={980}
      subtitle="Journal d'audit · par personne"
      title={data?.user.name ?? "Journal"}
      badges={
        data && (
          <span className="text-[12.5px] text-muted">
            {[data.user.title, data.user.email].filter(Boolean).join(" · ")}
          </span>
        )
      }
      footer={
        <>
          <ExportMenu href={(fmt) => `/api/admin/audit/export?${queryOf({ user_id: userId })}&format=${fmt}`} />
          <Button icon={<Sparkles className="size-4" />} onClick={() => setAnalysing(true)}>
            Analyser avec l'IA
          </Button>
          <Button onClick={onClose}>Fermer</Button>
        </>
      }
    >
      {!data || !st ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                ["Connexions", st.logins],
                ["Échecs de connexion", st.failed_logins],
                ["Adresses distinctes", st.addresses],
                ["Actions métier", st.activities],
                ["Traces critiques", st.critical],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="rounded-[10px] border border-line px-3 py-2">
                <p className="text-[12px] text-muted">{label}</p>
                <p className="text-[18px] font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          <p className="text-[12.5px] text-muted">
            Dernière connexion : {st.last_login_at ? when(st.last_login_at) : "jamais"}.
          </p>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: "connections", label: `Connexions et sécurité (${data.connections.length})` },
              { id: "activities", label: `Activités (${data.activities.length})` },
            ]}
          />
          <AuditTable entries={tab === "connections" ? data.connections : data.activities} onOpen={setOpen} />
        </div>
      )}
      {open && <EntryDrawer entry={open} onClose={() => setOpen(null)} />}
      {analysing && data && (
        <AnalysisDrawer
          filter={{ user_id: userId }}
          scope={`Traces de ${data.user.name} et de son compte`}
          onClose={() => setAnalysing(false)}
        />
      )}
    </Drawer>
  );
}

/**
 * Analyse : les signaux sont calculés par l'outil, à partir des traces, et se vérifient une à une ; l'IA en rédige
 * une appréciation. Elle propose, l'administrateur apprécie et décide des suites. L'analyse est elle-même tracée.
 */
function AnalysisDrawer({
  filter,
  scope,
  onClose,
}: {
  filter: Partial<AuditFilterState> & { user_id?: string };
  scope: string;
  onClose: () => void;
}) {
  const [consent, setConsent] = useState(false);
  const body = {
    ...Object.fromEntries(Object.entries(filter).filter(([, v]) => !!v?.trim())),
    ...(consent ? { consent: true } : {}),
  };
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["admin-audit-analysis", JSON.stringify(body)],
    queryFn: () => api.post<AuditAnalysis>("/api/admin/audit/analysis", body),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    retry: false,
  });
  return (
    <Drawer
      open
      onClose={onClose}
      width={760}
      subtitle="Journal d'audit · Analyse"
      title="Analyse du journal"
      badges={<span className="text-[12.5px] text-muted">{scope}</span>}
      footer={
        <>
          <Button disabled={isFetching} onClick={() => refetch()}>
            Relancer l'analyse
          </Button>
          <Button onClick={onClose}>Fermer</Button>
        </>
      }
    >
      {isFetching && !data ? (
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <Spinner /> Lecture des traces et rédaction de l'appréciation…
        </div>
      ) : error ? (
        <p className="text-[13px] text-danger">{(error as Error).message}</p>
      ) : data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["Traces lues", data.stats.total],
                ["Critiques", data.stats.critique],
                ["Importantes", data.stats.importante],
                ["Personnes", data.stats.actors],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="rounded-[10px] border border-line px-3 py-2">
                <p className="text-[12px] text-muted">{label}</p>
                <p className="text-[18px] font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          <DrawerSection title="Appréciation de l'IA">
            {data.ai ? (
              <div className="space-y-3 rounded-[10px] border border-ai-line bg-ai-soft/40 p-3 text-[13.5px]">
                <p className="leading-relaxed">{data.ai.summary}</p>
                {data.ai.recommendations.length > 0 && (
                  <div>
                    <p className="mb-1 text-[12.5px] font-medium text-muted">Mesures suggérées</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {data.ai.recommendations.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-[12px] text-muted">
                  Proposition de l'IA, rédigée à partir des seuls signaux ci-dessous : elle ne conclut à aucune faute.
                  Vous appréciez et décidez des suites.
                </p>
              </div>
            ) : data.consent_required ? (
              <div className="space-y-2 rounded-[10px] border border-line p-3 text-[13px]">
                <p>
                  L'appréciation est rédigée par un service d'IA extérieur à l'Agence. Voici ce qui lui serait envoyé :
                  des chiffres et les signaux relevés, avec les noms des personnes concernées.
                </p>
                <pre className="max-h-48 overflow-auto rounded-lg bg-hover p-2 text-[11.5px]">
                  {JSON.stringify(data.preview, null, 2)}
                </pre>
                <Button size="sm" variant="ai" onClick={() => setConsent(true)}>
                  Accepter l'envoi et rédiger l'appréciation
                </Button>
                <p className="text-[12px] text-muted">Sans votre accord, rien ne part : les signaux calculés restent valables.</p>
              </div>
            ) : (
              <p className="text-[13px] text-muted">
                L'appréciation n'a pas pu être rédigée{data.ai_error ? ` : ${data.ai_error}` : ""}. Les signaux calculés
                restent valables.
              </p>
            )}
          </DrawerSection>
          <DrawerSection title={`Signaux relevés (${data.signals.length})`}>
            {data.signals.length === 0 ? (
              <p className="text-[13px] text-muted">Aucun signal : rien d'inhabituel dans ces traces.</p>
            ) : (
              <ul className="space-y-2">
                {data.signals.map((s) => (
                  <li key={`${s.code}-${s.title}-${s.detail}`} className="rounded-[10px] border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={SEVERITY[s.severity].tone}>{SEVERITY[s.severity].label}</Chip>
                      <span className="text-[13.5px] font-medium">{s.title}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">{s.detail}</p>
                    {s.evidence.length > 0 && (
                      <details className="mt-2 text-[12.5px]">
                        <summary className="cursor-pointer text-muted">Traces à l'appui ({s.evidence.length})</summary>
                        <ul className="mt-1 space-y-0.5">
                          {s.evidence.map((e) => (
                            <li key={e.id} className="text-muted">
                              {when(e.created_at)} · {e.actor_name} · {e.label}
                              {e.summary ? ` · ${e.summary}` : ""}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DrawerSection>
          <p className="text-[12px] text-faint">
            Analyse du {when(data.generated_at)} · moteur : {data.provider === "demo" ? "démonstration" : data.provider}
            . Cette analyse est inscrite au journal.
          </p>
        </div>
      ) : null}
    </Drawer>
  );
}
