import { type ReactNode, useEffect, useState } from "react";
import { Eye, type LucideIcon, Pencil, Save, Trash2, X } from "lucide-react";
import { Button, cn } from "./ui";
import { RoundBtn } from "./collection";

/*
 * Cadastre — fiches et grilles (docs/DESIGN-SYSTEM.md § 4, « Fiche » et « Grille CRUD »).
 * Une fiche s'ouvre toujours en lecture ; « Modifier » fait apparaître les champs, « Enregistrer » ou « Annuler »
 * y mettent fin. Une grille porte ses actions sur chaque ligne ; chaque action n'apparaît que si le droit existe,
 * et le serveur refuse de toute façon ce qui n'est pas permis.
 */

/** Brouillon d'une fiche : copie de la source en lecture, modifiable seulement après « Modifier ». */
export function useRecord<T>(source: T | undefined) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T | undefined>(source);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    // Une nouvelle version venue du serveur remplace la lecture ; elle n'écrase jamais une saisie en cours
    if (source && !editing) {
      setDraft(source);
      setDirty(false);
    }
  }, [source, editing]);
  return {
    editing,
    draft: (editing ? draft : source) as T | undefined,
    dirty,
    edit: () => {
      setDraft(source);
      setDirty(false);
      setEditing(true);
    },
    cancel: () => {
      setDraft(source);
      setDirty(false);
      setEditing(false);
    },
    /** À appeler après un enregistrement réussi. */
    done: () => {
      setDirty(false);
      setEditing(false);
    },
    patch: (p: Partial<T>) => {
      setDraft((d) => (d ? { ...d, ...p } : d));
      setDirty(true);
    },
  };
}

/** Boutons d'une fiche : « Modifier » en lecture ; « Annuler » et « Enregistrer » pendant la modification. */
export function RecordActions({
  editing,
  canEdit,
  onEdit,
  onCancel,
  onSave,
  saving,
  disabled,
  editLabel = "Modifier",
}: {
  editing: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  disabled?: boolean;
  editLabel?: string;
}) {
  if (!canEdit) return null;
  return editing ? (
    <>
      <Button icon={<X className="size-4" />} onClick={onCancel}>
        Annuler
      </Button>
      <Button
        variant="primary"
        icon={<Save className="size-4" />}
        loading={saving}
        disabled={disabled}
        onClick={onSave}
      >
        Enregistrer
      </Button>
    </>
  ) : (
    <Button icon={<Pencil className="size-4" />} onClick={onEdit}>
      {editLabel}
    </Button>
  );
}

/** Lecture d'une fiche : paires libellé / valeur sur une ou deux colonnes. */
export const Facts = ({ children, className }: { children: ReactNode; className?: string }) => (
  // Dans un tiroir ou un dialogue (classe p-0), les faits s'alignent sur le titre, sans marge propre
  <dl
    className={cn(
      "text-[13.5px]",
      !className?.includes("p-0") && "p-5 pt-2",
      className,
    )}
  >
    {children}
  </dl>
);

export function Fact({
  label,
  children,
  wide,
  Icon,
  optional,
}: {
  label: string;
  children?: ReactNode;
  wide?: boolean;
  Icon?: LucideIcon;
  /** Champ secondaire : vide, il ne s'affiche pas du tout (écrans sobres : on ne montre que ce qui est renseigné). */
  optional?: boolean;
}) {
  const empty = children === undefined || children === null || children === "" || children === false;
  if (empty && optional) return null;
  // À la verticale (demande de l'utilisateur) : un fait par ligne ; un contenu long (`wide`) passe sous son libellé
  if (wide)
    return (
      <div className="border-t border-line py-2.5 first:border-t-0">
        <dt className="flex items-center gap-1.5 text-[12.5px] text-muted">
          {Icon && <Icon className="size-3.5" />}
          {label}
        </dt>
        <dd className={cn("mt-1 break-words", empty && "text-faint")}>{empty ? "—" : children}</dd>
      </div>
    );
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-line py-2.5 first:border-t-0">
      <dt className="flex shrink-0 items-center gap-1.5 text-[13px] text-muted">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </dt>
      <dd className={cn("min-w-0 break-words text-right", empty ? "text-faint" : "font-medium")}>{empty ? "—" : children}</dd>
    </div>
  );
}

/** Texte long en lecture (présentation, texte d'un accord…), retours à la ligne conservés. */
export const LongText = ({ children, empty = "Aucun texte saisi." }: { children?: string | null; empty?: string }) =>
  children?.trim() ? (
    <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{children}</div>
  ) : (
    <p className="text-[13px] text-faint">{empty}</p>
  );

/** Actions d'une ligne de grille. Le clic sur la ligne consulte ; les boutons n'apparaissent que si le droit existe. */
export function RowActions({
  label,
  onView,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  deleteLabel = "Supprimer",
  children,
}: {
  /** Nom de l'élément, pour les étiquettes accessibles. */
  label: string;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  deleteLabel?: string;
  /** Actions propres à l'objet (archiver, télécharger…), placées avant la suppression. */
  children?: ReactNode;
}) {
  return (
    <span
      className="flex items-center justify-end gap-0.5"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {onView && (
        <RoundBtn label={`Consulter ${label}`} onClick={onView}>
          <Eye className="size-4" />
        </RoundBtn>
      )}
      {canEdit && onEdit && (
        <RoundBtn label={`Modifier ${label}`} onClick={onEdit}>
          <Pencil className="size-4" />
        </RoundBtn>
      )}
      {children}
      {canDelete && onDelete && (
        <RoundBtn label={`${deleteLabel} ${label}`} onClick={onDelete}>
          <Trash2 className="size-4" />
        </RoundBtn>
      )}
    </span>
  );
}
