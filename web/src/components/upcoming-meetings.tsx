import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { CalendarDays, MapPin, Repeat, Video } from "lucide-react";
import { CARD, cn } from "@/components/ui";
import { api } from "@/lib/api";
import { todayIso, pl } from "@/lib/format";
import type { UpcomingMeeting } from "@/lib/types";

/*
 * Les réunions à mettre en avant : à l'accueil de chacun (où il est convoqué, préside ou rédige) et dans l'espace
 * de l'entité (ses réunions, dont la réunion hebdomadaire, une séance par série). Un clic ouvre la réunion.
 */
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function When({ date }: { date: string }) {
  const today = todayIso();
  return (
    <span
      className={cn(
        "flex w-12 shrink-0 flex-col items-center rounded-lg border py-1",
        date === today ? "border-primary bg-brand-soft text-primary" : "border-line text-fg",
      )}
    >
      <span className="text-[15px] font-semibold leading-tight tabular-nums">{Number(date.slice(8, 10))}</span>
      <span className="text-[11px] uppercase tracking-wide text-muted">{MONTHS[Number(date.slice(5, 7)) - 1]}</span>
    </span>
  );
}

const RESPONSE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Réponse attendue", cls: "bg-warning-soft text-warning" },
  accepted: { label: "Présent·e", cls: "bg-success-soft text-success" },
  declined: { label: "Excusé·e", cls: "bg-hover text-muted" },
  delegated: { label: "Représenté·e", cls: "bg-hover text-muted" },
};
const ROLE: Record<string, string> = { chair: "Vous présidez", writer: "Vous rédigez" };

export function UpcomingMeetingList({ rows, empty }: { rows: UpcomingMeeting[]; empty: string }) {
  if (!rows.length) return <p className="py-4 text-center text-[13px] text-muted">{empty}</p>;
  return (
    <ul className="-mx-2 space-y-0.5">
      {rows.map((m) => {
        const response = m.convened && m.my_response ? RESPONSE[m.my_response] : null;
        return (
          <li key={m.id}>
            <Link to={`/reunions/${m.id}`} className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-hover">
              <When date={m.meeting_date} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{m.title || m.meeting_type}</span>
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-muted">
                  {m.start_time && <span>{m.start_time.slice(0, 5)}</span>}
                  {m.video_link ? (
                    <span className="flex items-center gap-1">
                      <Video className="size-3" />
                      Visioconférence
                    </span>
                  ) : m.location ? (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="size-3" />
                      {m.location}
                    </span>
                  ) : null}
                  {m.recurring && (
                    <span className="flex items-center gap-1">
                      <Repeat className="size-3" />
                      Récurrente
                    </span>
                  )}
                  {m.unit_name && <span className="truncate">{m.unit_name}</span>}
                </span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {response && (
                    <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", response.cls)}>
                      {response.label}
                    </span>
                  )}
                  {m.role && ROLE[m.role] && (
                    <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-primary">
                      {ROLE[m.role]}
                    </span>
                  )}
                  {!m.convened && (
                    <span className="rounded-md bg-hover px-1.5 py-0.5 text-[11px] text-muted">
                      Pas encore convoquée
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Carte de l'accueil : mes prochaines réunions. */
export function MyMeetingsCard() {
  const { data } = useQuery({
    queryKey: ["meetings", "mine-upcoming"],
    queryFn: () => api.get<UpcomingMeeting[]>("/api/me/meetings"),
  });
  const waiting = (data ?? []).filter((m) => m.convened && m.my_response === "pending").length;
  return (
    <section className={cn(CARD, "p-5")}>
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="size-4 text-faint" />
        <h2 className="text-[15px] font-semibold">Mes prochaines réunions</h2>
        <Link to="/reunions" className="ml-auto text-[12.5px] text-muted hover:text-fg">
          Tout voir
        </Link>
      </div>
      {waiting > 0 && (
        <p className="mb-2 rounded-lg bg-warning-soft px-2.5 py-1.5 text-[12.5px] text-warning">
          {waiting} {pl(waiting, "convocation(s)")} attendent votre réponse.
        </p>
      )}
      {data ? (
        <UpcomingMeetingList rows={data.slice(0, 5)} empty="Aucune réunion prévue où vous êtes attendu·e." />
      ) : (
        <p className="py-4 text-center text-[13px] text-muted">Chargement…</p>
      )}
    </section>
  );
}
