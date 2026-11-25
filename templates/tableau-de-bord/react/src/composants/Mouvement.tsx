import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx, NF } from "../lib/format";

/* =========================================================================
   MOUVEMENT — les briques d'animation réutilisables
   Une règle, tenue partout : une animation explique d'où vient une chose, ou
   ce qui vient de changer. Elle ne décore jamais. Trois conséquences :
   - rien ne bouge plus de 400 ms ;
   - rien ne bouge deux fois pour la même information ;
   - tout s'annule sous `prefers-reduced-motion`, sans perdre de contenu.
   ========================================================================= */

/** Vrai quand la personne a demandé moins d'animations. */
export function useMouvementReduit() {
  const [reduit, poser] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const h = () => poser(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return reduit;
}

/* --- Apparition -------------------------------------------------------- */
/** Fait entrer un bloc. `depuis` dit d'où il vient, ce qui doit correspondre
    à l'endroit d'où l'information arrive réellement. */
export function Apparition({ depuis = "bas", delai = 0, className, children }: {
  depuis?: "bas" | "haut" | "centre";
  delai?: number;
  className?: string;
  children: ReactNode;
}) {
  const classe = { bas: "anim-pousse", haut: "anim-tombe", centre: "anim-grandit" }[depuis];
  return <div className={cx(classe, className)} style={{ animationDelay: delai + "ms" }}>{children}</div>;
}

/** Entrée échelonnée d'une liste : chaque enfant suit le précédent. */
export function ListeEchelonnee({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("echelonne", className)}>{children}</div>;
}

/* --- Nombre animé -------------------------------------------------------- */
/** Compte jusqu'à la valeur plutôt que de l'afficher d'un coup. Le mouvement
    dit « ce chiffre vient de changer » — à n'utiliser que là où c'est vrai.
    Le nombre final est écrit dans le DOM dès le départ pour les lecteurs
    d'écran, l'animation ne portant que sur l'affichage. */
export function NombreAnime({ valeur, decimales = 0, suffixe = "", prefixe = "", duree = 650 }: {
  valeur: number; decimales?: number; suffixe?: string; prefixe?: string; duree?: number;
}) {
  const reduit = useMouvementReduit();
  const [affiche, poser] = useState(reduit ? valeur : 0);
  const depart = useRef(0);
  const image = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (reduit) { poser(valeur); return; }
    const de = depart.current;
    const t0 = performance.now();
    const pas = (t: number) => {
      const p = Math.min(1, (t - t0) / duree);
      /* Sortie en douceur : rapide d'abord, posé à l'arrivée. */
      const e = 1 - Math.pow(1 - p, 3);
      poser(de + (valeur - de) * e);
      if (p < 1) image.current = requestAnimationFrame(pas);
      else depart.current = valeur;
    };
    image.current = requestAnimationFrame(pas);
    return () => { if (image.current) cancelAnimationFrame(image.current); };
  }, [valeur, duree, reduit]);

  return (
    <span className="tab-num" aria-label={`${prefixe}${NF(decimales).format(valeur)}${suffixe}`}>
      {prefixe}{NF(decimales).format(affiche)}{suffixe}
    </span>
  );
}

/* --- Squelette de chargement -------------------------------------------- */
/** Occupe la place du contenu à venir, à la bonne forme. Mieux qu'un rond qui
    tourne : la page ne saute pas quand les données arrivent. */
export function Squelette({ lignes = 3, hauteur = 12, className }: {
  lignes?: number; hauteur?: number; className?: string;
}) {
  const largeurs = [100, 86, 72, 94, 64, 80];
  return (
    <div className={cx("space-y-[8px]", className)} aria-hidden="true">
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className="rounded-[3px] anim-scintille"
          style={{
            height: hauteur,
            width: largeurs[i % largeurs.length] + "%",
            background: "linear-gradient(90deg, var(--surface-3) 8%, var(--survol) 18%, var(--surface-3) 33%)",
            backgroundSize: "680px 100%",
          }} />
      ))}
    </div>
  );
}

/** Carte entière en attente : titre, lignes, pied. */
export function SqueletteCarte({ className }: { className?: string }) {
  return (
    <div className={cx("bg-surface border border-bordure rounded-[4px] p-4", className)}>
      <Squelette lignes={1} hauteur={14} className="mb-3 max-w-[180px]" />
      <Squelette lignes={4} />
    </div>
  );
}

/* --- Transition de vue ---------------------------------------------------- */
/** Enveloppe le contenu d'une page. Le changement de `cle` rejoue l'entrée,
    ce qui marque le passage d'un écran à l'autre sans fondu inutile. */
export function TransitionVue({ cle, children }: { cle: string; children: ReactNode }) {
  return <div key={cle} className="anim-vue">{children}</div>;
}

/* --- Révélation au défilement --------------------------------------------- */
/** Fait entrer un bloc quand il arrive à l'écran, une seule fois. Utile pour
    les pages longues — on n'anime pas ce que personne n'a encore regardé. */
export function AuDefilement({ delai = 0, className, children }: {
  delai?: number; className?: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vu, poser] = useState(false);
  const reduit = useMouvementReduit();

  useEffect(() => {
    if (reduit || vu || !ref.current) { if (reduit) poser(true); return; }
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { poser(true); o.disconnect(); }
    }, { rootMargin: "0px 0px -40px 0px" });
    o.observe(ref.current);
    return () => o.disconnect();
  }, [vu, reduit]);

  return (
    <div ref={ref} className={cx(className, vu && "anim-pousse")}
      style={{ opacity: vu || reduit ? undefined : 0, animationDelay: delai + "ms" }}>
      {children}
    </div>
  );
}

/* --- Compteur qui change de valeur ---------------------------------------- */
/** Signale qu'une valeur vient de bouger : court éclat autour du nombre.
    Ne se déclenche pas au premier rendu — sinon tout clignote à l'ouverture. */
export function ValeurQuiChange({ valeur, children }: { valeur: unknown; children: ReactNode }) {
  const [eclat, poser] = useState(false);
  const premier = useRef(true);
  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    poser(true);
    const t = setTimeout(() => poser(false), 900);
    return () => clearTimeout(t);
  }, [valeur]);
  return <span className={cx("inline-block rounded-[3px]", eclat && "anim-attire")}>{children}</span>;
}
