import { useTheme } from '@/hooks/useTheme';
import { usePreferences } from '@/hooks/usePreferences';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Moon, Sun, Clock, Timer, MapPin, Route, CalendarClock, Calculator } from 'lucide-react';

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

      {/* Calendar Import Mode */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-5 h-5 text-muted-foreground" />
          <div>
            <Label>Import calendrier</Label>
            <p className="text-xs text-muted-foreground">
              Comportement lors de la synchronisation
            </p>
          </div>
        </div>
        <RadioGroup
          value={preferences.calendarImportMode}
          onValueChange={(v) => updatePreference('calendarImportMode', v as 'individual' | 'tour')}
          className="pl-8 space-y-2"
        >
          <div className="flex items-start gap-2">
            <RadioGroupItem value="individual" id="cal-mode-individual" className="mt-1" />
            <Label htmlFor="cal-mode-individual" className="cursor-pointer font-normal leading-snug">
              <span className="block text-sm font-medium">Trajets individuels</span>
              <span className="block text-xs text-muted-foreground">
                Chaque événement devient un aller-retour depuis mon domicile
              </span>
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <RadioGroupItem value="tour" id="cal-mode-tour" className="mt-1" />
            <Label htmlFor="cal-mode-tour" className="cursor-pointer font-normal leading-snug">
              <span className="block text-sm font-medium">Tournée journalière</span>
              <span className="block text-xs text-muted-foreground">
                Tous mes rendez-vous d'une même journée sont regroupés : domicile → étapes → domicile
              </span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* IK rate override */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center gap-3">
          <Calculator className="w-5 h-5 text-muted-foreground" />
          <div>
            <Label>Taux d'indemnité kilométrique</Label>
            <p className="text-xs text-muted-foreground">
              Utile si vous vous remboursez chaque mois et souhaitez un taux stable
            </p>
          </div>
        </div>
        <RadioGroup
          value={preferences.ikRateOverride}
          onValueChange={(v) => updatePreference('ikRateOverride', v as 'auto' | 'tier2' | 'tier3')}
          className="pl-8 space-y-2"
        >
          <div className="flex items-start gap-2">
            <RadioGroupItem value="auto" id="ik-auto" className="mt-1" />
            <Label htmlFor="ik-auto" className="cursor-pointer font-normal leading-snug">
              <span className="block text-sm font-medium">Barème automatique (recommandé)</span>
              <span className="block text-xs text-muted-foreground">
                Le taux évolue selon le cumul annuel de kilomètres (jusqu'à 5 000, 5 001–20 000, au-delà)
              </span>
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <RadioGroupItem value="tier2" id="ik-tier2" className="mt-1" />
            <Label htmlFor="ik-tier2" className="cursor-pointer font-normal leading-snug">
              <span className="block text-sm font-medium">Forcer la tranche 5 001–20 000 km</span>
              <span className="block text-xs text-muted-foreground">
                Applique ce taux à tous les trajets, dès le 1er km
              </span>
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <RadioGroupItem value="tier3" id="ik-tier3" className="mt-1" />
            <Label htmlFor="ik-tier3" className="cursor-pointer font-normal leading-snug">
              <span className="block text-sm font-medium">Forcer la tranche &gt; 20 000 km</span>
              <span className="block text-xs text-muted-foreground">
                Pour les gros rouleurs qui dépassent 20 000 km chaque année
              </span>
            </Label>
          </div>
        </RadioGroup>
        <p className="pl-8 text-[11px] text-muted-foreground italic">
          Le changement ne recalcule pas les trajets déjà enregistrés. Les nouveaux trajets et exports utiliseront ce taux.
        </p>
      </div>
    </div>
  );
};
