import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * La table de sortie — ce que l'application doit au centre de commande.
 *
 * Décision du 26 novembre 2026 : c'est le journal du centre qui fait foi (docs/PLAN-PROJET.md § 11).
 * Le nôtre redevient une mémoire de travail, et tout ce qui s'y écrit doit partir là-bas sans jamais
 * se perdre — six pools, deux fuseaux, des antennes mal reliées. D'où cette table : l'acte et sa
 * ligne de sortie s'écrivent ensemble ou pas du tout, un expéditeur la vide quand il peut, le centre
 * acquitte.
 *
 * Les quatre propriétés que ces tests tiennent, et qu'aucun écran ne doit démentir :
 *   1. aucune perte : la ligne naît avec l'entrée de journal, dans la même transaction ;
 *   2. aucun trou : les numéros se suivent, et une transaction annulée n'en consomme pas — c'est
 *      pourquoi le compteur est une ligne et non une SEQUENCE, qui en laisserait filer un ;
 *   3. l'acte porte sa date, l'attestation en porte une autre, et l'écart est interrogeable ;
 *   4. le critique part devant : une liaison lente retarde un commentaire, pas une suppression.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Ligne = {
  id: string;
  source: string;
  sequence: string | number;
  occurred_at: string;
  origin: string;
  origin_id: string;
  kind: string;
  severity: string;
  state: string;
  attempts: number;
  attested_at: string | null;
  last_error: string | null;
};

const num = (v: string | number) => Number(v);
const prochain = async () =>
  num((await g.ctx.db.one<{ next: string }>("SELECT next FROM outbox_sequence WHERE source = $1", [g.ctx.svc.sortie.source]))?.next ?? 1);
const ligneDe = (originId: string) =>
  g.ctx.db.one<Ligne>("SELECT * FROM outbox WHERE origin_id = $1", [originId]);

describe("une entrée de journal ne part jamais seule", () => {
  it("un acte métier dépose une ligne et une seule, qui porte la date de l'acte et non celle de l'envoi", async () => {
    const org = g.org;
    await g.ctx.svc.log("u_alice", "partner.created", { orgId: org, data: { name: "Partenaire" } });

    const actes = await g.ctx.db.query<{ id: string; created_at: string }>(
      "SELECT id, created_at FROM activity WHERE kind = 'partner.created' ORDER BY created_at DESC LIMIT 1",
    );
    expect(actes).toHaveLength(1);
    const lignes = await g.ctx.db.query<Ligne>("SELECT * FROM outbox WHERE origin_id = $1", [actes[0].id]);
    expect(lignes).toHaveLength(1);

    const l = lignes[0];
    expect(l.origin).toBe("activity");
    expect(l.kind).toBe("partner.created");
    expect(l.state).toBe("en_attente");
    expect(l.attested_at).toBeNull();
    expect(l.attempts).toBe(0);
    expect(l.id).toMatch(/^act_/);
    // La date de l'acte est celle de l'entrée de journal, au même instant : c'est la propriété qui
    // permet de dire plus tard « l'acte du 26 à 13 h 28, attesté le 26 à 13 h 31 ».
    expect(new Date(l.occurred_at).getTime()).toBe(new Date(actes[0].created_at).getTime());
  });

  it("un acte de sécurité dépose aussi : le journal probant ne connaît pas deux régimes", async () => {
    await g.ctx.auth.record("login.failed", { userId: "u_hugo", ip: "198.51.100.7" });
    const ev = await g.ctx.db.one<{ id: string }>(
      "SELECT id FROM security_events WHERE kind = 'login.failed' ORDER BY created_at DESC LIMIT 1",
    );
    const l = await ligneDe(ev!.id);
    expect(l?.origin).toBe("security");
    expect(l?.kind).toBe("login.failed");
    expect(l?.severity).toBe("critique");
  });
});

describe("les numéros se suivent, et un trou veut dire un acte perdu", () => {
  it("deux actes prennent deux numéros consécutifs", async () => {
    const depart = await prochain();
    await g.ctx.svc.log("u_alice", "partner.note", { orgId: g.org, data: { n: 1 } });
    await g.ctx.svc.log("u_alice", "partner.note", { orgId: g.org, data: { n: 2 } });
    const suite = await g.ctx.db.query<Ligne>(
      "SELECT sequence FROM outbox WHERE sequence >= $1 ORDER BY sequence",
      [depart],
    );
    expect(suite.map((l) => num(l.sequence))).toEqual([depart, depart + 1]);
  });

  it("une transaction annulée ne laisse ni ligne ni numéro consommé", async () => {
    const depart = await prochain();
    await expect(
      g.ctx.db.tx(async (q) => {
        await g.ctx.svc.log("u_alice", "partner.note", { orgId: g.org, data: { perdu: true } }, q);
        throw new Error("l'acte échoue après son journal");
      }),
    ).rejects.toThrow();

    // Ni l'entrée de journal, ni sa ligne de sortie.
    expect(await g.ctx.db.query("SELECT id FROM outbox WHERE sequence >= $1", [depart])).toHaveLength(0);
    // Et surtout : le numéro n'est pas parti avec elle. Une SEQUENCE PostgreSQL l'aurait laissé filer,
    // et le centre aurait vu un trou là où rien n'a été perdu — une alarme pour un acte qui n'a jamais eu lieu.
    expect(await prochain()).toBe(depart);
    await g.ctx.svc.log("u_alice", "partner.note", { orgId: g.org, data: { apres: true } });
    const l = await g.ctx.db.one<Ligne>("SELECT * FROM outbox WHERE sequence = $1", [depart]);
    expect(l?.kind).toBe("partner.note");
  });
});

describe("l'attestation est un second fait, avec sa propre date", () => {
  it("en attente, puis attesté : l'état se lit pour n'importe quelle entrée de journal", async () => {
    await g.ctx.svc.log("u_alice", "decision.recorded", { orgId: g.org, data: {} });
    const acte = (await g.ctx.db.one<{ id: string }>(
      "SELECT id FROM activity WHERE kind = 'decision.recorded' ORDER BY created_at DESC LIMIT 1",
    ))!;

    const avant = await g.ctx.svc.sortie.etat(acte.id);
    expect(avant?.state).toBe("en_attente");
    expect(avant?.attested_at).toBeNull();

    const lot = await g.ctx.svc.sortie.aExpedier(50);
    expect(lot.some((l) => l.origin_id === acte.id)).toBe(true);
    expect(await g.ctx.svc.sortie.attester(lot.map((l) => l.id))).toBe(lot.length);

    const apres = await g.ctx.svc.sortie.etat(acte.id);
    expect(apres?.state).toBe("atteste");
    expect(apres?.attested_at).not.toBeNull();
    // « Intègre depuis sa réception » suppose une réception datée : sans elle, l'écran ne peut rien affirmer.
    expect(new Date(apres!.attested_at!).getTime()).toBeGreaterThanOrEqual(new Date(apres!.occurred_at).getTime());
  });

  it("une attestation qui échoue laisse la ligne en attente et compte l'essai : on renvoie, on ne perd pas", async () => {
    await g.ctx.svc.log("u_alice", "partner.contact", { orgId: g.org, data: {} });
    const acte = (await g.ctx.db.one<{ id: string }>(
      "SELECT id FROM activity WHERE kind = 'partner.contact' ORDER BY created_at DESC LIMIT 1",
    ))!;
    const l = (await ligneDe(acte.id))!;

    await g.ctx.svc.sortie.echec([l.id], "centre injoignable");
    const apres = (await ligneDe(acte.id))!;
    expect(apres.state).toBe("en_attente");
    expect(apres.attempts).toBe(1);
    expect(apres.last_error).toBe("centre injoignable");
    // Elle repart au prochain passage : livrer au moins une fois, c'est accepter les doublons.
    expect((await g.ctx.svc.sortie.aExpedier(200)).some((x) => x.id === l.id)).toBe(true);
  });

  it("le retard se chiffre, pour que l'écran ne dise jamais « fait » quand la preuve n'est pas arrivée", async () => {
    const vide = await g.ctx.svc.sortie.attester((await g.ctx.svc.sortie.aExpedier(5000)).map((l) => l.id));
    expect(vide).toBeGreaterThanOrEqual(0);
    expect((await g.ctx.svc.sortie.retard()).pending).toBe(0);

    await g.ctx.svc.log("u_alice", "meeting.convened", { orgId: g.org, data: {} });
    const r = await g.ctx.svc.sortie.retard();
    expect(r.pending).toBe(1);
    expect(r.oldest).not.toBeNull();
  });
});

describe("le critique part devant", () => {
  it("une suppression faite après un commentaire s'expédie avant lui", async () => {
    await g.ctx.svc.sortie.attester((await g.ctx.svc.sortie.aExpedier(5000)).map((l) => l.id));
    await g.ctx.svc.log("u_alice", "task.comment", { orgId: g.org, data: {} });
    await g.ctx.svc.log("u_alice", "partner.state", { orgId: g.org, data: {} });
    await g.ctx.svc.log("u_alice", "partner.deleted", { orgId: g.org, data: {} });

    const lot = await g.ctx.svc.sortie.aExpedier(10);
    expect(lot.map((l) => l.kind)).toEqual(["partner.deleted", "partner.state", "task.comment"]);
    expect(lot.map((l) => l.severity)).toEqual(["critique", "importante", "normale"]);
    // L'ordre d'expédition n'est pas l'ordre des faits : c'est `sequence` et `occurred_at` qui le portent,
    // et le centre ne doit pas conclure de son ordre d'arrivée à une chronologie.
    expect(num(lot[0].sequence)).toBeGreaterThan(num(lot[2].sequence));
  });
});

describe("le critique double l'arriéré, et pas seulement ses voisins", () => {
  it("derrière deux cents actes en attente, une suppression sort dans la première fenêtre", async () => {
    await g.ctx.svc.sortie.attester((await g.ctx.svc.sortie.aExpedier(5000)).map((l) => l.id));
    for (let i = 0; i < 200; i++) await g.ctx.svc.log("u_alice", "task.comment", { orgId: g.org, data: { i } });
    await g.ctx.svc.log("u_alice", "partner.deleted", { orgId: g.org, data: {} });

    // Une fenêtre de dix, prise sur deux cent un actes en attente. Trier après l'avoir tirée
    // laisserait la suppression au fond de la file : c'est le défaut que ce test tient fermé.
    const lot = await g.ctx.svc.sortie.aExpedier(10);
    expect(lot).toHaveLength(10);
    expect(lot[0].kind).toBe("partner.deleted");
    expect(lot[0].severity).toBe("critique");
    expect(num(lot[0].sequence)).toBeGreaterThan(num(lot[9].sequence));
  });
});
