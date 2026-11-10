import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  FileSignature,
  Handshake,
  Landmark,
  Mic2,
  Scale,
  ShieldAlert,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Empty, cn } from "@/components/ui";
import {
  CountUp,
  LoadingRows,
  ProgressBar,
  Section,
  Status,
  Table,
  Td,
  Tr,
  frDate,
  isLate,
  type Tone,
} from "@/components/gov";
import { HERO_PEAKS, HealthRing, Topo } from "@/components/territory";
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

export const FORMS: Record<Form, { label: string; plural: string; Icon: LucideIcon; counter: string }> = {
  projet_interne: { label: "Projet interne", plural: "Projets internes", Icon: Briefcase, counter: "projets_internes" },
  projet_confie: { label: "Projet confié", plural: "Projets confiés", Icon: FileSignature, counter: "projets_confies" },
  commission: { label: "Commission", plural: "Commissions", Icon: Landmark, counter: "commissions" },
  conference: { label: "Conférence", plural: "Conférences", Icon: Mic2, counter: "conferences" },
  rendez_vous: { label: "Rendez-vous", plural: "Rendez-vous", Icon: Handshake, counter: "rendez_vous" },
  interne: {
    label: "Activité interne",
    plural: "Activités internes",
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

  return (
    <div className="mx-auto max-w-[1320px] space-y-5 p-4 sm:px-8 sm:py-6">
      <section className="hero-night relative isolate overflow-hidden rounded-3xl shadow-lg">
        <Topo peaks={HERO_PEAKS} className="absolute inset-0 -z-10 size-full text-[#8CCBF2] opacity-[0.2]" />
        <div className="grid items-center gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="eyebrow text-[11.5px] font-medium uppercase tracking-[0.18em]">
              {format(parseISO(o.today), "EEEE d MMMM yyyy", { locale: fr })}
              <span className="mx-2 opacity-50">·</span>Direction générale
            </p>
            <h1 className="mt-3 font-serif text-[44px] leading-[1.02] tracking-[-0.015em] sm:text-[60px]">
              {greeting()}, <span className="italic text-[#BFE3F8]">{firstName(me?.name ?? "")}</span>
            </h1>
            <ul className="stagger mt-5 max-w-2xl space-y-2 border-l border-white/15 pl-4 text-[14px] leading-snug text-white/80">
              {o.brief.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md">
            <HealthRing
              size={150}
              caption={`Santé du portefeuille : ${score} % dans les temps ou terminé`}
              parts={(Object.keys(HEALTH) as Health[]).map((h) => ({
                key: h,
                value: o.health[h] ?? 0,
                color: HERO_HEALTH[h],
                label: HEALTH[h].label,
              }))}
              center={
                <>
                  <span className="font-serif text-[38px] leading-none">
                    <CountUp value={score} />
                    <span className="text-[22px]"> %</span>
                  </span>
                  <span className="mt-1.5 max-w-[78px] text-[9.5px] uppercase leading-tight tracking-[0.12em] text-white/55">
                    en bonne voie
                  </span>
                </>
              }
            />
            <ul className="space-y-2 text-[12.5px]">
              {(Object.keys(HEALTH) as Health[]).map((h) => (
                <li key={h} className="flex items-center gap-2.5 text-white/75">
                  <span className="size-2 rounded-full" style={{ background: HERO_HEALTH[h] }} />
                  <span className="flex-1">{HEALTH[h].label}</span>
                  <span className="tabular pl-3 font-medium text-white">{o.health[h] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-white/10 bg-[#061a2c]/40 sm:grid-cols-5">
          <HeroStat label="Activités suivies" value={total} />
          <HeroStat label="Décisions attendues" value={o.counters.decisions} />
          <HeroStat label="Retards à résorber" value={o.counters.retards} alert={o.counters.retards > 0} />
          <HeroStat label="À signer" value={o.to_sign} to="/parapheur" />
          <HeroStat label="Écarts à examiner" value={o.open_gaps} to="/attributions" />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {(Object.keys(FORMS) as Form[]).map((f) => {
          const { plural, Icon, counter } = FORMS[f];
          const active = form === f;
          const mine = o.items.filter((i) => i.form === f);
          const late = mine.filter((i) => i.overdue > 0).length;
          return (
            <button
              key={f}
              aria-pressed={active}
              onClick={() => setForm(active ? null : f)}
              style={{ "--hue": `var(--form-${f})` } as React.CSSProperties}
              className={cn(
                "form-tile card-hover rounded-2xl border bg-panel p-4 text-left shadow-sm",
                active ? "border-[var(--hue)] ring-2 ring-[color-mix(in_oklab,var(--hue)_22%,transparent)]" : "border-line",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="form-chip flex size-8 items-center justify-center rounded-xl">
                  <Icon className="size-4" />
                </span>
                {late > 0 && (
                  <span className="rounded-full bg-danger-soft px-1.5 text-[10.5px] font-semibold text-danger">
                    {late} en retard
                  </span>
                )}
              </span>
              <p className="mt-4 font-serif text-[40px] leading-none">
                <CountUp value={o.counters[counter] ?? 0} />
              </p>
              <p className="mt-1 text-[12.5px] text-muted">{plural}</p>
              <span
                className="mt-3 flex min-h-2 flex-wrap gap-1"
                aria-label={mine.map((i) => `${i.title} : ${HEALTH[i.health].label}`).join(", ") || "Aucune activité"}
              >
                {mine.slice(0, 14).map((i) => (
                  <span
                    key={i.id}
                    title={`${i.title} · ${HEALTH[i.health].label}`}
                    className="size-2 rounded-full"
                    style={{ background: HEALTH[i.health].color }}
                  />
                ))}
                {mine.length > 14 && <span className="text-[10.5px] leading-none text-faint">+{mine.length - 14}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Section
          title={form ? FORMS[form].plural : "Portefeuille des activités"}
          aside={
            form && (
              <button onClick={() => setForm(null)} className="text-[12px] font-medium text-primary hover:underline">
                Tout afficher
              </button>
            )
          }
        >
          {total > 0 && (
            <div className="px-4 pb-1 pt-3">
              <div className="flex h-2 gap-0.5" role="img" aria-label="Répartition des activités par état">
                {(Object.keys(HEALTH) as Health[])
                  .filter((h) => o.health[h])
                  .map((h) => (
                    <div
                      key={h}
                      title={`${HEALTH[h].label} : ${o.health[h]}`}
                      className="bar-fill rounded-[3px]"
                      style={{ flex: o.health[h], background: HEALTH[h].color }}
                    />
                  ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
                {(Object.keys(HEALTH) as Health[]).map((h) => (
                  <span key={h} className="inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full" style={{ background: HEALTH[h].color }} />
                    {HEALTH[h].label} <span className="tabular font-medium text-fg">{o.health[h]}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {items.length ? (
            <Table head={["Activité", "Responsable", "État", "Avancement", "Échéance", "Retards"]}>
              {items.map((i) => (
                <Tr key={i.id} onClick={() => nav(i.href)}>
                  <Td className="max-w-[230px]">
                    <span className="flex items-start gap-2.5">
                      <span
                        className="mt-[3px] h-8 w-[3px] shrink-0 rounded-full"
                        style={{ background: `var(--form-${i.form})` }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{i.title}</span>
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
                  <Td className="min-w-[110px]">
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
                      isLate(i.next_due, o.today) && i.health !== "done" && "text-danger",
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
        </Section>

        <div className="space-y-4">
          <Section title="Décisions attendues" aside={<Scale className="size-4 text-faint" />}>
            <div className="p-2">
              {o.decisions.length ? (
                o.decisions.map((d) => (
                  <Link
                    key={d.id}
                    to={d.href}
                    className="group block rounded-lg px-2 py-2 transition-colors hover:bg-hover"
                  >
                    <p className="flex items-center justify-between gap-2 text-[13.5px] font-medium">
                      <span className="truncate">{d.title}</span>
                      <ArrowUpRight className="size-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted">{d.decision_needed}</p>
                  </Link>
                ))
              ) : (
                <p className="px-2 py-3 text-[13px] text-muted">Aucun arbitrage en attente.</p>
              )}
            </div>
          </Section>
          <Section title="Sept prochains jours" aside={<CalendarClock className="size-4 text-faint" />}>
            {o.agenda.length ? (
              <ol className="relative px-2 pb-2 pt-1">
                <span aria-hidden className="absolute bottom-5 left-[60px] top-4 w-px bg-line" />
                {o.agenda.slice(0, 7).map((a) => (
                  <li key={a.id}>
                    <Link
                      to={a.href}
                      className="group relative flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-hover"
                    >
                      <span className="w-9 shrink-0 text-right leading-none">
                        <span className="block font-serif text-[20px]">{format(parseISO(a.date), "d")}</span>
                        <span className="text-[9.5px] uppercase tracking-wide text-muted">
                          {format(parseISO(a.date), "EEE", { locale: fr })}
                        </span>
                      </span>
                      <span
                        className="relative z-10 size-2.5 shrink-0 rounded-full ring-[3px] ring-panel transition-transform group-hover:scale-125"
                        style={{ background: AGENDA_HUE[a.form] ?? "var(--primary)" }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium">{a.title}</span>
                        <span className="text-[12px] text-muted">{AGENDA_LABEL[a.form]}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-4 py-3 text-[13px] text-muted">Rien de prévu sur la semaine.</p>
            )}
          </Section>
          {!!o.risks.length && (
            <Section title="Risques majeurs" aside={<ShieldAlert className="size-4 text-faint" />}>
              <ul className="stagger p-2">
                {o.risks.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 rounded-lg px-2 py-1.5">
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold tabular",
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
                      <span className="block text-[13px] font-medium leading-snug">{r.title}</span>
                      <span className="text-[12px] text-muted">{r.owner_name ?? "Sans responsable"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {!!o.indicators.length && (
            <Section title="Indicateurs stratégiques" aside={<Target className="size-4 text-faint" />}>
              <ul className="stagger space-y-3 p-4 pt-3">
                {o.indicators.map((i) => (
                  <li key={i.id} title={`Source : ${i.source || "non renseignée"}`}>
                    <p className="flex items-baseline justify-between gap-2 text-[13px]">
                      <span className="font-medium">{i.name}</span>
                      <span className="whitespace-nowrap tabular text-[12px] text-muted">
                        {i.result} / {i.target} {i.unit_label}
                      </span>
                    </p>
                    <div className="mt-1.5">
                      <ProgressBar
                        value={i.target > i.baseline ? ((i.result - i.baseline) / (i.target - i.baseline)) * 100 : 0}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {!!o.ending_contracts.length && (
            <Section title="Fins de mission proches">
              <ul className="p-2">
                {o.ending_contracts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px]">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.consultant_name}</span>
                      <span className="block truncate text-[12px] text-muted">{c.title}</span>
                    </span>
                    <span className="whitespace-nowrap text-[12px] tabular text-muted">{frDate(c.end_on)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Section title="Exécution des recommandations">
            <div className="p-4 pt-3">
              <div className="flex items-center gap-4">
                <HealthRing
                  size={96}
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
                    <span className="font-serif text-[24px] leading-none">
                      <CountUp value={rate(o.recommendations)} />
                      <span className="text-[14px]"> %</span>
                    </span>
                  }
                />
                <ul className="space-y-1 text-[12.5px] text-muted">
                  <li className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success" />
                    {o.recommendations.done} réalisées
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary" />
                    {o.recommendations.open - o.recommendations.late} en cours
                  </li>
                  <li className={cn("flex items-center gap-2", o.recommendations.late > 0 && "font-medium text-danger")}>
                    <span className="size-2 rounded-full bg-danger" />
                    {o.recommendations.late} en retard
                  </li>
                </ul>
              </div>
              {o.recommendations.late_list.map((r) => (
                <Link
                  key={r.id}
                  to={`/reunions/${r.meeting_id}`}
                  className="mt-3 block border-t border-line pt-2 text-[12.5px] hover:text-primary"
                >
                  {r.text}
                  <span className="mt-0.5 block text-[12px] text-muted">
                    {r.responsible_name || "Sans responsable"} · <span className="text-danger">{frDate(r.due_on)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

const rank = (i: Item) =>
  ({ off_track: 0, at_risk: 1, on_track: 2, done: 3 })[i.health] - (i.decision_needed ? 0.5 : 0);
const rate = (r: { open: number; done: number }) =>
  r.open + r.done ? Math.round((r.done / (r.open + r.done)) * 100) : 0;
const HERO_HEALTH: Record<Health, string> = {
  on_track: "#3DD68C",
  at_risk: "#F5B544",
  off_track: "#FF7A7F",
  done: "#8CCBF2",
};
const AGENDA_HUE: Record<string, string> = {
  reunion: "var(--primary)",
  commission: "var(--form-commission)",
  conference: "var(--form-conference)",
  rendez_vous: "var(--form-rendez_vous)",
  interne: "var(--form-interne)",
};

function HeroStat({ label, value, to, alert }: { label: string; value: number; to?: string; alert?: boolean }) {
  const body = (
    <>
      <p className="flex items-center gap-2 font-serif text-[34px] leading-none">
        <CountUp value={value} />
        {alert && <span className="pulse-dot size-1.5 rounded-full bg-[#FF7A7F]" aria-hidden />}
        {to && (
          <ArrowUpRight className="size-4 text-white/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
        )}
      </p>
      <p className="mt-1.5 text-[11.5px] uppercase leading-tight tracking-[0.08em] text-white/55">{label}</p>
    </>
  );
  const cls =
    "group border-white/10 px-6 py-4 [&:not(:first-child)]:border-l max-sm:[&:nth-child(odd)]:border-l-0 max-sm:[&:nth-child(n+3)]:border-t";
  return to ? (
    <Link to={to} className={cn(cls, "transition-colors hover:bg-white/[0.05]")}>
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
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-primary">
      {ini}
    </span>
  );
}
