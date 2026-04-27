# Prompt — Nouveaux statuts blog IKtracker (à transmettre à Crawlers)

> **Destinataire** : agent `Crawlers` qui consomme l'API `blog-api` IKtracker.
> **Objet** : prise en compte des statuts `archived` et `deleted` (soft-delete).

---

## Ce qui change

L'API `blog-api` gère désormais **4 statuts** au lieu de 2 :

| Statut       | Visibilité publique | Description                                              |
|--------------|---------------------|----------------------------------------------------------|
| `draft`      | ❌                  | Brouillon                                                |
| `published`  | ✅                  | Publié, indexable                                        |
| `archived`   | ❌ (liste)          | Masqué des listes, **accessible via URL directe**        |
| `deleted`    | ❌                  | Corbeille (soft-delete), restaurable par l'admin         |

### Comportement API

- `GET /posts` (public) → retourne **uniquement** `published`. `archived` et `deleted` sont filtrés.
- `GET /posts?status=archived` ou `?status=deleted` → réservé aux requêtes authentifiées.
- `DELETE /posts/:slug` → **soft-delete par défaut** (passe en `deleted`, restaurable).
- `DELETE /posts/:slug?hard=true` → purge définitive (à éviter).
- `POST /posts` avec un slug en corbeille → **409 `slug_in_trash`** (nouveau cas à gérer).
- `POST /posts` avec un slug blacklisté → **409 `slug_blacklisted`** (inchangé).

---

## Ce que Crawlers doit faire

1. **Mémoire des slugs** : ajouter `slug_in_trash` à la liste des codes 409 traités comme **slug mort**. Ne jamais retenter ce slug ni ses variantes (cf. `LOVABLE_PROMPT_CRAWLERS_SLUG_MEMORY.md`).
2. **Sitemap & indexation** : aucun changement requis côté Crawlers — le sitemap IKtracker filtre déjà sur `published`. Les articles archivés/supprimés ne sont plus listés.
3. **Pas de republication automatique** d'un article archivé : si un slug existe en `archived`, il appartient à l'admin de le republier manuellement.
4. **Doc API à jour** : `GET /functions/v1/blog-api/docs` reflète les 4 statuts. Re-fetch la doc si tu la caches.

---

## TL;DR

- 4 statuts : `draft`, `published`, `archived`, `deleted`.
- Public ne voit que `published`.
- Nouveau code d'erreur : **409 `slug_in_trash`** → traiter comme un slug mort, ne jamais retenter.
- Soft-delete par défaut sur `DELETE` → ne pas utiliser `?hard=true` automatiquement.
