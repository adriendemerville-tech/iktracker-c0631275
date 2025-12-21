import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { CalendarConnections } from '@/components/CalendarConnections';
import { FeedbackForm } from '@/components/FeedbackForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Car, Calendar, Settings, MessageSquare, LogOut, Route, Sparkles } from 'lucide-react';
import { Vehicle } from '@/types/trip';

interface DesktopSidebarProps {
  vehicles: Vehicle[];
  onAddVehicle: (vehicleData: Omit<Vehicle, 'id'>) => void;
  onTourClick?: () => void;
  isTourActive?: boolean;
}

export const DesktopSidebar = ({ vehicles, onAddVehicle, onTourClick, isTourActive }: DesktopSidebarProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showVehicleSheet, setShowVehicleSheet] = useState(false);
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const [showFeedbackSheet, setShowFeedbackSheet] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const navItems = [
    { 
      icon: Car, 
      label: 'Véhicules', 
      onClick: () => navigate('/profile'),
      active: false,
    },
    { 
      icon: Calendar, 
      label: 'Calendriers', 
      onClick: () => setShowCalendarSheet(true),
      active: false,
    },
    { 
      icon: Route, 
      label: 'Mode tournée', 
      onClick: onTourClick,
      active: isTourActive,
    },
    { 
      icon: Settings, 
      label: 'Préférences', 
      onClick: () => navigate('/profile'),
      active: false,
    },
    { 
      icon: MessageSquare, 
      label: 'Aide & Avis', 
      onClick: () => setShowFeedbackSheet(true),
      active: false,
    },
  ];

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-16 bg-card border-r border-border flex-col items-center py-6 hidden md:flex z-40">
        {/* Logo - Landing page style */}
        <Link to="/" className="mb-8">
          <img 
            src="/iktracker-indemnites-kilometriques-logo.png" 
            alt="IKtracker" 
            width={40}
            height={40}
            className="h-10 w-10 transition-transform duration-300 hover:scale-110" 
          />
        </Link>

        {/* Recovery Button - Highlighted */}
        <Button
          className="w-12 h-12 rounded-xl bg-wizard-amber hover:bg-wizard-amber/90 text-slate-950 mb-4"
          onClick={() => navigate('/recovery')}
          title="Récupération Auto"
        >
          <Sparkles className="w-5 h-5" />
        </Button>

        {/* Navigation items */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              size="icon"
              className={`w-12 h-12 rounded-xl hover:bg-accent ${item.active ? 'bg-primary/10 text-primary' : ''}`}
              onClick={item.onClick}
              title={item.label}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'text-primary' : 'text-muted-foreground'}`} />
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
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </Button>
      </aside>

      {/* Calendar Sheet - opens from right */}
      <Sheet open={showCalendarSheet} onOpenChange={setShowCalendarSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
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
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Besoin d'aide ? Un avis ?</SheetTitle>
            <SheetDescription>
              Notre équipe vous répond rapidement. Vos retours nous aident à améliorer l'application.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <FeedbackForm />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
