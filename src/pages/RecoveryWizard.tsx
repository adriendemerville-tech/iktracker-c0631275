import { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, ExternalLink, Upload, MapPin, Check, Sparkles, ChevronRight, FileArchive, AlertCircle, ArrowLeft, Loader2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import JSZip from 'jszip';
import pako from 'pako';

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

const decompressionMessages = [
  "Décompression de l'archive Google Takeout...",
  "Extraction des fichiers...",
  "Recherche des données de localisation...",
];

const analysisMessages = [
  "Lecture du fichier Records.json...",
  "Analyse des coordonnées GPS...",
  "Détection des trajets professionnels...",
  "Calcul des distances fiscales...",
  "Géocodage des adresses...",
  "Finalisation du rapport...",
];

export default function RecoveryWizard() {
  const [isDesktop, setIsDesktop] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
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

  // Check if desktop (1024px threshold)
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Message rotation during extraction
  useEffect(() => {
    if (isExtracting) {
      let idx = 0;
      setCurrentMessage(decompressionMessages[0]);
      const interval = setInterval(() => {
        idx = (idx + 1) % decompressionMessages.length;
        setCurrentMessage(decompressionMessages[idx]);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isExtracting]);

  // Message rotation during analysis
  useEffect(() => {
    if (isAnalyzing) {
      let idx = 0;
      setCurrentMessage(analysisMessages[0]);
      const interval = setInterval(() => {
        idx = (idx + 1) % analysisMessages.length;
        setCurrentMessage(analysisMessages[idx]);
      }, 1800);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const findJsonInZip = async (zip: JSZip): Promise<string | null> => {
    // Look for common Google Takeout location history files
    const possiblePaths = [
      'Takeout/Location History/Records.json',
      'Takeout/Location History (Timeline)/Records.json',
      'Location History/Records.json',
      'Records.json',
      'Takeout/Historique des positions/Records.json',
      'Takeout/Historique des positions (Timeline)/Records.json',
    ];

    // First, try exact paths
    for (const path of possiblePaths) {
      const file = zip.file(path);
      if (file) {
        return await file.async('string');
      }
    }

    // Then search for any Records.json or Location History.json
    const files = Object.keys(zip.files);
    for (const filename of files) {
      if (filename.endsWith('Records.json') || filename.endsWith('Location History.json')) {
        const file = zip.file(filename);
        if (file && !file.dir) {
          return await file.async('string');
        }
      }
    }

    // Look for any JSON file in Location History folders
    for (const filename of files) {
      if ((filename.includes('Location History') || filename.includes('Historique des positions')) && filename.endsWith('.json')) {
        const file = zip.file(filename);
        if (file && !file.dir) {
          return await file.async('string');
        }
      }
    }

    return null;
  };

  // Parse TAR format (simple implementation for Google Takeout)
  const parseTar = (buffer: Uint8Array): Map<string, Uint8Array> => {
    const files = new Map<string, Uint8Array>();
    let offset = 0;

    while (offset < buffer.length - 512) {
      // Read header (512 bytes)
      const header = buffer.slice(offset, offset + 512);
      
      // Check for empty block (end of archive)
      if (header.every(b => b === 0)) break;

      // Extract filename (first 100 bytes, null-terminated)
      let nameEnd = 0;
      while (nameEnd < 100 && header[nameEnd] !== 0) nameEnd++;
      const name = new TextDecoder().decode(header.slice(0, nameEnd));

      // Extract file size (bytes 124-135, octal)
      const sizeStr = new TextDecoder().decode(header.slice(124, 135)).trim();
      const size = parseInt(sizeStr, 8) || 0;

      // Skip to file content
      offset += 512;

      if (size > 0 && name) {
        const content = buffer.slice(offset, offset + size);
        files.set(name, content);
      }

      // Move to next file (512-byte aligned)
      offset += Math.ceil(size / 512) * 512;
    }

    return files;
  };

  // Find JSON in TAR files
  const findJsonInTar = (tarFiles: Map<string, Uint8Array>): string | null => {
    const possibleNames = [
      'Records.json',
      'Location History.json',
    ];

    for (const [filename, content] of tarFiles) {
      // Check if this is a JSON file we're looking for
      const isLocationHistory = filename.includes('Location History') || 
                                 filename.includes('Historique des positions');
      const isRecordsJson = possibleNames.some(name => filename.endsWith(name));
      
      if (isLocationHistory && filename.endsWith('.json') || isRecordsJson) {
        try {
          return new TextDecoder().decode(content);
        } catch {
          continue;
        }
      }
    }

    return null;
  };

  // Decompress TGZ and extract JSON
  const processTgzFile = async (file: File): Promise<string | null> => {
    const arrayBuffer = await file.arrayBuffer();
    const compressed = new Uint8Array(arrayBuffer);
    
    // Decompress gzip
    const decompressed = pako.ungzip(compressed);
    
    // Parse tar
    const tarFiles = parseTar(decompressed);
    
    // Find JSON
    return findJsonInTar(tarFiles);
  };

  const processArchiveFile = async (file: File) => {
    setIsExtracting(true);
    setParseError(null);
    setCurrentStep(2);
    setExtractProgress(0);

    const isTgz = file.name.endsWith('.tgz') || file.name.endsWith('.tar.gz');

    try {
      let jsonContent: string | null = null;

      if (isTgz) {
        // Process TGZ file
        setExtractProgress(20);
        jsonContent = await processTgzFile(file);
        setExtractProgress(80);
      } else {
        // Process ZIP file
        const arrayBuffer = await file.arrayBuffer();
        setExtractProgress(20);

        const zip = await JSZip.loadAsync(arrayBuffer);
        setExtractProgress(50);

        jsonContent = await findJsonInZip(zip);
        setExtractProgress(80);
      }

      if (!jsonContent) {
        throw new Error('Aucun fichier de localisation trouvé dans l\'archive. Assurez-vous d\'avoir exporté "Historique des positions" depuis Google Takeout.');
      }

      setExtractProgress(100);
      setIsExtracting(false);
      setIsAnalyzing(true);

      // Parse the JSON
      let jsonData;
      try {
        jsonData = JSON.parse(jsonContent);
      } catch {
        throw new Error('Le fichier JSON est corrompu ou mal formaté.');
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
      console.error('ZIP processing error:', error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setParseError(message);
      toast({
        title: "Erreur de traitement",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
      setIsAnalyzing(false);
    }
  };

  const isValidArchive = (file: File): boolean => {
    const name = file.name.toLowerCase();
    return name.endsWith('.zip') || 
           name.endsWith('.tgz') || 
           name.endsWith('.tar.gz') ||
           file.type === 'application/zip' || 
           file.type === 'application/x-zip-compressed' ||
           file.type === 'application/gzip' ||
           file.type === 'application/x-gzip' ||
           file.type === 'application/x-tar';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      if (isValidArchive(file)) {
        processArchiveFile(file);
      } else {
        toast({
          title: "Format non supporté",
          description: "Veuillez déposer l'archive .zip ou .tgz téléchargée depuis Google Takeout.",
          variant: "destructive",
        });
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isValidArchive(file)) {
        processArchiveFile(file);
      } else {
        toast({
          title: "Format non supporté",
          description: "Veuillez sélectionner l'archive .zip ou .tgz téléchargée depuis Google Takeout.",
          variant: "destructive",
        });
      }
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
    setIsExtracting(true);
    setParseError(null);
    setCurrentStep(2);
    setExtractProgress(0);
    
    // Simulate extraction progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      setExtractProgress(progress);
      if (progress >= 100) {
        clearInterval(progressInterval);
        setIsExtracting(false);
        setIsAnalyzing(true);
        
        // Simulate analysis
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
        }, 3000);
      }
    }, 200);
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

      // Navigate to mestrajets page
      navigate('/mestrajets');

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 bg-slate-900 border-slate-800 text-center">
          <Monitor className="w-16 h-16 mx-auto mb-6 text-amber-500" />
          <h2 className="text-xl font-semibold text-white mb-4">Version Ordinateur requise</h2>
          <p className="text-slate-400">
            Cette fonction avancée de traitement de fichiers est réservée à la version Ordinateur.
          </p>
          <Button 
            variant="outline" 
            className="mt-6 border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => navigate('/app')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'application
          </Button>
        </Card>
      </div>
    );
  }

  const isMobile = useIsMobile();

  return (
    <>
      <Helmet>
        <title>Récupérer mes trajets | IKtracker</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://iktracker.fr/recovery" />
      </Helmet>
      <div className="min-h-screen bg-slate-950 flex">
        {/* Desktop Sidebar - sticky */}
        {!isMobile && <DesktopSidebar />}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.tgz,.tar.gz"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-auto">
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
              <h1 className="text-4xl font-bold text-white mb-3">
                Récupérez vos trajets passés
              </h1>
              <p className="text-slate-400 text-lg mb-10">
                Transformez votre historique Google Maps en indemnités kilométriques
              </p>

              <Card className="bg-slate-900 border-slate-800 p-8 mb-8">
                <h2 className="text-lg font-semibold text-white mb-6">Comment exporter vos données ?</h2>
                <ol className="space-y-6">
                  {[
                    { step: "Accédez à Google Takeout", detail: "Cliquez sur le bouton ci-dessous pour ouvrir la page d'export Google." },
                    { step: "Exportez l'Historique des positions", detail: "Sélectionnez uniquement « Historique des positions » (format .zip ou .tgz)." },
                    { step: "Téléchargez l'archive", detail: "Google vous enverra un email. Téléchargez l'archive .zip ou .tgz fournie." },
                  ].map((item, index) => (
                    <li key={index} className="flex gap-5">
                      <span className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-lg">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-white font-medium">{item.step}</p>
                        <p className="text-slate-400 text-sm mt-1">{item.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>

              <div className="flex gap-4">
                <Button 
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-14 px-8"
                  onClick={() => window.open('https://takeout.google.com/settings/takeout/custom/location_history', '_blank')}
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Ouvrir Google Takeout
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="border-slate-700 text-white hover:bg-slate-800 h-14"
                  onClick={() => setCurrentStep(2)}
                >
                  J'ai mon archive
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: ZIP Import */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <h1 className="text-4xl font-bold text-white mb-3">
                Importez votre archive
              </h1>
              <p className="text-slate-400 text-lg mb-10">
                Déposez le fichier .zip ou .tgz téléchargé depuis Google Takeout
              </p>

              {/* Error message */}
              {parseError && (
                <Card className="bg-red-500/10 border-red-500/30 p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-medium">Erreur de traitement</p>
                      <p className="text-red-300 text-sm mt-1">{parseError}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Dropzone or Progress */}
              {isExtracting || isAnalyzing ? (
                <Card className="bg-slate-900 border-slate-800 p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                    {isExtracting ? (
                      <Archive className="w-10 h-10 text-amber-500 animate-pulse" />
                    ) : (
                      <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    )}
                  </div>
                  
                  <motion.p 
                    key={currentMessage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-amber-500 font-medium text-lg mb-6"
                  >
                    {currentMessage}
                  </motion.p>

                  {isExtracting && (
                    <div className="max-w-xs mx-auto">
                      <Progress value={extractProgress} className="h-2 bg-slate-800" />
                      <p className="text-slate-500 text-sm mt-2">{extractProgress}%</p>
                    </div>
                  )}

                  {isAnalyzing && (
                    <p className="text-slate-500 text-sm">
                      Cette opération peut prendre quelques minutes selon la taille de votre historique...
                    </p>
                  )}
                </Card>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all
                    ${isDragOver 
                      ? 'border-amber-500 bg-amber-500/10' 
                      : 'border-slate-700 hover:border-amber-500/50 hover:bg-slate-900'
                    }
                  `}
                >
                  <FileArchive className={`w-20 h-20 mx-auto mb-6 ${isDragOver ? 'text-amber-500' : 'text-slate-600'}`} />
                  <p className="text-xl text-white mb-2">
                    Glissez-déposez votre archive ici
                  </p>
                  <p className="text-slate-500">
                    ou cliquez pour sélectionner le fichier
                  </p>
                  <p className="text-slate-600 text-sm mt-6">
                    Formats acceptés : .zip, .tgz, .tar.gz
                  </p>
                </div>
              )}

              {!isExtracting && !isAnalyzing && (
                <div className="flex items-center justify-between mt-8">
                  <Button 
                    variant="ghost"
                    className="text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={() => setCurrentStep(1)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour
                  </Button>
                  <button 
                    onClick={handleDemoClick}
                    className="text-amber-500 hover:underline text-sm"
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
              className="flex gap-8 h-[calc(100vh-10rem)]"
            >
              {/* Left: Table */}
              <div className="flex-1 flex flex-col min-w-0">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Trajets détectés
                </h1>
                <p className="text-slate-400 mb-6">
                  Sélectionnez les trajets à importer dans votre relevé
                  {summary && (
                    <span className="text-amber-500 ml-2">
                      ({new Date(summary.dateRange.start).toLocaleDateString('fr-FR')} → {new Date(summary.dateRange.end).toLocaleDateString('fr-FR')})
                    </span>
                  )}
                </p>

                {/* Hero Card */}
                <Card className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500/30 p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Gain Potentiel</p>
                      <p className="text-5xl font-bold text-amber-500">
                        {totalGain.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm mb-1">Trajets sélectionnés</p>
                      <p className="text-3xl font-semibold text-white">
                        {selectedTrips.size} <span className="text-slate-500">/ {trips.length}</span>
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Table */}
                <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-900">
                  <Table>
                    <TableHeader className="bg-slate-900/80 backdrop-blur sticky top-0">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="w-12 text-slate-500"></TableHead>
                        <TableHead className="text-slate-500">Date</TableHead>
                        <TableHead className="text-slate-500">Destination</TableHead>
                        <TableHead className="text-slate-500 text-right">Distance</TableHead>
                        <TableHead className="text-slate-500 text-right">Indemnité</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trips.map((trip) => (
                        <TableRow 
                          key={trip.id}
                          className={`
                            border-slate-800 cursor-pointer transition-colors
                            ${selectedTrips.has(trip.id) ? 'bg-amber-500/10' : 'hover:bg-slate-800/50'}
                            ${selectedPreview === trip.id ? 'ring-1 ring-amber-500' : ''}
                          `}
                          onClick={() => setSelectedPreview(trip.id)}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedTrips.has(trip.id)}
                              onCheckedChange={() => toggleTripSelection(trip.id)}
                              className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                            />
                          </TableCell>
                          <TableCell className="text-slate-300 font-mono text-sm">
                            {new Date(trip.date).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className={`w-4 h-4 flex-shrink-0 ${
                                trip.type === 'chantier' || trip.type === 'fournisseur' 
                                  ? 'text-amber-500' 
                                  : 'text-slate-500'
                              }`} />
                              <span className="text-white truncate max-w-[280px]">
                                {trip.endLocation.address || `${trip.endLocation.lat.toFixed(4)}, ${trip.endLocation.lng.toFixed(4)}`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300 text-right font-mono">
                            {trip.distance} km
                          </TableCell>
                          <TableCell className="text-amber-500 text-right font-mono font-semibold">
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
                <Card className="h-full bg-slate-900 border-slate-800 p-5 flex flex-col">
                  <h3 className="text-white font-semibold mb-4">Aperçu du trajet</h3>
                  <div className="flex-1 bg-slate-800/50 rounded-xl flex items-center justify-center relative overflow-hidden">
                    {/* Minimalist map placeholder */}
                    <div className="absolute inset-0 opacity-20">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 50 Q25 30 50 50 T100 50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-600" />
                        <path d="M0 60 Q35 40 70 60 T100 60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-600" />
                        <path d="M0 40 Q20 60 40 40 T80 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-600" />
                      </svg>
                    </div>
                    
                    {selectedPreview ? (
                      <div className="text-center p-6 relative z-10">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <MapPin className="w-8 h-8 text-amber-500" />
                        </div>
                        <p className="text-white font-medium mb-2 text-sm leading-tight">
                          {trips.find(t => t.id === selectedPreview)?.endLocation.address}
                        </p>
                        <div className="mt-6 space-y-3 text-left bg-slate-900/80 rounded-lg p-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Distance</span>
                            <span className="text-white font-mono">
                              {trips.find(t => t.id === selectedPreview)?.distance} km
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Durée</span>
                            <span className="text-white font-mono">
                              {trips.find(t => t.id === selectedPreview)?.duration} min
                            </span>
                          </div>
                          <div className="flex justify-between text-sm pt-3 border-t border-slate-700">
                            <span className="text-slate-500">Indemnité</span>
                            <span className="text-amber-500 font-semibold">
                              {trips.find(t => t.id === selectedPreview)?.refund.toFixed(2)} €
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-600 text-sm relative z-10">
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
          className="fixed bottom-0 left-16 right-72 bg-slate-900 border-t border-slate-800 p-5"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">
                {selectedTrips.size} trajets sélectionnés sur {trips.length}
              </p>
              <p className="text-white font-semibold text-lg">
                Total : <span className="text-amber-500">{totalGain.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </p>
            </div>
            <div className="flex gap-4">
              <Button 
                variant="outline"
                className="border-slate-700 text-white hover:bg-slate-800"
                onClick={() => setCurrentStep(2)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button 
                size="lg"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold h-12 px-8"
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

      {/* Right Sidebar - Progress Steps */}
      <aside className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col p-6 sticky top-0 h-screen flex-shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <img 
            src="/logo-iktracker-250.webp" 
            alt="IKtracker" 
            width={250}
            height={250}
            className="w-10 h-10"
          />
          <span className="text-white font-semibold text-lg">IK Tracker</span>
        </div>

        {/* Recovery Header */}
        <div className="flex items-center gap-3 mb-8">
          <Sparkles className="w-6 h-6 text-amber-500" />
          <span className="text-white font-medium">Récupération Auto</span>
        </div>

        {/* Step indicators */}
        <nav className="flex-1 space-y-3">
          {[
            { num: 1, label: 'Préparation', desc: 'Export Google Takeout' },
            { num: 2, label: 'Import', desc: 'Décompression & analyse' },
            { num: 3, label: 'Validation', desc: 'Sélection des trajets' },
          ].map((step) => (
            <div
              key={step.num}
              className={`flex items-start gap-4 p-3 rounded-xl transition-all ${
                currentStep === step.num 
                  ? 'bg-amber-500/10 border border-amber-500/30' 
                  : currentStep > step.num 
                    ? 'opacity-60' 
                    : 'opacity-40'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                currentStep > step.num 
                  ? 'bg-amber-500 text-slate-950' 
                  : currentStep === step.num 
                    ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-500' 
                    : 'bg-slate-800 text-slate-500'
              }`}>
                {currentStep > step.num ? <Check className="w-4 h-4" /> : step.num}
              </div>
              <div>
                <p className={`font-medium ${currentStep >= step.num ? 'text-white' : 'text-slate-500'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </nav>

        <Button 
          variant="ghost" 
          className="text-slate-400 hover:text-white hover:bg-slate-800 mt-auto"
          onClick={() => navigate('/app')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'application
        </Button>
      </aside>
    </div>
    </>
  );
}
