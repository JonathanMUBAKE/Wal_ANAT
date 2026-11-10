import { useState } from "react";
import { Link } from "react-router";
import { addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlarmClock,
  AlertTriangle,
  CheckCircle2,
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
  Status,
  frDate,
  isLate,
  type Tone,
} from "@/components/gov";
import { HealthRing } from "@/components/territory";
import { CollectionHeader, MiniMonth } from "@/components/collection";

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
  const [day, setDay] = useState<string | null>(null);
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
    .slice(0, 5);
  const total = Object.values(o.health).reduce((s, n) => s + n, 0);
  const healthy = (o.health.on_track ?? 0) + (o.health.done ?? 0);
  const score = total ? Math.round((healthy / total) * 100) : 0;
  const lateItems = o.items.filter((i) => i.overdue > 0).length;
  // Semaine glissante : nombre de rendez-vous par jour, pour le graphique principal
  const week = Array.from({ length: 7 }, (_, n) => {
    const d = addDays(parseISO(o.today), n);
    const key = format(d, "yyyy-MM-dd");
    return { key, d, n: o.agenda.filter((a) => a.date === key).length };
  });
  // Échelle plancher à 3 : un seul rendez-vous ne remplit pas toute la hauteur
  const peak = Math.max(3, ...week.map((w) => w.n));
  const busiest = week.reduce((a, b) => (b.n > a.n ? b : a), week[0]);
  const dayList = day ? o.agenda.filter((a) => a.date === day) : o.agenda;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 sm:px-8 sm:py-6">
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Colonne principale */}
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            {/* Graphique en vedette : la semaine de la DG */}
            <Card title="Agenda de la semaine" action={<CircleAction to="/activites" label="Tout l'agenda" />}>
              <div className="px-5 pb-5">
                <p className="inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-2 py-0.5 text-[12px] font-medium text-primary">
                  <ArrowUpRight className="size-3.5" />
                  Jour le plus chargé : {format(busiest.d, "EEEE", { locale: fr })}
                </p>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="text-[32px] font-semibold leading-none tracking-[-0.03em]">
                    <CountUp value={o.agenda.length} />
                  </span>
                  <span className="text-[13px] text-muted">rendez-vous et séances sur 7 jours</span>
                </p>
                <div className="relative mt-5 h-[176px]">
                  <div aria-hidden className="absolute inset-x-0 bottom-7 top-0">
                    {[0, 1, 2, 3].map((g) => (
                      <span
                        key={g}
                        className="absolute inset-x-0 border-t border-dashed border-line"
                        style={{ bottom: `${(g / 3) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="relative flex h-full items-end gap-3 sm:gap-4">
                    {week.map((w) => {
                      const top = w.key === busiest.key && w.n > 0;
                      return (
                        <button
                          key={w.key}
                          onClick={() => setDay(day === w.key ? null : w.key)}
                          title={`${format(w.d, "EEEE d MMMM", { locale: fr })} : ${w.n}`}
                          className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                        >
                          <span className="flex min-h-0 w-full flex-1 items-end justify-center">
                            <span
                              className={cn(
                                "bar-rise w-full max-w-[34px] rounded-t-[8px] rounded-b-[3px] transition-[filter] group-hover:brightness-95",
                                w.n === 0 && "hatch",
                                day === w.key && "ring-2 ring-[var(--ring)]",
                              )}
                              style={{
                                height: `${w.n ? Math.max(14, (w.n / peak) * 100) : 6}%`,
                                background: w.n
                                  ? top
                                    ? "var(--primary)"
                                    : "color-mix(in oklab, var(--primary) 30%, var(--panel))"
                                  : undefined,
                              }}
                            />
                          </span>
                          <span
                            className={cn(
                              "mt-2 h-5 text-[11.5px] capitalize",
                              w.key === o.today ? "font-semibold text-fg" : "text-muted",
                            )}
                          >
                            {format(w.d, "EEE", { locale: fr }).replace(".", "")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            {/* Anneau fin et trois lignes de chiffres */}
            <Card title="Santé du portefeuille" action={<CircleAction to="/activites" label="Voir les activités" />}>
              <div className="flex justify-center pb-2 pt-1">
                <HealthRing
                  size={136}
                  track="var(--hover)"
                  caption={`${score} % des activités dans les temps ou terminées`}
                  parts={[
                    { key: "ok", value: healthy, color: "var(--primary)", label: "Dans les temps ou terminées" },
                    { key: "ko", value: total - healthy, color: "var(--hover)", label: "À surveiller ou en difficulté" },
                  ]}
                  center={
                    <>
                      <span className="text-[26px] font-semibold leading-none tracking-[-0.03em]">
                        <CountUp value={score} />%
                      </span>
                      <span className="mt-1 text-[11px] text-muted">en bonne voie</span>
                    </>
                  }
                />
              </div>
              <ul className="px-3 pb-3">
                {(
                  [
                    ["on_track", CheckCircle2, "bg-success-soft text-success"],
                    ["at_risk", AlertTriangle, "bg-warning-soft text-warning"],
                    ["off_track", AlarmClock, "bg-danger-soft text-danger"],
                  ] as const
                ).map(([h, I, tile]) => (
                  <li key={h}>
                    <Link
                      to="/activites"
                      className="flex items-center gap-3 border-t border-line px-2 py-2.5 transition-colors hover:bg-hover/60"
                    >
                      <span className={cn("flex size-9 items-center justify-center rounded-[10px]", tile)}>
                        <I className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold leading-tight tabular">{o.health[h] ?? 0}</span>
                        <span className="text-[12px] text-muted">{HEALTH[h].label}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-primary">
                        Voir <ChevronRight className="size-3.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Décisions attendues : cartes pastel, une par dossier */}
          <Card
            title="Décisions attendues"
            action={
              <Link to="/activites" className="rounded-lg bg-brand-soft px-2.5 py-1 text-[12px] font-medium text-primary hover:brightness-95">
                Tout voir
              </Link>
            }
          >
            {o.decisions.length ? (
              <div className="grid grid-cols-1 gap-3 px-5 pb-5 pt-1 md:grid-cols-3">
                {o.decisions.slice(0, 3).map((d) => {
                  const I = FORMS[d.form].Icon;
                  return (
                    <Link
                      key={d.id}
                      to={d.href}
                      className="group flex min-h-[150px] flex-col rounded-xl p-4 transition-transform hover:-translate-y-0.5"
                      style={{ background: `color-mix(in oklab, var(--form-${d.form}) 10%, var(--panel))` }}
                    >
                      <span className="flex items-center justify-between">
                        <span className="rounded-md bg-panel/80 px-2 py-0.5 text-[11px] font-medium text-muted">
                          {FORMS[d.form].label}
                        </span>
                        <I className="size-4" style={{ color: `var(--form-${d.form})` }} />
                      </span>
                      <span className="mt-3 text-[15px] font-semibold leading-snug tracking-[-0.01em]">{d.title}</span>
                      <span className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted">{d.decision_needed}</span>
                      <span className="mt-auto flex items-center justify-between pt-3">
                        {d.lead_name ? <Initials name={d.lead_name} /> : <span />}
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-fg/80 group-hover:text-fg">
                          Arbitrer <ArrowUpRight className="size-3.5" />
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 pb-5 text-[13px] text-muted">Aucun arbitrage en attente.</p>
            )}
          </Card>

          {/* Chiffres clés : pastilles d'icône pastel, comme « Quick Stats » */}
          <Card title="Chiffres clés">
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-5 pb-5 pt-1 sm:grid-cols-3 2xl:grid-cols-5">
              <QuickStat Icon={Briefcase} tile="bg-brand-soft text-primary" value={total} label="Activités suivies" />
              <QuickStat Icon={Scale} tile="bg-ai-soft text-ai-fg" value={o.counters.decisions} label="Décisions attendues" />
              <QuickStat
                Icon={AlarmClock}
                tile="bg-danger-soft text-danger"
                value={o.counters.retards}
                label={`Retards · ${lateItems} activité${lateItems > 1 ? "s" : ""}`}
              />
              <QuickStat Icon={FileSignature} tile="bg-warning-soft text-warning" value={o.to_sign} label="À signer" to="/parapheur" />
              <QuickStat Icon={ListTree} tile="bg-success-soft text-success" value={o.open_gaps} label="Écarts à examiner" to="/attributions" />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <Card
              title="À suivre en priorité"
              action={
                <Link to="/activites" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-fg">
                  Portefeuille ({o.items.length}) <ChevronRight className="size-4" />
                </Link>
              }
            >
              <ul className="pb-2">
                {priorities.map((i) => {
                  const late = isLate(i.next_due, o.today);
                  return (
                    <li key={i.id}>
                      <Link
                        to={i.href}
                        className="flex items-center gap-3 border-t border-line px-5 py-3 transition-colors first:border-t-0 hover:bg-hover/60"
                      >
                        <span className="size-2 shrink-0 rounded-full" style={{ background: HEALTH[i.health].color }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium">{i.title}</span>
                          <span className="block truncate text-[12px] text-muted">
                            {FORMS[i.form].label}
                            {i.lead_name ? ` · ${i.lead_name}` : ""}
                          </span>
                        </span>
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
            </Card>

            <Card title="Indicateurs stratégiques" action={<Target className="size-4 text-faint" />}>
              <ul className="space-y-4 px-5 pb-5 pt-1">
                {[
                  ...o.indicators.map((i) => ({
                    id: i.id,
                    name: i.name,
                    value: `${i.result} / ${i.target}`,
                    pct:
                      i.target > i.baseline
                        ? Math.max(0, Math.min(100, ((i.result - i.baseline) / (i.target - i.baseline)) * 100))
                        : 0,
                  })),
                  {
                    id: "recos",
                    name: "Recommandations réalisées",
                    value: `${o.recommendations.done} / ${o.recommendations.open + o.recommendations.done}`,
                    pct: rate(o.recommendations),
                  },
                ].map((i) => (
                  <li key={i.id}>
                    <p className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate">{i.name}</span>
                      <span className="whitespace-nowrap text-[12px] font-medium tabular">{Math.round(i.pct)}%</span>
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-hover">
                      <div className="bar-fill h-full rounded-full bg-primary" style={{ width: `${i.pct}%` }} />
                    </div>
                    <p className="mt-1 text-[11.5px] tabular text-faint">{i.value}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Colonne de droite : le temps de la DG */}
        <aside className="space-y-5">
          <MiniMonth
            value={day ? parseISO(day) : parseISO(o.today)}
            onPick={(d) => {
              const k = format(d, "yyyy-MM-dd");
              setDay(day === k ? null : k);
            }}
            marks={new Set(o.agenda.map((a) => a.date))}
          />

          <Card
            title={day ? cap(format(parseISO(day), "EEEE d MMMM", { locale: fr })) : "Au programme"}
            action={
              day ? (
                <button onClick={() => setDay(null)} className="text-[12px] font-medium text-primary hover:underline">
                  Toute la semaine
                </button>
              ) : undefined
            }
          >
            {dayList.length ? (
              <ol className="relative px-5 pb-4 pt-1">
                <span aria-hidden className="absolute bottom-6 left-[27px] top-3 w-px bg-line" />
                {dayList.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link to={a.href} className="group relative flex items-start gap-3 py-2">
                      <span className="relative z-10 mt-1 size-[9px] shrink-0 rounded-full border-2 border-primary bg-panel" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium group-hover:text-primary">{a.title}</span>
                        <span className="text-[12px] text-muted">
                          {AGENDA_LABEL[a.form]} · {format(parseISO(a.date), "EEE d MMM", { locale: fr })}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-5 pb-5 text-[13px] text-muted">Rien de prévu ce jour-là.</p>
            )}
          </Card>

          <Card title="Point de situation" action={<Sparkles className="size-4 text-ai-fg" />}>
            <ul className="space-y-2 px-5 pb-5 pt-1 text-[12.5px] leading-snug text-muted">
              {o.brief.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-[6px] size-1.5 shrink-0 rounded-full bg-ai" />
                  {b}
                </li>
              ))}
            </ul>
          </Card>

          {!!o.risks.length && (
            <Card title="Risques majeurs" action={<ShieldAlert className="size-4 text-faint" />}>
              <ul className="pb-2">
                {o.risks.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 border-t border-line px-5 py-2.5 first:border-t-0">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-semibold tabular",
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
            </Card>
          )}
        </aside>
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

/** Chiffre clé : carré d'icône pastel, chiffre, libellé (modèle « Quick Stats »). */
function QuickStat({
  Icon,
  tile,
  value,
  label,
  to,
}: {
  Icon: LucideIcon;
  tile: string;
  value: number;
  label: string;
  to?: string;
}) {
  const body = (
    <>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tile)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[20px] font-semibold leading-tight tracking-[-0.02em] tabular">
          <CountUp value={value} />
        </span>
        <span className="block text-[12px] leading-tight text-muted">{label}</span>
      </span>
    </>
  );
  const cls = "flex min-w-0 items-center gap-3 rounded-xl p-1.5";
  return to ? (
    <Link to={to} className={cn(cls, "transition-colors hover:bg-hover")}>
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
