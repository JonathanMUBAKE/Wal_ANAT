import { localDate } from "./services.js";
import { Activities } from "./activities.js";
import { Agreements } from "./agreements.js";
import { Attributions } from "./attributions.js";
import { Decisions } from "./decisions.js";
import { Deliverables } from "./deliverables.js";
import { Gaps } from "./gaps.js";
import { Meetings } from "./meetings.js";
import { Partners } from "./partners.js";
import { Plans } from "./plans.js";
import { Registers } from "./registers.js";
import { Signature } from "./signature.js";
import { UnitTasks } from "./unit-tasks.js";
import { Hr } from "./hr.js";
import type { Provisioning } from "./auth/provisioning.js";
import type { Services } from "./services.js";

/** Données d'illustration, entièrement fictives, pour présenter la version ANAT (ANAT_DEMO=1 uniquement). */
const day = (offset: number) => localDate(new Date(Date.now() + offset * 864e5));

export async function seedGovDemo(svc: Services) {
  const db = svc.db;
  const org = (await db.one<{ id: string }>("SELECT id FROM organizations WHERE name = 'Nova Mobile'"))?.id;
  if (!org) return;
  const me = "u_alice";
  // Une base déjà illustrée reçoit seulement les lots ajoutés depuis (ici, l'annuaire des partenaires)
  if (await db.one("SELECT 1 FROM agency_activities WHERE org_id = $1", [org])) {
    await seedPartners(svc, org, me);
    await seedAgreements(svc, org, me);
    return seedPartnerLinks(svc, org, me);
  }
  const a = new Activities(svc);
  const m = new Meetings(svc);
  const at = new Attributions(svc);

  // Démonstration : Alice est aussi administratrice système (paramètres de l'institution), et l'institution a des provinces
  await db.query("UPDATE users SET platform_role = 'super_admin' WHERE id = $1", [me]);
  const root = await db.one<{ id: string }>("SELECT id FROM org_units WHERE org_id = $1 AND parent_id IS NULL", [org]);
  if (root)
    for (const [name, kind] of [
      ["Représentation provinciale Nord (exemple)", "representation_provinciale"],
      ["Antenne Sud (exemple)", "antenne"],
    ])
      await svc.createUnit(me, org, { name, kind, parent_id: root.id, manager_id: "u_karim" });

  await a.create(me, org, {
    kind: "commission",
    title: "Commission interministérielle d'aménagement",
    start_on: day(2),
    start_time: "10:00",
    location: "Primature",
    counterpart: "Primature",
    mandate: "Défendre les priorités d'aménagement des provinces.",
    health: "at_risk",
    decision_needed: "Valider la position de l'Agence sur le schéma national",
  });
  await a.create(me, org, {
    kind: "commission",
    title: "Commission foncière nationale",
    start_on: day(12),
    health: "on_track",
    counterpart: "Ministère de tutelle",
  });
  await a.create(me, org, {
    kind: "conference",
    title: "Forum des villes durables",
    start_on: day(5),
    location: "Centre de conférences",
    delegation: "Directrice générale, Direction technique",
    counterpart: "Partenaires techniques",
  });
  await a.create(me, org, {
    kind: "conference",
    title: "Atelier régional de planification",
    start_on: day(21),
    health: "on_track",
  });
  await a.create(me, org, {
    kind: "rendez_vous",
    title: "Audience avec le bailleur principal",
    start_on: day(1),
    start_time: "15:30",
    counterpart: "Représentant du bailleur",
    location: "Bureau de la DG",
  });
  await a.create(me, org, {
    kind: "interne",
    title: "Mise à jour du manuel de procédures",
    progress: 65,
    next_due_on: day(9),
    health: "on_track",
    lead_id: "u_karim",
  });
  const late = await a.create(me, org, {
    kind: "interne",
    title: "Inventaire du patrimoine immobilier",
    progress: 30,
    next_due_on: day(-4),
    health: "off_track",
    decision_needed: "Arbitrer le recours à un prestataire",
  });
  await a.addFollowup(me, late.id, {
    text: "Consolider les données des provinces",
    responsible_id: "u_karim",
    due_on: day(-6),
  });

  const projects = await db.query<{ id: string; name: string }>(
    "SELECT id, name FROM projects WHERE org_id = $1 ORDER BY created_at",
    [org],
  );
  for (const [i, p] of projects.entries())
    await a.setGovernance(
      me,
      p.id,
      i % 2
        ? {
            origin: "confie",
            sponsor: "Ministère de tutelle",
            convention_ref: `CONV-2026-0${i + 1}`,
            lead_id: "u_karim",
            budget_planned: 480000,
            budget_spent: 210000 + i * 40000,
            decision_needed: i === 1 ? "Approuver l'avenant à la convention" : "",
          }
        : { origin: "interne", lead_id: me, budget_planned: 120000, budget_spent: 45000 },
    );

  const domains: string[] = [];
  for (const name of ["Aménagement du territoire", "Budget et finances", "Marchés publics", "Études et planification"])
    domains.push((await at.createDomain(me, org, { name }))!.id);

  const past = await m.create(me, org, {
    meeting_type: "Comité de direction",
    meeting_date: day(-7),
    start_time: "09:00",
    end_time: "11:00",
    location: "Salle de conférence",
    convened_by: "Direction générale",
    facilitator: "Directrice générale",
    timekeeper: "Secrétariat",
    writer_id: "u_karim",
    chair_id: me,
    invitees: [{ user_id: me }, { user_id: "u_karim" }],
  });
  await m.saveContent(me, past.id, {
    agenda: [
      {
        subject: "Revue du plan de travail",
        speakers: "Directeurs",
        notes: "**Constat**\n- Avancement conforme\n- Budget à suivre",
        actions: [
          { text: "Transmettre le tableau de suivi budgétaire", responsible_id: "u_karim", due_on: day(-2) },
          { text: "Préparer la note de conjoncture", responsible_id: me, due_on: day(6) },
        ],
        decisions: [
          {
            text: "Le principe du recrutement d'un consultant pour le diagnostic foncier est approuvé (illustration).",
            owner_id: "u_karim",
            due_on: day(15),
          },
        ],
      },
    ],
    attendees: [
      { user_id: me, name: "Alice" },
      { user_id: "u_karim", name: "Karim" },
    ],
  });
  await m.create(me, org, {
    meeting_type: "Point d'étape des directions",
    meeting_date: day(-3),
    start_time: "14:00",
    location: "Salle B",
    writer_id: "u_karim",
  });
  // Le compte rendu du comité passé est soumis : il attend la validation de la présidente de séance
  await m.submit("u_karim", past.id);
  // Comité du jour : convoqué en urgence, les recommandations ouvertes viennent d'office au point de suivi
  const today = await m.create(me, org, {
    meeting_type: "Comité de direction",
    meeting_date: day(0),
    start_time: "16:00",
    location: "Salle de conférence",
    writer_id: "u_karim",
    chair_id: me,
    invitees: [{ user_id: me }, { user_id: "u_karim" }, { user_id: "u_hugo" }],
  });
  await m.convene(me, today.id, { short_notice: true });
  await m.respond("u_karim", today.id, { response: "accepted" });
  await m.respond("u_hugo", today.id, { response: "delegated", delegate_name: "Son adjoint (exemple)" });
  const steering = await m.create(me, org, {
    meeting_type: "Comité de pilotage des projets",
    meeting_date: day(3),
    start_time: "10:30",
    location: "Salle de conférence",
    writer_id: "u_karim",
    chair_id: me,
    invitees: [{ user_id: me }, { user_id: "u_karim" }],
  });
  await m.saveContent(me, steering.id, {
    agenda: [
      { subject: "État d'avancement des projets", speakers: "Chefs de projet" },
      { subject: "Arbitrages budgétaires", speakers: "Direction financière" },
    ],
    attendees: [],
  });
  await m.convene(me, steering.id, {});
  // Avec les provinces : une séance par mois, en visioconférence, les représentations provinciales convoquées
  const provinces = await db.query<{ id: string }>(
    "SELECT id FROM org_units WHERE org_id = $1 AND kind IN ('representation_provinciale', 'antenne')",
    [org],
  );
  await m.create(me, org, {
    meeting_type: "Réunion avec les provinces",
    meeting_date: day(8),
    start_time: "09:30",
    location: "Visioconférence",
    video_link: "https://visio.exemple/provinces",
    writer_id: "u_karim",
    chair_id: me,
    invitees: [{ user_id: me }, ...provinces.map((p) => ({ unit_id: p.id }))],
    repeat: { every: "month", count: 3 },
  });

  // Organisation : deux fiches approuvées, l'une sans activité pour illustrer un écart
  await db.query("UPDATE org_members SET role = 'admin', profile_id = $1 WHERE org_id = $2 AND user_id = 'u_karim'", [
    `prf_admin_${org}`,
    org,
  ]);
  const units = await db.query<{ id: string }>("SELECT id FROM org_units WHERE org_id = $1 ORDER BY position LIMIT 2", [
    org,
  ]);
  for (const [i, u] of units.entries()) {
    const s = await at.create(me, org, {
      unit_id: u.id,
      mission: i ? "Conduire les études de planification territoriale." : "Assurer la gestion budgétaire de l'Agence.",
      legal_ref: "Organigramme de l'Agence",
      valid_from: day(-120),
      domains: [{ domain_id: domains.at(i + 1) as string, role: "responsable" }],
      relations: [],
    });
    await at.approve("u_karim", s.id);
  }

  // Plan, livrables, mission, parapheur, courrier, risques et indicateurs
  const plans = new Plans(svc);
  const d = new Deliverables(svc);
  const sig = new Signature(svc);
  const reg = new Registers(svc);
  const year = Number(day(0).slice(0, 4));
  const plan = await plans.create(me, org, { unit_id: units[0].id, year, title: `Plan de travail ${year}` });
  for (const [title, target, unit_label, offset] of [
    ["Révision du schéma d'aménagement", 1, "schéma", 40],
    ["Ateliers provinciaux de concertation", 6, "ateliers", 25],
    ["Rapport annuel de performance", 1, "rapport", -3],
  ] as const)
    await plans.addActivity(me, plan.id, {
      title,
      responsible_id: "u_karim",
      target_value: target,
      unit_label,
      end_on: day(offset),
      objective: "Objectif fixé au plan",
      budget_planned: 50000,
    });
  await plans.submit(me, plan.id);
  const approved = await plans.approve("u_karim", plan.id);
  await plans.updateProgress("u_karim", approved.activities[0].id, { progress: 55, budget_spent: 21000 });
  await plans.updateProgress("u_karim", approved.activities[1].id, { progress: 80, actual_value: 5 });

  // Le projet est le dossier : la mission du consultant et ses livrables y sont rangés (docs/PARCOURS-METIER.md)
  const schema = await svc.createProject(me, org, {
    name: "Schéma national d'aménagement (exemple)",
    description: "Dossier d'illustration : étude foncière confiée à un consultant, livrables et paiements.",
    access: "team",
    due_on: day(120),
  });
  for (const u of ["u_karim", "u_hugo"]) await svc.setMember(me, schema.id, u, "editor");
  // Le comité de pilotage appartient au dossier du projet : il apparaît dans son onglet Réunions
  await m.update(me, steering.id, { project_id: schema.id });
  // Le projet réalise l'activité « Révision du schéma d'aménagement » du plan : son avancement y remonte (lot P3c)
  const revision = approved.activities.find((x: { title: string }) => x.title.startsWith("Révision du schéma"));
  if (revision) await a.setGovernance(me, schema.id, { plan_activity_id: revision.id });
  for (const [title, done] of [
    ["Cadrage méthodologique", true],
    ["Diagnostic des provinces pilotes", false],
  ] as const) {
    const t = await svc.createTask(me, { project_id: schema.id, title });
    if (done) await svc.updateTask(me, t.id, { completed: true });
  }
  const mission = await d.createContract(me, org, {
    project_id: schema.id,
    user_id: "u_hugo",
    title: "Étude foncière nationale",
    terms:
      "Termes de référence (illustration) : diagnostic du foncier, recensement des conflits, propositions de régulation. Livrables : rapport de démarrage, rapport intermédiaire, rapport final.",
    start_on: day(-60),
    end_on: day(20),
    amount: 18000,
    supervisor_id: "u_karim",
  });
  for (const [title, pct, offset, criteria] of [
    ["Rapport de démarrage", 30, -30, "Méthodologie validée, calendrier détaillé"],
    ["Rapport intermédiaire", 40, -1, "Diagnostic complet de deux provinces pilotes"],
    ["Rapport final", 30, 18, "Propositions chiffrées, restitution faite"],
  ] as const)
    await d.create(me, org, {
      project_id: schema.id,
      title,
      responsible_id: "u_hugo",
      validator_id: "u_karim",
      due_on: day(offset),
      contract_id: mission.id,
      payment_percent: pct,
      criteria,
    });
  // Le rapport de démarrage est reçu : son procès-verbal rend la première tranche « à payer »
  const first = (await d.list(me, org, { project_id: schema.id })).find((x) => x.title === "Rapport de démarrage");
  if (first) {
    await d.start("u_hugo", first.id);
    await d.submit("u_hugo", first.id);
    await d.review("u_karim", first.id);
    await d.decide("u_karim", first.id, { decision: "valide" });
  }
  await d.create(me, org, {
    project_id: schema.id,
    title: "Note d'orientation stratégique",
    responsible_id: "u_karim",
    validator_id: me,
    due_on: day(10),
  });

  // Registre des décisions : une décision en exécution, une en retard
  const dec = new Decisions(svc);
  const d1 = await dec.record(me, org, {
    title: "Lancement des ateliers provinciaux",
    content: "Les ateliers provinciaux de concertation sont lancés dans six provinces pilotes (texte d'illustration).",
    decided_on: day(-14),
    owner_id: "u_karim",
    due_on: day(20),
  });
  await dec.execute("u_karim", d1.id, { status: "en_cours" });
  await dec.record(me, org, {
    title: "Transmission du rapport annuel de performance",
    content: "Le rapport annuel est transmis au ministère de tutelle après relecture (texte d'illustration).",
    decided_on: day(-20),
    owner_id: "u_karim",
    due_on: day(-4),
  });

  const note = await sig.create("u_karim", org, {
    title: "Note au ministère de tutelle",
    kind: "Note",
    body: "Projet de note d'information (texte d'illustration).",
    due_on: day(2),
    steps: [{ actor_id: me, action: "signature" }],
  });
  await sig.start("u_karim", note.id);

  const courrier = await reg.registerMail(me, org, {
    direction: "entrant",
    subject: "Demande de données foncières",
    correspondent: "Ministère de tutelle",
    received_on: day(-5),
    due_on: day(-1),
  });
  await reg.assignMail(me, courrier.id, { unit_id: units[0].id, assignee_id: "u_karim" });
  await reg.registerMail(me, org, {
    direction: "entrant",
    subject: "Invitation au forum régional",
    correspondent: "Partenaire technique",
    received_on: day(-1),
    due_on: day(9),
  });

  await reg.createRisk(me, org, {
    title: "Retard de décaissement du bailleur",
    probability: 4,
    impact: 5,
    owner_id: "u_karim",
    mitigation: "Relance et plan de trésorerie",
  });
  await reg.createRisk(me, org, {
    title: "Disponibilité des données provinciales",
    probability: 3,
    impact: 3,
    owner_id: me,
  });
  await reg.createIndicator(me, org, {
    name: "Provinces couvertes par un schéma",
    target: 26,
    baseline: 4,
    result: 11,
    unit_label: "provinces",
    source: "Direction technique",
  });
  await reg.createIndicator(me, org, {
    name: "Plans de travail approuvés",
    target: 8,
    baseline: 0,
    result: 5,
    unit_label: "plans",
    source: "Secrétariat",
  });
  await reg.createIndicator(me, org, {
    name: "Recommandations exécutées",
    target: 90,
    baseline: 40,
    result: 62,
    unit_label: "%",
    source: "Comptes rendus",
  });

  await new Gaps(svc).detect(me, org);
  await seedPartners(svc, org, me);
  await seedAgreements(svc, org, me);
  await seedPartnerLinks(svc, org, me);
  await seedUnitTasks(svc, org);
  await seedHr(svc, org);
}

/** Dossiers RH fictifs des personnes de démonstration (module RH). */
async function seedHr(svc: Services, org: string) {
  const hr = new Hr(svc, null as unknown as Provisioning);
  const info = { ip: "127.0.0.1", userAgent: "démonstration" };
  for (const [user_id, civility, first_names, last_name, status, grade, category, function_title, hired_on] of [
    [
      "u_alice",
      "Mme",
      "Alice",
      "Martin",
      "fonctionnaire",
      "Administrateur civil principal",
      "A",
      "Directrice",
      "2012-09-03",
    ],
    [
      "u_karim",
      "M.",
      "Karim",
      "Benali",
      "fonctionnaire",
      "Ingénieur en chef",
      "A",
      "Chef du département Ingénierie",
      "2015-02-02",
    ],
    ["u_chloe", "Mme", "Chloé", "Dubois", "contractuel", "Attachée", "A", "Responsable Produit & Design", "2019-06-17"],
    [
      "u_theo",
      "M.",
      "Théo",
      "Garnier",
      "fonctionnaire",
      "Ingénieur des travaux",
      "A",
      "Chef du service Qualité",
      "2018-01-08",
    ],
    [
      "u_hugo",
      "M.",
      "Hugo",
      "Lefèvre",
      "fonctionnaire",
      "Attaché principal",
      "A",
      "Directeur du marketing",
      "2016-04-11",
    ],
    [
      "u_ines",
      "Mme",
      "Inès",
      "Moreau",
      "fonctionnaire",
      "Attachée principale",
      "A",
      "Cheffe du service RH",
      "2014-10-01",
    ],
  ] as const) {
    const unit = await svc.db.one<{ unit_id: string | null }>(
      "SELECT unit_id FROM org_members WHERE org_id = $1 AND user_id = $2",
      [org, user_id],
    );
    if (!unit) continue;
    await hr
      .create(
        "u_alice",
        org,
        {
          user_id,
          civility,
          first_names,
          last_name,
          status,
          grade,
          category,
          function_title,
          hired_on,
          function_since: hired_on,
          nationality: "Fictivienne",
          unit_id: unit.unit_id,
        },
        info,
      )
      .catch(() => undefined);
  }
  await hr
    .addDiploma("u_alice", org, "u_karim", {
      title: "Diplôme d'ingénieur (exemple fictif)",
      level: "Bac+5",
      year: 2012,
    })
    .catch(() => undefined);
  await hr
    .addContact("u_alice", org, "u_karim", { name: "Contact fictif", relation: "Conjoint", phone: "+000 00 00 00" })
    .catch(() => undefined);
}

/**
 * Tâches d'entité (lot T1), fictives : le registre du service Qualité vit depuis deux mois (tâches créées et
 * terminées semaine après semaine), le département Ingénierie porte un projet et note quelques tâches hors projet.
 * De quoi lire le tableau de bord de « Mon entité » en démonstration.
 */
async function seedUnitTasks(svc: Services, org: string) {
  const ut = new UnitTasks(svc);
  const unitId = async (name: string) =>
    (await svc.db.one<{ id: string }>("SELECT id FROM org_units WHERE org_id = $1 AND name = $2", [org, name]))?.id;
  const [inge, qualite] = [await unitId("Ingénierie"), await unitId("Qualité")];
  if (!inge || !qualite) return;
  const backdate = async (id: string, created: number, completed?: number) => {
    await svc.db.query("UPDATE tasks SET created_at = now() + ($1 || ' days')::interval WHERE id = $2", [
      String(created),
      id,
    ]);
    if (completed !== undefined)
      await svc.db.query("UPDATE tasks SET completed_at = now() + ($1 || ' days')::interval WHERE id = $2", [
        String(completed),
        id,
      ]);
  };
  const q = await ut.board("u_karim", org, qualite);
  for (const [title, created, due, done, priority] of [
    ["Recenser les anomalies du trimestre", -54, -45, -44, "medium"],
    ["Rédiger la procédure de recette", -49, -38, -36, "high"],
    ["Mettre à jour le plan de tests", -41, -30, -31, "medium"],
    ["Former l'équipe aux tests de charge", -33, -22, -20, "low"],
    ["Auditer les tests automatisés", -26, -15, -14, "high"],
    ["Préparer la revue qualité mensuelle", -19, -8, -9, "medium"],
    ["Analyser les retours des usagers", -12, -2, null, "urgent"],
    ["Consolider les indicateurs qualité", -8, -1, null, "high"],
    ["Vérifier la conformité d'accessibilité", -5, 2, null, "medium"],
    ["Planifier la campagne de tests d'été", -3, 5, null, "low"],
    ["Relire la charte de qualité", -1, 12, null, "none"],
  ] as const) {
    const t = await svc.createTask(
      "u_karim",
      { project_id: q.project_id, title, assignee_id: "u_theo", priority, due_on: day(due) },
      { silent: true },
    );
    if (done !== null) await svc.updateTask("u_karim", t.id, { completed: true });
    await backdate(t.id, created, done ?? undefined);
  }
  const i = await ut.board("u_karim", org, inge);
  for (const [title, due] of [
    ["Arbitrer le budget des licences", 3],
    ["Préparer l'entretien annuel de l'équipe", 9],
  ] as const) {
    const t = await svc.createTask(
      "u_karim",
      { project_id: i.project_id, title, assignee_id: "u_karim", due_on: day(due) },
      { silent: true },
    );
    await backdate(t.id, -4);
  }
  // La réunion hebdomadaire de l'entité : toujours en tête de son espace et de l'accueil des convoqués
  const monday = new Date();
  monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7 || 7));
  await new Meetings(svc).create("u_karim", org, {
    meeting_type: "Réunion de service",
    title: "Réunion hebdomadaire de l'Ingénierie",
    meeting_date: localDate(monday),
    start_time: "09:00",
    end_time: "10:00",
    location: "Salle Ingénierie",
    unit_id: inge,
    chair_id: "u_karim",
    timing: "upcoming",
    invitees: [{ unit_id: inge }, { unit_id: qualite }],
    repeat: { every: "week", count: 8 },
  });
  const p = await ut.createProject("u_karim", org, inge, {
    name: "Plateforme de tests automatisés",
    description: "Exemple fictif : outiller les tests de non-régression de l'Ingénierie.",
    due_on: day(60),
  });
  for (const [title, done] of [
    ["Choisir l'outil de tests", true],
    ["Écrire les premiers scénarios", true],
    ["Brancher la chaîne d'intégration", false],
    ["Former les développeurs", false],
  ] as const) {
    const t = await svc.createTask("u_karim", { project_id: p.id, title }, { silent: true });
    if (done) await svc.updateTask("u_karim", t.id, { completed: true });
  }
}

/** Liens fictifs (lot PA3) : réunion avec le bailleur et sa chargée de programme, courrier du ministère. */
async function seedPartnerLinks(svc: Services, org: string, me: string) {
  if (await svc.db.one("SELECT 1 FROM meeting_partners WHERE org_id = $1", [org])) return;
  const find = async (acronym: string) =>
    svc.db.one<{ id: string; name: string }>("SELECT id, name FROM partners WHERE org_id = $1 AND acronym = $2", [
      org,
      acronym,
    ]);
  const ffdt = await find("FFDT");
  const mfuh = await find("MFUH");
  if (!ffdt || !mfuh) return;
  const awa = await svc.db.one<{ id: string }>("SELECT id FROM partner_contacts WHERE partner_id = $1 AND principal", [
    ffdt.id,
  ]);
  await new Meetings(svc).create(me, org, {
    meeting_type: "Comité de suivi du programme",
    title: "Revue semestrielle avec le bailleur",
    meeting_date: day(6),
    start_time: "10:00",
    end_time: "12:00",
    location: "Salle du conseil",
    partner_ids: [ffdt.id],
    invitees: [...(awa ? [{ contact_id: awa.id }] : []), { user_id: "u_karim" }],
  });
  const secretary = await svc.db.one<{ id: string }>(
    "SELECT id FROM partner_contacts WHERE partner_id = $1 AND principal",
    [mfuh.id],
  );
  await new Registers(svc).registerMail(me, org, {
    direction: "entrant",
    subject: "Demande d'appui pour la révision des plans d'urbanisme provinciaux",
    partner_id: mfuh.id,
    contact_id: secretary?.id ?? null,
    received_on: day(-2),
    due_on: day(8),
  });
}

/** Accords fictifs (lot PA2) : en vigueur, à l'échéance proche, en préparation, au parapheur, avec un avenant. */
async function seedAgreements(svc: Services, org: string, me: string) {
  if (await svc.db.one("SELECT 1 FROM agreements WHERE org_id = $1", [org])) return;
  const byName = async (acronym: string) =>
    (await svc.db.one<{ id: string }>("SELECT id FROM partners WHERE org_id = $1 AND acronym = $2", [org, acronym]))
      ?.id;
  const ffdt = await byName("FFDT");
  const mfuh = await byName("MFUH");
  const ufgl = await byName("UFGL");
  if (!ffdt || !mfuh || !ufgl) return;
  const ag = new Agreements(svc);
  const prog = await ag.create(me, org, {
    type_code: "protocole_accord",
    title: "Appui à l'élaboration des schémas provinciaux d'aménagement",
    content:
      "Article 1 — Objet. Les parties conviennent de coopérer à l'élaboration de schémas provinciaux d'aménagement dans trois provinces pilotes.\n\n" +
      "Article 2 — Engagements. Le partenaire apporte une assistance technique et un appui financier ; l'Agence assure la maîtrise d'ouvrage.\n\n" +
      "Article 3 — Durée. Le présent protocole est conclu pour deux ans.",
    partner_ids: [ffdt, mfuh],
    lead_partner_id: ffdt,
    partner_ref: "FFDT/PRG/2025-014",
    end_on: day(55),
    focal_id: "u_karim",
  });
  await ag.activate(me, prog.id, { signed_on: day(-675) });
  await ag.addDocument(me, ffdt, "rapport-semestriel.txt", Buffer.from("Rapport semestriel fictif du programme."), {
    nature: "rapport_activite",
    title: "Rapport semestriel du programme",
    issued_on: day(-30),
    agreement_id: prog.id,
  });
  await ag.addDocument(me, ffdt, "protocole-signe.pdf", demoPdf("Protocole d'accord fictif - exemplaire signe"), {
    nature: "convention_signee",
    title: "Protocole signé (exemplaire numérisé)",
    issued_on: day(-675),
    agreement_id: prog.id,
  });
  await ag.amend(me, prog.id, {
    title: "Prolongation d'un an et extension à une quatrième province",
    content:
      "Article unique — L'échéance du protocole est prorogée d'un an ; une quatrième province pilote est ajoutée.",
    new_end_on: day(420),
  });
  const conv = await ag.create(me, org, {
    type_code: "convention_partenariat",
    title: "Partage des données cartographiques et formation des cadres provinciaux",
    content:
      "Article 1 — Objet. L'Université met à disposition ses données géographiques ; l'Agence accueille des stagiaires.\n\n" +
      "Article 2 — Durée. Trois ans, renouvelable par tacite reconduction.",
    partner_ids: [ufgl],
    end_on: day(1100),
    tacit_renewal: true,
  });
  await ag.sign(me, conv.id, [{ actor_id: "u_karim", action: "signature" }]);
  await ag.create(me, org, {
    type_code: "convention_partenariat",
    title: "Comité conjoint de suivi des plans d'urbanisme",
    content: "Projet de convention en cours de rédaction avec le ministère.",
    partner_ids: [mfuh],
    focal_id: me,
  });
}

/** Annuaire des partenaires (lot PA1) : organisations fictives, aucune ne désigne un partenaire réel de l'Agence. */
async function seedPartners(svc: Services, org: string, me: string) {
  if (await svc.db.one("SELECT 1 FROM partners WHERE org_id = $1", [org])) return;
  const p = new Partners(svc);
  const units = await svc.db.query<{ id: string }>(
    "SELECT id FROM org_units WHERE org_id = $1 AND parent_id IS NOT NULL ORDER BY position, name",
    [org],
  );
  const unit = units[0]?.id ?? null;
  const bank = await p.create(me, org, {
    name: "Fonds fictif pour le développement territorial",
    acronym: "FFDT",
    type_code: "organisation_internationale",
    categories: ["ptf", "partenaire_technique"],
    country: "CI",
    city: "Abidjan",
    website: "https://ffdt.exemple.test",
    description:
      "Bailleur fictif : appui à l'élaboration des schémas provinciaux d'aménagement et au renforcement des capacités.",
    unit_id: unit,
    focal_id: "u_karim",
  });
  await p.addContact(me, bank.id, {
    name: "Mme Awa Exemple",
    title: "Chargée de programme Aménagement",
    email: "awa.exemple@ffdt.exemple.test",
    principal: true,
  });
  await p.addContact(me, bank.id, { name: "M. Paul Fictif", title: "Responsable financier" });
  await p.setState(me, bank.id, { state: "en_discussion" });
  await p.addNote(me, bank.id, {
    body: "Mission d'identification : intérêt confirmé pour trois provinces pilotes. Note conceptuelle attendue sous un mois.",
    happened_on: day(-20),
  });
  await p.setState(me, bank.id, { state: "actif" });
  await p.addNote(me, bank.id, {
    body: "Revue semestrielle du programme : calendrier des décaissements confirmé.",
    happened_on: day(-3),
  });

  const ministry = await p.create(me, org, {
    name: "Ministère fictif de l'Urbanisme et de l'Habitat",
    acronym: "MFUH",
    type_code: "institution_publique",
    categories: ["partenaire_institutionnel"],
    country: "CD",
    city: "Kinshasa",
    description: "Tutelle technique fictive des plans d'urbanisme ; co-préside le comité de suivi des schémas.",
    focal_id: me,
  });
  await p.setState(me, ministry.id, { state: "actif" });
  await p.addContact(me, ministry.id, {
    name: "M. le Secrétaire général (fictif)",
    title: "Secrétaire général",
    principal: true,
  });

  const uni = await p.create(me, org, {
    name: "Université fictive des Grands Lacs",
    acronym: "UFGL",
    type_code: "universite",
    categories: ["partenaire_technique"],
    country: "CD",
    city: "Bukavu",
    description: "Laboratoire de géomatique : données cartographiques et formation des cadres provinciaux.",
    focal_ids: ["u_karim"],
  });
  await p.setState(me, uni.id, { state: "en_discussion" });
  await p.addNote(me, uni.id, {
    body: "Premier échange sur une convention de stage et de partage de données.",
    happened_on: day(-9),
  });

  await p.create(me, org, {
    name: "Cabinet fictif Géo-Conseil",
    type_code: "entreprise_privee",
    categories: ["prestataire"],
    country: "CD",
    city: "Lubumbashi",
    description: "Bureau d'études fictif en cartographie et en topographie.",
  });

  const ngo = await p.create(me, org, {
    name: "Association fictive Terres et Villes",
    type_code: "ong",
    categories: ["mise_en_oeuvre"],
    country: "CD",
    description: "Accompagnement fictif des concertations communautaires.",
  });
  await p.setState(me, ngo.id, { state: "actif" });
  await p.setState(me, ngo.id, {
    state: "suspendu",
    reason: "Rapport d'activité annuel non transmis ; relance faite.",
  });

  const partner = await p.create(me, org, {
    name: "Agence fictive de coopération du Nord",
    acronym: "AFCN",
    type_code: "cooperation_bilaterale",
    categories: ["ptf"],
    confidential: true,
    description: "Discussions préliminaires confidentielles sur un appui budgétaire.",
  });
  await p.addNote(me, partner.id, {
    body: "Audience de prise de contact avec la Directrice générale.",
    happened_on: day(-1),
  });
}

/** Petit PDF valide d'une page, pour illustrer l'aperçu des documents (texte entièrement fictif). */
function demoPdf(text: string) {
  const content = `BT /F1 18 Tf 72 720 Td (${text.replace(/[()\\]/g, "")}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
