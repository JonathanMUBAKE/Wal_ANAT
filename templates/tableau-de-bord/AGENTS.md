# Gabarit « centre de commande » — consignes pour les agents développeurs

Ce dossier est la **référence**. Quand on vous demande une interface d'administration, de pilotage
ou de supervision, partez d'ici : recopiez `react/`, changez les jetons, branchez vos données.
N'inventez pas une nouvelle façon de faire ce qui est déjà fait ici.

Lisez ce fichier en entier avant d'écrire une ligne. Il est court, et il vous évitera de refaire
des choix déjà tranchés.

---

## 1. Ce que vous avez entre les mains

Trente-neuf écrans, dix domaines, une bibliothèque de composants, et des règles de conduite.
Rien n'est à moitié fait : chaque page a ses indicateurs, ses filtres, ses actions réelles et son
état vide.

```
react/src/
├── styles/tokens.css      ← LE fichier à modifier pour rhabiller. Un seul.
├── lib/
│   ├── navigation.ts      ← source unique : rail, panneau, fil, palette
│   ├── format.ts          ← formats français, export CSV, lecture des jetons CSS
│   ├── preferences.ts     ← préférences persistées, Échap, clic extérieur
│   ├── contexte.ts        ← thème, densité, vue courante
│   ├── donnees.ts         ← socle simulé
│   ├── sigrh.ts           ← cas simulé : services, tâches, files, sessions
│   ├── infrastructure.ts  ← capteurs matériels, système, base de données
│   ├── intelligence.ts    ← agents IA, modèles, connecteurs MCP
│   ├── communication.ts   ← SMTP, SMS, WhatsApp, modèles, envois
│   └── institution.ts     ← portefeuille, courrier, séances, décisions, signataire, accords
├── composants/            ← la bibliothèque. Servez-vous, n'ajoutez qu'en dernier recours.
├── vues/                  ← un fichier par écran
└── CentreDeCommande.tsx   ← la coquille : rail, panneau, barre, clavier, routage
```

---

## 2. Les onze règles

Elles ne sont pas négociables. Si une demande vous pousse à en enfreindre une, dites-le plutôt
que de la contourner en silence.

### 2.1 L'IA propose, un humain décide

Aucun agent IA ne modifie quoi que ce soit. Il rend une lecture, l'opérateur la retient ou
l'écarte. Toute action part d'un humain et porte son nom au journal.

### 2.2 Tout geste que vous ajoutez entre au registre

Une fonctionnalité n'est pas finie quand elle marche : elle est finie quand on sait ce qu'elle
permet, à qui, et à quel prix. Toute action que vous ajoutez se déclare dans `lib/controles.ts`
avec son effet, son niveau, ses rôles, sa journalisation, sa réversibilité, et **pourquoi ce
niveau**. Le registre impose un plancher par effet — une destruction exige au minimum un double
regard. Si vous voulez descendre en dessous, vous ne baissez pas le plancher : vous inscrivez un
**écart signé** (`ecart`), avec le motif, le nom de celui qui l'assume, la date, et la date de
revue. Un contrôle allégé en silence est un défaut ; allégé par écrit, c'est une décision.

Ce qui attend une main humaine ne va pas dans un écran à part : cela rejoint la file unique des
*Approbations*. Trois files qu'on ne regarde plus valent moins qu'une file qu'on vide.

### 2.3 Toute action à conséquence passe par `ui.confirmer`

```tsx
const ok = await ui.confirmer({
  titre: "Redémarrer sigrh-presences ?",
  texte: "Le service sera interrompu 20 à 60 secondes pour tous les agents. Les requêtes en cours seront perdues.",
  bouton: "Redémarrer", ton: "danger",
  mot: "sigrh-presences",   // irréversible → on fait retaper
});
```

Le `texte` dit **ce qui va se passer**, pas « êtes-vous sûr ». Une confirmation qui ne décrit pas
la conséquence ne sert à rien. Les actions réversibles n'ont pas de `mot` mais offrent « Annuler »
dans le message qui suit :

```tsx
ui.message("12 comptes suspendus.", "bon", { annuler: () => { /* remettre l'état d'avant */ } });
```

### 2.4 Rien ne repose sur la couleur seule

Un état porte toujours un mot. `<Jeton ton="critique" enfants="en alerte" />`, jamais une pastille
rouge muette. Les graphiques ont une légende dès deux séries et un repli tabulaire.

### 2.5 Un seul axe de valeurs par graphique

Deux mesures d'ordres différents font deux graphiques, ou sont ramenées à un indice base 100.
Jamais deux échelles sur un même dessin.

### 2.6 Le serveur reste seul juge

Les écrans de droits et de paramètres décrivent ce que l'interface **demande**, pas ce qu'elle
accorde. Écrivez-le dans l'interface quand c'est le sujet de la page.

### 2.7 Un journal d'audit ne se vide pas depuis l'interface

Pas de bouton « purger ». Les lignes partent par la durée de conservation, elle-même tracée quand
on la change.

### 2.8 Les garde-fous d'un agent ne vivent pas dans ses instructions

Une consigne en prose se négocie. Une liste d'outils autorisés, non. Lire et écrire sont séparés,
et tout ce qui écrit demande un humain.

### 2.9 Tout ce qui se fait à la souris se fait au clavier

`Ctrl K`, `Ctrl B`, `T`, `D`, `?`, et les séquences `G` puis une lettre. Une nouvelle page gagne
sa lettre dans `CentreDeCommande.tsx`.

### 2.10 Une animation explique, elle ne décore pas

Elle dit d'où vient une chose ou ce qui vient de changer. Rien ne bouge plus de 400 ms, rien ne
bouge deux fois pour la même information, et tout s'annule sous `prefers-reduced-motion`.

### 2.11 Français partout

Interface, noms de variables, noms de composants, commentaires, messages d'erreur, commits.
`poserEtat` et non `setState`, `enfants` et non `children` pour les emplacements nommés.

---

## 3. Conventions de code

### Nommage

| Ce que c'est | Comment on l'écrit |
|---|---|
| État React | `const [filtre, poserFiltre] = useState("")` |
| Fonction d'action | verbe à l'infinitif : `suspendre`, `revoquer`, `imputer` |
| Booléen | `actif`, `ouvert`, `modifie` — pas `isActive` |
| Composant | nom français, majuscule : `TableauDonnees`, `AssistantIA` |
| Clé de navigation | minuscules sans accent : `basededonnees`, `modelesmessages` |

### `children` ou `enfants` ?

- Un composant qui **enveloppe** prend `children` : `<Apparition>…</Apparition>`.
- Un composant à **plusieurs emplacements** les nomme : `<Carte enfants={…} />`,
  `<TeteCarte titre sous outils />`, `<Tiroir onglets pied />`.

C'est la seule exception à « tout en français », et elle est volontaire : un emplacement nommé
se lit mieux en attribut, une enveloppe se lit mieux en imbrication.

### Styles

Tailwind, avec les jetons du gabarit. **Jamais de couleur en dur** : `bg-surface`, `text-encre-3`,
`border-bordure`. Les valeurs ponctuelles passent en arbitraire : `text-[13px]`, `rounded-[4px]`.

---

## 4. Ajouter une page

Quatre gestes, dans cet ordre.

**1.** Une ligne dans `src/lib/navigation.ts` :

```ts
{ cle: "sauvegardes", nom: "Sauvegardes", icone: "base", compte: 2, ton: "vigilance" },
```

**2.** Un `case` dans `Vue()` de `CentreDeCommande.tsx` :

```tsx
case "sauvegardes": return <Sauvegardes />;
```

**3.** Le fichier `src/vues/Sauvegardes.tsx`, bâti sur ce squelette :

```tsx
export function Sauvegardes() {
  const ui = useUI();
  const [onglet, poserOnglet] = useState("liste");

  return (
    <>
      <Entete titre="…" sous="…" actions={<Bouton … />} />

      {/* Les chiffres qu'on regarde en premier */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="…" valeur={<NombreAnime valeur={n} />} />} />
      </div>

      {/* Une seule alerte en tête, s'il y a lieu de prévenir */}
      {probleme && <Apparition className="mb-4"><div className="…bg-critique-voile…">…</div></Apparition>}

      <Carte enfants={
        <>
          <Onglets actif={onglet} surChoix={poserOnglet} onglets={[…]} />
          <TableauDonnees … />
        </>
      } />
    </>
  );
}
```

**4.** Trois lignes dans `ResumeGroupe.tsx` si la page ouvre un nouveau domaine.

---

## 5. La bibliothèque

Avant d'écrire un composant, cherchez-le ici.

| Composant | Ce qu'il règle |
|---|---|
| `TableauDonnees<T>` | Tri, colonnes masquables, sélection, actions groupées, pagination, état vide. **Le filtrage reste au parent** : passez `lignes` déjà filtrées. |
| `AssistantIA` | Le bloc « l'IA propose, vous décidez ». Prend un `Constat` : résumé, cause, certitude, preuves citées, pistes, action proposée. |
| `PaletteCommandes` | `Ctrl K`. Lit `NAVIGATION`, plus les actions que vous lui passez. |
| `FournisseurUI` | `useUI()` → `message`, `confirmer`, `ouvrirTiroir`, `fermerTiroir`. |
| `Entete` | Titre, phrase d'explication, actions à droite. En haut de **chaque** page. |
| `Onglets` · `SelecteurPeriode` · `Interrupteur` · `LigneStat` · `Pastille` · `BarreMini` | Les pièces de l'habillage UniFi. |
| `Chronologie` · `FriseDisponibilite` · `Etapes` · `LigneReglage` | Les formes qui reviennent. |
| `Graphique` · `CarteGraphique` · `AnneauTotal` · `Etincelle` · `Legende` | Chart.js habillé par les jetons, légende cliquable, repli tabulaire. |
| `Apparition` · `ListeEchelonnee` · `NombreAnime` · `Squelette` · `AuDefilement` | Le mouvement. |
| `lib/controles.ts` | Le registre des gestes, la file d'approbation, les garde-fous. `conforme()`, `manque()`, `ecartAssume()` disent si un geste tient debout. |
| `lib/dormance.ts` | La politique du trimestre sans activité : seuils, exemptions signées, vagues. `gravite()` pèse un compte sur ses droits, pas sur ses jours. |
| `Bouton` · `Carte` · `Jeton` · `Delta` · `Menu` · `Jauge` · `Progression` · `EtatVide` | Le socle. |

---

## 6. Écrire les textes de l'interface

C'est la moitié du travail, et c'est là que les gabarits ordinaires échouent.

**Dites ce qui va se passer, pas ce qu'on vous demande de confirmer.**

> ✗ « Êtes-vous sûr de vouloir supprimer ? Cette action est irréversible. »
> ✓ « Les 412 messages en attente et les 48 en échec seront détruits. Rien ne sera traité, et rien ne pourra être récupéré. »

**Expliquez pourquoi, quand ce n'est pas évident.**

> ✓ « Une sauvegarde qu'on n'a jamais tenté de restaurer n'est pas une sauvegarde : c'est un fichier dont on espère qu'il marche. »

**Nommez les choses comme l'organisation les nomme.** Le mot « signataire » plutôt que
« parapheur » parce qu'il désigne la personne qui engage, pas le classeur qui transporte. Allez
chercher ces mots auprès des gens, ne les inventez pas.

**Pas de point d'exclamation, pas de « Oups », pas d'émoji.** Un outil institutionnel n'est pas
enjoué. Il est clair.

---

## 7. Ce que vous ne devez pas faire

- **Ne pas** ajouter de bibliothèque de composants. Pas de shadcn, pas de MUI, pas de routeur.
  Le gabarit n'a que React, Chart.js et Tailwind, et ça doit le rester.
- **Ne pas** mettre de couleur en dur. Si un jeton manque, ajoutez-le dans `tokens.css`.
- **Ne pas** écrire de données réelles d'une organisation dans le dépôt. Les modules `lib/`
  sont simulés et doivent le rester : noms inventés, chiffres inventés.
- **Ne pas** créer une page sans état vide, sans filtres, sans actions. Une page à moitié faite
  dans un gabarit de référence se recopie à moitié faite partout.
- **Ne pas** faire de l'IA un décideur. Même pour gagner du temps. Surtout pour gagner du temps.

---

## 8. Avant de rendre

```powershell
cd react; npm run typecheck; npm run build
```

Puis ouvrez l'écran dans un navigateur et vérifiez :

- en thème clair **et** en thème sombre ;
- en densité normale **et** compacte ;
- au clavier seul, sans souris ;
- à 1 400 px **et** à 900 px de large ;
- la console ne montre aucune erreur.

Le typage qui passe ne prouve rien sur ce qu'on voit à l'écran.
