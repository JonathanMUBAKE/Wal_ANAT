import { Activities } from "./activities.js";
import { ATTACHMENT_MAX_BYTES, cleanName } from "./attachments.js";
import { uid } from "./db.js";
import { type DocumentMeta, checkDocumentMeta } from "./document-meta.js";
import { ALLOWED_FORMATS, detectType } from "./documents/filetypes.js";
import { Referentials } from "./referentials.js";
import { Registers } from "./registers.js";
import { HttpError, badRequest, forbidden, notFound, today, type Services } from "./services.js";

/*
 * Documents des dossiers : l'espace Documents d'un projet, la pièce d'un courrier, les documents d'une activité.
 * Chaque document est décrit selon sa nature (référentiel), suit les droits de son dossier, et une pièce officielle
 * ne se supprime jamais. Les pièces jointes des tâches restent rangées dans leurs tâches.
 */

export const OWNERS = ["project", "activity", "mail", "agent"] as const;
export type Owner = (typeof OWNERS)[number];
const COLUMN: Record<Owner, "project_id" | "activity_id" | "correspondence_id" | "agent_user_id"> = {
  project: "project_id",
  activity: "activity_id",
  mail: "correspondence_id",
  // Pièces du dossier d'un agent : actes de nomination, contrats, arrêtés (thème 6, D-9)
  agent: "agent_user_id",
};
const MAX_DOCUMENTS = 200;
const COLUMNS = `d.id, d.project_id, d.activity_id, d.correspondence_id, d.nature_code, d.official, d.title, d.other_label,
  d.reference, d.issued_on::text AS issued_on, d.expires_on::text AS expires_on, d.notes, d.filename, d.mime, d.size,
  d.uploader_id, u.name AS uploader_name, d.created_at, d.updated_at`;

interface Row {
  id: string;
  org_id: string;
  project_id: string | null;
  activity_id: string | null;
  correspondence_id: string | null;
  official: boolean;
  uploader_id: string | null;
  nature_code: string;
  title: string;
  other_label: string;
  reference: string;
  issued_on: string | null;
  expires_on: string | null;
  notes: string;
  filename: string;
}

export class DossierDocuments {
  private ref: Referentials;
  constructor(private svc: Services) {
    this.ref = new Referentials(svc);
  }

  /** Droits sur le dossier : lire ; ajouter et décrire (write) ; supprimer toute pièce non officielle (manage). */
  private async owner(actorId: string, kind: Owner, id: string) {
    if (kind === "project") {
      const p = await this.svc.db.one<{ org_id: string }>("SELECT org_id FROM projects WHERE id = $1", [id]);
      if (!p) throw notFound("Dossier introuvable");
      await this.svc.require(actorId, id, "viewer").catch(() => {
        throw notFound("Dossier introuvable");
      });
      const role = await this.svc.projectRole(actorId, id);
      return { orgId: p.org_id, write: role === "editor" || role === "admin", manage: role === "admin" };
    }
    if (kind === "activity") {
      const a = await new Activities(this.svc).get(actorId, id).catch((e: { status?: number }) => {
        throw e.status === 403 ? notFound("Dossier introuvable") : e;
      });
      return { orgId: a.org_id, write: a.can.edit, manage: a.can.remove };
    }
    if (kind === "agent") {
      // Le service RH dépose et lit ; l'agent lit les siennes ; personne d'autre, pas même son chef
      const orgs = await this.svc.db.query<{ org_id: string }>(
        "SELECT a.org_id FROM agent_records a JOIN org_members om ON om.org_id = a.org_id AND om.user_id = $2 WHERE a.user_id = $1",
        [id, actorId],
      );
      for (const { org_id } of orgs) {
        const p = await this.svc.permissionsOf(actorId, org_id);
        const hr = p.includes("hr.manage");
        if (hr || p.includes("hr.view") || actorId === id)
          return { orgId: org_id, write: hr && actorId !== id, manage: hr && actorId !== id };
      }
      throw notFound("Dossier introuvable");
    }
    const { m, manager } = await new Registers(this.svc).access(actorId, id).catch((e: { status?: number }) => {
      throw e.status === 403 ? notFound("Dossier introuvable") : e;
    });
    return { orgId: m.org_id, write: manager || m.assignee_id === actorId, manage: manager };
  }

  private async human(actorId: string) {
    if ((await this.svc.userOrNull(actorId))?.is_ai)
      throw forbidden("Un document est déposé par une personne, jamais par un coéquipier IA");
  }

  /** Documents du dossier, et le droit d'en déposer (pour afficher « Ajouter un document »). */
  async folder(actorId: string, kind: Owner, id: string) {
    const o = await this.owner(actorId, kind, id);
    return { documents: await this.list(actorId, kind, id), can: { add: o.write } };
  }

  async list(actorId: string, kind: Owner, id: string) {
    const o = await this.owner(actorId, kind, id);
    const rows = await this.svc.db.query<Row & { expires_on: string | null }>(
      `SELECT ${COLUMNS} FROM dossier_documents d LEFT JOIN users u ON u.id = d.uploader_id
       WHERE d.${COLUMN[kind]} = $1 ORDER BY d.created_at DESC`,
      [id],
    );
    const t = today();
    return rows.map((d) => ({
      ...d,
      expired: !!d.expires_on && d.expires_on < t,
      can: {
        edit: o.write || d.uploader_id === actorId,
        delete: !d.official && (o.manage || d.uploader_id === actorId),
      },
    }));
  }

  async add(
    actorId: string,
    kind: Owner,
    id: string,
    filename: string,
    data: Buffer,
    i: DocumentMeta & { nature: string },
  ) {
    await this.human(actorId);
    const o = await this.owner(actorId, kind, id);
    if (!o.write) throw forbidden("Vous ne pouvez pas déposer de document dans ce dossier");
    const nature = await this.ref.resolve(o.orgId, "partner_doc_nature", i.nature);
    const meta = checkDocumentMeta(nature, i);
    if (!data.length) throw badRequest("Le fichier est vide");
    if (data.length > ATTACHMENT_MAX_BYTES) throw new HttpError(413, "Fichier trop volumineux : 25 Mo au maximum");
    const name = cleanName(filename);
    const type = detectType(name, data);
    if (!type) throw new HttpError(415, `Format non pris en charge. Formats acceptés : ${ALLOWED_FORMATS}`);
    const n = await this.svc.db.one<{ n: number }>(
      `SELECT count(*)::int AS n FROM dossier_documents WHERE ${COLUMN[kind]} = $1`,
      [id],
    );
    if ((n?.n ?? 0) >= MAX_DOCUMENTS)
      throw badRequest(`Un dossier ne peut pas avoir plus de ${MAX_DOCUMENTS} documents`);
    const docId = uid("ddc");
    await this.svc.db.query(
      `INSERT INTO dossier_documents (id, org_id, ${COLUMN[kind]}, nature_code, official, title, other_label, reference,
        issued_on, expires_on, notes, filename, mime, size, data, uploader_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        docId,
        o.orgId,
        id,
        nature.code,
        !!nature.props.official,
        meta.title || name,
        meta.other_label,
        meta.reference,
        meta.issued_on,
        meta.expires_on,
        meta.notes,
        name,
        type.mime,
        data.length,
        data,
        actorId,
      ],
    );
    await this.svc.log(actorId, "dossier.document", {
      orgId: o.orgId,
      projectId: kind === "project" ? id : null,
      data: { owner: kind, id, document: docId, nature: nature.code, title: meta.title || name },
    });
    return (await this.list(actorId, kind, id)).find((d) => d.id === docId);
  }

  private async row(actorId: string, docId: string) {
    const d = await this.svc.db.one<Row>(
      `SELECT d.id, d.org_id, d.project_id, d.activity_id, d.correspondence_id, d.official, d.uploader_id, d.nature_code,
        d.title, d.other_label, d.reference, d.issued_on::text AS issued_on, d.expires_on::text AS expires_on, d.notes, d.filename
       FROM dossier_documents d WHERE d.id = $1`,
      [docId],
    );
    if (!d) throw notFound("Document introuvable");
    const kind: Owner = d.project_id ? "project" : d.activity_id ? "activity" : "mail";
    const ownerId = (d.project_id ?? d.activity_id ?? d.correspondence_id) as string;
    const o = await this.owner(actorId, kind, ownerId).catch(() => {
      throw notFound("Document introuvable");
    });
    return { d, o, kind, ownerId };
  }

  async download(actorId: string, docId: string) {
    const { d, o } = await this.row(actorId, docId);
    const file = await this.svc.db.one<{ mime: string; data: Buffer }>(
      "SELECT mime, data FROM dossier_documents WHERE id = $1",
      [docId],
    );
    await this.svc.log(actorId, "dossier.document.read", { orgId: o.orgId, data: { document: docId } });
    return { filename: d.filename, mime: file!.mime, data: file!.data };
  }

  async update(actorId: string, docId: string, i: DocumentMeta & { nature_code?: string }) {
    await this.human(actorId);
    const { d, o, kind, ownerId } = await this.row(actorId, docId);
    if (!o.write && d.uploader_id !== actorId) throw forbidden("Vous ne pouvez pas modifier ce document");
    const nature = await this.ref.resolve(o.orgId, "partner_doc_nature", i.nature_code ?? d.nature_code, d.nature_code);
    if (d.official && !nature.props.official)
      throw new HttpError(409, "Un document officiel reste officiel : choisissez une autre nature officielle");
    const meta = checkDocumentMeta(nature, {
      title: i.title ?? d.title,
      other_label: i.other_label ?? d.other_label,
      reference: i.reference ?? d.reference,
      issued_on: i.issued_on !== undefined ? i.issued_on : d.issued_on,
      expires_on: i.expires_on !== undefined ? i.expires_on : d.expires_on,
      notes: i.notes ?? d.notes,
    });
    if (!meta.title) throw badRequest("Le nom du document est obligatoire");
    await this.svc.db.query(
      `UPDATE dossier_documents SET nature_code = $1, official = $2, title = $3, other_label = $4, reference = $5,
        issued_on = $6, expires_on = $7, notes = $8, updated_at = now() WHERE id = $9`,
      [
        nature.code,
        d.official || !!nature.props.official,
        meta.title,
        meta.other_label,
        meta.reference,
        meta.issued_on,
        meta.expires_on,
        meta.notes,
        docId,
      ],
    );
    await this.svc.log(actorId, "dossier.document.updated", {
      orgId: o.orgId,
      data: { owner: kind, id: ownerId, document: docId, fields: Object.keys(i) },
    });
    return (await this.list(actorId, kind, ownerId)).find((x) => x.id === docId);
  }

  async remove(actorId: string, docId: string) {
    await this.human(actorId);
    const { d, o, kind, ownerId } = await this.row(actorId, docId);
    if (d.official) throw new HttpError(409, "Un document officiel ne se supprime pas : il reste au dossier");
    if (!o.manage && d.uploader_id !== actorId)
      throw forbidden("Seuls l'auteur du document et les responsables du dossier le suppriment");
    await this.svc.db.query("DELETE FROM dossier_documents WHERE id = $1", [docId]);
    await this.svc.log(actorId, "dossier.document.deleted", {
      orgId: o.orgId,
      data: { owner: kind, id: ownerId, title: d.title },
    });
    return { ok: true };
  }
}
