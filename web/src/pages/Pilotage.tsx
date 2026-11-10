import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlarmClock,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  ChevronRight,
  FileSignature,
  Gauge,
  Handshake,
  Landmark,
  ListTree,
  Mic2,
  Plus,
  Scale,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Empty, cn } from "@/components/ui";
import {
  CountUp,
  LoadingRows,
  ProgressBar,
  Status,
  frDate,
  isLate,
  type Tone,
} from "@/components/gov";
import { HealthRing } from "@/components/territory";
import { CollectionHeader } from "@/components/collection";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
import { api } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import { firstName, greeting } from "@/lib/format";

type Form = "projet_interne" | "projet_confie" | "commission" | "conference" | "rendez_vous" | "interne";
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
  href: string;
}
interface Overview {
  today: string;
  counters: Record<string, number>;
  health: Record<Health, number>;
  items: Item[];
  decisions: Item[];
  agenda: { id: string; form: string; title: string; date: string; href: string }[];
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
  ending_contracts: { id: string; consultant_name: string; title: string; end_on: string }[];
  risks: { id: string; title: string; score: number; owner_name: string | null; mitigation: string }[];
  indicators: {
    id: string;
    name: string;
    unit_label: string;
    baseline: number;
    target: number;
    result: number;
    source: string;
  }[];
  plans: { total: number; approved: number };
}

export const FORMS: Record<
  Form,
  { label: string; plural: string; short: string; Icon: LucideIcon; counter: string }
> = {
  projet_interne: {
    label: "Projet interne",
    plural: "Projets internes",
    short: "Internes",
    Icon: Briefcase,
    counter: "projets_internes",
  },
  projet_confie: {
    label: "Projet confié",
    plural: "Projets confiés",
    short: "Confiés",
    Icon: FileSignature,
    counter: "projets_confies",
  },
  commission: { label: "Commission", plural: "Commissions", short: "Commiss.", Icon: Landmark, counter: "commissions" },
  conference: { label: "Conférence", plural: "Conférences", short: "Confér.", Icon: Mic2, counter: "conferences" },
  rendez_vous: { label: "Rendez-vous", plural: "Rendez-vous", short: "RDV", Icon: Handshake, counter: "rendez_vous" },
  interne: {
    label: "Activité interne",
    plural: "Activités internes",
    short: "Activités",
    Icon: CalendarClock,
    counter: "activites_internes",
  },
};
export const HEALTH: Record<Health, { label: string; tone: Tone; color: string }> = {
  on_track: { label: "Dans les temps", tone: "success", color: "var(--success)" },
  at_risk: { label: "À surveiller", tone: "warning", color: "var(--warning)" },
  off_track: { label: "En difficulté", tone: "danger", color: "var(--danger)" },
  done: { label: "Terminé", tone: "info", color: "var(--primary)" },
};
const AGENDA_LABEL: Record<string, string> = {
  reunion: "Réunion",
  commission: "Commission",
  conference: "Conférence",
  rendez_vous: "Rendez-vous",
  interne: "Activité",
};

export function PilotagePage() {
  const { data: me } = useMe();
  const {
    data: o,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pilotage"],
    queryFn: () => api.get<Overview>("/api/pilotage"),
  });
  if (isLoading) return <LoadingRows rows={8} />;
  if (error || !o)
    return (
      <Empty title="Tableau de bord inaccessible">{(error as Error)?.message ?? "Réessayez dans un instant."}</Empty>
    );
  // Ce qui demande attention d'abord : en difficulté, à surveiller, décision attendue, puis l'échéance la plus proche
  const priorities = o.items
    .filter((i) => i.health !== "done")
    .sort((a, b) => rank(a) - rank(b) || (a.next_due ?? "9").localeCompare(b.next_due ?? "9"))
    .slice(0, 6);
  const total = Object.values(o.health).reduce((s, n) => s + n, 0);
  const healthy = (o.health.on_track ?? 0) + (o.health.done ?? 0);
  const score = total ? Math.round((healthy / total) * 100) : 0;
  const forms = Object.keys(FORMS) as Form[];
  const maxForm = Math.max(1, ...forms.map((f) => o.counters[FORMS[f].counter] ?? 0));
  const lateItems = o.items.filter((i) => i.overdue > 0).length;

  return (
    <div className="mx-auto max-w-[1380px] space-y-5 p-4 sm:px-8 sm:py-6">
      <CollectionHeader
        Icon={Gauge}
        crumbs={["Pilotage", "Tableau de bord DG"]}
        title={`${greeting()}, ${firstName(me?.name ?? "")}`}
        subtitle={`${cap(format(parseISO(o.today), "EEEE d MMMM yyyy", { locale: fr }))} · toutes les activités de l'Agence en un coup d'œil.`}
        actions={
          <>
            <RoundLink to="/reunions" label="Réunions" Icon={Users} />
            <RoundLink to="/parapheur" label="Parapheur" Icon={FileSignature} dot={o.to_sign > 0} />
            <Link
              to="/activites"
              className="btn-brand inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3.5 text-[13px] font-medium text-on-primary"
            >
              <Plus className="size-4" />
              Nouvelle activité
            </Link>
          </>
        }
      />
      {/* Point de situation : un bandeau clair, l'IA propose, la DG lit */}
      <div className="flex items-start gap-3 rounded-xl border border-line bg-panel px-4 py-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[conic-gradient(from_200deg,var(--ai),#4FB3F0,var(--ai))] text-white">
          <Sparkles className="size-3.5" />
        </span>
        <p className="text-[13px] leading-relaxed text-muted">
          <span className="font-semibold text-fg">Point de situation. </span>
          {o.brief.join(" ")}
        </p>
      </div>

      {/* Vue d'ensemble : une seule carte, des cellules séparées par des filets */}
      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="grid grid-cols-2 divide-line sm:grid-cols-3 xl:grid-cols-5 [&>*]:border-line max-sm:[&>*:nth-child(n+3)]:border-t sm:max-xl:[&>*:nth-child(n+4)]:border-t [&>*:not(:first-child)]:border-l max-sm:[&>*:nth-child(odd)]:border-l-0 sm:max-xl:[&>*:nth-child(3n+1)]:border-l-0">
          <Kpi
            label="Activités suivies"
            value={total}
            Icon={Briefcase}
            foot={`${score} % en bonne voie`}
            tone={score >= 70 ? "good" : "warn"}
          />
          <Kpi label="Décisions attendues" value={o.counters.decisions} Icon={Scale} foot="à arbitrer" />
          <Kpi
            label="Retards à résorber"
            value={o.counters.retards}
            Icon={AlarmClock}
            foot={`${lateItems} activité${lateItems > 1 ? "s" : ""} concernée${lateItems > 1 ? "s" : ""}`}
            tone={o.counters.retards > 0 ? "bad" : "good"}
          />
          <Kpi label="À signer" value={o.to_sign} Icon={FileSignature} foot="au parapheur" to="/parapheur" />
          <Kpi label="Écarts à examiner" value={o.open_gaps} Icon={ListTree} foot="attributions" to="/attributions" />
        </div>
      </section>

      {/* Rangée 1 : santé, répartition, agenda — trois cartes de même hauteur */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Santé du portefeuille" action={<CircleAction to="/activites" label="Voir les activités" />}>
          <div className="flex items-center gap-6 px-5 pb-5 pt-3">
            <HealthRing
              size={128}
              track="var(--hover)"
              caption={`${score} % des activités dans les temps ou terminées`}
              parts={(Object.keys(HEALTH) as Health[]).map((h) => ({
                key: h,
                value: o.health[h] ?? 0,
                color: HEALTH[h].color,
                label: HEALTH[h].label,
              }))}
              center={
                <>
                  <span className="text-[26px] font-semibold leading-none tracking-[-0.03em]">
                    <CountUp value={score} />%
                  </span>
                  <span className="mt-1 text-[11px] text-muted">en bonne voie</span>
                </>
              }
            />
            <ul className="min-w-0 flex-1 space-y-2.5 text-[13px]">
              {(Object.keys(HEALTH) as Health[]).map((h) => (
                <li key={h} className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: HEALTH[h].color }} />
                  <span className="truncate text-muted">{HEALTH[h].label}</span>
                  <span className="ml-auto font-medium tabular">{o.health[h] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card title="Répartition par forme" action={<CircleAction to="/activites" label="Voir les activités" />}>
          <div className="flex h-[168px] items-end gap-2.5 px-5 pb-5 pt-2">
            {forms.map((f) => {
              const n = o.counters[FORMS[f].counter] ?? 0;
              const top = n > 0 && n === maxForm;
              return (
                <div key={f} title={`${FORMS[f].plural} : ${n}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  <span className={cn("text-[12px] tabular", top ? "font-semibold text-fg" : "text-muted")}>{n}</span>
                  <span className="flex min-h-0 w-full flex-1 items-end justify-center">
                  <span
                    className={cn("bar-rise w-full max-w-[28px] rounded-lg", n === 0 && "hatch")}
                    style={{
                      height: `${Math.max(8, (n / maxForm) * 100)}%`,
                      background: n
                        ? "linear-gradient(180deg, color-mix(in oklab, var(--primary) 55%, var(--panel)), color-mix(in oklab, var(--primary) 22%, var(--panel)))"
                        : undefined,
                    }}
                  />
                  </span>
                  <span className="w-full truncate text-center text-[11px] text-muted">{FORMS[f].short}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Sept prochains jours" action={<CircleAction to="/activites" label="Tout l'agenda" />}>
          <ul className="px-2 pb-3">
            {o.agenda.length ? (
              o.agenda.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <Link
                    to={a.href}
                    className="group flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors hover:bg-hover"
                  >
                    <span className="w-9 shrink-0 text-center leading-none">
                      <span className="block text-[17px] font-semibold tracking-[-0.03em]">
                        {format(parseISO(a.date), "d")}
                      </span>
                      <span className="text-[10px] uppercase text-faint">
                        {format(parseISO(a.date), "EEE", { locale: fr })}
                      </span>
                    </span>
                    <span className="h-7 w-px shrink-0 bg-line" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{a.title}</span>
                      <span className="text-[12px] text-muted">{AGENDA_LABEL[a.form]}</span>
                    </span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-3 py-3 text-[13px] text-muted">Rien de prévu sur la semaine.</li>
            )}
          </ul>
        </Card>
      </div>

      {/* Rangée 2 : ce qui demande attention, et ce que la DG doit trancher */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card
          title="À suivre en priorité"
          action={
            <Link to="/activites" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-fg">
              Tout le portefeuille ({o.items.length})
              <ChevronRight className="size-4" />
            </Link>
          }
        >
          {priorities.length ? (
            <ul className="pb-2">
              {priorities.map((i) => {
                const I = FORMS[i.form].Icon;
                const late = isLate(i.next_due, o.today);
                return (
                  <li key={i.id}>
                    <Link
                      to={i.href}
                      className="flex items-center gap-3 border-t border-line px-5 py-3 transition-colors first:border-t-0 hover:bg-hover/60"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-hover text-muted">
                        <I className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{i.title}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {FORMS[i.form].label}
                          {i.lead_name ? ` · ${i.lead_name}` : ""}
                        </span>
                      </span>
                      {i.progress !== null && (
                        <span className="hidden w-28 items-center gap-2 md:flex">
                          <ProgressBar value={i.progress} />
                          <span className="w-8 text-right text-[11.5px] tabular text-muted">{i.progress}%</span>
                        </span>
                      )}
                      <span className="hidden sm:block">
                        <Status label={HEALTH[i.health].label} tone={HEALTH[i.health].tone} />
                      </span>
                      <span className={cn("w-[74px] text-right text-[12.5px] tabular", late ? "font-medium text-danger" : "text-muted")}>
                        {frDate(i.next_due)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-[13px] text-muted">Toutes les activités sont dans les temps.</p>
          )}
        </Card>

        <Card title="Décisions attendues" action={<span className="text-[12.5px] tabular text-muted">{o.decisions.length}</span>}>
          {o.decisions.length ? (
            <ul className="pb-2">
              {o.decisions.map((d) => (
                <li key={d.id}>
                  <Link
                    to={d.href}
                    className="group flex items-start gap-3 border-t border-line px-5 py-3 transition-colors first:border-t-0 hover:bg-hover/60"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium leading-snug">{d.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{d.decision_needed}</span>
                    </span>
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-faint transition-colors group-hover:text-fg" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-[13px] text-muted">Aucun arbitrage en attente.</p>
          )}
        </Card>
      </div>

      {/* Rangée 3 : suivi-évaluation, en trois colonnes égales */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Indicateurs stratégiques" action={<Target className="size-4 text-faint" />}>
          <ul className="space-y-4 px-5 pb-5 pt-2">
            {[
              ...o.indicators.map((i) => ({
                id: i.id,
                name: i.name,
                value: `${i.result} / ${i.target} ${i.unit_label}`,
                pct:
                  i.target > i.baseline
                    ? Math.max(0, Math.min(100, ((i.result - i.baseline) / (i.target - i.baseline)) * 100))
                    : 0,
                hint: `Source : ${i.source || "non renseignée"}`,
              })),
              {
                id: "recos",
                name: "Recommandations des réunions",
                value: `${o.recommendations.done} / ${o.recommendations.open + o.recommendations.done} réalisées`,
                pct: rate(o.recommendations),
                hint: `${o.recommendations.late} en retard`,
              },
            ].map((i) => (
              <li key={i.id} title={i.hint}>
                <p className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate">{i.name}</span>
                  <span className="whitespace-nowrap text-[12px] tabular text-muted">{i.value}</span>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
                  <div className="bar-fill h-full rounded-full bg-primary" style={{ width: `${i.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Risques majeurs" action={<ShieldAlert className="size-4 text-faint" />}>
          {o.risks.length ? (
            <ul className="pb-2">
              {o.risks.map((r) => (
                <li key={r.id} className="flex items-start gap-3 border-t border-line px-5 py-3 first:border-t-0">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[12.5px] font-semibold tabular",
                      r.score >= 15 ? "bg-danger-soft text-danger" : r.score >= 8 ? "bg-warning-soft text-warning" : "bg-hover text-muted",
                    )}
                    title="Probabilité × impact"
                  >
                    {r.score}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium leading-snug">{r.title}</span>
                    <span className="text-[12px] text-muted">{r.owner_name ?? "Sans responsable"}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-[13px] text-muted">Aucun risque majeur ouvert.</p>
          )}
        </Card>

        <Card title="Fins de mission proches">
          {o.ending_contracts.length ? (
            <ul className="pb-2">
              {o.ending_contracts.map((c) => (
                <li key={c.id} className="flex items-center gap-3 border-t border-line px-5 py-3 first:border-t-0">
                  <Initials name={c.consultant_name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{c.consultant_name}</span>
                    <span className="block truncate text-[12px] text-muted">{c.title}</span>
                  </span>
                  <span className="text-[12px] tabular text-muted">{frDate(c.end_on)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-[13px] text-muted">Aucune mission ne s'achève ce mois-ci.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

const rank = (i: Item) =>
  ({ off_track: 0, at_risk: 1, on_track: 2, done: 3 })[i.health] - (i.decision_needed ? 0.5 : 0);
const rate = (r: { open: number; done: number }) =>
  r.open + r.done ? Math.round((r.done / (r.open + r.done)) * 100) : 0;

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-panel shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function CircleAction({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-hover hover:text-fg"
    >
      <ArrowUpRight className="size-4" />
    </Link>
  );
}

function RoundLink({ to, label, Icon, dot }: { to: string; label: string; Icon: LucideIcon; dot?: boolean }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="relative flex size-9 items-center justify-center rounded-[10px] border border-line-strong bg-panel text-fg transition-colors hover:bg-hover"
    >
      <Icon className="size-4.5" />
      {dot && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-danger ring-2 ring-panel" />}
    </Link>
  );
}

function Kpi({
  label,
  value,
  Icon,
  foot,
  to,
  tone,
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  foot: string;
  to?: string;
  tone?: "good" | "warn" | "bad";
}) {
  const body = (
    <>
      <p className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
        <Icon className="size-4 text-faint" />
        {label}
        {to && (
          <ArrowUpRight className="ml-auto size-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </p>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em]">
        <CountUp value={value} />
      </p>
      <p className="mt-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium",
            tone === "good" && "bg-success-soft text-success",
            tone === "warn" && "bg-warning-soft text-warning",
            tone === "bad" && "bg-danger-soft text-danger",
            !tone && "bg-hover text-muted",
          )}
        >
          {tone === "bad" && <span className="pulse-dot size-1.5 rounded-full bg-current" />}
          {foot}
        </span>
      </p>
    </>
  );
  const cls = "group min-w-0 p-4 sm:p-5";
  return to ? (
    <Link to={to} className={cn(cls, "transition-colors hover:bg-hover/60")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Initials({ name }: { name: string }) {
  const ini = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-primary">
      {ini}
    </span>
  );
}
