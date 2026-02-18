import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppAuth } from '@/App';
import { useTheme } from '@/hooks/useTheme';
import { useTrips } from '@/hooks/useTrips';
import { usePreferences } from '@/hooks/usePreferences';
import { useAdmin } from '@/hooks/useAdmin';
import { useFeedback } from '@/hooks/useFeedback';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, CreditCard, Receipt, Settings, Moon, Sun, Mail, LogOut, BarChart3, Clock, Timer, MapPin, Briefcase, Car, Plus, Shield, ChevronRight, Send, ChevronDown, Route, Download, Share2, UserCircle, Home, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { CalendarConnections } from '@/components/CalendarConnections';
import { FeedbackForm } from '@/components/FeedbackForm';
import { VehicleCard } from '@/components/VehicleCard';
import { VehicleForm } from '@/components/VehicleForm';
import { AddressCard } from '@/components/AddressCard';
import { AddressForm } from '@/components/AddressForm';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { Vehicle, Location } from '@/types/trip';

// Lazy load chart component to keep recharts out of initial bundle
const ProfileKmChart = lazy(() => import('@/components/charts/ProfileKmChart'));

// Chart loading placeholder
const ChartSkeleton = () => (
  <div className="h-48">
    <Skeleton className="w-full h-full rounded-lg" />
  </div>
);


const PROFESSIONS = [
  "Banque et assurance",
  "Indépendants",
  "Santé et médical",
  "Immobilier",
  "Bâtiment et entretiens",
  "Services à la personne",
  "Maintenance et SAV",
  "Commerce et distribution",
  "Audit et expertise comptable",
  "Événementiel et spectacle",
  "Transport et logistique",
  "Agriculture et agroalimentaire",
  "Conseil et stratégie",
  "Éducation et formation",
  "Environnement et énergie",
];

const Profile = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { handleLogout } = useAppAuth();
  const { theme, toggleTheme } = useTheme();
  const { trips, vehicles, savedLocations, addVehicle, updateVehicle, deleteVehicle, addLocation, updateLocation, deleteLocation, getTotalAnnualKm, loading: tripsLoading } = useTrips();
  const { preferences, updatePreference } = usePreferences();
  const { isAdmin } = useAdmin();
  const { unreadResponsesCount } = useFeedback();
  
  const totalKm = trips.reduce((sum, t) => sum + t.distance, 0);
  
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Location | null>(null);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [showPreferencesDropdown, setShowPreferencesDropdown] = useState(false);
  
  // User profile fields
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  
  // Load user metadata on mount
  useEffect(() => {
    if (user?.user_metadata) {
      setProfileFirstName(user.user_metadata.first_name || '');
      setProfileLastName(user.user_metadata.last_name || '');
    }
  }, [user]);
  
  // Save profile names
  const handleSaveProfileNames = async () => {
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: profileFirstName.trim() || undefined,
        last_name: profileLastName.trim() || undefined,
      }
    });
    if (!error) {
      toast.success('Profil mis à jour');
    }
  };

  const monthsToShow = isMobile ? 6 : 12;

  const monthlyKmData = useMemo(() => {
    const now = new Date();
    const months = [];
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });
      months.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1, 3),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        km: 0
      });
    }

    trips.forEach(trip => {
      const tripDate = new Date(trip.startTime);
      const tripMonth = tripDate.getMonth();
      const tripYear = tripDate.getFullYear();
      
      const monthData = months.find(m => m.monthIndex === tripMonth && m.year === tripYear);
      if (monthData) {
        monthData.km += trip.distance;
      }
    });

    return months.map(m => ({ month: m.month, km: Math.round(m.km) }));
  }, [trips]);

  // Calculate dynamic Y-axis max with minimum threshold for visual balance
  const chartMaxKm = useMemo(() => {
    const maxKm = Math.max(...monthlyKmData.map(d => d.km), 0);
    const minCeiling = 200; // Minimum ceiling to prevent bars from being too tall with small values
    const padding = 1.2; // 20% padding above max value
    return Math.max(Math.ceil(maxKm * padding / 50) * 50, minCeiling);
  }, [monthlyKmData]);

  // Calculate total stats for sharing
  const totalStats = useMemo(() => {
    const totalKm = Math.round(trips.reduce((sum, trip) => sum + trip.distance, 0));
    const totalIk = trips.reduce((sum, trip) => sum + trip.ikAmount, 0).toFixed(2);
    const tripCount = trips.length;
    return { totalKm, totalIk, tripCount };
  }, [trips]);

  const handleSignOut = async () => {
    await handleLogout();
  };

  const handleSaveVehicle = (vehicleData: Omit<Vehicle, 'id'>) => {
    if (editingVehicle) {
      updateVehicle(editingVehicle.id, vehicleData);
    } else {
      addVehicle(vehicleData);
    }
    setEditingVehicle(null);
    setVehicleFormOpen(false);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleFormOpen(true);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const result = await deleteVehicle(vehicleId);
    if (result.success) {
      toast.success("Véhicule supprimé");
    } else {
      toast.error(result.error || "Impossible de supprimer ce véhicule");
    }
  };

  return (
    <>
      <Helmet>
        <title>Mon profil | IKtracker</title>
        <meta name="description" content="Gérez votre profil IKtracker : véhicules, adresses favorites, préférences et paramètres de compte." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://iktracker.fr/profile" />
      </Helmet>
      {/* Desktop Sidebar - hidden on mobile */}
      {!isMobile && (
        <DesktopSidebar 
          vehicles={vehicles}
          onAddVehicle={addVehicle}
          onEditVehicle={updateVehicle}
          onDeleteVehicle={deleteVehicle}
          totalKm={totalKm}
        />
      )}

      <div className="min-h-screen bg-background cursor-default md:pl-16">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 py-4 h-[65px]">
          <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')} aria-label="Retour à l'accueil">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Mon profil</h1>
          </div>
        </header>

        <main className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Account Info Button */}
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => user ? setShowAccountInfo(!showAccountInfo) : navigate('/auth')}
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Informations et connexion</p>
                {!isMobile && (
                  <p className="text-sm text-muted-foreground">{user?.email || 'Non connecté'}</p>
                )}
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showAccountInfo ? 'rotate-90' : ''}`} />
          </CardContent>
        </Card>

        {/* Account Info Details (Collapsible) */}
        {showAccountInfo && (
          <Card className="border-t-0 rounded-t-none -mt-5">
              <CardContent className="space-y-4 pt-4">
                {/* First Name / Last Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      type="text"
                      placeholder="Prénom"
                      value={profileFirstName}
                      onChange={(e) => setProfileFirstName(e.target.value)}
                      onBlur={handleSaveProfileNames}
                      className="text-sm"
                    />
                    <Input
                      type="text"
                      placeholder="Nom"
                      value={profileLastName}
                      onChange={(e) => setProfileLastName(e.target.value)}
                      onBlur={handleSaveProfileNames}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user?.email || 'Non connecté'}</p>
                  </div>
                </div>
                
                {/* Profession Dropdown */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Profession (optionnel)</p>
                      <Select 
                        value={preferences.profession || ''} 
                        onValueChange={(value) => updatePreference('profession', value)}
                      >
                        <SelectTrigger className="w-full mt-1 bg-background border border-input">
                          <SelectValue placeholder="Sélectionnez votre secteur" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-input max-h-[200px]">
                          {PROFESSIONS.map((profession) => (
                            <SelectItem key={profession} value={profession}>
                              {profession}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Accountant Email */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Send className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Email du comptable</p>
                      <Input
                        type="email"
                        placeholder="comptable@exemple.fr"
                        value={preferences.accountantEmail || ''}
                        onChange={(e) => updatePreference('accountantEmail', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>


                {user && (
                  <Button variant="outline" className="w-full" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                  </Button>
                )}
                {!user && (
                  <Button className="w-full" onClick={() => navigate('/auth')}>
                    Se connecter
                  </Button>
                )}
              </CardContent>
            </Card>
        )}

        {/* Mes adresses */}
        <Card id="mes-adresses">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4" />
                Mes adresses
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => {
                  setEditingAddress(null);
                  setAddressFormOpen(true);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Ajouter
              </Button>
            </div>
            {!isMobile && (
              <CardDescription>
                Vos lieux pour le calcul automatique des distances
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="min-h-[120px]">
            {tripsLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              </div>
            ) : savedLocations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Home className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune adresse enregistrée</p>
                <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                  Ajoutez votre domicile pour que les trajets du calendrier soient calculés automatiquement
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedLocations.map((location) => (
                  <AddressCard
                    key={location.id}
                    location={{
                      id: location.id,
                      name: location.name,
                      address: location.address,
                      type: location.type as 'home' | 'office' | 'other',
                    }}
                    onEdit={() => {
                      setEditingAddress(location);
                      setAddressFormOpen(true);
                    }}
                    onDelete={() => {
                      deleteLocation(location.id);
                      toast.success("Adresse supprimée");
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AddressForm
          open={addressFormOpen}
          onOpenChange={setAddressFormOpen}
          editLocation={editingAddress ? {
            id: editingAddress.id,
            name: editingAddress.name,
            address: editingAddress.address,
            type: editingAddress.type as 'home' | 'office' | 'other',
            latitude: editingAddress.lat,
            longitude: editingAddress.lng,
          } : undefined}
          onSave={(locationData) => {
            if (editingAddress) {
              updateLocation(editingAddress.id, {
                name: locationData.name,
                address: locationData.address,
                type: locationData.type,
                lat: locationData.latitude,
                lng: locationData.longitude,
              });
              toast.success("Adresse mise à jour");
            } else {
              addLocation({
                name: locationData.name,
                address: locationData.address,
                type: locationData.type,
                lat: locationData.latitude,
                lng: locationData.longitude,
              });
              toast.success("Adresse ajoutée");
            }
            setEditingAddress(null);
          }}
        />

        {/* Preferences Dropdown */}
        <div className="bg-card rounded-md shadow-md overflow-hidden">
          <button
            onClick={() => setShowPreferencesDropdown(!showPreferencesDropdown)}
            className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Préférences</p>
                {!isMobile && (
                  <p className="text-sm text-muted-foreground">Personnaliser l'application</p>
                )}
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showPreferencesDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`grid transition-all duration-300 ease-out ${showPreferencesDropdown ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="border-t border-border p-4 space-y-5">
                {/* Dark Mode */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? (
                      <Moon className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Sun className="w-5 h-5 text-muted-foreground" />
                    )}
                    <Label htmlFor="dark-mode" className="cursor-pointer">
                      Mode sombre
                    </Label>
                  </div>
                  <Switch
                    id="dark-mode"
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                </div>

                {/* Show Trip Time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <Label htmlFor="show-time" className="cursor-pointer">
                      Afficher l'heure des trajets
                    </Label>
                  </div>
                  <Switch
                    id="show-time"
                    checked={preferences.showTripTime}
                    onCheckedChange={(checked) => updatePreference('showTripTime', checked)}
                  />
                </div>

                {/* Stop Detection Interval */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Timer className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Détection des étapes</Label>
                      <p className="text-xs text-muted-foreground">
                        Durée d'arrêt pour créer une étape
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-8">
                    <Slider
                      value={[preferences.stopDetectionMinutes]}
                      onValueChange={([value]) => updatePreference('stopDetectionMinutes', value)}
                      min={1}
                      max={15}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-16 text-right">
                      {preferences.stopDetectionMinutes} min
                    </span>
                  </div>
                </div>

                {/* Location Radius */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Rayon de détection</Label>
                      <p className="text-xs text-muted-foreground">
                        Distance pour considérer un même lieu
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-8">
                    <Slider
                      value={[preferences.locationRadiusMeters]}
                      onValueChange={([value]) => updatePreference('locationRadiusMeters', value)}
                      min={50}
                      max={300}
                      step={25}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-16 text-right">
                      {preferences.locationRadiusMeters} m
                    </span>
                  </div>
                </div>

                {/* Minimum Distance */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Route className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Distance minimum</Label>
                      <p className="text-xs text-muted-foreground">
                        Seuil pour enregistrer un trajet
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-8">
                    <Slider
                      value={[preferences.minDistanceKm]}
                      onValueChange={([value]) => updatePreference('minDistanceKm', value)}
                      min={0}
                      max={5}
                      step={0.5}
                      className={`flex-1 ${preferences.minDistanceKm === 0 ? '[&_span[role=slider]]:border-amber-500 [&_span[role=slider]]:bg-amber-500 [&_[data-radix-slider-range]]:bg-amber-500' : ''}`}
                    />
                    <span className="text-sm font-medium w-16 text-right">
                      {preferences.minDistanceKm} km
                    </span>
                  </div>
                  {preferences.minDistanceKm === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 pl-8">
                      Tous les trajets seront enregistrés
                    </p>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Feedback Button - Shown at top when there are unread responses */}
        {user && unreadResponsesCount > 0 && <FeedbackForm hasNotification />}

        {/* Calendar Connections */}
        <CalendarConnections />

        {/* Vehicles */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="w-4 h-4" />
                Mes véhicules
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => {
                  setEditingVehicle(null);
                  setVehicleFormOpen(true);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Ajouter
              </Button>
            </div>
            {!isMobile && (
              <CardDescription>
                Gérez vos véhicules pour le calcul des IK
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="min-h-[100px]">
            {tripsLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Car className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun véhicule enregistré</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    totalKm={getTotalAnnualKm(vehicle.id)}
                    selected={false}
                    onEdit={() => handleEditVehicle(vehicle)}
                    onDelete={() => handleDeleteVehicle(vehicle.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <VehicleForm
          open={vehicleFormOpen}
          onOpenChange={setVehicleFormOpen}
          onSave={handleSaveVehicle}
          editVehicle={editingVehicle || undefined}
        />

        {/* Kilometers Chart */}
        <Card className="relative">
          {/* Animated car - at header level, above December bar */}
          <div className="absolute top-4 right-[40px] flex flex-col items-center gap-0 z-10">
            {totalStats.totalKm === 0 ? (
              /* Sleeping car when 0 km */
              <div className="relative" style={{ filter: 'drop-shadow(0 0 4px hsl(220 70% 50% / 0.2))' }}>
                <Car className="w-8 h-8 text-primary/60 fill-transparent" strokeWidth={1.5} />
                {/* Static wheels */}
                <div className="absolute bottom-[4px] left-[4px] w-[7px] h-[7px] rounded-full border-[1.5px] border-primary/60" />
                <div className="absolute bottom-[4px] right-[4px] w-[7px] h-[7px] rounded-full border-[1.5px] border-primary/60" />
                {/* "Zz.." sleeping text inside car - lowered for better centering */}
                <span className="absolute top-[10px] left-1/2 -translate-x-1/2 text-[8px] font-bold text-primary select-none animate-zz-float">
                  Zz..
                </span>
                {/* Dot after the car (in front in driving direction) */}
                <div className="absolute bottom-[6px] -right-[6px] w-[4px] h-[4px] rounded-full bg-primary/60" />
              </div>
            ) : (
              /* Animated car when > 0 km */
              <div className="animate-car-bounce relative" style={{ filter: 'drop-shadow(0 0 4px hsl(220 70% 50% / 0.35))' }}>
                <Car className="w-8 h-8 text-primary fill-transparent" strokeWidth={1.5} />
                {/* Animated wheels overlay */}
                <div className="absolute bottom-[4px] left-[4px] w-[7px] h-[7px] rounded-full border-[1.5px] border-primary border-dashed animate-wheel-spin" />
                <div className="absolute bottom-[4px] right-[4px] w-[7px] h-[7px] rounded-full border-[1.5px] border-primary border-dashed animate-wheel-spin" />
              </div>
            )}
            {/* Road */}
            <div className="relative w-12 -mt-1.5">
              <div className={`w-full h-[2px] bg-muted-foreground/40 rounded-full ${totalStats.totalKm > 0 ? 'animate-road-wave' : ''}`} />
            </div>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4" />
              Kilomètres parcourus
            </CardTitle>
            {!isMobile && (
              <CardDescription>
                Sur les 12 derniers mois
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartSkeleton />}>
              <ProfileKmChart data={monthlyKmData} maxKm={chartMaxKm} />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-4 h-4" />
              Paiement
              <span className="bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-medium px-2 py-0.5 rounded-md ml-auto">
                Gratuit
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Invoices - Hidden while app is free */}


        {/* Download App Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={async () => {
            // Track click if user is logged in
            if (user) {
              try {
                await supabase.from('download_clicks').insert({ user_id: user.id });
              } catch (e) {
                console.warn('Failed to track download click:', e);
              }
            }
            navigate('/install');
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Télécharger l'application
        </Button>

        {/* Feedback Button - Normal position when no unread responses */}
        {user && unreadResponsesCount === 0 && <FeedbackForm />}

        {/* Admin Access */}
        {isAdmin && (
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors border-primary/20"
            onClick={() => navigate('/admin')}
          >
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Administration</p>
                  <p className="text-sm text-muted-foreground">Gérer les feedbacks et utilisateurs</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* Share Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={async () => {
            const shareText = totalStats.totalKm > 0 
              ? `J'ai parcouru ${totalStats.totalKm} km et récupéré ${totalStats.totalIk}€ d'indemnités avec IKtracker 🚗💰 Rejoins-moi !`
              : "Voici un outil gratuit pour suivre automatiquement tes indemnités kilométriques 🚗";
            
            // Log share event
            if (user) {
              try {
                await supabase.from('share_events').insert({
                  user_id: user.id,
                  total_km: totalStats.totalKm,
                  total_ik: parseFloat(totalStats.totalIk),
                });
              } catch (error) {
                console.error('Error logging share event:', error);
              }
            }
            
            const shareUrl = 'https://iktracker.fr';
            
            if (navigator.share) {
              try {
                await navigator.share({
                  title: 'IKtracker',
                  text: shareText,
                  url: shareUrl,
                });
              } catch (error) {
                // User cancelled or error
              }
            } else {
              // Fallback: copy to clipboard
              navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
              const { toast } = await import('@/components/ui/sonner');
              toast.success('Lien copié !');
            }
          }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Partager l'application
        </Button>

        {/* Login / Logout Button */}
        {user ? (
          <Button 
            variant="outline" 
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        ) : (
          <Button 
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            onClick={() => navigate('/auth')}
          >
            <LogOut className="w-4 h-4 mr-2 rotate-180" />
            Connexion
          </Button>
        )}

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground pt-2 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Link to="/terms" className="hover:underline hover:text-foreground transition-colors">
              CGU
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:underline hover:text-foreground transition-colors">
              Confidentialité
            </Link>
          </div>
          <p>IKtracker V3.2</p>
          <p>© 2024 - Tous droits réservés</p>
        </div>
      </main>
      </div>
    </>
  );
};

export default Profile;
