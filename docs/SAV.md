# IKtracker — Documentation SAV (Service Après-Vente)

Version 1.0 — Août 2026
Périmètre : procédures de support utilisateur, diagnostics et résolutions courantes.
Documents liés : `docs/BACKEND.md` (v4.1), `docs/FRONTEND.md` (v2.3), `docs/LINKEDIN_WORKFLOW.md`.

---

## 1. Canaux de support

| Canal | Surface | Traitement |
|---|---|---|
| Formulaire de feedback in-app | `src/components/FeedbackForm.tsx` (accessible sidebar desktop / menu mobile) | File de conversations consultable dans l'admin |
| Page Contact publique | `/contact` | Même file que le feedback |
| Rappel téléphonique | Case « être rappelé » du formulaire | Numéro **non conservé au-delà de 7 jours** (purge automatique) |
| Chat Félix | Assistant in-app | Réponses de premier niveau, escalade vers feedback |

Règle de confidentialité : aucun numéro de téléphone n'est archivé durablement. Ne jamais recopier un numéro dans un autre système.

---

## 2. Incidents fréquents et procédures

### 2.1 « Mon compte est bloqué / je ne peux pas exporter »
Cause attendue : e-mail non vérifié. Après 5 minutes de première session, `EmailVerificationGate` s'affiche.
Limites appliquées tant que l'e-mail n'est pas vérifié : **3 trajets max, 1 tournée, export de relevé interdit**.
Résolution : demander à l'utilisateur de cliquer « Renvoyer le lien ». Pour une adresse Gmail, un onglet Gmail s'ouvre automatiquement. Vérifier les spams. En dernier recours, contrôler la file d'envoi (`process-email-queue`) et les suppressions (`handle-email-suppression`).

### 2.2 « Mes IK / km ne correspondent pas »
Checklist dans l'ordre :
1. Puissance fiscale (CV) du véhicule identique sur tous les comptes liés.
2. Doublons de trajets : `normalize_trip_dedupe_text` + fonction `purge-duplicate-trips`.
3. Date de début d'exercice fiscal (1er janvier par défaut, ou date personnalisée) — le barème par tranches se réinitialise à cette date.
4. Bonus 100 % électrique : multiplicateur 1,2 appliqué aux véhicules électriques uniquement (pas aux hybrides).

### 2.3 « La distance ne se recalcule pas »
Le recalcul est forcé côté formulaire (étape Détails). Si une valeur aberrante persiste : relancer `recalculate-distances` sur le trajet concerné, puis vérifier les coordonnées GPS d'origine/destination.

### 2.4 « Mes rendez-vous agenda ne créent pas de trajets »
- La synchronisation tourne 4x par jour (`sync-calendar-trips`).
- Les rendez-vous **futurs** sont volontairement masqués jusqu'à leur date.
- Les rendez-vous d'un même agenda sur une même journée sont regroupés en **une tournée**.
- Adresse manquante : repli sur l'adresse « Maison ». Véhicule : hiérarchie du véhicule par défaut.
- Diagnostic : `calendar-debug`.

### 2.5 « Le mode Tournée s'est arrêté / je n'ai pas la bonne distance »
- GPS : relevé toutes les 10 s, points > 50 m d'écart aberrant ou < 5 m ignorés ; arrêt détecté après 2 min / 100 m.
- Distance : Haversine en temps réel, recalcul via Distance Matrix entre les arrêts à la finalisation.
- Session interrompue : reprise automatique ; une session détectée depuis un desktop est auto-finalisée.
- Le mode Tournée est **mobile uniquement**, l'assistant de récupération (Google Takeout) est **desktop uniquement**.

### 2.6 « Je n'ai pas reçu mon relevé mensuel / le comptable non plus »
- Envoi utilisateur : `send-user-monthly-report`. Envoi comptable : `send-accountant-report` (relance manuelle possible via `send-accountant-report-manual`).
- Les PDF générés sont indexés dans la page `/archive` (desktop) via `report-archive`, consultables par lien sécurisé (`view-report`).
- Si l'e-mail n'arrive pas : vérifier la suppression list et le désabonnement (`handle-email-unsubscribe`).

### 2.7 « L'immatriculation n'est pas reconnue »
Recherche à 3 niveaux avec repli, marge de sécurité de +1 CV appliquée en cas d'estimation. Fonction : `vehicle-lookup`. Résolution : saisie manuelle de la puissance fiscale, puis contrôle du barème.

### 2.8 « Une page publique ou un article de blog renvoie une erreur »
- 22 slugs de blog consolidés redirigent en **301** (source unique : `supabase/functions/_shared/blog-redirects.ts`, miroirs `src/lib/blog-redirects.ts` et Worker Cloudflare).
- En cas de désynchronisation : lancer `validate-blog-redirects-sync.cjs`.
- Sitemap : servi en SSR (proxy via l'Edge Function `sitemap`).

### 2.9 « Je veux supprimer mon compte / mes données »
Fonction `delete-account` (suppression définitive). Rappeler le contenu de `/rgpd` et `/privacy` avant confirmation. Aucune restauration possible après suppression.

---

## 3. Escalade

| Niveau | Périmètre | Action |
|---|---|---|
| N1 | Usage, e-mail non vérifié, paramétrage véhicule/exercice | Réponse depuis la file feedback |
| N2 | Écarts de calcul, doublons, agenda, tournée | Diagnostic via fonctions listées ci-dessus + logs |
| N3 | Incident plateforme (domaine, Worker, base) | Vérifier `docs/BACKEND.md` §infrastructure, puis Cloudflare / base |

---

## 4. Engagements de service

- Produit **gratuit à vie**, financé sans investisseurs : aucune promesse d'un SLA contractuel.
- Objectif indicatif de première réponse : 48 h ouvrées.
- Aucune donnée de trajet n'est revendue ; les échanges SAV suivent la politique décrite sur `/privacy`.

---

## 5. Maintenance de ce document

Mettre à jour `docs/SAV.md` à chaque nouvelle limite d'usage, nouveau canal de contact, ou changement d'une procédure de diagnostic ci-dessus.
