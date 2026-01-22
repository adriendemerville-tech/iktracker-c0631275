import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Car, Calendar, Route, Settings, MessageSquare, FileText, Sparkles, Plus, Download, UserCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right';
  mobileOnly?: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // Left sidebar: top to bottom
  {
    id: 'vehicles',
    targetSelector: '[data-tutorial="vehicles"]',
    title: 'Mes véhicules',
    description: 'Configurez vos véhicules avec leur puissance fiscale pour un calcul précis des indemnités kilométriques.',
    icon: <Car className="w-5 h-5" />,
    position: 'right',
  },
  {
    id: 'calendar',
    targetSelector: '[data-tutorial="calendar"]',
    title: 'Synchronisation calendrier',
    description: 'Connectez Google Calendar ou Outlook pour importer automatiquement vos rendez-vous professionnels.',
    icon: <Calendar className="w-5 h-5" />,
    position: 'right',
  },
  {
    id: 'tour',
    targetSelector: '[data-tutorial="tour"]',
    title: 'Mode tournée',
    description: 'Activez le GPS pour enregistrer vos déplacements en temps réel lors de vos tournées. Idéal pour les infirmiers, artisans et commerciaux.',
    icon: <Route className="w-5 h-5" />,
    position: 'right',
    mobileOnly: true,
  },
  {
    id: 'settings',
    targetSelector: '[data-tutorial="settings"]',
    title: 'Mes préférences',
    description: 'Personnalisez les paramètres de détection des arrêts, la distance minimale et l\'email de votre expert-comptable.',
    icon: <Settings className="w-5 h-5" />,
    position: 'right',
  },
  {
    id: 'recovery',
    targetSelector: '[data-tutorial="recovery"]',
    title: 'Récupération Auto',
    description: 'Importez automatiquement vos trajets depuis l\'historique Google Maps pour récupérer vos indemnités passées.',
    icon: <Sparkles className="w-5 h-5" />,
    position: 'right',
  },
  {
    id: 'feedback',
    targetSelector: '[data-tutorial="feedback"]',
    title: 'Aide & Avis',
    description: 'Besoin d\'aide ? Une question ? Envoyez-nous votre avis et consultez les réponses de notre équipe.',
    icon: <MessageSquare className="w-5 h-5" />,
    position: 'right',
  },
  // Bottom bar: left to right (report, add-trip)
  {
    id: 'report',
    targetSelector: '[data-tutorial="report"]',
    title: 'Voir le relevé',
    description: 'Consultez votre relevé d\'indemnités kilométriques mensuel avec le détail de chaque trajet.',
    icon: <FileText className="w-5 h-5" />,
    position: 'top',
  },
  {
    id: 'add-trip',
    targetSelector: '[data-tutorial="add-trip"]',
    title: 'Ajouter un trajet',
    description: 'Créez manuellement un trajet avec le calcul automatique de la distance et des indemnités.',
    icon: <Plus className="w-5 h-5" />,
    position: 'top',
  },
  // Top right: profile, download
  {
    id: 'profile',
    targetSelector: '[data-tutorial="profile"]',
    title: 'Mon profil',
    description: 'Gérez votre compte, vos informations personnelles et vos paramètres de sécurité.',
    icon: <UserCircle className="w-5 h-5" />,
    position: 'bottom',
  },
  {
    id: 'download',
    targetSelector: '[data-tutorial="download"]',
    title: 'Télécharger le relevé',
    description: 'Exportez votre relevé au format PDF ou CSV pour votre déclaration fiscale ou votre comptable.',
    icon: <Download className="w-5 h-5" />,
    position: 'bottom',
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
  isVisible: boolean;
}

export const OnboardingTutorial = ({ onComplete, isVisible }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightPosition, setHighlightPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  const step = TUTORIAL_STEPS[currentStep];

  useEffect(() => {
    if (!isVisible || !step) return;

    const updatePosition = () => {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        
        setHighlightPosition({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        // Calculate tooltip position based on step.position
        let tooltipTop = rect.top;
        let tooltipLeft = rect.left;
        const tooltipWidth = 320;
        const tooltipHeight = 220; // Increased height to prevent overlapping buttons
        const gap = 16;

        switch (step.position) {
          case 'right':
            tooltipLeft = rect.right + gap;
            tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2;
            break;
          case 'left':
            tooltipLeft = rect.left - tooltipWidth - gap;
            tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2;
            break;
          case 'bottom':
            tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
            tooltipTop = rect.bottom + gap;
            break;
          case 'top':
            tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
            tooltipTop = rect.top - tooltipHeight - gap;
            break;
        }

        // Keep tooltip in viewport
        tooltipLeft = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, tooltipLeft));
        tooltipTop = Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, tooltipTop));

        setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [currentStep, step, isVisible]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('iktracker_tutorial_completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
      >
        {/* Overlay with cutout */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <defs>
            <mask id="tutorial-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {highlightPosition && (
                <rect
                  x={highlightPosition.left}
                  y={highlightPosition.top}
                  width={highlightPosition.width}
                  height={highlightPosition.height}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#tutorial-mask)"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          />
        </svg>

        {/* Highlight ring */}
        {highlightPosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute rounded-xl ring-4 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none"
            style={{
              top: highlightPosition.top,
              left: highlightPosition.left,
              width: highlightPosition.width,
              height: highlightPosition.height,
            }}
          />
        )}

        {/* Tooltip */}
        {tooltipPosition && step && (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[101]"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              width: 320,
            }}
          >
            <Card className="p-4 bg-card border-border shadow-xl">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  {step.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Étape {currentStep + 1} sur {TUTORIAL_STEPS.length}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSkip} className="h-8 w-8" aria-label="Fermer le tutoriel">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4">
                {step.description}
              </p>

              {/* Mobile only badge */}
              {step.mobileOnly && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                  <Smartphone className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-accent">Réservé à l'usage mobile</span>
                </div>
              )}

              {/* Progress bar */}
              <div className="w-full h-1 bg-muted rounded-full mb-4">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
                />
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="text-muted-foreground"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>

                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-primary text-primary-foreground"
                >
                  {currentStep === TUTORIAL_STEPS.length - 1 ? (
                    'Terminer'
                  ) : (
                    <>
                      Suivant
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// Hook re-exported from separate file to avoid bundling framer-motion when only using the hook
export { useTutorial } from '@/hooks/useTutorial';
