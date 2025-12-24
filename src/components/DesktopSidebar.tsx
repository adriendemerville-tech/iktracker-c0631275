import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppAuth } from '@/App';
import { Button } from '@/components/ui/button';
import { CalendarConnections } from '@/components/CalendarConnections';
import { FeedbackForm } from '@/components/FeedbackForm';
import { VehicleCard } from '@/components/VehicleCard';
import { VehicleForm } from '@/components/VehicleForm';
import { PreferencesContent } from '@/components/PreferencesContent';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Car, Calendar, Settings, MessageSquare, LogOut, Route, Sparkles, HelpCircle, User, PlayCircle, Plus, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import founderImage from '@/assets/founder-adrien-optimized.webp';
import { Vehicle } from '@/types/trip';

// FAQ items
const FAQ_ITEMS = [
  {
    question: "Comment sont calculées mes indemnités kilométriques ?",
    answer: "Les indemnités sont calculées selon le barème fiscal officiel 2024, basé sur la puissance fiscale de votre véhicule et le nombre de kilomètres parcourus. Le calcul prend en compte les trois tranches : jusqu'à 5 000 km, de 5 001 à 20 000 km, et au-delà de 20 000 km. Un bonus de 20% est appliqué pour les véhicules électriques."
  },
  {
    question: "Comment synchroniser mon calendrier professionnel ?",
    answer: "Rendez-vous dans la section Calendriers (icône calendrier dans la barre latérale). Vous pouvez connecter Google Calendar ou Outlook pour importer automatiquement vos rendez-vous professionnels. L'application créera un trajet pour chaque événement avec une adresse détectée."
  },
  {
    question: "Comment récupérer mes trajets passés depuis Google Maps ?",
    answer: "Utilisez la fonction 'Récupération Auto' (icône étoile dorée dans la barre latérale). Exportez votre historique de positions depuis Google Takeout, puis importez le fichier JSON. L'application détectera automatiquement vos trajets professionnels et calculera les indemnités correspondantes."
  },
];

interface DesktopSidebarProps {
  vehicles?: Vehicle[];
  onAddVehicle?: (vehicleData: Omit<Vehicle, 'id'>) => void;
  onEditVehicle?: (vehicleId: string, vehicleData: Partial<Vehicle>) => void;
  onDeleteVehicle?: (vehicleId: string) => void;
  onTourClick?: () => void;
  isTourActive?: boolean;
  onStartTutorial?: () => void;
  totalKm?: number;
}

export const DesktopSidebar = ({ 
  vehicles = [], 
  onAddVehicle, 
  onEditVehicle,
  onDeleteVehicle,
  onTourClick, 
  isTourActive, 
  onStartTutorial,
  totalKm = 0,
}: DesktopSidebarProps) => {
  const navigate = useNavigate();
  const { handleLogout } = useAppAuth();
  const [showVehicleSheet, setShowVehicleSheet] = useState(false);
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const [showFeedbackSheet, setShowFeedbackSheet] = useState(false);
  const [showPreferencesSheet, setShowPreferencesSheet] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showTourMobileOnly, setShowTourMobileOnly] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  const handleSignOut = async () => {
    await handleLogout();
  };

  const handleEditVehicle = (vehicleId: string) => {
    setEditingVehicleId(vehicleId);
    setShowVehicleForm(true);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (onDeleteVehicle) {
      onDeleteVehicle(vehicleId);
    }
  };

  const handleVehicleFormSubmit = (vehicleData: Omit<Vehicle, 'id'>) => {
    if (editingVehicleId && onEditVehicle) {
      onEditVehicle(editingVehicleId, vehicleData);
    } else {
      onAddVehicle(vehicleData);
    }
    setShowVehicleForm(false);
    setEditingVehicleId(null);
  };

  const editingVehicle = editingVehicleId ? vehicles.find(v => v.id === editingVehicleId) : undefined;

  // Navigation items in order from top to bottom
  const navItems = [
    { 
      icon: Car, 
      label: 'Véhicules', 
      onClick: () => setShowVehicleSheet(true),
      active: false,
      tutorialId: 'vehicles',
      isRecovery: false,
    },
    { 
      icon: Calendar, 
      label: 'Calendriers', 
      onClick: () => setShowCalendarSheet(true),
      active: false,
      tutorialId: 'calendar',
      isRecovery: false,
    },
    { 
      icon: Route, 
      label: 'Mode tournée', 
      onClick: onTourClick || (() => setShowTourMobileOnly(true)),
      active: isTourActive,
      tutorialId: 'tour',
      isRecovery: false,
    },
    { 
      icon: Settings, 
      label: 'Préférences', 
      onClick: () => setShowPreferencesSheet(true),
      active: false,
      tutorialId: 'settings',
      isRecovery: false,
    },
    { 
      icon: Sparkles, 
      label: 'Récupération Auto', 
      onClick: () => navigate('/recovery'),
      active: false,
      tutorialId: 'recovery',
      isRecovery: true,
    },
    { 
      icon: MessageSquare, 
      label: 'Aide & Avis', 
      onClick: () => setShowFeedbackSheet(true),
      active: false,
      tutorialId: 'feedback',
      isRecovery: false,
    },
  ];

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-16 bg-card border-r border-border flex-col items-center py-6 hidden md:flex z-40">
        {/* Logo - clickable, links to app home */}
        <Link to="/app" className="mb-8" data-tutorial="home" title="Accueil">
          <img 
            src="/logo-iktracker-250.webp" 
            alt="IKtracker" 
            width={250}
            height={250}
            className="h-10 w-10 transition-transform duration-300 hover:scale-110" 
          />
        </Link>

        {/* Navigation items */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              size="icon"
              className={`w-12 h-12 rounded-xl transition-all duration-200 ${
                item.isRecovery 
                  ? 'hover:bg-wizard-amber/10 group' 
                  : item.active 
                    ? 'bg-primary/10 text-primary' 
                    : 'hover:bg-accent'
              }`}
              onClick={item.onClick}
              title={item.label}
              aria-label={item.label}
              data-tutorial={item.tutorialId}
            >
              <item.icon className={`w-5 h-5 transition-colors ${
                item.isRecovery 
                  ? 'text-wizard-amber group-hover:scale-110 transition-transform' 
                  : item.active 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
              }`} />
            </Button>
          ))}
        </nav>

        {/* Logout at bottom */}
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-xl hover:bg-destructive/10"
          onClick={handleSignOut}
          title="Déconnexion"
          aria-label="Se déconnecter"
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </Button>
      </aside>

      {/* Vehicle Sheet - opens from right */}
      <Sheet open={showVehicleSheet} onOpenChange={setShowVehicleSheet}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Mes véhicules</SheetTitle>
            <SheetDescription>
              Gérez vos véhicules pour le calcul des indemnités kilométriques
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {vehicles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun véhicule configuré</p>
                <p className="text-sm">Ajoutez votre premier véhicule pour commencer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    totalKm={totalKm}
                    onEdit={() => handleEditVehicle(vehicle.id)}
                    onDelete={() => handleDeleteVehicle(vehicle.id)}
                  />
                ))}
              </div>
            )}
            <Button
              onClick={() => {
                setEditingVehicleId(null);
                setShowVehicleForm(true);
              }}
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un véhicule
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Vehicle Form Sheet */}
      <VehicleForm
        open={showVehicleForm}
        onOpenChange={(open) => {
          setShowVehicleForm(open);
          if (!open) setEditingVehicleId(null);
        }}
        onSave={handleVehicleFormSubmit}
        editVehicle={editingVehicle}
      />

      {/* Calendar Sheet - opens from right */}
      <Sheet open={showCalendarSheet} onOpenChange={setShowCalendarSheet}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Connexions calendrier</SheetTitle>
            <SheetDescription>
              Synchronisez vos rendez-vous professionnels
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CalendarConnections />
          </div>
        </SheetContent>
      </Sheet>

      {/* Feedback Sheet - opens from right */}
      <Sheet open={showFeedbackSheet} onOpenChange={setShowFeedbackSheet}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Besoin d'aide ? Un avis ?</SheetTitle>
            <SheetDescription>
              Notre équipe vous répond rapidement. Vos retours nous aident à améliorer l'application.
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Tutorial restart button */}
            {onStartTutorial && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowFeedbackSheet(false);
                  onStartTutorial();
                }}
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Revoir le didacticiel de l'application
              </Button>
            )}

            {/* Feedback Form */}
            <div>
              <FeedbackForm />
            </div>

            <Separator />

            {/* FAQ Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                Questions fréquentes
              </h4>
              
              <Accordion type="single" collapsible className="w-full">
                {FAQ_ITEMS.map((item, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-sm text-left hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <Separator />

            {/* Founder testimonial */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">
                Pourquoi IKTracker est gratuit ?
              </h4>
              
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                <div className="flex gap-4">
                  <img 
                    src={founderImage} 
                    srcSet={`${founderImage} 1x, ${founderImage} 2x`}
                    sizes="60px"
                    alt="Adrien, fondateur d'IKTracker"
                    width={60}
                    height={60}
                    className="w-[60px] h-[60px] rounded-full object-cover border-2 border-primary/30 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground italic leading-relaxed">
                      "J'ai créé IKTracker parce que je perdais des heures à calculer mes indemnités kilométriques sur Excel. Aujourd'hui, je veux que chaque professionnel en déplacement puisse récupérer facilement ce qui lui est dû."
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Adrien</span>
                      <span className="text-xs text-muted-foreground">— Fondateur,{' '}
                        <a 
                          href="https://www.avenir-renovations.fr/actualite/nouvelle-ouverture-d-agence-avenir-renovations-a-saint-remy-de-provence-13/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Avenir Rénovations Saint-Rémy-de-Provence
                        </a>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preferences Sheet - opens from right */}
      <Sheet open={showPreferencesSheet} onOpenChange={setShowPreferencesSheet}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Préférences</SheetTitle>
            <SheetDescription>
              Personnalisez le comportement de l'application
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <PreferencesContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Tour Mobile Only Dialog */}
      <AlertDialog open={showTourMobileOnly} onOpenChange={setShowTourMobileOnly}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-2">
              <Smartphone className="w-7 h-7 text-accent" />
            </div>
            <AlertDialogTitle className="text-accent text-xl">Réservé à l'usage mobile</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Ouvrez iktracker.fr sur le navigateur de votre smartphone et téléchargez l'app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* QR Code */}
          <div className="flex justify-center py-4">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG 
                value="https://iktracker.fr/install" 
                size={140}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground -mt-2">
            Scannez ce QR code avec votre téléphone
          </p>
          
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel>Fermer</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
