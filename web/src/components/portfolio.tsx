import { type ExportDoc, ExportMenu, tableDoc } from "@/components/export-menu";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gavel, Plus, Scale, Trash2 } from "lucide-react";
import { Button, Dialog, Empty, Spinner, cn } from "@/components/ui";
import { Drawer, DrawerSection } from "@/components/drawer";
import { Field, Input, Section, Status, Table, Td, Textarea, Tr, frDate, type Tone } from "@/components/gov";
import { Fact, Facts } from "@/components/record";
import { PlanBar } from "@/components/directions";
import { useCan, useMe } from "@/lib/hooks";
import { todayIso } from "@/lib/format";
import { api } from "@/lib/api";

/*
 * Portefeuille de projets (docs/GUIDE-FONCTIONNEL.md § 5.2) : revue de portefeuille (santé déclarée face à la santé
 * calculée d'après les faits, raisons écrites, écarts en tête) et arbitrages demandés à la DG.
 */

type Health = "on_track" | "at_risk" | "off_track" | "done";
const HEALTH: Record<Health, { label: string; tone: Tone }> = {
  on_track: { label: "Dans les temps", tone: "success" },
  at_risk: { label: "À surveiller", tone: "warning" },
  off_track: { label: "En difficulté", tone: "danger" },
  done: { label: "Terminé", tone: "neutral" },
};
interface ReviewRow {
  id: string;
  name: string;
  lead_name: string | null;
  unit_name: string | null;
  health_declared: Health;
  health_computed: Health;
  divergent: boolean;
  reasons: string[];
  schedule: { progress: number; expected: number | null; due_on: string | null };
  deliverables: { total: number; late: number };
  budget: { planned: number | null; spent: number | null; consumed: number | null };
  tasks: { open: number; overdue: number };
  arbitration: { id: string; question: string } | null;
}
interface Review {
  summary: {
    total: number;
    on_track: number;
    at_risk: number;
    off_track: number;
    done: number;
    divergent: number;
    arbitrations: number;
  };
  projects: ReviewRow[];
}
export interface Arbitration {
  id: string;
  project_id: string | null;
  activity_id: string | null;
  dossier_kind: "projet" | "activite";
  project_name: string;
  question: string;
  context: string;
  options: { label: string; consequences?: string }[];
  recommendation: number | null;
  wanted_by: string | null;
  status: "en_attente" | "tranche" | "retire";
  requested_by: string | null;
  requested_by_name: string | null;
  decided_by_name: string | null;
  decided_option: number | null;
  decision_note: string;
  decision_id: string | null;
  decision_year: number | null;
  decision_seq: number | null;
  created_at: string;
}
const ARB_STATUS: Record<Arbitration["status"], { label: string; tone: Tone }> = {
  en_attente: { label: "En attente de la DG", tone: "warning" },
  tranche: { label: "Tranché", tone: "success" },
  retire: { label: "Retiré", tone: "neutral" },
};
const fail = (e: unknown) => toast.error((e as Error).message);
const decisionRef = (a: Arbitration) =>
  a.decision_year ? `DEC/${a.decision_year}/${String(a.decision_seq).padStart(4, "0")}` : null;

const Tile = ({ label, value, alert }: { label: string; value: number; alert?: boolean }) => (
  <div className="rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
    <p className="truncate text-[12.5px] text-muted">{label}</p>
    <p className={cn("text-[22px] font-semibold tabular-nums leading-tight", alert && "text-danger")}>{value}</p>
  </div>
);

/** La revue de portefeuille : ce que disent les chefs de projet, ce que disent les faits. */
export function PortfolioReview() {
  const { data, error } = useQuery({
    queryKey: ["portfolio-review"],
    queryFn: () => api.get<Review>("/api/portfolio/review"),
  });
  if (error) return <p className="text-[13px] text-danger">{(error as Error).message}</p>;
  if (!data) return <Spinner />;
  const s = data.summary;
  const exportDoc = (): ExportDoc => ({
    title: "Revue de portefeuille",
    subtitle: `${s.total} projets · ${s.divergent} en écart avec le déclaré · ${s.arbitrations} arbitrage(s) attendu(s)`,
    filename: "revue-de-portefeuille",
    landscape: true,
    sections: [
      {
        heading: "Synthèse",
        blocks: [
          {
            kind: "facts",
            rows: [
              ["Projets suivis", s.total],
              ["Dans les temps", s.on_track],
              ["À surveiller", s.at_risk],
              ["En difficulté", s.off_track],
              ["En écart avec le déclaré", s.divergent],
              ["Arbitrages attendus", s.arbitrations],
            ],
          },
        ],
      },
      {
        heading: "Projets",
        blocks: [
          {
            kind: "table",
            head: [
              "Projet",
              "Chef de projet",
              "Déclarée",
              "Calculée",
              "Pourquoi",
              "Avancement",
              "Échéance",
              "Livrables en retard",
              "Budget consommé",
            ],
            widths: [3, 2, 1.6, 1.8, 5, 1.6, 1.4, 1.4, 1.4],
            rows: data.projects.map((p) => [
              p.name,
              p.lead_name,
              HEALTH[p.health_declared].label,
              HEALTH[p.health_computed].label + (p.divergent ? " (en écart)" : ""),
              p.reasons.join(" · "),
              p.schedule.expected !== null
                ? `${p.schedule.progress} % / ${p.schedule.expected} % attendus`
                : `${p.schedule.progress} %`,
              frDate(p.schedule.due_on),
              p.deliverables.late,
              p.budget.consumed !== null ? `${p.budget.consumed} %` : "",
            ]),
          },
        ],
      },
    ],
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportMenu build={exportDoc} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Projets suivis" value={s.total} />
        <Tile label="Dans les temps" value={s.on_track} />
        <Tile label="À surveiller" value={s.at_risk} />
        <Tile label="En difficulté" value={s.off_track} alert={s.off_track > 0} />
        <Tile label="En écart avec le déclaré" value={s.divergent} alert={s.divergent > 0} />
        <Tile label="Arbitrages attendus" value={s.arbitrations} />
      </div>
      <Section>
        <p className="px-5 pb-1 pt-4 text-[13px] text-muted">
          La santé <b className="font-medium text-fg">calculée</b> se lit dans les faits : calendrier (le trait marque
          l'avancement attendu à date), livrables, budget, tâches, arbitrage attendu. Un projet est{" "}
          <b className="font-medium text-fg">en écart</b> quand les faits sont plus graves que ce qui est déclaré.
        </p>
        {data.projects.length ? (
          <Table head={["Projet", "Déclarée", "Calculée", "Pourquoi", "Calendrier", "Livrables", "Budget"]}>
            {data.projects.map((p) => (
              <Tr key={p.id}>
                <Td className="min-w-[200px] align-top">
                  <Link to={`/projects/${p.id}/dashboard`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <span className="block text-[12px] text-muted">
                    {[p.lead_name, p.unit_name].filter(Boolean).join(" · ") || "—"}
                  </span>
                </Td>
                <Td className="align-top">
                  <Status {...HEALTH[p.health_declared]} />
                </Td>
                <Td className="align-top">
                  <Status {...HEALTH[p.health_computed]} />
                  {p.divergent && (
                    <span className="mt-1 block text-[11.5px] font-semibold uppercase tracking-wide text-danger">
                      En écart
                    </span>
                  )}
                </Td>
                <Td className="min-w-[220px] align-top text-[12.5px] text-muted">
                  {p.reasons.length ? p.reasons.join(" · ") : "Aucun signal"}
                </Td>
                <Td className="align-top">
                  {p.schedule.due_on ? (
                    <>
                      <PlanBar progress={p.schedule.progress} expected={p.schedule.expected} />
                      <span className="block text-[12px] text-muted">échéance {frDate(p.schedule.due_on)}</span>
                    </>
                  ) : (
                    <span className="text-[12px] text-faint">Sans échéance</span>
                  )}
                </Td>
                <Td className="align-top tabular-nums">
                  {p.deliverables.total ? (
                    <>
                      {p.deliverables.total}
                      {p.deliverables.late > 0 && (
                        <span className="block text-[12px] font-semibold text-danger">
                          {p.deliverables.late} en retard
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </Td>
                <Td className="align-top tabular-nums">
                  {p.budget.consumed !== null ? (
                    <span className={cn(p.budget.consumed > 100 && "font-semibold text-danger")}>
                      {p.budget.consumed} %
                    </span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        ) : (
          <Empty title="Aucun projet">Les projets qui vous sont ouverts apparaîtront ici.</Empty>
        )}
        <div className="h-3" />
      </Section>
    </div>
  );
}

/** Les arbitrages demandés à la DG : en attente d'abord, puis l'historique. */
export function ArbitrationsBoard() {
  const [params, setParams] = useSearchParams();
  const open = params.get("arbitrage");
  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("arbitrage", id);
    else next.delete("arbitrage");
    setParams(next, { replace: true });
  };
  const { data, error } = useQuery({
    queryKey: ["arbitrations"],
    queryFn: () => api.get<Arbitration[]>("/api/arbitrations"),
  });
  if (error) return <p className="text-[13px] text-danger">{(error as Error).message}</p>;
  if (!data) return <Spinner />;
  return (
    <Section
      aside={
        <ExportMenu
          size="sm"
          disabled={!data.length}
          build={() =>
            tableDoc(
              "Arbitrages demandés à la DG",
              ["Question", "Dossier", "Demandé par", "Souhaité pour", "État", "Option retenue", "Registre"],
              data.map((a) => [
                a.question,
                a.project_name,
                a.requested_by_name,
                frDate(a.wanted_by),
                ARB_STATUS[a.status].label,
                a.decided_option !== null ? a.options[a.decided_option]?.label : "",
                decisionRef(a),
              ]),
              { filename: "arbitrages", widths: [5, 3, 2, 1.5, 2, 3, 2] },
            )
          }
        />
      }
      title="Arbitrages"
    >
      {data.length ? (
        <Table head={["Question", "Dossier", "Demandé par", "Souhaité pour", "État"]}>
          {data.map((a) => (
            <Tr key={a.id} onClick={() => setOpen(a.id)}>
              <Td className="min-w-[260px] font-medium">{a.question}</Td>
              <Td className="text-muted">{a.project_name}</Td>
              <Td className="text-muted">{a.requested_by_name ?? "—"}</Td>
              <Td
                className={cn(
                  "whitespace-nowrap",
                  a.status === "en_attente" && a.wanted_by && a.wanted_by < todayIso() && "font-semibold text-danger",
                )}
              >
                {frDate(a.wanted_by)}
              </Td>
              <Td>
                <Status {...ARB_STATUS[a.status]} />
              </Td>
            </Tr>
          ))}
        </Table>
      ) : (
        <Empty icon={<Scale className="size-6" />} title="Aucun arbitrage demandé">
          Les chefs de projet demandent un arbitrage depuis le tableau de bord de leur projet.
        </Empty>
      )}
      <div className="h-3" />
      {open && <ArbitrationDrawer id={open} list={data} onClose={() => setOpen(null)} />}
    </Section>
  );
}

function ArbitrationDrawer({ id, list, onClose }: { id: string; list: Arbitration[]; onClose: () => void }) {
  const qc = useQueryClient();
  const can = useCan();
  const { data: me } = useMe();
  const a = list.find((x) => x.id === id);
  const [choice, setChoice] = useState<number | null>(a?.recommendation ?? null);
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  if (!a) return null;
  const canDecide = a.status === "en_attente" && can("decisions.record") && a.requested_by !== me?.id;
  const act = async (path: string, body: unknown, msg: string) => {
    setBusy(true);
    try {
      await api.post(`/api/arbitrations/${id}/${path}`, body);
      for (const k of ["arbitrations", "portfolio-review", "pilotage", "decisions", "governance"])
        qc.invalidateQueries({ queryKey: [k] });
      toast.success(msg);
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
      width={720}
      title={a.question}
      subtitle={`Arbitrage · ${a.project_name}`}
      badges={<Status {...ARB_STATUS[a.status]} />}
      footer={
        <>
          {canDecide && (
            <Button
              variant="primary"
              icon={<Gavel className="size-4" />}
              loading={busy}
              disabled={choice === null}
              onClick={() =>
                act(
                  "decide",
                  { option: choice, note: note || undefined, due_on: due || null },
                  "Arbitrage rendu : la décision est inscrite au registre",
                )
              }
            >
              Trancher
            </Button>
          )}
          <Button onClick={onClose}>Fermer</Button>
        </>
      }
    >
      <DrawerSection title="La demande">
        <Facts className="p-0">
          <Fact label={a.activity_id ? "Activité" : "Projet"}>
            <Link
              to={a.activity_id ? `/activites/${a.activity_id}` : `/projects/${a.project_id}/dashboard`}
              className="hover:underline"
            >
              {a.project_name}
            </Link>
          </Fact>
          <Fact label="Demandé par">{a.requested_by_name}</Fact>
          <Fact label="Souhaité pour">{a.wanted_by ? frDate(a.wanted_by) : null}</Fact>
          <Fact label="Demandé le">{frDate(a.created_at.slice(0, 10))}</Fact>
          <Fact label="Contexte" wide>
            {a.context}
          </Fact>
        </Facts>
      </DrawerSection>
      <DrawerSection title="Options">
        <fieldset className="space-y-2" disabled={!canDecide}>
          <legend className="sr-only">Options proposées</legend>
          {a.options.map((o, i) => (
            <label
              key={o.label}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3",
                (canDecide ? choice === i : a.decided_option === i) && "border-primary bg-brand-soft",
                !canDecide && "cursor-default",
              )}
            >
              {canDecide && (
                <input
                  type="radio"
                  name="option"
                  className="mt-1"
                  checked={choice === i}
                  onChange={() => setChoice(i)}
                />
              )}
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {o.label}
                  {a.recommendation === i && <Status label="Recommandée par le demandeur" tone="info" />}
                  {a.decided_option === i && <Status label="Retenue" tone="success" />}
                </span>
                {o.consequences && <span className="mt-0.5 block text-[13px] text-muted">{o.consequences}</span>}
              </span>
            </label>
          ))}
        </fieldset>
      </DrawerSection>
      {canDecide && (
        <DrawerSection title="La décision">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Field label="Observations" hint="Inscrites au registre avec l'option retenue.">
              {(x) => <Textarea {...x} value={note} onChange={(e) => setNote(e.target.value)} />}
            </Field>
            <Field label="Échéance d'exécution">
              {(x) => <Input {...x} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}
            </Field>
          </div>
        </DrawerSection>
      )}
      {a.status === "tranche" && (
        <DrawerSection title="Décision">
          <Facts className="p-0">
            <Fact label="Tranché par">{a.decided_by_name}</Fact>
            <Fact label="Au registre">
              {decisionRef(a) && (
                <Link to="/decisions" className="hover:underline">
                  {decisionRef(a)}
                </Link>
              )}
            </Fact>
            <Fact label="Observations" wide>
              {a.decision_note}
            </Fact>
          </Facts>
        </DrawerSection>
      )}
    </Drawer>
  );
}

/** Sur le tableau de bord d'un projet : demander un arbitrage, et l'historique des arbitrages. */
/** Les arbitrages d'une activité : même bloc que pour un projet. */
export const ActivityArbitrations = ({ activityId, canAsk }: { activityId: string; canAsk: boolean }) => (
  <ProjectArbitrations projectId={activityId} base={`/api/activities/${activityId}`} canAsk={canAsk} />
);

export function ProjectArbitrations({
  projectId,
  canAsk,
  base = `/api/projects/${projectId}`,
}: {
  projectId: string;
  canAsk: boolean;
  /** Le dossier : un projet (par défaut) ou une activité. */
  base?: string;
}) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data } = useQuery({
    queryKey: ["arbitrations", "project", projectId],
    queryFn: () => api.get<Arbitration[]>(`${base}/arbitrations`),
  });
  const [asking, setAsking] = useState(false);
  const pending = data?.find((a) => a.status === "en_attente");
  const withdraw = async (a: Arbitration) => {
    try {
      await api.post(`/api/arbitrations/${a.id}/withdraw`, {});
      for (const k of ["arbitrations", "governance", "portfolio-review", "pilotage"])
        qc.invalidateQueries({ queryKey: [k] });
      toast.success("Demande retirée");
    } catch (e) {
      fail(e);
    }
  };
  return (
    <Section
      title="Arbitrages de la DG"
      aside={
        canAsk &&
        !pending && (
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setAsking(true)}>
            Demander un arbitrage
          </Button>
        )
      }
    >
      {data?.length ? (
        <ul className="divide-y divide-line px-5 pb-3">
          {data.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-[13px]">
              <span className="min-w-0">
                <span className="block font-medium">{a.question}</span>
                <span className="block text-[12px] text-muted">
                  {a.requested_by_name ?? "—"} · {frDate(a.created_at.slice(0, 10))}
                  {a.status === "tranche" && a.decided_option !== null && (
                    <>
                      {" "}
                      · retenu : <b className="font-medium text-fg">{a.options[a.decided_option]?.label}</b>
                      {decisionRef(a) ? ` (${decisionRef(a)})` : ""}
                    </>
                  )}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Status {...ARB_STATUS[a.status]} />
                {a.status === "en_attente" && (a.requested_by === me?.id || canAsk) && (
                  <Button size="sm" icon={<Trash2 className="size-3.5" />} onClick={() => withdraw(a)}>
                    Retirer
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-5 text-[13px] text-muted">
          Une question que le projet ne peut pas trancher seul ? Demandez un arbitrage : options, recommandation, et la
          DG décide.
        </p>
      )}
      {asking && <AskDialog base={base} onClose={() => setAsking(false)} />}
    </Section>
  );
}

function AskDialog({ base, onClose }: { base: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ question: "", context: "", wanted_by: "" });
  const [options, setOptions] = useState([
    { label: "", consequences: "" },
    { label: "", consequences: "" },
  ]);
  const [rec, setRec] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const filled = options.filter((o) => o.label.trim());
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`${base}/arbitrations`, {
        question: f.question,
        context: f.context || undefined,
        wanted_by: f.wanted_by || null,
        options: filled.map((o) => ({ label: o.label, consequences: o.consequences || undefined })),
        recommendation: rec !== null && options[rec]?.label.trim() ? filled.indexOf(options[rec]) : null,
      });
      for (const k of ["arbitrations", "governance", "portfolio-review", "pilotage"])
        qc.invalidateQueries({ queryKey: [k] });
      toast.success("Arbitrage demandé : la DG est prévenue");
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Demander un arbitrage à la DG" width={640}>
      <div className="grid gap-4">
        <Field label="Question à trancher" required>
          {(a) => <Input {...a} value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} />}
        </Field>
        <Field label="Contexte">
          {(a) => <Textarea {...a} value={f.context} onChange={(e) => setF({ ...f, context: e.target.value })} />}
        </Field>
        <div className="space-y-2">
          <p className="text-[12.5px] font-medium text-muted">Options (au moins deux) et recommandation</p>
          {options.map((o, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                aria-label={`Option ${i + 1}`}
                placeholder={`Option ${i + 1}`}
                value={o.label}
                onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <Input
                aria-label={`Conséquences de l'option ${i + 1}`}
                placeholder="Conséquences (coût, délai, risque)"
                value={o.consequences}
                onChange={(e) =>
                  setOptions(options.map((x, j) => (j === i ? { ...x, consequences: e.target.value } : x)))
                }
              />
              <label className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-muted">
                <input type="radio" name="rec" checked={rec === i} onChange={() => setRec(i)} />
                Recommandée
              </label>
            </div>
          ))}
          {options.length < 6 && (
            <Button
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={() => setOptions([...options, { label: "", consequences: "" }])}
            >
              Ajouter une option
            </Button>
          )}
        </div>
        <Field label="Décision souhaitée pour le" className="max-w-[220px]">
          {(a) => (
            <Input {...a} type="date" value={f.wanted_by} onChange={(e) => setF({ ...f, wanted_by: e.target.value })} />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" loading={busy} disabled={!f.question.trim() || filled.length < 2} onClick={submit}>
            Envoyer à la DG
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
