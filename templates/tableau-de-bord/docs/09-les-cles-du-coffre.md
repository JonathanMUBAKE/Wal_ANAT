# Les clés du coffre — la pratique de référence

*Jonathan : « pour le problème de clé là, utilise la meilleure pratique sur le plan
international ». La voici, et ce n'est pas une invention de ma part : elle a un nom, une norme, et
une liste de façons de la rater.*

---

## 1. Le problème, en une phrase

Le coffre-fort est **immuable** : c'est ce qui lui donne sa valeur. Mais il contiendra des
documents supprimés par des agents, et un jour quelqu'un demandera qu'un contenu cesse d'être
lisible — une pièce versée par erreur, une donnée personnelle, une décision de justice.

**On ne peut pas effacer une entrée d'une chaîne scellée sans détruire la chaîne.** Et on ne peut
pas répondre « c'est impossible » à une demande légitime.

---

## 2. La réponse standard : l'effacement par la clé

Le procédé s'appelle **effacement cryptographique** — *cryptographic erase*, ou *crypto-shredding*.
Il est normalisé : **NIST SP 800-88 rév. 1**, *Guidelines for Media Sanitization*, le reconnaît
comme une méthode d'assainissement à part entière, au même titre que l'écrasement ou la
destruction physique du support.

Le principe tient en une phrase : **on ne détruit pas la donnée, on détruit la seule clé qui
permettait de la lire.** Ce qui reste est du bruit, et le bruit occupe la même place que la donnée
— donc l'empreinte ne change pas, la chaîne reste vérifiable, et l'histoire reste intacte.

C'est la réponse employée partout où un stockage immuable rencontre une obligation d'effacement :
les archives en écriture unique, les sauvegardes scellées, les services de stockage objet
verrouillés.

---

## 3. Comment on l'implémente correctement : le chiffrement en enveloppe

C'est le motif que tous les grands fournisseurs appliquent, sous le même nom — *envelope
encryption*.

**Deux niveaux de clés, et c'est tout le mécanisme :**

| | Quoi | Où elle vit |
|---|---|---|
| **DEK** *(clé de donnée)* | une clé **par instantané**, qui chiffre ce seul contenu | à côté de la donnée, mais **chiffrée par la KEK** |
| **KEK** *(clé de chiffrement de clés)* | chiffre les DEK, ne touche jamais une donnée | dans un **magasin séparé**, idéalement matériel |

Et trois gestes, qui n'ont pas la même portée :

- **détruire une DEK** → *cet* instantané devient illisible, pour toujours ;
- **détruire une KEK** → toute une classe d'instantanés devient illisible d'un coup ;
- **changer la KEK** *(rotation)* → on rechiffre seulement les DEK, jamais les données. C'est ce
  qui rend la rotation possible sans toucher à des téraoctets.

**Le choix d'algorithme n'est pas un détail :** AES-256 en mode **GCM**, c'est-à-dire du
chiffrement **authentifié**. Un contenu modifié ne se déchiffre pas en silence : il refuse de se
déchiffrer. Sans cela, on saurait qu'une pièce est illisible mais pas si elle a été altérée.

---

## 4. Les trois façons de rater ça, et elles sont toutes documentées

L'effacement par la clé ne vaut que si **toutes** les copies de la clé disparaissent. NIST est
explicite là-dessus : la méthode n'est valide que si la clé n'a jamais été exportée et qu'il n'en
existe aucune autre copie.

**Première façon de rater : sauvegarder la clé avec la donnée.** C'est la faute la plus commune, et
elle annule tout. Si la sauvegarde du coffre contient l'instantané chiffré **et** sa clé, détruire
la clé en production n'efface rien du tout. **Donc : la sauvegarde du coffre ne transporte jamais
le magasin de clés.** Les clés ont leur propre sauvegarde, avec son propre cycle de vie — et une
destruction doit s'y propager, sinon elle n'a pas eu lieu.

**Deuxième façon : garder la clé en mémoire ou dans un cache.** Une clé déchiffrée qui traîne dans
un cache applicatif, un journal de débogage ou un instantané de machine virtuelle survit à sa
destruction. Les DEK se déchiffrent à l'usage et ne se gardent pas.

**Troisième façon : ne pas journaliser la destruction.** Une clé détruite sans trace, c'est une
pièce devenue illisible sans que personne sache pourquoi, ni qui l'a décidé, ni quand. **La
destruction d'une clé est elle-même un acte, et il va au journal scellé.** Elle en est même l'acte
le plus grave : c'est le seul geste de tout le système qui rend quelque chose définitivement
inaccessible.

---

## 5. Ce que cela donne chez nous

| Objet | Traitement |
|---|---|
| **Le journal des actes** — qui a fait quoi, quand | **en clair, conservé.** Une administration garde la trace de ses actes et du nom de ceux qui les ont posés. Rien à effacer ici |
| **Le contenu des documents supprimés** | **chiffré, une clé par instantané.** C'est la donnée la plus sensible du système, puisque plus personne ne la surveille |
| **La demande d'effacement** | on détruit la DEK de l'instantané visé. L'entrée reste, son empreinte ne bouge pas, la vérification de la chaîne continue de passer |
| **La destruction elle-même** | un geste du registre, au niveau le plus haut : motif obligatoire, quorum de deux, irréversible — et journalisé |

**Le geste de destruction est irréversible, et doit le dire.** L'agent serveur l'a formulé mieux
que moi : *une clé détruite ne se retrouve pas, donc une destruction par erreur est définitive.*
C'est pour cela qu'il va au plus haut niveau du registre, à côté de la clôture de compte et de la
restauration de sauvegarde — pas parce qu'il est compliqué, mais parce qu'il ne se rattrape pas.

---

## 6. Ce que cela ne résout pas, et qu'il faut dire

**L'effacement par la clé repose sur une hypothèse** : qu'AES-256 restera hors de portée. C'est une
hypothèse solide pour des décennies, et c'est quand même une hypothèse — là où une destruction
physique n'en fait aucune. Pour une archive à cinq ou dix ans, c'est le bon compromis ; pour un
secret qui doit tenir cinquante ans, la question se repose.

**Et il ne résout pas le cas où la demande porte sur le journal lui-même** — « effacez mon nom des
entrées qui me concernent ». Là, le chiffrement par instantané ne sert à rien, puisque le nom est
en clair dans le journal, et c'est voulu. C'est une question d'institution, pas d'ingénierie :
est-ce qu'un registre d'actes administratifs peut être amputé ? Ma lecture est que non — c'est
même ce qui en fait un registre. Mais c'est à l'Agence de le dire, pas à nous, et il vaut mieux
que ce soit écrit avant la première demande qu'après.

---

## 7. En résumé, pour Jonathan

- **Le procédé a un nom et une norme** : effacement cryptographique, NIST SP 800-88.
- **Une clé par document**, elle-même chiffrée par une clé maîtresse rangée ailleurs.
- **Détruire la clé rend le document illisible pour toujours**, sans toucher à la chaîne.
- **Trois pièges**, tous évitables : ne jamais sauvegarder la clé avec la donnée, ne jamais la
  garder en cache, toujours journaliser sa destruction.
- **Le prix** : un magasin de clés à tenir, à sauvegarder séparément, et une rotation à faire. Ce
  n'est pas lourd, mais ce n'est pas rien, et cela s'ajoute à la surface d'attention déjà doublée
  par le service séparé.
- **La contrepartie à accepter les yeux ouverts** : une destruction par erreur est définitive.
