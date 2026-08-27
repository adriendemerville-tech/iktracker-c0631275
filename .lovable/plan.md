# Compteur d'inscrits toujours à jour (+1000 conservé)

## Constat

Le compteur est déjà calculé au rendu serveur (`get_public_user_count()` + offset 1 000), mais :
- le HTML de la home est mis en cache à l'edge (Cloudflare), donc un visiteur peut voir un chiffre figé ;
- une fois la page affichée, le nombre ne bouge plus, même si une inscription a lieu.

## Ce qui change

- Le chiffre rendu côté serveur reste la valeur initiale (bon pour les bots et le SEO).
- Après affichage, le compteur se rafraîchit automatiquement depuis la base : au montage de la page, puis toutes les 60 secondes tant que l'onglet est visible, et lors du retour sur l'onglet.
- L'offset +1 000 reste appliqué côté serveur, à un seul endroit (constante partagée), donc jamais perdu ni doublé.
- L'animation du compteur ne repart pas de zéro à chaque rafraîchissement : elle glisse simplement vers la nouvelle valeur, et la ligne « 6 nouveaux membres chaque jour » reste inchangée.

## Détails techniques

- `src/lib/user-count.functions.ts` : extraire `USER_COUNT_OFFSET = 1000`, garder `getRegisteredUserCount` comme unique source (RPC `get_public_user_count` + offset).
- Nouveau hook `src/hooks/useLiveUserCount.ts` : initialisé avec la valeur SSR, `useQuery` (TanStack Query déjà présent) avec `initialData`, `refetchInterval: 60_000`, `refetchOnWindowFocus: true`, `staleTime: 30_000`, appel via `useServerFn(getRegisteredUserCount)`.
- `src/pages/Landing.tsx` : consommer le hook au lieu de la seule prop `initialUserCount`, et passer la valeur au `Counter` (transition douce, pas de re-animation depuis 0).
- Aucune modification de base de données ni de RLS ; la fonction RPC publique existante suffit.
