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

  return (
    <div className="mx-auto max-w-[1320px] space-y-4 p-4 sm:px-8 sm:py-6">
      <section className="hero-night overflow-hidden rounded-2xl p-6 shadow-md sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#8CCBF2]">
              {format(parseISO(o.today), "EEEE d MMMM yyyy", { locale: fr })}
            </p>
            <h1 className="mt-2 font-serif text-[40px] leading-[1.05] tracking-[-0.01em] sm:text-[52px]">
              {greeting()}, {firstName(me?.name ?? "")}
            </h1>
            <div className="mt-5 grid grid-cols-3 gap-x-5 gap-y-3 sm:grid-cols-5">
              <HeroStat label="Activités suivies" value={total} />
              <HeroStat label="Décisions attendues" value={o.counters.decisions} />
              <HeroStat label="Retards à résorber" value={o.counters.retards} />
              <Link to="/parapheur" className="transition-opacity hover:opacity-80">
                <HeroStat label="À signer" value={o.to_sign} />
              </Link>
              <Link to="/attributions" className="transition-opacity hover:opacity-80">
                <HeroStat label="Écarts à examiner" value={o.open_gaps} />
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
            <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.1em] text-[#8CCBF2]">
              Point de situation
            </p>
            <ul className="stagger space-y-1.5 text-[13.5px] leading-snug text-white/85">
              {o.brief.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-[#8CCBF2]" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {(Object.keys(FORMS) as Form[]).map((f) => {
          const { plural, Icon, counter } = FORMS[f];
          const active = form === f;
          return (
            <button
              key={f}
              aria-pressed={active}
              onClick={() => setForm(active ? null : f)}
              className={cn(
                "card-hover rounded-xl border bg-panel p-4 text-left shadow-sm",
                active ? "border-primary ring-2 ring-[var(--ring)]" : "border-line",
              )}
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-primary">
                <Icon className="size-3.5" />
              </span>
              <p className="mt-3 font-serif text-[32px] leading-none">
                <CountUp value={o.counters[counter] ?? 0} />
              </p>
              <p className="mt-1 text-[12.5px] text-muted">{plural}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
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
                    <span className="block truncate font-medium">{i.title}</span>
                    <span className="text-[12px] text-muted">
                      {FORMS[i.form].label}
                      {i.unit_name ? ` · ${i.unit_name}` : ""}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">{i.lead_name ?? "—"}</Td>
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
            <div className="p-2">
              {o.agenda.length ? (
                o.agenda.slice(0, 7).map((a) => (
                  <Link
                    key={a.id}
                    to={a.href}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-hover"
                  >
                    <span className="flex w-10 shrink-0 flex-col items-center rounded-lg border border-line bg-bg py-0.5">
                      <span className="font-serif text-[18px] leading-none">{format(parseISO(a.date), "d")}</span>
                      <span className="text-[9.5px] uppercase text-muted">
                        {format(parseISO(a.date), "MMM", { locale: fr })}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{a.title}</span>
                      <span className="text-[12px] text-muted">{AGENDA_LABEL[a.form]}</span>
                    </span>
                  </Link>
                ))
              ) : (
                <p className="px-2 py-3 text-[13px] text-muted">Rien de prévu sur la semaine.</p>
              )}
            </div>
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
              <div className="flex items-end justify-between">
                <p className="font-serif text-[32px] leading-none">
                  <CountUp value={rate(o.recommendations)} /> %
                </p>
                <p className="text-right text-[12px] text-muted">
                  {o.recommendations.done} réalisées
                  <br />
                  <span className={o.recommendations.late ? "font-medium text-danger" : ""}>
                    {o.recommendations.late} en retard
                  </span>
                </p>
              </div>
              <div className="mt-2">
                <ProgressBar value={rate(o.recommendations)} tone="success" />
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
const HeroStat = ({ label, value }: { label: string; value: number }) => (
  <div>
    <p className="font-serif text-[34px] leading-none">
      <CountUp value={value} />
    </p>
    <p className="mt-1 text-[12px] leading-tight text-white/65">{label}</p>
  </div>
);
