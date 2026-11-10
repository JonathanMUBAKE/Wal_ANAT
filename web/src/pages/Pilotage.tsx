import { useState } from "react";
import { Link, useNavigate } from "react-router";
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
  Table,
  Td,
  Tr,
  frDate,
  isLate,
  type Tone,
} from "@/components/gov";
import { HealthRing, Topo } from "@/components/territory";
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
const AGENDA_ICON: Record<string, LucideIcon> = {
  reunion: Users,
  commission: Landmark,
  conference: Mic2,
  rendez_vous: Handshake,
  interne: CalendarClock,
};
const AGENDA_HUE: Record<string, string> = {
  reunion: "var(--primary)",
  commission: "var(--form-commission)",
  conference: "var(--form-conference)",
  rendez_vous: "var(--form-rendez_vous)",
  interne: "var(--form-interne)",
};
const FEATURE_PEAKS = [{ x: 260, y: 10, rings: 9, seed: 1.9, r0: 10, step: 16 }];
const BRIEF_PEAKS = [{ x: 300, y: 200, rings: 10, seed: 4.4, r0: 12, step: 18 }];

export function PilotagePage() {
  const { data: me } = useMe();
  const nav = useNavigate();
  const [form, setForm] = useState<Form | null>(null);
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
  const items = o.items
    .filter((i) => !form || i.form === form)
    .sort((a, b) => rank(a) - rank(b) || (a.next_due ?? "9").localeCompare(b.next_due ?? "9"));
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
      <div className="h-1" />

      {/* Chiffres clés : la première carte, mise en avant, résume le portefeuille */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <div className="kpi-feature relative isolate col-span-2 overflow-hidden rounded-2xl p-5 text-white shadow-md sm:col-span-1">
          <Topo
            peaks={FEATURE_PEAKS}
            width={300}
            height={170}
            className="absolute inset-0 -z-10 size-full text-white opacity-[0.18]"
          />
          <div className="flex items-start justify-between">
            <p className="text-[14px] font-medium text-white/90">Activités suivies</p>
            <span className="flex size-8 items-center justify-center rounded-[10px] bg-white text-primary shadow-sm">
              <Briefcase className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em]">
            <CountUp value={total} />
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium">
            <ArrowUpRight className="size-3.5" />
            {score} % en bonne voie
          </p>
        </div>
        <Kpi label="Décisions attendues" value={o.counters.decisions} Icon={Scale} foot="à arbitrer par la DG" />
        <Kpi
          label="Retards à résorber"
          value={o.counters.retards}
          Icon={AlarmClock}
          foot={`${lateItems} activité${lateItems > 1 ? "s" : ""} concernée${lateItems > 1 ? "s" : ""}`}
          alert={o.counters.retards > 0}
        />
        <Kpi label="À signer" value={o.to_sign} Icon={FileSignature} foot="au parapheur" to="/parapheur" />
        <Kpi label="Écarts à examiner" value={o.open_gaps} Icon={ListTree} foot="attributions" to="/attributions" />
      </div>

      {/* Santé, formes d'activité, agenda */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card title="Santé du portefeuille" action={<CircleAction to="/activites" label="Voir les activités" />}>
          <div className="flex flex-col items-center px-5 pb-5 pt-2">
            <HealthRing
              size={156}
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
                  <span className="text-[30px] font-semibold leading-none tracking-[-0.03em]">
                    <CountUp value={score} />%
                  </span>
                  <span className="mt-1 text-[12px] text-muted">en bonne voie</span>
                </>
              }
            />
            <ul className="mt-5 grid w-full grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
              {(Object.keys(HEALTH) as Health[]).map((h) => (
                <li key={h} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: HEALTH[h].color }} />
                  <span className="text-muted">{HEALTH[h].label}</span>
                  <span className="ml-auto font-semibold tabular">{o.health[h] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card
          title="Activités par forme"
          action={
            form ? (
              <button
                onClick={() => setForm(null)}
                className="h-8 rounded-lg border border-line-strong px-3 text-[12px] font-medium hover:bg-hover"
              >
                Tout afficher
              </button>
            ) : (
              <span className="text-[12px] text-faint">Cliquez pour filtrer</span>
            )
          }
        >
          <div className="flex h-[250px] items-end justify-between gap-2 px-5 pb-5 pt-4">
            {forms.map((f) => {
              const n = o.counters[FORMS[f].counter] ?? 0;
              const { Icon } = FORMS[f];
              const active = form === f;
              return (
                <button
                  key={f}
                  onClick={() => setForm(active ? null : f)}
                  aria-pressed={active}
                  title={`${FORMS[f].plural} : ${n}`}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[13px] font-semibold tabular">{n}</span>
                  <span
                    className={cn(
                      "bar-rise w-full max-w-[32px] rounded-[10px] transition-[filter,transform] group-hover:brightness-110",
                      n === 0 && "hatch",
                      form && !active && "opacity-35",
                    )}
                    style={{
                      height: `${Math.max(12, (n / maxForm) * 100) * 1.45}px`,
                      background: n ? `var(--form-${f})` : undefined,
                    }}
                  />
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border transition-colors",
                      active ? "border-transparent text-white" : "border-line-strong text-muted",
                    )}
                    style={active ? { background: `var(--form-${f})` } : undefined}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="w-full truncate text-center text-[11px] text-muted">{FORMS[f].short}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Sept prochains jours" action={<CircleAction to="/activites" label="Tout l'agenda" />}>
          <div className="space-y-2.5 px-4 pb-4 pt-1">
            {o.agenda.length ? (
              o.agenda.slice(0, 3).map((a) => {
                const Icon = AGENDA_ICON[a.form] ?? CalendarClock;
                return (
                  <Link
                    key={a.id}
                    to={a.href}
                    className="group flex items-center gap-3 rounded-xl border border-line bg-bg/60 p-3 transition-colors hover:border-line-strong hover:bg-panel"
                  >
                    <span className="flex w-12 shrink-0 flex-col items-center rounded-2xl bg-panel py-1.5 shadow-sm">
                      <span className="text-[18px] font-semibold leading-none tracking-[-0.03em]">
                        {format(parseISO(a.date), "d")}
                      </span>
                      <span className="text-[10px] uppercase text-muted">
                        {format(parseISO(a.date), "EEE", { locale: fr })}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">{a.title}</span>
                      <span className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-muted">
                        <Icon className="size-3.5" style={{ color: AGENDA_HUE[a.form] }} />
                        {AGENDA_LABEL[a.form]}
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
                  </Link>
                );
              })
            ) : (
              <p className="px-1 py-3 text-[13px] text-muted">Rien de prévu sur la semaine.</p>
            )}
            {o.agenda.length > 3 && (
              <Link
                to="/activites"
                className="inline-flex items-center gap-1 px-1 pt-1 text-[13px] font-medium hover:text-primary"
              >
                Voir les {o.agenda.length} rendez-vous de la semaine
                <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Portefeuille et colonne de décision */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Card title={form ? FORMS[form].plural : "Portefeuille des activités"}>
            <div className="flex gap-2 overflow-x-auto px-5 pb-3 pt-2">
              <Pill active={!form} onClick={() => setForm(null)}>
                Toutes <span className="opacity-60">{o.items.length}</span>
              </Pill>
              {forms.map((f) => (
                <Pill key={f} active={form === f} onClick={() => setForm(form === f ? null : f)}>
                  <span className="size-2 rounded-full" style={{ background: `var(--form-${f})` }} />
                  {FORMS[f].plural}
                </Pill>
              ))}
            </div>
            {items.length ? (
              <Table head={["Activité", "Responsable", "État", "Avancement", "Échéance", "Retards"]}>
                {items.map((i) => (
                  <Tr key={i.id} onClick={() => nav(i.href)}>
                    <Td className="max-w-[210px]">
                      <span className="flex items-center gap-3">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-full"
                          style={{
                            color: `var(--form-${i.form})`,
                            background: `color-mix(in oklab, var(--form-${i.form}) 12%, transparent)`,
                          }}
                        >
                          {(() => {
                            const I = FORMS[i.form].Icon;
                            return <I className="size-4" />;
                          })()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{i.title}</span>
                          <span className="text-[12px] text-muted">
                            {FORMS[i.form].label}
                            {i.unit_name ? ` · ${i.unit_name}` : ""}
                          </span>
                        </span>
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {i.lead_name ? (
                        <span className="flex items-center gap-2" title={i.lead_name}>
                          <Initials name={i.lead_name} />
                          <span className="hidden 2xl:inline">{i.lead_name}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <Status label={HEALTH[i.health].label} tone={HEALTH[i.health].tone} />
                    </Td>
                    <Td className="min-w-[96px]">
                      {i.progress === null ? (
                        <span className="text-faint">—</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <ProgressBar value={i.progress} />
                          <span className="tabular w-10 shrink-0 whitespace-nowrap text-right text-[12px] text-muted">
                            {i.progress} %
                          </span>
                        </span>
                      )}
                    </Td>
                    <Td
                      className={cn(
                        "whitespace-nowrap tabular",
                        isLate(i.next_due, o.today) && i.health !== "done" && "font-medium text-danger",
                      )}
                    >
                      {frDate(i.next_due)}
                    </Td>
                    <Td className={cn("tabular", i.overdue > 0 && "font-semibold text-danger")}>{i.overdue || "—"}</Td>
                  </Tr>
                ))}
              </Table>
            ) : (
              <Empty title="Aucune activité ici">Créez une activité ou renseignez la nature de vos projets.</Empty>
            )}
            <div className="h-3" />
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {!!o.indicators.length && (
              <Card title="Indicateurs stratégiques" action={<Target className="size-4 text-faint" />}>
                <ul className="space-y-4 px-5 pb-5 pt-2">
                  {o.indicators.map((i) => {
                    const pct =
                      i.target > i.baseline
                        ? Math.max(0, Math.min(100, ((i.result - i.baseline) / (i.target - i.baseline)) * 100))
                        : 0;
                    return (
                      <li key={i.id} title={`Source : ${i.source || "non renseignée"}`}>
                        <p className="flex items-baseline justify-between gap-3 text-[13.5px]">
                          <span className="font-medium">{i.name}</span>
                          <span className="whitespace-nowrap tabular text-[12.5px] text-muted">
                            <span className="font-semibold text-fg">{i.result}</span> / {i.target} {i.unit_label}
                          </span>
                        </p>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-hover">
                          <div
                            className="bar-fill stripes h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                pct >= 75 ? "var(--success)" : pct >= 40 ? "var(--primary)" : "var(--warning)",
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
            <Card title="Exécution des recommandations" action={<CircleAction to="/reunions" label="Réunions" />}>
              <div className="flex items-center gap-5 px-5 pb-4 pt-2">
                <HealthRing
                  size={120}
                  track="var(--hover)"
                  caption={`${rate(o.recommendations)} % des recommandations réalisées`}
                  parts={[
                    { key: "done", value: o.recommendations.done, color: "var(--success)", label: "Réalisées" },
                    {
                      key: "open",
                      value: o.recommendations.open - o.recommendations.late,
                      color: "var(--primary)",
                      label: "En cours",
                    },
                    { key: "late", value: o.recommendations.late, color: "var(--danger)", label: "En retard" },
                  ]}
                  center={
                    <span className="text-[26px] font-semibold leading-none tracking-[-0.04em]">
                      <CountUp value={rate(o.recommendations)} />%
                    </span>
                  }
                />
                <ul className="flex-1 space-y-2 text-[13px]">
                  <Legend color="var(--success)" label="Réalisées" value={o.recommendations.done} />
                  <Legend
                    color="var(--primary)"
                    label="En cours"
                    value={o.recommendations.open - o.recommendations.late}
                  />
                  <Legend color="var(--danger)" label="En retard" value={o.recommendations.late} />
                </ul>
              </div>
              {o.recommendations.late_list.slice(0, 2).map((r) => (
                <Link
                  key={r.id}
                  to={`/reunions/${r.meeting_id}`}
                  className="mx-4 mb-3 block rounded-xl bg-danger-soft/60 px-3.5 py-2.5 text-[12.5px] transition-colors hover:bg-danger-soft"
                >
                  <span className="line-clamp-2 font-medium">{r.text}</span>
                  <span className="mt-0.5 block text-[12px] text-muted">
                    {r.responsible_name || "Sans responsable"} ·{" "}
                    <span className="font-medium text-danger">{frDate(r.due_on)}</span>
                  </span>
                </Link>
              ))}
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <div className="hero-night relative isolate overflow-hidden rounded-2xl p-5 shadow-md">
            <Topo
              peaks={BRIEF_PEAKS}
              width={340}
              height={240}
              className="absolute inset-0 -z-10 size-full text-[#8CCBF2] opacity-[0.2]"
            />
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <Sparkles className="size-4 text-[#8CCBF2]" />
              Point de situation
            </p>
            <ul className="stagger mt-3 space-y-2 text-[13px] leading-snug text-white/80">
              {o.brief.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#8CCBF2]" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <Card title="Décisions attendues" action={<Scale className="size-4 text-faint" />}>
            <div className="space-y-2.5 px-4 pb-4 pt-1">
              {o.decisions.length ? (
                o.decisions.map((d) => {
                  const I = FORMS[d.form].Icon;
                  return (
                    <Link
                      key={d.id}
                      to={d.href}
                      className="group block rounded-xl p-3.5 transition-transform hover:-translate-y-0.5"
                      style={{ background: `color-mix(in oklab, var(--form-${d.form}) 9%, var(--panel))` }}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span
                          className="flex size-8 items-center justify-center rounded-full bg-panel shadow-sm"
                          style={{ color: `var(--form-${d.form})` }}
                        >
                          <I className="size-4" />
                        </span>
                        <span className="flex size-7 items-center justify-center rounded-lg border border-line text-muted transition-colors group-hover:border-transparent group-hover:bg-night group-hover:text-white">
                          <ArrowUpRight className="size-3.5" />
                        </span>
                      </span>
                      <span className="mt-2.5 block text-[14px] font-semibold leading-snug">{d.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{d.decision_needed}</span>
                    </Link>
                  );
                })
              ) : (
                <p className="px-1 py-3 text-[13px] text-muted">Aucun arbitrage en attente.</p>
              )}
            </div>
          </Card>

          {!!o.risks.length && (
            <Card title="Risques majeurs" action={<ShieldAlert className="size-4 text-faint" />}>
              <ul className="space-y-2.5 px-4 pb-4 pt-1">
                {o.risks.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular",
                        r.score >= 15
                          ? "bg-danger-soft text-danger"
                          : r.score >= 8
                            ? "bg-warning-soft text-warning"
                            : "bg-hover text-muted",
                      )}
                      title="Probabilité × impact"
                    >
                      {r.score}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold leading-snug">{r.title}</span>
                      <span className="text-[12px] text-muted">{r.owner_name ?? "Sans responsable"}</span>
                      {r.mitigation && (
                        <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-muted">
                          {r.mitigation}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {!!o.ending_contracts.length && (
            <Card title="Fins de mission proches">
              <ul className="space-y-1 px-4 pb-4 pt-1">
                {o.ending_contracts.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-2xl px-1 py-1.5 text-[13px]">
                    <Initials name={c.consultant_name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{c.consultant_name}</span>
                      <span className="block truncate text-[12px] text-muted">{c.title}</span>
                    </span>
                    <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[11.5px] font-medium tabular text-warning">
                      {frDate(c.end_on)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
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
  alert,
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  foot: string;
  to?: string;
  alert?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium leading-snug sm:text-[14px]">{label}</p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-[10px] border transition-colors",
            alert ? "border-danger/30 bg-danger-soft text-danger" : "border-line-strong text-fg",
            to && "group-hover:border-transparent group-hover:bg-night group-hover:text-white",
          )}
        >
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em]">
        <CountUp value={value} />
      </p>
      <p
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 text-[12.5px]",
          alert ? "font-medium text-danger" : "text-muted",
        )}
      >
        {alert && <span className="pulse-dot size-1.5 rounded-full bg-danger" />}
        {foot}
      </p>
    </>
  );
  const cls = "group min-w-0 rounded-2xl border border-line bg-panel p-4 shadow-sm sm:p-5";
  return to ? (
    <Link to={to} className={cn(cls, "card-hover")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-[12.5px] font-medium transition-colors",
        active
          ? "border-primary/40 bg-brand-soft text-primary"
          : "border-line-strong text-fg hover:bg-hover",
      )}
    >
      {children}
    </button>
  );
}

const Legend = ({ color, label, value }: { color: string; label: string; value: number }) => (
  <li className="flex items-center gap-2">
    <span className="size-2.5 rounded-full" style={{ background: color }} />
    <span className="text-muted">{label}</span>
    <span className="ml-auto font-semibold tabular">{value}</span>
  </li>
);

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
