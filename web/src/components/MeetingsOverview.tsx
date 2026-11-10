import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { useNavigate } from "react-router";
import { cn, IconButton } from "./ui";
import { CountUp, Section } from "./gov";

export interface CalendarMeeting {
  id: string;
  meeting_type: string;
  meeting_date: string;
  start_time?: string | null;
  location: string;
  status: "planned" | "held" | "validated" | "cancelled";
}
const key = (d: Date) => format(d, "yyyy-MM-dd");
const WEEK = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
type Kind = "late" | "upcoming" | "done";

/** Ce qui demande attention en premier : calendrier du mois, réunions en retard de compte rendu, réunions à venir. */
export function MeetingsOverview({ rows }: { rows: CalendarMeeting[] }) {
  const nav = useNavigate();
  const today = key(new Date());
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [day, setDay] = useState<string | null>(null);
  const kindOf = (m: CalendarMeeting): Kind =>
    m.status === "validated" ? "done" : m.meeting_date < today ? "late" : "upcoming";
  const live = useMemo(() => rows.filter((m) => m.status !== "cancelled"), [rows]);
  const late = live.filter((m) => kindOf(m) === "late").sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
  const upcoming = live
    .filter((m) => kindOf(m) === "upcoming")
    .sort((a, b) => (a.meeting_date + (a.start_time ?? "")).localeCompare(b.meeting_date + (b.start_time ?? "")));
  const thisMonth = key(new Date()).slice(0, 7);
  const validated = live.filter((m) => m.status === "validated" && m.meeting_date.slice(0, 7) === thisMonth).length;
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarMeeting[]>();
    for (const m of live) map.set(m.meeting_date, [...(map.get(m.meeting_date) ?? []), m]);
    return map;
  }, [live]);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const selected = day ? (byDay.get(day) ?? []) : null;
  const dotColor: Record<Kind, string> = { late: "var(--danger)", upcoming: "var(--primary)", done: "var(--success)" };

  const row = (m: CalendarMeeting) => {
    const d = parseISO(m.meeting_date);
    const k = kindOf(m);
    return (
      <button
        key={m.id}
        onClick={() => nav(`/reunions/${m.id}`)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-hover"
      >
        <span
          className={cn(
            "flex w-11 shrink-0 flex-col items-center rounded-lg border py-1",
            k === "late" ? "border-danger/25 bg-danger-soft text-danger" : "border-line bg-bg text-fg",
          )}
        >
          <span className="font-serif text-[20px] leading-none">{format(d, "d")}</span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wide opacity-75">
            {format(d, "MMM", { locale: fr })}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium">{m.meeting_type}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-muted">
            {k === "late" ? (
              <span className="font-medium text-danger">
                {m.status === "planned" ? "Compte rendu non établi" : "Compte rendu à valider"}
              </span>
            ) : (
              m.start_time && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {m.start_time.replace(":", " h ")}
                </span>
              )
            )}
            {m.location && (
              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{m.location}</span>
              </span>
            )}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="mx-auto grid w-full max-w-[1240px] gap-4 px-4 pb-2 sm:px-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <Section>
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-[22px] capitalize leading-none">
              {format(month, "MMMM yyyy", { locale: fr })}
            </h2>
            <div className="flex items-center gap-0.5">
              <IconButton label="Mois précédent" onClick={() => setMonth(addMonths(month, -1))}>
                <ChevronLeft className="size-4" />
              </IconButton>
              <button
                onClick={() => {
                  setMonth(startOfMonth(new Date()));
                  setDay(null);
                }}
                className="rounded-md px-2 py-1 text-[12px] font-medium text-muted hover:bg-hover hover:text-fg"
              >
                Aujourd'hui
              </button>
              <IconButton label="Mois suivant" onClick={() => setMonth(addMonths(month, 1))}>
                <ChevronRight className="size-4" />
              </IconButton>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] uppercase tracking-wide text-faint">
            {WEEK.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((d) => {
              const k = key(d);
              const events = byDay.get(k) ?? [];
              const isToday = k === today;
              const active = k === day;
              return (
                <button
                  key={k}
                  aria-label={`${format(d, "d MMMM", { locale: fr })}, ${events.length} réunion${events.length > 1 ? "s" : ""}`}
                  aria-pressed={active}
                  onClick={() => setDay(active ? null : k)}
                  className={cn(
                    "relative mx-auto flex size-10 flex-col items-center justify-center rounded-lg text-[13px] tabular transition-colors",
                    !isSameMonth(d, month) && "text-faint/60",
                    active ? "bg-brand-soft font-semibold text-primary" : "hover:bg-hover",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full",
                      isToday && "bg-primary font-semibold text-on-primary",
                    )}
                  >
                    {format(d, "d")}
                  </span>
                  <span className="absolute bottom-0.5 flex gap-0.5">
                    {events.slice(0, 3).map((m) => (
                      <span key={m.id} className="size-1 rounded-full" style={{ background: dotColor[kindOf(m)] }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-[11.5px] text-muted">
            <Legend color={dotColor.upcoming} label="À venir" />
            <Legend color={dotColor.late} label="En retard" />
            <Legend color={dotColor.done} label="Validé" />
          </div>
        </div>
      </Section>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Tile label="À venir" value={upcoming.length} />
          <Tile label="En retard" value={late.length} danger={late.length > 0} />
          <Tile label="Validés ce mois" value={validated} />
        </div>
        <Section className="flex-1">
          {selected ? (
            <div className="p-3">
              <ListTitle
                title={format(parseISO(day!), "EEEE d MMMM", { locale: fr })}
                action={
                  <button className="text-[12px] font-medium text-primary hover:underline" onClick={() => setDay(null)}>
                    Tout afficher
                  </button>
                }
              />
              {selected.length ? (
                selected.map(row)
              ) : (
                <p className="px-2 py-3 text-[13px] text-muted">Aucune réunion ce jour-là.</p>
              )}
            </div>
          ) : (
            <div className="grid divide-line md:grid-cols-2 md:divide-x">
              <div className="p-3">
                <ListTitle title="En retard" icon={late.length > 0} count={late.length} />
                {late.length ? (
                  late.slice(0, 5).map(row)
                ) : (
                  <p className="px-2 py-3 text-[13px] text-muted">Aucun compte rendu en retard.</p>
                )}
              </div>
              <div className="p-3">
                <ListTitle title="À venir" count={upcoming.length} />
                {upcoming.length ? (
                  upcoming.slice(0, 5).map(row)
                ) : (
                  <p className="px-2 py-3 text-[13px] text-muted">Aucune réunion planifiée.</p>
                )}
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="size-1.5 rounded-full" style={{ background: color }} />
    {label}
  </span>
);
const Tile = ({ label, value, danger }: { label: string; value: number; danger?: boolean }) => (
  <div className="rounded-xl border border-line bg-panel px-4 py-3 shadow-sm">
    <p className="text-[11.5px] text-muted">{label}</p>
    <p className={cn("mt-0.5 font-serif text-[32px] leading-none", danger && "text-danger")}>
      <CountUp value={value} />
    </p>
  </div>
);
function ListTitle({
  title,
  count,
  icon,
  action,
}: {
  title: string;
  count?: number;
  icon?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-1 flex items-center justify-between px-2 py-1">
      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold first-letter:uppercase">
        {icon && <AlertTriangle className="size-3.5 text-danger" />}
        {title}
        {!!count && <span className="font-normal text-faint">{count}</span>}
      </h3>
      {action}
    </div>
  );
}
