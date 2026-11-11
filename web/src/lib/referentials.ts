import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  CalendarClock,
  Circle,
  FileSignature,
  FileText,
  Flag,
  Globe,
  GraduationCap,
  Handshake,
  Landmark,
  type LucideIcon,
  Map as MapIcon,
  MapPin,
  Mic2,
  Network,
  Scale,
  Users,
} from "lucide-react";
import { api } from "./api";

/** Référentiels de l'institution, paramétrés par l'administrateur système (docs/PARAMETRAGE.md). */
export type RefList =
  | "activity_type"
  | "unit_type"
  | "partner_type"
  | "partner_category"
  | "agreement_type"
  | "partner_doc_nature";
export interface RefValue {
  id: string;
  list: RefList;
  code: string;
  label: string;
  plural: string;
  color: string;
  icon: string;
  position: number;
  archived: boolean;
  props: {
    confidential_default?: boolean;
    tracks_progress?: boolean;
    counterpart_label?: string;
    provincial?: boolean;
    public?: boolean;
    financial?: boolean;
    supplier?: boolean;
    binding?: boolean;
    official?: boolean;
  };
}
export type Referentials = Record<RefList, RefValue[]>;

export const useReferentials = () =>
  useQuery({
    queryKey: ["referentials"],
    queryFn: () => api.get<Referentials>("/api/referentials"),
    staleTime: 60_000,
  });

/** Huit teintes du système de design, redéfinies pour le thème sombre dans styles.css. */
export const HUES: Record<string, string> = {
  blue: "var(--hue-blue)",
  teal: "var(--hue-teal)",
  green: "var(--hue-green)",
  ochre: "var(--hue-ochre)",
  terracotta: "var(--hue-terracotta)",
  indigo: "var(--hue-indigo)",
  violet: "var(--hue-violet)",
  slate: "var(--hue-slate)",
};
export const HUE_LABEL: Record<string, string> = {
  blue: "Bleu",
  teal: "Sarcelle",
  green: "Vert",
  ochre: "Ocre",
  terracotta: "Terre cuite",
  indigo: "Indigo",
  violet: "Violet",
  slate: "Ardoise",
};
export const REF_ICONS: Record<string, LucideIcon> = {
  landmark: Landmark,
  mic: Mic2,
  handshake: Handshake,
  "calendar-clock": CalendarClock,
  briefcase: Briefcase,
  map: MapIcon,
  users: Users,
  flag: Flag,
  building: Building2,
  globe: Globe,
  "file-text": FileText,
  "graduation-cap": GraduationCap,
  scale: Scale,
  "map-pin": MapPin,
  network: Network,
  circle: Circle,
};

export interface FormMeta {
  label: string;
  plural: string;
  Icon: LucideIcon;
  color: string;
  value?: RefValue;
}
/** Les deux formes de projet restent fixes ; toutes les autres formes viennent du référentiel des types d'activités. */
const PROJECT_FORMS: Record<string, FormMeta> = {
  projet_interne: {
    label: "Projet interne",
    plural: "Projets internes",
    Icon: Briefcase,
    color: "var(--form-projet_interne)",
  },
  projet_confie: {
    label: "Projet confié",
    plural: "Projets confiés",
    Icon: FileSignature,
    color: "var(--form-projet_confie)",
  },
};
export const metaOf = (v: RefValue | undefined, code: string): FormMeta =>
  v
    ? {
        label: v.label,
        plural: v.plural || v.label,
        Icon: REF_ICONS[v.icon] ?? Circle,
        color: HUES[v.color] ?? HUES.slate,
        value: v,
      }
    : { label: code, plural: code, Icon: Circle, color: HUES.slate };

/** Lecture d'une forme (projet ou type d'activité) par son code, avec repli sûr si le référentiel n'est pas encore chargé. */
export function useForms() {
  const { data } = useReferentials();
  return (code: string): FormMeta =>
    PROJECT_FORMS[code] ??
    metaOf(
      data?.activity_type.find((v) => v.code === code),
      code,
    );
}
/** Types d'entités : libellé et repère « province ». */
export function useUnitTypes() {
  const { data } = useReferentials();
  return (code: string) =>
    metaOf(
      data?.unit_type.find((v) => v.code === code),
      code,
    );
}
