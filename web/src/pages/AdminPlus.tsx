import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, Info, Megaphone, MonitorSmartphone, ShieldAlert, X } from "lucide-react";
import { Button, Chip, Empty, Spinner, cn } from "@/components/ui";
import { Field, Input, Section, Select, Table, Td, Tr } from "@/components/gov";
import { ago } from "@/lib/format";
import { api } from "@/lib/api";

/*
 * Administration système, suite : l'état du système (volumes, comptes, messagerie, stockage, alertes), le bandeau
 * d'information affiché à tous, les sessions ouvertes et la matrice des rôles (qui voit, fait et valide quoi).
 */

interface Health {
  generated_at: string;
  accounts: {
    total: number;
    active: number;
    invited: number;
    suspended: number;
    pending: number;
    without_mfa_admins: number;
    never_logged: number;
  };
  sessions: { active: number; users: number };
  mail: { configured: boolean; sent_7d: number; failed_7d: number };
  storage: { files: number; bytes: number };
  volumes: Record<string, number>;
  security: { failed_logins_24h: number; locked_24h: number };
  alerts: { level: "danger" | "warning" | "info"; text: string }[];
}
const VOLUME_LABEL: Record<string, string> = {
  organizations: "Institutions",
  units: "Entités",
  agents: "Dossiers d'agents",
  projects: "Projets",
  tasks: "Tâches",
  tasks_late: "Tâches en retard",
  meetings: "Réunions",
  decisions: "Décisions",
  mail: "Courriers",
  mail_late: "Courriers en retard",
  partners: "Partenaires",
};
const fail = (e: unknown) => toast.error((e as Error).message);
const size = (b: number) =>
  b > 1024 ** 3
    ? `${(b / 1024 ** 3).toFixed(1)} Go`
    : b > 1024 ** 2
      ? `${(b / 1024 ** 2).toFixed(1)} Mo`
      : `${Math.round(b / 1024)} ko`;

function Tile({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: string | number;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
      <p className="text-[12.5px] text-muted">{label}</p>
      <p className={cn("mt-0.5 text-[24px] font-semibold tabular-nums", alert && "text-danger")}>{value}</p>
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

export function SystemHealth() {
  const { data: h } = useQuery({ queryKey: ["admin-health"], queryFn: () => api.get<Health>("/api/admin/health") });
  if (!h) return <Spinner />;
  return (
    <div className="space-y-4">
      {h.alerts.length > 0 && (
        <ul className="space-y-2">
          {h.alerts.map((a) => (
            <li
              key={a.text}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-[13px]",
                a.level === "danger"
                  ? "bg-danger-soft text-danger"
                  : a.level === "warning"
                    ? "bg-warning-soft text-warning"
                    : "bg-info-soft text-info",
              )}
            >
              {a.level === "info" ? (
                <Info className="size-4 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 shrink-0" />
              )}
              {a.text}
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Comptes actifs"
          value={h.accounts.active}
          hint={`${h.accounts.total} au total · ${h.accounts.invited} en attente`}
        />
        <Tile
          label="Sessions ouvertes"
          value={h.sessions.active}
          hint={`${h.sessions.users} personne(s) connectée(s)`}
        />
        <Tile
          label="Messagerie"
          value={h.mail.configured ? "Configurée" : "Absente"}
          hint={`${h.mail.sent_7d} envoyé(s) · ${h.mail.failed_7d} échec(s) en 7 jours`}
          alert={!h.mail.configured || h.mail.failed_7d > 0}
        />
        <Tile label="Documents stockés" value={h.storage.files} hint={size(h.storage.bytes)} />
        <Tile
          label="Échecs de connexion (24 h)"
          value={h.security.failed_logins_24h}
          alert={h.security.failed_logins_24h >= 5}
        />
        <Tile label="Comptes verrouillés (24 h)" value={h.security.locked_24h} alert={h.security.locked_24h > 0} />
        <Tile
          label="Droits élevés sans 2FA"
          value={h.accounts.without_mfa_admins}
          alert={h.accounts.without_mfa_admins > 0}
        />
        <Tile label="Jamais connectés" value={h.accounts.never_logged} hint="comptes actifs" />
      </div>
      <Section title="Volumes">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 px-5 pb-5 text-[13.5px] sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(h.volumes).map(([k, v]) => (
            <Fragment key={k}>
              <div className="flex items-baseline justify-between gap-2 border-b border-line py-1.5">
                <dt className="text-muted">{VOLUME_LABEL[k] ?? k}</dt>
                <dd className={cn("font-medium tabular-nums", k.endsWith("_late") && v > 0 && "text-danger")}>{v}</dd>
              </div>
            </Fragment>
          ))}
        </dl>
      </Section>
      <Banner />
      <p className="text-[12px] text-faint">État calculé {ago(h.generated_at)}.</p>
    </div>
  );
}

/** Bandeau d'information affiché en tête de l'outil, pour tous (maintenance, annonce). */
function Banner() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["platform-banner"],
    queryFn: () => api.get<{ text: string; level: string } | null>("/api/platform/banner"),
  });
  const [f, setF] = useState<{ text: string; level: "info" | "warning" | "danger" } | null>(null);
  const cur = f ?? { text: data?.text ?? "", level: (data?.level as "info") ?? "info" };
  const save = (text: string) =>
    api.put("/api/admin/banner", { text, level: cur.level }).then(() => {
      toast.success(text ? "Bandeau publié pour tous" : "Bandeau retiré");
      setF(null);
      qc.invalidateQueries({ queryKey: ["platform-banner"] });
    }, fail);
  return (
    <Section title="Bandeau d'information" aside={<Megaphone className="size-4 text-faint" />}>
      <div className="space-y-3 px-5 pb-5">
        <p className="text-[13px] text-muted">
          Un message court affiché en tête de l'outil pour toutes les personnes connectées : maintenance prévue,
          annonce, incident en cours.
        </p>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <Field label="Message">
            {(a) => (
              <Input {...a} value={cur.text} maxLength={500} onChange={(e) => setF({ ...cur, text: e.target.value })} />
            )}
          </Field>
          <Field label="Niveau">
            {(a) => (
              <Select {...a} value={cur.level} onChange={(e) => setF({ ...cur, level: e.target.value as "info" })}>
                <option value="info">Information</option>
                <option value="warning">Avertissement</option>
                <option value="danger">Incident</option>
              </Select>
            )}
          </Field>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" disabled={!cur.text.trim()} onClick={() => save(cur.text.trim())}>
            Publier
          </Button>
          {data && <Button onClick={() => save("")}>Retirer le bandeau</Button>}
        </div>
      </div>
    </Section>
  );
}

/** Affiché à tous en tête de l'outil quand l'administrateur système a publié un message. */
export function PlatformBanner() {
  const { data } = useQuery({
    queryKey: ["platform-banner"],
    queryFn: () => api.get<{ text: string; level: string } | null>("/api/platform/banner"),
    staleTime: 60_000,
  });
  const [hidden, setHidden] = useState("");
  if (!data || hidden === data.text) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 border-b px-4 py-2 text-[13px] sm:px-8",
        data.level === "danger"
          ? "border-danger/30 bg-danger-soft text-danger"
          : data.level === "warning"
            ? "border-warning/30 bg-warning-soft text-warning"
            : "border-info/30 bg-info-soft text-info",
      )}
    >
      <Megaphone className="size-4 shrink-0" />
      <span className="flex-1">{data.text}</span>
      <button
        type="button"
        aria-label="Masquer le bandeau"
        onClick={() => setHidden(data.text)}
        className="opacity-70 hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function ActiveSessions() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: () =>
      api.get<
        {
          id: string;
          user_id: string;
          user_name: string;
          email: string;
          ip: string | null;
          user_agent: string | null;
          created_at: string;
          last_seen_at: string;
          mine: boolean;
        }[]
      >("/api/admin/sessions"),
  });
  const revoke = (id: string) =>
    api.del(`/api/admin/sessions/${id}`).then(() => {
      toast.success("Session fermée");
      qc.invalidateQueries({ queryKey: ["admin-sessions"] });
    }, fail);
  if (!data) return <Spinner />;
  return (
    <Section title={`Sessions ouvertes (${data.length})`} aside={<MonitorSmartphone className="size-4 text-faint" />}>
      {data.length === 0 ? (
        <Empty title="Aucune session ouverte" />
      ) : (
        <Table head={["Personne", "Adresse IP", "Navigateur", "Ouverte", "Dernière activité", ""]}>
          {data.map((s) => (
            <Tr key={s.id}>
              <Td>
                <span className="block font-medium">{s.user_name}</span>
                <span className="block text-[12px] text-muted">{s.email}</span>
              </Td>
              <Td className="font-mono text-[12px] text-muted">{s.ip ?? "—"}</Td>
              <Td className="max-w-[240px] truncate text-[12px] text-muted">{s.user_agent || "—"}</Td>
              <Td className="text-muted">{ago(s.created_at)}</Td>
              <Td className="text-muted">{ago(s.last_seen_at)}</Td>
              <Td className="text-right">
                {s.mine ? (
                  <Chip tone="info">Vous</Chip>
                ) : (
                  <Button size="sm" onClick={() => revoke(s.id)}>
                    Fermer
                  </Button>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
      <div className="h-3" />
    </Section>
  );
}

interface Matrix {
  groups: { group: string; items: { key: string; label: string }[] }[];
  profiles: {
    id: string;
    org_name: string;
    name: string;
    description: string;
    base_role: string;
    permissions: string[];
    is_system: boolean;
    members: number;
  }[];
}
/** Qui voit, fait et valide quoi : les profils en colonnes, les droits en lignes, regroupés par domaine. */
export function RolesMatrix() {
  const { data } = useQuery({ queryKey: ["roles-matrix"], queryFn: () => api.get<Matrix>("/api/admin/roles-matrix") });
  const orgs = [...new Set((data?.profiles ?? []).map((p) => p.org_name))];
  const [org, setOrg] = useState("");
  if (!data) return <Spinner />;
  const current = org || orgs[0];
  const profiles = data.profiles.filter((p) => p.org_name === current);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-[13px] text-muted">
          Chaque profil en colonne, chaque droit en ligne. Un profil se règle dans Organisation › Structure, onglet «
          Profils et droits ». Survolez un en-tête pour lire sa description.
        </p>
        {orgs.length > 1 && (
          <Select aria-label="Institution" value={current} onChange={(e) => setOrg(e.target.value)} className="w-auto">
            {orgs.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        )}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-panel shadow-sm">
        <table className="w-full min-w-[900px] border-collapse text-[12.5px]">
          <thead className="sticky top-0 bg-panel">
            <tr className="border-b border-line">
              <th className="px-3 py-2 text-left font-medium text-muted">Droit</th>
              {profiles.map((p) => (
                <th key={p.id} title={p.description} className="px-2 py-2 text-center font-medium">
                  <span className="block">{p.name}</span>
                  <span className="block text-[11px] font-normal text-faint">{p.members} pers.</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.groups.map((g) => (
              <Fragment key={g.group}>
                <tr className="bg-hover/60">
                  <td
                    colSpan={profiles.length + 1}
                    className="px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted"
                  >
                    {g.group}
                  </td>
                </tr>
                {g.items.map((i) => (
                  <tr key={i.key} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-1.5">{i.label}</td>
                    {profiles.map((p) => (
                      <td key={p.id} className="px-2 text-center">
                        {p.permissions.includes(i.key) ? (
                          <Check aria-label="Oui" className="mx-auto size-4 text-success" />
                        ) : (
                          <span aria-label="Non" className="text-faint">
                            ·
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-1.5 text-[12px] text-muted">
        <ShieldAlert className="size-3.5" />
        L'administrateur système (console) et le propriétaire de l'institution ont tous les droits ; leur usage est
        tracé au journal d'audit.
      </p>
    </div>
  );
}
