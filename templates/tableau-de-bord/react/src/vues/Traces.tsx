import { useMemo, useState } from "react";
import { Bouton, Carte, Entete, Jeton, LigneStat, SelecteurPeriode } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, fmt, normaliser } from "../lib/format";
import { traces, type SegmentTrace, type Trace } from "../lib/sigrh";

/* Traces : le détail d'une requête lente, segment par segment. La cascade
   répond à la seule question qui compte — où le temps est passé. */
export function Traces() {
  const ui = useUI();
  const [q, poserQ] = useState("");
  const [service, poserService] = useState("");
  const [seuil, poserSeuil] = useState(0);
  const [periode, poserPeriode] = useState("1 h");

  const services = useMemo(() => [...new Set(traces.map((t) => t.service))].sort(), []);
  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return traces.filter((t) =>
      (!n || normaliser(`${t.operation} ${t.service} ${t.agent} ${t.id}`).includes(n)) &&
      (!service || t.service === service) && t.duree >= seuil);
  }, [q, service, seuil]);

  const erreurs = traces.filter((t) => t.etat === "erreur").length;
  const triees = [...traces].sort((a, b) => a.duree - b.duree);
  const p50 = triees[Math.floor(triees.length * 0.5)].duree;
  const p95 = triees[Math.floor(triees.length * 0.95)].duree;
  const p99 = triees[Math.min(triees.length - 1, Math.floor(triees.length * 0.99))].duree;

  function detail(t: Trace) {
    ui.ouvrirTiroir({
      titre: t.operation,
      sous: <><span className="font-mono">{t.id}</span> · {t.duree} ms</>,
      onglets: [
        { nom: "Cascade", contenu: <Cascade trace={t} /> },
        { nom: "Contexte", contenu: (
          <Definitions lignes={[
            ["Opération", <span className="font-mono">{t.operation}</span>],
            ["Service d'entrée", <span className="font-mono">{t.service}</span>],
            ["Durée totale", `${fmt(t.duree)} ms`],
            ["Segments", String(t.segments)],
            ["Code de réponse", <span className={t.code >= 500 ? "text-critique font-semibold" : ""}>{t.code}</span>],
            ["Agent à l'origine", t.agent],
            ["Quand", t.quand],
          ]} />
        )},
      ],
      pied: (
        <>
          <Bouton icone="terminal" onClick={() => ui.message("Journaux filtrés sur cette requête.", "info")} enfants="Journaux de la requête" />
          <Bouton className="ml-auto" icone="alerte"
            onClick={() => ui.message("Alerte créée : seuil de latence sur cette opération.", "bon")} enfants="Créer une alerte" />
        </>
      ),
    });
  }

  const colonnes: Colonne<Trace>[] = [
    { cle: "operation", nom: "Opération", triable: true, fixe: true, rendu: (t) => (
      <div className="flex items-center gap-2 min-w-0">
        <Jeton ton={t.etat === "erreur" ? "critique" : "bon"} enfants={String(t.code)} />
        <span className="font-mono text-[12.5px] truncate">{t.operation}</span>
      </div>
    )},
    { cle: "service", nom: "Service", triable: true, rendu: (t) => <span className="font-mono text-encre-2">{t.service}</span> },
    { cle: "duree", nom: "Durée", num: true, triable: true, rendu: (t) => (
      <span className={cx("tab-num font-semibold", t.duree > 1500 ? "text-critique" : t.duree > 600 ? "text-vigilance" : "")}>
        {fmt(t.duree)} ms
      </span>
    )},
    { cle: "repartition", nom: "Répartition", rendu: (t) => (
      <div className="flex gap-[1px] h-[12px] w-[140px] rounded-[2px] overflow-hidden bg-surface-3">
        {t.cascade.slice(0, 6).map((s, i) => (
          <span key={i} title={`${s.nom} — ${s.duree} ms`}
            style={{ flex: s.duree, background: `var(--serie-${(i % 7) + 1})` }} />
        ))}
      </div>
    )},
    { cle: "segments", nom: "Segments", num: true, triable: true, rendu: (t) => t.segments },
    { cle: "agent", nom: "À l'origine", triable: true, rendu: (t) => <span className="text-encre-2">{t.agent}</span> },
    { cle: "quand", nom: "Quand", triable: true, rendu: (t) => <span className="text-encre-3 whitespace-nowrap">{t.quand}</span> },
  ];

  return (
    <>
      <Entete
        titre="Traces"
        sous="Le détail des requêtes les plus lentes, segment par segment : où le temps est passé."
        actions={
          <>
            <SelecteurPeriode options={["1 h", "6 h", "24 h"]} valeur={periode} surChoix={poserPeriode} />
            <Bouton icone="telecharger" onClick={() => { exporterCSV("traces", filtres.map(({ cascade, ...r }) => ({ ...r, segments: cascade.length }))); ui.message("Traces exportées.", "bon"); }} enfants="Exporter" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Traces collectées" valeur={fmt(traces.length * 142)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Médiane (p50)" valeur={`${fmt(p50)} ms`} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="p95" valeur={`${fmt(p95)} ms`} ton={p95 > 800 ? "vigilance" : undefined} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="p99" valeur={`${fmt(p99)} ms`} ton={p99 > 1500 ? "critique" : "vigilance"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Requêtes en erreur" valeur={`${Math.round((erreurs / traces.length) * 100)} %`} ton={erreurs ? "critique" : "bon"} />} />
      </div>

      <Carte enfants={
        <TableauDonnees
          lignes={filtres} colonnes={colonnes} cle={(t) => t.id}
          totalBrut={traces.length} nomEntite={["trace", "traces"]}
          triInitial={{ cle: "duree", sens: "desc" }}
          surLigne={detail}
          vide={{ titre: "Aucune trace", texte: "Aucune requête ne dépasse ce seuil sur la période observée." }}
          barreOutils={
            <>
              <div className="flex items-center gap-2 h-8 px-[10px] min-w-[240px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                <Icone nom="recherche" taille="s" />
                <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                  placeholder="Opération, service, agent, identifiant…" aria-label="Rechercher une trace"
                  className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
              </div>
              <select value={service} onChange={(e) => poserService(e.target.value)} aria-label="Filtrer par service"
                className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                <option value="">Tous les services</option>
                {services.map((s) => <option key={s}>{s}</option>)}
              </select>
              <label className="flex items-center gap-2 h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-[12px] text-encre-3">
                Plus lentes que
                <input type="range" min={0} max={2000} step={100} value={seuil}
                  onChange={(e) => poserSeuil(Number(e.target.value))} className="w-[90px] accent-[var(--accent)]" />
                <span className="tab-num text-encre w-[52px]">{seuil} ms</span>
              </label>
            </>
          }
          actionsLigne={(t) => (
            <Bouton ton="fantome" taille="s" icone="oeil" title="Voir la cascade" onClick={() => detail(t)} />
          )}
        />
      } />
    </>
  );
}

/* Cascade : chaque segment sur sa ligne, positionné dans le temps de la
   requête. Les barres sont à l'échelle — c'est tout l'intérêt. */
function Cascade({ trace }: { trace: Trace }) {
  const total = trace.duree;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-encre-3 mb-2 tab-num">
        <span>0 ms</span><span>{fmt(Math.round(total / 2))} ms</span><span>{fmt(total)} ms</span>
      </div>
      <div className="flex flex-col gap-[6px]">
        {trace.cascade.map((s: SegmentTrace, i) => {
          const gauche = (s.debut / total) * 100;
          const largeur = Math.max(1.5, (s.duree / total) * 100);
          return (
            <div key={i} className="anim-entre" style={{ animationDelay: i * 35 + "ms" }}>
              <div className="flex items-baseline gap-2 text-[12px] mb-[2px]">
                <span className="text-encre">{s.nom}</span>
                <span className="font-mono text-[11px] text-encre-4 truncate">{s.service}</span>
                <span className="ml-auto tab-num text-encre-2">{s.duree} ms</span>
              </div>
              <div className="h-[10px] rounded-[2px] bg-surface-3 relative overflow-hidden">
                <span className="absolute top-0 bottom-0 rounded-[2px]"
                  style={{ left: gauche + "%", width: largeur + "%", background: `var(--serie-${(i % 7) + 1})` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-encre-3 mt-4">
        Les segments se recouvrent quand les appels partent en parallèle. Le plus long segment porte
        l'essentiel du temps : c'est lui qu'il faut traiter, pas la somme des autres.
      </p>
    </div>
  );
}
