import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/lib/hooks";
import { Building2, ChevronRight } from "lucide-react";
import { Empty, Spinner, cn } from "@/components/ui";
import { PageHeader, Section, Status, Table, Td, Tr, frDate, type Tone } from "@/components/gov";
import { Assessment, DirectionTable, PlanBar, type DirectionRow, type DirectionStats } from "@/components/directions";
import { api } from "@/lib/api";

/*
 * Une direction vue par la DG : son appréciation et ses raisons, ses services, ses projets, son plan de travail face
 * au calendrier, la synthèse du travail des équipes, ce qui a dépassé son échéance. On descend aux services.
 */

interface Detail {
  stats: DirectionStats;
  today: string;
  unit: { id: string; name: string; kind: string; manager_name: string | null };
  breadcrumb: { id: string; name: string }[];
  children: DirectionRow[];
  projects: {
    id: string;
    name: string;
    health: "on_track" | "at_risk" | "off_track" | "done";
    progress: number;
    overdue: number;
    due_on: string | null;
    unit_name: string | null;
  }[];
  plan_activities: {
    id: string;
    title: string;
    unit_name: string | null;
    responsible_name: string | null;
    progress: number;
    expected: number | null;
    end_on: string | null;
    behind: boolean;
    late: boolean;
  }[];
  late: { kind: string; id: string; title: string; who: string | null; due_on: string | null; href: string }[];
}
const HEALTH: Record<string, { label: string; tone: Tone }> = {
  on_track: { label: "Dans les temps", tone: "success" },
  at_risk: { label: "À surveiller", tone: "warning" },
  off_track: { label: "En difficulté", tone: "danger" },
  done: { label: "Terminé", tone: "neutral" },
};
const KIND: Record<string, string> = { decision: "Décision", courrier: "Courrier", recommandation: "Recommandation" };

export function DirectionPage() {
  const { id } = useParams();
  const canPilot = useCan()("pilotage.view");
  const { data: d, error } = useQuery({
    queryKey: ["pilotage-direction", id],
    queryFn: () => api.get<Detail>(`/api/pilotage/directions/${id}`),
  });
  if (error) return <Empty title="Entité inaccessible">{(error as Error).message}</Empty>;
  if (!d)
    return (
      <div className="p-8">
        <Spinner />
      </div>
    );
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={Building2}
        crumbs={["Pilotage", "Tableau de bord DG", ...d.breadcrumb.map((b) => b.name)]}
        title={d.unit.name}
        subtitle={`${d.unit.manager_name ? `Dirigée par ${d.unit.manager_name}` : "Sans chef désigné"} · ${d.stats.agents} agent${d.stats.agents > 1 ? "s" : ""} · photo au ${frDate(d.today)}`}
        actions={
          <nav aria-label="Remonter" className="flex flex-wrap items-center gap-1 text-[12.5px]">
            {/* Un chef qui lit sa direction n'a pas le tableau de bord DG (P-5) */}
            {canPilot ? (
              <Link to="/pilotage" className="text-muted hover:text-fg">
                Tableau de bord DG
              </Link>
            ) : (
              <Link to="/entite" className="text-muted hover:text-fg">
                Mon entité
              </Link>
            )}
            {d.breadcrumb.slice(0, -1).map((b) => (
              <span key={b.id} className="flex items-center gap-1">
                <ChevronRight className="size-3 text-faint" />
                <Link to={`/pilotage/directions/${b.id}`} className="text-muted hover:text-fg">
                  {b.name}
                </Link>
              </span>
            ))}
          </nav>
        }
      />
      <div className="mx-auto max-w-[1480px] space-y-4 px-4 pb-16 sm:px-8">
        <section
          aria-label="Appréciation"
          className={cn(
            "rounded-2xl border border-line bg-panel p-5 shadow-sm",
            d.stats.assessment === "alerte" && "border-danger/40",
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Assessment value={d.stats.assessment} />
            <span className="text-[13.5px]">
              {d.stats.alerts.length
                ? d.stats.alerts.join(" · ")
                : "Aucun retard ni décalage : la direction tient ses engagements."}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Projets" value={d.stats.projects.total} hint={`${d.stats.projects.off_track} en difficulté`} />
            <Kpi
              label="Tâches en retard"
              value={d.stats.tasks.overdue}
              hint={`sur ${d.stats.tasks.open} ouvertes`}
              alert={d.stats.tasks.overdue > 0}
            />
            <Kpi
              label="Décisions à exécuter"
              value={d.stats.decisions.open}
              hint={`${d.stats.decisions.late} en retard`}
              alert={d.stats.decisions.late > 0}
            />
            <Kpi
              label="Courrier à traiter"
              value={d.stats.mail.open}
              hint={`${d.stats.mail.late} hors délai`}
              alert={d.stats.mail.late > 0}
            />
            <div className="rounded-xl bg-hover/60 px-3 py-2.5">
              <p className="text-[12px] text-muted">Plan de travail {d.today.slice(0, 4)}</p>
              <div className="mt-1.5">
                <PlanBar progress={d.stats.plan.progress} expected={d.stats.plan.expected} />
              </div>
            </div>
          </div>
        </section>

        {d.children.length > 0 && (
          <Section title="Services et entités rattachés">
            <DirectionTable rows={d.children} />
          </Section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Ce qui a dépassé son échéance">
            {d.late.length ? (
              <ul className="divide-y divide-line px-5 pb-3">
                {d.late.map((l) => (
                  <li key={`${l.kind}-${l.id}`} className="py-2.5 text-[13px]">
                    <Link to={l.href} className="font-medium hover:underline">
                      {l.title}
                    </Link>
                    <span className="block text-[12px] text-muted">
                      {KIND[l.kind]} · {l.who ?? "—"} · attendu le {frDate(l.due_on)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-5 text-[13px] text-muted">Rien n'est en retard.</p>
            )}
          </Section>
          {/* La charge nominative des agents relève du chef d'entité (Mon entité) : la DG voit la synthèse */}
          <Section title="Travail des équipes">
            <p className="px-5 pb-5 text-[13px] text-muted">
              {d.stats.agents} agent{d.stats.agents > 1 ? "s" : ""} · {d.stats.tasks.open} tâche
              {d.stats.tasks.open > 1 ? "s" : ""} ouverte{d.stats.tasks.open > 1 ? "s" : ""}, dont{" "}
              <b className={cn("font-semibold", d.stats.tasks.overdue > 0 && "text-danger")}>{d.stats.tasks.overdue}</b>{" "}
              en retard. Le détail par agent est suivi par le chef de l'entité, dans « Mon entité ».
            </p>
          </Section>
        </div>

        <Section title="Projets">
          {d.projects.length ? (
            <Table head={["Projet", "Entité", "Santé", "Avancement", "Tâches en retard", "Échéance"]}>
              {d.projects.map((p) => (
                <Tr key={p.id}>
                  <Td className="min-w-[220px]">
                    <Link to={`/projects/${p.id}/dashboard`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                  </Td>
                  <Td className="text-muted">{p.unit_name ?? "—"}</Td>
                  <Td>
                    <Status {...HEALTH[p.health]} />
                  </Td>
                  <Td className="tabular-nums">{p.progress} %</Td>
                  <Td className={cn("tabular-nums", p.overdue > 0 && "font-semibold text-danger")}>{p.overdue}</Td>
                  <Td className="whitespace-nowrap text-muted">{frDate(p.due_on)}</Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <p className="px-5 pb-5 text-[13px] text-muted">Aucun projet rattaché (ou aucun qui vous soit ouvert).</p>
          )}
          <div className="h-3" />
        </Section>

        <Section title={`Plan de travail ${d.today.slice(0, 4)} : réalisé face à l'attendu`}>
          {d.plan_activities.length ? (
            <Table head={["Activité", "Entité", "Responsable", "Avancement", "Fin prévue", "État"]}>
              {d.plan_activities.map((a) => (
                <Tr key={a.id}>
                  <Td className="min-w-[220px] font-medium">{a.title}</Td>
                  <Td className="text-muted">{a.unit_name ?? "—"}</Td>
                  <Td className="text-muted">{a.responsible_name ?? "—"}</Td>
                  <Td>
                    <PlanBar progress={a.progress} expected={a.expected} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{frDate(a.end_on)}</Td>
                  <Td>
                    {a.progress >= 100 ? (
                      <Status label="Achevée" tone="success" />
                    ) : a.late ? (
                      <Status label="Échue" tone="danger" />
                    ) : a.behind ? (
                      <Status label="En décalage" tone="warning" />
                    ) : (
                      <Status label="Dans le calendrier" tone="info" />
                    )}
                  </Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <p className="px-5 pb-5 text-[13px] text-muted">Aucun plan de travail approuvé pour cette année.</p>
          )}
          <div className="h-3" />
        </Section>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, alert }: { label: string; value: number; hint: string; alert?: boolean }) {
  return (
    <div className="rounded-xl bg-hover/60 px-3 py-2.5">
      <p className="text-[12px] text-muted">{label}</p>
      <p className={cn("text-[22px] font-semibold leading-tight tabular-nums", alert && "text-danger")}>{value}</p>
      <p className="text-[12px] text-muted">{hint}</p>
    </div>
  );
}
