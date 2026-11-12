import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";

// Règle 14 (docs/DESIGN-SYSTEM.md § 5.5) : un échec reste affiché, avec sa croix, jusqu'à ce que la personne le ferme
const showError = toast.error;
toast.error = ((message, data) =>
  showError(message, { duration: Number.POSITIVE_INFINITY, closeButton: true, ...data })) as typeof toast.error;
import { MotionConfig } from "motion/react";
import "@fontsource-variable/geist/wght.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./styles.css";
import { queryClient } from "./lib/hooks";
import { TooltipProvider } from "./components/ui";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/Login";
import { HomePage } from "./pages/Home";
import { MyTasksPage } from "./pages/MyTasks";
import { UnitPage } from "./pages/Unit";
import { AgentPage, HrPage } from "./pages/Hr";
import { InboxPage } from "./pages/Inbox";
import { AgentsPage } from "./pages/Agents";
import { ProjectPage } from "./pages/Project";
import { OrganizationPage } from "./pages/Organization";
import { TeamPage, TeamsPage } from "./pages/Teams";
import { ActivationPage, ResetPage } from "./pages/AccountLinks";
import { AccountPage } from "./pages/Account";
import { AdminPage } from "./pages/Admin";
import { MeetingPage, MeetingsPage } from "./pages/Meetings";
import { PilotagePage } from "./pages/Pilotage";
import { DirectionPage } from "./pages/Direction";
import { DecisionsPage } from "./pages/Decisions";
import { PartnerPage, PartnersPage } from "./pages/Partners";
import { AgreementPage, AgreementsPage } from "./pages/Agreements";
import { ReconcilePage } from "./pages/PartnerLinks";
import { AttributionsPage } from "./pages/Attributions";
import { PlanPage, PlansPage } from "./pages/Plans";
import { CourrierPage, ParapheurPage } from "./pages/Parapheur";
import { ActivitiesPage, ActivityPage } from "./pages/Activities";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/activation" element={<ActivationPage />} />
                <Route path="/reinitialisation" element={<ResetPage />} />
                <Route element={<AppLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="my-tasks" element={<MyTasksPage />} />
                  <Route path="entite" element={<UnitPage />} />
                  <Route path="rh" element={<HrPage />} />
                  <Route path="rh/:id" element={<AgentPage />} />
                  <Route path="mon-dossier" element={<AgentPage self />} />
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="ai" element={<AgentsPage />} />
                  <Route path="org" element={<OrganizationPage />} />
                  <Route path="account" element={<AccountPage />} />
                  <Route path="admin" element={<AdminPage />} />
                  <Route path="attributions" element={<AttributionsPage />} />
                  <Route path="plans" element={<PlansPage />} />
                  <Route path="plans/:id" element={<PlanPage />} />
                  {/* Les livrables vivent dans leur projet ; l'ancienne adresse mène à « Mes tâches » */}
                  <Route path="livrables" element={<Navigate to="/my-tasks" replace />} />
                  <Route path="parapheur" element={<ParapheurPage />} />
                  <Route path="courrier" element={<CourrierPage />} />
                  <Route path="pilotage" element={<PilotagePage />} />
                  <Route path="pilotage/directions/:id" element={<DirectionPage />} />
                  <Route path="decisions" element={<DecisionsPage />} />
                  <Route path="partenaires" element={<PartnersPage />} />
                  <Route path="partenaires/rapprochement" element={<ReconcilePage />} />
                  <Route path="partenaires/:id" element={<PartnerPage />} />
                  <Route path="conventions" element={<AgreementsPage />} />
                  <Route path="conventions/:id" element={<AgreementPage />} />
                  <Route path="activites" element={<ActivitiesPage />} />
                  <Route path="activites/:id" element={<ActivityPage />} />
                  <Route path="reunions" element={<MeetingsPage />} />
                  <Route path="reunions/:id" element={<MeetingPage />} />
                  <Route path="teams" element={<TeamsPage />} />
                  <Route path="teams/:id" element={<TeamPage />} />
                  <Route path="projects/:id/:view?" element={<ProjectPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </MotionConfig>
          <Toaster
            position="bottom-left"
            toastOptions={{ className: "!rounded-xl !border-line !bg-raised !text-fg !shadow-lg !text-[13px]" }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
