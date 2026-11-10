import { useMemo, useState } from "react";
import { toast } from "sonner";
import { NavLink, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  FileCheck2,
  FileSignature,
  ListTree,
  Mail,
  Gauge,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  CircleUser,
  House,
  KeyRound,
  ShieldCheck,
  Inbox,
  LogOut,
  Moon,
  Network,
  Plus,
  Search,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import {
  Avatar,
  Button,
  Dialog,
  Kbd,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  ProjectIcon,
  cn,
} from "./ui";
import { useAiStatus, useApprovals, useCan, useMe, useNotifications, useProjects } from "@/lib/hooks";
import { useShell } from "@/lib/shell";
import { AvatarUpload } from "./AvatarUpload";
import { api } from "@/lib/api";
import { Topo } from "./territory";
import { STATUS } from "@/lib/format";

const SIDE_PEAKS = [{ x: 210, y: 20, rings: 9, seed: 3.4, r0: 12, step: 17 }];

export const ORG_ROLE: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
  guest: "Invité",
};

/** Logo officiel de l'agence, posé sur fond blanc pour rester lisible en thème sombre. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <img
      src="/anat-logo.png"
      alt="ANAT"
      style={{ height: size + 8 }}
      className="w-auto shrink-0 rounded-md bg-white p-0.5"
    />
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: me } = useMe();
  const { data: projects } = useProjects();
  const { data: notifs } = useNotifications();
  const { data: approvals } = useApprovals();
  const { data: aiStatus } = useAiStatus();
  const { data: config } = useQuery({
    queryKey: ["auth-config"],
    queryFn: () => api.get<{ demo: boolean }>("/api/auth/config"),
    staleTime: Infinity,
  });
  const shell = useShell();
  const can = useCan();
  const nav = useNavigate();
  const qc = useQueryClient();
  const unread = notifs?.filter((n) => !n.read).length ?? 0;
  const currentOrg = me?.orgs.find((o) => o.id === me.org_id);
  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [profile, setProfile] = useState(false);
  const groups = useMemo(() => {
    const m = new Map<string, [string, string | null, NonNullable<typeof projects>]>();
    for (const p of projects ?? []) {
      const k = p.team_name ?? "Sans équipe";
      if (!m.has(k)) m.set(k, [k, p.team_id, []]);
      m.get(k)![2].push(p);
    }
    // Tri à la française (« Équipe » avant « Marketing »), les projets sans équipe en dernier
    return [...m.values()].sort(
      (a, b) => (a[1] ? 0 : 1) - (b[1] ? 0 : 1) || a[0].localeCompare(b[0], "fr", { sensitivity: "base" }),
    );
  }, [projects]);
  // Rechargement complet : aucune donnée (cache, temps réel) de l'organisation précédente ne doit survivre
  const switchOrg = async (id: string) => {
    await api.post(`/api/orgs/${id}/switch`);
    window.location.assign("/");
  };
  const createOrg = async () => {
    try {
      await api.post("/api/orgs", { name: orgName });
      window.location.assign("/org");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const link = (to: string, icon: React.ReactNode, label: string, badge?: number, ai?: boolean) => (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex h-9 items-center gap-3 rounded-full px-3 text-[13.5px] transition-colors",
          isActive ? "bg-brand-soft font-semibold text-primary" : "text-muted hover:bg-hover hover:text-fg",
        )
      }
    >
      <span className={cn("flex w-4 justify-center", ai && "text-ai-fg")}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {!!badge && (
        <span
          className={cn(
            "min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-semibold tabular",
            ai ? "bg-ai text-white" : "bg-primary text-on-primary",
          )}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] border border-line bg-panel shadow-sm">
      <div className="flex items-center gap-2 px-3 pb-2 pt-4">
        <Menu>
          <MenuTrigger asChild>
            <button className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-hover">
              <Logo />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold leading-tight">
                  {currentOrg?.name ?? "ANAT"}
                </span>
                <span className="block truncate text-[11.5px] text-faint">
                  {currentOrg ? ORG_ROLE[currentOrg.role] : ""}
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 text-faint" />
            </button>
          </MenuTrigger>
          <MenuContent className="w-[240px]">
            <MenuLabel>Connecté en tant que</MenuLabel>
            <div className="flex items-center gap-2 px-2 pb-2">
              <Avatar user={me} size={26} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{me?.name}</p>
                <p className="truncate text-[11.5px] text-faint">{me?.title}</p>
              </div>
            </div>
            <MenuItem icon={<CircleUser className="size-3.5" />} onSelect={() => setProfile(true)}>
              Mon profil
            </MenuItem>
            <MenuItem
              icon={<KeyRound className="size-3.5" />}
              onSelect={() => {
                nav("/account");
                onNavigate?.();
              }}
            >
              Sécurité du compte
            </MenuItem>
            <MenuSeparator />
            <MenuLabel>Organisations</MenuLabel>
            {me?.orgs.map((o) => (
              <MenuItem
                key={o.id}
                icon={<Building2 className="size-3.5" />}
                right={o.id === me.org_id ? <Check className="size-3.5" /> : undefined}
                onSelect={() => o.id !== me.org_id && switchOrg(o.id)}
              >
                {o.name}
              </MenuItem>
            ))}
            {(me?.platform_role || config?.demo) && (
              <MenuItem icon={<Plus className="size-3.5" />} onSelect={() => setCreating(true)}>
                Créer une organisation
              </MenuItem>
            )}
            <MenuSeparator />
            <MenuItem
              icon={shell.theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              onSelect={shell.toggleTheme}
            >
              {shell.theme === "dark" ? "Thème clair" : "Thème sombre"}
            </MenuItem>
            <MenuItem
              icon={<LogOut className="size-3.5" />}
              onSelect={async () => {
                await api.post("/api/auth/logout");
                qc.clear();
                nav("/login");
              }}
            >
              Se déconnecter
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={() => shell.setPalette(true)}
          className="flex h-10 w-full items-center gap-2 rounded-full border border-line-strong bg-panel px-3.5 text-[13px] text-faint hover:text-muted"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Rechercher…</span>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <nav className="space-y-0.5 px-3">
          {can("pilotage.view") && link("/pilotage", <Gauge className="size-4" />, "Tableau de bord DG")}
          {link("/", <House className="size-4" />, "Accueil")}
          {link("/my-tasks", <CheckCircle2 className="size-4" />, "Mes tâches")}
          {link("/inbox", <Inbox className="size-4" />, "Boîte de réception", unread)}
          {link("/ai", <Sparkles className="size-4" />, "Coéquipiers IA", approvals?.length, true)}
          {can("agenda.view") && link("/activites", <CalendarRange className="size-4" />, "Activités")}
          {can("meetings.view") && link("/reunions", <CalendarDays className="size-4" />, "Réunions")}
          {can("plans.view") && link("/plans", <ClipboardList className="size-4" />, "Plans de travail")}
          {link("/livrables", <FileCheck2 className="size-4" />, "Livrables")}
          {can("signature.use") && link("/parapheur", <FileSignature className="size-4" />, "Parapheur")}
          {can("correspondence.view") && link("/courrier", <Mail className="size-4" />, "Courrier")}
          {can("attributions.view") && link("/attributions", <ListTree className="size-4" />, "Attributions")}
          {link("/teams", <Users className="size-4" />, "Équipes")}
          {link("/org", <Network className="size-4" />, "Organisation")}
          {me?.platform_role && link("/admin", <ShieldCheck className="size-4" />, "Administration")}
        </nav>

        <div className="mt-5 flex items-center justify-between px-5 pb-1">
          <span className="text-[11.5px] font-medium uppercase tracking-wider text-faint">Projets</span>
          <button
            aria-label="Nouveau projet"
            onClick={() => shell.setNewProject(true)}
            className="rounded-md p-0.5 text-faint hover:bg-hover hover:text-fg"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <nav className="space-y-0.5 px-3 pb-3">
          {groups.map(([teamName, teamId, list]) => (
            <div key={teamName} className="pb-1.5">
              {teamId ? (
                <NavLink
                  to={`/teams/${teamId}`}
                  onClick={onNavigate}
                  className="flex h-6 items-center gap-1.5 px-2 text-[11.5px] font-medium text-faint hover:text-fg"
                >
                  <Users className="size-3" />
                  {teamName}
                </NavLink>
              ) : (
                <span className="flex h-6 items-center px-2 text-[11.5px] font-medium text-faint">{teamName}</span>
              )}
              {list.map((p) => (
                <NavLink
                  key={p.id}
                  to={`/projects/${p.id}`}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "group flex h-8 items-center gap-2.5 rounded-lg px-2 text-[13.5px]",
                      isActive ? "bg-active font-medium text-fg" : "text-muted hover:bg-hover hover:text-fg",
                    )
                  }
                >
                  <ProjectIcon icon={p.icon} color={p.color} size={18} />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: STATUS[p.status].color }}
                    title={STATUS[p.status].label}
                  />
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <Dialog
        open={creating}
        onOpenChange={setCreating}
        title="Créer une organisation"
        width={460}
        description="Un espace étanche, avec ses propres membres, équipes, projets et réglages. Vous en serez propriétaire."
        footer={
          <>
            <Button onClick={() => setCreating(false)}>Annuler</Button>
            <Button variant="primary" disabled={!orgName.trim()} onClick={createOrg}>
              Créer
            </Button>
          </>
        }
      >
        <input
          autoFocus
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && orgName.trim() && createOrg()}
          placeholder="Nom de l'organisation"
          className="h-10 w-full rounded-lg border border-line bg-bg/60 px-3 text-[14px] outline-none focus:border-line-strong"
        />
      </Dialog>

      <Dialog
        open={profile}
        onOpenChange={setProfile}
        title="Mon profil"
        width={460}
        description="Votre photo apparaît partout : tâches, commentaires, équipes et organigramme, dans toutes vos organisations."
        footer={<Button onClick={() => setProfile(false)}>Fermer</Button>}
      >
        {me && (
          <div className="space-y-4">
            <AvatarUpload user={me} size={84} />
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 border-t border-line pt-4 text-[13px]">
              <dt className="text-muted">Nom</dt>
              <dd className="font-medium">{me.name}</dd>
              <dt className="text-muted">Fonction</dt>
              <dd>{me.title ?? "—"}</dd>
              <dt className="text-muted">E-mail</dt>
              <dd className="font-mono text-[12.5px]">{me.email ?? "—"}</dd>
            </dl>
          </div>
        )}
      </Dialog>

      <div className="p-3">
        <button
          onClick={() => shell.openAssistant()}
          className="hero-night group relative isolate flex w-full flex-col overflow-hidden rounded-[20px] p-4 text-left shadow-md"
        >
          <Topo
            peaks={SIDE_PEAKS}
            width={240}
            height={150}
            draw={false}
            className="absolute inset-0 -z-10 size-full text-[#8CCBF2] opacity-[0.22]"
          />
          <span className="flex items-center gap-2 text-[13.5px] font-semibold">
            <Sparkles className="size-4 text-[#C4B8FF]" />
            Assistant IA
          </span>
          <span className="mt-1 text-[12px] leading-snug text-white/70">
            Il propose, vous décidez. {aiStatus?.provider === "anthropic" ? "Propulsé par Claude." : "Mode démo."}
          </span>
          <span className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-white text-[12.5px] font-semibold text-[#0B2A45] transition-transform group-hover:scale-[1.02]">
            Poser une question
          </span>
        </button>
      </div>
    </div>
  );
}
