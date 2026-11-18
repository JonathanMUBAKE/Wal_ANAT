import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Thème 2 de l'analyse (docs/ANALYSE-MODULES.md) : validation humaine et contrôle croisé. Rien d'isolé : qui
 * confie une tâche garde son échéance et confirme sa clôture ; une décision exécutée est confirmée par le
 * secrétariat de la DG ; l'IA ne valide jamais seule ; un document validé ne se rouvre qu'avec un motif.
 */
let g: GovCtx;
let project: string;
beforeEach(async () => {
  g = await boot();
  project = await g.project();
  await g.api("u_alice", "PUT", `/api/projects/${project}/members/u_hugo`, { role: "editor" });
  await g.api("u_alice", "PUT", `/api/projects/${project}/members/u_karim`, { role: "editor" });
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const confided = async (assignee = "u_hugo") =>
  (
    await g.api("u_alice", "POST", "/api/tasks", {
      project_id: project,
      title: "Rapport annuel de performance",
      assignee_id: assignee,
      due_on: day(-2),
      priority: "high",
    })
  ).body as Any;
const notes = async (who: string) => (await g.api(who, "GET", "/api/notifications")).body as Any[];

describe("tâche confiée : l'échéance reste au responsable (T-1, T-2)", () => {
  it("l'agent ne change ni l'échéance, ni l'intitulé, ni la priorité d'une tâche qu'on lui a confiée", async () => {
    const t = await confided();
    for (const patch of [{ due_on: day(10) }, { title: "Autre chose" }, { priority: "low" }]) {
      const r = await g.api("u_hugo", "PATCH", `/api/tasks/${t.id}`, patch);
      expect(r.status).toBe(403);
      expect(r.body.error).toMatch(/restent à Bernadette/);
    }
    // Un autre éditeur du projet non plus
    expect((await g.api("u_karim", "PATCH", `/api/tasks/${t.id}`, { due_on: day(10) })).status).toBe(403);
    // Le reste de la tâche s'avance librement
    expect((await g.api("u_hugo", "PATCH", `/api/tasks/${t.id}`, { description: "Premier jet rédigé" })).status).toBe(
      200,
    );
    // Le responsable, lui, change l'échéance
    expect((await g.api("u_alice", "PATCH", `/api/tasks/${t.id}`, { due_on: day(5) })).status).toBe(200);
  });

  it("l'agent demande un report ; le responsable l'accepte ou le refuse, et tout est tracé", async () => {
    const t = await confided();
    const ask = await g.api("u_hugo", "POST", `/api/tasks/${t.id}/postpone`, {
      due_on: day(7),
      reason: "Données de la province attendues",
    });
    expect(ask.status).toBe(200);
    expect(ask.body).toMatchObject({ status: "pending", due_on: day(7) });
    expect((await notes("u_alice")).some((n) => /demande de reporter/.test(n.title))).toBe(true);
    // Une seule demande en attente à la fois ; le motif est obligatoire
    expect(
      (await g.api("u_hugo", "POST", `/api/tasks/${t.id}/postpone`, { due_on: day(8), reason: "Encore" })).status,
    ).toBe(400);
    const detail = (await g.api("u_alice", "GET", `/api/tasks/${t.id}`)).body;
    expect(detail.postponement).toMatchObject({ id: ask.body.id, status: "pending", reason: /province/ });
    // L'agent ne tranche pas sa propre demande
    expect(
      (await g.api("u_hugo", "POST", `/api/tasks/${t.id}/postpone/${ask.body.id}`, { accept: true })).status,
    ).toBe(403);
    const ok = await g.api("u_alice", "POST", `/api/tasks/${t.id}/postpone/${ask.body.id}`, { accept: true });
    expect(ok.status).toBe(200);
    expect((await g.api("u_alice", "GET", `/api/tasks/${t.id}`)).body.due_on).toBe(day(7));
    expect((await notes("u_hugo")).some((n) => /a accepté le report/.test(n.title))).toBe(true);
    // Refus : l'échéance ne bouge pas
    const again = await g.api("u_hugo", "POST", `/api/tasks/${t.id}/postpone`, { due_on: day(20), reason: "Retard" });
    const no = await g.api("u_alice", "POST", `/api/tasks/${t.id}/postpone/${again.body.id}`, {
      accept: false,
      comment: "Le comité ne peut pas attendre",
    });
    expect(no.status).toBe(200);
    expect((await g.api("u_alice", "GET", `/api/tasks/${t.id}`)).body.due_on).toBe(day(7));
    expect((await notes("u_hugo")).some((n) => /a refusé le report/.test(n.title))).toBe(true);
    const log = await g.ctx.db.query<{ action: string }>(
      "SELECT kind AS action FROM activity WHERE task_id = $1 AND kind LIKE 'task.postpone%' ORDER BY created_at",
      [t.id],
    );
    expect(log.map((l) => l.action)).toEqual([
      "task.postpone.requested",
      "task.postpone.accepted",
      "task.postpone.requested",
      "task.postpone.refused",
    ]);
  });

  it("le responsable est prévenu de ce que l'agent change sur une tâche confiée", async () => {
    const t = await confided();
    await g.api("u_hugo", "PATCH", `/api/tasks/${t.id}`, { description: "Plan du rapport arrêté" });
    const n = (await notes("u_alice")).find((x) => x.kind === "task.changed" && x.task_id === t.id);
    expect(n).toBeTruthy();
    expect(n.title).toMatch(/Didier Lukusa a modifié/);
    expect(n.body).toMatch(/Description modifiée/);
  });
});

describe("tâche confiée : la clôture est confirmée par le responsable (T-3)", () => {
  it("l'agent déclare la tâche réalisée ; elle ne sort des retards qu'à la confirmation", async () => {
    const t = await confided();
    const done = await g.api("u_hugo", "PATCH", `/api/tasks/${t.id}`, { completed: true });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ completed: false, done_declared_by: "u_hugo" });
    expect(done.body.done_declared_at).toBeTruthy();
    expect((await notes("u_alice")).some((n) => /déclare « Rapport annuel de performance » réalisée/.test(n.title))).toBe(
      true,
    );
    // Toujours en retard tant que le responsable n'a pas confirmé
    const late = (await g.api("u_alice", "GET", `/api/tasks?project_id=${project}&overdue=true`)).body as Any[];
    expect(late.map((x) => x.id)).toContain(t.id);
    // Un autre éditeur ne confirme pas à la place du responsable
    expect((await g.api("u_karim", "PATCH", `/api/tasks/${t.id}`, { completed: true })).status).toBe(403);
    const close = await g.api("u_alice", "PATCH", `/api/tasks/${t.id}`, { completed: true });
    expect(close.status).toBe(200);
    expect(close.body).toMatchObject({ completed: true, done_declared_at: null });
  });

  it("le responsable peut renvoyer la tâche avec un motif", async () => {
    const t = await confided();
    await g.api("u_hugo", "PATCH", `/api/tasks/${t.id}`, { completed: true });
    expect((await g.api("u_alice", "POST", `/api/tasks/${t.id}/return`, { comment: "" })).status).toBe(400);
    const back = await g.api("u_alice", "POST", `/api/tasks/${t.id}/return`, {
      comment: "Il manque les chiffres de la province du Kasaï",
    });
    expect(back.status).toBe(200);
    expect(back.body).toMatchObject({ completed: false, done_declared_at: null });
    expect((await notes("u_hugo")).some((n) => /a renvoyé « Rapport annuel de performance »/.test(n.title))).toBe(true);
    const comments = (await g.api("u_hugo", "GET", `/api/tasks/${t.id}`)).body.comments as Any[];
    expect(comments.some((c) => /province du Kasaï/.test(c.body))).toBe(true);
    // Rien à renvoyer quand rien n'est déclaré
    expect((await g.api("u_alice", "POST", `/api/tasks/${t.id}/return`, { comment: "Encore" })).status).toBe(400);
  });

  it("une tâche que l'on se donne à soi-même se termine d'un clic", async () => {
    const own = (await g.api("u_hugo", "POST", "/api/tasks", { project_id: project, title: "Relire ma note" })).body;
    await g.api("u_hugo", "PATCH", `/api/tasks/${own.id}`, { assignee_id: "u_hugo" });
    const r = await g.api("u_hugo", "PATCH", `/api/tasks/${own.id}`, { completed: true, due_on: day(3) });
    expect(r.status).toBe(200);
    expect(r.body.completed).toBe(true);
  });
});

describe("décisions de la DG : confirmation après coup et clôture vérifiée (DEC-1, DEC-3)", () => {
  const record = (who: string, body: Record<string, unknown> = {}) =>
    g.api(who, "POST", "/api/decisions", {
      title: "Lancement des ateliers provinciaux",
      content: "Les ateliers démarrent dans les six provinces pilotes.",
      decided_on: day(),
      ...body,
    });
  beforeEach(async () => {
    // Fiston est l'assistant de la DG : il inscrit les décisions qu'elle dicte, sans pouvoir les confirmer
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_karim'");
    await g.promote("u_karim", "Assistant(e) de direction");
  });

  it("une décision inscrite par l'assistante est numérotée, puis confirmée par la DG", async () => {
    const d = await record("u_karim");
    expect(d.status).toBe(200);
    expect(d.body.reference).toMatch(/^DEC\/\d{4}\/0001$/);
    expect(d.body).toMatchObject({ confirmed_at: null, to_confirm: true });
    expect((await notes("u_alice")).some((n) => n.kind === "decision.to_confirm")).toBe(true);
    expect((await g.api("u_karim", "POST", `/api/decisions/${d.body.id}/confirm`)).status).toBe(403);
    const ok = await g.api("u_alice", "POST", `/api/decisions/${d.body.id}/confirm`);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ confirmed_by: "u_alice", to_confirm: false });
    expect(ok.body.confirmed_at).toBeTruthy();
    expect((await notes("u_karim")).some((n) => n.kind === "decision.confirmed")).toBe(true);
    expect((await g.api("u_alice", "POST", `/api/decisions/${d.body.id}/confirm`)).status).toBe(409);
    // La DG qui inscrit elle-même n'a rien à confirmer
    const own = await record("u_alice");
    expect(own.body).toMatchObject({ confirmed_by: "u_alice", to_confirm: false });
    const summary = (await g.api("u_alice", "GET", "/api/decisions")).body as Any[];
    expect(summary.filter((x) => x.to_confirm)).toHaveLength(0);
  });

  it("le droit de confirmer est celui de la DG, pas celui de l'assistante", async () => {
    const profiles = (await g.api("u_alice", "GET", "/api/org/profiles")).body as Any[];
    const by = (n: string) => profiles.find((p) => p.name === n)!.permissions as string[];
    expect(by("DG")).toContain("decisions.confirm");
    expect(by("Assistant(e) de direction")).not.toContain("decisions.confirm");
    expect(by("DGA")).not.toContain("decisions.confirm");
  });

  it("le chargé déclare la décision exécutée ; le secrétariat de la DG confirme ou renvoie", async () => {
    const d = (await record("u_alice", { owner_id: "u_hugo", due_on: day(10) })).body;
    const url = `/api/decisions/${d.id}/execution`;
    const declared = await g.api("u_hugo", "PATCH", url, { status: "executee", note: "Ateliers tenus à Kananga" });
    expect(declared.status).toBe(200);
    expect(declared.body).toMatchObject({ status: "en_cours", execution_declared_by: "u_hugo" });
    expect(declared.body.execution_note).toMatch(/Kananga/);
    expect((await notes("u_karim")).some((n) => n.kind === "decision.execution_declared")).toBe(true);
    // Le chargé ne confirme pas sa propre exécution
    expect((await g.api("u_hugo", "POST", `${url}/confirm`)).status).toBe(403);
    // Renvoi motivé
    expect((await g.api("u_karim", "POST", `${url}/return`, { comment: "" })).status).toBe(400);
    const back = await g.api("u_karim", "POST", `${url}/return`, { comment: "Joindre la liste de présence" });
    expect(back.status).toBe(200);
    expect(back.body).toMatchObject({ status: "en_cours", execution_declared_at: null });
    expect((await notes("u_hugo")).some((n) => n.kind === "decision.execution_returned")).toBe(true);
    // Nouvelle déclaration, puis confirmation par l'assistante
    await g.api("u_hugo", "PATCH", url, { status: "executee", note: "Liste de présence jointe" });
    const done = await g.api("u_karim", "POST", `${url}/confirm`);
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ status: "executee", execution_confirmed_by: "u_karim" });
    const log = await g.ctx.db.query<{ kind: string }>(
      "SELECT kind FROM activity WHERE kind LIKE 'decision.execution%' AND data->>'id' = $1 ORDER BY created_at",
      [d.id],
    );
    expect(log.map((l) => l.kind)).toEqual([
      "decision.execution_declared",
      "decision.execution_returned",
      "decision.execution_declared",
      "decision.execution_confirmed",
    ]);
  });
});

describe("compte rendu validé : réouverture motivée (R-3)", () => {
  const validated = async (validator = "u_alice") => {
    const m = (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "Comité de direction",
        meeting_date: day(-3),
        writer_id: "u_karim",
      })
    ).body;
    await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, { agenda: [{ subject: "Budget" }], attendees: [] });
    await g.ctx.db.query("UPDATE meetings SET status = 'submitted' WHERE id = $1", [m.id]);
    const v = await g.api(validator, "POST", `/api/meetings/${m.id}/validate`);
    expect(v.body.status).toBe("validated");
    return m.id as string;
  };
  beforeEach(async () => {
    // Didier peut lui aussi valider les comptes rendus
    await g.api("u_alice", "PUT", "/api/org/members/u_hugo/permissions", {
      overrides: { "meetings.validate": true, "meetings.view": true },
    });
  });

  it("seule la personne qui a validé rouvre, avec un motif ; la réouverture est tracée", async () => {
    const id = await validated("u_alice");
    const other = await g.api("u_hugo", "POST", `/api/meetings/${id}/reopen`, { reason: "Erreur de date" });
    expect(other.status).toBe(403);
    expect(other.body.error).toMatch(/a validé/);
    const bare = await g.api("u_alice", "POST", `/api/meetings/${id}/reopen`, {});
    expect(bare.status).toBe(400);
    expect(bare.body.error).toMatch(/motif/);
    const ok = await g.api("u_alice", "POST", `/api/meetings/${id}/reopen`, { reason: "Une décision a été omise" });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe("held");
    const log = await g.ctx.db.one<{ data: Any }>(
      "SELECT data FROM activity WHERE kind = 'meeting.reopened' ORDER BY created_at DESC LIMIT 1",
    );
    expect(log!.data).toMatchObject({ reason: "Une décision a été omise", validated_by: "u_alice" });
  });

  it("la DG peut rouvrir ce qu'un autre a validé ; celui-ci en est prévenu", async () => {
    const id = await validated("u_hugo");
    const ok = await g.api("u_alice", "POST", `/api/meetings/${id}/reopen`, { reason: "Relecture demandée par la DG" });
    expect(ok.status).toBe(200);
    expect((await notes("u_hugo")).some((n) => n.kind === "meeting.reopened")).toBe(true);
  });
});
