import { todayIso } from "@/lib/format";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Eye, EyeOff, FileText, Lock, Paperclip, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button, ConfirmDialog, Empty, cn } from "./ui";
import { RoundBtn } from "./collection";
import { Drawer, DrawerSection } from "./drawer";
import { FilePreview } from "./AttachmentPreview";
import { Field, Input, Section, Select, Table, Td, Textarea, Tr, frDate } from "./gov";
import { Fact, Facts, RowActions } from "./record";
import { RefSelect } from "./refselect";
import { api } from "@/lib/api";
import { useCan, useMe } from "@/lib/hooks";
import { type RefValue, useReferentials } from "@/lib/referentials";

/*
 * Documents décrits selon leur nature (docs/DESIGN-SYSTEM.md § 4) : grille CRUD et formulaire dont les champs
 * dépendent du type. Communs aux pièces des partenaires et des accords, et aux documents des dossiers (projet,
 * courrier, activité). Le serveur refait chaque contrôle.
 */

export interface PartnerDocument {
  id: string;
  agreement_id?: string | null;
  nature_code: string;
  official: boolean;
  filename: string;
  size: number;
  created_at: string;
  uploader_id: string | null;
  uploader_name: string | null;
  title: string;
  other_label: string;
  reference: string;
  issued_on: string | null;
  expires_on: string | null;
  notes: string;
  expired: boolean;
  /** Droits calculés par le serveur (documents des dossiers). */
  can?: { edit: boolean; delete: boolean };
}
/** Où lire, déposer et modifier les documents. */
export interface DocEndpoints {
  item: (id: string) => string;
  upload: (query: URLSearchParams) => string;
}
export const partnerDocs = (partnerId: string): DocEndpoints => ({
  item: (id) => `/api/partner-documents/${id}`,
  upload: (q) => `/api/partners/${partnerId}/documents?${q}`,
});
export const dossierDocs = (owner: "project" | "activity" | "mail", ownerId: string): DocEndpoints => ({
  item: (id) => `/api/dossier-documents/${id}`,
  upload: (q) => {
    q.set("owner", owner);
    q.set("owner_id", ownerId);
    return `/api/dossier-documents?${q}`;
  },
});

const fail = (e: unknown) => toast.error((e as Error).message);
const today = () => todayIso();
const kb = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1)} Mo`;

// ------------------------------------------------------------------ pièces de collaboration
/** Ce qu'une nature de pièce demande, d'après le référentiel (docs/DESIGN-SYSTEM.md § 4, « Grille CRUD »). */
const asks = (n?: RefValue) => ({
  dated: !!n?.props.dated,
  expires: !!n?.props.expires,
  referenced: !!n?.props.referenced,
  precise: !!n?.props.precise,
  official: !!n?.props.official,
});
const natureLabel = (doc: Pick<PartnerDocument, "nature_code" | "other_label">, natures: RefValue[]) => {
  const n = natures.find((x) => x.code === doc.nature_code);
  return n?.props.precise && doc.other_label ? `${n.label} : ${doc.other_label}` : (n?.label ?? doc.nature_code);
};

export function DocumentsPanel({
  ends,
  title = "Documents",
  agreementId,
  documents,
  agreements,
  canAdd,
  onChange,
}: {
  ends: DocEndpoints;
  title?: string;
  agreementId?: string;
  documents: PartnerDocument[];
  agreements?: { id: string; reference: string | null; title: string }[];
  /** Gestionnaire ou point focal du partenaire : il ajoute et modifie toutes les pièces. */
  canAdd: boolean;
  onChange: () => void;
}) {
  const { data: refs } = useReferentials();
  const { data: me } = useMe();
  const can = useCan();
  const natures = refs?.partner_doc_nature ?? [];
  const [open, setOpen] = useState<{ doc: PartnerDocument | null; editing: boolean; preview?: boolean } | null>(null);
  const [removing, setRemoving] = useState<PartnerDocument | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => api.del(ends.item(id)),
    onSuccess: () => {
      onChange();
      toast.success("Document supprimé");
    },
    onError: fail,
  });
  // Les documents des dossiers portent leurs droits ; les pièces des partenaires suivent l'annuaire
  const canEdit = (doc: PartnerDocument) => doc.can?.edit ?? (canAdd || doc.uploader_id === me?.id);
  const canDelete = (doc: PartnerDocument) =>
    doc.can?.delete ?? (!doc.official && (can("partners.manage") || doc.uploader_id === me?.id));
  return (
    <Section
      title={title}
      aside={
        canAdd && (
          <Button icon={<Upload className="size-4" />} onClick={() => setOpen({ doc: null, editing: true })}>
            Ajouter un document
          </Button>
        )
      }
    >
      {documents.length ? (
        <Table
          head={["Document", "Type", "Référence", "Production", "Expiration", ...(agreementId ? [] : ["Accord"]), ""]}
        >
          {documents.map((doc) => {
            const ag = agreements?.find((x) => x.id === doc.agreement_id);
            return (
              <Tr key={doc.id} onClick={() => setOpen({ doc, editing: false })}>
                <Td className="min-w-[200px]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <FileText className="size-4 shrink-0 text-muted" />
                    {doc.title || doc.filename}
                    {doc.official && <Lock className="size-3 shrink-0 text-muted" aria-label="Pièce officielle" />}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    {doc.filename} · {kb(doc.size)}
                  </span>
                </Td>
                <Td className="text-muted">{natureLabel(doc, natures)}</Td>
                <Td className="font-mono text-[12px] text-muted">{doc.reference || "—"}</Td>
                <Td className="tabular text-muted">{frDate(doc.issued_on)}</Td>
                <Td className={cn("tabular", doc.expired ? "font-medium text-danger" : "text-muted")}>
                  {frDate(doc.expires_on)}
                  {doc.expired && <span className="block text-[11.5px] font-normal">expiré</span>}
                </Td>
                {!agreementId && <Td className="text-muted">{ag ? (ag.reference ?? ag.title) : "—"}</Td>}
                <Td>
                  <RowActions
                    label={doc.title || doc.filename}
                    onEdit={() => setOpen({ doc, editing: true })}
                    canEdit={canEdit(doc)}
                    onDelete={() => setRemoving(doc)}
                    canDelete={canDelete(doc)}
                  >
                    <RoundBtn
                      label={`Aperçu de ${doc.filename}`}
                      onClick={() => setOpen({ doc, editing: false, preview: true })}
                    >
                      <Eye className="size-4" />
                    </RoundBtn>
                    <RoundBtn label={`Télécharger ${doc.filename}`} href={ends.item(doc.id)}>
                      <Download className="size-4" />
                    </RoundBtn>
                  </RowActions>
                </Td>
              </Tr>
            );
          })}
        </Table>
      ) : (
        <Empty icon={<Paperclip className="size-6" />} title="Aucun document">
          Conventions signées, contrats, avenants, rapports, comptes rendus : chaque document est décrit par son type,
          ses dates et sa référence.
        </Empty>
      )}
      {open && (
        <DocumentDialog
          ends={ends}
          agreementId={agreementId}
          agreements={agreements}
          doc={open.doc}
          startEditing={open.editing}
          startPreview={!!open.preview}
          canEdit={open.doc ? canEdit(open.doc) : canAdd}
          onClose={() => setOpen(null)}
          onSaved={onChange}
        />
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={`Supprimer « ${removing?.title || removing?.filename} » ?`}
        description="La suppression est tracée. Une pièce officielle (convention signée, contrat, avenant…) ne se supprime jamais."
        confirmLabel="Supprimer"
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </Section>
  );
}

type DocForm = {
  nature: string;
  title: string;
  other_label: string;
  reference: string;
  issued_on: string;
  expires_on: string;
  notes: string;
  agreement_id: string;
};

/** Fiche d'un document : lecture, puis « Modifier » ; en création, le formulaire et le fichier. */
function DocumentDialog({
  ends,
  agreementId,
  agreements,
  doc,
  startEditing,
  startPreview = false,
  canEdit,
  onClose,
  onSaved,
}: {
  ends: DocEndpoints;
  agreementId?: string;
  agreements?: { id: string; reference: string | null; title: string }[];
  doc: PartnerDocument | null;
  startEditing: boolean;
  startPreview?: boolean;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: refs } = useReferentials();
  const natures = refs?.partner_doc_nature ?? [];
  const [editing, setEditing] = useState(startEditing || !doc);
  // L'aperçu ne se charge qu'à la demande : un document se consulte d'abord par sa fiche
  const [previewing, setPreviewing] = useState(startPreview);
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState<DocForm>({
    nature: doc?.nature_code ?? "",
    title: doc?.title ?? "",
    other_label: doc?.other_label ?? "",
    reference: doc?.reference ?? "",
    issued_on: doc?.issued_on ?? "",
    expires_on: doc?.expires_on ?? "",
    notes: doc?.notes ?? "",
    agreement_id: doc?.agreement_id ?? agreementId ?? "",
  });
  const [initial] = useState(() => JSON.stringify(f));
  const dirty = editing && (JSON.stringify(f) !== initial || !!file);
  const nature = natures.find((n) => n.code === f.nature);
  const a = asks(nature);
  // Contrôles affichés sous les champs avant l'envoi ; le serveur les refait de toute façon
  const errors = {
    title: doc && !f.title.trim() ? "Le nom du document est obligatoire" : null,
    issued_on:
      a.dated && !f.issued_on ? "Obligatoire pour ce type" : f.issued_on > today() ? "Pas dans le futur" : null,
    expires_on:
      a.expires && !f.expires_on
        ? "Obligatoire pour ce type"
        : f.expires_on && f.issued_on && f.expires_on < f.issued_on
          ? "Précède la date de production"
          : null,
    reference: a.referenced && !f.reference.trim() ? "Obligatoire pour ce type" : null,
    other_label: a.precise && !f.other_label.trim() ? "Précisez la nature du document" : null,
  };
  const invalid = !f.nature || (!doc && !file) || Object.values(errors).some(Boolean);
  const meta = () => ({
    title: f.title.trim() || undefined,
    other_label: a.precise ? f.other_label.trim() : "",
    reference: f.reference.trim(),
    issued_on: f.issued_on || null,
    expires_on: f.expires_on || null,
    notes: f.notes.trim(),
  });
  const save = useMutation({
    mutationFn: () => {
      if (doc) return api.patch(ends.item(doc.id), { ...meta(), nature_code: f.nature });
      const q = new URLSearchParams({ nature: f.nature });
      for (const [k, v] of Object.entries(meta())) if (v) q.set(k, String(v));
      if (f.agreement_id) q.set("agreement_id", f.agreement_id);
      return api.upload(ends.upload(q), file!);
    },
    onSuccess: () => {
      onSaved();
      toast.success(doc ? "Document modifié" : "Document ajouté");
      onClose();
    },
    onError: fail,
  });
  const set = (k: keyof DocForm) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const ag = agreements?.find((x) => x.id === (doc?.agreement_id ?? f.agreement_id));
  return (
    <Drawer
      open
      onClose={onClose}
      width={820}
      dirty={dirty}
      title={doc ? doc.title || doc.filename : "Ajouter un document"}
      subtitle={
        doc
          ? `${natureLabel(doc, natures)}${doc.official ? " · pièce officielle" : ""}`
          : "Choisissez le type : les informations demandées en dépendent."
      }
      footer={
        editing ? (
          <>
            <Button
              onClick={
                doc
                  ? () => {
                      setF(JSON.parse(initial));
                      setFile(null);
                      setEditing(false);
                    }
                  : onClose
              }
            >
              Annuler
            </Button>
            <Button variant="primary" disabled={invalid} loading={save.isPending} onClick={() => save.mutate()}>
              Enregistrer
            </Button>
          </>
        ) : (
          <>
            {doc && (
              <Button
                icon={previewing ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                onClick={() => setPreviewing(!previewing)}
              >
                {previewing ? "Masquer l'aperçu" : "Aperçu"}
              </Button>
            )}
            {doc && (
              <a
                href={ends.item(doc.id)}
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line px-3 text-[13px] font-medium hover:bg-hover"
              >
                <Download className="size-4" /> Télécharger
              </a>
            )}
            {canEdit && (
              <Button icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                Modifier
              </Button>
            )}
            <Button onClick={onClose}>Fermer</Button>
          </>
        )
      }
    >
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type de document" required>
            {(x) => (
              <RefSelect
                {...x}
                list="partner_doc_nature"
                autoFocus={!doc}
                value={f.nature}
                onChange={(nature) => setF({ ...f, nature })}
                filter={(n) => !doc?.official || !!n.props.official}
                suffix={(n) => (n.props.official ? " (officielle)" : "")}
              />
            )}
          </Field>
          {a.precise ? (
            <Field label="Préciser le type" required error={errors.other_label}>
              {(x) => (
                <Input {...x} value={f.other_label} onChange={set("other_label")} placeholder="Plan, étude, note…" />
              )}
            </Field>
          ) : (
            <span />
          )}
          <Field
            label="Nom du document"
            required={!!doc}
            className="sm:col-span-2"
            error={errors.title}
            hint={!doc ? "Par défaut, le nom du fichier." : undefined}
          >
            {(x) => <Input {...x} value={f.title} onChange={set("title")} />}
          </Field>
          {f.nature && (
            <>
              {(a.referenced || f.reference) && (
                <Field label="Référence" required={a.referenced} error={errors.reference}>
                  {(x) => <Input {...x} value={f.reference} onChange={set("reference")} placeholder="Numéro, cote…" />}
                </Field>
              )}
              {(a.dated || f.issued_on) && (
                <Field label="Date de production" required={a.dated} error={errors.issued_on}>
                  {(x) => <Input {...x} type="date" max={today()} value={f.issued_on} onChange={set("issued_on")} />}
                </Field>
              )}
              {(a.expires || f.expires_on) && (
                <Field label="Date d'expiration" required={a.expires} error={errors.expires_on}>
                  {(x) => (
                    <Input
                      {...x}
                      type="date"
                      min={f.issued_on || undefined}
                      value={f.expires_on}
                      onChange={set("expires_on")}
                    />
                  )}
                </Field>
              )}
            </>
          )}
          {!doc && !agreementId && !!agreements?.length && (
            <Field label="Accord concerné" className="sm:col-span-2">
              {(x) => (
                <Select {...x} value={f.agreement_id} onChange={set("agreement_id")}>
                  <option value="">Aucun accord en particulier</option>
                  {agreements.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.reference ?? "En préparation"} — {g.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field label="Description" className="sm:col-span-2">
            {(x) => <Textarea {...x} rows={2} value={f.notes} onChange={set("notes")} />}
          </Field>
          {!doc && (
            <Field label="Fichier" required className="sm:col-span-2" hint={`${ALLOWED_FORMATS} · 25 Mo au maximum`}>
              {(x) => (
                <input
                  {...x}
                  type="file"
                  className="block w-full text-[13px] file:mr-3 file:h-9 file:rounded-[10px] file:border file:border-line file:bg-panel file:px-3 file:text-[13px]"
                  onChange={(e) => {
                    const picked = e.target.files?.[0] ?? null;
                    setFile(picked);
                    if (picked && !f.title) setF({ ...f, title: picked.name.replace(/\.[^.]+$/, "") });
                  }}
                />
              )}
            </Field>
          )}
          {a.official && (
            <p className="text-[12px] text-muted sm:col-span-2">
              Pièce officielle : elle restera au dossier et ne pourra pas être supprimée.
            </p>
          )}
        </div>
      ) : (
        doc && (
          <>
            <Facts className="p-0 pt-0">
              <Fact label="Type">{natureLabel(doc, natures)}</Fact>
              <Fact label="Référence">{doc.reference}</Fact>
              <Fact label="Date de production">{doc.issued_on && frDate(doc.issued_on)}</Fact>
              <Fact label="Date d'expiration">
                {doc.expires_on && (
                  <span className={doc.expired ? "text-danger" : ""}>
                    {frDate(doc.expires_on)}
                    {doc.expired ? " (expiré)" : ""}
                  </span>
                )}
              </Fact>
              {!agreementId && <Fact label="Accord">{ag ? (ag.reference ?? ag.title) : null}</Fact>}
              <Fact label="Fichier">
                {doc.filename} · {kb(doc.size)}
              </Fact>
              <Fact label="Ajouté par">
                {doc.uploader_name} {frDate(doc.created_at.slice(0, 10))}
              </Fact>
              <Fact label="Description" wide>
                {doc.notes && <span className="whitespace-pre-wrap font-normal">{doc.notes}</span>}
              </Fact>
            </Facts>
            {previewing && (
              <div className="mt-5">
                <DrawerSection title="Aperçu">
                  <FilePreview url={ends.item(doc.id)} name={doc.filename} />
                </DrawerSection>
              </div>
            )}
          </>
        )
      )}
    </Drawer>
  );
}

const ALLOWED_FORMATS = "PDF, Word, Excel, PowerPoint, images, texte, CSV ou ZIP";

/** Section « Documents » d'un dossier (projet, courrier, activité) : grille CRUD et formulaire selon le type. */
export function DossierDocuments({
  owner,
  ownerId,
  title = "Documents",
}: {
  owner: "project" | "activity" | "mail";
  ownerId: string;
  title?: string;
}) {
  const { data, refetch } = useQuery({
    queryKey: ["dossier-documents", owner, ownerId],
    queryFn: () =>
      api.get<{ documents: PartnerDocument[]; can: { add: boolean } }>(
        `/api/dossier-documents?owner=${owner}&owner_id=${ownerId}`,
      ),
  });
  if (!data) return null;
  return (
    <DocumentsPanel
      ends={dossierDocs(owner, ownerId)}
      title={title}
      documents={data.documents}
      canAdd={data.can.add}
      onChange={() => void refetch()}
    />
  );
}
