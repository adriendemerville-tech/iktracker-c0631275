import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Link2, Trash2, ExternalLink, Loader2, Bug, RefreshCw } from 'lucide-react';
import { useCalendarConnections } from '@/hooks/useCalendarConnections';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarSyncNotification } from './CalendarSyncNotification';

// Detect if we're on a mobile device (more reliable than just screen size)
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
// Google Calendar icon
const GoogleCalendarIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Outlook Calendar icon
const OutlookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.356.228-.594.228h-8.168v-6.182l1.602 1.176a.477.477 0 0 0 .29.096.5.5 0 0 0 .29-.096.42.42 0 0 0 0-.656l-2.182-1.6V7.387c0-.238.08-.436.238-.594.158-.158.356-.237.594-.237h7.574c.238 0 .436.08.594.237.158.158.238.356.238.594z"/>
    <path fill="#0078D4" d="M14.875 9.75l-2.182 1.6a.42.42 0 0 0 0 .655.5.5 0 0 0 .29.097.477.477 0 0 0 .29-.097l1.602-1.175v6.182H6.708c-.238 0-.436-.076-.594-.228A.776.776 0 0 1 5.876 16.21V7.387c0-.238.08-.436.238-.594.158-.158.356-.237.594-.237h7.573c.239 0 .437.08.594.237.159.158.239.356.239.594v2.363h-.239z"/>
    <path fill="#28A8EA" d="M9.143 8.625v6.75A1.131 1.131 0 0 1 8.018 16.5H.375V7.125C.375 6.504.879 6 1.5 6h6.518c.621 0 1.125.504 1.125 1.125v1.5z"/>
    <path fill="#0078D4" d="M9.143 8.625v6.75A1.131 1.131 0 0 1 8.018 16.5H.375V7.125C.375 6.504.879 6 1.5 6h6.518c.621 0 1.125.504 1.125 1.125v1.5z"/>
    <path fill="#50D9FF" d="M4.5 10.125c-1.036 0-1.875.84-1.875 1.875s.84 1.875 1.875 1.875S6.375 13.036 6.375 12s-.84-1.875-1.875-1.875z"/>
  </svg>
);

export function CalendarConnections({ onTripsUpdated }: { onTripsUpdated?: () => void } = {}) {
  const { connections, loading, addIcsConnection, removeConnection, toggleConnection, getConnection, refetch } = useCalendarConnections();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [icsUrl, setIcsUrl] = useState('');
  const [icsDialogOpen, setIcsDialogOpen] = useState(false);
  const [addingIcs, setAddingIcs] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingOutlook, setConnectingOutlook] = useState(false);

  const [debugProvider, setDebugProvider] = useState<'google' | 'outlook' | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugResponse, setDebugResponse] = useState<any>(null);
  const [debugError, setDebugError] = useState<any>(null);

  const runCalendarDebug = useCallback(async (provider: 'google' | 'outlook') => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setDebugProvider(provider);
    setDebugLoading(true);
    setDebugResponse(null);
    setDebugError(null);

    const { data, error } = await supabase.functions.invoke('calendar-debug', {
      body: { provider, daysBack: 7, daysForward: 7 },
    });

    if (error) {
      setDebugError({
        message: error.message,
        name: error.name,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        context: (error as any).context,
      });
      setDebugLoading(false);
      return;
    }

    setDebugResponse(data);
    setDebugLoading(false);
  }, [user]);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    totalTripsCreated: number;
    dateRange: { startDate: string; endDate: string } | null;
  } | null>(null);
  const [showSyncNotification, setShowSyncNotification] = useState(false);

  const runManualSync = useCallback(async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setSyncing(true);
    setSyncResult(null);
    setShowSyncNotification(false);

    const { data, error } = await supabase.functions.invoke('sync-calendar-trips', {
      body: { trigger: 'manual' },
    });

    if (error) {
      toast.error('Erreur lors de la synchronisation');
      console.error('[sync-calendar-trips] error:', error);
      setSyncing(false);
      return;
    }

    setSyncResult({
      totalTripsCreated: data?.totalTripsCreated || 0,
      dateRange: data?.dateRange || null,
    });
    setSyncing(false);
    setShowSyncNotification(true);

    if (data?.totalTripsCreated > 0) {
      // Trigger refresh of trips data
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      onTripsUpdated?.();
    }
  }, [user, queryClient, onTripsUpdated]);

  const googleConnection = getConnection('google');
  const outlookConnection = getConnection('outlook');
  const icsConnection = getConnection('ics');

  // Listen for OAuth callback messages (popup mode)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'google-auth-success') {
        toast.success('Google Calendar connecté');
        setConnectingGoogle(false);
        refetch();
      } else if (event.data.type === 'google-auth-error') {
        toast.error(`Erreur de connexion Google: ${event.data.error}`);
        setConnectingGoogle(false);
      } else if (event.data.type === 'outlook-auth-success') {
        toast.success('Outlook Calendar connecté');
        setConnectingOutlook(false);
        refetch();
      } else if (event.data.type === 'outlook-auth-error') {
        toast.error(`Erreur de connexion Outlook: ${event.data.error}`);
        setConnectingOutlook(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetch]);

  // Handle OAuth redirect return (mobile mode)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const oauthError = urlParams.get('oauth_error');
    const oauthProvider = urlParams.get('oauth_provider');
    const pendingOauth = sessionStorage.getItem('oauth_pending');

    // Clean up URL params after reading
    if (oauthSuccess || oauthError) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      sessionStorage.removeItem('oauth_pending');
    }

    if (oauthSuccess === 'true' && oauthProvider) {
      toast.success(`${oauthProvider === 'google' ? 'Google' : 'Outlook'} Calendar connecté`);
      refetch();
    } else if (oauthError) {
      toast.error(`Erreur de connexion: ${oauthError}`);
    }

    // If we had a pending OAuth and came back without success/error params,
    // the user might have cancelled - just clear the pending state
    if (pendingOauth && !oauthSuccess && !oauthError) {
      // Check if we're coming back from OAuth (has code param)
      const hasCode = urlParams.get('code');
      if (!hasCode) {
        sessionStorage.removeItem('oauth_pending');
      }
    }
  }, [refetch]);

  const handleGoogleConnect = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setConnectingGoogle(true);

    try {
      // Create state with user info - include redirect for mobile
      const state = btoa(JSON.stringify({
        user_id: user.id,
        redirect_url: window.location.href,
        use_redirect: isMobileDevice(), // Tell the backend to use redirect mode
      }));

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=authorize&state=${state}`;
      console.log('Google OAuth - Calling:', apiUrl);

      // Get auth URL from edge function
      const response = await fetch(apiUrl, { method: 'GET' });
      console.log('Google OAuth - Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google OAuth - Error response:', errorText);
        throw new Error(`Failed to get auth URL: ${response.status}`);
      }

      const result = await response.json();
      console.log('Google OAuth - Got URL:', result.url ? 'yes' : 'no');
      
      if (!result.url) {
        throw new Error('No URL in response');
      }
      
      // On mobile, use direct redirect instead of popup
      if (isMobileDevice()) {
        // Store state in sessionStorage to recover after redirect
        sessionStorage.setItem('oauth_pending', 'google');
        window.location.href = result.url;
        return;
      }

      // On desktop, use popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        result.url,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Check if popup was blocked
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        toast.error('Le popup a été bloqué. Autorisez les popups pour ce site.');
        setConnectingGoogle(false);
        return;
      }

      // Set a timeout to reset loading state if popup is closed without auth
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          setTimeout(() => {
            setConnectingGoogle(false);
          }, 1000);
        }
      }, 500);

      // Clear interval after 5 minutes max
      setTimeout(() => {
        clearInterval(checkPopupClosed);
        setConnectingGoogle(false);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Error initiating Google OAuth:', error);
      toast.error('Erreur lors de la connexion Google');
      setConnectingGoogle(false);
    }
  };

  const handleOutlookConnect = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setConnectingOutlook(true);

    try {
      // Create state with user info - include redirect for mobile
      const state = btoa(JSON.stringify({
        user_id: user.id,
        redirect_url: window.location.href,
        use_redirect: isMobileDevice(),
      }));

      // Get auth URL from edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outlook-calendar-auth?action=authorize&state=${state}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }

      const result = await response.json();
      
      // On mobile, use direct redirect instead of popup
      if (isMobileDevice()) {
        sessionStorage.setItem('oauth_pending', 'outlook');
        window.location.href = result.url;
        return;
      }

      // On desktop, use popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        result.url,
        'outlook-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Check if popup was blocked
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        toast.error('Le popup a été bloqué. Autorisez les popups pour ce site.');
        setConnectingOutlook(false);
        return;
      }

      // Set a timeout to reset loading state if popup is closed without auth
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          setTimeout(() => {
            setConnectingOutlook(false);
          }, 1000);
        }
      }, 500);

      // Clear interval after 5 minutes max
      setTimeout(() => {
        clearInterval(checkPopupClosed);
        setConnectingOutlook(false);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Error initiating Outlook OAuth:', error);
      toast.error('Erreur lors de la connexion Outlook');
      setConnectingOutlook(false);
    }
  };

  const handleAddIcs = async () => {
    if (!icsUrl.trim()) {
      toast.error('Veuillez entrer une URL ICS valide');
      return;
    }

    // Basic URL validation
    try {
      new URL(icsUrl);
    } catch {
      toast.error('URL invalide');
      return;
    }

    setAddingIcs(true);
    const result = await addIcsConnection(icsUrl.trim());
    setAddingIcs(false);

    if (result) {
      setIcsUrl('');
      setIcsDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-4 h-4" />
          Mes Agendas
        </CardTitle>
        <CardDescription className="hidden md:block">
          Connectez vos agendas pour importer automatiquement vos trajets
        </CardDescription>
        <CardDescription className="md:hidden">
          Importer automatiquement vos trajets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Google Calendar */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center border">
              <GoogleCalendarIcon />
            </div>
            <div>
              <p className="font-medium text-sm">Google Calendar</p>
              <p className="text-xs text-muted-foreground">
                {googleConnection ? 'Connecté' : 'Non connecté'}
              </p>
            </div>
          </div>
          {googleConnection ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runCalendarDebug('google')}
                disabled={debugLoading && debugProvider === 'google'}
                className="hidden md:flex"
              >
                {debugLoading && debugProvider === 'google' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bug className="w-4 h-4" />
                )}
                <span className="sr-only">Debug raw Google Calendar</span>
              </Button>
              <Switch
                checked={googleConnection.isActive}
                onCheckedChange={(checked) => toggleConnection(googleConnection.id, checked)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => removeConnection(googleConnection.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleGoogleConnect} disabled={connectingGoogle}>
              {connectingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connecter'}
            </Button>
          )}
        </div>

        {/* Outlook Calendar */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center border">
              <OutlookIcon />
            </div>
            <div>
              <p className="font-medium text-sm">Outlook Calendar</p>
              <p className="text-xs text-muted-foreground">
                {outlookConnection ? 'Connecté' : 'Non connecté'}
              </p>
            </div>
          </div>
          {outlookConnection ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runCalendarDebug('outlook')}
                disabled={debugLoading && debugProvider === 'outlook'}
                className="hidden md:flex"
              >
                {debugLoading && debugProvider === 'outlook' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bug className="w-4 h-4" />
                )}
                <span className="sr-only">Debug raw Outlook Calendar</span>
              </Button>
              <Switch
                checked={outlookConnection.isActive}
                onCheckedChange={(checked) => toggleConnection(outlookConnection.id, checked)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => removeConnection(outlookConnection.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleOutlookConnect} disabled={connectingOutlook}>
              {connectingOutlook ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connecter'}
            </Button>
          )}
        </div>

        {/* ICS Manual Integration */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Link2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">Intégration manuelle</p>
              <p className="text-xs text-muted-foreground">
                {icsConnection ? 'Lien ICS configuré' : 'Coller un lien .ics'}
              </p>
            </div>
          </div>
          {icsConnection ? (
            <div className="flex items-center gap-2">
              <Switch
                checked={icsConnection.isActive}
                onCheckedChange={(checked) => toggleConnection(icsConnection.id, checked)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => removeConnection(icsConnection.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Dialog open={icsDialogOpen} onOpenChange={setIcsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un agenda ICS</DialogTitle>
                  <DialogDescription>
                    Collez l'URL de votre calendrier au format .ics
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="ics-url">URL du calendrier</Label>
                    <Input
                      id="ics-url"
                      placeholder="https://calendar.example.com/feed.ics"
                      value={icsUrl}
                      onChange={(e) => setIcsUrl(e.target.value)}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Vous pouvez trouver ce lien dans les paramètres de votre agenda
                    </p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleAddIcs}
                    disabled={addingIcs}
                  >
                    {addingIcs ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Ajout en cours...
                      </>
                    ) : (
                      'Ajouter l\'agenda'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>


        {/* Manual Sync Button */}
        {connections.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <p className="font-medium text-sm">Synchroniser maintenant</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runManualSync}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync
            </Button>
          </div>
        )}


        {/* Info about syncing */}
        {connections.length > 0 && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p>
              📍 Les trajets sont créés automatiquement pour les RDV avec une adresse (champ lieu).
            </p>
          </div>
        )}
      </CardContent>

      {/* Sync notification modal */}
      {showSyncNotification && syncResult && (
        <CalendarSyncNotification
          dateRange={syncResult.dateRange}
          tripsCreated={syncResult.totalTripsCreated}
          onClose={() => setShowSyncNotification(false)}
        />
      )}
    </Card>
  );
}
