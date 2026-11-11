import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Banknote,
  Briefcase,
  Landmark,
  Lock,
  MapPin,
  Pencil,
  Plus,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, Empty, IconButton, cn } from "@/components/ui";
import { Field, Input, LoadingRows } from "@/components/gov";
import { api } from "@/lib/api";
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
export function InstitutionSettings() {
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
          className="inline-flex max-w-full flex-wrap rounded-[10px] border border-line bg-panel p-0.5"
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
      <p className="text-[13px] text-muted">
        {meta.hint} Le code d'une valeur ne change jamais ; une valeur ne se supprime pas, elle s'archive et reste
        affichée sur les dossiers qui la portent.
      </p>
      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
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
                    className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
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

function ValueDialog({ list, value, onClose }: { list: RefList; value: RefValue | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    label: value?.label ?? "",
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
              ? { official: f.official }
              : { financial: f.financial, supplier: f.supplier };
  const body = { label: f.label, plural: f.plural || f.label, color: f.color, icon: f.icon, props };
  const save = useMutation({
    mutationFn: () =>
      value
        ? api.patch<RefValue>(`/api/admin/referentials/${value.id}`, body)
        : api.post<RefValue>("/api/admin/referentials", { list, ...body }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["referentials"] });
      toast.success(value ? "Valeur modifiée" : `Valeur ajoutée (code ${r.code})`);
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
      title={value ? `Modifier « ${value.label} »` : "Ajouter une valeur"}
      description={
        value
          ? `Code ${value.code} : il ne change pas, les dossiers existants suivent le nouveau libellé.`
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
            className="flex size-9 items-center justify-center rounded-[10px]"
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
                  f.icon === k ? "border-primary bg-brand-soft text-primary" : "border-line text-muted hover:bg-hover",
                )}
              >
                <I className="size-4" />
              </button>
            ))}
          </div>
        </fieldset>
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
                hint="L'accord n'entre en vigueur que par la signature au parapheur, ou en joignant l'exemplaire signé."
              />
              <Toggle
                checked={f.financial}
                onChange={(v) => setF({ ...f, financial: v })}
                label="Porte des engagements financiers"
                hint="Les engagements et décaissements des partenaires s'y rattachent (lot PA4)."
              />
            </>
          ) : list === "partner_doc_nature" ? (
            <Toggle
              checked={f.official}
              onChange={(v) => setF({ ...f, official: v })}
              label="Pièce officielle"
              hint="Une pièce de cette nature reste au dossier : elle ne se supprime jamais."
            />
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
