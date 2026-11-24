/**
 * La palette de l'Agence : huit teintes, et aucune autre. Ce sont les mêmes valeurs que les jetons
 * `--hue-*` de `web/src/styles.css` et que `PALETTE` dans `web/src/lib/referentials.ts` — une couleur
 * rangée en base par le serveur est donc l'une de celles que l'interface propose au choix.
 * Voir `docs/DESIGN-SYSTEM.md` § 2, « Couleurs de marque et d'état ».
 */
export const PALETTE = [
  "#007BC4", // bleu
  "#0B8580", // sarcelle
  "#2F7D3B", // vert
  "#9A7420", // ocre
  "#B4553A", // terre cuite
  "#4A5FC1", // indigo
  "#7A4FC1", // violet
  "#56677F", // ardoise
] as const;

/** Une teinte de la palette, choisie par son rang : deux rangs voisins se distinguent toujours. */
export const hue = (n: number) => PALETTE[((n % PALETTE.length) + PALETTE.length) % PALETTE.length];
