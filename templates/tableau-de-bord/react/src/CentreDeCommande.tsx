import { useCallback, useEffect, useMemo, useState } from "react";
import { PanneauSection, RailApplications } from "./composants/Rail";
import { BarreSuperieure } from "./composants/BarreSuperieure";
import { PaletteCommandes, type Commande } from "./composants/PaletteCommandes";
import { ResumeGroupe } from "./composants/ResumeGroupe";
import { Kbd } from "./composants/Primitives";
import { TransitionVue } from "./composants/Mouvement";
import { Definitions, FournisseurUI, useUI } from "./composants/Superpositions";
import { ContexteApp } from "./lib/contexte";
import { groupeDe, NAVIGATION, trouverEntree } from "./lib/navigation";
import { usePreference } from "./lib/preferences";
import { audit, notificationsInitiales, type Notification } from "./lib/donnees";
import { exporterCSV } from "./lib/format";

import { Apercu } from "./vues/Apercu";
import { Activite } from "./vues/Activite";
import { BandeauGabarit } from "./composants/Distant";
import { Controles } from "./vues/Controles";
import { Dormance } from "./vues/Dormance";
import { Approbations } from "./vues/Approbations";
import { GardeFous } from "./vues/GardeFous";
import { Utilisateurs } from "./vues/Utilisateurs";
import { Droits } from "./vues/Droits";
import { Sessions } from "./vues/Sessions";
import { Parametres } from "./vues/Parametres";
import { Audit } from "./vues/Audit";
import { AgentsIA } from "./vues/AgentsIA";
import { Canaux } from "./vues/Canaux";
import { Envois } from "./vues/Envois";
import { Securite } from "./vues/Securite";
import { ActionsCritiques } from "./vues/ActionsCritiques";

const RACCOURCIS: Array<[string, string]> = [
  ["Ctrl K", "Palette de commandes"], ["Ctrl B", "Replier le panneau de section"],
  ["T", "Basculer le thème"], ["D", "Changer la densité"],
  ["G puis O", "Vue d'ensemble"], ["G puis U", "Utilisateurs"], ["G puis J", "Journaux"],
  ["G puis A", "Alertes"], ["G puis D", "Rôles et droits"], ["G puis S", "Services"],
  ["G puis H", "Santé du serveur"], ["G puis B", "Base de données"],
  ["G puis I", "Agents IA"], ["G puis M", "Connecteurs MCP"], ["G puis C", "Canaux d'envoi"],
  ["G puis P", "Portefeuille"], ["G puis R", "Courrier"],
  ["G puis E", "Registre des décisions"], ["G puis V", "Signataire"],
  ["Échap", "Fermer la superposition"], ["?", "Afficher cette aide"],
];

export function Application() {
  return <FournisseurUI enfants={<Coquille />} />;
}

function Coquille() {
  const ui = useUI();
  const [theme, poserTheme] = usePreference("theme", "clair", "data-theme");
  const [densite, poserDensite] = usePreference("densite", "normale", "data-densite");
  const [replie, poserReplie] = usePreference("panneau", "deplie");
  const [vue, poserVue] = useState(() => {
    const h = location.hash.slice(1);
    return trouverEntree(h) ? h : "apercu";
  });
  const [groupe, poserGroupe] = useState(() => groupeDe(vue)?.groupe ?? NAVIGATION[0].groupe);
  const [mobileOuvert, poserMobile] = useState(false);
  const [palette, poserPalette] = useState(false);
  const [notifications, poserNotifications] = useState<Notification[]>(notificationsInitiales);

  const entree = trouverEntree(vue);

  const aller = useCallback((cle: string) => {
    if (!trouverEntree(cle)) return;
    poserMobile(false);
    const g = groupeDe(cle);
    if (g) poserGroupe(g.groupe);
    if (location.hash.slice(1) === cle) poserVue(cle);
    else location.hash = cle;
  }, []);

  /* L'adresse pilote la vue : précédent / suivant du navigateur fonctionnent,
     et une adresse collée ouvre directement la bonne page. */
  useEffect(() => {
    const surChangement = () => {
      const cle = location.hash.slice(1);
      if (!trouverEntree(cle)) return;
      poserVue(cle);
      const g = groupeDe(cle);
      if (g) poserGroupe(g.groupe);
    };
    window.addEventListener("hashchange", surChangement);
    return () => window.removeEventListener("hashchange", surChangement);
  }, []);

  useEffect(() => {
    if (entree) document.title = `${entree.nom} — SIGRH`;
  }, [entree]);

  const basculerTheme = useCallback(() => poserTheme(theme === "sombre" ? "clair" : "sombre"), [theme, poserTheme]);
  const basculerDensite = useCallback(() => poserDensite(densite === "normale" ? "compacte" : "normale"), [densite, poserDensite]);
  const basculerReplie = useCallback(() => poserReplie(replie === "replie" ? "deplie" : "replie"), [replie, poserReplie]);

  const raccourcis = useCallback(() => ui.ouvrirTiroir({
    titre: "Raccourcis clavier",
    sous: "Tout ce qui se fait à la souris doit se faire au clavier.",
    onglets: [{
      nom: "Tous",
      contenu: <Definitions lignes={RACCOURCIS.map(([k, t]): [React.ReactNode, React.ReactNode] => [<Kbd key={k} enfants={k} />, t])} />,
    }],
  }), [ui]);

  const maintenance = useCallback(async () => {
    const ok = await ui.confirmer({
      titre: "Passer la plateforme en maintenance ?",
      texte: "Tous les agents non administrateurs verront une page d'indisponibilité. Les traitements en cours sont menés à leur terme, puis les files sont gelées.",
      bouton: "Activer la maintenance", ton: "vigilance", mot: "MAINTENANCE",
    });
    if (ok) ui.message("Mode maintenance activé — bandeau visible par tous les administrateurs.", "bon");
  }, [ui]);

  const exporter = useCallback(() => {
    exporterCSV("journal-audit", audit);
    ui.message("Export du journal d'audit lancé.", "bon");
  }, [ui]);

  const commandes = useMemo<Commande[]>(() => [
    { famille: "Actions", nom: "Basculer le thème", sous: "T", icone: "lune", faire: basculerTheme },
    { famille: "Actions", nom: "Changer la densité", sous: "D", icone: "colonnes", faire: basculerDensite },
    { famille: "Actions", nom: "Replier le panneau de section", sous: "Ctrl B", icone: "chevronGauche", faire: basculerReplie },
    { famille: "Actions", nom: "Exporter le journal d'audit", icone: "telecharger", faire: exporter },
    { famille: "Actions", nom: "Imprimer / enregistrer en PDF", sous: "Ctrl P", icone: "rapport", faire: () => window.print() },
    { famille: "Actions", nom: "Mettre la plateforme en maintenance", icone: "puissance", faire: maintenance },
    { famille: "Actions", nom: "Afficher les raccourcis clavier", sous: "?", icone: "clavier", faire: raccourcis },
  ], [basculerTheme, basculerDensite, basculerReplie, exporter, maintenance, raccourcis]);

  useEffect(() => {
    let sequence = "";
    let minuteur: number | undefined;
    const h = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement;
      const saisie = /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName) || cible.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); poserPalette(true); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); basculerReplie(); return; }
      if (saisie || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "?") { e.preventDefault(); raccourcis(); return; }
      if (e.key === "/") { e.preventDefault(); poserPalette(true); return; }

      const k = e.key.toLowerCase();
      if (sequence === "g") {
        sequence = "";
        const cle = {
          o: "apercu", u: "utilisateurs", j: "journaux", a: "alertes",
          d: "droits", s: "services", h: "sante", b: "basededonnees",
          i: "agents", m: "mcp", c: "canaux",
          p: "portefeuille", r: "courrier", e: "decisions", v: "signataire",
          x: "securite", n: "anomalies", l: "collecte", k: "incidents",
          t: "console", y: "capacite",
        }[k];
        if (cle) { e.preventDefault(); aller(cle); }
        return;
      }
      if (k === "g") { sequence = "g"; window.clearTimeout(minuteur); minuteur = window.setTimeout(() => (sequence = ""), 1200); return; }
      if (k === "t") basculerTheme();
      if (k === "d") basculerDensite();
    };
    window.addEventListener("keydown", h);
    return () => { window.removeEventListener("keydown", h); window.clearTimeout(minuteur); };
  }, [aller, basculerTheme, basculerDensite, basculerReplie, raccourcis]);

  const contexte = useMemo(
    () => ({ theme, densite, periode: "24 h", vue, aller }), [theme, densite, vue, aller]);

  return (
    <ContexteApp.Provider value={contexte}>
      <div className="flex h-full">
        <RailApplications
          groupeActif={groupe}
          surChoixGroupe={(g) => {
            poserGroupe(g);
            poserMobile(true);
            const premiere = NAVIGATION.find((x) => x.groupe === g)?.entrees[0];
            if (premiere) aller(premiere.cle);
          }}
          replie={replie === "replie"} basculerRepli={basculerReplie}
          ouvrirPalette={() => poserPalette(true)} raccourcis={raccourcis}
        />

        <PanneauSection
          groupe={groupe} vue={vue} aller={aller}
          replie={replie === "replie"} ouvertMobile={mobileOuvert}
          resume={<ResumeGroupe groupe={groupe} aller={aller} />}
        />

        <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
          <BarreSuperieure
            installation="SIGRH — Production"
            etatInstallation={{ ton: "vigilance", texte: "incident en cours" }}
            theme={theme} basculerTheme={basculerTheme}
            densite={densite} basculerDensite={basculerDensite}
            ouvrirPalette={() => poserPalette(true)} ouvrirMenuMobile={() => poserMobile((o) => !o)}
            notifications={notifications}
            toutLu={() => poserNotifications((l) => l.map((n) => ({ ...n, lu: true })))}
            ouvrirNotification={(n) => {
              poserNotifications((l) => l.map((x) => x.id === n.id ? { ...x, lu: true } : x));
              aller("alertes");
            }}
            exporter={exporter} maintenance={maintenance} raccourcis={raccourcis}
          />

          <main className="flex-1 overflow-y-auto p-4 [overscroll-behavior:contain]">
            <TransitionVue cle={vue}>
              <div className="max-w-[1600px]">
                <><BandeauGabarit cle={vue} /><Vue cle={vue} aller={aller} /></>
              </div>
            </TransitionVue>
          </main>
        </div>
      </div>

      {mobileOuvert && (
        <div className="fixed inset-0 z-84 bg-black/55 md:hidden" onClick={() => poserMobile(false)} />
      )}

      <PaletteCommandes ouverte={palette} fermer={() => poserPalette(false)} aller={aller} actions={commandes} />
    </ContexteApp.Provider>
  );
}

/* Un seul endroit qui associe une clé de navigation à son écran. */
function Vue({ cle, aller }: { cle: string; aller: (c: string) => void }) {
  switch (cle) {
    case "apercu": return <Apercu aller={aller} />;
    case "activite": return <Activite />;
    case "dormance": return <Dormance aller={aller} />;
    case "controles": return <Controles />;
    case "approbations": return <Approbations />;
    case "gardefous": return <GardeFous />;
    case "utilisateurs": return <Utilisateurs />;
    case "droits": return <Droits />;
    case "sessions": return <Sessions />;
    case "parametres": return <Parametres />;
    case "audit": return <Audit />;
    case "agents": return <AgentsIA />;
    case "canaux": return <Canaux />;
    case "envois": return <Envois />;
    case "securite": return <Securite aller={aller} />;
    case "gestes": return <ActionsCritiques />;
    default: return null;
  }
}
