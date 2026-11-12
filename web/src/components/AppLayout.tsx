import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Sidebar, TopBar } from "./Sidebar";
import { TaskDrawer } from "./TaskDrawer";
import { Assistant } from "./Assistant";
import { CommandPalette } from "./CommandPalette";
import { NewProjectDialog, QuickAddDialog } from "./dialogs";
import { PendingInvitations } from "./PendingInvitations";
import { PlatformBanner } from "@/pages/AdminPlus";
import { Spinner } from "./ui";
import { useLiveUpdates, useMe } from "@/lib/hooks";
import { ShellProvider, useShell } from "@/lib/shell";
import { ApiError } from "@/lib/api";

export function AppLayout() {
  const me = useMe();
  const loc = useLocation();
  useLiveUpdates(!!me.data);
  if (me.isLoading)
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  if (me.error && (me.error as ApiError).status === 401) return <Navigate to="/login" replace />;
  if (me.error) return <div className="p-8 text-danger">{(me.error as Error).message}</div>;
  // Un administrateur système n'appartient pas forcément à une organisation
  if (me.data && !me.data.orgs.length && !["/admin", "/account"].includes(loc.pathname))
    return <Navigate to={me.data.platform_role ? "/admin" : "/account"} replace />;
  return (
    <ShellProvider>
      <Shell />
    </ShellProvider>
  );
}

function MfaReminder() {
  const { data } = useMe();
  if (!data?.mfa_required) return null;
  return (
    <p className="shrink-0 border-b border-line bg-panel px-4 py-2 text-[13px]">
      Pour administrer, activez d'abord la double authentification.{" "}
      <Link to="/account" className="font-medium underline">
        Configurer
      </Link>
    </p>
  );
}

function Shell() {
  const shell = useShell();
  const [mobileNav, setMobileNav] = useState(false);
  const loc = useLocation();
  useEffect(() => setMobileNav(false), [loc.pathname]);
  return (
    <div className="flex h-full">
      <aside className="hidden w-[256px] shrink-0 border-r border-line bg-panel lg:block">
        <Sidebar />
      </aside>
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              key="s"
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
            />
            <motion.aside
              key="n"
              className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-line bg-panel shadow-lg lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
            >
              <Sidebar onNavigate={() => setMobileNav(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setMobileNav(true)} />
        <PlatformBanner />
        <MfaReminder />
        <PendingInvitations />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Fondu de page : un changement d'onglet dans un même projet ne relance pas l'animation */}
          <motion.div
            key={loc.pathname.split("/").slice(0, 3).join("/")}
            className="h-full"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>

      <TaskDrawer taskId={shell.taskId} onClose={shell.closeTask} onOpenTask={shell.openTask} />
      <Assistant />
      <CommandPalette />
      <NewProjectDialog />
      <QuickAddDialog />
    </div>
  );
}
