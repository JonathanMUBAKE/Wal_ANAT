import { Activities } from "./activities.js";
import { Attributions } from "./attributions.js";
import { Meetings } from "./meetings.js";
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
}
