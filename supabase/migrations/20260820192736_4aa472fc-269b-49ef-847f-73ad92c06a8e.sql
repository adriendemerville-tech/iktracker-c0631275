INSERT INTO public.blog_posts (slug, title, subtitle, content, status, author_name, meta_description, published_at, is_listed, seo_indexable, display_order)
VALUES (
'stack-outils-artisan-devis-vocal-kilometres-visibilite',
'Devis, kilomètres, visibilité : la stack outils d''un artisan qui ne travaille plus le soir',
'Trois postes administratifs mangent les soirées d''une entreprise du bâtiment. Voici comment chacun s''automatise.',
$md$Un artisan facture ses heures de chantier. Il ne facture jamais ses heures de bureau. Pourtant, entre le chiffrage des devis, la justification des déplacements et la recherche de nouveaux clients, ces heures-là s'accumulent — le soir, le week-end, et sans contrepartie.

Ce constat n'est pas théorique : il est à l'origine d'IKtracker, développé pour les besoins de terrain d'[Avenir Rénovations](/blog/auteur/adrien-de-volontat). Trois postes reviennent systématiquement dans les échanges avec les artisans utilisateurs. Chacun se traite avec un outil dédié.

## 1. Le devis tapé à 21 h

Le métrage est pris sur le chantier, à midi. Le devis, lui, est rédigé le soir, une fois les enfants couchés. Résultat : le client reçoit la proposition 48 à 72 heures plus tard, souvent après celle d'un concurrent plus rapide.

Le délai de réponse est pourtant l'un des premiers facteurs de conversion sur les petits chantiers de rénovation. Chaque jour de retard fait mécaniquement baisser le taux de signature.

La réponse technique existe désormais : la dictée assistée par IA. [DictaDevi, la plateforme IA dédiée au bâtiment et à la rénovation](https://dictadevi.io), transforme un relevé de chantier dicté à la voix en devis structuré. L'artisan parle, l'outil transcrit, associe les postes au client et produit le document. Le devis peut partir avant même de quitter le chantier, avec le CRM et le suivi de marge attachés.

Ce que cela change concrètement :

- le devis est envoyé pendant que le client est encore dans l'intention d'achat ;
- la ressaisie du soir disparaît, avec elle les oublis de postes ;
- la marge est visible chantier par chantier, pas seulement au bilan.

## 2. Les kilomètres jamais notés

Visite technique, passage au dépôt, retour SAV, rendez-vous client : une journée d'artisan est une succession de déplacements. Chacun ouvre droit à une indemnité kilométrique, à condition d'être justifié — date, motif, adresses de départ et d'arrivée, distance, véhicule.

Dans les faits, presque personne ne tient ce relevé au jour le jour. Les kilomètres sont reconstitués de mémoire en fin d'année, ce qui produit deux effets : une sous-déclaration importante, et un dossier fragile en cas de contrôle.

C'est le poste que couvre IKtracker, gratuitement :

- application du [barème kilométrique officiel 2026](/bareme-ik-2026), tranches et puissance fiscale comprises, avec la majoration de 20 % pour les véhicules 100 % électriques ;
- [Mode Tournée](/mode-tournee) pour les journées à plusieurs chantiers, regroupées automatiquement en un seul trajet calculé ;
- relevé mensuel en PDF transmis au cabinet comptable, et récapitulatif annuel archivé ([espace expert-comptable](/expert-comptable)).

Un artisan qui parcourt 15 000 km professionnels dans l'année laisse plusieurs milliers d'euros de déduction sur la table s'il ne les trace pas.

## 3. Le site que personne ne trouve

Le bouche-à-oreille finit toujours par plafonner. Au-delà d'un certain volume d'activité, il faut des demandes entrantes — et elles passent aujourd'hui par deux canaux : la recherche classique et, de plus en plus, les assistants IA. Un particulier qui demande à ChatGPT ou Perplexity quel artisan contacter dans sa commune obtient une réponse construite à partir de sites structurés pour être cités.

Un site vitrine créé une fois puis laissé en l'état n'apparaît ni dans l'un ni dans l'autre. Le travail nécessaire — technique, contenus, données structurées, suivi des positions — est un métier à part entière, incompatible avec des journées de chantier.

[Crawlers.fr, la solution de SEO et GEO automatisée par l'IA](https://crawlers.fr), prend ce poste en charge : audit du site, correctifs priorisés, production des contenus qui manquent et suivi des positions, en continu. IKtracker en est le terrain d'essai réel — les résultats de ce site servent à valider les automatisations.

## Une journée type, outillée

| Moment | Ce qui se passe | Outil |
| --- | --- | --- |
| 7 h 30 | Départ vers le premier chantier, la tournée démarre | IKtracker |
| 9 h | Relevé de chantier dicté, devis en construction | DictaDevi |
| 12 h | Passage fournisseur ajouté à la tournée du jour | IKtracker |
| 16 h | Devis envoyé, relance programmée | DictaDevi |
| Fin de mois | Relevé IK transmis au comptable | IKtracker |
| En continu | Le site génère des demandes entrantes | Crawlers |

## Pourquoi trois outils plutôt qu'un seul

Les suites « tout-en-un » du bâtiment couvrent large et mal : le devis y est correct, le suivi kilométrique symbolique, la visibilité absente. Chacun de ces trois postes suppose une expertise différente — un moteur vocal métier, un moteur de calcul fiscal, un moteur d'analyse SEO.

Le bon critère n'est pas le nombre de logiciels, mais le temps administratif restitué. Sur ces trois postes, il se compte en heures par semaine.

## Par où commencer

Par le poste gratuit. IKtracker est [gratuit à vie](/tarifs), sans abonnement ni carte bancaire : les kilomètres commencent à se compter dès la création du compte. Le chiffrage et la visibilité viennent ensuite, dans l'ordre de ce qui coûte le plus cher à l'entreprise.

Une synthèse complète de cette organisation est disponible sur la page [logiciel de devis artisan](/logiciel-devis-artisan).
$md$,
'published',
'Adrien de Volontat',
'Devis vocal sur le chantier, indemnités kilométriques au barème officiel et visibilité en ligne : les trois outils qui rendent ses soirées à un artisan du bâtiment.',
now(),
true,
true,
0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  content = EXCLUDED.content,
  meta_description = EXCLUDED.meta_description,
  status = EXCLUDED.status,
  updated_at = now();