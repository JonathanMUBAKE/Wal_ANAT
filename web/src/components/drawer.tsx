import { type ReactNode, useState } from "react";
import * as DI from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ConfirmDialog, IconButton, PANEL, cn } from "./ui";

/*
 * Tiroir de consultation (docs/DESIGN-SYSTEM.md § 4, « Tiroir »). Toute fiche secondaire — contact, document,
 * courrier, décision, document du parapheur — s'ouvre ici, à droite, sans quitter la page : on la lit, puis
 * « Modifier » ouvre les champs dans le même tiroir. Échap ou la croix le ferment ; si des modifications ne sont pas
 * enregistrées, la fermeture demande confirmation. Le modal reste réservé aux confirmations et aux actes courts.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  badges,
  children,
  footer,
  dirty,
  width = 600,
}: {
  open: boolean;
  onClose: () => void;
  /** Ce que l'on consulte : nom de l'objet. */
  title: ReactNode;
  /** Nature et numéro officiel (« Courrier entrant · ENT/2026/0142 »). */
  subtitle?: ReactNode;
  /** État, sceau, confidentialité : sous le titre, jamais en couleur seule. */
  badges?: ReactNode;
  children: ReactNode;
  /** Actions en pied : secondaires à gauche du principal, « Fermer » en dernier. */
  footer?: ReactNode;
  /** Des champs sont ouverts et modifiés : fermer demande confirmation. */
  dirty?: boolean;
  width?: number;
}) {
  const [confirm, setConfirm] = useState(false);
  const request = () => (dirty ? setConfirm(true) : onClose());
  return (
    <>
      <DI.Root open={open} onOpenChange={(v) => !v && request()}>
        <DI.Portal>
          <DI.Overlay className="overlay-in fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px] dark:bg-black/55" />
          <DI.Content
            className={cn(PANEL, "drawer-in fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden outline-none sm:inset-y-2.5 sm:right-2.5 sm:w-[calc(100vw-48px)]")}
            style={{ maxWidth: width }}
          >
            <header className="flex items-start gap-3 border-b border-line px-5 pb-3.5 pt-4">
              <div className="min-w-0 flex-1">
                {subtitle && <p className="mb-1 text-[12.5px] text-muted">{subtitle}</p>}
                <DI.Title className="text-[18px] font-semibold leading-snug tracking-[-0.01em]">{title}</DI.Title>
                <DI.Description className="sr-only">{typeof title === "string" ? title : "Fiche"}</DI.Description>
                {badges && <div className="mt-2 flex flex-wrap items-center gap-2">{badges}</div>}
              </div>
              <IconButton label="Fermer" size="sm" onClick={request}>
                <X className="size-4" />
              </IconButton>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
                {footer}
              </footer>
            )}
          </DI.Content>
        </DI.Portal>
      </DI.Root>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Abandonner les modifications ?"
        description="Les modifications saisies n'ont pas été enregistrées. Si vous fermez, elles seront perdues."
        confirmLabel="Abandonner"
        onConfirm={onClose}
      />
    </>
  );
}

/** Section titrée d'un tiroir : un filet la sépare de la précédente. */
export const DrawerSection = ({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) => (
  <section className="border-t border-line py-4 first:border-t-0 first:pt-0">
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h3 className="text-[12.5px] text-muted">{title}</h3>
      {aside}
    </div>
    {children}
  </section>
);

/** Pied de traçabilité : qui a créé ou modifié la fiche, et quand. */
export const Trace = ({ children }: { children: ReactNode }) => (
  <p className="mt-4 border-t border-line pt-3 text-[12px] text-faint">{children}</p>
);
