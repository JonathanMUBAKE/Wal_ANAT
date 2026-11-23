import { QuickEntryMenu } from "@/components/quick-entry";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlarmClock,
  ArrowUpRight,
  CalendarDays,
  CalendarOff,
  FileSignature,
  Grid3x3,
  List,
  type LucideIcon,
  Mail,
  Scale,
  TrendingUp,
} from "lucide-react";
import { type MatrixRisk, RiskMatrix } from "@/components/views";
import { type CalEvent, TimeGrid, ViewSwitch, useLocalPref } from "@/components/collection";
import { useForms } from "@/lib/referentials";
import { Button, Empty, cn } from "@/components/ui";
import { CountUp, LoadingRows, type Tone } from "@/components/gov";
import { motion } from "motion/react";
import { ByDirection } from "@/components/directions";
import { MeetingPeek } from "@/components/MeetingViews";
import { Drawer } from "@/components/drawer";

import { api } from "@/lib/api";
import { useCan, useMe } from "@/lib/hooks";
import { DueChip } from "@/components/pickers";
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
    time: string | null;
    end: string | null;
    place: string | null;
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

/** Teintes des séances dans l'agenda de l'accueil. */
const MEETING_HUES = ["var(--primary)", "#8B7CF6", "#2BB3A3", "#E0699F", "#E0A23B"];

export function PilotagePage() {
  const { data: me } = useMe();
  const can = useCan();
  const [arbitrating, setArbitrating] = useState<DecisionSource | null>(null);
  const [lateOpen, setLateOpen] = useState(false);
  /** Le rendez-vous de l'agenda dont on regarde la fiche rapide. */
  const [peek, setPeek] = useState<Overview["agenda"][number] | null>(null);
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
  const { data: allRisks } = useQuery({
    queryKey: ["risks"],
    queryFn: () => api.get<(MatrixRisk & { status: string })[]>("/api/risks"),
  });
  const form = useForms();
  const nav = useNavigate();
  const [agendaView, setAgendaView] = useLocalPref<"semaine" | "liste">("anat.vue.accueil.agenda", "semaine");
  const [riskView, setRiskView] = useLocalPref<"matrice" | "liste">("anat.vue.accueil.risques", "matrice");
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
  const act = (n: number, tone: Tone2): Tone2 => (n > 0 ? tone : "neutral");
  const figures: Figure[] = [
    {
      label: "Dossiers sains",
      value: `${score} %`,
      Icon: TrendingUp,
      tone: score >= 70 ? "success" : score >= 40 ? "warning" : "danger",
      to: "/activites",
    },
    {
      label: "Retards",
      value: o.counters.retards,
      Icon: AlarmClock,
      tone: o.counters.retards ? "danger" : "success",
      strong: o.counters.retards > 0,
      onClick: o.counters.retards ? () => setLateOpen(true) : undefined,
    },
    { label: "Décisions", value: o.counters.decisions, Icon: Scale, tone: act(o.counters.decisions, "warning"), to: "/decisions" },
    { label: "À signer", value: o.to_sign, Icon: FileSignature, tone: act(o.to_sign, "warning"), to: "/parapheur" },
    ...(mail ? [{ label: "Courrier", value: mail.to_assign, Icon: Mail, tone: act(mail.to_assign, "info"), to: "/courrier" }] : []),
    ...(leaves?.to_decide
      ? [{ label: "Congés", value: leaves.to_decide, Icon: CalendarOff, tone: "info" as Tone2, to: "/conges" }]
      : []),
  ];
  // Une même nature de séance garde toujours la même teinte : on distingue les rendez-vous d'un coup d'œil
  const hueOf = (code: string, title = "") =>
    code === "reunion"
      ? MEETING_HUES[[...title].reduce((n, c) => n + c.charCodeAt(0), 0) % MEETING_HUES.length]
      : form(code).color;
  // L'agenda : les sept jours qui viennent, sur la grille horaire du calendrier des réunions
  const days = Array.from({ length: 7 }, (_, n) => addDays(parseISO(o.today), n));
  const events: CalEvent[] = o.agenda.map((a) => ({
    id: a.id,
    date: a.date,
    start: a.time,
    end: a.end,
    title: a.title,
    subtitle: a.place ?? form(a.form).label,
    hue: hueOf(a.form, a.title),
    allDay: !a.time,
  }));
  const timed = o.agenda.filter((a) => a.time);
  // De 8 h à 18 h, élargi si une séance commence plus tôt ou finit plus tard
  const firstHour = Math.min(8, ...timed.map((a) => Number(a.time!.slice(0, 2))));
  const lastHour = Math.max(
    18,
    ...timed.map((a) => (a.end ? Number(a.end.slice(0, 2)) + (a.end.slice(3, 5) > "00" ? 1 : 0) : Number(a.time!.slice(0, 2)) + 1)),
  );
  const sameMonth = days[0].getMonth() === days[6].getMonth();
  const period = sameMonth
    ? `${format(days[0], "d")} – ${format(days[6], "d MMMM", { locale: fr })}`
    : `${format(days[0], "d MMM", { locale: fr })} – ${format(days[6], "d MMM", { locale: fr })}`;
  const openRisks = (allRisks ?? []).filter((r) => r.status === "open");

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

      {/* La situation du jour : un seul bandeau, une case par chiffre ; la pastille de couleur dit s'il faut agir */}
      <section
        aria-label="Situation du jour"
        className="flex flex-wrap gap-px overflow-hidden rounded-2xl border border-line bg-[var(--line)] shadow-sm"
      >
        {figures.map((f) => {
          const body = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[12.5px] text-muted">{f.label}</span>
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", TILE[f.tone])}>
                  <f.Icon className="size-3.5" strokeWidth={2} />
                </span>
              </span>
              <span
                className={cn(
                  "mt-2.5 block text-[28px] font-semibold leading-none tracking-[-0.025em] tabular",
                  f.strong && "text-danger",
                )}
              >
                {typeof f.value === "number" ? <CountUp value={f.value} duration={700} /> : f.value}
              </span>
            </>
          );
          const cls = cn("stat-cell block min-w-[148px] flex-1 p-4 text-left", f.strong && "stat-alert");
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
        <Card
          title="Agenda"
          note={period}
          badge={
            <span className="hidden size-10 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-bg leading-none sm:flex">
              <span className="text-[10px] text-muted">{format(days[0], "MMM", { locale: fr }).replace(".", "")}</span>
              <span className="mt-0.5 text-[15px] font-semibold tabular">{format(days[0], "d")}</span>
            </span>
          }
          to="/reunions"
          className="xl:col-span-2"
          flush={agendaView === "semaine"}
          swap={agendaView}
          aside={
            <ViewSwitch
              value={agendaView}
              onChange={setAgendaView}
              size="sm"
              items={[
                { id: "semaine", label: "Semaine", Icon: CalendarDays },
                { id: "liste", label: "Liste", Icon: List },
              ]}
            />
          }
        >
          {agendaView === "semaine" ? (
            <li className="border-t border-line">
              <TimeGrid
                days={days}
                events={events}
                from={firstHour}
                to={lastHour}
                minColumn={92}
                onSelect={(e) => setPeek(o.agenda.find((a) => a.id === e.id) ?? null)}
              />
            </li>
          ) : o.agenda.length ? (
            o.agenda.slice(0, 8).map((a) => (
              <Row key={a.id}>
                <span className="size-2 shrink-0 rounded-[2px]" style={{ background: hueOf(a.form, a.title) }} title={form(a.form).label} />
                <span className="w-[52px] shrink-0 whitespace-nowrap text-[12px] tabular text-muted">
                  {format(parseISO(a.date), "d MMM", { locale: fr })}
                </span>
                <button
                  type="button"
                  onClick={() => setPeek(a)}
                  className="min-w-0 flex-1 truncate text-left hover:underline"
                  title={a.title}
                >
                  {a.title}
                </button>
                {a.time && (
                  <span className="shrink-0 whitespace-nowrap text-[12.5px] tabular text-muted">
                    {Number(a.time.slice(0, 2))} h {a.time.slice(3, 5)}
                  </span>
                )}
              </Row>
            ))
          ) : (
            <Nothing />
          )}
        </Card>

        {/* À côté de l'agenda sur grand écran, en dessous sinon */}
        <div className="grid gap-4 xl:content-start">
        <Card title="Décisions attendues" to="/decisions" count={o.decisions.length}>
          {o.decisions.length ? (
            o.decisions.slice(0, 5).map((d) => (
              <Row key={d.id}>
                <Link to={d.href} className="line-clamp-2 min-w-0 flex-1 hover:underline" title={d.decision_needed}>
                  {d.title}
                </Link>
                {d.unit_name && (
                  <span className="hidden w-[168px] shrink-0 truncate text-[12.5px] text-muted @xl:block" title={d.unit_name}>
                    {d.unit_name}
                  </span>
                )}
                {d.next_due && (
                  <span className="hidden shrink-0 @md:block" title="Prochaine échéance du dossier">
                    <DueChip due={d.next_due} />
                  </span>
                )}
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

        <Card
          title="Risques"
          to="/risques"
          count={openRisks.length || undefined}
          swap={riskView}
          aside={
            <ViewSwitch
              value={riskView}
              onChange={setRiskView}
              size="sm"
              items={[
                { id: "matrice", label: "Matrice", Icon: Grid3x3 },
                { id: "liste", label: "Liste", Icon: List },
              ]}
            />
          }
        >
          {riskView === "matrice" && openRisks.length ? (
            <li className="border-t border-line pb-2 pt-3.5">
              <RiskMatrix risks={openRisks} onOpen={() => nav("/risques")} />
            </li>
          ) : o.risks.length ? (
            o.risks.slice(0, 6).map((r) => (
              <Row key={r.id}>
                <span
                  className={cn(
                    "flex h-[22px] w-8 shrink-0 items-center justify-center rounded-md text-[11.5px] font-semibold tabular",
                    r.score >= 15 ? "bg-danger text-white" : r.score >= 8 ? "bg-warning text-white" : "bg-success-soft text-success",
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
      </div>

      <ByDirection />

      {/* Un rendez-vous de l'agenda s'ouvre d'abord ici : l'essentiel sans quitter l'accueil, le dossier à un clic */}
      <MeetingPeek id={peek?.form === "reunion" ? peek.id : null} onClose={() => setPeek(null)} />
      {peek && peek.form !== "reunion" && (
        <Drawer
          open
          onClose={() => setPeek(null)}
          title={peek.title}
          subtitle={`${form(peek.form).label} · ${format(parseISO(peek.date), "EEEE d MMMM", { locale: fr })}`}
          width={460}
          footer={
            <Button variant="primary" onClick={() => nav(peek.href)}>
              Ouvrir le dossier
            </Button>
          }
        >
          <dl className="text-[13px]">
            {(
              [
                ["Horaire", peek.time ? `${Number(peek.time.slice(0, 2))} h ${peek.time.slice(3, 5)}` : "Sur la journée"],
                ["Lieu", peek.place],
              ] as [string, string | null][]
            )
              .filter(([, v]) => !!v)
              .map(([l, v]) => (
                <div key={l} className="flex items-baseline justify-between gap-4 border-t border-line py-2 first:border-t-0 first:pt-0">
                  <dt className="shrink-0 text-muted">{l}</dt>
                  <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
                </div>
              ))}
          </dl>
        </Drawer>
      )}
      {arbitrating && <DecisionDialog source={arbitrating} onClose={() => setArbitrating(null)} />}
    </div>
  );
}

type Tone2 = "danger" | "warning" | "success" | "info" | "neutral";
/** La pastille d'icône d'un chiffre : sa couleur dit s'il faut agir. */
const TILE: Record<Tone2, string> = {
  danger: "bg-danger text-white",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  neutral: "bg-hover text-muted",
};
interface Figure {
  label: string;
  value: number | string;
  Icon: LucideIcon;
  tone: Tone2;
  /** Point d'attention majeur : la carte entière se teinte. */
  strong?: boolean;
  to?: string;
  onClick?: () => void;
}

/** Une carte : un titre, une bascule de vue éventuelle, une flèche vers le registre complet. */
function Card({
  title,
  note,
  badge,
  className,
  to,
  count,
  aside,
  flush,
  swap,
  children,
}: {
  title: string;
  /** Précision discrète à côté du titre (la période de l'agenda). */
  note?: string;
  /** Repère placé avant le titre ; la précision passe alors sous le titre. */
  badge?: ReactNode;
  className?: string;
  to: string;
  count?: number;
  aside?: ReactNode;
  /** Le contenu va d'un bord à l'autre (agenda). */
  flush?: boolean;
  /** Clé de la vue affichée : quand elle change, le contenu se fond. */
  swap?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("@container min-w-0 overflow-hidden rounded-2xl border border-line bg-panel shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2 px-4 pb-2.5 pt-3">
        <h2 className={cn("flex gap-2 text-[14px] font-medium", badge ? "items-center gap-3" : "items-center")}>
          {badge}
          <span className={cn(badge ? "flex flex-col gap-0.5" : "contents")}>
          {title}
          {!!count && <span className="rounded-md border border-line px-1.5 text-[11px] font-medium tabular text-fg/80">{count}</span>}
          {note && <span className="text-[12.5px] font-normal text-muted">{note}</span>}
          </span>
        </h2>
        <span className="flex items-center gap-2">
          {aside}
          <Link
            to={to}
            aria-label={`Tout voir : ${title}`}
            title="Tout voir"
            className="flex size-6 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <ArrowUpRight className="size-3.5" />
          </Link>
        </span>
      </div>
      <motion.ul
        key={swap}
        className={flush ? "" : "px-4 pb-2"}
        initial={swap ? { opacity: 0, y: 6 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.ul>
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
    <Drawer
      open
      onClose={onClose}
      title="Retards à résorber"
      subtitle="Tout ce qui a dépassé son échéance, par nature"
      width={460}
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
              <span className="flex-1 first-letter:uppercase">
                {LATE_LABEL[k]?.[n > 1 ? 1 : 0] ?? k}
              </span>
              <span className="font-semibold tabular text-danger">{n}</span>
              <ArrowUpRight className="size-4 text-faint" />
            </Link>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}


