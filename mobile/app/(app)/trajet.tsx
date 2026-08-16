import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  cancelLiveTrip,
  finishLiveTrip,
  getLiveTrip,
  requestForegroundLocation,
  startLiveTrip,
  type FinishedLiveTrip,
  type LiveTrip,
} from '@/lib/live-trip';
import { createTrip, fetchVehicles, type Vehicle } from '@/lib/trips';
import { colors, radius, spacing } from '@/theme';

const timeFmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function TrajetDirect() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [live, setLive] = useState<LiveTrip | null>(null);
  const [finished, setFinished] = useState<FinishedLiveTrip | null>(null);
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchVehicles()
      .then((v) => {
        setVehicles(v);
        setVehicleId((cur) => cur ?? v[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, []);

  // Reprise : un trajet démarré survit à la fermeture de l'app.
  useEffect(() => {
    getLiveTrip()
      .then((t) => {
        setLive(t);
        if (t?.vehicleId) setVehicleId(t.vehicleId);
      })
      .catch(() => undefined);
  }, []);

  const onStart = useCallback(async () => {
    const ok = await requestForegroundLocation();
    if (!ok) {
      Alert.alert(
        'Localisation refusée',
        'IKtracker a besoin de votre position pour enregistrer le point de départ.',
        [
          { text: 'Fermer', style: 'cancel' },
          { text: 'Ouvrir les réglages', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    setBusy(true);
    try {
      setFinished(null);
      setLive(await startLiveTrip(vehicleId));
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Position indisponible');
    } finally {
      setBusy(false);
    }
  }, [vehicleId]);

  const onFinish = useCallback(async () => {
    setBusy(true);
    try {
      const result = await finishLiveTrip();
      setFinished(result);
      setLive(null);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Position indisponible');
    } finally {
      setBusy(false);
    }
  }, []);

  const onSave = useCallback(async () => {
    if (!finished) return;
    const vehicle = vehicles.find((v) => v.id === (finished.vehicleId ?? vehicleId));
    if (!vehicle) {
      Alert.alert('Véhicule manquant', 'Sélectionnez un véhicule avant d’enregistrer.');
      return;
    }
    if (finished.distanceKm <= 0) {
      Alert.alert('Distance nulle', 'Départ et arrivée sont au même endroit.');
      return;
    }
    setBusy(true);
    try {
      const trip = await createTrip({
        vehicle,
        date: finished.start.at.slice(0, 10),
        distance: finished.distanceKm,
        purpose: purpose.trim() || 'Déplacement professionnel',
        startAddress: finished.start.address ?? `${finished.start.lat.toFixed(5)}, ${finished.start.lng.toFixed(5)}`,
        endAddress: finished.end.address ?? `${finished.end.lat.toFixed(5)}, ${finished.end.lng.toFixed(5)}`,
      });
      await cancelLiveTrip();
      setFinished(null);
      setPurpose('');
      Alert.alert('Trajet enregistré', `${trip.distance.toFixed(1)} km — ${trip.ik_amount.toFixed(2)} €`);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  }, [finished, purpose, vehicleId, vehicles]);

  const onDiscard = useCallback(async () => {
    await cancelLiveTrip();
    setLive(null);
    setFinished(null);
    setPurpose('');
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>
          {live ? 'Trajet en cours' : finished ? 'Trajet terminé' : 'Aucun trajet en cours'}
        </Text>
        {live && (
          <>
            <Text style={styles.big}>Départ {timeFmt(live.start.at)}</Text>
            <Text style={styles.address}>{live.start.address ?? 'Adresse en cours de résolution'}</Text>
          </>
        )}
        {finished && (
          <>
            <Text style={styles.big}>{finished.distanceKm.toFixed(1)} km</Text>
            <Text style={styles.address}>
              {timeFmt(finished.start.at)} → {timeFmt(finished.end.at)} · {finished.durationMin} min
            </Text>
            <Text style={styles.meta}>
              {finished.source === 'google' ? 'Distance routière' : 'Distance estimée'}
            </Text>
          </>
        )}
      </View>

      {finished && (
        <View style={styles.card}>
          <Text style={styles.rowLabel}>Départ</Text>
          <Text style={styles.address}>{finished.start.address ?? '—'}</Text>
          <Text style={styles.rowLabel}>Arrivée</Text>
          <Text style={styles.address}>{finished.end.address ?? '—'}</Text>
        </View>
      )}

      {!live && !finished && (
        <>
          <Text style={styles.label}>Véhicule</Text>
          {vehicles.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => setVehicleId(v.id)}
              style={[styles.chip, vehicleId === v.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, vehicleId === v.id && styles.chipTextActive]}>
                {v.make} {v.model} · {v.fiscal_power} CV{v.is_electric ? ' · 100% électrique' : ''}
              </Text>
            </Pressable>
          ))}
        </>
      )}

      {finished && (
        <TextInput
          style={styles.input}
          placeholder="Motif du déplacement"
          value={purpose}
          onChangeText={setPurpose}
          placeholderTextColor={colors.muted}
        />
      )}

      {!finished && (
        <Pressable
          style={[styles.btn, live ? styles.btnDanger : styles.btnPrimary]}
          onPress={live ? onFinish : onStart}
          disabled={busy}
        >
          <Text style={styles.btnText}>
            {busy ? 'Localisation…' : live ? 'Terminer le trajet' : 'Démarrer un trajet'}
          </Text>
        </Pressable>
      )}

      {finished && (
        <>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onSave} disabled={busy}>
            <Text style={styles.btnText}>{busy ? 'Enregistrement…' : 'Enregistrer le trajet'}</Text>
          </Pressable>
          <Pressable style={styles.btnLink} onPress={onDiscard}>
            <Text style={styles.btnLinkText}>Annuler ce trajet</Text>
          </Pressable>
        </>
      )}

      {live && (
        <Pressable style={styles.btnLink} onPress={onDiscard}>
          <Text style={styles.btnLinkText}>Abandonner le trajet en cours</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  label: { color: colors.muted, fontSize: 13 },
  rowLabel: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },
  big: { fontSize: 32, fontWeight: '700', color: colors.text },
  address: { color: colors.text, fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
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
  btn: {
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnDanger: { backgroundColor: colors.danger },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnLink: { marginTop: spacing.md, alignSelf: 'center' },
  btnLinkText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
});
