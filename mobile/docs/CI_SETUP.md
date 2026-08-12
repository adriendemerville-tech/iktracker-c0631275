# Configuration CI/CD — iktracker-mobile

Repo : `adriendemerville-tech/iktracker-mobile`
Workflows : `.github/workflows/eas-build.yml` et `.github/workflows/eas-submit.yml`

---

## 1. Créer le projet EAS (à faire une seule fois, sur ton Mac)

```bash
cd ~/Desktop/iktracker-mobile
npm install
npm install -g eas-cli
eas login          # compte Expo
eas init           # crée le projet et remplit extra.eas.projectId
```

`eas init` met à jour `app.json`. Commit + push :

```bash
git add app.json
git commit -m "chore: EAS project id"
git push
```

---

## 2. Créer le token Expo (pour GitHub Actions)

1. https://expo.dev/settings/access-tokens
2. **Create token** → nom : `github-actions`
3. Copie la valeur (elle ne s'affiche qu'une fois)

---

## 3. Ajouter les secrets GitHub

Repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**

| Nom | Valeur | Obligatoire |
| --- | --- | --- |
| `EXPO_TOKEN` | le token Expo de l'étape 2 | oui |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://yarjaudctshlxkatqgeb.supabase.co` | oui |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | la clé anon (voir `.env.example`) | oui |
| `EXPO_PUBLIC_SITE_URL` | `https://iktracker.fr` | oui |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | mot de passe app-specific Apple | seulement pour submit iOS |

Le mot de passe app-specific se crée sur https://account.apple.com → Connexion et sécurité → Mots de passe pour app.

---

## 4. Renseigner `eas.json` pour la soumission App Store

Remplace les placeholders dans `eas.json` :

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "ton.email@apple.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABCDE12345"
    }
  }
}
```

- `ascAppId` : App Store Connect → ton app → App Information → Apple ID
- `appleTeamId` : https://developer.apple.com/account → Membership

---

## 5. Lancer un build

### Automatique
Chaque push sur `main` déclenche un build `preview` iOS.

### Manuel
GitHub → onglet **Actions** → **EAS Build** → **Run workflow** :
- `profile` : `development` | `preview` | `production`
- `platform` : `ios` | `android` | `all`

### Soumission stores
GitHub → **Actions** → **EAS Submit** → **Run workflow** → `ios` ou `android`.
Ce workflow build en `production` puis envoie automatiquement (`--auto-submit`).

---

## 6. Certificats iOS

Au premier build `preview`/`production`, EAS demande la gestion des credentials.
Fais-le **une fois en local et en interactif** pour qu'EAS les stocke :

```bash
eas build --platform ios --profile preview
```

Ensuite les builds CI (`--non-interactive`) réutilisent les credentials stockés côté Expo.

---

## Dépannage

| Erreur CI | Cause / correctif |
| --- | --- |
| `Not logged in` | `EXPO_TOKEN` manquant ou expiré |
| `projectId is not configured` | `eas init` non exécuté / `app.json` pas poussé |
| `npm ci` échoue | pas de `package-lock.json` — le workflow bascule sur `npm install` |
| `Credentials are not set up` | faire un build interactif local une fois (étape 6) |
| Submit iOS refusé | `appleId` / `ascAppId` / `appleTeamId` incorrects dans `eas.json` |
