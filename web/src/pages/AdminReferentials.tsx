import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Banknote,
  Briefcase,
  Globe,
  Landmark,
  Lock,
  MapPin,
  Pencil,
  Plus,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button, CARD, Dialog, Empty, Hint, IconButton, cn } from "@/components/ui";
import { Field, Input, LoadingRows } from "@/components/gov";
import { api } from "@/lib/api";
import { useCan, useMe } from "@/lib/hooks";
import { HUES, HUE_LABEL, REF_ICONS, type RefList, type RefValue, useReferentials } from "@/lib/referentials";

const LISTS: { id: RefList; label: string; hint: string }[] = [
  {
    id: "activity_type",
    label: "Types d'activités",
    hint: "Les natures d'activité proposées dans le portefeuille et comptées au tableau de bord.",
  },
  {
    id: "unit_type",
    label: "Types d'entités",
    hint: "Les niveaux de la structure de l'institution, siège et provinces.",
  },
  {
    id: "partner_type",
    label: "Types de partenaires",
    hint: "La nature juridique d'un partenaire : un seul type par fiche.",
  },
  {
    id: "partner_category",
    label: "Catégories de partenaires",
    hint: "Le rôle d'un partenaire dans la relation (PTF, partenaire technique, prestataire…) : plusieurs par fiche.",
  },
  {
    id: "agreement_type",
    label: "Types d'accords",
    hint: "Les actes qui encadrent une collaboration ; un type contraignant n'entre en vigueur que signé.",
  },
  {
    id: "partner_doc_nature",
    label: "Natures de pièces",
    hint: "Les natures des pièces de collaboration ; une pièce officielle ne se supprime jamais.",
  },
];
const fail = (e: unknown) => toast.error((e as Error).message);

/** Référentiels de l'institution : modifiables par l'administrateur système seul, jamais supprimés (docs/PARAMETRAGE.md). */
/**
 * Domaine principal du système (ex. agence.gouv.cd) : il donne les adresses des agents et sert de point de départ à la
 * messagerie (domaine d'envoi, serveur mail.<domaine>). Saisi ici, jamais inscrit dans le code.
 */
function PrimaryDomain() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const can = useCan();
  // Modifier l'organisation relève du droit « org.settings » (services.ts) : sans lui, le domaine se lit seulement.
  const editable = can("org.settings");
  const org = me?.orgs.find((o) => o.id === me.org_id);
  const current = org?.domains?.[0] ?? "";
  const [value, setValue] = useState<string | null>(null);
  const v = (value ?? current).trim().toLowerCase();
  const save = useMutation({
    mutationFn: () =>
      api.patch("/api/org", { domains: [v, ...(org?.domains ?? []).filter((d) => d !== v && d !== current)] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      setValue(null);
      toast.success("Domaine principal enregistré");
    },
    onError: fail,
  });
  const example = v || "agence.gouv.cd";
  return (
    <section className={cn(CARD, "p-5")} aria-label="Domaine principal">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <Globe className="size-4" />
        Domaine principal
      </h2>
      <Hint className="mt-0.5">
        Le domaine de l'institution : adresses des agents (prénom.nom@{example}) et messagerie (serveur proposé : mail.
        {example}).
        {!editable && " Le modifier relève du droit « Modifier l'organisation »."}
      </Hint>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Domaine principal du système" className="w-full max-w-[420px]">
          {(a) => (
            <Input
              {...a}
              value={value ?? current}
              onChange={(e) => setValue(e.target.value)}
              placeholder="agence.gouv.cd"
              autoComplete="off"
              spellCheck={false}
              disabled={!editable}
            />
          )}
        </Field>
        {editable && (
          <Button
            variant="primary"
            loading={save.isPending}
            disabled={!v || v === current}
            onClick={() => save.mutate()}
          >
            Enregistrer
          </Button>
        )}
      </div>
    </section>
  );
}

export function InstitutionSettings() {
  return (
    <div className="space-y-6">
      <PrimaryDomain />
      <Referentials />
    </div>
  );
}

function Referentials() {
  const qc = useQueryClient();
  const { data, isLoading } = useReferentials();
  const [list, setList] = useState<RefList>("activity_type");
  const [editing, setEditing] = useState<RefValue | "new" | null>(null);
  const values = data?.[list] ?? [];
  const active = values.filter((v) => !v.archived);
  const save = useMutation({
    mutationFn: (v: { id: string; body: Record<string, unknown> }) =>
      api.patch<RefValue>(`/api/admin/referentials/${v.id}`, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["referentials"] }),
    onError: fail,
  });
  // Monter ou descendre une valeur : elle prend la place de sa voisine
  const move = (v: RefValue, dir: -1 | 1) => {
    const i = values.indexOf(v);
    const other = values[i + dir];
    if (!other) return;
    save.mutate({ id: v.id, body: { position: other.position } });
    save.mutate({ id: other.id, body: { position: v.position } });
  };
  const meta = LISTS.find((l) => l.id === list)!;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div
          role="tablist"
          className="inline-flex max-w-full flex-wrap rounded-lg border border-line bg-panel p-0.5"
        >
          {LISTS.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={list === l.id}
              onClick={() => setList(l.id)}
              className={cn(
                "h-8 rounded-lg px-3 text-[13px] font-medium transition-colors",
                list === l.id ? "bg-hover text-fg" : "text-muted hover:text-fg",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
          Ajouter une valeur
        </Button>
      </div>
      <Hint>
        {meta.hint} Le code d'une valeur ne change jamais ; une valeur ne se supprime pas, elle s'archive et reste
        affichée sur les dossiers qui la portent.
      </Hint>
      <section className={cn(CARD, "overflow-hidden")}>
        {isLoading ? (
          <LoadingRows />
        ) : values.length ? (
          <ul>
            {values.map((v, i) => {
              const Icon = REF_ICONS[v.icon] ?? REF_ICONS.circle;
              const hue = HUES[v.color] ?? HUES.slate;
              return (
                <li
                  key={v.id}
                  className={cn(
                    "flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0",
                    v.archived && "opacity-60",
                  )}
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ color: hue, background: `color-mix(in oklab, ${hue} 12%, transparent)` }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-medium">{v.label}</span>
                      {v.plural && v.plural !== v.label && <span className="text-[12px] text-muted">· {v.plural}</span>}
                      {v.archived && (
                        <span className="rounded-md bg-hover px-1.5 py-0.5 text-[11px] font-medium text-muted">
                          Archivée
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                      <span className="font-mono text-[11.5px] text-faint">{v.code}</span>
                      {v.props.confidential_default && (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="size-3" /> Confidentielle par défaut
                        </span>
                      )}
                      {v.props.tracks_progress && (
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="size-3" /> Avancement suivi
                        </span>
                      )}
                      {v.props.provincial && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" /> Province
                        </span>
                      )}
                      {v.props.counterpart_label && <span>Interlocuteur : « {v.props.counterpart_label} »</span>}
                      {v.props.public && (
                        <span className="inline-flex items-center gap-1">
                          <Landmark className="size-3" /> Secteur public
                        </span>
                      )}
                      {v.props.financial && (
                        <span className="inline-flex items-center gap-1">
                          <Banknote className="size-3" /> Engagements financiers
                        </span>
                      )}
                      {v.props.binding && (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="size-3" /> Signature exigée
                        </span>
                      )}
                      {v.props.official && (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="size-3" /> Pièce officielle
                        </span>
                      )}
                      {v.props.supplier && (
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="size-3" /> Prestataire de contrats
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <IconButton label="Monter" disabled={i === 0} onClick={() => move(v, -1)}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton label="Descendre" disabled={i === values.length - 1} onClick={() => move(v, 1)}>
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <IconButton label="Modifier" onClick={() => setEditing(v)}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton
                      label={v.archived ? "Réactiver" : "Archiver"}
                      disabled={!v.archived && active.length <= 1}
                      onClick={() => save.mutate({ id: v.id, body: { archived: !v.archived } })}
                    >
                      {v.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                    </IconButton>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty title="Aucune valeur">Ajoutez la première valeur de cette liste.</Empty>
        )}
      </section>
      {editing && (
        <ValueDialog list={list} value={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

/** Libellés des listes, pour les formulaires « Autre… » des modules. */
export const LIST_TITLE: Record<RefList, string> = {
  activity_type: "type d'activité",
  unit_type: "type d'entité",
  partner_type: "type de partenaire",
  partner_category: "catégorie de partenaire",
  agreement_type: "type d'accord",
  partner_doc_nature: "type de document",
};

/**
 * Formulaire d'une valeur de référentiel. `contribute` : depuis un formulaire de module (« Autre… »), le
 * gestionnaire du module définit un nouveau type et ses règles ; couleur et icône restent à l'administrateur.
 */
export function ValueDialog({
  list,
  value,
  onClose,
  contribute,
  initialLabel,
  onCreated,
}: {
  list: RefList;
  value: RefValue | null;
  onClose: () => void;
  contribute?: boolean;
  initialLabel?: string;
  onCreated?: (v: RefValue) => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    label: value?.label ?? initialLabel ?? "",
    plural: value?.plural ?? "",
    color: value?.color ?? "blue",
    icon:
      value?.icon ?? (list === "unit_type" ? "building" : list === "activity_type" ? "calendar-clock" : "handshake"),
    confidential_default: !!value?.props.confidential_default,
    tracks_progress: !!value?.props.tracks_progress,
    counterpart_label: value?.props.counterpart_label ?? "",
    provincial: !!value?.props.provincial,
    public: !!value?.props.public,
    financial: !!value?.props.financial,
    supplier: !!value?.props.supplier,
    binding: !!value?.props.binding,
    official: !!value?.props.official,
    dated: !!value?.props.dated,
    expires: !!value?.props.expires,
    referenced: !!value?.props.referenced,
    precise: !!value?.props.precise,
  });
  const props =
    list === "activity_type"
      ? {
          confidential_default: f.confidential_default,
          tracks_progress: f.tracks_progress,
          counterpart_label: f.counterpart_label.trim(),
        }
      : list === "unit_type"
        ? { provincial: f.provincial }
        : list === "partner_type"
          ? { public: f.public }
          : list === "agreement_type"
            ? { binding: f.binding, financial: f.financial }
            : list === "partner_doc_nature"
              ? {
                  official: f.official,
                  dated: f.dated,
                  expires: f.expires,
                  referenced: f.referenced,
                  precise: f.precise,
                }
              : { financial: f.financial, supplier: f.supplier };
  const body = { label: f.label, plural: f.plural || f.label, color: f.color, icon: f.icon, props };
  const save = useMutation({
    mutationFn: () =>
      value
        ? api.patch<RefValue>(`/api/admin/referentials/${value.id}`, body)
        : contribute
          ? api.post<RefValue>("/api/referentials", { list, label: f.label, plural: f.plural || f.label, props })
          : api.post<RefValue>("/api/admin/referentials", { list, ...body }),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["referentials"] });
      toast.success(
        value
          ? "Valeur modifiée"
          : contribute
            ? `Nouveau ${LIST_TITLE[list]} : « ${r.label} »`
            : `Valeur ajoutée (code ${r.code})`,
      );
      onCreated?.(r);
      onClose();
    },
    onError: fail,
  });
  const Preview = REF_ICONS[f.icon] ?? REF_ICONS.circle;
  const hue = HUES[f.color];
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={
        value
          ? `Modifier « ${value.label} »`
          : contribute
            ? `Définir un nouveau ${LIST_TITLE[list]}`
            : "Ajouter une valeur"
      }
      description={
        value
          ? `Code ${value.code} : il ne change pas, les dossiers existants suivent le nouveau libellé.`
          : contribute
            ? "Le type rejoint la liste de l'institution et reste proposé à tous. Seul l'administrateur système le renomme ou l'archive."
            : "Le code est dérivé du libellé et ne changera plus."
      }
      width={560}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!f.label.trim()} loading={save.isPending} onClick={() => save.mutate()}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
          <span
            className="flex size-9 items-center justify-center rounded-lg"
            style={{ color: hue, background: `color-mix(in oklab, ${hue} 12%, transparent)` }}
          >
            <Preview className="size-4" />
          </span>
          <span className="text-[13.5px] font-medium">{f.label || "Aperçu"}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Libellé" required>
            {(a) => <Input {...a} autoFocus value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />}
          </Field>
          <Field label="Pluriel" hint="Pour les onglets et les compteurs.">
            {(a) => (
              <Input
                {...a}
                value={f.plural}
                placeholder={f.label}
                onChange={(e) => setF({ ...f, plural: e.target.value })}
              />
            )}
          </Field>
        </div>
        {!contribute && (
          <>
            <fieldset>
              <legend className="mb-1.5 text-[12.5px] font-medium text-muted">Couleur</legend>
              <div className="flex flex-wrap gap-2">
                {Object.keys(HUES).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={HUE_LABEL[c]}
                    aria-pressed={f.color === c}
                    title={HUE_LABEL[c]}
                    onClick={() => setF({ ...f, color: c })}
                    className={cn(
                      "size-7 rounded-full ring-offset-2 ring-offset-[var(--panel)] transition",
                      f.color === c ? "ring-2 ring-[var(--fg)]" : "hover:scale-110",
                    )}
                    style={{ background: HUES[c] }}
                  />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[12.5px] font-medium text-muted">Icône</legend>
              <div className="grid grid-cols-8 gap-1.5">
                {Object.entries(REF_ICONS).map(([k, I]) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={k}
                    aria-pressed={f.icon === k}
                    onClick={() => setF({ ...f, icon: k })}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-lg border transition-colors",
                      f.icon === k
                        ? "border-primary bg-brand-soft text-primary"
                        : "border-line text-muted hover:bg-hover",
                    )}
                  >
                    <I className="size-4" />
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <fieldset className="space-y-2 border-t border-line pt-3">
          <legend className="sr-only">Règles</legend>
          {list === "activity_type" ? (
            <>
              <Toggle
                checked={f.confidential_default}
                onChange={(v) => setF({ ...f, confidential_default: v })}
                label="Confidentielle par défaut"
                hint="Une nouvelle activité de ce type n'est visible que de son responsable et des gestionnaires."
              />
              <Toggle
                checked={f.tracks_progress}
                onChange={(v) => setF({ ...f, tracks_progress: v })}
                label="Avancement suivi"
                hint="Le pourcentage d'avancement est saisi et affiché."
              />
              <Field label="Libellé de l'interlocuteur" hint="Exemples : Instance, Organisateur, Interlocuteur.">
                {(a) => (
                  <Input
                    {...a}
                    value={f.counterpart_label}
                    onChange={(e) => setF({ ...f, counterpart_label: e.target.value })}
                  />
                )}
              </Field>
            </>
          ) : list === "unit_type" ? (
            <Toggle
              checked={f.provincial}
              onChange={(v) => setF({ ...f, provincial: v })}
              label="Représentation en province"
              hint="Les entités de ce type sont repérées « Province » dans la structure."
            />
          ) : list === "partner_type" ? (
            <Toggle
              checked={f.public}
              onChange={(v) => setF({ ...f, public: v })}
              label="Secteur public"
              hint="Le partenaire relève de l'État ou d'une collectivité : utile aux statistiques de l'annuaire."
            />
          ) : list === "agreement_type" ? (
            <>
              <Toggle
                checked={f.binding}
                onChange={(v) => setF({ ...f, binding: v })}
                label="Juridiquement contraignant"
                hint="L'accord n'entre en vigueur que par la signature au signataire, ou en joignant l'exemplaire signé."
              />
              <Toggle
                checked={f.financial}
                onChange={(v) => setF({ ...f, financial: v })}
                label="Porte des engagements financiers"
                hint="Les engagements et décaissements des partenaires s'y rattachent (lot PA4)."
              />
            </>
          ) : list === "partner_doc_nature" ? (
            <>
              <Toggle
                checked={f.official}
                onChange={(v) => setF({ ...f, official: v })}
                label="Pièce officielle"
                hint="Une pièce de cette nature reste au dossier : elle ne se supprime jamais."
              />
              <Toggle
                checked={f.dated}
                onChange={(v) => setF({ ...f, dated: v })}
                label="Date de production obligatoire"
                hint="Le formulaire du document demande la date à laquelle il a été produit ou signé."
              />
              <Toggle
                checked={f.expires}
                onChange={(v) => setF({ ...f, expires: v })}
                label="Date d'expiration obligatoire"
                hint="Contrat, attestation, assurance… : la fiche signale le document une fois expiré."
              />
              <Toggle
                checked={f.referenced}
                onChange={(v) => setF({ ...f, referenced: v })}
                label="Référence obligatoire"
                hint="Numéro, cote ou référence du document."
              />
              <Toggle
                checked={f.precise}
                onChange={(v) => setF({ ...f, precise: v })}
                label="Préciser le type"
                hint="Pour une nature générique comme « Autre » : la personne précise de quel document il s'agit."
              />
            </>
          ) : (
            <>
              <Toggle
                checked={f.financial}
                onChange={(v) => setF({ ...f, financial: v })}
                label="Engagements financiers"
                hint="Un partenaire de cette catégorie peut porter des engagements financiers (dons, prêts, cofinancements)."
              />
              <Toggle
                checked={f.supplier}
                onChange={(v) => setF({ ...f, supplier: v })}
                label="Prestataire de contrats"
                hint="Un partenaire de cette catégorie peut être choisi comme prestataire d'un contrat de projet."
              />
            </>
          )}
        </fieldset>
      </div>
    </Dialog>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-[var(--primary)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-[12px] text-muted">{hint}</span>
      </span>
    </label>
  );
}
