import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Referentials } from "./referentials.js";

type Id = { Params: { id: string } };
const Props = z.record(z.string().max(60), z.union([z.boolean(), z.string().max(60)]));
const Fields = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  plural: z.string().trim().max(80).optional(),
  color: z.string().max(30).optional(),
  icon: z.string().max(30).optional(),
  position: z.number().min(-1e9).max(1e9).optional(),
  archived: z.boolean().optional(),
  props: Props.optional(),
});

/** Référentiels de l'institution : lus par tous, modifiés par l'administrateur système seul. Aucune suppression. */
export function referentialRoutes(r: FastifyInstance, ref: Referentials) {
  r.get("/api/referentials", async (req) => ref.all(req.userId, req.orgId));
  r.post("/api/admin/referentials", async (req) => {
    const b = Fields.extend({ list: z.string().max(40), label: z.string().trim().min(1).max(80) }).parse(req.body);
    return ref.create(req.userId, req.orgId, b.list, b);
  });
  // « Autre… » : le gestionnaire du module ajoute un type qui manque ; il ne le renomme ni ne l'archive
  r.post("/api/referentials", async (req) => {
    const b = Fields.pick({ plural: true, props: true })
      .extend({ list: z.string().max(40), label: z.string().trim().min(1).max(80) })
      .parse(req.body);
    return ref.contribute(req.userId, req.orgId, b.list, b);
  });
  // Le code n'est jamais modifiable : il est ignoré s'il est envoyé
  r.patch<Id>("/api/admin/referentials/:id", async (req) =>
    ref.update(req.userId, req.orgId, req.params.id, Fields.parse(req.body)),
  );
}
