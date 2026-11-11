import { type SelectHTMLAttributes, useState } from "react";
import { Plus } from "lucide-react";
import { Select } from "./gov";
import { useCan } from "@/lib/hooks";
import { type RefList, type RefValue, useReferentials } from "@/lib/referentials";
import { LIST_TITLE, ValueDialog } from "@/pages/AdminReferentials";

/*
 * Choisir une valeur d'un référentiel de l'institution, ou en définir une nouvelle (« Autre… ») quand aucune ne
 * convient : le formulaire crée le type dans la base avec ses règles, puis le sélectionne. Réservé au gestionnaire
 * du module ; le serveur le contrôle (docs/PARAMETRAGE.md).
 */

const NEW = "__autre__";
/** Le droit qui permet d'ajouter un type à chaque liste, comme le serveur. */
const CONTRIBUTOR: Record<RefList, string> = {
  activity_type: "agenda.manage",
  unit_type: "org.structure",
  partner_type: "partners.manage",
  partner_category: "partners.manage",
  agreement_type: "partners.manage",
  partner_doc_nature: "partners.manage",
};

export function useCanAddType(list: RefList) {
  const can = useCan();
  return can(CONTRIBUTOR[list] as Parameters<typeof can>[0]);
}

export function RefSelect({
  list,
  value,
  onChange,
  placeholder = "Choisir…",
  filter,
  suffix,
  ...a
}: {
  list: RefList;
  value: string;
  onChange: (code: string, v?: RefValue) => void;
  placeholder?: string;
  /** Restreint les valeurs proposées (ex. une pièce officielle garde une nature officielle). */
  filter?: (v: RefValue) => boolean;
  /** Mention ajoutée au libellé d'une valeur (ex. « (officielle) »). */
  suffix?: (v: RefValue) => string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  const { data } = useReferentials();
  const canAdd = useCanAddType(list);
  const [adding, setAdding] = useState(false);
  const values = (data?.[list] ?? []).filter((v) => (!v.archived || v.code === value) && (!filter || filter(v)));
  return (
    <>
      <Select
        {...a}
        value={value}
        onChange={(e) => {
          if (e.target.value === NEW) setAdding(true);
          else
            onChange(
              e.target.value,
              values.find((v) => v.code === e.target.value),
            );
        }}
      >
        <option value="">{placeholder}</option>
        {values.map((v) => (
          <option key={v.code} value={v.code}>
            {v.label}
            {suffix?.(v) ?? ""}
          </option>
        ))}
        {canAdd && <option value={NEW}>＋ Autre… (définir un nouveau {LIST_TITLE[list]})</option>}
      </Select>
      {adding && (
        <ValueDialog
          list={list}
          value={null}
          contribute
          onClose={() => setAdding(false)}
          onCreated={(v) => onChange(v.code, v)}
        />
      )}
    </>
  );
}

/** Bouton « Autre… » pour les listes à choix multiple (catégories) : définit un type puis le coche. */
export function AddTypeButton({ list, onCreated }: { list: RefList; onCreated: (v: RefValue) => void }) {
  const canAdd = useCanAddType(list);
  const [adding, setAdding] = useState(false);
  if (!canAdd) return null;
  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline"
        onClick={() => setAdding(true)}
      >
        <Plus className="size-3.5" /> Autre… (définir une nouvelle {LIST_TITLE[list]})
      </button>
      {adding && (
        <ValueDialog list={list} value={null} contribute onClose={() => setAdding(false)} onCreated={onCreated} />
      )}
    </>
  );
}
