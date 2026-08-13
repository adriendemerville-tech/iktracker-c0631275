import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  getActiveSession,
  getLiveDistance,
  isTourRunning,
  requestTourPermissions,
  startTour,
  stopTour,
} from '@/lib/tour-tracking';
import { createTrip, fetchVehicles, type Vehicle } from '@/lib/trips';
import { colors, radius, spacing } from '@/theme';

export default function TourneeScreen() {
  const [running, setRunning] = useState(false);
  const [distance, setDistance] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles()
      .then((v) => {
        setVehicles(v);
        setVehicleId((cur) => cur ?? v[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, []);

  // Reprise de session : si une tournée tourne encore après un kill de l'app.
  useEffect(() => {
    (async () => {
      const active = await isTourRunning();
      setRunning(active);
      if (active) {
        const s = await getActiveSession();
        if (s?.vehicleId) setVehicleId(s.vehicleId);
      }
    })();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(async () => setDistance(await getLiveDistance()), 5000);
    return () => clearInterval(id);
  }, [running]);

  const onStart = useCallback(async () => {
    const ok = await requestTourPermissions();
    if (!ok) {
      const issue = describeLocationIssue(true);
      Alert.alert(issue.title, `${issue.detail}\n\n${issue.hint}`, [
        { text: 'Fermer', style: 'cancel' },
        { text: 'Ouvrir les réglages', onPress: () => Linking.openSettings() },
      ]);
      return;
    }

    await startTour(vehicleId);
    setDistance(0);
    setRunning(true);
  }, [vehicleId]);

  const onStop = useCallback(async () => {
    const result = await stopTour();
    setRunning(false);
    setDistance(result.distance);

    const vehicle = vehicles.find((v) => v.id === (result.session?.vehicleId ?? vehicleId));
    if (!vehicle || result.distance <= 0) {
      Alert.alert('Tournée terminée', `${result.distance.toFixed(1)} km — aucun trajet enregistré.`);
      return;
    }
    try {
      const trip = await createTrip({
        vehicle,
        date: new Date().toISOString().slice(0, 10),
        distance: result.distance,
        purpose: 'Tournée professionnelle',
        startAddress: 'Départ tournée',
        endAddress: 'Retour tournée',
        tourStops: result.stops,
      });
      Alert.alert('Tournée enregistrée', `${trip.distance.toFixed(1)} km — ${trip.ik_amount.toFixed(2)} €`);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible');
    }
  }, [vehicleId, vehicles]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Distance en cours</Text>
        <Text style={styles.distance}>{distance.toFixed(1)} km</Text>
        <Text style={[styles.status, { color: running ? colors.success : colors.muted }]}>
          {running ? 'Enregistrement actif — arrière-plan autorisé' : 'Tournée à l’arrêt'}
        </Text>
      </View>

      <Text style={styles.label}>Véhicule</Text>
      <View style={styles.vehicles}>
        {vehicles.map((v) => (
          <Pressable
            key={v.id}
            onPress={() => setVehicleId(v.id)}
            style={[styles.chip, vehicleId === v.id && styles.chipActive]}
            disabled={running}
          >
            <Text style={[styles.chipText, vehicleId === v.id && styles.chipTextActive]}>
              {v.make} {v.model} · {v.fiscal_power} CV{v.is_electric ? ' · 100% électrique' : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[styles.btn, running ? styles.btnDanger : styles.btnPrimary]} onPress={running ? onStop : onStart}>
        <Text style={styles.btnText}>{running ? 'Terminer la tournée' : 'Démarrer la tournée'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  label: { color: colors.muted, fontSize: 13 },
  distance: { fontSize: 48, fontWeight: '700', color: colors.text, marginVertical: spacing.xs },
  status: { fontSize: 13, fontWeight: '600' },
  vehicles: { gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: '#EEF0FF' },
  chipText: { color: colors.text },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  btn: { height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  btnPrimary: { backgroundColor: colors.primary },
  btnDanger: { backgroundColor: colors.danger },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
