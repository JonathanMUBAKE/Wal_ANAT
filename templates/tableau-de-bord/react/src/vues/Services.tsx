import { useMemo, useState } from "react";
import { BarreMini, Bouton, Carte, Entete, ItemMenu, Jauge, Jeton, LigneStat, Menu, Pastille, SelecteurPeriode, TraitMenu } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { TableauDonnees, type Colonne } from "../composants/TableauDonnees";
import { Definitions, useUI } from "../composants/Superpositions";
import { cx, exporterCSV, fmt, normaliser } from "../lib/format";
import { servicesSIGRH, type ServiceSIGRH } from "../lib/sigrh";

/* Services : l'état des douze briques qui composent le SIGRH. Le tableau sert
   à repérer, les actions à agir. Chaque geste qui touche la production passe
   par une confirmation, et les gestes destructeurs font retaper le nom. */
export function Services() {
  const ui = useUI();
  const [services, poserServices] = useState<ServiceSIGRH[]>(servicesSIGRH);
  const [q, poserQ] = useState("");
  const [etat, poserEtat] = useState("");
  const [periode, poserPeriode] = useState("1 h");
  const [vue, poserVue] = useState<"tableau" | "cartes">("tableau");

  const filtres = useMemo(() => {
    const n = normaliser(q.trim());
    return services.filter((s) =>
      (!n || normaliser(`${s.nom} ${s.role}`).includes(n)) && (!etat || s.etat === etat));
  }, [services, q, etat]);

  const enAlerte = services.filter((s) => s.etat === "critique").length;
  const aSurveiller = services.filter((s) => s.etat === "vigilance").length;
  const sousDimensionnes = services.filter((s) => s.instances < s.instancesVoulues);

  async function action(cle: string, s: ServiceSIGRH) {
    if (cle === "journaux") return ui.message(`Journaux de ${s.nom} ouverts dans l'explorateur.`, "info");
    if (cle === "console") return ui.message(`Console ouverte sur ${s.nom} — session enregistrée.`, "info");

    if (cle === "redemarrer") {
      const ok = await ui.confirmer({
        titre: `Redémarrer ${s.nom} ?`,
        texte: s.critique
          ? `Ce service est critique : ${s.role.toLowerCase()} sera interrompu de 20 à 60 secondes pour tous les agents. Les requêtes en cours seront perdues.`
          : `${s.role} sera interrompu une vingtaine de secondes. Les requêtes en cours seront rejouées.`,
        bouton: "Redémarrer", ton: "danger", mot: s.critique ? s.nom : undefined,
      });
      if (ok) {
        poserServices((l) => l.map((x) => x.nom === s.nom ? { ...x, redemarrages: x.redemarrages + 1, depuis: "0 j" } : x));
        ui.message(`Redémarrage de ${s.nom} lancé.`, "bon");
      }
      return;
    }

    if (cle === "monter" || cle === "descendre") {
      const cible = s.instances + (cle === "monter" ? 1 : -1);
      if (cible < 1) return ui.message("Il faut au moins une instance en service.", "critique");
      const ok = await ui.confirmer({
        titre: `Passer ${s.nom} à ${cible} instance${cible > 1 ? "s" : ""} ?`,
        texte: cle === "monter"
          ? "Une instance supplémentaire sera démarrée puis mise en rotation dès qu'elle répondra."
          : "Une instance sera drainée puis arrêtée. Vérifiez que la charge tient sur les restantes.",
        bouton: "Appliquer", ton: cle === "monter" ? "info" : "vigilance",
      });
      if (ok) {
        poserServices((l) => l.map((x) => x.nom === s.nom ? { ...x, instances: cible, instancesVoulues: cible } : x));
        ui.message(`${s.nom} : ${cible} instance${cible > 1 ? "s" : ""}.`, "bon");
      }
    }
  }

  function detail(s: ServiceSIGRH) {
    ui.ouvrirTiroir({
      titre: s.nom,
      sous: <span className="inline-flex items-center gap-2">
        <Pastille ton={s.etat} pulse={s.etat !== "bon"} />{s.role}
      </span>,
      onglets: [
        { nom: "État", contenu: (
          <>
            <Definitions lignes={[
              ["Rôle", s.role],
              ["Criticité", s.critique ? <Jeton ton="vigilance" enfants="critique pour le service" /> : <Jeton ton="neutre" enfants="courant" />],
              ["Version", <span className="font-mono">{s.version}</span>],
              ["Instances", `${s.instances} en service sur ${s.instancesVoulues} voulues`],
              ["Latence moyenne", `${s.latence} ms`],
              ["Taux d'erreur", `${s.erreurs} %`],
              ["Débit", `${fmt(s.debit)} requêtes/min`],
              ["Redémarrages (7 j)", String(s.redemarrages)],
              ["En service depuis", s.depuis],
            ]} />
            <div className="mt-4">
              <Jauge nom="Processeur" valeur={s.processeur} />
              <Jauge nom="Mémoire" valeur={s.memoire} />
            </div>
          </>
        )},
        { nom: "Actions", contenu: (
          <>
            <p className="text-[12px] text-encre-3 mb-3">Chaque action est journalisée au nom de l'opérateur connecté.</p>
            <div className="flex flex-col gap-2">
              <Bouton icone="terminal" onClick={() => action("journaux", s)} enfants="Ouvrir les journaux" />
              <Bouton icone="plus" onClick={() => action("monter", s)} enfants="Ajouter une instance" />
              <Bouton icone="pause" onClick={() => action("descendre", s)} enfants="Retirer une instance" />
              <Bouton ton="danger" icone="rafraichir" onClick={() => action("redemarrer", s)} enfants="Redémarrer le service" />
            </div>
          </>
        )},
      ],
    });
  }

  const colonnes: Colonne<ServiceSIGRH>[] = [
    { cle: "nom", nom: "Service", triable: true, fixe: true, rendu: (s) => (
      <div className="flex items-center gap-[9px] min-w-0">
        <Pastille ton={s.etat} pulse={s.etat !== "bon"} />
        <span className="flex flex-col min-w-0">
          <span className="font-mono text-[12.5px] font-semibold truncate">{s.nom}</span>
          <span className="text-[11.5px] text-encre-3 truncate">{s.role}</span>
        </span>
      </div>
    )},
    { cle: "version", nom: "Version", triable: true, rendu: (s) => <span className="font-mono text-encre-2">{s.version}</span> },
    { cle: "instances", nom: "Instances", num: true, triable: true, rendu: (s) => (
      <span className={cx("tab-num", s.instances < s.instancesVoulues && "text-vigilance font-semibold")}>
        {s.instances} / {s.instancesVoulues}
      </span>
    )},
    { cle: "latence", nom: "Latence", num: true, triable: true, rendu: (s) => (
      <span className={cx("tab-num", s.latence > 350 ? "text-critique" : s.latence > 240 ? "text-vigilance" : "")}>{s.latence} ms</span>
    )},
    { cle: "erreurs", nom: "Erreurs", num: true, triable: true, rendu: (s) => (
      <span className={cx("tab-num", s.erreurs > 2 ? "text-critique" : s.erreurs > 0.8 ? "text-vigilance" : "")}>{s.erreurs} %</span>
    )},
    { cle: "debit", nom: "Débit", num: true, triable: true, rendu: (s) => <span className="tab-num">{fmt(s.debit)}/min</span> },
    { cle: "processeur", nom: "Processeur", num: true, triable: true, rendu: (s) => (
      <span className="inline-flex items-center gap-2 justify-end">
        <BarreMini valeur={s.processeur} ton={s.processeur > 85 ? "critique" : s.processeur > 70 ? "vigilance" : "accent"} largeur={54} />
        <span className="tab-num w-[34px] text-right">{s.processeur} %</span>
      </span>
    )},
    { cle: "depuis", nom: "Depuis", num: true, triable: true, rendu: (s) => <span className="tab-num text-encre-2">{s.depuis}</span> },
  ];

  return (
    <>
      <Entete
        titre="Services"
        sous="Les briques qui composent le SIGRH, leur santé et les gestes d'exploitation."
        actions={
          <>
            <SelecteurPeriode options={["1 h", "24 h", "7 j"]} valeur={periode} surChoix={poserPeriode} />
            <div className="inline-flex bg-surface-2 border border-bordure rounded-[4px] p-[2px] gap-[2px]">
              {(["tableau", "cartes"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={vue === v} onClick={() => poserVue(v)}
                  className={cx("h-[26px] px-[10px] rounded-[4px] text-[12px] transi",
                    vue === v ? "bg-surface text-encre shadow-nulle font-semibold" : "text-encre-3 hover:text-encre")}>
                  {v === "tableau" ? "Tableau" : "Cartes"}
                </button>
              ))}
            </div>
            <Bouton icone="telecharger" onClick={() => { exporterCSV("services", filtres); ui.message("État des services exporté.", "bon"); }} enfants="Exporter" />
          </>
        }
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Services déclarés" valeur={fmt(services.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En bonne santé" valeur={fmt(services.length - enAlerte - aSurveiller)} ton="bon" />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="À surveiller" valeur={fmt(aSurveiller)} ton={aSurveiller ? "vigilance" : undefined} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="En alerte" valeur={fmt(enAlerte)} ton={enAlerte ? "critique" : "bon"} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Instances manquantes" valeur={fmt(sousDimensionnes.length)} ton={sousDimensionnes.length ? "vigilance" : "bon"} />} />
      </div>

      {sousDimensionnes.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-[4px] mb-4 bg-vigilance-voile border border-vigilance/40 anim-apparait">
          <Icone nom="alerte" className="text-vigilance mt-[2px]" />
          <div className="flex-1 min-w-0 text-[13px]">
            <b>{sousDimensionnes.length} service{sousDimensionnes.length > 1 ? "s tournent" : " tourne"} avec moins d'instances que prévu.</b>{" "}
            <span className="text-encre-2">{sousDimensionnes.map((s) => s.nom).join(", ")} — la charge tient, mais il n'y a plus de marge.</span>
          </div>
          <Bouton taille="s" onClick={() => ui.message("Remise à niveau demandée pour tous les services concernés.", "bon")} enfants="Remettre à niveau" />
        </div>
      )}

      {vue === "cartes" ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {filtres.map((s, i) => (
            <Carte key={s.nom} className={cx("anim-entre", s.etat === "critique" && "border-critique/50")} enfants={
              <div className="pas-carte" style={{ animationDelay: i * 25 + "ms" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Pastille ton={s.etat} pulse={s.etat !== "bon"} />
                  <button type="button" onClick={() => detail(s)} className="min-w-0 flex-1 text-left">
                    <div className="font-mono text-[12.5px] font-semibold truncate">{s.nom}</div>
                    <div className="text-[11px] text-encre-3 truncate">{s.role}</div>
                  </button>
                  <MenuService s={s} action={action} detail={detail} />
                </div>
                <LigneStat etiquette="Latence" valeur={`${s.latence} ms`} ton={s.latence > 350 ? "critique" : s.latence > 240 ? "vigilance" : undefined} />
                <LigneStat etiquette="Erreurs" valeur={`${s.erreurs} %`} ton={s.erreurs > 2 ? "critique" : s.erreurs > 0.8 ? "vigilance" : undefined} />
                <LigneStat etiquette="Instances" valeur={`${s.instances} / ${s.instancesVoulues}`} ton={s.instances < s.instancesVoulues ? "vigilance" : undefined} />
                <div className="mt-2">
                  <Jauge nom="Processeur" valeur={s.processeur} />
                  <Jauge nom="Mémoire" valeur={s.memoire} />
                </div>
              </div>
            } />
          ))}
        </div>
      ) : (
        <Carte enfants={
          <TableauDonnees
            lignes={filtres} colonnes={colonnes} cle={(s) => s.nom}
            totalBrut={services.length} nomEntite={["service", "services"]}
            triInitial={{ cle: "latence", sens: "desc" }}
            surLigne={detail}
            barreOutils={
              <>
                <div className="flex items-center gap-2 h-8 px-[10px] min-w-[230px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 focus-within:border-accent transi">
                  <Icone nom="recherche" taille="s" />
                  <input type="search" value={q} onChange={(e) => poserQ(e.target.value)}
                    placeholder="Nom ou rôle du service…" aria-label="Rechercher un service"
                    className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
                </div>
                <select value={etat} onChange={(e) => poserEtat(e.target.value)} aria-label="Filtrer par état"
                  className="h-8 px-[10px] rounded-[4px] bg-surface-2 border border-bordure text-encre text-[13px]">
                  <option value="">Tous les états</option>
                  <option value="bon">En bonne santé</option>
                  <option value="vigilance">À surveiller</option>
                  <option value="critique">En alerte</option>
                </select>
              </>
            }
            actionsLigne={(s) => (
              <>
                <Bouton ton="fantome" taille="s" icone="terminal" title="Journaux" onClick={() => action("journaux", s)} />
                <Bouton ton="fantome" taille="s" icone="rafraichir" title="Redémarrer" onClick={() => action("redemarrer", s)} />
                <Bouton ton="fantome" taille="s" icone="oeil" title="Détail" onClick={() => detail(s)} />
              </>
            )}
            actionsLot={(ids, vider) => (
              <>
                <Bouton taille="s" icone="rafraichir" onClick={async () => {
                  const ok = await ui.confirmer({
                    titre: `Redémarrer ${ids.length} services ?`,
                    texte: "Les redémarrages s'enchaînent un par un, avec attente du rétablissement entre chaque. L'opération est journalisée.",
                    bouton: "Redémarrer en série", ton: "danger", mot: "REDEMARRER",
                  });
                  if (ok) { vider(); ui.message(`Redémarrage en série de ${ids.length} services lancé.`, "bon"); }
                }} enfants="Redémarrer" />
                <Bouton taille="s" icone="telecharger" onClick={() => {
                  exporterCSV("services-selection", services.filter((s) => ids.includes(s.nom)));
                  ui.message(`${ids.length} services exportés.`, "bon");
                }} enfants="Exporter" />
              </>
            )}
          />
        } />
      )}
    </>
  );
}

function MenuService({ s, action, detail }: {
  s: ServiceSIGRH; action: (cle: string, s: ServiceSIGRH) => void; detail: (s: ServiceSIGRH) => void;
}) {
  return (
    <Menu
      declencheur={({ basculer }) => (
        <Bouton ton="fantome" taille="s" icone="points" aria-label={"Actions sur " + s.nom} onClick={basculer} />
      )}
      enfants={(fermer) => (
        <>
          <ItemMenu icone="oeil" onClick={() => { fermer(); detail(s); }} enfants="Voir le détail" />
          <ItemMenu icone="terminal" onClick={() => { fermer(); action("journaux", s); }} enfants="Ouvrir les journaux" />
          <ItemMenu icone="plus" onClick={() => { fermer(); action("monter", s); }} enfants="Ajouter une instance" />
          <ItemMenu icone="pause" onClick={() => { fermer(); action("descendre", s); }} enfants="Retirer une instance" />
          <TraitMenu />
          <ItemMenu icone="rafraichir" danger onClick={() => { fermer(); action("redemarrer", s); }} enfants="Redémarrer" />
        </>
      )}
    />
  );
}
