import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlarmClock,
  AtSign,
  BellRing,
  CalendarX,
  CheckCheck,
  CircleCheck,
  FileText,
  Landmark,
  MessageSquare,
  Pencil,
  Settings2,
  Sparkles,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { Drawer } from "@/components/drawer";
import { Avatar, Button, CARD, Empty, Hint, cn } from "@/components/ui";
import { ApprovalCard } from "@/components/ai";
import { useApprovals, useMe, useNotifications, useUserMap } from "@/lib/hooks";
import { useShell } from "@/lib/shell";
import { ago, pl } from "@/lib/format";
import { api } from "@/lib/api";
import type { Notification, NotificationPrefs } from "@/lib/types";

const KIND_ICON: Record<string, typeof AtSign> = {
  mention: AtSign,
  comment: MessageSquare,
  assigned: UserPlus,
  "task.completed": CircleCheck,
  approval: Sparkles,
  "project.update": FileText,
  "task.changed": Pencil,
  "task.unassigned": UserMinus,
  "deadline.soon": AlarmClock,
  "deadline.late": AlarmClock,
  "meeting.convened": Landmark,
  "meeting.changed": Landmark,
  "meeting.cancelled": CalendarX,
};
/** Domaines proposés en filtre, dans l'ordre de la vie de l'institution. */
const FILTERS: [string, string][] = [
  ["tout", "Tout"],
  ["non-lues", "Non lues"],
  ["taches", "Tâches"],
  ["reunions", "Réunions"],
  ["courrier", "Courrier"],
  ["decisions", "Décisions"],
  ["parapheur", "Parapheur"],
  ["equipe", "Équipe"],
  ["projets", "Projets"],
  ["partenariats", "Partenariats"],
];

export function InboxPage() {
  const { data: notifs } = useNotifications();
  const { data: approvals } = useApprovals();
  const users = useUserMap();
  const shell = useShell();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("tout");
  const [settings, setSettings] = useState(false);
  const read = async (ids: string[] | "all") => {
    await api.post("/api/notifications/read", ids === "all" ? { all: true } : { ids });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  const open = (n: Notification) => {
    if (!n.read) read([n.id]);
    // La tâche s'ouvre sur place ; le reste mène à l'endroit où agir
    if (n.task_id) shell.openTask(n.task_id);
    else if (n.link) nav(n.link);
  };
  const all = (notifs ?? []).filter((n) => n.kind !== "approval" || !n.read);
  const list = all.filter((n) =>
    filter === "tout" ? true : filter === "non-lues" ? !n.read : (n.category ?? "autres") === filter,
  );
  const count = (f: string) =>
    f === "tout"
      ? all.length
      : f === "non-lues"
        ? all.filter((n) => !n.read).length
        : all.filter((n) => n.category === f).length;
  const unread = list.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-16 pt-8 sm:px-8 [&>*]:max-w-[960px]">
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Boîte de réception</h1>
          <p className="mt-1 text-[13px] text-muted">{unread ? `${unread} ${pl(unread, "non lue(s)")}` : "Tout est lu."}</p>
        </div>
        <span className="ml-auto flex gap-2">
          {unread > 0 && (
            <Button size="sm" icon={<CheckCheck className="size-3.5" />} onClick={() => read("all")}>
              Tout marquer comme lu
            </Button>
          )}
          <Button size="sm" icon={<Settings2 className="size-3.5" />} onClick={() => setSettings(true)}>
            Préférences
          </Button>
        </span>
      </header>
      <nav aria-label="Domaines" className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.filter(([f]) => f === "tout" || f === "non-lues" || count(f) > 0).map(([f, label]) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-[12.5px]",
              filter === f ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg",
            )}
          >
            {label} <span className="tabular-nums opacity-70">{count(f)}</span>
          </button>
        ))}
      </nav>
      {settings && <PrefsDrawer onClose={() => setSettings(false)} />}

      {!!approvals?.length && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
            <Sparkles className="size-4 text-ai-fg" />
            Validations demandées par l'IA
          </h2>
          <div className="space-y-2.5">
            {approvals.map((a) => (
              <div key={a.id}>
                <ApprovalCard a={a} />
                {a.task_id && (
                  <button
                    onClick={() => shell.openTask(a.task_id!)}
                    className="ml-12 mt-1 text-[12px] text-muted hover:text-fg"
                  >
                    Voir la tâche →
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={cn(CARD, "overflow-hidden")}>
        {list.length === 0 && (
          <Empty icon={<BellRing className="size-8" />} title="Rien de nouveau">
            Les mentions, assignations et demandes de validation arrivent ici.
          </Empty>
        )}
        {list.map((n) => {
          const Icon = KIND_ICON[n.kind] ?? BellRing;
          const actor = n.actor_id ? users.get(n.actor_id) : null;
          return (
            <button
              key={n.id}
              onClick={() => open(n)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-line px-4 py-3.5 text-left last:border-b-0 hover:bg-hover",
                !n.read && "bg-ai-soft/30",
              )}
            >
              <div className="relative">
                <Avatar user={actor} size={30} />
                <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border border-panel bg-raised text-muted">
                  <Icon className="size-2.5" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[13.5px] leading-snug", !n.read && "font-medium")}>{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-[12.5px] text-muted">{n.body}</p>}
                <p className="mt-1 text-[11.5px] text-faint">{ago(n.created_at)}</p>
              </div>
              {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ai" />}
            </button>
          );
        })}
      </section>
    </div>
  );
}

/** Préférences : par domaine, recevoir aussi un courriel. L'avis dans l'outil reste toujours. */
function PrefsDrawer({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: () => api.get<NotificationPrefs>("/api/me/notification-prefs"),
  });
  const toggle = (id: string, email: boolean) =>
    api.put("/api/me/notification-prefs", { [id]: { email } }).then(
      () => {
        qc.invalidateQueries({ queryKey: ["notification-prefs"] });
        toast.success(email ? "Vous recevrez aussi un courriel" : "Plus de courriel pour ce domaine");
      },
      (e: Error) => toast.error(e.message),
    );
  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      subtitle="Boîte de réception"
      title="Préférences de notification"
      footer={<Button onClick={onClose}>Fermer</Button>}
    >
      <Hint className="mb-4">
        Chaque avis arrive toujours ici. Choisissez les domaines pour lesquels vous recevez aussi un courriel.
      </Hint>
      {me && !me.mail_ready && (
        <p className="mb-4 rounded-lg border border-line bg-hover px-3 py-2 text-[12.5px] text-muted">
          La messagerie de l'institution n'est pas encore en service : aucun courriel ne part pour l'instant. Vos choix
          s'appliqueront dès sa mise en service.
        </p>
      )}
      {data ? (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {data.categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium">{c.label}</span>
                <span className="block text-[12px] text-muted">{c.hint}</span>
              </span>
              <label className="flex items-center gap-2 text-[12.5px] text-muted">
                <input
                  type="checkbox"
                  checked={data.prefs[c.id]?.email !== false}
                  onChange={(e) => toggle(c.id, e.target.checked)}
                />
                Courriel
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </Drawer>
  );
}
