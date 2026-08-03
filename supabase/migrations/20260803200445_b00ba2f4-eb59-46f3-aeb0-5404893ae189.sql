UPDATE public.blog_posts SET
  slug = 'seuil-rentabilite-frais-reels-kilometrage-annuel',
  title = 'À partir de combien de kilomètres les frais réels deviennent-ils rentables ?',
  subtitle = 'Le seuil de bascule entre abattement de 10 % et frais réels, calculé par tranche de kilométrage annuel.',
  meta_description = 'Seuil de rentabilité des frais réels : à partir de combien de kilomètres par an la déduction au réel devient plus avantageuse que l''abattement de 10 %.',
  content = '## La question à laquelle répond cette page

Vous savez déjà ce que sont les frais réels. La vraie question est arithmétique : **à partir de combien de kilomètres parcourus dans l''année la déduction au réel rapporte-t-elle plus que l''abattement forfaitaire de 10 % ?**

## Le principe du seuil

L''abattement de 10 % est proportionnel à votre revenu imposable. Les frais réels, eux, dépendent de votre kilométrage et de la puissance fiscale de votre véhicule. Le point de bascule est donc l''intersection de deux droites :

- Abattement = revenu net imposable x 10 %
- Frais réels = kilométrage annuel x tarif du barème applicable

Dès que la seconde valeur dépasse la première, les frais réels sont plus avantageux.

## Ordres de grandeur par revenu

| Revenu net annuel | Abattement 10 % | Km à dépasser (5 CV) |
|---|---|---|
| 25 000 EUR | 2 500 EUR | environ 4 500 km |
| 35 000 EUR | 3 500 EUR | environ 6 300 km |
| 45 000 EUR | 4 500 EUR | environ 8 000 km |
| 60 000 EUR | 6 000 EUR | environ 10 500 km |

Ces seuils sont indicatifs : ils utilisent la première tranche du barème kilométrique et ne comptent que le véhicule. Ajoutez péages, parking et intérêts d''emprunt professionnel et le seuil descend nettement.

## Trois facteurs qui abaissent le seuil

1. **La puissance fiscale.** Un 7 CV atteint le seuil plusieurs milliers de kilomètres avant un 3 CV.
2. **Le véhicule 100 % électrique.** La majoration de 20 % du barème fait basculer le calcul plus tôt.
3. **Les frais annexes déductibles.** Péages, stationnement professionnel et intérêts d''emprunt s''ajoutent aux indemnités kilométriques.

## Le piège du seuil : la preuve

Passer aux frais réels n''a de sens que si vous pouvez justifier chaque trajet. Un kilométrage estimé de mémoire en fin d''année est le premier motif de rejet en cas de contrôle. Le seuil de rentabilité réel n''est donc pas seulement financier : il suppose un relevé daté, avec point de départ, destination et motif professionnel.

## Calculer votre propre seuil

Le [simulateur du barème 2026](/bareme-ik-2026) donne le montant exact déductible pour votre kilométrage et votre puissance fiscale. Comparez-le à 10 % de votre revenu net imposable : si le simulateur affiche davantage, les frais réels sont pour vous.

Pour la méthode de choix complète entre les deux régimes, voir le guide [frais réels ou forfait](/blog/frais-reels-ou-forfait-optimisation-impots-2026).'
WHERE slug = 'frais-reels-vs-forfait-guide-optimisation-impots';

UPDATE public.blog_posts SET
  slug = 'controle-urssaf-liste-des-pieces-a-fournir',
  title = 'Contrôle URSSAF : la liste exacte des pièces à fournir pour vos frais kilométriques',
  subtitle = 'Ce qu''un inspecteur demande réellement, pièce par pièce, et sous quelle forme la produire.',
  meta_description = 'Contrôle URSSAF des frais kilométriques : liste des justificatifs à fournir, forme attendue, durée de conservation et motifs de rejet les plus fréquents.',
  content = '## Ce que demande un inspecteur

Un contrôle sur les indemnités kilométriques ne porte pas sur votre bonne foi mais sur des pièces. Voici celles qui sont réclamées, dans l''ordre.

### 1. Le relevé détaillé des déplacements

Pour chaque trajet : date, adresse de départ, adresse d''arrivée, distance et **motif professionnel**. Un total annuel sans détail est systématiquement rejeté. Le relevé doit être produit sur toute la période contrôlée, pas par échantillon.

### 2. La carte grise du véhicule

Elle établit la puissance fiscale utilisée dans le barème et la date de mise en circulation. Si le véhicule appartient au conjoint ou est en location longue durée, joignez le contrat correspondant.

### 3. Le justificatif du lien professionnel

Selon l''activité : agenda, feuilles de rendez-vous, bons d''intervention, factures clients aux adresses visitées. C''est la pièce qui relie le trajet à une recette.

### 4. Le calcul appliqué

Barème utilisé, tranche kilométrique retenue, majoration de 20 % si le véhicule est 100 % électrique. L''inspecteur vérifie que la tranche correspond bien au kilométrage annuel total, et non à un cumul par trajet.

### 5. Les frais annexes, s''ils sont déduits

Péages, stationnement, intérêts d''emprunt : uniquement sur factures nominatives. Les indemnités kilométriques couvrent déjà carburant, entretien, assurance et amortissement : les déduire une seconde fois est un motif de redressement classique.

## Sous quelle forme produire les pièces

Un export daté, non modifiable après coup, horodaté et couvrant l''année complète. Un fichier tableur reconstitué la veille du contrôle a peu de valeur probante. Un relevé alimenté au fil de l''eau, exporté en PDF mensuel, en a beaucoup.

## Combien de temps conserver

Trois ans plus l''année en cours pour l''URSSAF. Le même délai s''applique en pratique aux justificatifs fiscaux des frais réels.

## Les quatre motifs de rejet les plus fréquents

1. Motif professionnel absent ou générique du type « déplacement ».
2. Trajets domicile-travail déclarés au-delà des 40 km autorisés sans justification.
3. Kilométrage total incohérent avec le compteur ou les factures d''entretien.
4. Double déduction du carburant en plus du barème.

## Automatiser la constitution du dossier

IKtracker enregistre chaque trajet avec sa date, ses adresses, sa distance et son motif, puis produit un relevé mensuel exportable. Voir la [méthode de déclaration URSSAF](/blog/methode-declaration-ik-urssaf-guide-gratuit) et le guide [contrôle URSSAF 2026](/blog/controle-urssaf-frais-kilometriques-2026).'
WHERE slug = 'dossier-ik-2026-les-7-regles-d-or-d-un-suivi-kilometrique-conforme-anti-redresse';

UPDATE public.blog_posts SET
  slug = 'declaration-2042-ou-reporter-ses-indemnites-kilometriques',
  title = 'Déclaration 2042 : où reporter exactement ses indemnités kilométriques',
  subtitle = 'Les cases à remplir, la ventilation entre salariés et indépendants, et les pièces à garder.',
  meta_description = 'Déclaration 2042 : dans quelle case reporter ses indemnités kilométriques, comment ventiler frais réels et frais annexes, et quels justificatifs conserver.',
  content = '## Le report se fait après le calcul, pas pendant

Cette page ne traite pas du calcul des indemnités : pour cela, voir les [étapes du calcul des frais kilométriques](/blog/7-etapes-du-calcul-indemnite-frais-kilometriques). Elle traite de l''étape suivante, celle où le montant obtenu doit être inscrit au bon endroit du formulaire.

## Salariés : cases 1AK à 1DK

Vous optez pour les frais réels en portant le **montant total** de vos frais professionnels dans la case correspondant au déclarant :

- Déclarant 1 : case **1AK**
- Déclarant 2 : case **1BK**
- Personnes à charge : cases **1CK** et **1DK**

Le montant inscrit comprend les indemnités kilométriques calculées au barème, plus les frais annexes réellement supportés (péages, stationnement, repas au-delà du montant forfaitaire). L''abattement automatique de 10 % disparaît dès que ces cases sont renseignées.

Important : renseigner ces cases n''annule pas l''obligation de détailler. L''administration attend un état des frais, à joindre en pièce libre ou à conserver.

## Indépendants : liasse professionnelle, pas la 2042

En BNC, les indemnités kilométriques ne passent pas par la 2042 mais par la **déclaration 2035**, en frais de véhicule. Le montant est ensuite reporté au résultat, lui-même repris sur la 2042 C Pro.

En micro-BNC ou micro-BIC, aucune déduction de frais réels n''est possible : l''abattement forfaitaire est réputé les couvrir.

## Ventiler correctement

| Nature | Où | Remarque |
|---|---|---|
| Indemnités kilométriques au barème | Inclus dans le total 1AK / 2035 | Couvre carburant, entretien, assurance, amortissement |
| Péages et stationnement | S''ajoutent au total | Sur factures nominatives |
| Intérêts d''emprunt du véhicule | S''ajoutent au prorata professionnel | Justificatif bancaire |
| Carburant seul | Nulle part | Déjà compris dans le barème |

## Les pièces à garder

Relevé détaillé des trajets, carte grise, factures des frais annexes. À conserver trois ans. Rien n''est à joindre spontanément, mais tout doit être produit sur demande.

## Générer l''état des frais

IKtracker produit un relevé annuel avec le total déductible et le détail trajet par trajet, exportable en PDF pour l''annexe libre. Le [barème 2026](/bareme-ik-2026) permet de vérifier le montant avant report.'
WHERE slug = 'etapes-declaration-fiscale-kilometrage-guide';