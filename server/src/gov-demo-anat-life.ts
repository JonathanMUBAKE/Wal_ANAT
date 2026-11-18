import { Attributions } from "./attributions.js";
import { Decisions } from "./decisions.js";
import { Partners } from "./partners.js";
import { Plans } from "./plans.js";
import { Registers } from "./registers.js";
import { localDate, type Services } from "./services.js";

/*
 * Démonstration ANAT, dernière couche (remarques D-7, R-9, DEC-7, C-6, RI-8, PT-8, PA-6, S-7 de
 * docs/ANALYSE-MODULES.md) : une agence vivante. Adresses à un domaine fictif propre à l'Agence ; comités rédigés par le
 * secrétariat de la DG et membres convoqués ; une dizaine de décisions issues de comités et de dossiers ; le secrétariat
 * tient le bureau d'ordre et répond ; risques rattachés aux projets ; plans pour toutes les directions ; partenaires
 * reliés au portefeuille ; fiches d'attributions pour les entités. Toutes les données sont fictives. Rejouable : ce qui
 * existe déjà n'est pas recréé.
 */
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const quiet = <T>(p: Promise<T>) => p.catch(() => undefined);
const MARK = "Calendrier des revues trimestrielles des plans";

export async function anatLife(svc: Services, org: string) {
  const db = svc.db;
  const id = async (sql: string, params: unknown[]) => (await db.one<{ id: string }>(sql, params))?.id ?? null;
  const project = (name: string) => id("SELECT id FROM projects WHERE org_id = $1 AND name = $2", [org, name]);
  const activity = (title: string) => id("SELECT id FROM agency_activities WHERE org_id = $1 AND title = $2", [org, title]);
  const unit = (name: string) => id("SELECT id FROM org_units WHERE org_id = $1 AND name = $2", [org, name]);
  const partner = (name: string) => id("SELECT id FROM partners WHERE org_id = $1 AND name = $2", [org, name]);

  // ---- D-7 : un domaine fictif propre à l'Agence
  await db.query(
    `UPDATE users SET email = replace(email, '@cadence.app', '@anat.example')
      WHERE email LIKE '%@cadence.app' AND id IN (SELECT user_id FROM org_members WHERE org_id = $1)`,
    [org],
  );
  await db.query(`UPDATE organizations SET domains = '["anat.example"]'::jsonb WHERE id = $1`, [org]);
  await db.query("UPDATE agent_records SET nationality = 'Congolaise' WHERE org_id = $1 AND nationality = 'Fictivienne'", [
    org,
  ]);

  // ---- R-9 : le secrétariat de la DG rédige les comités ; les membres du comité sont convoqués
  const writers: [string, string, string, string][] = [
    ["Comité de direction%", "u_ines", "Esther Mukendi", "EM"],
    ["Point d'étape des directions%", "u_ines", "Esther Mukendi", "EM"],
    ["Comité de pilotage des projets%", "u_theo", "Gaston Kalala", "GK"],
    ["Réunion avec les provinces%", "u_joseph", "Joseph Tshibangu", "JT"],
  ];
  for (const [type, w, name, initials] of writers)
    await db.query(
      `UPDATE meetings SET writer_id = $3, writer_name = $4, writer_initials = $5, chair_id = COALESCE(chair_id, 'u_alice')
        WHERE org_id = $1 AND meeting_type ILIKE $2 AND status IN ('planned', 'held', 'submitted')`,
      [org, type, w, name, initials],
    );
  const committee: [string, string, string][] = [
    ["u_alice", "Bernadette Mbuyi", "Directrice générale"],
    ["u_ines", "Esther Mukendi", "Assistante de direction"],
    ["u_albert", "Albert Mwamba", "Directeur technique"],
    ["u_hugo", "Didier Lukusa", "Directeur de la Communication et des Partenariats"],
    ["u_karim", "Fiston Banza", "Chef du département Ingénierie territoriale"],
    ["u_jeanpierre", "Jean-Pierre Kabongo", "Chef du département Études et Prospective"],
    ["u_sylvie", "Sylvie Kasongo", "Cheffe du service des ressources humaines"],
  ];
  const codirs = await db.query<{ id: string; past: boolean }>(
    "SELECT id, meeting_date < $2::date AS past FROM meetings WHERE org_id = $1 AND meeting_type ILIKE 'Comité de direction%'",
    [org, day()],
  );
  for (const m of codirs)
    for (const [i, [user, name, fn]] of committee.entries()) {
      const has = await db.one("SELECT 1 FROM meeting_attendees WHERE meeting_id = $1 AND user_id = $2", [m.id, user]);
      if (has) await db.query("UPDATE meeting_attendees SET invited = TRUE WHERE meeting_id = $1 AND user_id = $2", [m.id, user]);
      else
        await db.query(
          `INSERT INTO meeting_attendees (id, org_id, meeting_id, user_id, name, function_label, presence, invited)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
          [`att_codir_${m.id}_${user}`, org, m.id, user, name, fn, m.past && i === 6 ? "excuse" : "present"],
        );
    }

  // Le reste n'est créé qu'une fois : la décision repère sert de témoin
  if (await db.one("SELECT 1 FROM dg_decisions WHERE org_id = $1 AND title = $2", [org, MARK])) return;

  // ---- DEC-7 : une dizaine de décisions, issues de comités et de dossiers, confiées à plusieurs chefs
  const dec = new Decisions(svc);
  const codir = await id(
    "SELECT id FROM meetings WHERE org_id = $1 AND meeting_type ILIKE 'Comité de direction%' AND meeting_date < $2::date ORDER BY meeting_date DESC LIMIT 1",
    [org, day()],
  );
  const decisions: {
    who: string;
    title: string;
    content: string;
    ago: number;
    owner: string;
    due: number;
    project?: string;
    activity?: string;
    meeting?: boolean;
    executed?: string;
  }[] = [
    { who: "u_alice", title: MARK, content: "Les revues trimestrielles des plans de travail sont fixées à la deuxième semaine de chaque trimestre.", ago: 30, owner: "u_theo", due: 20, meeting: true },
    { who: "u_alice", title: "Lancement de la collecte des données foncières provinciales", content: "La Direction technique lance la collecte auprès des six provinces pilotes, avec l'appui du service Cartographie et SIG.", ago: 25, owner: "u_albert", due: 40, project: "Système d'information géographique national" },
    { who: "u_alice", title: "Recrutement de deux géomaticiens", content: "Deux postes de géomaticien sont ouverts au recrutement pour le premier trimestre.", ago: 22, owner: "u_sylvie", due: 60, project: "RH · Recrutements 2027" },
    { who: "u_alice", title: "Validation de la charte graphique du site institutionnel", content: "La charte proposée par la Communication est adoptée, sous réserve de l'accessibilité des contrastes.", ago: 18, owner: "u_rose", due: -3, project: "Refonte du site institutionnel", executed: "Charte publiée sur l'intranet le 14/11." },
    { who: "u_alice", title: "Position de l'Agence à la commission foncière", content: "L'Agence défend le principe d'un cadastre numérique unique, adossé au SIG national.", ago: 15, owner: "u_jeanpierre", due: 10, activity: "Commission foncière nationale" },
    { who: "u_alice", title: "Participation au forum des villes durables", content: "L'Agence présente le schéma national au forum ; la Communication prépare le support.", ago: 12, owner: "u_hugo", due: 5, activity: "Forum des villes durables", executed: "Support remis et présentation faite le 23/11." },
    { who: "u_alice", title: "Plan de numérisation des archives par province", content: "La numérisation se fait province par province, en commençant par le Kasaï.", ago: 10, owner: "u_patrick", due: 45, project: "Numérisation des archives cartographiques" },
    { who: "u_ines", title: "Mise à jour du manuel de procédures avant la fin de l'année", content: "Le manuel est mis à jour et soumis au comité de direction de décembre.", ago: 6, owner: "u_karim", due: 35, activity: "Mise à jour du manuel de procédures" },
    { who: "u_ines", title: "Relance des provinces pour les données de terrain", content: "Les représentations provinciales relancent les services provinciaux avant la fin du mois.", ago: 4, owner: "u_joseph", due: 12, meeting: true },
  ];
  for (const d of decisions) {
    const r = await quiet(
      dec.record(d.who, org, {
        title: d.title,
        content: d.content,
        decided_on: day(-d.ago),
        owner_id: d.owner,
        due_on: day(d.due),
        project_id: d.project ? await project(d.project) : null,
        activity_id: d.activity ? await activity(d.activity) : null,
        meeting_id: d.meeting ? codir : null,
      }),
    );
    if (r && d.executed) {
      await quiet(dec.execute(d.owner, r.id, { status: "executee", note: d.executed }));
      await quiet(dec.confirmExecution("u_ines", r.id));
    }
  }

  // ---- C-6 : le secrétariat tient le bureau d'ordre ; des sortants répondent aux entrants
  const reg = new Registers(svc);
  const ffdt = await partner("Fonds fictif pour le développement territorial");
  const ministry = await partner("Ministère fictif de l'Urbanisme et de l'Habitat");
  const tech = await unit("Direction technique");
  const inbound = [
    { subject: "Rapport d'avancement demandé par le bailleur", correspondent: "Fonds fictif pour le développement territorial", partner_id: ffdt, ago: 9, due: 5, assignee: "u_albert", unit: tech },
    { subject: "Invitation à l'atelier sur la décentralisation", correspondent: "Ministère fictif de l'Urbanisme et de l'Habitat", partner_id: ministry, ago: 6, due: 10, assignee: "u_hugo", unit: await unit("Direction de la Communication et des Partenariats") },
    { subject: "Demande de cartes des zones inondables", correspondent: "Province fictive du Kasaï", partner_id: null, ago: 3, due: 14, assignee: "u_patrick", unit: await unit("Cartographie et SIG") },
  ];
  const created: Record<string, string> = {};
  for (const m of inbound) {
    const r = await quiet(
      reg.registerMail("u_ines", org, {
        direction: "entrant",
        subject: m.subject,
        correspondent: m.correspondent,
        partner_id: m.partner_id,
        received_on: day(-m.ago),
        due_on: day(m.due),
      }),
    );
    if (!r) continue;
    created[m.subject] = (r as { id: string }).id;
    await quiet(reg.assignMail("u_ines", (r as { id: string }).id, { unit_id: m.unit, assignee_id: m.assignee, due_on: day(m.due) }));
  }
  const replies: [string | null, string, string][] = [
    [created["Rapport d'avancement demandé par le bailleur"] ?? null, "Transmission du rapport d'avancement du troisième trimestre", "Fonds fictif pour le développement territorial"],
    [await id("SELECT id FROM correspondence WHERE org_id = $1 AND subject = 'Demande de données foncières'", [org]), "Réponse : transmission des données foncières disponibles", "Province fictive"],
  ];
  for (const [to, subject, correspondent] of replies)
    if (to)
      await quiet(
        reg.registerMail("u_ines", org, { direction: "sortant", subject, correspondent, received_on: day(-1), reply_to_id: to }),
      );

  // ---- RI-8 : des risques rattachés aux projets ; un indicateur relié au plan
  const risks: [string, number, number, string, string, string][] = [
    ["Retard de livraison des images satellites", 3, 4, "u_patrick", "Système d'information géographique national", "Convention avec un second fournisseur d'images"],
    ["Désistement d'un candidat retenu", 2, 3, "u_sylvie", "RH · Recrutements 2027", "Liste complémentaire tenue à jour"],
    ["Contestation du schéma par une province", 2, 5, "u_jeanpierre", "Schéma national d'aménagement (exemple)", "Consultations provinciales avant la validation"],
  ];
  for (const [title, probability, impact, owner, prj, mitigation] of risks)
    await quiet(reg.createRisk("u_alice", org, { title, probability, impact, owner_id: owner, project_id: await project(prj), mitigation }));
  const planActivity = await id(
    `SELECT a.id FROM plan_activities a JOIN work_plans w ON w.id = a.plan_id WHERE a.org_id = $1 AND w.status = 'approved'
      ORDER BY a.created_at LIMIT 1`,
    [org],
  );
  if (planActivity)
    await db.query("UPDATE indicators SET plan_activity_id = $2 WHERE org_id = $1 AND name = 'Provinces couvertes par un schéma'", [
      org,
      planActivity,
    ]);

  // ---- PT-8 : des plans pour la Direction générale et l'Ingénierie territoriale ; des activités réparties
  const plans = new Plans(svc);
  const year = (await db.one<{ y: number }>("SELECT max(year) AS y FROM work_plans WHERE org_id = $1", [org]))?.y ?? Number(day().slice(0, 4));
  const newPlans: [string, string, [string, string, number, string][]][] = [
    [
      "Direction générale",
      "Plan de travail de la Direction générale",
      [
        ["Tenue des comités de direction mensuels", "u_ines", 12, "comités"],
        ["Revues trimestrielles des plans de travail", "u_theo", 4, "revues"],
        ["Rapport annuel de performance", "u_jeanpierre", 1, "rapport"],
      ],
    ],
    [
      "Ingénierie territoriale",
      "Plan de travail de l'Ingénierie territoriale",
      [
        ["Appui aux plans d'urbanisme provinciaux", "u_karim", 6, "provinces"],
        ["Mise à jour des données foncières", "u_patrick", 26, "provinces"],
        ["Ateliers de restitution en province", "u_joseph", 3, "ateliers"],
      ],
    ],
  ];
  for (const [unitName, title, acts] of newPlans) {
    const u = await unit(unitName);
    if (!u) continue;
    const p = await quiet(plans.create("u_alice", org, { unit_id: u, year, title }));
    if (!p) continue;
    for (const [t, resp, target, label] of acts)
      await quiet(
        plans.addActivity("u_alice", (p as { id: string }).id, {
          title: t,
          responsible_id: resp,
          target_value: target,
          unit_label: label,
          end_on: `${year}-12-15`,
          objective: t,
        }),
      );
  }
  // Les activités du plan de l'Agence, toutes confiées à Fiston, sont réparties entre les directions
  const spread = ["u_albert", "u_hugo", "u_jeanpierre", "u_theo", "u_sylvie", "u_karim"];
  const karims = await db.query<{ id: string }>(
    `SELECT a.id FROM plan_activities a JOIN work_plans w ON w.id = a.plan_id JOIN org_units u ON u.id = w.unit_id
      WHERE a.org_id = $1 AND a.responsible_id = 'u_karim' AND u.name <> 'Ingénierie territoriale' ORDER BY a.created_at`,
    [org],
  );
  for (const [i, a] of karims.entries())
    await db.query("UPDATE plan_activities SET responsible_id = $2 WHERE id = $1", [a.id, spread[i % spread.length]]);

  // ---- PA-6 : partenaires reliés au portefeuille, contacts renseignés
  if (ffdt) {
    await db.query("UPDATE projects SET sponsor_partner_id = $2 WHERE org_id = $1 AND name = 'Schéma national d''aménagement (exemple)'", [
      org,
      ffdt,
    ]);
    await db.query(
      "UPDATE agency_activities SET counterpart_partner_id = $2 WHERE org_id = $1 AND title = 'Audience avec le bailleur principal'",
      [org, ffdt],
    );
  }
  if (ministry)
    await db.query(
      "UPDATE agency_activities SET counterpart_partner_id = $2 WHERE org_id = $1 AND title = 'Commission interministérielle d''aménagement'",
      [org, ministry],
    );
  const prt = new Partners(svc);
  const contacts: [string, string, string, string][] = [
    ["Fonds fictif pour le développement territorial", "M. Jean Mukalay", "Chargé de portefeuille", "j.mukalay@ffdt.example"],
    ["Ministère fictif de l'Urbanisme et de l'Habitat", "Mme Nadine Kabila", "Directrice de la planification", "n.kabila@urbanisme.example"],
    ["Université fictive des Grands Lacs", "Pr Paul Tshiamala", "Doyen de la faculté de géographie", "p.tshiamala@ugl.example"],
    ["Agence fictive de coopération du Nord", "Mme Hélène Martin", "Cheffe de projet", "h.martin@cooperation.example"],
    ["Cabinet fictif Géo-Conseil", "M. Pierre Ilunga", "Associé", "p.ilunga@geoconseil.example"],
  ];
  for (const [name, who, fn, email] of contacts) {
    const p = await partner(name);
    if (p && !(await db.one("SELECT 1 FROM partner_contacts WHERE partner_id = $1 AND name = $2", [p, who])))
      await quiet(prt.addContact("u_alice", p, { name: who, title: fn, email, principal: true }));
  }

  // ---- S-7 : des fiches d'attributions pour les entités
  const at = new Attributions(svc);
  const domains = await db.query<{ id: string; name: string }>("SELECT id, name FROM activity_domains WHERE org_id = $1", [org]);
  const dom = (name: string) => domains.find((d) => d.name === name)?.id ?? domains[0]?.id;
  const missions: [string, string, string][] = [
    ["Direction générale", "Pilotage stratégique de l'Agence, coordination des directions, relations avec la tutelle.", "Aménagement du territoire"],
    ["Ressources humaines", "Gestion administrative des agents, recrutement, formation et évaluation.", "Budget et finances"],
    ["Études et Prospective", "Études territoriales, prospective et préparation du schéma national.", "Études et planification"],
    ["Ingénierie territoriale", "Appui technique aux provinces pour leurs plans d'urbanisme et d'aménagement.", "Aménagement du territoire"],
    ["Cartographie et SIG", "Production cartographique et administration du SIG national.", "Études et planification"],
    ["Suivi-évaluation", "Suivi des plans de travail, revues trimestrielles et indicateurs de performance.", "Études et planification"],
    ["Communication", "Communication institutionnelle, site de l'Agence et relations avec la presse.", "Aménagement du territoire"],
    ["Représentation provinciale Nord (exemple)", "Relais de l'Agence auprès des provinces du Nord.", "Aménagement du territoire"],
    ["Antenne Sud (exemple)", "Relais de l'Agence auprès des provinces du Sud.", "Aménagement du territoire"],
  ];
  for (const [unitName, mission, domain] of missions) {
    const u = await unit(unitName);
    const d = dom(domain);
    if (!u || !d) continue;
    if (await db.one("SELECT 1 FROM attribution_sheets WHERE org_id = $1 AND unit_id = $2", [org, u])) continue;
    // Le chef de l'entité rédige la fiche (Fiston à défaut), la DG l'approuve : jamais la même personne
    const chief = (await db.one<{ m: string | null }>("SELECT manager_id AS m FROM org_units WHERE id = $1", [u]))?.m;
    const writer = chief && chief !== "u_alice" ? chief : "u_karim";
    const s = await quiet(at.create(writer, org, { unit_id: u, mission, domains: [{ domain_id: d, role: "responsable" }], relations: [] }));
    if (s) await quiet(at.approve("u_alice", (s as { id: string }).id));
  }
}
