import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTrips } from '@/hooks/useTrips';
import { usePreferences } from '@/hooks/usePreferences';
import { useAdmin } from '@/hooks/useAdmin';
import { useFeedback } from '@/hooks/useFeedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, CreditCard, Receipt, Settings, Moon, Sun, Mail, LogOut, BarChart3, Clock, Timer, MapPin, Briefcase, Car, Plus, Shield, ChevronRight, Send, ChevronDown, Route } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { CalendarConnections } from '@/components/CalendarConnections';
import { FeedbackForm } from '@/components/FeedbackForm';
import { VehicleCard } from '@/components/VehicleCard';
import { VehicleForm } from '@/components/VehicleForm';
import { Vehicle } from '@/types/trip';

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
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { trips, vehicles, addVehicle, updateVehicle, deleteVehicle, getTotalAnnualKm } = useTrips();
  const { preferences, updatePreference } = usePreferences();
  const { isAdmin } = useAdmin();
  const { unreadResponsesCount } = useFeedback();
  
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [showPreferencesDropdown, setShowPreferencesDropdown] = useState(false);

  const monthlyKmData = useMemo(() => {
    const now = new Date();
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });
      months.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
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

  const handleDeleteVehicle = (vehicleId: string) => {
    deleteVehicle(vehicleId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Mon profil</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Account Info Button */}
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setShowAccountInfo(!showAccountInfo)}
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Informations et connexion</p>
                <p className="text-sm text-muted-foreground">{user?.email || 'Non connecté'}</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showAccountInfo ? 'rotate-90' : ''}`} />
          </CardContent>
        </Card>

        {/* Account Info Details (Collapsible) */}
        <div 
          className={`grid transition-all duration-300 ease-out ${showAccountInfo ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="overflow-hidden">
            <Card className="border-t-0 -mt-2 pt-0">
              <CardContent className="space-y-4 pt-4">
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
          </div>
        </div>

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
                <p className="text-sm text-muted-foreground">Personnaliser l'application</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showPreferencesDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`grid transition-all duration-300 ease-out ${showPreferencesDropdown ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="border-t border-border p-4 space-y-6">
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
                      ⚠️ Tous les trajets seront enregistrés
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Button - Shown at top when there are unread responses */}
        {user && unreadResponsesCount > 0 && <FeedbackForm hasNotification />}

        {/* Kilometers Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4" />
              Kilomètres parcourus
            </CardTitle>
            <CardDescription>
              Sur les 6 derniers mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyKmData} margin={{ left: 0, right: 0, bottom: 0, top: 10 }}>
                  <XAxis type="category" dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis type="number" hide />
                  <Bar dataKey="km" radius={[4, 4, 0, 0]}>
                    {monthlyKmData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(25, 95%, 53%)" />
                    ))}
                    <LabelList dataKey="km" position="insideTop" fill="white" fontSize={11} fontWeight={600} offset={4} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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
            <CardDescription>
              Gérez vos véhicules pour le calcul des IK
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-4 h-4" />
              Paiement
            </CardTitle>
            <CardDescription>
              Gérez vos moyens de paiement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun moyen de paiement enregistré</p>
              <Button variant="outline" size="sm" className="mt-3" disabled>
                Ajouter une carte
              </Button>
            </div>
            <div className="mt-4 flex justify-center">
              <span className="bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-medium px-4 py-1.5 rounded-md">
                Gratuit
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Invoices - Hidden while app is free */}


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

        {/* Logout Button */}
        {user && (
          <Button 
            variant="outline" 
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        )}

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground pt-4 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Link to="/terms" className="hover:underline hover:text-foreground transition-colors">
              CGU
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:underline hover:text-foreground transition-colors">
              Confidentialité
            </Link>
          </div>
          <p>Ik Tracker v1.0</p>
          <p>© 2024 - Tous droits réservés</p>
        </div>
      </main>
    </div>
  );
};

export default Profile;
