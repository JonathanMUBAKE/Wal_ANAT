import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Scale,
  CalendarDays,
  CalendarOff,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  CircleUser,
  ClipboardList,
  FileSignature,
  Gauge,
  Handshake,
  House,
  IdCard,
  Inbox,
  KeyRound,
  LogOut,
  Mail,
  Menu as MenuIcon,
  Moon,
  Network,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { Avatar, Button, Dialog, Kbd, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, cn } from "./ui";
import { useAiStatus, useApprovals, useCan, useMe, useMyUnits, useNotifications } from "@/lib/hooks";
import { useShell } from "@/lib/shell";
import { AvatarUpload } from "./AvatarUpload";
import { api } from "@/lib/api";

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

/** Section de navigation titrée en petites capitales, repliable et mémorisée sur le poste. */
function NavSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const key = `anat.nav.${title}`;
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(key) !== "0";
    } catch {
      return true;
    }
  });
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between px-5 pb-1.5">
        <button
          onClick={() => {
            setOpen(!open);
            try {
              localStorage.setItem(key, open ? "0" : "1");
            } catch {
              /* préférence non retenue */
            }
          }}
          aria-expanded={open}
          className="flex flex-1 items-center justify-between text-[11px] font-medium uppercase tracking-[0.07em] text-faint hover:text-muted"
        >
          {title}
          <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
        </button>
        {action}
      </div>
      {open && <nav className="space-y-0.5 px-3">{children}</nav>}
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: me } = useMe();
  const { data: approvals } = useApprovals();
  const { data: myUnits } = useMyUnits();
  const { data: aiStatus } = useAiStatus();
  const shell = useShell();
  const can = useCan();
  const currentOrg = me?.orgs.find((o) => o.id === me.org_id);
  // Le registre des risques : qui pilote ou gère les risques, et le responsable d'un risque pour les siens (RI-1)
  const risksPage = can("pilotage.view") || can("risks.manage") || can("indicators.manage");
  const { data: myRisks } = useQuery({
    queryKey: ["risks"],
    queryFn: () => api.get<unknown[]>("/api/risks"),
    enabled: !!me && !risksPage && currentOrg?.role !== "guest",
  });

  const link = (to: string, Icon: typeof House, label: string, badge?: number, ai?: boolean) => (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[13.5px] transition-colors",
          isActive ? "bg-brand-soft font-medium text-primary" : "text-fg/75 hover:bg-hover hover:text-fg",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn("size-[18px] shrink-0", ai && !isActive && "text-ai-fg", !isActive && !ai && "text-muted")}
            strokeWidth={isActive ? 2.1 : 1.75}
          />
          <span className="flex-1 truncate">{label}</span>
          {!!badge && (
            <span
              className={cn(
                "min-w-[20px] rounded-md px-1.5 text-center text-[11px] font-semibold tabular",
                ai ? "bg-ai-soft text-ai-fg" : "bg-brand-soft text-primary",
              )}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Marque : logo officiel, nom du produit, organisation */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5">
        <Logo size={28} />
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-tight tracking-[-0.01em]">ANAT Pilotage</span>
          <span className="block truncate text-[11.5px] text-muted">{currentOrg?.name ?? "Agence"}</span>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pt-3">
        <nav className="space-y-0.5 px-3">
          {link("/", House, "Accueil")}
          {link("/my-tasks", CheckCircle2, "Mes tâches")}
          {!!myUnits?.length && link("/entite", Users, "Mon entité")}
          {link("/mon-dossier", IdCard, "Mon dossier")}
          {link("/ai", Sparkles, "Coéquipiers IA", approvals?.length, true)}
        </nav>

        {/* Architecture : voir docs/ARCHITECTURE-INFORMATION.md — une information, un seul domicile */}
        <NavSection title="Pilotage">
          {can("pilotage.view") && link("/pilotage", Gauge, "Tableau de bord DG")}
          {(can("agenda.view") || can("projects.create")) && link("/activites", Briefcase, "Portefeuille")}
          {(can("decisions.view") || can("decisions.record")) && link("/decisions", Scale, "Décisions")}
          {can("meetings.view") && link("/reunions", CalendarDays, "Réunions")}
          {(risksPage || !!myRisks?.length) && link("/risques", ShieldAlert, "Risques et indicateurs")}
        </NavSection>

        {/* Livrables et contrats vivent dans leur projet (docs/PARCOURS-METIER.md) : plus de module à part */}
        {can("plans.view") && (
          <NavSection title="Suivi-évaluation">{link("/plans", ClipboardList, "Plans de travail")}</NavSection>
        )}

        {can("partners.view") && (
          <NavSection title="Partenariats">
            {link("/partenaires", Handshake, "Partenaires")}
            {link("/conventions", ScrollText, "Conventions")}
          </NavSection>
        )}

        {(can("signature.use") || can("correspondence.view") || currentOrg?.role !== "guest") && (
          <NavSection title="Secrétariat">
            {can("signature.use") && link("/parapheur", FileSignature, "Parapheur")}
            {(can("correspondence.view") || currentOrg?.role !== "guest") && link("/courrier", Mail, "Courrier")}
          </NavSection>
        )}

        <NavSection title="Organisation">
          {link("/org", Network, "Structure")}
          {link("/teams", Users, "Équipes")}
          {(can("hr.view") || can("hr.manage")) && link("/rh", IdCard, "Ressources humaines")}
          {currentOrg?.role !== "guest" && link("/conges", CalendarOff, "Congés et absences")}
          {me?.platform_role && link("/admin", ShieldCheck, "Administration système")}
          {/* Contrôle croisé (AD-1) : une autre personne que l'administrateur relit le journal de ses actions */}
          {can("audit.review") &&
            !me?.platform_role &&
            link("/controle-administration", ShieldCheck, "Contrôle de l'administration")}
        </NavSection>
      </div>

      <div className="border-t border-line p-3">
        <button
          onClick={() => shell.openAssistant()}
          className="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-ai-soft"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[conic-gradient(from_200deg,var(--ai),#4FB3F0,var(--ai))] text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">Assistant IA</span>
            <span className="block truncate text-[11.5px] text-muted">
              Il propose, vous décidez{aiStatus?.provider === "anthropic" ? "" : " · démo"}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

/** Barre du haut : recherche, accès rapides et compte, comme dans les modèles retenus. */
export function TopBar({ onMenu }: { onMenu: () => void }) {
  const shell = useShell();
  const nav = useNavigate();
  const { data: notifs } = useNotifications();
  const unread = notifs?.filter((n) => !n.read).length ?? 0;
  const box =
    "relative flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-line-strong bg-panel text-muted transition-colors hover:bg-hover hover:text-fg";
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-panel px-4 sm:px-6">
      <button aria-label="Menu" onClick={onMenu} className={cn(box, "lg:hidden")}>
        <MenuIcon className="size-[18px]" />
      </button>
      <button
        onClick={() => shell.setPalette(true)}
        className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border border-line-strong bg-panel px-3.5 text-[13px] text-faint transition-colors hover:border-faint/60 sm:max-w-[380px]"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Rechercher une réunion, un dossier, une personne…</span>
        <span className="hidden gap-0.5 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <button
          aria-label="Assistant IA"
          title="Assistant IA"
          onClick={() => shell.openAssistant()}
          className={cn(box, "hidden sm:flex")}
        >
          <Sparkles className="size-[18px] text-ai-fg" />
        </button>
        <button
          aria-label="Boîte de réception"
          title="Boîte de réception"
          onClick={() => nav("/inbox")}
          className={cn(box, "hidden sm:flex")}
        >
          <Inbox className="size-[18px]" />
        </button>
        <button aria-label="Notifications" title="Notifications" onClick={() => nav("/inbox")} className={box}>
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-panel">
              {unread}
            </span>
          )}
        </button>
        <AccountMenu />
      </div>
    </header>
  );
}

/** Pastille du compte : profil, sécurité, organisations, thème, déconnexion. */
function AccountMenu() {
  const { data: me } = useMe();
  const shell = useShell();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [profile, setProfile] = useState(false);
  const currentOrg = me?.orgs.find((o) => o.id === me.org_id);
  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <button className="flex h-10 items-center gap-2.5 rounded-[10px] border border-line-strong bg-panel py-1 pl-1.5 pr-2.5 text-left transition-colors hover:bg-hover">
            <Avatar user={me} size={28} />
            <span className="hidden min-w-0 md:block">
              <span className="block max-w-[160px] truncate text-[13px] font-medium leading-tight">
                {me?.name}
                <span className="font-normal text-faint">
                  {" "}
                  ({currentOrg ? (currentOrg.profile_name ?? ORG_ROLE[currentOrg.role]) : ""})
                </span>
              </span>
            </span>
            <ChevronDown className="size-4 text-faint" />
          </button>
        </MenuTrigger>
        <MenuContent align="end" className="w-[250px]">
          <div className="flex items-center gap-2.5 px-2 pb-2 pt-1.5">
            <Avatar user={me} size={32} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{me?.name}</p>
              <p className="truncate text-[11.5px] text-muted">{me?.title}</p>
            </div>
          </div>
          <MenuSeparator />
          <MenuItem icon={<CircleUser className="size-3.5" />} onSelect={() => setProfile(true)}>
            Mon profil
          </MenuItem>
          <MenuItem icon={<KeyRound className="size-3.5" />} onSelect={() => nav("/account")}>
            Sécurité du compte
          </MenuItem>
          {me?.platform_role && (
            <MenuItem icon={<ShieldCheck className="size-3.5" />} onSelect={() => nav("/admin")}>
              Administration système
            </MenuItem>
          )}
          {/* Version ANAT : une seule institution, pas de changement ni de création d'organisation (docs/PARAMETRAGE.md) */}
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
    </>
  );
}
