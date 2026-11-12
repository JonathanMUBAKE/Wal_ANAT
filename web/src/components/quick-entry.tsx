import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, FilePlus2, FileSignature, Gavel, MailPlus, Scale } from "lucide-react";
import { cn } from "@/components/ui";
import { useCan } from "@/lib/hooks";
import { api } from "@/lib/api";

/*
 * « Saisir » : les quelques saisies de la direction, rassemblées en un seul endroit et sans détour (accueil et tableau
 * de bord DG). Chaque bouton ouvre directement le formulaire du module concerné ; la DG peut saisir elle-même, son
 * assistant(e) le fait le plus souvent (docs/FONCTIONNEMENT-PAR-MODULE.md, I-31).
 */

/** Ouvre le formulaire de création d'une page quand on y arrive par « Saisir » (?nouveau=1). */
export function useOpenFromUrl(open: () => void) {
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get("nouveau") !== "1") return;
    open();
    const next = new URLSearchParams(params);
    next.delete("nouveau");
    setParams(next, { replace: true });
  }, [params, setParams, open]);
}

export function QuickEntry({ className, wide }: { className?: string; wide?: boolean }) {
  const can = useCan();
  const { data: pending } = useQuery({
    queryKey: ["arbitrations", "en_attente"],
    queryFn: () => api.get<unknown[]>("/api/arbitrations?status=en_attente"),
    enabled: can("decisions.record"),
  });
  const { data: toSign } = useQuery({
    queryKey: ["signature", "to_sign"],
    queryFn: () => api.get<unknown[]>("/api/signature?box=to_sign"),
    enabled: can("signature.use"),
  });
  const items = [
    can("decisions.record") && {
      to: "/decisions?nouveau=1",
      Icon: Scale,
      label: "Inscrire une décision",
      hint: "au registre de la DG",
    },
    can("decisions.record") && {
      to: "/activites?onglet=arbitrages",
      Icon: Gavel,
      label: "Trancher un arbitrage",
      hint: pending?.length ? `${pending.length} en attente` : "aucun en attente",
      count: pending?.length,
    },
    can("correspondence.manage") && {
      to: "/courrier?nouveau=1",
      Icon: MailPlus,
      label: "Enregistrer un courrier",
      hint: "arrivée ou départ",
    },
    can("meetings.manage") && {
      to: "/reunions?nouveau=1",
      Icon: CalendarPlus,
      label: "Programmer une réunion",
      hint: "convocation, ordre du jour",
    },
    can("agenda.manage") && {
      to: "/activites?nouveau=1",
      Icon: FilePlus2,
      label: "Nouvelle activité",
      hint: "commission, conférence, rendez-vous",
    },
    can("signature.use") && {
      to: "/parapheur",
      Icon: FileSignature,
      label: "Viser ou signer",
      hint: toSign?.length ? `${toSign.length} document(s) en attente` : "parapheur à jour",
      count: toSign?.length,
    },
  ].filter(Boolean) as { to: string; Icon: typeof Scale; label: string; hint: string; count?: number }[];
  if (!items.length) return null;
  return (
    <section aria-label="Saisir" className={cn("rounded-2xl border border-line bg-panel p-4 shadow-sm", className)}>
      <h2 className="mb-3 text-[14.5px] font-semibold tracking-[-0.01em]">Saisir</h2>
      <div className={cn("grid gap-2 sm:grid-cols-2", wide && "lg:grid-cols-3")}>
        {items.map((i) => (
          <Link
            key={i.label}
            to={i.to}
            className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-hover"
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-primary">
              <i.Icon className="size-4" />
              {!!i.count && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                  {i.count}
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{i.label}</span>
              <span className="block truncate text-[12px] text-muted">{i.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
