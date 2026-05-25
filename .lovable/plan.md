
## Données Semrush (FR) — synthèse

**Volume où on est sous-exploités :**
- "barème kilométrique 2025" : 40 500/mo (KD 1) — encore dominant face à 2026 (70/mo)
- "frais kilometrique 2025" : 27 100/mo · "indemnité kilométrique 2025" : 18 100/mo
- "frais kilometrique impot" : 9 900/mo · "calcul frais kilometrique" : 9 900/mo
- "ik" : 9 900/mo (on est 22e — page d'accueil)
- "simulateur frais kilométrique" : 5 400/mo (on est 13e sur /bareme-ik-2026)
- "frais de déplacement" : 2 900/mo · "déplacement professionnel" : 1 300/mo (aucune page dédiée)
- "note de frais kilométrique" : 210/mo, KD 17 (aucune page dédiée — quick win)

**Personas BtoB à clarifier dans le texte :**
- Commercial itinérant · Auto-entrepreneur · Artisan · Infirmière libérale · Expert-comptable
- Le contenu BtoB doit lever : "puis-je déduire ?", "comment justifier ?", "où déclarer ?", "carnet de bord obligatoire ?"

**GEO (LLM) — questions à insérer en FAQ JSON-LD :**
- "comment calculer les indemnités kilométriques"
- "où déclarer les frais kilométriques"
- "comment justifier frais kilométrique impôt" (2 400/mo)
- "que comprend l'indemnité kilométrique"
- "est-ce que les indemnités kilométriques sont imposables"

---

## Pages à enrichir (8) — règle d'or : un ajout = une section, pas un patchwork

### 1. `/` (Index/Landing) — focus mot-clé "ik" + "frais kilometrique"
- H1 : garder la promesse marketing, ajouter sous-titre H2 sémantique "Calcul d'indemnités kilométriques 2025-2026"
- Meta description : intégrer "frais kilométriques", "barème URSSAF", "gratuit"
- FAQ JSON-LD (5 questions GEO ci-dessus) — pas de section visible si déjà chargée, sinon mini accordéon discret

### 2. `/bareme-ik-2026` — capter aussi le trafic "2025"
- Title : "Barème kilométrique 2025-2026 | Simulateur officiel URSSAF"
- Ajouter une section comparative tableau 2025 vs 2026 (déjà tiered scale en mémoire)
- Renforcer ancrage "simulateur frais kilométrique" dans H2 + alt

### 3. `/frais-reels` — capter "frais réels impôt"
- Meta + H2 : ajouter "Frais réels 2025-2026 vs abattement 10%"
- FAQ JSON-LD : "calcul frais réel", "où déclarer"

### 4. `/expert-comptable` — BtoB
- Persona "expert-comptable" + "cabinet" dans intro
- Bénéfices : audit, export CSV, opposabilité URSSAF
- Schema Service

### 5. `/mode-tournee` — BtoB itinérants
- Cibler "commercial itinérant", "tournée VRP", "note de frais kilométrique"
- Section "Pour qui ?" : commercial, artisan, infirmière libérale, livreur

### 6. `/installer` — déjà bien, juste affiner meta keywords (laisser tel quel sinon)

### 7. `/tarifs` — déjà excellent, juste enrichir meta avec "gratuit à vie", "0€", "sans abonnement"

### 8. **Nouvelle page** `/note-de-frais-kilometrique` (quick win KD 17, 210/mo)
- Guide pratique + modèle téléchargeable (lien vers app)
- Ciblage : "comment faire une note de frais kilométrique", "modèle note de frais"
- Routage + sitemap + lien depuis footer & blog

---

## Hors-scope (volontairement)
- Pas de refonte visuelle
- Pas de nouveau contenu marketing long sur les pages existantes : on ajoute uniquement **meta + 1 FAQ JSON-LD + 1-2 H2 sémantiques** par page
- Pas de surcharge de mots-clés (densité ≤ 2%)

---

## Validation
Ce plan touche 7 fichiers existants + 1 nouvelle page. Tu valides l'ensemble ou tu veux retirer/prioriser certains points (ex: ne pas créer la nouvelle page, ou ne traiter que le top 4) ?
