import Fastify from "fastify";
import { ouvrir, type Requetable } from "./base.js";
import { Lot } from "./enveloppe.js";
import { recevoir } from "./reception.js";
import { etatDesSources, journal, verifierChaine } from "./lecture.js";

/* =========================================================================
   Le service du centre de commande.

   Il ne contient que ce que l'application ne garde pas : le journal scellé,
   et plus tard le coffre-fort et le registre des contrôles. Tout le reste —
   comptes, sessions, droits — continue de passer par l'API de l'application
   en direct, avec la session de la personne connectée.

   **Ce service n'a pas d'identité propre.** Il ne se connecte à rien ; il
   reçoit. C'est le serveur qui vient à lui, authentifié par la signature de
   ses lots, dans un flux à sens unique où l'identité de l'acteur est une
   donnée de l'événement et non une revendication.
   ========================================================================= */

export async function construire(o: { base?: Requetable; url?: string; secret?: string } = {}) {
  const base = o.base ?? (await ouvrir(o.url));
  const app = Fastify({ logger: false });

  /* Le secret partagé authentifie une machine qui parle à une machine, et rien
     d'autre. Il ne porte aucune identité d'utilisateur et n'ouvre donc aucune
     des portes que nous avons refusé d'ouvrir : on ne peut rien faire avec, à
     part déposer des actes qui seront scellés tels quels. */
  const secret = o.secret ?? process.env.SECRET_RECEPTION ?? "";

  app.post("/reception/lots", async (req, reply) => {
    if (secret && req.headers["x-secret-reception"] !== secret)
      return reply.status(401).send({ erreur: "Secret de réception absent ou incorrect." });

    const analyse = Lot.safeParse(req.body);
    if (!analyse.success)
      /* Un lot mal formé est refusé bruyamment, et jamais rangé dans un état
         où il irait dormir : le serveur le renverra, son compteur d'essais
         montera, et l'un de nous deux ira voir. Un événement refusé doit être
         bruyant, pas rangé. */
      return reply.status(400).send({
        erreur: "Le lot ne respecte pas l'enveloppe convenue.",
        detail: analyse.error.issues.slice(0, 10),
      });

    return recevoir(base, analyse.data);
  });

  app.get("/journal", async (req) => {
    const q = req.query as Record<string, string | undefined>;
    return journal(base, {
      limite: q.limite ? Number(q.limite) : undefined,
      gravite: q.gravite, genre: q.genre, source: q.source,
    });
  });

  app.get("/verification", async () => verifierChaine(base));

  app.get("/sources", async () => etatDesSources(base));

  app.get("/sante", async () => {
    const n = await base.une<{ n: string }>("SELECT count(*) AS n FROM actes");
    const derniere = await base.une<{ faite_le: string; intacte: boolean }>(
      "SELECT faite_le, intacte FROM verifications ORDER BY id DESC LIMIT 1",
    );
    return {
      actes: Number(n?.n ?? 0),
      derniere_verification: derniere?.faite_le ?? null,
      derniere_intacte: derniere?.intacte ?? null,
      /* Dit plutôt que tu : tant que la clé publique du serveur n'est pas
         installée, la chaîne n'est inaltérable que du point de vue de la
         console, et aucun écran ne doit prétendre autre chose. */
      signatures_verifiables: false,
    };
  });

  return { app, base };
}
