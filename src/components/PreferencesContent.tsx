import { useTheme } from '@/hooks/useTheme';
import { usePreferences } from '@/hooks/usePreferences';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Moon, Sun, Clock, Timer, MapPin, Route } from 'lucide-react';

export const PreferencesContent = () => {
  const { theme, toggleTheme } = useTheme();
  const { preferences, updatePreference } = usePreferences();

  return (
    <div className="space-y-5">
      {/* Dark Mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {theme === 'dark' ? (
            <Moon className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Sun className="w-5 h-5 text-muted-foreground" />
          )}
          <Label htmlFor="dark-mode-pref" className="cursor-pointer">
            Mode sombre
          </Label>
        </div>
        <Switch
          id="dark-mode-pref"
          checked={theme === 'dark'}
          onCheckedChange={toggleTheme}
        />
      </div>

      {/* Show Trip Time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <Label htmlFor="show-time-pref" className="cursor-pointer">
            Afficher l'heure des trajets
          </Label>
        </div>
        <Switch
          id="show-time-pref"
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
  );
};
