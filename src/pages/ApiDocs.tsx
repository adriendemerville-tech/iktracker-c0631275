import { LastUpdated } from "@/components/LastUpdated";
import { getStaticLastModified } from "@/lib/page-dates";
import { Helmet } from "@/lib/helmet-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { EnhancedMarketingFooter } from "@/components/marketing/EnhancedMarketingFooter";
import { Breadcrumb } from "@/components/Breadcrumb";

const PAGE_LASTMOD = getStaticLastModified("/api-docs");

const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/partner-api`;

const Code = ({ children }: { children: string }) => (
  <pre className="bg-foreground text-background p-4 rounded-lg text-xs overflow-x-auto">
    <code>{children}</code>
  </pre>
);

const Endpoint = ({
  method,
  path,
  scope,
  children,
}: {
  method: string;
  path: string;
  scope?: string;
  children: React.ReactNode;
}) => (
  <section className="border border-border rounded-xl p-6 space-y-3">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-xs px-2 py-1 rounded bg-primary text-primary-foreground">
        {method}
      </span>
      <code className="font-mono text-sm">{path}</code>
      {scope && (
        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
          scope: {scope}
        </span>
      )}
    </div>
    {children}
  </section>
);

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet></Helmet>
      <MarketingNav />

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <Breadcrumb items={[{ label: "API Partenaires" }]} />
        <header className="space-y-3">
          <h1 className="text-4xl font-bold">API Partenaires IKtracker</h1>
          {PAGE_LASTMOD ? <LastUpdated date={PAGE_LASTMOD} className="mt-2 mb-4" /> : null}
          <p className="text-lg text-muted-foreground">
            Intégrez IKtracker dans votre plateforme : calcul d'indemnités, gestion des trajets, SSO
            et webhooks. Gratuit, sans limite imposée.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Authentification</h2>
          <p className="text-sm text-muted-foreground">
            Toutes les requêtes (sauf <code>/sso/verify</code>) nécessitent l'en-tête{" "}
            <code>x-api-key</code> avec votre clé partenaire. Pour obtenir une clé, contactez-nous
            via{" "}
            <a href="/contact" className="underline">
              /contact
            </a>
            .
          </p>
          <Code>{`curl -H "x-api-key: ikt_live_xxx..." \\
  ${baseUrl}/health`}</Code>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Modèle d'utilisateur</h2>
          <p className="text-sm text-muted-foreground">
            Chaque utilisateur de votre plateforme est identifié par un{" "}
            <code>external_user_id</code> (stable, choisi par vous) et un{" "}
            <code>external_email</code>. Lors du premier appel impliquant cet utilisateur, IKtracker
            crée automatiquement un compte (ou réutilise un compte existant avec le même email).
            Aucune action requise de votre côté pour le provisioning.
          </p>
        </section>

        <h2 className="text-2xl font-bold border-t pt-6">Endpoints</h2>

        <Endpoint method="GET" path="/health">
          <p className="text-sm text-muted-foreground">
            Vérifie la validité de votre clé et retourne le quota restant.
          </p>
          <Code>{`{ "ok": true, "partner": "dictadevi", "quota_remaining": 99873 }`}</Code>
        </Endpoint>

        <Endpoint method="POST" path="/vehicle/lookup">
          <p className="text-sm text-muted-foreground">
            Recherche un véhicule par sa plaque d'immatriculation française. Retourne marque,
            modèle, CV fiscaux, motorisation.
          </p>
          <Code>{`POST ${baseUrl}/vehicle/lookup
x-api-key: ikt_live_xxx...
Content-Type: application/json

{ "plate": "AB-123-CD" }`}</Code>
          <Code>{`{
  "success": true,
  "make": "Renault",
  "model": "Clio",
  "year": 2020,
  "fiscalPower": 5,
  "isElectric": false
}`}</Code>
        </Endpoint>

        <Endpoint method="POST" path="/ik/calculate">
          <p className="text-sm text-muted-foreground">
            Calcule l'indemnité kilométrique d'un trajet selon le barème officiel français (bonus
            20% véhicules 100% électriques inclus).
          </p>
          <Code>{`POST ${baseUrl}/ik/calculate
x-api-key: ikt_live_xxx...

{
  "fiscal_power": 5,
  "is_electric": false,
  "annual_km": 12000,
  "trip_km": 45
}`}</Code>
          <Code>{`{
  "success": true,
  "fiscalPower": 5,
  "bracket": "mid",
  "bracketLabel": "5 001 – 20 000 km",
  "tripIkAmount": 21.30,
  "annualIkAmount": 5679.00
}`}</Code>
        </Endpoint>

        <Endpoint method="POST" path="/trips" scope="write">
          <p className="text-sm text-muted-foreground">
            Crée un trajet pour un utilisateur. L'IK est calculée automatiquement à partir de{" "}
            <code>vehicle_id</code>. Si <code>vehicle_id</code> n'est pas fourni, IKtracker assigne
            automatiquement le véhicule par défaut de l'utilisateur (le plus ancien) — garde-fou
            pour éviter les trajets orphelins.
            <strong> Recommandation :</strong> passez toujours <code>vehicle_id</code> explicitement
            pour un contrôle précis du barème. L'utilisateur est provisionné automatiquement au
            premier appel.
          </p>
          <Code>{`POST ${baseUrl}/trips
x-api-key: ikt_live_xxx...
x-external-user-id: user-12345

{
  "external_email": "marie@cabinet.fr",
  "date": "2026-04-23",
  "start_location": "12 rue de la Paix, 75002 Paris",
  "end_location": "Cabinet client, 92100 Boulogne",
  "distance": 12.5,
  "vehicle_id": "uuid-optionnel",
  "purpose": "RDV client",
  "round_trip": true,
  "calendar_event_id": "dictadevi-evt-99"
}`}</Code>
          <Code>{`{
  "success": true,
  "trip_id": "uuid",
  "ik_amount": 7.95,
  "iktracker_user_id": "uuid"
}`}</Code>
        </Endpoint>

        <Endpoint method="GET" path="/stats">
          <p className="text-sm text-muted-foreground">
            Retourne les totaux de l'année en cours pour un utilisateur (km, IK, nombre de trajets,
            palier fiscal en cours).
          </p>
          <Code>{`GET ${baseUrl}/stats
x-api-key: ikt_live_xxx...
x-external-user-id: user-12345`}</Code>
          <Code>{`{
  "success": true,
  "year": 2026,
  "total_km": 4521.3,
  "total_ik": 2876.45,
  "trips_count": 87,
  "current_bracket": "low",
  "bracket_label": "≤ 5 000 km"
}`}</Code>
        </Endpoint>

        <Endpoint method="GET" path="/preferences" scope="preferences:read">
          <p className="text-sm text-muted-foreground">
            Retourne les préférences d'import calendrier de l'utilisateur lié.{" "}
            <code>calendar_import_mode</code> vaut
            <code> individual</code> (chaque événement = un aller-retour depuis la Maison) ou{" "}
            <code>tour</code>
            (tous les rendez-vous d'une même journée sont regroupés en une tournée{" "}
            <em>Maison → étapes → Maison</em>).
          </p>
          <Code>{`GET ${baseUrl}/preferences
x-api-key: ikt_live_xxx...
x-external-user-id: user-12345`}</Code>
          <Code>{`{
  "calendar_import_mode": "tour",
  "has_home_address": true,
  "note": null
}`}</Code>
          <p className="text-sm text-muted-foreground">
            <code>note: "home_address_missing"</code> signale que le mode <code>tour</code> est
            actif mais qu'aucune adresse « Maison » n'est définie côté IKtracker : les imports
            retombent alors en trajets individuels tant que la Maison n'est pas renseignée.
          </p>
        </Endpoint>

        <Endpoint method="PUT" path="/preferences" scope="preferences:write">
          <p className="text-sm text-muted-foreground">
            Met à jour le mode d'import calendrier de l'utilisateur lié. Renvoie{" "}
            <code>409 home_address_required</code>
            si l'utilisateur active <code>tour</code> sans avoir défini d'adresse Maison.
          </p>
          <Code>{`PUT ${baseUrl}/preferences
x-api-key: ikt_live_xxx...
x-external-user-id: user-12345
Content-Type: application/json

{ "calendar_import_mode": "tour" }`}</Code>
          <Code>{`{
  "calendar_import_mode": "tour",
  "has_home_address": true,
  "updated_at": "2026-07-22T09:12:00Z"
}`}</Code>
          <p className="text-sm text-muted-foreground">
            Déclenche le webhook <code>preferences.updated</code> si votre plateforme y est abonnée.
          </p>
        </Endpoint>

        <Endpoint method="GET" path="/vehicles" scope="read">
          <p className="text-sm text-muted-foreground">Liste les véhicules de l'utilisateur lié.</p>
          <Code>{`GET ${baseUrl}/vehicles
x-api-key: ikt_live_xxx...
x-external-user-id: user-12345`}</Code>
        </Endpoint>

        <Endpoint method="PATCH" path="/vehicles/:id" scope="vehicles:write">
          <p className="text-sm text-muted-foreground">
            Met à jour un véhicule. Le paramètre <code>update_past_trips</code> (booléen, défaut
            <code> false</code>) contrôle la rétroactivité : si <code>true</code> et que
            <code> fiscal_power</code> ou <code>is_electric</code> change, toutes les indemnités des
            trajets passés liés à ce véhicule sont immédiatement recalculées avec le nouveau barème.
            Si <code>false</code>, seuls les trajets créés après la modification en bénéficient.
          </p>
          <Code>{`PATCH ${baseUrl}/vehicles/{vehicle_id}
x-api-key: ikt_live_xxx...
x-external-user-id: user-12345
Content-Type: application/json

{
  "fiscal_power": 6,
  "is_electric": true,
  "update_past_trips": true
}`}</Code>
          <Code>{`{
  "success": true,
  "vehicle_id": "uuid",
  "changed": ["fiscal_power", "is_electric"],
  "update_past_trips": true,
  "recalculated_trips": 127
}`}</Code>
          <p className="text-sm text-muted-foreground">
            Déclenche le webhook <code>vehicle.updated</code> avec le champ
            <code> recalculated_trips</code>.
          </p>
        </Endpoint>

        <Endpoint method="POST" path="/sso/magic-link" scope="sso">
          <p className="text-sm text-muted-foreground">
            Génère une URL de connexion à usage unique (5 min) pour rediriger l'utilisateur vers son
            espace IKtracker, déjà authentifié.
          </p>
          <Code>{`POST ${baseUrl}/sso/magic-link
x-api-key: ikt_live_xxx...

{
  "external_user_id": "user-12345",
  "external_email": "marie@cabinet.fr",
  "redirect_to": "/app/mestrajets"
}`}</Code>
          <Code>{`{
  "success": true,
  "sso_url": "https://iktracker.fr/sso?token=...&partner=dictadevi&redirect=/app/mestrajets",
  "expires_in": 300,
  "iktracker_user_id": "uuid"
}`}</Code>
          <p className="text-sm text-muted-foreground">
            Côté votre plateforme : un simple <code>window.location.href = sso_url</code> suffit.
          </p>
        </Endpoint>

        <section className="border-t pt-6 space-y-3">
          <h2 className="text-2xl font-bold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            IKtracker peut notifier votre plateforme en temps réel lors d'événements (
            <code>trip.created</code>, <code>trip.updated</code>, <code>vehicle.updated</code>,{" "}
            <code>user.linked</code>, <code>preferences.updated</code>,{" "}
            <code>monthly_report.sent</code>). Configurez votre URL de réception et un secret HMAC
            depuis votre dashboard partenaire.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Relevés mensuels automatiques :</strong> tout utilisateur provisionné via l'API
            reçoit par défaut le relevé mensuel + cumul annuel par email le 15 de chaque mois
            (préférence <code>user_monthly_report_enabled = true</code>, modifiable via l'espace
            utilisateur). Le webhook <code>monthly_report.sent</code> est émis à chaque envoi avec{" "}
            <code>month_url</code> et <code>ytd_url</code> (liens sécurisés valides 7 jours),{" "}
            <code>external_user_id</code>, mois concerné et volumes (km, IK, nb trajets).
          </p>
          <p className="text-sm text-muted-foreground">
            Chaque requête contient les en-têtes <code>X-IKtracker-Event</code> et{" "}
            <code>X-IKtracker-Signature: sha256=&lt;hmac&gt;</code> pour vérifier l'authenticité.
          </p>
          <Code>{`POST https://your-platform.com/webhooks/iktracker
X-IKtracker-Event: trip.created
X-IKtracker-Signature: sha256=abc123...
Content-Type: application/json

{
  "event": "trip.created",
  "timestamp": "2026-04-23T10:00:00Z",
  "payload": {
    "trip_id": "uuid",
    "external_user_id": "user-12345",
    "distance": 12.5,
    "ik_amount": 7.95
  }
}`}</Code>
          <p className="text-sm text-muted-foreground pt-2">
            Exemple concret de payload <code>monthly_report.sent</code> (émis le 15 de chaque mois
            après envoi email) :
          </p>
          <Code>{`POST https://your-platform.com/webhooks/iktracker
X-IKtracker-Event: monthly_report.sent
X-IKtracker-Signature: sha256=9f4c1a2b8e...
Content-Type: application/json

{
  "event": "monthly_report.sent",
  "timestamp": "2026-05-15T07:02:14Z",
  "payload": {
    "iktracker_user_id": "b3d1e8a4-7c92-4f0a-9e11-2a5c6f8b0d31",
    "external_user_id": "user-12345",
    "email": "marie@cabinet.fr",
    "period": {
      "month": "2026-04",
      "start_date": "2026-04-01",
      "end_date": "2026-04-30"
    },
    "totals": {
      "trips_count": 42,
      "distance_km": 1287.4,
      "ik_amount_eur": 823.15
    },
    "ytd": {
      "distance_km": 5124.9,
      "ik_amount_eur": 3287.42
    },
    "month_url": "https://iktracker.fr/temporaryreport/8f2a...e4b1",
    "ytd_url": "https://iktracker.fr/temporaryreport/1c9d...af07",
    "expires_at": "2026-05-22T07:02:14Z"
  }
}`}</Code>
          <p className="text-xs text-muted-foreground">
            Les URLs <code>month_url</code> et <code>ytd_url</code> exposent le PDF via{" "}
            <code>?format=pdf</code> — idéal pour un pull côté partenaire (archivage GED,
            transmission comptable).
          </p>
        </section>

        <section className="border-t pt-6 space-y-3">
          <h2 className="text-2xl font-bold">Codes d'erreur</h2>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>
              <code>401</code> — clé API manquante ou invalide
            </li>
            <li>
              <code>403</code> — clé révoquée ou scope insuffisant
            </li>
            <li>
              <code>404</code> — utilisateur non lié ou ressource introuvable
            </li>
            <li>
              <code>429</code> — quota mensuel dépassé (contactez-nous pour augmentation gratuite)
            </li>
            <li>
              <code>500</code> — erreur interne (signalez-la à{" "}
              <a href="/contact" className="underline">
                /contact
              </a>
              )
            </li>
          </ul>
        </section>

        <section className="border-t pt-6 space-y-3">
          <h2 className="text-2xl font-bold">RGPD & responsabilité</h2>
          <p className="text-sm text-muted-foreground">
            En envoyant des données utilisateur à IKtracker, votre plateforme s'engage à avoir
            recueilli le consentement explicite de l'utilisateur final pour le partage de ces
            informations. IKtracker traite ces données conformément à sa{" "}
            <a href="/privacy" className="underline">
              politique de confidentialité
            </a>
            .
          </p>
        </section>
      </main>

      <EnhancedMarketingFooter />
    </div>
  );
}
