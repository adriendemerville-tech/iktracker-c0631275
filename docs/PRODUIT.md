# IKtracker — Brief Produit, Technique & Marketing
*Document de référence pour briefer une vidéo motion design (oct. 2026)*

---

## 1. En une phrase
**IKtracker automatise gratuitement, à vie, le suivi des trajets professionnels et le calcul des indemnités kilométriques (IK) selon le barème fiscal officiel 2026.**

Accroche courte : *« Chaque kilomètre pro compte. IKtracker les compte pour vous. »*

---

## 2. Le problème
- Indépendants, artisans, libéraux roulent beaucoup mais notent mal leurs trajets (carnet papier, Excel, oubli).
- Résultat : des centaines voire milliers d'euros de déduction fiscale perdus chaque année.
- Le barème kilométrique est complexe (tranches, CV fiscaux, +20 % électrique, remise à zéro annuelle).
- En cas de contrôle fiscal / URSSAF, il faut un relevé justifié et horodaté.
- Les alternatives sont payantes (abonnements) ou intrusives (tracking GPS permanent, revente de données).

## 3. La solution
Une application web installable (PWA iPhone / Android / desktop) qui :
1. **Capte** les trajets automatiquement (agenda, GPS, trajets récurrents).
2. **Calcule** les IK au centime près avec le barème officiel.
3. **Exporte** un relevé PDF/CSV opposable, prêt pour le comptable.

## 4. Cibles (personas)
| Persona | Douleur | Message clé |
|---|---|---|
| Artisan BTP | Chantiers multiples, pas le temps de noter | « Vos trajets de chantier, enregistrés sans y penser » |
| Profession libérale (infirmier·e, kiné, consultant) | Tournées quotidiennes | « Le Mode Tournée détecte vos arrêts tout seul » |
| Freelance / indépendant | RDV clients dans l'agenda | « Votre agenda devient votre carnet de route » |
| Expert-comptable | Clients aux relevés incomplets | « Des relevés propres, conformes, exportables » |

## 5. Fonctionnalités clés (ordre de mise en avant vidéo)
1. **Synchronisation calendrier** (Google, Outlook) — les RDV avec adresse deviennent des trajets à valider ; RDV privés/personnels filtrés, anti-doublons.
2. **Mode Tournée GPS** — démarrer, rouler, les arrêts (>2 min) sont détectés, distance calculée à la fin. Pas de tracking en arrière-plan permanent.
3. **Trajet en direct / manuel** — saisie en 2 taps, autocomplétion d'adresses.
4. **Trajets récurrents** — un trajet hebdomadaire configuré une fois.
5. **Calcul IK automatique** — barème officiel 2026, tranches, CV 1 à 7+, **+20 % pour véhicule 100 % électrique**, remise à zéro au 1er janvier (ou date fiscale personnalisée).
6. **Multi-véhicules** — véhicule principal, réattribution rétroactive sur une période, recalcul automatique.
7. **Scan de carte grise** — OCR des rubriques clés ; la photo n'est jamais conservée.
8. **Recherche par plaque** — marque, modèle, puissance fiscale préremplis.
9. **Exports & rapports** — PDF / CSV justificatifs pour comptable ou contrôle.
10. **Comparateur frais réels vs abattement 10 %**, simulateur de barème.
11. **Communauté** — forum, blog fiscal, avis utilisateurs.
12. **API partenaires & MCP** — intégration avec d'autres outils (ex. Dictadevi).

## 6. Avantages / preuves
- **0 € à vie** : pas d'abonnement, pas de freemium, pas de pub, pas de carte bancaire, trajets illimités.
- **Conforme** au barème DGFiP 2026, mis à jour automatiquement.
- **Respect de la vie privée** : RGPD, hébergement sécurisé, pas de revente de données, GPS uniquement à la demande.
- **Rapide** : inscription en quelques secondes, fonctionne hors ligne.
- **Preuve sociale** : +6 000 trajets enregistrés, +1 million de km suivis (compteurs live de la home).
- **Communautaire** : construit avec et pour les utilisateurs, sans investisseurs.

## 7. Positionnement concurrentiel
| | IKtracker | Concurrents (Driversnote, Izika…) |
|---|---|---|
| Prix | 0 € à vie | Abonnement mensuel / annuel |
| Limite de trajets | Aucune | Souvent limitée en gratuit |
| Agenda + GPS + récurrents | Oui | Partiel |
| Données | Non revendues | Variable |

## 8. Logique métier (pour visualiser la mécanique)
```text
Agenda / GPS / Saisie  ->  Trajet (départ, arrivée, km, véhicule)
                       ->  Cumul annuel par véhicule
                       ->  Barème : tranche (0-5000 / 5001-20000 / >20000 km) x CV
                       ->  x1.2 si 100% électrique
                       ->  IK totale  ->  Export PDF/CSV
```
Exemple chiffré utilisable en vidéo : 10 000 km/an avec une 5 CV ≈ **4 400 €** d'IK déductibles (à vérifier avec le simulateur avant diffusion).

## 9. Socle technique (à mentionner légèrement)
- Application web moderne + PWA installable, mode hors ligne.
- Backend sécurisé (Lovable Cloud), authentification email/Google.
- Géolocalisation à la demande, calcul de distances routières.
- API REST partenaires + serveur MCP pour assistants IA.
- Domaine : **iktracker.fr**.

## 10. Identité visuelle & ton
- **Couleurs** : bleu IKtracker (icône), fond ivoire chaud, accent indigo-violet.
- **Icône** : voiture stylisée orientée vers la droite (mouvement, tournée). Toujours des voitures, jamais de camions.
- **Ton** : pragmatique, entrepreneurial, direct. Pas d'emojis dans les infos. CTA : « Accéder gratuitement » (éviter « tester »).
- **Mots clés** : gratuit, automatique, conforme, simple, communautaire.

## 11. Proposition de structure vidéo (30–45 s)
| Temps | Scène | Texte à l'écran / VO |
|---|---|---|
| 0–5 s | Voiture qui roule, compteur km qui défile, billets qui s'envolent | « Chaque année, vous perdez des euros sur la route. » |
| 5–10 s | Carnet papier / Excel qui se froissent | « Noter ses trajets ? Personne n'a le temps. » |
| 10–15 s | Logo IKtracker, voiture vers la droite | « IKtracker les note pour vous. » |
| 15–22 s | Agenda -> RDV se transforment en trajets sur une carte | « Votre agenda devient votre carnet de route. » |
| 22–28 s | Mode Tournée : points d'arrêt qui s'allument | « En tournée, vos arrêts sont détectés automatiquement. » |
| 28–34 s | Compteur IK qui monte, badge « Barème 2026 » + « +20 % électrique » | « Indemnités calculées au centime, barème officiel. » |
| 34–39 s | Export PDF qui glisse vers un comptable | « Un relevé prêt pour votre comptable. » |
| 39–45 s | « 0 € à vie » géant, URL, CTA | « 100 % gratuit, à vie. iktracker.fr — Accédez gratuitement. » |

Formats conseillés : 16:9 (site, YouTube), 9:16 (Reels, TikTok, Shorts), 1:1 (LinkedIn).

## 12. Mentions obligatoires
- IKtracker n'est disponible que sur iktracker.fr (PWA), sans lien avec des apps tierces au nom proche.
- Montants d'exemple : indicatifs, selon barème fiscal en vigueur.
