import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ShieldAlert, Target } from "lucide-react";
import { Button, Empty, Spinner, cn } from "@/components/ui";
import { Drawer, DrawerSection } from "@/components/drawer";
import {
  Field,
  Input,
  PageHeader,
  PeopleSelect,
  PlanActivitySelect,
  ProgressBar,
  Section,
  Select,
  Status,
  Table,
  Tabs,
  Td,
  Textarea,
  Tr,
  type Tone,
} from "@/components/gov";
import { ExportMenu, tableDoc } from "@/components/export-menu";
import { useCan, useProjects, useUsers } from "@/lib/hooks";
import { api } from "@/lib/api";

/*
 * Risques et indicateurs (docs/FONCTIONNEMENT-PAR-MODULE.md, I-12). Le registre des risques — chacun avec sa probabilité,
 * son impact, son responsable, sa parade et, s'il y a lieu, le projet qu'il menace — et les indicateurs stratégiques,
 * chacun rattaché à l'activité du plan de travail qu'il mesure. Ce que le tableau de bord DG affiche se saisit ici.
 */

export interface Risk {
  id: string;
  title: string;
  probability: number;
  impact: number;
  score: number;
  owner_id: string | null;
  owner_name: string | null;
  mitigation: string;
  status: "open" | "mitigated" | "closed";
  project_id: string | null;
  project_name: string | null;
}
interface Indicator {
  id: string;
  name: string;
  unit_label: string;
  source: string;
  baseline: number;
  target: number;
  result: number;
  plan_activity_id: string | null;
  plan_activity_title: string | null;
  plan_year: number | null;
  plan_unit_name: string | null;
}
const RISK_STATUS: Record<Risk["status"], { label: string; tone: Tone }> = {
  open: { label: "Ouvert", tone: "warning" },
  mitigated: { label: "Maîtrisé", tone: "info" },
  closed: { label: "Clos", tone: "neutral" },
};
const LEVEL = (score: number): { label: string; tone: Tone } =>
  score >= 15
    ? { label: `Critique · ${score}`, tone: "danger" }
    : score >= 8
      ? { label: `Élevé · ${score}`, tone: "warning" }
      : { label: `Modéré · ${score}`, tone: "info" };
const fail = (e: unknown) => toast.error((e as Error).message);
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\s/g, "").replace(",", ".")));
const pct = (i: Indicator) =>
  i.target === i.baseline
    ? 0
    : Math.max(0, Math.min(100, Math.round((100 * (i.result - i.baseline)) / (i.target - i.baseline))));

export function RisksPage() {
  const can = useCan();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<"risques" | "indicateurs">(
    params.get("onglet") === "indicateurs" ? "indicateurs" : "risques",
  );
  const [risk, setRisk] = useState<Risk | "new" | null>(null);
  const [indicator, setIndicator] = useState<Indicator | "new" | null>(null);
  const { data: risks, error } = useQuery({ queryKey: ["risks"], queryFn: () => api.get<Risk[]>("/api/risks") });
  const { data: indicators } = useQuery({
    queryKey: ["indicators"],
    queryFn: () => api.get<Indicator[]>("/api/indicators"),
  });
  const manage = can("risks.manage");
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={ShieldAlert}
        crumbs={["Pilotage", "Risques et indicateurs"]}
        title="Risques et indicateurs"
        subtitle="Les risques qui menacent les engagements de l'Agence, et les indicateurs qui mesurent l'atteinte du plan de travail. Le tableau de bord DG les affiche."
        actions={
          <>
            <ExportMenu
              build={() =>
                tab === "risques"
                  ? tableDoc(
                      "Registre des risques",
                      ["Risque", "Projet", "Probabilité", "Impact", "Niveau", "Responsable", "Parade", "État"],
                      (risks ?? []).map((r) => [
                        r.title,
                        r.project_name,
                        r.probability,
                        r.impact,
                        LEVEL(r.score).label,
                        r.owner_name,
                        r.mitigation,
                        RISK_STATUS[r.status].label,
                      ]),
                      { filename: "registre-des-risques", widths: [4, 3, 1.2, 1, 1.6, 2.2, 5, 1.4] },
                    )
                  : tableDoc(
                      "Indicateurs stratégiques",
                      ["Indicateur", "Activité du plan", "Référence", "Cible", "Résultat", "Atteinte", "Source"],
                      (indicators ?? []).map((i) => [
                        i.name,
                        i.plan_activity_title ? `${i.plan_activity_title} (${i.plan_unit_name}, ${i.plan_year})` : "",
                        `${i.baseline} ${i.unit_label}`,
                        `${i.target} ${i.unit_label}`,
                        `${i.result} ${i.unit_label}`,
                        `${pct(i)} %`,
                        i.source,
                      ]),
                      { filename: "indicateurs-strategiques", widths: [4, 4, 1.5, 1.5, 1.5, 1.2, 3] },
                    )
              }
            />
            {manage && (
              <Button
                variant="primary"
                icon={<Plus className="size-4" />}
                onClick={() => (tab === "risques" ? setRisk("new") : setIndicator("new"))}
              >
                {tab === "risques" ? "Nouveau risque" : "Nouvel indicateur"}
              </Button>
            )}
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "risques" as const, label: "Risques", badge: risks?.filter((r) => r.status === "open").length },
          { id: "indicateurs" as const, label: "Indicateurs", badge: indicators?.length },
        ]}
      />
      <div className="mx-auto max-w-[1480px] p-4 sm:px-8 sm:py-6">
        <Section>
          {error ? (
            <p className="p-5 text-[13px] text-danger">{(error as Error).message}</p>
          ) : tab === "risques" ? (
            !risks ? (
              <div className="p-5">
                <Spinner />
              </div>
            ) : risks.length ? (
              <RiskTable risks={risks} onOpen={manage ? setRisk : undefined} />
            ) : (
              <Empty icon={<ShieldAlert className="size-6" />} title="Aucun risque enregistré">
                Un risque se décrit par sa probabilité et son impact (de 1 à 5), un responsable et une parade.
              </Empty>
            )
          ) : !indicators ? (
            <div className="p-5">
              <Spinner />
            </div>
          ) : indicators.length ? (
            <Table head={["Indicateur", "Activité du plan", "Référence", "Cible", "Résultat", "Atteinte", "Source"]}>
              {indicators.map((i) => (
                <Tr key={i.id} onClick={manage ? () => setIndicator(i) : undefined}>
                  <Td className="min-w-[220px] font-medium">{i.name}</Td>
                  <Td className="text-muted">
                    {i.plan_activity_title ? `${i.plan_activity_title} · ${i.plan_unit_name}, ${i.plan_year}` : "—"}
                  </Td>
                  <Td className="tabular-nums">
                    {i.baseline} {i.unit_label}
                  </Td>
                  <Td className="tabular-nums">
                    {i.target} {i.unit_label}
                  </Td>
                  <Td className="tabular-nums font-medium">
                    {i.result} {i.unit_label}
                  </Td>
                  <Td className="min-w-[140px]">
                    <ProgressBar value={pct(i)} tone={pct(i) >= 100 ? "success" : "info"} />
                    <span className="text-[12px] tabular-nums text-muted">{pct(i)} %</span>
                  </Td>
                  <Td className="text-muted">{i.source || "—"}</Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <Empty icon={<Target className="size-6" />} title="Aucun indicateur">
              Un indicateur a une valeur de référence, une cible et un résultat, et mesure une activité du plan.
            </Empty>
          )}
          <div className="h-3" />
        </Section>
      </div>
      {risk && <RiskDrawer risk={risk === "new" ? null : risk} onClose={() => setRisk(null)} />}
      {indicator && (
        <IndicatorDrawer indicator={indicator === "new" ? null : indicator} onClose={() => setIndicator(null)} />
      )}
    </div>
  );
}

export function RiskTable({ risks, onOpen }: { risks: Risk[]; onOpen?: (r: Risk) => void }) {
  return (
    <Table head={["Risque", "Projet", "Niveau", "Responsable", "Parade", "État"]}>
      {risks.map((r) => (
        <Tr key={r.id} onClick={onOpen ? () => onOpen(r) : undefined}>
          <Td className="min-w-[220px] font-medium">{r.title}</Td>
          <Td className="text-muted">
            {r.project_id ? (
              <Link
                to={`/projects/${r.project_id}/dashboard`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline"
              >
                {r.project_name}
              </Link>
            ) : (
              "Agence"
            )}
          </Td>
          <Td>
            <Status {...LEVEL(r.score)} />
            <span className="block text-[11.5px] text-muted">
              probabilité {r.probability} × impact {r.impact}
            </span>
          </Td>
          <Td className="text-muted">{r.owner_name ?? "—"}</Td>
          <Td className="min-w-[220px] text-[12.5px] text-muted">{r.mitigation || "—"}</Td>
          <Td>
            <Status {...RISK_STATUS[r.status]} />
          </Td>
        </Tr>
      ))}
    </Table>
  );
}

const Scale5 = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
  <Field label={label} required hint="1 = très faible · 5 = très fort">
    {(a) => (
      <Select {...a} value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>
    )}
  </Field>
);

/** Un risque : créer ou modifier. Le projet peut être imposé (depuis le tableau de bord d'un projet). */
export function RiskDrawer({
  risk,
  projectId,
  onClose,
}: {
  risk: Risk | null;
  projectId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const { data: projects } = useProjects();
  const [f, setF] = useState({
    title: risk?.title ?? "",
    probability: risk?.probability ?? 3,
    impact: risk?.impact ?? 3,
    owner_id: risk?.owner_id ?? "",
    mitigation: risk?.mitigation ?? "",
    status: risk?.status ?? "open",
    project_id: risk?.project_id ?? projectId ?? "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, owner_id: f.owner_id || null, project_id: f.project_id || null };
      if (risk) await api.patch(`/api/risks/${risk.id}`, body);
      else await api.post("/api/risks", body);
      qc.invalidateQueries({ queryKey: ["risks"] });
      qc.invalidateQueries({ queryKey: ["pilotage"] });
      toast.success(risk ? "Risque mis à jour" : "Risque enregistré");
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const score = f.probability * f.impact;
  return (
    <Drawer
      open
      onClose={onClose}
      title={risk ? risk.title : "Nouveau risque"}
      subtitle={`Niveau ${LEVEL(score).label}`}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" loading={busy} disabled={!f.title.trim()} onClick={save}>
            Enregistrer
          </Button>
        </>
      }
    >
      <DrawerSection title="Le risque">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Intitulé" required className="sm:col-span-2">
            {(a) => <Input {...a} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}
          </Field>
          <Scale5 label="Probabilité" value={f.probability} onChange={(v) => setF({ ...f, probability: v })} />
          <Scale5 label="Impact" value={f.impact} onChange={(v) => setF({ ...f, impact: v })} />
          <Field label="Projet menacé" hint="Laisser vide pour un risque qui concerne l'Agence entière.">
            {(a) => (
              <Select
                {...a}
                value={f.project_id}
                disabled={!!projectId}
                onChange={(e) => setF({ ...f, project_id: e.target.value })}
              >
                <option value="">Agence entière</option>
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Responsable">
            {(a) => (
              <PeopleSelect
                {...a}
                value={f.owner_id}
                onChange={(v) => setF({ ...f, owner_id: v })}
                people={users}
                placeholder="Non désigné"
              />
            )}
          </Field>
          <Field
            label="Parade"
            className="sm:col-span-2"
            hint="Ce qui est fait pour réduire la probabilité ou l'impact."
          >
            {(a) => (
              <Textarea {...a} value={f.mitigation} onChange={(e) => setF({ ...f, mitigation: e.target.value })} />
            )}
          </Field>
          {risk && (
            <Field label="État">
              {(a) => (
                <Select
                  {...a}
                  value={f.status}
                  onChange={(e) => setF({ ...f, status: e.target.value as Risk["status"] })}
                >
                  {Object.entries(RISK_STATUS).map(([v, x]) => (
                    <option key={v} value={v}>
                      {x.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>
      </DrawerSection>
    </Drawer>
  );
}

function IndicatorDrawer({ indicator, onClose }: { indicator: Indicator | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: indicator?.name ?? "",
    unit_label: indicator?.unit_label ?? "",
    baseline: indicator ? String(indicator.baseline) : "0",
    target: indicator ? String(indicator.target) : "",
    result: indicator ? String(indicator.result) : "0",
    source: indicator?.source ?? "",
    plan_activity_id: indicator?.plan_activity_id ?? "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: f.name,
        unit_label: f.unit_label,
        source: f.source,
        baseline: num(f.baseline) ?? 0,
        target: num(f.target),
        result: num(f.result) ?? 0,
        plan_activity_id: f.plan_activity_id || null,
      };
      if (indicator) await api.patch(`/api/indicators/${indicator.id}`, body);
      else await api.post("/api/indicators", body);
      qc.invalidateQueries({ queryKey: ["indicators"] });
      qc.invalidateQueries({ queryKey: ["pilotage"] });
      toast.success(indicator ? "Indicateur mis à jour" : "Indicateur enregistré");
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer
      open
      onClose={onClose}
      title={indicator ? indicator.name : "Nouvel indicateur"}
      subtitle="Indicateur stratégique"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" loading={busy} disabled={!f.name.trim() || num(f.target) === null} onClick={save}>
            Enregistrer
          </Button>
        </>
      }
    >
      <DrawerSection title="L'indicateur">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Intitulé" required className="sm:col-span-3">
            {(a) => <Input {...a} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
          </Field>
          <Field label="Référence">
            {(a) => (
              <Input
                {...a}
                inputMode="decimal"
                value={f.baseline}
                onChange={(e) => setF({ ...f, baseline: e.target.value })}
              />
            )}
          </Field>
          <Field label="Cible" required>
            {(a) => (
              <Input
                {...a}
                inputMode="decimal"
                value={f.target}
                onChange={(e) => setF({ ...f, target: e.target.value })}
              />
            )}
          </Field>
          <Field label="Résultat">
            {(a) => (
              <Input
                {...a}
                inputMode="decimal"
                value={f.result}
                onChange={(e) => setF({ ...f, result: e.target.value })}
              />
            )}
          </Field>
          <Field label="Unité" hint="communes, %, rapports…">
            {(a) => <Input {...a} value={f.unit_label} onChange={(e) => setF({ ...f, unit_label: e.target.value })} />}
          </Field>
          <Field label="Source" className="sm:col-span-2">
            {(a) => <Input {...a} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} />}
          </Field>
          <Field label="Activité du plan mesurée" className="sm:col-span-3">
            {(a) => (
              <PlanActivitySelect
                {...a}
                value={f.plan_activity_id}
                onChange={(v) => setF({ ...f, plan_activity_id: v })}
              />
            )}
          </Field>
        </div>
      </DrawerSection>
    </Drawer>
  );
}

/** Sur le tableau de bord d'un projet : ses risques. */
export function ProjectRisks({ projectId }: { projectId: string }) {
  const can = useCan();
  const [open, setOpen] = useState<Risk | "new" | null>(null);
  const { data } = useQuery({
    queryKey: ["risks", "project", projectId],
    queryFn: () => api.get<Risk[]>(`/api/risks?project_id=${projectId}`),
  });
  const manage = can("risks.manage");
  return (
    <Section
      title="Risques du projet"
      aside={
        manage && (
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setOpen("new")}>
            Ajouter un risque
          </Button>
        )
      }
    >
      {data?.length ? (
        <RiskTable risks={data} onOpen={manage ? setOpen : undefined} />
      ) : (
        <p className={cn("px-5 pb-5 text-[13px] text-muted")}>Aucun risque enregistré pour ce projet.</p>
      )}
      <div className="h-3" />
      {open && <RiskDrawer risk={open === "new" ? null : open} projectId={projectId} onClose={() => setOpen(null)} />}
    </Section>
  );
}
