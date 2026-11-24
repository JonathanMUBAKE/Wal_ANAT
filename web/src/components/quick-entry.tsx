import { pl } from "@/lib/format";
import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, ChevronDown, FilePlus2, FileSignature, Gavel, MailPlus, Plus, Scale } from "lucide-react";
import { Button, CARD, Menu, MenuContent, MenuItem, MenuTrigger, cn } from "@/components/ui";
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

/** noSign : la page affiche déjà le parapheur dans « Ce qui vous attend » ; viser n'est pas une saisie (A-5). */
/** Les saisies offertes à la personne, selon ses droits. */
function useQuickItems(noSign?: boolean) {
  const can = useCan();
  const { data: pending } = useQuery({
    queryKey: ["arbitrations", "en_attente"],
    queryFn: () => api.get<unknown[]>("/api/arbitrations?status=en_attente"),
    enabled: can("decisions.record"),
  });
  const { data: toSign } = useQuery({
    queryKey: ["signature", "to_sign"],
    queryFn: () => api.get<unknown[]>("/api/signature?box=to_sign"),
    enabled: can("signature.use") && !noSign,
  });
  const items = [
    can("decisions.record") && {
      to: "/decisions?nouveau=1",
      Icon: Scale,
      label: "Inscrire une décision",
      hint: "au registre de la DG",
    },
    can("decisions.confirm") && {
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
    !noSign &&
      can("signature.use") && {
      to: "/parapheur",
      Icon: FileSignature,
      label: "Viser ou signer",
      hint: toSign?.length ? `${toSign.length} ${pl(toSign.length, "document(s)")} en attente` : "parapheur à jour",
      count: toSign?.length,
    },
  ].filter(Boolean) as { to: string; Icon: typeof Scale; label: string; hint: string; count?: number }[];
  return items;
}

/**
 * « Saisir » en bouton-menu, dans l'en-tête d'une page : les mêmes saisies, à un clic, sans occuper le haut de
 * l'écran (écrans sobres : l'information d'abord, l'action ensuite).
 */
export function QuickEntryMenu({ noSign }: { noSign?: boolean }) {
  const items = useQuickItems(noSign);
  const nav = useNavigate();
  if (!items.length) return null;
  const waiting = items.reduce((n, i) => n + (i.count ?? 0), 0);
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="primary" icon={<Plus className="size-4" />}>
          Saisir
          {!!waiting && (
            <span className="ml-1 rounded-full bg-on-primary/20 px-1.5 text-[11px] font-semibold tabular">{waiting}</span>
          )}
          <ChevronDown className="size-3.5 opacity-80" />
        </Button>
      </MenuTrigger>
      <MenuContent align="end" className="min-w-[260px]">
        {items.map((i) => (
          <MenuItem
            key={i.label}
            icon={<i.Icon className="size-3.5" />}
            right={
              i.count ? (
                <span className="rounded-full bg-danger px-1.5 text-[11px] font-semibold text-on-danger">{i.count}</span>
              ) : undefined
            }
            onSelect={() => nav(i.to)}
          >
            {i.label}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

export function QuickEntry({ className, wide, noSign }: { className?: string; wide?: boolean; noSign?: boolean }) {
  const items = useQuickItems(noSign);
  if (!items.length) return null;
  return (
    <section aria-label="Saisir" className={cn(CARD, "p-4", className)}>
      <h2 className="mb-3 text-[15px] font-semibold tracking-[-0.01em]">Saisir</h2>
      <div className={cn("grid gap-2 sm:grid-cols-2", wide && "lg:grid-cols-3")}>
        {items.map((i) => (
          <Link
            key={i.label}
            to={i.to}
            className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-hover"
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
              <i.Icon className="size-4" />
              {!!i.count && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold text-on-danger">
                  {i.count}
                </span>
              )}
            </span>
            <span className="min-w-0">
              {/* Les libellés passent à la ligne plutôt que d'être coupés vers 800 px (A-10) */}
              <span className="block text-[13px] font-medium leading-snug">{i.label}</span>
              <span className="block text-[12px] leading-snug text-muted">{i.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
