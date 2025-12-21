import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { VehicleForm } from '@/components/VehicleForm';
import { CalendarConnections } from '@/components/CalendarConnections';
import { FeedbackForm } from '@/components/FeedbackForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Car, Calendar, Settings, MessageSquare, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Vehicle } from '@/types/trip';

interface DesktopSidebarProps {
  vehicles: Vehicle[];
  onAddVehicle: (vehicleData: Omit<Vehicle, 'id'>) => void;
}

export const DesktopSidebar = ({ vehicles, onAddVehicle }: DesktopSidebarProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showVehicleForm, setShowVehicleForm] = useState(false);
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
      onClick: () => setShowVehicleForm(true) 
    },
    { 
      icon: Calendar, 
      label: 'Calendriers', 
      onClick: () => setShowCalendarSheet(true) 
    },
    { 
      icon: Settings, 
      label: 'Préférences', 
      onClick: () => navigate('/profile') 
    },
    { 
      icon: MessageSquare, 
      label: 'Avis', 
      onClick: () => setShowFeedbackSheet(true) 
    },
  ];

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-16 bg-card border-r border-border flex-col items-center py-6 hidden md:flex z-40">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">IK</span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              size="icon"
              className="w-12 h-12 rounded-xl hover:bg-accent"
              onClick={item.onClick}
              title={item.label}
            >
              <item.icon className="w-5 h-5 text-muted-foreground" />
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

      {/* Vehicle Form Sheet */}
      <VehicleForm
        open={showVehicleForm}
        onOpenChange={setShowVehicleForm}
        onSave={(vehicleData) => {
          onAddVehicle(vehicleData);
          setShowVehicleForm(false);
          toast.success("Véhicule ajouté");
        }}
      />

      {/* Calendar Sheet */}
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

      {/* Feedback Sheet */}
      <Sheet open={showFeedbackSheet} onOpenChange={setShowFeedbackSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Donnez votre avis</SheetTitle>
            <SheetDescription>
              Vos retours nous aident à améliorer l'application
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
