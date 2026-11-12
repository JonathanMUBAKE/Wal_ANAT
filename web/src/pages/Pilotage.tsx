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
  ChevronRight,
  FileSignature,
  Gauge,
  Plus,
  Scale,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Empty, cn } from "@/components/ui";
import { CountUp, LoadingRows, frDate, isLate, type Tone } from "@/components/gov";
import { HealthRing } from "@/components/territory";
import { CollectionHeader } from "@/components/collection";
import { ByDirection } from "@/components/directions";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
import { api } from "@/lib/api";
import { useCan, useMe } from "@/lib/hooks";
import { useForms } from "@/lib/referentials";
import { DecisionDialog, type DecisionSource } from "./Decisions";
import { useShell } from "@/lib/shell";
import { firstName, greeting } from "@/lib/format";

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

export const HEALTH: Record<Health, { label: string; tone: Tone; color: string }> = {
  on_track: { label: "Dans les temps", tone: "success", color: "var(--success)" },
  at_risk: { label: "À surveiller", tone: "warning", color: "var(--warning)" },
  off_track: { label: "En difficulté", tone: "danger", color: "var(--danger)" },
  done: { label: "Terminé", tone: "info", color: "var(--primary)" },
};

export function PilotagePage() {
  const { data: me } = useMe();
  const shell = useShell();
  const form = useForms();
  const can = useCan();
  const [day, setDay] = useState<string | null>(null);
  const [arbitrating, setArbitrating] = useState<DecisionSource | null>(null);
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
  // Semaine glissante : nombre de rendez-vous par jour
  const week = Array.from({ length: 7 }, (_, n) => {
    const d = addDays(parseISO(o.today), n);
    const key = format(d, "yyyy-MM-dd");
    return { key, d, n: o.agenda.filter((a) => a.date === key).length };
  });
  const peak = Math.max(3, ...week.map((w) => w.n));
  const busiest = week.reduce((a, b) => (b.n > a.n ? b : a), week[0]);
  const dayList = (day ? o.agenda.filter((a) => a.date === day) : o.agenda).slice(0, 3);

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 p-4 sm:px-8 sm:py-6">
      <CollectionHeader
        Icon={Gauge}
        crumbs={["Pilotage", "Tableau de bord DG"]}
        title={`${greeting()}, ${firstName(me?.name ?? "")}`}
        subtitle={`${cap(format(parseISO(o.today), "EEEE d MMMM yyyy", { locale: fr }))} · voici l'essentiel pour décider aujourd'hui.`}
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

      {/* Grille bento : 12 colonnes, chaque carte occupe la place que mérite son importance */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12 xl:grid-flow-row-dense">
        {/* 1. Quatre chiffres qui appellent une action */}
        <Stat
          className="md:col-span-3 xl:col-span-3"
          Icon={Briefcase}
          tile="bg-brand-soft text-primary"
          label="Activités suivies"
          value={total}
          foot={`${score} % en bonne voie`}
          tone={score >= 70 ? "good" : "warn"}
          to="/activites"
        />
        <Stat
          className="md:col-span-3 xl:col-span-3"
          Icon={Scale}
          tile="bg-ai-soft text-ai-fg"
          label="Décisions attendues"
          value={o.counters.decisions}
          foot={
            o.counters.decisions_a_executer
              ? `${o.counters.decisions_a_executer} décidée${o.counters.decisions_a_executer > 1 ? "s" : ""}, en exécution`
              : "à arbitrer par la DG"
          }
          to="/decisions"
        />
        <Stat
          className="md:col-span-3 xl:col-span-3"
          Icon={AlarmClock}
          tile="bg-danger-soft text-danger"
          label="Retards à résorber"
          value={o.counters.retards}
          foot={lateFoot(
            (o.counters as unknown as { retards_detail?: Record<string, number> }).retards_detail,
            lateItems,
          )}
          tone={o.counters.retards ? "bad" : "good"}
        />
        <Stat
          className="md:col-span-3 xl:col-span-3"
          Icon={FileSignature}
          tile="bg-warning-soft text-warning"
          label="À signer"
          value={o.to_sign}
          foot={o.to_sign ? "au parapheur" : "parapheur à jour"}
          tone={o.to_sign ? undefined : "good"}
          to="/parapheur"
        />

        {/* 1 bis. Par direction : où en est chaque direction, et pourquoi */}
        <ByDirection className="md:col-span-6 xl:col-span-12" />

        {/* 2. Santé du portefeuille */}
        <Bento
          className="md:col-span-3 xl:col-span-4"
          title="Santé du portefeuille"
          action={<CircleAction to="/activites" label="Voir les activités" />}
        >
          <div className="flex items-center gap-5 px-5 pb-2 pt-1">
            <HealthRing
              size={112}
              track="var(--hover)"
              caption={`${score} % des activités dans les temps ou terminées`}
              parts={[
                { key: "ok", value: healthy, color: "var(--primary)", label: "Dans les temps ou terminées" },
                { key: "ko", value: total - healthy, color: "var(--hover)", label: "À surveiller ou en difficulté" },
              ]}
              center={
                <span className="text-[22px] font-semibold leading-none tracking-[-0.03em]">
                  <CountUp value={score} />%
                </span>
              }
            />
            <div className="min-w-0">
              <p className="text-[13px] font-medium">En bonne voie</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">
                {healthy} activité{healthy > 1 ? "s" : ""} sur {total} sont dans les temps ou terminées.
              </p>
            </div>
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
                  className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-hover"
                >
                  <span className={cn("flex size-8 items-center justify-center rounded-[10px]", tile)}>
                    <I className="size-4" />
                  </span>
                  <span className="flex-1 text-[13px] text-muted">{HEALTH[h].label}</span>
                  <span className="text-[15px] font-semibold tabular">{o.health[h] ?? 0}</span>
                  <ChevronRight className="size-4 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Bento>

        {/* 3. Décisions attendues : le cœur du rôle de la DG */}
        <Bento
          className="md:col-span-3 xl:col-span-5"
          title="Décisions attendues"
          action={
            <span className="flex items-center gap-2">
              <span className="rounded-md bg-hover px-2 py-0.5 text-[12px] font-medium tabular text-muted">
                {o.decisions.length}
              </span>
              <CircleAction to="/decisions" label="Ouvrir le registre des décisions" />
            </span>
          }
        >
          {o.decisions.length ? (
            <ul className="space-y-2 px-4 pb-4 pt-1">
              {o.decisions.slice(0, 4).map((d) => {
                const F = form(d.form);
                const I = F.Icon;
                return (
                  <li
                    key={d.id}
                    className="group flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-line-strong hover:bg-hover/50"
                  >
                    <Link to={d.href} className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                        style={{
                          color: F.color,
                          background: `color-mix(in oklab, ${F.color} 12%, transparent)`,
                        }}
                      >
                        <I className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{d.title}</span>
                        <span className="block truncate text-[12px] text-muted">{d.decision_needed}</span>
                      </span>
                    </Link>
                    {can("decisions.record") && d.arbitration_id ? (
                      <Link
                        to={`/activites?onglet=arbitrages&arbitrage=${d.arbitration_id}`}
                        className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[12px] font-medium text-fg/80 transition-colors hover:border-transparent hover:bg-night hover:text-white"
                      >
                        Trancher
                      </Link>
                    ) : (
                      can("decisions.record") && (
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
                          className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[12px] font-medium text-fg/80 transition-colors hover:border-transparent hover:bg-night hover:text-white"
                        >
                          Arbitrer
                        </button>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-[13px] text-muted">Aucun arbitrage en attente.</p>
          )}
        </Bento>

        {/* 4. L'assistant : il lit, résume et propose ; la DG décide */}
        <Bento
          className="md:col-span-6 xl:col-span-3 xl:row-span-2"
          title="Assistant IA"
          action={<Sparkles className="size-4 text-ai-fg" />}
        >
          <div className="flex h-full flex-col px-5 pb-5">
            <div className="rounded-xl bg-ai-soft p-4">
              <p className="text-[12px] font-medium text-ai-fg">Point de situation</p>
              <ul className="mt-2 space-y-2 text-[12.5px] leading-snug text-fg/85">
                {o.brief.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="mt-[6px] size-1.5 shrink-0 rounded-full bg-ai" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-[12px] font-medium text-muted">Demander</p>
            <div className="mt-2 flex flex-col gap-2">
              {[
                [
                  "Résumer la semaine",
                  "Résume la semaine de la Direction générale : faits marquants, retards et décisions attendues.",
                ],
                ["Proposer les priorités", "Quelles sont les trois priorités de la DG cette semaine, et pourquoi ?"],
                [
                  "Préparer le comité",
                  "Prépare l'ordre du jour du prochain comité de direction à partir des dossiers en cours.",
                ],
              ].map(([l, p]) => (
                <button
                  key={l}
                  onClick={() => shell.openAssistant(p)}
                  className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2 text-left text-[12.5px] font-medium transition-colors hover:border-ai-line hover:bg-ai-soft"
                >
                  {l}
                  <ArrowUpRight className="size-3.5 text-faint" />
                </button>
              ))}
            </div>
            <button
              onClick={() => shell.openAssistant()}
              className="mt-auto flex h-10 items-center gap-2 rounded-[10px] border border-line-strong px-3 pt-0 text-left text-[12.5px] text-faint transition-colors hover:border-ai-line"
              style={{ marginTop: "1rem" }}
            >
              <Sparkles className="size-3.5 text-ai-fg" />
              Poser une question…
            </button>
            <p className="mt-2 text-[11px] text-faint">L'assistant propose ; vous décidez.</p>
          </div>
        </Bento>

        {/* 5. La semaine de la DG : graphique et prochains rendez-vous dans la même carte */}
        <Bento
          className="md:col-span-6 xl:col-span-5"
          title="Agenda de la semaine"
          action={<CircleAction to="/activites" label="Tout l'agenda" />}
        >
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div>
              <p className="flex items-baseline gap-2">
                <span className="text-[28px] font-semibold leading-none tracking-[-0.03em]">
                  <CountUp value={o.agenda.length} />
                </span>
                <span className="text-[12.5px] text-muted">rendez-vous sur 7 jours</span>
              </p>
              <div className="relative mt-4 h-[124px]">
                <div aria-hidden className="absolute inset-x-0 bottom-6 top-0">
                  {[0, 1, 2].map((g) => (
                    <span
                      key={g}
                      className="absolute inset-x-0 border-t border-dashed border-line"
                      style={{ bottom: `${(g / 2) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="relative flex h-full items-end gap-2">
                  {week.map((w) => (
                    <button
                      key={w.key}
                      onClick={() => setDay(day === w.key ? null : w.key)}
                      title={`${format(w.d, "EEEE d MMMM", { locale: fr })} : ${w.n}`}
                      className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                    >
                      <span className="flex min-h-0 w-full flex-1 items-end justify-center">
                        <span
                          className={cn(
                            "bar-rise w-full max-w-[22px] rounded-t-[6px] rounded-b-[2px]",
                            w.n === 0 && "hatch",
                            day === w.key && "ring-2 ring-[var(--ring)]",
                          )}
                          style={{
                            height: `${w.n ? Math.max(14, (w.n / peak) * 100) : 6}%`,
                            background: w.n
                              ? w.key === busiest.key
                                ? "var(--primary)"
                                : "color-mix(in oklab, var(--primary) 30%, var(--panel))"
                              : undefined,
                          }}
                        />
                      </span>
                      <span
                        className={cn(
                          "mt-1.5 h-4 text-[11px] capitalize",
                          w.key === o.today ? "font-semibold text-fg" : "text-muted",
                        )}
                      >
                        {format(w.d, "EEEEE", { locale: fr })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <ul className="space-y-1.5 self-start">
              {dayList.length ? (
                dayList.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={a.href}
                      className="flex items-center gap-3 rounded-[10px] bg-bg/70 px-3 py-2 transition-colors hover:bg-hover"
                    >
                      <span className="w-8 shrink-0 text-center leading-none">
                        <span className="block text-[15px] font-semibold">{format(parseISO(a.date), "d")}</span>
                        <span className="text-[10px] uppercase text-faint">
                          {format(parseISO(a.date), "MMM", { locale: fr })}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium">{a.title}</span>
                        <span className="text-[11.5px] text-muted">
                          {a.form === "reunion" ? "Réunion" : form(a.form).label}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-1 py-2 text-[12.5px] text-muted">Rien de prévu ce jour-là.</li>
              )}
              {day && (
                <li>
                  <button
                    onClick={() => setDay(null)}
                    className="px-1 text-[12px] font-medium text-primary hover:underline"
                  >
                    Toute la semaine
                  </button>
                </li>
              )}
            </ul>
          </div>
        </Bento>

        {/* 6. Priorités */}
        <Bento
          className="md:col-span-6 xl:col-span-4"
          title="À suivre en priorité"
          action={
            <Link
              to="/activites"
              className="inline-flex items-center gap-0.5 text-[12px] font-medium text-muted hover:text-fg"
            >
              Tout voir <ChevronRight className="size-3.5" />
            </Link>
          }
        >
          <ul className="px-2 pb-3">
            {priorities.map((i) => {
              const late = isLate(i.next_due, o.today);
              return (
                <li key={i.id}>
                  <Link
                    to={i.href}
                    className="flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors hover:bg-hover"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: HEALTH[i.health].color }}
                      title={HEALTH[i.health].label}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{i.title}</span>
                      <span className="block truncate text-[11.5px] text-muted">
                        {HEALTH[i.health].label} · {form(i.form).label}
                      </span>
                    </span>
                    <span className={cn("text-[12px] tabular", late ? "font-medium text-danger" : "text-muted")}>
                      {frDate(i.next_due).slice(0, 5)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Bento>

        {/* 7. Suivi-évaluation */}
        <Bento
          className="md:col-span-3 xl:col-span-7"
          title="Indicateurs stratégiques"
          action={<Target className="size-4 text-faint" />}
        >
          <ul className="grid gap-x-8 gap-y-4 px-5 pb-5 pt-1 sm:grid-cols-2">
            {[
              ...o.indicators.map((i) => ({
                id: i.id,
                name: i.name,
                value: `${i.result} / ${i.target} ${i.unit_label}`,
                pct:
                  // Vaut aussi pour un indicateur qui doit baisser (délai, coût) : cible sous la situation de départ
                  i.target !== i.baseline
                    ? Math.max(0, Math.min(100, ((i.result - i.baseline) / (i.target - i.baseline)) * 100))
                    : i.result === i.target
                      ? 100
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
                  <span className="text-[13px] font-semibold tabular">{Math.round(i.pct)}%</span>
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-hover">
                  <div className="bar-fill h-full rounded-full bg-primary" style={{ width: `${i.pct}%` }} />
                </div>
                <p className="mt-1 truncate text-[11.5px] tabular text-faint">{i.value}</p>
              </li>
            ))}
          </ul>
        </Bento>

        {/* 8. Risques */}
        <Bento
          className="md:col-span-3 xl:col-span-5"
          title="Risques majeurs"
          action={<ShieldAlert className="size-4 text-faint" />}
        >
          {o.risks.length ? (
            <ul className="px-2 pb-3">
              {o.risks.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-[10px] px-3 py-2">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-semibold tabular",
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
                    <span className="block truncate text-[13px] font-medium">{r.title}</span>
                    <span className="block truncate text-[11.5px] text-muted">
                      {r.owner_name ?? "Sans responsable"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-[13px] text-muted">Aucun risque majeur ouvert.</p>
          )}
        </Bento>
      </div>
      {arbitrating && <DecisionDialog source={arbitrating} onClose={() => setArbitrating(null)} />}
    </div>
  );
}

const rank = (i: Item) =>
  ({ off_track: 0, at_risk: 1, on_track: 2, done: 3 })[i.health] - (i.decision_needed ? 0.5 : 0);
/** Détail des retards en une ligne : « 2 tâches, 1 livrable, 1 courrier ». */
const LATE_LABEL: Record<string, [string, string]> = {
  taches_et_suites: ["tâche ou suite", "tâches ou suites"],
  recommandations: ["recommandation", "recommandations"],
  livrables: ["livrable", "livrables"],
  activites_plan: ["activité de plan", "activités de plan"],
  courrier: ["courrier", "courriers"],
  decisions: ["décision à exécuter", "décisions à exécuter"],
};
const lateFoot = (detail: Record<string, number> | undefined, items: number) => {
  const parts = Object.entries(detail ?? {})
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${LATE_LABEL[k]?.[n > 1 ? 1 : 0] ?? k}`);
  return parts.length ? parts.slice(0, 2).join(", ") + (parts.length > 2 ? "…" : "") : `${items} activité concernée`;
};
const rate = (r: { open: number; done: number }) =>
  r.open + r.done ? Math.round((r.done / (r.open + r.done)) * 100) : 0;

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

/** Carte de la grille bento : même rayon, même filet, même en-tête partout. */
function Bento({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border border-line bg-panel", className)}>
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">{title}</h2>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

/** Chiffre qui appelle une action : carré d'icône pastel, chiffre, pastille d'état (modèles Pivot, VantaRisk). */
function Stat({
  Icon,
  tile,
  label,
  value,
  foot,
  tone,
  to,
  className,
}: {
  Icon: LucideIcon;
  tile: string;
  label: string;
  value: number;
  foot: string;
  tone?: "good" | "warn" | "bad";
  to?: string;
  className?: string;
}) {
  const body = (
    <>
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", tile)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] text-muted">{label}</span>
        <span className="mt-0.5 flex items-baseline gap-2">
          <span className="text-[26px] font-semibold leading-none tracking-[-0.03em] tabular">
            <CountUp value={value} />
          </span>
        </span>
        <span
          className={cn(
            "mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
            tone === "good" && "bg-success-soft text-success",
            tone === "warn" && "bg-warning-soft text-warning",
            tone === "bad" && "bg-danger-soft text-danger",
            !tone && "bg-hover text-muted",
          )}
        >
          {tone === "bad" && <span className="pulse-dot size-1.5 rounded-full bg-current" />}
          {foot}
        </span>
      </span>
      {to && <ArrowUpRight className="size-4 shrink-0 self-start text-faint transition-colors group-hover:text-fg" />}
    </>
  );
  const cls = cn("group flex min-w-0 items-center gap-4 rounded-2xl border border-line bg-panel p-4", className);
  return to ? (
    <Link to={to} className={cn(cls, "transition-colors hover:border-line-strong")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
