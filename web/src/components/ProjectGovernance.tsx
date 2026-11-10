import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Scale, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, cn } from "./ui";
import { DomainSelect, Field, Input, ProgressBar, Section, Select, Status, frDate } from "./gov";
import { api } from "@/lib/api";
import { useUnits, useUsers } from "@/lib/hooks";
import { useShell } from "@/lib/shell";

interface Gov {
  origin: "interne" | "confie";
  sponsor: string;
  convention_ref: string;
  lead_id: string | null;
  lead_name: string | null;
  unit_id: string | null;
  domain_id: string | null;
  unit_name: string | null;
  budget_planned: number | null;
  budget_spent: number | null;
  decision_needed: string;
  team: {
    user_id: string;
    name: string;
    title: string | null;
    function_label: string | null;
    open: number;
    late: number;
  }[];
  late: { id: string; title: string; due_on: string; assignee_name: string | null }[];
  upcoming: { id: string; title: string; due_on: string; assignee_name: string | null }[];
}
const fail = (e: unknown) => toast.error((e as Error).message);
const money = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

/** Tableau de bord du projet : qui le porte, d'où il vient, qui fait quoi, ce qui presse. */
export function ProjectGovernance({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const shell = useShell();
  const [editing, setEditing] = useState(false);
  const { data: g } = useQuery({
    queryKey: ["governance", projectId],
    queryFn: () => api.get<Gov>(`/api/projects/${projectId}/governance`),
  });
  const setRole = useMutation({
    mutationFn: (v: { user: string; label: string }) =>
      api.put<Gov>(`/api/projects/${projectId}/team/${v.user}`, { function_label: v.label }),
    onSuccess: (r) => qc.setQueryData(["governance", projectId], r),
    onError: fail,
  });
  if (!g) return null;
  const spent = g.budget_planned ? Math.round(((g.budget_spent ?? 0) / g.budget_planned) * 100) : 0;
  const line = (t: Gov["late"][number], late: boolean) => (
    <button
      key={t.id}
      onClick={() => shell.openTask(t.id)}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-hover"
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{t.title}</span>
        <span className="text-[12px] text-muted">{t.assignee_name ?? "Sans responsable"}</span>
      </span>
      <span className={cn("shrink-0 tabular text-[12px]", late ? "font-medium text-danger" : "text-muted")}>
        {frDate(t.due_on)}
      </span>
    </button>
  );
  return (
    <div className="space-y-4">
      <Section>
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <Status
                label={g.origin === "confie" ? "Projet confié à l'Agence" : "Projet interne"}
                tone={g.origin === "confie" ? "info" : "neutral"}
              />
              {canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  aria-label="Modifier la fiche du projet"
                  className="text-faint hover:text-fg"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </div>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <Row label="Responsable" value={g.lead_name} />
              <Row label="Entité" value={g.unit_name} />
              {g.origin === "confie" && <Row label="Commanditaire" value={g.sponsor} />}
              {g.origin === "confie" && <Row label="Convention" value={g.convention_ref} />}
            </dl>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
              <Wallet className="size-3.5" />
              Budget
            </p>
            {g.budget_planned ? (
              <>
                <p className="mt-2 font-serif text-[30px] leading-none">{spent} %</p>
                <div className="mt-2">
                  <ProgressBar value={spent} tone={spent > 100 ? "danger" : "info"} />
                </div>
                <p className="mt-1.5 text-[12px] text-muted tabular">
                  {money(g.budget_spent ?? 0)} dépensés sur {money(g.budget_planned)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[13px] text-muted">Budget non renseigné.</p>
            )}
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
              <Scale className="size-3.5" />
              Décision attendue
            </p>
            <p className={cn("mt-2 text-[14px] leading-snug", !g.decision_needed && "text-muted")}>
              {g.decision_needed || "Aucune décision en attente."}
            </p>
          </div>
        </div>
      </Section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Section title={`Équipe projet · ${g.team.length}`}>
          <ul className="stagger p-2">
            {g.team.map((m) => (
              <li
                key={m.user_id}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium">
                    {m.name}
                    {m.user_id === g.lead_id && (
                      <span className="ml-1.5 text-[11px] font-medium text-primary">Responsable</span>
                    )}
                  </span>
                  <span className="block truncate text-[12px] text-muted">{m.title}</span>
                </span>
                {canEdit ? (
                  <Input
                    aria-label={`Rôle de ${m.name} dans le projet`}
                    placeholder="Rôle dans le projet"
                    className="h-8 text-[12.5px]"
                    defaultValue={m.function_label ?? ""}
                    onBlur={(e) =>
                      e.target.value !== (m.function_label ?? "") &&
                      setRole.mutate({ user: m.user_id, label: e.target.value })
                    }
                  />
                ) : (
                  <span className="truncate text-[13px]">{m.function_label ?? "—"}</span>
                )}
                <span className="whitespace-nowrap text-right text-[12px] tabular text-muted">
                  {m.open} en cours
                  {m.late > 0 && <span className="ml-2 font-medium text-danger">{m.late} en retard</span>}
                </span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Ce qui presse">
          <div className="p-2">
            {!g.late.length && !g.upcoming.length && (
              <p className="px-2 py-3 text-[13px] text-muted">Aucune échéance renseignée.</p>
            )}
            {g.late.map((t) => line(t, true))}
            {g.upcoming.slice(0, Math.max(0, 6 - g.late.length)).map((t) => line(t, false))}
          </div>
        </Section>
      </div>
      {editing && <EditGovernance g={g} projectId={projectId} onClose={() => setEditing(false)} />}
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-muted">{label}</dt>
    <dd className="truncate text-right font-medium">{value || "—"}</dd>
  </div>
);

function EditGovernance({ g, projectId, onClose }: { g: Gov; projectId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const [f, setF] = useState({
    origin: g.origin,
    sponsor: g.sponsor,
    convention_ref: g.convention_ref,
    lead_id: g.lead_id ?? "",
    unit_id: g.unit_id ?? "",
    domain_id: g.domain_id ?? "",
    budget_planned: g.budget_planned?.toString() ?? "",
    budget_spent: g.budget_spent?.toString() ?? "",
    decision_needed: g.decision_needed,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\s/g, "").replace(",", ".")));
  const save = useMutation({
    mutationFn: () =>
      api.put<Gov>(`/api/projects/${projectId}/governance`, {
        ...f,
        lead_id: f.lead_id || null,
        unit_id: f.unit_id || null,
        domain_id: f.domain_id || null,
        budget_planned: num(f.budget_planned),
        budget_spent: num(f.budget_spent),
      }),
    onSuccess: (r) => {
      qc.setQueryData(["governance", projectId], r);
      qc.invalidateQueries({ queryKey: ["pilotage"] });
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Fiche du projet"
      width={560}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nature du projet">
          {(a) => (
            <Select {...a} value={f.origin} onChange={set("origin")}>
              <option value="interne">Projet interne</option>
              <option value="confie">Projet confié à l'Agence</option>
            </Select>
          )}
        </Field>
        <Field label="Responsable du projet">
          {(a) => (
            <Select {...a} value={f.lead_id} onChange={set("lead_id")}>
              <option value="">—</option>
              {users
                ?.filter((u) => !u.is_ai)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label="Domaine d'activité">
          {(a) => <DomainSelect {...a} value={f.domain_id} onChange={(v) => setF({ ...f, domain_id: v })} />}
        </Field>
        <Field label="Entité porteuse">
          {(a) => (
            <Select {...a} value={f.unit_id} onChange={set("unit_id")}>
              <option value="">—</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {f.origin === "confie" ? (
          <Field label="Commanditaire">{(a) => <Input {...a} value={f.sponsor} onChange={set("sponsor")} />}</Field>
        ) : (
          <span />
        )}
        {f.origin === "confie" && (
          <Field label="Référence de la convention" className="sm:col-span-2">
            {(a) => <Input {...a} value={f.convention_ref} onChange={set("convention_ref")} />}
          </Field>
        )}
        <Field label="Budget prévu">
          {(a) => <Input {...a} inputMode="decimal" value={f.budget_planned} onChange={set("budget_planned")} />}
        </Field>
        <Field label="Budget dépensé">
          {(a) => <Input {...a} inputMode="decimal" value={f.budget_spent} onChange={set("budget_spent")} />}
        </Field>
        <Field label="Décision attendue de la DG" className="sm:col-span-2">
          {(a) => <Input {...a} value={f.decision_needed} onChange={set("decision_needed")} />}
        </Field>
      </div>
    </Dialog>
  );
}
