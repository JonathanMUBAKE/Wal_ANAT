import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowRight, CalendarOff, FileSignature, Mail, Scale, Users } from "lucide-react";
import { cn } from "@/components/ui";
import { useCan, useMe, useMyUnits } from "@/lib/hooks";
import { todayIso, pl } from "@/lib/format";
import { api } from "@/lib/api";
import type { UnitDashboard } from "@/lib/types";

/*
 * « Ce qui vous attend » : l'accueil met en avant, selon le profil de chacun, ce qu'il doit faire aujourd'hui
 * (docs/MODELE-INSTITUTIONNEL.md § 4.1). L'agent voit son courrier ; le chef d'entité, les retards de son entité ;
 * la direction, le courrier à imputer, le parapheur à signer et les décisions à suivre.
 */
interface Item {
  to: string;
  icon: typeof Mail;
  label: string;
  value: number;
  hint: string;
  alert?: boolean;
}

export function RoleFocus() {
  const can = useCan();
  const { data: me } = useMe();
  const { data: units } = useMyUnits();
  const headed = units?.find((u) => u.role === "responsable");
  const { data: mail } = useQuery({
    queryKey: ["correspondence", "summary"],
    queryFn: () =>
      api.get<{ to_assign: number; late: number; mine: { open: number; late: number } }>("/api/correspondence/summary"),
  });
  const { data: toSign } = useQuery({
    queryKey: ["signature", "to_sign"],
    queryFn: () => api.get<unknown[]>("/api/signature?box=to_sign"),
    enabled: can("signature.use"),
  });
  const { data: unit } = useQuery({
    queryKey: ["unit-dashboard", headed?.id],
    queryFn: () => api.get<UnitDashboard>(`/api/units/${headed!.id}/dashboard`),
    enabled: !!headed,
  });
  const { data: decisions } = useQuery({
    queryKey: ["decisions", "focus"],
    queryFn: () => api.get<{ owner_id: string | null; status: string; due_on: string | null }[]>("/api/decisions"),
    enabled: can("decisions.view") || can("decisions.record"),
  });
  const { data: leaves } = useQuery({
    queryKey: ["leaves", "summary"],
    queryFn: () => api.get<{ to_decide: number; absent_today: unknown[] }>("/api/leaves/summary"),
  });
  const items: Item[] = [];
  if (mail && (mail.mine.open || can("correspondence.manage")))
    items.push({
      to: "/courrier",
      icon: Mail,
      label: can("correspondence.manage") ? "Courrier à imputer" : "Mon courrier",
      value: can("correspondence.manage") ? mail.to_assign : mail.mine.open,
      hint: can("correspondence.manage")
        ? `${mail.late} en retard au registre`
        : mail.mine.late
          ? `${mail.mine.late} en retard`
          : "dans les délais",
      alert: can("correspondence.manage") ? mail.late > 0 : mail.mine.late > 0,
    });
  if (toSign?.length)
    items.push({
      to: "/parapheur",
      icon: FileSignature,
      label: "À viser ou signer",
      value: toSign.length,
      hint: "au parapheur",
    });
  if (headed && unit)
    items.push({
      to: `/entite?unite=${headed.id}`,
      icon: Users,
      label: `Votre entité · ${headed.name}`,
      value: unit.kpis.overdue,
      hint: `${pl(unit.kpis.overdue, "tâche(s) en retard")} · ${unit.kpis.open} ${pl(unit.kpis.open, "ouverte(s)")}`,
      alert: unit.kpis.overdue > 0,
    });
  if (leaves?.to_decide)
    items.push({
      to: "/conges?onglet=valider",
      icon: CalendarOff,
      label: "Congés à valider",
      value: leaves.to_decide,
      hint: `${leaves.absent_today.length} ${pl(leaves.absent_today.length, "absent(s)")} aujourd'hui`,
    });
  const mineDecisions = (decisions ?? []).filter(
    (d) => d.owner_id === me?.id && ["a_executer", "en_cours"].includes(d.status),
  );
  if (mineDecisions.length)
    items.push({
      to: "/decisions",
      icon: Scale,
      label: "Décisions à exécuter",
      value: mineDecisions.length,
      hint: `${mineDecisions.filter((d) => d.due_on && d.due_on < todayIso()).length} en retard`,
      alert: mineDecisions.some((d) => d.due_on && d.due_on < todayIso()),
    });
  if (!items.length) return null;
  return (
    <section aria-label="Ce qui vous attend" className="grid gap-3 sm:grid-cols-2">
      {items.map((i) => (
        <Link
          key={i.label}
          to={i.to}
          className="group flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm hover:border-line-strong"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-primary">
            <i.icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] text-muted">{i.label}</span>
            <span
              className={cn("block text-[20px] font-semibold leading-tight tabular-nums", i.alert && "text-danger")}
            >
              {i.value}
            </span>
            <span className="block truncate text-[12px] text-muted">{i.hint}</span>
          </span>
          <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </section>
  );
}
