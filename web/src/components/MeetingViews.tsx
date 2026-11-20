import { pl } from "@/lib/format";
import { DOCUMENT_FORMATS, ExportMenu, tableDoc } from "@/components/export-menu";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays, addMonths, format, parseISO, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Hash,
  ListChecks,
  XCircle,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  List,
  Lock,
  MapPin,
  UserRound,
  Users,
} from "lucide-react";
import { Empty, cn } from "./ui";
import { LoadingRows } from "./gov";
import {
  Badge,
  type BadgeTone,
  BoardColumn,
  type CalEvent,
  CheckOption,
  CollectionHeader,
  type Column,
  FilterGroup,
  FilterPanel,
  FilterToggle,
  GroupedTable,
  MiniMonth,
  MonthGrid,
  Prop,
  RoundBtn,
  SearchField,
  Seal,
  TabLink,
  TimeGrid,
  ViewSwitch,
  hhmm,
  useLocalPref,
  weekOf,
} from "./collection";
import { Topo } from "./territory";
import { api } from "@/lib/api";
import type { MeetingDetail, MeetingRow } from "@/pages/Meetings";

/* Réunions en trois vues (Liste, Tableau, Calendrier) sur le gabarit « Collection » du système Cadastre. */

export type Stage = "a_venir" | "a_etablir" | "a_valider" | "valide" | "annulee";
export const STAGES: Stage[] = ["a_venir", "a_etablir", "a_valider", "valide", "annulee"];
export const STAGE: Record<Stage, { label: string; tone: BadgeTone; hue: string; hint: string }> = {
  a_venir: {
    label: "À venir",
    tone: "primary",
    hue: "var(--primary)",
    hint: "Réunion planifiée dont la date n'est pas passée",
  },
  a_etablir: {
    label: "Compte rendu à établir",
    tone: "danger",
    hue: "var(--danger)",
    hint: "Séance passée : le rédacteur établit le compte rendu puis le soumet",
  },
  a_valider: {
    label: "Soumis à validation",
    tone: "warning",
    hue: "var(--warning)",
    hint: "Compte rendu soumis par le rédacteur, en attente de la présidence de séance",
  },
  valide: {
    label: "Validé",
    tone: "success",
    hue: "var(--success)",
    hint: "Compte rendu figé, exportable au modèle officiel",
  },
  annulee: { label: "Annulée", tone: "neutral", hue: "var(--faint)", hint: "Réunion qui n'a pas eu lieu" },
};
const STAGE_ICON: Record<Stage, typeof CircleDot> = {
  a_venir: CircleDot,
  a_etablir: AlertCircle,
  a_valider: CircleDashed,
  valide: CheckCircle2,
  annulee: XCircle,
};
const today = () => format(new Date(), "yyyy-MM-dd");
export const stageOf = (m: MeetingRow, t = today()): Stage =>
  m.status === "cancelled"
    ? "annulee"
    : m.status === "validated"
      ? "valide"
      : m.status === "submitted"
        ? "a_valider"
        : m.status === "held" || m.meeting_date < t
          ? "a_etablir"
          : "a_venir";
const when = (m: MeetingRow) => `${m.meeting_date}${m.start_time ?? ""}`;
/** Majuscule au premier mot seulement, à la française : « Mer. 18 nov. 2026 ». */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (d: string | Date, p: string) => cap(format(typeof d === "string" ? parseISO(d) : d, p, { locale: fr }));
const span = (m: { start_time?: string | null; end_time?: string | null }) =>
  m.start_time ? `${hhmm(m.start_time)}${m.end_time ? ` – ${hhmm(m.end_time)}` : ""}` : "Horaire à préciser";

type View = "liste" | "tableau" | "calendrier" | "actions" | "mine";
type Period = "toutes" | "mois" | "futur" | "passe";

export function MeetingsBrowser({
  rows,
  isLoading,
  primary,
  renderActions,
}: {
  rows: MeetingRow[];
  isLoading: boolean;
  primary: ReactNode;
  renderActions: (mine: boolean) => ReactNode;
}) {
  const [view, setView] = useLocalPref<View>("anat.reunions.vue", "liste");
  const meetingsView = view === "liste" || view === "tableau" || view === "calendrier";
  const [panel, setPanel] = useLocalPref<"1" | "0">("anat.reunions.filtres", "0");
  const [q, setQ] = useState("");
  const [stages, setStages] = useState<Set<Stage>>(new Set());
  const [period, setPeriod] = useState<Period>("toutes");
  const [confOnly, setConfOnly] = useState(false);
  const [writer, setWriter] = useState("");
  const t = today();

  const counts = useMemo(() => {
    const c = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
    for (const m of rows) c[stageOf(m, t)]++;
    return c;
  }, [rows, t]);
  const writers = useMemo(() => [...new Set(rows.map((m) => m.writer_name).filter(Boolean))].sort(), [rows]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((m) => {
      if (stages.size && !stages.has(stageOf(m, t))) return false;
      if (period === "mois" && m.meeting_date.slice(0, 7) !== t.slice(0, 7)) return false;
      if (period === "futur" && m.meeting_date < t) return false;
      if (period === "passe" && m.meeting_date >= t) return false;
      if (confOnly && !m.confidential) return false;
      if (writer && m.writer_name !== writer) return false;
      if (needle && ![m.meeting_type, m.reference, m.location, m.writer_name].join(" ").toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [rows, stages, period, confOnly, writer, q, t]);
  const active = stages.size + (period !== "toutes" ? 1 : 0) + (confOnly ? 1 : 0) + (writer ? 1 : 0);
  const clear = () => {
    setStages(new Set());
    setPeriod("toutes");
    setConfOnly(false);
    setWriter("");
    setQ("");
  };
  const toggleStage = (s: Stage) => {
    const n = new Set(stages);
    if (n.has(s)) n.delete(s);
    else n.add(s);
    setStages(n);
  };

  return (
    <div className="space-y-5">
      <CollectionHeader
        Icon={CalendarDays}
        crumbs={["Pilotage", "Réunions"]}
        title="Réunions"
        count={rows.length}
        unit={["réunion", "réunions"]}
        subtitle="Chaque réunion produit un compte rendu officiel, et chaque recommandation reste suivie jusqu'à sa clôture."
        actions={primary}
        tabs={
          <>
            <TabLink on={view === "liste"} onClick={() => setView("liste")} Icon={List}>
              Liste
            </TabLink>
            <TabLink on={view === "tableau"} onClick={() => setView("tableau")} Icon={Columns3}>
              Tableau
            </TabLink>
            <TabLink on={view === "calendrier"} onClick={() => setView("calendrier")} Icon={CalendarDays}>
              Calendrier
            </TabLink>
            <span aria-hidden className="mx-2 my-3 w-px bg-line" />
            <TabLink on={view === "actions"} onClick={() => setView("actions")} Icon={ListChecks}>
              Recommandations
            </TabLink>
            <TabLink on={view === "mine"} onClick={() => setView("mine")} Icon={UserRound}>
              Les miennes
            </TabLink>
          </>
        }
        tools={
          meetingsView && (
            <>
              <SearchField value={q} onChange={setQ} placeholder="Rechercher…" className="w-56" />
              <FilterToggle open={panel === "1"} count={active} onClick={() => setPanel(panel === "1" ? "0" : "1")} />
            </>
          )
        }
      />

      {!meetingsView ? (
        renderActions(view === "mine")
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          {panel === "1" && (
            <FilterPanel active={active} onClear={clear}>
              <FilterGroup title="Étape">
                {STAGES.map((s) => (
                  <CheckOption
                    key={s}
                    checked={stages.has(s)}
                    onChange={() => toggleStage(s)}
                    label={STAGE[s].label}
                    color={STAGE[s].hue}
                    count={counts[s]}
                  />
                ))}
              </FilterGroup>
              <FilterGroup title="Période">
                {(
                  [
                    ["toutes", "Toutes les dates"],
                    ["mois", "Ce mois-ci"],
                    ["futur", "À venir"],
                    ["passe", "Passées"],
                  ] as [Period, string][]
                ).map(([id, l]) => (
                  <CheckOption key={id} type="radio" checked={period === id} onChange={() => setPeriod(id)} label={l} />
                ))}
              </FilterGroup>
              <FilterGroup title="Rédaction">
                <CheckOption
                  checked={confOnly}
                  onChange={() => setConfOnly(!confOnly)}
                  label="Confidentielles uniquement"
                />
                <select
                  aria-label="Rédacteur"
                  value={writer}
                  onChange={(e) => setWriter(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-line-strong bg-panel px-3 text-[13px] outline-none"
                >
                  <option value="">Tous les rédacteurs</option>
                  {writers.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </FilterGroup>
            </FilterPanel>
          )}
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <LoadingRows />
            ) : view === "liste" ? (
              <ListView rows={filtered} filtered={active > 0 || !!q} onClear={clear} />
            ) : view === "tableau" ? (
              <BoardView rows={filtered} />
            ) : (
              <CalendarView rows={filtered} stages={stages} counts={counts} toggleStage={toggleStage} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Liste
function MeetingMark({ m }: { m: MeetingRow }) {
  const hue = STAGE[stageOf(m)].hue;
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full"
      style={{ color: hue, background: `color-mix(in oklab, ${hue} 12%, transparent)` }}
    >
      <Users className="size-4" />
    </span>
  );
}
const Initials = ({ name }: { name: string }) => (
  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10.5px] font-semibold text-primary">
    {name
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()}
  </span>
);

function ListView({ rows, filtered, onClear }: { rows: MeetingRow[]; filtered: boolean; onClear: () => void }) {
  const nav = useNavigate();
  const columns: (Column<MeetingRow> & { Icon?: typeof Users; width?: string })[] = [
    {
      key: "titre",
      label: "Réunion",
      Icon: Users,
      width: "24%",
      render: (m) => (
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          <span className="truncate">{m.meeting_type}</span>
          {m.confidential && <Lock aria-label="Confidentielle" className="size-3 shrink-0 text-warning" />}
        </span>
      ),
    },
    {
      key: "numero",
      label: "Numéro",
      Icon: Hash,
      width: "18%",
      render: (m) => <Seal>{m.reference}</Seal>,
    },
    {
      key: "date",
      label: "Date",
      Icon: CalendarDays,
      width: "11%",
      render: (m) => <span className="whitespace-nowrap">{fmt(m.meeting_date, "d MMM yyyy")}</span>,
    },
    {
      key: "heure",
      label: "Horaire",
      Icon: Clock,
      width: "9%",
      render: (m) => <span className="whitespace-nowrap text-muted">{m.start_time ? hhmm(m.start_time) : "—"}</span>,
    },
    {
      key: "lieu",
      label: "Lieu",
      Icon: MapPin,
      width: "12%",
      render: (m) => <span className="text-muted">{m.location || "—"}</span>,
    },
    {
      key: "redacteur",
      label: "Rédacteur",
      Icon: UserRound,
      width: "10%",
      render: (m) => (
        <span title={m.writer_name}>
          <Initials name={m.writer_name || "?"} />
        </span>
      ),
    },
    {
      key: "recos",
      label: "Suivi",
      Icon: ListChecks,
      width: "8%",
      render: (m) =>
        m.action_count ? (
          <span
            title={`${m.open_actions} ${pl(m.open_actions, "recommandation(s) ouverte(s)")} sur ${m.action_count}`}
            className={cn(
              "inline-flex h-[22px] items-center gap-1 rounded-md px-1.5 text-[11.5px] font-medium tabular",
              m.open_actions ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
            )}
          >
            <ListChecks className="size-3" />
            {m.action_count - m.open_actions}/{m.action_count}
          </span>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
  ];
  const sorted = [...rows].sort((a, b) => when(b).localeCompare(when(a)));
  return (
    <GroupedTable
      storageKey="anat.reunions.groupes"
      groups={STAGES.map((s) => ({
        id: s,
        label: STAGE[s].label,
        hue: STAGE[s].hue,
        Icon: STAGE_ICON[s],
        hint: STAGE[s].hint,
        rows:
          s === "a_venir"
            ? [...sorted].reverse().filter((m) => stageOf(m) === s)
            : sorted.filter((m) => stageOf(m) === s),
      }))}
      columns={columns}
      rowKey={(m) => m.id}
      onOpen={(m) => nav(`/reunions/${m.id}`)}
      rowHref={(m) => `/reunions/${m.id}`}
      rowRef={(m) => m.reference ?? undefined}
      actions={(m) => (
        <>
          <ExportMenu
            compact
            label="Exporter le compte rendu"
            formats={DOCUMENT_FORMATS}
            href={(f) => `/api/meetings/${m.id}/report?format=${f}`}
          />
          <RoundBtn label="Ouvrir le compte rendu" onClick={() => nav(`/reunions/${m.id}`)}>
            <ArrowUpRight className="size-3.5" />
          </RoundBtn>
        </>
      )}
      bulk={(sel) => <ExportMenu size="sm" label="Exporter la sélection" build={() => selectionDoc(sel)} />}
      empty={
        filtered ? (
          <Empty title="Aucune réunion ne correspond à ces filtres.">
            <button onClick={onClear} className="font-medium text-primary hover:underline">
              Effacer les filtres
            </button>
          </Empty>
        ) : (
          <Empty title="Aucune réunion enregistrée">Planifiez la première avec « Nouvelle réunion ».</Empty>
        )
      }
    />
  );
}

/** La sélection, en registre exportable (Excel, PDF, Word, CSV). Données de la sélection seulement. */
function selectionDoc(rows: MeetingRow[]) {
  const head = [
    "Numéro",
    "Réunion",
    "Date",
    "Début",
    "Fin",
    "Lieu",
    "Rédacteur",
    "Étape",
    "Recommandations ouvertes",
    "Recommandations",
  ];
  return tableDoc(
    "Réunions",
    head,
    rows.map((m) => [
      m.reference,
      m.meeting_type,
      m.meeting_date,
      m.start_time ?? "",
      m.end_time ?? "",
      m.location,
      m.writer_name,
      STAGE[stageOf(m)].label,
      m.open_actions,
      m.action_count,
    ]),
    { filename: `reunions-${today()}`, widths: [3, 3, 1.5, 1, 1, 2, 2, 1.5, 1.5, 1.5] },
  );
}

// ------------------------------------------------------------------ Tableau (kanban par étape)
function BoardView({ rows }: { rows: MeetingRow[] }) {
  const nav = useNavigate();
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-3">
      <div className="flex gap-3">
        {STAGES.map((s) => {
          const list = rows
            .filter((m) => stageOf(m) === s)
            .sort((a, b) => (s === "a_venir" ? when(a).localeCompare(when(b)) : when(b).localeCompare(when(a))));
          return (
            <BoardColumn key={s} title={STAGE[s].label} tone={STAGE[s].tone} count={list.length} hint={STAGE[s].hint}>
              {list.map((m) => (
                <button
                  key={m.id}
                  onClick={() => nav(`/reunions/${m.id}`)}
                  className="card-hover rounded-xl border border-line bg-panel p-3.5 text-left shadow-sm"
                >
                  <span className="flex items-start gap-2.5">
                    <MeetingMark m={m} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13.5px] font-semibold leading-snug">
                        <span className="line-clamp-2">{m.meeting_type}</span>
                        {m.confidential && (
                          <Lock aria-label="Confidentielle" className="size-3 shrink-0 text-warning" />
                        )}
                      </span>
                      <Seal>{m.reference}</Seal>
                    </span>
                  </span>
                  <span className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                    <Prop label="Date" Icon={CalendarDays}>
                      {fmt(m.meeting_date, "EEE d MMM")}
                    </Prop>
                    <Prop label="Horaire" Icon={Clock}>
                      {m.start_time ? hhmm(m.start_time) : "—"}
                    </Prop>
                    <Prop label="Lieu" Icon={MapPin}>
                      {m.location || "—"}
                    </Prop>
                    <Prop label="Rédacteur" Icon={UserRound}>
                      {m.writer_name || "—"}
                    </Prop>
                  </span>
                  {m.action_count > 0 && (
                    <span className="mt-3 block border-t border-line pt-2.5">
                      <span className="flex justify-between text-[11.5px] text-muted">
                        Recommandations
                        <span className="tabular">
                          {m.action_count - m.open_actions} / {m.action_count} réalisées
                        </span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-hover">
                        <span
                          className="block h-full rounded-full bg-success"
                          style={{ width: `${((m.action_count - m.open_actions) / m.action_count) * 100}%` }}
                        />
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </BoardColumn>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Calendrier
type Mode = "jour" | "semaine" | "mois";
function CalendarView({
  rows,
  stages,
  counts,
  toggleStage,
}: {
  rows: MeetingRow[];
  stages: Set<Stage>;
  counts: Record<Stage, number>;
  toggleStage: (s: Stage) => void;
}) {
  const [mode, setMode] = useLocalPref<Mode>("anat.reunions.calendrier", "semaine");
  const [cursor, setCursor] = useState(() => new Date());
  const t = today();
  const upcoming = useMemo(
    () => rows.filter((m) => stageOf(m) === "a_venir").sort((a, b) => when(a).localeCompare(when(b))),
    [rows],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? upcoming[0]?.id ?? null;
  const events: CalEvent[] = rows.map((m) => ({
    id: m.id,
    date: m.meeting_date,
    start: m.start_time,
    end: m.end_time,
    title: m.meeting_type,
    subtitle: m.location,
    hue: STAGE[stageOf(m, t)].hue,
    muted: m.status === "cancelled",
  }));
  const week = weekOf(cursor);
  const weekendBusy = events.some(
    (e) => e.date === format(week[5], "yyyy-MM-dd") || e.date === format(week[6], "yyyy-MM-dd"),
  );
  const days = mode === "jour" ? [cursor] : weekendBusy ? week : week.slice(0, 5);
  const step = (n: number) =>
    setCursor(mode === "mois" ? addMonths(cursor, n) : addDays(cursor, mode === "jour" ? n : 7 * n));
  const title =
    mode === "jour"
      ? fmt(cursor, "EEEE d MMMM yyyy")
      : mode === "mois"
        ? fmt(cursor, "MMMM yyyy")
        : `${format(week[0], "d")} – ${format(week[6], "d MMMM yyyy", { locale: fr })}`;
  const pick = (e: CalEvent) => setPicked(e.id);
  const next = upcoming[0];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[260px_minmax(0,1fr)_320px]">
      <div className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-3 2xl:col-span-1 2xl:grid-cols-1">
        <MiniMonth
          value={cursor}
          onPick={setCursor}
          marks={new Set(rows.map((m) => m.meeting_date))}
          range={mode === "semaine" ? [week[0], week[6]] : undefined}
        />
        <div className="hero-night relative isolate overflow-hidden rounded-2xl p-5 shadow-md">
          <Topo
            peaks={[{ x: 230, y: 10, rings: 9, seed: 2.7, r0: 10, step: 16 }]}
            width={260}
            height={200}
            className="absolute inset-0 -z-10 size-full text-[#8CCBF2] opacity-[0.22]"
          />
          <p className="text-[12px] font-medium text-[#8CCBF2]">Prochaine réunion</p>
          {next ? (
            <>
              <p className="mt-1 text-[19px] font-semibold leading-snug tracking-[-0.02em]">{next.meeting_type}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-white/75">
                <Clock className="size-3.5" />
                {fmt(next.meeting_date, "EEE d MMM")} · {span(next)}
              </p>
              {next.location && (
                <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-white/75">
                  <MapPin className="size-3.5" />
                  {next.location}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setCursor(parseISO(next.meeting_date));
                    setPicked(next.id);
                  }}
                  className="h-9 flex-1 rounded-[10px] border border-white/25 text-[12.5px] font-medium hover:bg-white/10"
                >
                  Situer
                </button>
                <a
                  href={`/reunions/${next.id}`}
                  className="flex h-9 flex-1 items-center justify-center rounded-[10px] bg-white text-[12.5px] font-semibold text-[#0B2A45]"
                >
                  Ouvrir
                </a>
              </div>
            </>
          ) : (
            <p className="mt-2 text-[13px] text-white/75">
              Aucune réunion planifiée. Créez-en une avec « Nouvelle réunion ».
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-panel p-3 shadow-sm">
          <p className="px-2 pb-1 pt-1 text-[15px] font-semibold">Étapes affichées</p>
          {STAGES.map((s) => (
            <CheckOption
              key={s}
              checked={!stages.size || stages.has(s)}
              onChange={() => toggleStage(s)}
              label={STAGE[s].label}
              color={STAGE[s].hue}
              count={counts[s]}
            />
          ))}
        </div>
      </div>

      <section className="min-w-0 rounded-2xl border border-line bg-panel p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <RoundBtn label="Période précédente" onClick={() => step(-1)}>
              <ChevronLeft className="size-4" />
            </RoundBtn>
            <h2 className="px-2 text-[19px] font-semibold tracking-[-0.02em]">{title}</h2>
            <RoundBtn label="Période suivante" onClick={() => step(1)}>
              <ChevronRight className="size-4" />
            </RoundBtn>
            <button
              onClick={() => setCursor(new Date())}
              className="ml-1 h-8 rounded-lg border border-line-strong px-3 text-[12.5px] font-medium hover:bg-hover"
            >
              Aujourd'hui
            </button>
          </div>
          <ViewSwitch
            label="Période"
            value={mode}
            onChange={setMode}
            items={[
              { id: "jour", label: "Jour" },
              { id: "semaine", label: "Semaine" },
              { id: "mois", label: "Mois" },
            ]}
          />
        </div>
        {mode === "mois" ? (
          <MonthGrid month={startOfMonth(cursor)} events={events} onSelect={pick} selected={selected} />
        ) : (
          <TimeGrid days={days} events={events} onSelect={pick} selected={selected} />
        )}
      </section>

      <MeetingDetailPanel id={selected} />
    </div>
  );
}

function MeetingDetailPanel({ id }: { id: string | null }) {
  const nav = useNavigate();
  const { data: m, isLoading } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => api.get<MeetingDetail>(`/api/meetings/${id}`),
    enabled: !!id,
  });
  if (!id)
    return (
      <aside className="rounded-2xl border border-line bg-panel p-5 text-[13px] text-muted shadow-sm">
        Choisissez une réunion dans le calendrier pour voir son détail.
      </aside>
    );
  if (isLoading || !m)
    return (
      <aside className="rounded-2xl border border-line bg-panel shadow-sm">
        <LoadingRows rows={6} />
      </aside>
    );
  const st = stageOf(m);
  const open = m.agenda.reduce(
    (n, i) => n + i.actions.filter((a) => !["realise", "annule"].includes(a.status)).length,
    0,
  );
  const total = m.agenda.reduce((n, i) => n + i.actions.length, 0);
  return (
    <aside className="rise-in flex flex-col self-start rounded-2xl border border-line bg-panel shadow-sm lg:sticky lg:top-4">
      <div className="space-y-3 border-b border-line p-5">
        <p className="text-[12px] font-medium text-faint">Réunion sélectionnée</p>
        <div className="flex items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ color: STAGE[st].hue, background: `color-mix(in oklab, ${STAGE[st].hue} 12%, transparent)` }}
          >
            <Users className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold leading-snug tracking-[-0.015em]">{m.meeting_type}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {fmt(m.meeting_date, "EEEE d MMMM")} · {span(m)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STAGE[st].tone} label={STAGE[st].label} />
          <Seal>{m.reference}</Seal>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Prop label="Lieu" Icon={MapPin}>
            {m.location || "—"}
          </Prop>
          <Prop label="Rédacteur" Icon={UserRound}>
            {m.writer_name || "—"}
          </Prop>
          <Prop label="Convoquée par">{m.convened_by || "—"}</Prop>
          <Prop label="Animateur">{m.facilitator || "—"}</Prop>
        </div>
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-faint">Participants · {m.attendees.length}</p>
          {m.attendees.length ? (
            <ul className="space-y-1.5">
              {m.attendees.slice(0, 5).map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-[12.5px]">
                  <Initials name={a.name || "?"} />
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                  <span className="text-[11.5px] text-faint">
                    {(
                      { present: "Présent", represente: "Représenté", excuse: "Excusé", absent: "Absent" } as Record<
                        string,
                        string
                      >
                    )[a.presence] ?? ""}
                  </span>
                </li>
              ))}
              {m.attendees.length > 5 && <li className="text-[12px] text-faint">et {m.attendees.length - 5} autres</li>}
            </ul>
          ) : (
            <p className="text-[12.5px] text-muted">Aucun participant renseigné.</p>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-faint">Ordre du jour</p>
          {m.agenda.length ? (
            <ol className="space-y-1.5">
              {m.agenda.slice(0, 5).map((it, i) => (
                <li key={it.id ?? i} className="flex gap-2 text-[12.5px] leading-snug">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-hover text-[10.5px] font-semibold tabular text-muted">
                    {i + 1}
                  </span>
                  <span>{it.subject}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[12.5px] text-muted">Ordre du jour à établir.</p>
          )}
        </div>
        {total > 0 && (
          <p className="rounded-[14px] bg-bg px-3 py-2 text-[12.5px] text-muted">
            <b className="font-semibold text-fg">{open}</b> recommandation{open > 1 ? "s" : ""} ouverte
            {open > 1 ? "s" : ""} sur {total}
          </p>
        )}
      </div>
      <div className="mt-auto flex gap-2 border-t border-line p-4">
        <span className="flex flex-1 [&>button]:w-full">
          <ExportMenu formats={DOCUMENT_FORMATS} href={(f) => `/api/meetings/${m.id}/report?format=${f}`} />
        </span>
        <button
          onClick={() => nav(`/reunions/${m.id}`)}
          className="flex h-9 flex-[1.4] items-center justify-center gap-1.5 rounded-[10px] bg-night text-[12.5px] font-semibold text-white dark:bg-primary dark:text-on-primary"
        >
          Ouvrir le compte rendu
        </button>
      </div>
    </aside>
  );
}
