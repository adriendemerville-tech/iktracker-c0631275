import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTrips } from '@/hooks/useTrips';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, CreditCard, Receipt, Settings, Moon, Sun, Mail, LogOut, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { trips } = useTrips();

  const monthlyKmData = useMemo(() => {
    const now = new Date();
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });
      months.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        km: 0
      });
    }

    trips.forEach(trip => {
      const tripDate = new Date(trip.startTime);
      const tripMonth = tripDate.getMonth();
      const tripYear = tripDate.getFullYear();
      
      const monthData = months.find(m => m.monthIndex === tripMonth && m.year === tripYear);
      if (monthData) {
        monthData.km += trip.distance;
      }
    });

    return months.map(m => ({ month: m.month, km: Math.round(m.km) }));
  }, [trips]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Mon profil</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              Informations de connexion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email || 'Non connecté'}</p>
              </div>
            </div>
            {user && (
              <Button variant="outline" className="w-full" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Se déconnecter
              </Button>
            )}
            {!user && (
              <Button className="w-full" onClick={() => navigate('/auth')}>
                Se connecter
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Kilometers Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4" />
              Kilomètres parcourus
            </CardTitle>
            <CardDescription>
              Sur les 6 derniers mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyKmData} margin={{ left: 0, right: 0, bottom: 0, top: 10 }}>
                  <XAxis type="category" dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis type="number" hide />
                  <Bar dataKey="km" radius={[4, 4, 0, 0]}>
                    {monthlyKmData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(25, 95%, 53%)" />
                    ))}
                    <LabelList dataKey="km" position="insideTop" fill="white" fontSize={11} fontWeight={600} offset={4} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-4 h-4" />
              Paiement
            </CardTitle>
            <CardDescription>
              Gérez vos moyens de paiement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun moyen de paiement enregistré</p>
              <Button variant="outline" size="sm" className="mt-3" disabled>
                Ajouter une carte
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="w-4 h-4" />
              Factures
            </CardTitle>
            <CardDescription>
              Historique de vos factures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune facture disponible</p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4" />
              Préférences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Sun className="w-5 h-5 text-muted-foreground" />
                )}
                <Label htmlFor="dark-mode" className="cursor-pointer">
                  Mode sombre
                </Label>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>IK Tracker v1.0</p>
          <p className="mt-1">© 2024 - Tous droits réservés</p>
        </div>
      </main>
    </div>
  );
};

export default Profile;
