import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, ExternalLink, Upload, MapPin, Check, Sparkles, ChevronRight, FileJson, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface DetectedTrip {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  startLocation: { lat: number; lng: number; address?: string };
  endLocation: { lat: number; lng: number; address?: string };
  distance: number;
  duration: number;
  refund: number;
  type: 'chantier' | 'fournisseur' | 'client' | 'visite' | 'other';
}

interface ParseSummary {
  totalTrips: number;
  totalDistance: number;
  totalRefund: number;
  dateRange: { start: string; end: string };
}

// Demo data for testing
const DEMO_TRIPS: DetectedTrip[] = [
  { id: '1', date: '2024-03-15', startTime: '2024-03-15T08:00:00Z', endTime: '2024-03-15T08:45:00Z', startLocation: { lat: 48.8566, lng: 2.3522, address: '15 Rue de la Paix, Paris' }, endLocation: { lat: 48.9002, lng: 2.2945, address: 'Chantier Résidence Les Oliviers, Saint-Denis' }, distance: 45, duration: 45, refund: 27.14, type: 'chantier' },
  { id: '2', date: '2024-03-14', startTime: '2024-03-14T10:00:00Z', endTime: '2024-03-14T10:30:00Z', startLocation: { lat: 48.8566, lng: 2.3522, address: '15 Rue de la Paix, Paris' }, endLocation: { lat: 48.8234, lng: 2.4123, address: 'Point P, Vincennes' }, distance: 28, duration: 30, refund: 16.88, type: 'fournisseur' },
  { id: '3', date: '2024-03-13', startTime: '2024-03-13T07:30:00Z', endTime: '2024-03-13T08:30:00Z', startLocation: { lat: 48.8566, lng: 2.3522, address: '15 Rue de la Paix, Paris' }, endLocation: { lat: 48.7890, lng: 2.1234, address: 'Chantier Maison Dupont, Versailles' }, distance: 62, duration: 60, refund: 37.39, type: 'chantier' },
  { id: '4', date: '2024-03-12', startTime: '2024-03-12T09:00:00Z', endTime: '2024-03-12T11:00:00Z', startLocation: { lat: 48.8566, lng: 2.3522, address: '15 Rue de la Paix, Paris' }, endLocation: { lat: 48.9123, lng: 2.5678, address: 'Réunion Client, Bobigny' }, distance: 120, duration: 120, refund: 72.36, type: 'client' },
  { id: '5', date: '2024-03-11', startTime: '2024-03-11T14:00:00Z', endTime: '2024-03-11T14:40:00Z', startLocation: { lat: 48.8566, lng: 2.3522, address: '15 Rue de la Paix, Paris' }, endLocation: { lat: 48.8345, lng: 2.2890, address: 'Chantier Appartement Martin, Boulogne' }, distance: 38, duration: 40, refund: 22.91, type: 'chantier' },
  { id: '6', date: '2024-03-10', startTime: '2024-03-10T11:00:00Z', endTime: '2024-03-10T11:20:00Z', startLocation: { lat: 48.8566, lng: 2.3522, address: '15 Rue de la Paix, Paris' }, endLocation: { lat: 48.8612, lng: 2.3789, address: 'Leroy Merlin, République' }, distance: 15, duration: 20, refund: 9.05, type: 'fournisseur' },
  { id: '7', date: '2024-03-08', startTime: '2024-03-08T08:00:00Z', endTime: '2024-03-08T08:55:00Z', startLocation: { lat: 48.8566, lng: 2.3522, address: '15 Rue de la Paix, Paris' }, endLocation: { lat: 48.7654, lng: 2.4321, address: 'Chantier Bureau Entreprise ABC, Créteil' }, distance: 55, duration: 55, refund: 33.17, type: 'chantier' },
  { id: '8', date: '2024-03-07', startTime: '2024-03-07T06:00:00Z', endTime: '2024-03-07T09:00:00Z', startLocation: { lat: 48.8566, lng: 2.3522, address: '15 Rue de la Paix, Paris' }, endLocation: { lat: 45.7640, lng: 4.8357, address: 'Visite technique, Lyon' }, distance: 180, duration: 180, refund: 108.54, type: 'visite' },
];

const analysisMessages = [
  "Lecture du fichier JSON...",
  "Analyse des coordonnées GPS...",
  "Détection des trajets...",
  "Géocodage des adresses...",
  "Identification des zones de chantiers...",
  "Calcul du gain fiscal...",
];

export default function RecoveryWizard() {
  const [isDesktop, setIsDesktop] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessageIndex, setAnalysisMessageIndex] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [trips, setTrips] = useState<DetectedTrip[]>([]);
  const [summary, setSummary] = useState<ParseSummary | null>(null);
  const [selectedTrips, setSelectedTrips] = useState<Set<string>>(new Set());
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const parseFile = async (file: File) => {
    setIsAnalyzing(true);
    setParseError(null);
    setCurrentStep(2);

    try {
      // Read file content
      const text = await file.text();
      let jsonData;
      
      try {
        jsonData = JSON.parse(text);
      } catch {
        throw new Error('Le fichier n\'est pas un JSON valide. Assurez-vous d\'utiliser le fichier exporté depuis Google Takeout.');
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Vous devez être connecté pour utiliser cette fonctionnalité.');
      }

      // Call edge function to parse
      const { data, error } = await supabase.functions.invoke('parse-takeout', {
        body: {
          action: 'parse',
          jsonData,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de l\'analyse du fichier');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Set trips and summary
      setTrips(data.trips);
      setSummary(data.summary);
      
      // Auto-select chantier and fournisseur trips
      const autoSelected = data.trips
        .filter((t: DetectedTrip) => t.type === 'chantier' || t.type === 'fournisseur')
        .map((t: DetectedTrip) => t.id);
      setSelectedTrips(new Set(autoSelected));
      
      setCurrentStep(3);
      
      toast({
        title: "Analyse terminée",
        description: `${data.trips.length} trajets détectés pour un gain potentiel de ${data.summary.totalRefund.toFixed(2)} €`,
      });

    } catch (error) {
      console.error('Parse error:', error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setParseError(message);
      toast({
        title: "Erreur d'analyse",
        description: message,
        variant: "destructive",
      });
      setCurrentStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      parseFile(file);
    } else {
      toast({
        title: "Format invalide",
        description: "Veuillez déposer un fichier JSON exporté depuis Google Takeout.",
        variant: "destructive",
      });
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDemoClick = () => {
    setIsAnalyzing(true);
    setParseError(null);
    setCurrentStep(2);
    
    setTimeout(() => {
      setTrips(DEMO_TRIPS);
      setSummary({
        totalTrips: DEMO_TRIPS.length,
        totalDistance: DEMO_TRIPS.reduce((sum, t) => sum + t.distance, 0),
        totalRefund: DEMO_TRIPS.reduce((sum, t) => sum + t.refund, 0),
        dateRange: { start: '2024-03-07', end: '2024-03-15' },
      });
      const autoSelected = DEMO_TRIPS
        .filter(t => t.type === 'chantier' || t.type === 'fournisseur')
        .map(t => t.id);
      setSelectedTrips(new Set(autoSelected));
      setIsAnalyzing(false);
      setCurrentStep(3);
    }, 4000);
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

  const handleImport = async () => {
    if (selectedTrips.size === 0) return;
    
    setIsImporting(true);
    
    try {
      const tripsToImport = trips.filter(t => selectedTrips.has(t.id));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Vous devez être connecté pour importer les trajets.');
      }

      const { data, error } = await supabase.functions.invoke('parse-takeout', {
        body: {
          action: 'import',
          trips: tripsToImport,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de l\'importation');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Importation réussie !",
        description: `${data.importedCount} trajets importés pour un total de ${data.totalRefund.toFixed(2)} €`,
      });

      // Navigate to report page
      navigate('/report');

    } catch (error) {
      console.error('Import error:', error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      toast({
        title: "Erreur d'importation",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileSelect}
        className="hidden"
      />

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
          onClick={() => navigate('/app')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
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
                    "Sélectionnez uniquement 'Historique des positions' (Location History).",
                    "Choisissez le format JSON et validez l'export.",
                    "Attendez le mail de Google puis téléchargez l'archive.",
                    "Décompressez l'archive et importez le fichier JSON ici."
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
                  onClick={() => window.open('https://takeout.google.com/settings/takeout/custom/location_history', '_blank')}
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

              {/* Error message */}
              {parseError && (
                <Card className="bg-red-500/10 border-red-500/30 p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-medium">Erreur d'analyse</p>
                      <p className="text-red-300 text-sm mt-1">{parseError}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
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
                    <div className="w-16 h-16 mx-auto rounded-full bg-wizard-amber/20 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-wizard-amber animate-spin" />
                    </div>
                    <motion.p 
                      key={analysisMessageIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-wizard-amber font-medium"
                    >
                      {analysisMessages[analysisMessageIndex]}
                    </motion.p>
                    <p className="text-wizard-muted text-sm">
                      Cette opération peut prendre quelques minutes selon la taille de votre historique...
                    </p>
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
                    <p className="text-wizard-muted text-xs mt-4">
                      Fichiers acceptés : Records.json, Location History.json, Semantic Location History/*.json
                    </p>
                  </>
                )}
              </div>

              {!isAnalyzing && (
                <div className="flex items-center justify-between mt-6">
                  <Button 
                    variant="ghost"
                    className="text-wizard-muted hover:text-white"
                    onClick={() => setCurrentStep(1)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour
                  </Button>
                  <button 
                    onClick={handleDemoClick}
                    className="text-wizard-amber hover:underline text-sm"
                  >
                    Tester avec des données de démonstration
                  </button>
                </div>
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
                  Vérifiez et sélectionnez les trajets à importer dans votre relevé
                  {summary && (
                    <span className="text-wizard-amber ml-2">
                      ({summary.dateRange.start} → {summary.dateRange.end})
                    </span>
                  )}
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
                              <span className="text-white truncate max-w-[300px]">
                                {trip.endLocation.address || `${trip.endLocation.lat.toFixed(4)}, ${trip.endLocation.lng.toFixed(4)}`}
                              </span>
                              {(trip.type === 'chantier' || trip.type === 'fournisseur') && (
                                <span className="text-xs bg-wizard-amber/20 text-wizard-amber px-2 py-0.5 rounded">
                                  {trip.type === 'chantier' ? 'Chantier' : 'Fournisseur'}
                                </span>
                              )}
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

              {/* Right: Preview */}
              <div className="w-80 flex-shrink-0">
                <Card className="h-full bg-wizard-card border-wizard-border p-4 flex flex-col">
                  <h3 className="text-white font-semibold mb-4">Détails du trajet</h3>
                  <div className="flex-1 bg-wizard-border/50 rounded-lg flex items-center justify-center">
                    {selectedPreview ? (
                      <div className="text-center p-4 w-full">
                        <MapPin className="w-12 h-12 mx-auto mb-3 text-wizard-amber" />
                        <p className="text-white font-medium mb-1 text-sm">
                          {trips.find(t => t.id === selectedPreview)?.endLocation.address}
                        </p>
                        <div className="mt-4 space-y-2 text-left">
                          <div className="flex justify-between text-sm">
                            <span className="text-wizard-muted">Distance</span>
                            <span className="text-white font-mono">
                              {trips.find(t => t.id === selectedPreview)?.distance} km
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-wizard-muted">Durée</span>
                            <span className="text-white font-mono">
                              {trips.find(t => t.id === selectedPreview)?.duration} min
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-wizard-muted">Date</span>
                            <span className="text-white">
                              {new Date(trips.find(t => t.id === selectedPreview)?.date || '').toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-wizard-border">
                            <span className="text-wizard-muted">Indemnité</span>
                            <span className="text-wizard-amber font-semibold">
                              {trips.find(t => t.id === selectedPreview)?.refund.toFixed(2)} €
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-wizard-border">
                          <p className="text-wizard-muted text-xs">Départ</p>
                          <p className="text-gray-300 text-xs mt-1">
                            {trips.find(t => t.id === selectedPreview)?.startLocation.address}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-wizard-muted text-sm">
                        Sélectionnez un trajet pour voir les détails
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
            <div className="flex gap-4">
              <Button 
                variant="outline"
                className="border-wizard-border text-white hover:bg-wizard-border/50"
                onClick={() => setCurrentStep(2)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button 
                size="lg"
                className="bg-wizard-amber hover:bg-wizard-amber/90 text-slate-950 font-semibold h-12 px-8"
                disabled={selectedTrips.size === 0 || isImporting}
                onClick={handleImport}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Importation...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Confirmer l'importation
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
