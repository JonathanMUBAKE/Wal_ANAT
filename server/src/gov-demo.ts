import { Activities } from "./activities.js";
import { Attributions } from "./attributions.js";
import { Decisions } from "./decisions.js";
import { Deliverables } from "./deliverables.js";
import { Gaps } from "./gaps.js";
import { Meetings } from "./meetings.js";
import { Plans } from "./plans.js";
import { Registers } from "./registers.js";
import { Signature } from "./signature.js";
import type { Services } from "./services.js";

/** Données d'illustration, entièrement fictives, pour présenter la version ANAT (ANAT_DEMO=1 uniquement). */
const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

export async function seedGovDemo(svc: Services) {
  const db = svc.db;
  const org = (await db.one<{ id: string }>("SELECT id FROM organizations WHERE name = 'Nova Mobile'"))?.id;
  if (!org || (await db.one("SELECT 1 FROM agency_activities WHERE org_id = $1", [org]))) return;
  const me = "u_alice";
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
  await m.create(me, org, {
    meeting_type: "Comité de direction",
    meeting_date: day(0),
    start_time: "16:00",
    location: "Salle de conférence",
    writer_id: "u_karim",
  });
  await m.create(me, org, {
    meeting_type: "Comité de pilotage des projets",
    meeting_date: day(3),
    start_time: "10:30",
    location: "Salle de conférence",
    writer_id: "u_karim",
  });
  await m.create(me, org, {
    meeting_type: "Réunion avec les provinces",
    meeting_date: day(8),
    start_time: "09:30",
    location: "Visioconférence",
    writer_id: "u_karim",
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
}
