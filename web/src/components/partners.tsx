import { useQueries, useQuery } from "@tanstack/react-query";
import type { SelectHTMLAttributes } from "react";
import { Select } from "./gov";
import { api } from "@/lib/api";
import { useReferentials } from "@/lib/referentials";

/* Choisir un partenaire de l'annuaire depuis un autre module (lot PA3, docs/CONCEPTION.md § 4.7). */

export interface PartnerOption {
  id: string;
  name: string;
  acronym: string;
  state: string;
  categories: string[];
}
export interface PartnerContact {
  id: string;
  name: string;
  title: string;
  archived: boolean;
  partner_id: string;
  partner_label: string;
}

/** Partenaires proposés : ni suspendus ni clos ; la liste est vide pour qui n'a pas accès à l'annuaire. */
export function usePartnerOptions() {
  return useQuery({
    queryKey: ["partners", "selectable"],
    queryFn: () => api.get<PartnerOption[]>("/api/partners?selectable=1").catch(() => [] as PartnerOption[]),
    staleTime: 30_000,
  });
}

/**
 * Liste déroulante des partenaires. Le partenaire déjà lié reste affiché même s'il n'est plus proposé (clos,
 * suspendu). `supplier` ne garde que les partenaires d'une catégorie « prestataire ».
 */
export function PartnerSelect({
  value,
  onChange,
  current,
  supplier,
  placeholder = "Aucun partenaire de l'annuaire",
  ...a
}: {
  value: string | null | undefined;
  onChange: (id: string, partner?: PartnerOption) => void;
  current?: { id: string; name: string } | null;
  supplier?: boolean;
  placeholder?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  const { data } = usePartnerOptions();
  const { data: refs } = useReferentials();
  const suppliers = new Set((refs?.partner_category ?? []).filter((c) => c.props.supplier).map((c) => c.code));
  const options = (data ?? []).filter((p) => !supplier || p.categories.some((c) => suppliers.has(c)));
  const missing = current && value === current.id && !options.some((p) => p.id === current.id);
  return (
    <Select
      {...a}
      value={value ?? ""}
      onChange={(e) =>
        onChange(
          e.target.value,
          options.find((p) => p.id === e.target.value),
        )
      }
    >
      <option value="">{placeholder}</option>
      {missing && <option value={current.id}>{current.name}</option>}
      {options.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.acronym ? ` (${p.acronym})` : ""}
        </option>
      ))}
    </Select>
  );
}

/** Contacts actifs des partenaires donnés, lus sur leurs fiches. */
export function usePartnerContacts(partnerIds: string[]) {
  const results = useQueries({
    queries: partnerIds.map((id) => ({
      queryKey: ["partner", id],
      queryFn: () =>
        api.get<{
          id: string;
          name: string;
          acronym: string;
          contacts: Omit<PartnerContact, "partner_id" | "partner_label">[];
        }>(`/api/partners/${id}`),
      staleTime: 30_000,
    })),
  });
  return results.flatMap((r) =>
    r.data
      ? r.data.contacts
          .filter((c) => !c.archived)
          .map((c) => ({ ...c, partner_id: r.data!.id, partner_label: r.data!.acronym || r.data!.name }))
      : [],
  );
}
