import { QuickEntryMenu } from "@/components/quick-entry";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AlarmClock, ArrowUpRight, CalendarOff, FileSignature, type LucideIcon, Mail, Scale, TrendingUp } from "lucide-react";
import { Button, Dialog, Empty, cn } from "@/components/ui";
import { LoadingRows, type Tone } from "@/components/gov";
import { ByDirection } from "@/components/directions";

import { api } from "@/lib/api";
import { useCan, useMe } from "@/lib/hooks";
import { DecisionDialog, type DecisionSource } from "./Decisions";
import { salutation } from "@/lib/format";

/** « projet_interne », « projet_confie » ou le code d'un type d'activité du référentiel. */
type Form = string;
type Health = "on_track" | "at_risk" | "off_track" | "done";
interface Item {
  id: string;
  form: Form;
  title: string;
  lead_name: string | null;
  unit_name: string | null;
  health: Health;
  progress: number | null;
  next_due: string | null;
  overdue: number;
  decision_needed: string;
  arbitration_id: string | null;
  href: string;
}
interface Overview {
  today: string;
  counters: Record<string, number>;
  health: Record<Health, number>;
  items: Item[];
  decisions: Item[];
  agenda: {
    id: string;
    form: string;
    title: string;
    date: string;
    href: string;
  }[];
  recommendations: {
    open: number;
    late: number;
    done: number;
    late_list: {
      id: string;
      text: string;
      responsible_name: string;
      due_on: string;
      meeting_id: string;
      reference: string;
    }[];
  };
  brief: string[];
  to_sign: number;
  late_deliverables: number;
  open_gaps: number;
  ending_contracts: {
    id: string;
    consultant_name: string;
    title: string;
    end_on: string;
  }[];
  risks: {
    id: string;
    title: string;
    score: number;
    owner_name: string | null;
    mitigation: string;
  }[];
  indicators: {
    id: string;
    name: string;
    unit_label: string;
    baseline: number;
    target: number;
    result: number;
    source: string;
    /** Relié à une source de l'outil : calculé, jamais saisi (thème 4, RI-4). */
    computed_from?: string | null;
    computed?: boolean;
  }[];
  plans: { total: number; approved: number };
}

export const HEALTH: Record<
  Health,
  { label: string; tone: Tone; color: string }
> = {
  on_track: {
    label: "Dans les temps",
    tone: "success",
    color: "var(--success)",
  },
  at_risk: { label: "À surveiller", tone: "warning", color: "var(--warning)" },
  off_track: { label: "En difficulté", tone: "danger", color: "var(--danger)" },
  done: { label: "Terminé", tone: "info", color: "var(--primary)" },
};

export function PilotagePage() {
  const { data: me } = useMe();
  const can = useCan();
  const [arbitrating, setArbitrating] = useState<DecisionSource | null>(null);
  const [lateOpen, setLateOpen] = useState(false);
  const {
    data: o,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pilotage"],
    queryFn: () => api.get<Overview>("/api/pilotage"),
  });
  const { data: mail } = useQuery({
    queryKey: ["correspondence", "summary"],
    queryFn: () => api.get<{ to_assign: number }>("/api/correspondence/summary"),
    enabled: can("correspondence.manage"),
  });
  const { data: leaves } = useQuery({
    queryKey: ["leaves", "summary"],
    queryFn: () => api.get<{ to_decide: number }>("/api/leaves/summary"),
  });
  if (isLoading) return <LoadingRows rows={8} />;
  if (error || !o)
    return (
      <Empty title="Tableau de bord inaccessible">
        {(error as Error)?.message ?? "Réessayez dans un instant."}
      </Empty>
    );
  const total = Object.values(o.health).reduce((s, n) => s + n, 0);
  const healthy = (o.health.on_track ?? 0) + (o.health.done ?? 0);
  const score = total ? Math.round((healthy / total) * 100) : 0;
  const figures: Figure[] = [
    { label: "En bonne voie", value: `${score} %`, Icon: TrendingUp, to: "/activites" },
    {
      label: "Retards",
      value: o.counters.retards,
      Icon: AlarmClock,
      alert: o.counters.retards > 0,
      onClick: o.counters.retards ? () => setLateOpen(true) : undefined,
    },
    { label: "Décisions", value: o.counters.decisions, Icon: Scale, to: "/decisions" },
    { label: "À signer", value: o.to_sign, Icon: FileSignature, to: "/parapheur" },
    ...(mail ? [{ label: "Courrier", value: mail.to_assign, Icon: Mail, to: "/courrier" }] : []),
    ...(leaves?.to_decide ? [{ label: "Congés", value: leaves.to_decide, Icon: CalendarOff, to: "/conges" }] : []),
  ];

  return (
    <div className="mx-auto max-w-[1320px] space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">{salutation(me?.name)}</h1>
          <p className="mt-0.5 text-[13px] text-muted first-letter:uppercase">
            {format(parseISO(o.today), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <QuickEntryMenu />
      </header>

      {/* La situation du jour : une carte par chiffre, le libellé en haut, la flèche ouvre le détail */}
      <section aria-label="Situation du jour" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {figures.map((f) => {
          const body = (
            <>
              <span className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-medium leading-snug">{f.label}</span>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-line text-muted transition-colors group-hover:border-line-strong group-hover:text-fg">
                  <ArrowUpRight className="size-3.5" />
                </span>
              </span>
              <span className="mt-4 flex items-center gap-2.5">
                <f.Icon className="size-[18px] text-muted" strokeWidth={1.75} />
                <span className={cn("text-[26px] font-medium leading-none tracking-[-0.02em] tabular", f.alert && "text-danger")}>
                  {f.value}
                </span>
              </span>
            </>
          );
          const cls = "group block rounded-2xl border border-line p-3.5 text-left transition-colors hover:border-line-strong";
          return f.to ? (
            <Link key={f.label} to={f.to} className={cls}>
              {body}
            </Link>
          ) : (
            <button key={f.label} type="button" onClick={f.onClick} disabled={!f.onClick} className={cls}>
              {body}
            </button>
          );
        })}
      </section>
      {lateOpen && (
        <LateDetail
          detail={(o.counters as unknown as { retards_detail?: Record<string, number> }).retards_detail ?? {}}
          onClose={() => setLateOpen(false)}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <ByDirection className="xl:col-span-2" />

        <Card title="Décisions attendues" to="/decisions" count={o.decisions.length}>
          {o.decisions.length ? (
            o.decisions.slice(0, 5).map((d) => (
              <Row key={d.id}>
                <Link to={d.href} className="min-w-0 flex-1 truncate hover:underline" title={d.decision_needed}>
                  {d.title}
                </Link>
                {can("decisions.record") &&
                  (d.arbitration_id ? (
                    <Link
                      to={`/activites?onglet=arbitrages&arbitrage=${d.arbitration_id}`}
                      className="shrink-0 rounded-md border border-line px-2 py-0.5 text-[12px] font-medium hover:bg-hover"
                    >
                      Trancher
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setArbitrating({
                          kind: d.form.startsWith("projet") ? "project" : "activity",
                          id: d.id,
                          label: d.title,
                          question: d.decision_needed,
                        })
                      }
                      className="shrink-0 rounded-md border border-line px-2 py-0.5 text-[12px] font-medium hover:bg-hover"
                    >
                      Arbitrer
                    </button>
                  ))}
              </Row>
            ))
          ) : (
            <Nothing />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Agenda" to="/reunions">
          {o.agenda.length ? (
            o.agenda.slice(0, 5).map((a) => (
              <Row key={a.id}>
                <span className="w-[60px] shrink-0 whitespace-nowrap rounded-md border border-line px-1.5 py-0.5 text-center text-[11.5px] tabular text-muted">
                  {format(parseISO(a.date), "d MMM", { locale: fr })}
                </span>
                <Link to={a.href} className="min-w-0 flex-1 truncate hover:underline">
                  {a.title}
                </Link>
              </Row>
            ))
          ) : (
            <Nothing />
          )}
        </Card>

        <Card title="Risques majeurs" to="/risques">
          {o.risks.length ? (
            o.risks.slice(0, 5).map((r) => (
              <Row key={r.id}>
                <span
                  className={cn(
                    "flex h-[22px] w-8 shrink-0 items-center justify-center rounded-md text-[11.5px] font-semibold tabular",
                    r.score >= 15 ? "bg-danger-soft text-danger" : r.score >= 8 ? "bg-warning-soft text-warning" : "bg-hover text-muted",
                  )}
                  title="Probabilité × impact"
                >
                  {r.score}
                </span>
                <Link to="/risques" className="min-w-0 flex-1 truncate hover:underline" title={r.owner_name ?? undefined}>
                  {r.title}
                </Link>
              </Row>
            ))
          ) : (
            <Nothing />
          )}
        </Card>
      </div>
      {arbitrating && <DecisionDialog source={arbitrating} onClose={() => setArbitrating(null)} />}
    </div>
  );
}

interface Figure {
  label: string;
  value: number | string;
  Icon: LucideIcon;
  to?: string;
  onClick?: () => void;
  alert?: boolean;
}

/** Une carte de liste courte : un titre, une flèche vers le registre complet, cinq lignes au plus. */
function Card({ title, to, count, children }: { title: string; to: string; count?: number; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-line">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
        <h2 className="flex items-center gap-2 text-[14px] font-medium">
          {title}
          {!!count && <span className="rounded-md border border-line px-1.5 text-[11px] font-medium tabular text-fg/80">{count}</span>}
        </h2>
        <Link
          to={to}
          aria-label={`Tout voir : ${title}`}
          title="Tout voir"
          className="flex size-6 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      <ul className="px-4 pb-2">{children}</ul>
    </section>
  );
}
const Row = ({ children }: { children: ReactNode }) => (
  <li className="flex items-center gap-3 border-t border-line py-2.5 text-[13.5px]">{children}</li>
);
const Nothing = () => <li className="border-t border-line py-2.5 text-[13px] text-faint">Rien à signaler</li>;

/** Détail des retards en une ligne : « 2 tâches, 1 livrable, 1 courrier ». */
const LATE_LABEL: Record<string, [string, string]> = {
  taches: ["tâche", "tâches"],
  suites: ["suite d'activité", "suites d'activité"],
  recommandations: ["recommandation", "recommandations"],
  livrables: ["livrable", "livrables"],
  activites_plan: ["activité de plan", "activités de plan"],
  courrier: ["courrier", "courriers"],
  decisions: ["décision à exécuter", "décisions à exécuter"],
};
/** Où se résorbe chaque nature de retard (P-3). */
const LATE_PAGE: Record<string, string> = {
  taches: "/pilotage#par-direction",
  suites: "/activites",
  recommandations: "/reunions",
  livrables: "/activites",
  activites_plan: "/plans",
  courrier: "/courrier",
  decisions: "/decisions",
};
/** Le détail de « Retards à résorber » : chaque nature, son nombre, la page où la traiter (P-3). */
function LateDetail({
  detail,
  onClose,
}: {
  detail: Record<string, number>;
  onClose: () => void;
}) {
  const rows = Object.entries(detail).filter(([, n]) => n > 0);
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Retards à résorber"
      description="Tout ce qui a dépassé son échéance, par nature. Ouvrez une ligne pour traiter les retards concernés."
      footer={<Button onClick={onClose}>Fermer</Button>}
    >
      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows.map(([k, n]) => (
          <li key={k}>
            <Link
              to={LATE_PAGE[k] ?? "/pilotage"}
              onClick={(e) => {
                onClose();
                // Les tâches en retard se lisent par direction, sur cette page
                if (k === "taches") {
                  e.preventDefault();
                  document
                    .getElementById("par-direction")
                    ?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="flex items-center gap-3 px-3 py-2.5 text-[13.5px] hover:bg-hover"
            >
              <span className="flex-1">
                {LATE_LABEL[k]?.[n > 1 ? 1 : 0] ?? k}
              </span>
              <span className="font-semibold tabular text-danger">{n}</span>
              <ArrowUpRight className="size-4 text-faint" />
            </Link>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}


