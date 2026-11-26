# Ce que ce centre de commande doit être

*Plan arrêté le 26 novembre 2026, à reprendre. Ce qui ne sert à rien aujourd'hui, ce qui manque
vraiment, et ce que WHM et cPanel donnent qui se traduit ici.*

---

## 1. La règle de tri

Un écran mérite d'exister s'il répond **oui** aux trois :

1. **Un administrateur d'ANAT Pilotage s'en sert-il ?** Pas un administrateur en général : celui-ci.
2. **Montre-t-il quelque chose que l'application sait vraiment dire ?** Sinon il attend un lot
   serveur, et il n'existe pas avant.
3. **Est-il le seul à le montrer ?** Deux écrans qui disent la même chose en disent une de trop.

C'est la troisième qui coupe le plus, et c'est celle qu'on oublie.

---

## 2. Ce qui ne sert à rien aujourd'hui — cinq écrans sur seize

| Écran | Le problème | Quoi en faire |
|---|---|---|
| **Activité** | `/api/activities` est cloisonnée par organisation et renvoie vide ; le journal d'audit montre la même chose, en mieux et sans cloisonnement | **Supprimer.** C'est un doublon du journal |
| **Envois** | une table vide : aucune messagerie n'est configurée, donc rien n'est jamais parti | **Fondre dans Canaux d'envoi.** Un onglet, pas un écran |
| **Canaux d'envoi** | trois onglets dont deux — SMS, WhatsApp — n'existent pas chez l'application | **Réduire à la messagerie seule**, plus le journal d'envoi |
| **Paramètres** | un seul réglage réel (`registration`) sur une trentaine affichés | **Fondre dans un écran Système** avec les organisations et la version |
| **Comptes dormants** | ne peut pas déposer de vague : l'application ne déclare pas les absences | **Garder, mais le dire** — il est à moitié vivant tant que le lot congés n'est pas fait |

**On passe de seize écrans à douze**, et aucun des quatre perdus ne portait quoi que ce soit
d'unique.

---

## 3. Ce qui manque, et qui compte plus que tout ce qui précède

### L'organisation n'est l'unité d'administration nulle part

C'est **le** trou. Tout le centre de commande est centré sur la personne ou sur la plateforme.
Or ANAT Pilotage est multi-organisations, `/api/admin/orgs` existe, et **aucun écran ne l'utilise**.

C'est exactement le modèle de WHM : on n'administre pas des utilisateurs, on administre des
**comptes-locataires**, et les utilisateurs vivent dedans. Il manque donc :

- la liste des organisations, avec leurs volumes, leurs membres, leurs profils ;
- la fiche d'une organisation : qui l'administre, ce qu'elle contient, ce qu'elle consomme ;
- les gestes qui vont avec — suspendre, réactiver, plafonner, archiver.

### Ouvrir la session de quelqu'un

Demandé explicitement, et c'est le geste le plus dangereux du système. Les sept garde-fous sont
écrits dans `06-vision-et-consequences.md` §4. Il arrive **en dernier** parce qu'il suppose le
journal scellé — qui existe maintenant.

### Les plafonds

WHM appelle ça des *packages* : un gabarit de limites qu'on applique à un compte. Ici : nombre de
membres, volume de fichiers, dépense d'IA, débit d'envoi. Aujourd'hui, **rien n'est plafonné**, et
le plafond de dépense d'IA figure déjà comme garde-fou inventé.

### Les sauvegardes réelles

Demandées, et l'écran a été retiré parce qu'il mentait. Il revient quand il y a quelque chose à
montrer : catalogue, vérification mensuelle par restauration à blanc, restauration au quorum.

---

## 4. WHM et cPanel — ce qui se traduit ici, et ce qui ne se traduit pas

| Chez WHM / cPanel | Ici | État |
|---|---|---|
| Liste des comptes, quotas, suspension | **Organisations** | **manque — priorité 1** |
| *Log in as user* | **Ouvrir une session** | lot 13, garde-fous écrits |
| Packages (gabarits de limites) | **Plafonds par organisation** | manque |
| Sauvegardes : lister, télécharger, restaurer | **Sauvegardes** | retiré, à refaire pour de vrai |
| Service status, redémarrage | — | l'application n'a pas de services à piloter |
| Gestionnaire de fichiers, de base | — | **non.** Un administrateur voit des volumes, pas des dossiers |
| Comptes courriel, DNS, SSL | — | hors sujet : l'infrastructure n'est pas ce produit |
| Revendeurs, hiérarchie | **Organisations imbriquées ?** | à décider, probablement non |
| Transfert d'un compte | **Export d'une organisation** | utile plus tard |

**Ce qu'il faut refuser de copier.** WHM donne un gestionnaire de fichiers et un accès base. Ici,
ce serait une faute : *un administrateur regarde des volumes, pas des dossiers* — la frontière que
tu as tracée, et que les `volumes` de `/api/admin/health` rendent tenable.

---

## 5. La cible

```
Pilotage       Vue d'ensemble
Locataires     Organisations · Fiche d'organisation · Plafonds
Accès          Utilisateurs · Rôles et droits · Sessions · Comptes dormants
Sécurité       Posture · Actions critiques · Journal scellé
Contrôles      Registre · Approbations · Garde-fous
Intelligence   Agents IA
Système        Réglages et messagerie · Sauvegardes
```

**Quatorze écrans, sept domaines.** On en retire quatre, on en ajoute trois, et le centre de
gravité se déplace vers le locataire — ce qui est le propre d'une console d'administration.

---

## 6. L'ordre

| | Quoi | Pourquoi là |
|---|---|---|
| **1** | Le ménage du §2 — quatre écrans retirés ou fondus | une heure, et la suite se voit mieux |
| **2** | **Organisations** — liste et fiche, sur `/api/admin/orgs` | la route existe, c'est le plus gros manque, et rien ne dépend d'elle |
| **3** | Le **journal scellé** à l'écran, à la place du journal de l'application | le service tourne ; c'est ce qui rend visible la différence entre une mémoire de travail et une mémoire qui fait foi |
| **4** | **Plafonds** par organisation | demande du serveur |
| **5** | **Sauvegardes** réelles | demande du serveur |
| **6** | **Ouvrir une session** | en dernier : suppose le journal scellé, qui existe enfin |

Les lots serveur — point de passage `supprimer()`, absences déclarées, origine des actes — suivent
leur propre calendrier dans `04-plan-commun.md` et ne bloquent que les écrans qui les attendent.

---

## 7. Une décision à prendre avant le lot 2

**Les organisations imbriquées.** WHM a des revendeurs : un compte qui administre d'autres
comptes. Faut-il qu'une direction de l'ANAT puisse administrer ses antennes sans être
administrateur de plateforme ?

Mon avis : **non, pas maintenant.** C'est une hiérarchie de droits, donc une source de trous, et
l'Agence n'a qu'une organisation aujourd'hui. Mais c'est la question qui décide de la forme de
l'écran Organisations, et mieux vaut la trancher avant de l'écrire qu'après.
