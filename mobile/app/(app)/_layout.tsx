import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme';

export default function AppLayout() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.background },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="tournee" options={{ title: 'Mode Tournée' }} />
      <Tabs.Screen name="nouveau-trajet" options={{ title: 'Nouveau trajet' }} />
      <Tabs.Screen name="rapports" options={{ title: 'Relevés' }} />
    </Tabs>
  );
}
