import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, ExternalLink, Upload, MapPin, Check, Sparkles, ChevronRight, FileJson, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Demo data for testing
const DEMO_TRIPS = [
  { id: '1', date: '2024-03-15', destination: 'Chantier Résidence Les Oliviers', distance: 45, refund: 25.65, type: 'chantier' },
  { id: '2', date: '2024-03-14', destination: 'Fournisseur Point P', distance: 28, refund: 15.96, type: 'fournisseur' },
  { id: '3', date: '2024-03-13', destination: 'Chantier Maison Dupont', distance: 62, refund: 35.34, type: 'chantier' },
  { id: '4', date: '2024-03-12', destination: 'Réunion Client Paris', distance: 120, refund: 68.40, type: 'client' },
  { id: '5', date: '2024-03-11', destination: 'Chantier Appartement Martin', distance: 38, refund: 21.66, type: 'chantier' },
  { id: '6', date: '2024-03-10', destination: 'Fournisseur Leroy Merlin', distance: 15, refund: 8.55, type: 'fournisseur' },
  { id: '7', date: '2024-03-08', destination: 'Chantier Bureau Entreprise ABC', distance: 55, refund: 31.35, type: 'chantier' },
  { id: '8', date: '2024-03-07', destination: 'Visite technique Lyon', distance: 180, refund: 102.60, type: 'visite' },
];

const analysisMessages = [
  "Analyse des coordonnées GPS...",
  "Identification des zones de chantiers...",
  "Détection des trajets professionnels...",
  "Calcul du gain fiscal...",
  "Finalisation du rapport..."
];

export default function RecoveryWizard() {
  const [isDesktop, setIsDesktop] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessageIndex, setAnalysisMessageIndex] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [trips, setTrips] = useState<typeof DEMO_TRIPS>([]);
  const [selectedTrips, setSelectedTrips] = useState<Set<string>>(new Set());
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  // Check if desktop
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Analysis animation
  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setAnalysisMessageIndex(prev => (prev + 1) % analysisMessages.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    simulateAnalysis();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const simulateAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setTrips(DEMO_TRIPS);
      // Auto-select chantier and fournisseur trips
      const autoSelected = DEMO_TRIPS
        .filter(t => t.type === 'chantier' || t.type === 'fournisseur')
        .map(t => t.id);
      setSelectedTrips(new Set(autoSelected));
      setCurrentStep(3);
    }, 6000);
  };

  const handleDemoClick = () => {
    setCurrentStep(2);
    setTimeout(() => simulateAnalysis(), 500);
  };

  const toggleTripSelection = (tripId: string) => {
    setSelectedTrips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tripId)) {
        newSet.delete(tripId);
      } else {
        newSet.add(tripId);
      }
      return newSet;
    });
  };

  const totalGain = trips
    .filter(t => selectedTrips.has(t.id))
    .reduce((sum, t) => sum + t.refund, 0);

  // Mobile fallback
  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-wizard-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 bg-wizard-card border-wizard-border text-center">
          <Monitor className="w-16 h-16 mx-auto mb-6 text-wizard-amber" />
          <h2 className="text-xl font-semibold text-white mb-4">Version Ordinateur requise</h2>
          <p className="text-wizard-muted">
            Cette fonction avancée de traitement de fichiers est réservée à la version Ordinateur.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wizard-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-wizard-card border-r border-wizard-border flex flex-col p-4">
        <div className="flex items-center gap-3 mb-8">
          <img 
            src="/iktracker-indemnites-kilometriques-logo.png" 
            alt="IKtracker" 
            className="w-10 h-10"
          />
          <span className="text-white font-semibold text-lg">IK Tracker</span>
        </div>

        {/* Recovery Button - Highlighted */}
        <Button 
          className="w-full bg-wizard-amber hover:bg-wizard-amber/90 text-slate-950 font-semibold mb-6 h-12"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Récupération Auto
        </Button>

        {/* Step indicators */}
        <nav className="flex-1 space-y-2">
          {[
            { num: 1, label: 'Préparation' },
            { num: 2, label: 'Import' },
            { num: 3, label: 'Validation' },
          ].map((step) => (
            <div
              key={step.num}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                currentStep === step.num 
                  ? 'bg-wizard-amber/20 text-wizard-amber' 
                  : currentStep > step.num 
                    ? 'text-wizard-amber/60' 
                    : 'text-wizard-muted'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep > step.num 
                  ? 'bg-wizard-amber text-slate-950' 
                  : currentStep === step.num 
                    ? 'bg-wizard-amber/20 border border-wizard-amber text-wizard-amber' 
                    : 'bg-wizard-border text-wizard-muted'
              }`}>
                {currentStep > step.num ? <Check className="w-4 h-4" /> : step.num}
              </div>
              <span className="font-medium">{step.label}</span>
            </div>
          ))}
        </nav>

        <Button 
          variant="ghost" 
          className="text-wizard-muted hover:text-white mt-auto"
          onClick={() => window.history.back()}
        >
          Retour à l'application
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Preparation */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <h1 className="text-3xl font-bold text-white mb-2">
                Transformez votre historique Google en euros
              </h1>
              <p className="text-wizard-muted mb-8">
                Récupérez automatiquement vos trajets professionnels depuis Google Timeline
              </p>

              <Card className="bg-wizard-card border-wizard-border p-6 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Comment ça marche ?</h2>
                <ol className="space-y-4">
                  {[
                    "Ouvrez Google Takeout (bouton ci-dessous).",
                    "Sélectionnez uniquement 'Historique des positions'.",
                    "Validez l'export en JSON et attendez le mail de Google."
                  ].map((instruction, index) => (
                    <li key={index} className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-wizard-amber/20 text-wizard-amber flex items-center justify-center font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-gray-300 pt-1">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </Card>

              <div className="flex gap-4">
                <Button 
                  size="lg"
                  className="bg-wizard-amber hover:bg-wizard-amber/90 text-slate-950 font-semibold h-14 px-8"
                  onClick={() => window.open('https://takeout.google.com/settings/takeout', '_blank')}
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Ouvrir Google Takeout
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="border-wizard-border text-white hover:bg-wizard-border/50 h-14"
                  onClick={() => setCurrentStep(2)}
                >
                  J'ai déjà mon fichier
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Smart Import */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <h1 className="text-3xl font-bold text-white mb-2">
                Import intelligent
              </h1>
              <p className="text-wizard-muted mb-8">
                Déposez votre fichier JSON exporté depuis Google Takeout
              </p>

              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  relative border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer
                  ${isDragOver 
                    ? 'border-wizard-amber bg-wizard-amber/10' 
                    : 'border-wizard-border hover:border-wizard-amber/50 hover:bg-wizard-card'
                  }
                  ${isAnalyzing ? 'pointer-events-none' : ''}
                `}
              >
                {isAnalyzing ? (
                  <div className="space-y-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-wizard-amber/20 flex items-center justify-center animate-pulse">
                      <FileJson className="w-8 h-8 text-wizard-amber" />
                    </div>
                    <motion.p 
                      key={analysisMessageIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-wizard-amber font-medium"
                    >
                      {analysisMessages[analysisMessageIndex]}
                    </motion.p>
                    <div className="w-48 h-1 mx-auto bg-wizard-border rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-wizard-amber"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 6, ease: 'linear' }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragOver ? 'text-wizard-amber' : 'text-wizard-muted'}`} />
                    <p className="text-lg text-white mb-2">
                      Glissez-déposez votre fichier ici
                    </p>
                    <p className="text-wizard-muted text-sm">
                      ou cliquez pour sélectionner un fichier JSON
                    </p>
                  </>
                )}
              </div>

              {!isAnalyzing && (
                <p className="text-center mt-6">
                  <button 
                    onClick={handleDemoClick}
                    className="text-wizard-amber hover:underline text-sm"
                  >
                    Tester avec des données de démonstration
                  </button>
                </p>
              )}
            </motion.div>
          )}

          {/* Step 3: Validation (ROI Screen) */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex gap-6 h-[calc(100vh-8rem)]"
            >
              {/* Left: Table */}
              <div className="flex-1 flex flex-col min-w-0">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Trajets détectés
                </h1>
                <p className="text-wizard-muted mb-6">
                  Sélectionnez les trajets à importer dans votre relevé
                </p>

                {/* Hero Card */}
                <Card className="bg-gradient-to-r from-wizard-amber/20 to-wizard-amber/5 border-wizard-amber/30 p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-wizard-muted text-sm mb-1">Gain Potentiel</p>
                      <p className="text-4xl font-bold text-wizard-amber">
                        {totalGain.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-wizard-muted text-sm mb-1">Trajets sélectionnés</p>
                      <p className="text-2xl font-semibold text-white">
                        {selectedTrips.size} / {trips.length}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Smart filter info */}
                <div className="flex items-center gap-2 mb-4 text-sm text-wizard-muted">
                  <AlertCircle className="w-4 h-4 text-wizard-amber" />
                  <span>Les trajets vers <span className="text-wizard-amber">Chantiers</span> et <span className="text-wizard-amber">Fournisseurs</span> sont présélectionnés automatiquement</span>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto rounded-lg border border-wizard-border">
                  <Table>
                    <TableHeader className="bg-wizard-card sticky top-0">
                      <TableRow className="border-wizard-border hover:bg-transparent">
                        <TableHead className="w-12 text-wizard-muted"></TableHead>
                        <TableHead className="text-wizard-muted">Date</TableHead>
                        <TableHead className="text-wizard-muted">Destination</TableHead>
                        <TableHead className="text-wizard-muted text-right">Distance</TableHead>
                        <TableHead className="text-wizard-muted text-right">Indemnité</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trips.map((trip) => (
                        <TableRow 
                          key={trip.id}
                          className={`
                            border-wizard-border cursor-pointer transition-colors
                            ${selectedTrips.has(trip.id) ? 'bg-wizard-amber/10' : 'hover:bg-wizard-border/30'}
                            ${selectedPreview === trip.id ? 'ring-1 ring-wizard-amber' : ''}
                          `}
                          onClick={() => setSelectedPreview(trip.id)}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedTrips.has(trip.id)}
                              onCheckedChange={() => toggleTripSelection(trip.id)}
                              className="border-wizard-border data-[state=checked]:bg-wizard-amber data-[state=checked]:border-wizard-amber"
                            />
                          </TableCell>
                          <TableCell className="text-gray-300 font-mono text-sm">
                            {new Date(trip.date).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className={`w-4 h-4 flex-shrink-0 ${
                                trip.type === 'chantier' || trip.type === 'fournisseur' 
                                  ? 'text-wizard-amber' 
                                  : 'text-wizard-muted'
                              }`} />
                              <span className="text-white truncate">{trip.destination}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300 text-right font-mono">
                            {trip.distance} km
                          </TableCell>
                          <TableCell className="text-wizard-amber text-right font-mono font-semibold">
                            {trip.refund.toFixed(2)} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Right: Map Preview */}
              <div className="w-80 flex-shrink-0">
                <Card className="h-full bg-wizard-card border-wizard-border p-4 flex flex-col">
                  <h3 className="text-white font-semibold mb-4">Aperçu du trajet</h3>
                  <div className="flex-1 bg-wizard-border/50 rounded-lg flex items-center justify-center">
                    {selectedPreview ? (
                      <div className="text-center p-4">
                        <MapPin className="w-12 h-12 mx-auto mb-3 text-wizard-amber" />
                        <p className="text-white font-medium mb-1">
                          {trips.find(t => t.id === selectedPreview)?.destination}
                        </p>
                        <p className="text-wizard-muted text-sm">
                          {trips.find(t => t.id === selectedPreview)?.distance} km
                        </p>
                      </div>
                    ) : (
                      <p className="text-wizard-muted text-sm">
                        Sélectionnez un trajet
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fixed Footer CTA */}
      {currentStep === 3 && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-64 right-0 bg-wizard-card border-t border-wizard-border p-4"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-wizard-muted text-sm">
                {selectedTrips.size} trajets sélectionnés
              </p>
              <p className="text-white font-semibold">
                Total : <span className="text-wizard-amber">{totalGain.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </p>
            </div>
            <Button 
              size="lg"
              className="bg-wizard-amber hover:bg-wizard-amber/90 text-slate-950 font-semibold h-12 px-8"
              disabled={selectedTrips.size === 0}
            >
              <Check className="w-5 h-5 mr-2" />
              Confirmer l'importation
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
