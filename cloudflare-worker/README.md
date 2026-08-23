# iktracker-bot-router — Déploiement Wrangler

Ce Worker Cloudflare gère : pre-rendering bots, redirections 301 legacy, proxy sitemap, cache headers, logpush maison.

Historiquement il était édité **à la main** dans le dashboard Cloudflare. Avec Wrangler, un `deploy` pousse le fichier local en une commande.

## Prérequis (une seule fois)

```bash
# Installer Wrangler (npm ou npx à la volée)
npm i -g wrangler

# S'authentifier au compte Cloudflare qui possède les zones iktracker.fr / .com
wrangler login
```

`wrangler login` ouvre le navigateur et stocke un token local dans `~/.wrangler/`. Ce token n'a **pas** besoin d'être commité — chaque poste dev fait son propre login.

## Déployer

Depuis la racine du repo :

```bash
cd cloudflare-worker
wrangler deploy
```

Wrangler lit `wrangler.toml`, upload `iktracker-bot-router.js` et rebind les routes déclarées (`iktracker.fr/*`, `www.iktracker.fr/*`, `iktracker.com/*`, `www.iktracker.com/*`).

## Vérifier après déploiement

```bash
# Header custom ajouté par le Worker → confirme qu'il tourne
curl -sI https://iktracker.fr/ | grep -i x-rendered-by
# → x-rendered-by: cloudflare-worker

# Redirection legacy
curl -sI https://iktracker.fr/install | grep -i location
# → location: https://iktracker.fr/installer
```

## Rollback

Cloudflare garde l'historique des versions du Worker. Dashboard → **Workers & Pages → iktracker-bot-router → Deployments → Rollback**.

## Notes

- `wrangler.toml` déclare 4 routes multi-zones. Si une zone n'est pas encore rattachée au compte, `wrangler deploy` échouera sur cette route — commenter la ligne le temps de rattacher la zone.
- Les secrets éventuels (aucun aujourd'hui) se posent via `wrangler secret put NAME`.
- Ne jamais éditer le Worker dans le dashboard **et** en local en parallèle : la prochaine `wrangler deploy` écrase les changements dashboard.

## GEO — ne pas brider les crawlers IA (réglages dashboard)

Le `robots.txt` autorise explicitement GPTBot, ClaudeBot, PerplexityBot, etc., mais un blocage en amont (WAF / rate-limit) produit le même effet qu'un `Disallow` : **un 429 sur un crawler IA = le contenu n'existe pas pour le modèle**. À vérifier dans le dashboard Cloudflare de la zone `iktracker.fr` :

1. **Security → Bots** : désactiver *Bot Fight Mode* (ou au minimum son option « block AI bots ») — il renvoie des 403 aux crawlers IA légitimes malgré le robots.txt.
2. **Security → Settings → AI Audit** (ou *Block AI Bots*) : laisser les crawlers IA en « Allow ».
3. **Security → Rate limiting rules** : exclure les user-agents IA connus (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended…) de toute règle qui pourrait renvoyer 429.
4. Vérification après réglage :
   ```bash
   curl -s -o /dev/null -w "%{http_code}" -A "Mozilla/5.0 (compatible; GPTBot/1.2)" https://iktracker.fr/
   # doit répondre 200 (jamais 403/429)
   ```

## Changement 23 août 2026 — vrai 404 pour les bots

Le Worker propage désormais le **HTTP 404** du meta-renderer pour les chemins inconnus (auparavant : page générique servie en 200 → soft 404). Redéployer le Worker pour activer :

```bash
cd cloudflare-worker && wrangler deploy
```
