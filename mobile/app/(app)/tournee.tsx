import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  getActiveSession,
  getLiveDistance,
  getLocationPermissionStatus,
  isTourRunning,
  requestTourPermissions,
  startTour,
  stopTour,
} from '@/lib/tour-tracking';
import { createTrip, fetchVehicles, type Vehicle } from '@/lib/trips';
import { describeLocationIssue } from '@/lib/startup-checks';
import { colors, radius, spacing } from '@/theme';

type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export default function TourneeScreen() {
  const [running, setRunning] = useState(false);
  const [distance, setDistance] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<{
    foreground: LocationPermissionStatus;
    background: LocationPermissionStatus;
  } | null>(null);

  useEffect(() => {
    fetchVehicles()
      .then((v) => {
        setVehicles(v);
        setVehicleId((cur) => cur ?? v[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, []);

  // Vérifie les permissions dès l’arrivée sur l’écran, sans déclencher de dialogue système.
  useEffect(() => {
    getLocationPermissionStatus().then(setPermissionStatus).catch(() => undefined);
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

  const requestPermissionsAndStart = useCallback(async () => {
    const ok = await requestTourPermissions();
    setPermissionStatus(await getLocationPermissionStatus().catch(() => ({ foreground: 'denied' as PermissionStatus, background: 'denied' as PermissionStatus })));
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

  const fgGranted = permissionStatus?.foreground === 'granted';
  const bgGranted = permissionStatus?.background === 'granted';
  const needsPermission = permissionStatus !== null && (!fgGranted || !bgGranted);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Distance en cours</Text>
        <Text style={styles.distance}>{distance.toFixed(1)} km</Text>
        <Text style={[styles.status, { color: running ? colors.success : colors.muted }]}>
          {running ? 'Enregistrement actif — arrière-plan autorisé' : 'Tournée à l’arrêt'}
        </Text>
      </View>

      {needsPermission && !running && (
        <View style={[styles.card, styles.permissionCard]}>
          <Text style={styles.permissionTitle}>Localisation requise</Text>
          <Text style={styles.permissionText}>
            Le Mode Tournée a besoin d’accéder à votre position en arrière-plan pour enregistrer
            automatiquement la distance parcourue, même lorsque l’application est fermée.
          </Text>
          <Text style={styles.permissionHint}>
            Choisissez « Autoriser toujours » lorsque le système le demande.
          </Text>
          <Pressable style={styles.btnPrimary} onPress={requestPermissionsAndStart}>
            <Text style={styles.btnText}>Autoriser la localisation</Text>
          </Pressable>
          {!fgGranted && (
            <Pressable style={styles.btnLink} onPress={() => Linking.openSettings()}>
              <Text style={styles.btnLinkText}>Ouvrir les réglages iPhone</Text>
            </Pressable>
          )}
        </View>
      )}

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

      <Pressable
        style={[styles.btn, running ? styles.btnDanger : styles.btnPrimary]}
        onPress={running ? onStop : requestPermissionsAndStart}
        disabled={!running && needsPermission}
      >
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
  permissionCard: { alignItems: 'stretch' },
  label: { color: colors.muted, fontSize: 13 },
  distance: { fontSize: 48, fontWeight: '700', color: colors.text, marginVertical: spacing.xs },
  status: { fontSize: 13, fontWeight: '600' },
  permissionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  permissionText: { fontSize: 15, color: colors.text, lineHeight: 22, textAlign: 'center', marginBottom: spacing.md },
  permissionHint: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: spacing.md },
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
  btnPrimary: { backgroundColor: colors.primary, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnDanger: { backgroundColor: colors.danger },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnLink: { marginTop: spacing.md, alignSelf: 'center' },
  btnLinkText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
});
