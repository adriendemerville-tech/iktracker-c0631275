import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Database,
  Globe,
  Lock,
  Cpu,
  Layers,
  Server,
  Code,
  FileText,
  Shield,
  Zap,
  Map,
  Calendar,
  Car,
  Calculator,
  Share2,
  Bell,
  Smartphone,
  Clock,
  Navigation as NavigationIcon,
} from "lucide-react";

import {
  ARCHITECTURE_SECTIONS,
  DB_TABLES,
  EDGE_FUNCTIONS,
  SECURITY_FEATURES,
  IK_BAREME,
} from "@/components/admin/documentation/doc-data";
import { generateDocPdfHtml } from "@/components/admin/documentation/doc-pdf-html";

export function AdminDocumentation() {
  const [docTab, setDocTab] = useState("architecture");

  const handleDownloadPdf = () => {
    const html = generateDocPdfHtml();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          URL.revokeObjectURL(url);
        }, 500);
      };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Documentation Technique</h2>
          <p className="text-sm text-muted-foreground">
            Architecture, schéma DB, sécurité, fonctions
          </p>
        </div>
        <Button onClick={handleDownloadPdf} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exporter PDF
        </Button>
      </div>

      <Tabs value={docTab} onValueChange={setDocTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="architecture">
            <Layers className="w-3.5 h-3.5 mr-1" />
            Stack
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="w-3.5 h-3.5 mr-1" />
            DB
          </TabsTrigger>
          <TabsTrigger value="functions">
            <Zap className="w-3.5 h-3.5 mr-1" />
            Functions
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-3.5 h-3.5 mr-1" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="tour">
            <Map className="w-3.5 h-3.5 mr-1" />
            Tournée
          </TabsTrigger>
        </TabsList>

        {/* Architecture */}
        <TabsContent value="architecture" className="space-y-4">
          {/* Visual schema */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                Schéma d'Architecture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <ArchBox
                    icon={<Smartphone className="w-4 h-4" />}
                    label="Client PWA"
                    sub="React + Vite"
                    color="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                  />
                  <span className="text-xl text-muted-foreground">→</span>
                  <ArchBox
                    icon={<Server className="w-4 h-4" />}
                    label="Supabase"
                    sub="PostgreSQL + Auth"
                    color="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                  />
                  <span className="text-xl text-muted-foreground">→</span>
                  <ArchBox
                    icon={<Globe className="w-4 h-4" />}
                    label="APIs"
                    sub="Maps + Calendar"
                    color="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
                  />
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center mt-2">
                  <ArchBox
                    icon={<Zap className="w-4 h-4" />}
                    label="Edge Functions"
                    sub="Deno Runtime"
                    color="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800"
                  />
                  <span className="text-xl text-muted-foreground">→</span>
                  <ArchBox
                    icon={<Database className="w-4 h-4" />}
                    label="Storage"
                    sub="S3 Buckets"
                    color="bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800"
                  />
                  <span className="text-xl text-muted-foreground">→</span>
                  <ArchBox
                    icon={<Bell className="w-4 h-4" />}
                    label="Realtime"
                    sub="WebSocket"
                    color="bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {ARCHITECTURE_SECTIONS.map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {section.icon}
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                    >
                      <div>
                        <span className="font-medium text-sm text-foreground">{item.label}</span>
                        <span className="text-sm text-muted-foreground ml-2">{item.value}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Database */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Tables PostgreSQL ({DB_TABLES.length})
              </CardTitle>
              <CardDescription>Toutes les tables ont RLS activé</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-1.5">
                  {DB_TABLES.map((table) => (
                    <div
                      key={table.name}
                      className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                    >
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded shrink-0">
                        {table.name}
                      </code>
                      <span className="text-sm text-muted-foreground flex-1">{table.desc}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {table.rows}
                        </Badge>
                        {table.rls && <Lock className="w-3 h-3 text-green-600" />}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Barème IK 2026
              </CardTitle>
              <CardDescription>
                Intégré dans src/types/trip.ts — Majoration 20% véhicules électriques
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-foreground">CV</th>
                      <th className="text-left py-2 font-medium text-foreground">≤ 5 000 km</th>
                      <th className="text-left py-2 font-medium text-foreground">
                        5 001 – 20 000 km
                      </th>
                      <th className="text-left py-2 font-medium text-foreground">&gt; 20 000 km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {IK_BAREME.map((b) => (
                      <tr key={b.cv} className="border-b border-border last:border-0">
                        <td className="py-1.5 font-medium text-foreground">{b.cv}</td>
                        <td className="py-1.5 text-muted-foreground">{b.up5000}</td>
                        <td className="py-1.5 text-muted-foreground">{b.f5001_20000}</td>
                        <td className="py-1.5 text-muted-foreground">{b.over20000}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edge Functions */}
        <TabsContent value="functions" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Edge Functions ({EDGE_FUNCTIONS.length})
              </CardTitle>
              <CardDescription>
                Runtime Deno — Déployées automatiquement via Lovable Cloud
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {EDGE_FUNCTIONS.map((fn) => (
                  <div
                    key={fn.name}
                    className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                  >
                    <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded shrink-0">
                      {fn.name}
                    </code>
                    <span className="text-sm text-muted-foreground flex-1">{fn.desc}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {fn.method}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Mesures de Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SECURITY_FEATURES.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5">
                    <Lock className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                Patterns de Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-mono text-muted-foreground mb-1">
                  // Vérification rôle admin (SECURITY DEFINER)
                </p>
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{`CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;`}</pre>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-mono text-muted-foreground mb-1">
                  // Politique RLS type (accès par user_id)
                </p>
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{`CREATE POLICY "users_own_data" ON trips
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tour Mode */}
        <TabsContent value="tour" className="space-y-4">
          {/* Workflow Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Map className="w-5 h-5 text-primary" />
                Mode Tournée — Workflow Complet
              </CardTitle>
              <CardDescription>
                Suivi GPS automatique pour itinérants (infirmiers, commerciaux, livreurs)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                {[
                  {
                    step: "1",
                    title: "Démarrage",
                    desc: "Utilisateur clique sur le bouton Tournée (TourButton) → appelle startTour() dans useTourTracker",
                  },
                  {
                    step: "2",
                    title: "Permissions",
                    desc: "Demande Geolocation API (navigator.geolocation.watchPosition) + Wake Lock API (écran allumé)",
                  },
                  {
                    step: "3",
                    title: "Suivi GPS",
                    desc: "watchPosition avec intervalle 10s, filtre précision > 50m ignoré, déplacement < 5m ignoré",
                  },
                  {
                    step: "4",
                    title: "Détection arrêt",
                    desc: "Immobilité dans rayon 100m pendant ≥ 2 min → nouveau TourStop créé automatiquement",
                  },
                  {
                    step: "5",
                    title: "Reverse geocoding",
                    desc: "API Google Geocoding sur chaque arrêt pour obtenir ville + adresse (cache mémoire)",
                  },
                  {
                    step: "6",
                    title: "Calcul distance",
                    desc: "Distance cumulée Haversine entre tous les GpsPoint filtrés (pas les stops)",
                  },
                  {
                    step: "7",
                    title: "Fin de tournée",
                    desc: "Bouton Terminer → handleConvertToTrips() : reverse geocode départ/arrivée, calcul distance route Google Maps, création Trip validé",
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {s.step}
                    </div>
                    <div>
                      <span className="font-medium text-sm text-foreground">{s.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Session Recovery */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Récupération de Session
              </CardTitle>
              <CardDescription>
                useTourSessionRecovery.ts — Gestion des interruptions (app kill, navigation, mise en
                veille)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="default" className="shrink-0 mt-0.5">
                      Cas A
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Inactivité &lt; 20 min → Reprise transparente
                      </p>
                      <p className="text-xs text-muted-foreground">
                        La tournée reprend automatiquement sans intervention utilisateur. Le gap GPS
                        est comblé.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="shrink-0 mt-0.5">
                      Cas B
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        20 min — 2 heures → Modale TourRecoveryModal
                      </p>
                      <p className="text-xs text-muted-foreground">
                        L'utilisateur choisit « Reprendre » ou « Terminer ». Affiche nb d'étapes et
                        km parcourus.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0 mt-0.5">
                      Cas C
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Inactivité &gt; 2 heures → Finalisation automatique
                      </p>
                      <p className="text-xs text-muted-foreground">
                        La tournée est convertie en trajet automatiquement. Données sauvegardées
                        dans localStorage puis nettoyées.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs font-mono text-muted-foreground mb-1">
                    // Persistance localStorage
                  </p>
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{`TOUR_SESSION_DATA    → { sessionId, startTime, lastActivity, stops[], gpsPoints[], totalDistanceKm }
TOUR_LAST_ACTIVITY   → timestamp ISO (mis à jour toutes les 30s)
TOUR_ACTIVE          → "true" / supprimé
TOUR_STOPS           → TourStop[] sérialisé
TOUR_GPS_POINTS      → GpsPoint[] sérialisé
TOUR_DISTANCE        → number (km cumulés)`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* GPS Technical Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <NavigationIcon className="w-5 h-5 text-primary" />
                Paramètres GPS & Détection
              </CardTitle>
              <CardDescription>
                useTourTracker.ts — Constantes et algorithme de détection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-foreground">Paramètre</th>
                      <th className="text-left py-2 font-medium text-foreground">Valeur</th>
                      <th className="text-left py-2 font-medium text-foreground">Rôle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        param: "WATCH_INTERVAL",
                        val: "10 000 ms",
                        role: "Intervalle minimum entre deux positions GPS",
                      },
                      {
                        param: "MAX_ACCURACY",
                        val: "50 m",
                        role: "Positions avec précision > 50m ignorées (bruit)",
                      },
                      {
                        param: "MIN_DISPLACEMENT",
                        val: "5 m",
                        role: "Mouvement < 5m ignoré (tremblement GPS)",
                      },
                      {
                        param: "STOP_RADIUS",
                        val: "100 m",
                        role: "Rayon d\u2019immobilité pour détecter un arrêt",
                      },
                      {
                        param: "STOP_DURATION",
                        val: "120 s (2 min)",
                        role: "Durée minimum dans le rayon pour valider un arrêt",
                      },
                      {
                        param: "MIN_TRIP_DISTANCE",
                        val: "0.5 km",
                        role: "Distance minimale pour créer un trajet valide",
                      },
                      {
                        param: "ACTIVITY_UPDATE",
                        val: "30 s",
                        role: "Fréquence de mise à jour du timestamp localStorage",
                      },
                      {
                        param: "TRANSPARENT_RESUME",
                        val: "< 20 min",
                        role: "Seuil reprise silencieuse (Cas A)",
                      },
                      {
                        param: "MODAL_RESUME",
                        val: "20 min – 2h",
                        role: "Seuil modale de récupération (Cas B)",
                      },
                      {
                        param: "AUTO_FINALIZE",
                        val: "> 2h",
                        role: "Seuil finalisation automatique (Cas C)",
                      },
                    ].map((r) => (
                      <tr key={r.param} className="border-b border-border last:border-0">
                        <td className="py-1.5">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {r.param}
                          </code>
                        </td>
                        <td className="py-1.5 font-medium text-foreground">{r.val}</td>
                        <td className="py-1.5 text-muted-foreground text-xs">{r.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Components & Files */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                Fichiers & Composants
              </CardTitle>
              <CardDescription>Architecture du mode tournée dans le codebase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {[
                  {
                    file: "hooks/useTourTracker.ts",
                    desc: "Hook principal : watchPosition, détection arrêts, calcul distance, persistance localStorage",
                    badge: "Core",
                  },
                  {
                    file: "hooks/useTourSessionRecovery.ts",
                    desc: "Récupération session : save/load/clear + logique Cas A/B/C + formatInactivityDuration",
                    badge: "Recovery",
                  },
                  {
                    file: "hooks/useWakeLock.ts",
                    desc: "Wake Lock API : garde l\u2019écran allumé pendant la tournée",
                    badge: "API",
                  },
                  {
                    file: "hooks/useGeolocation.ts",
                    desc: "Abstraction Geolocation API + gestion permissions",
                    badge: "API",
                  },
                  {
                    file: "components/TourButton.tsx",
                    desc: "Bouton principal sur la page Home : gradient animé, compteur km/étapes",
                    badge: "UI",
                  },
                  {
                    file: "components/FocusTourView.tsx",
                    desc: "Vue plein écran pendant tournée active : heure, durée, distance, signal GPS, batterie",
                    badge: "UI",
                  },
                  {
                    file: "components/TourLogSheet.tsx",
                    desc: "Sheet bottom avec liste des étapes détectées, stats temps/distance",
                    badge: "UI",
                  },
                  {
                    file: "components/TourRecoveryModal.tsx",
                    desc: 'AlertDialog Cas B : "Reprendre" ou "Terminer" avec stats de la tournée interrompue',
                    badge: "UI",
                  },
                  {
                    file: "components/TourDetailSheet.tsx",
                    desc: "Détail d\u2019une tournée passée : timeline des arrêts avec adresses et durées",
                    badge: "UI",
                  },
                  {
                    file: "lib/distance.ts",
                    desc: "Haversine (getDistanceInMeters/Km) + calculateDrivingDistance (Google Maps fallback)",
                    badge: "Util",
                  },
                  {
                    file: "lib/geocoding.ts",
                    desc: "reverseGeocode() avec cache mémoire + extractCityFromAddress()",
                    badge: "Util",
                  },
                  {
                    file: "types/trip.ts",
                    desc: "Interface TourStopData { id, timestamp, lat, lng, address?, city?, duration? }",
                    badge: "Type",
                  },
                ].map((f) => (
                  <div
                    key={f.file}
                    className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                  >
                    <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded shrink-0">
                      {f.file}
                    </code>
                    <span className="text-xs text-muted-foreground flex-1">{f.desc}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {f.badge}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conversion to Trip */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Conversion Tournée → Trajet
              </CardTitle>
              <CardDescription>handleConvertToTrips() dans Index.tsx</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-3">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{`1. Récupérer premier et dernier TourStop
2. Si stop.city manquant → reverseGeocode(lat, lng) via Google API
3. Calculer distance route via calculateDrivingDistance(start, end)
   └─ Fallback: distance Haversine si Google Maps indisponible
4. Filtrer si distance < 0.5 km (trajet trop court)
5. Créer Trip avec :
   ├─ startLocation / endLocation (nom = ville géocodée)
   ├─ distance = distance route (simple trajet, pas aller-retour)
   ├─ roundTrip = false
   ├─ purpose = "Tournée"
   ├─ tourStops = TourStopData[] (toutes les étapes intermédiaires)
   ├─ ikAmount = calculé via calculateIK(distance, annualKm, fiscalPower)
   └─ status = "validated"
6. Sauvegarder dans Supabase (table trips, colonne tour_stops = JSON)
7. Enregistrer dans localStorage "LAST_SAVED_TRIP" (notification "Dernier trajet enregistré")
8. Nettoyer localStorage tournée (clearTourStorage)`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ArchBox({
  icon,
  label,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 ${color}`}>
      {icon}
      <div className="text-left">
        <div className="font-semibold text-sm text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
