import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchTrips, type TripRow } from '@/lib/trips';
import { exportReportPdf } from '@/lib/pdf';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing } from '@/theme';

export default function Rapports() {
  const { session, signOut } = useAuth();
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchTrips().then(setTrips).catch(() => undefined);
  }, []);

  const totals = useMemo(
    () => ({
      km: trips.reduce((s, t) => s + (t.distance ?? 0), 0),
      ik: trips.reduce((s, t) => s + (t.ik_amount ?? 0), 0),
    }),
    [trips],
  );

  const onExport = async () => {
    setBusy(true);
    try {
      await exportReportPdf({
        trips,
        periodLabel: `Année ${new Date().getFullYear()}`,
        ownerName: session?.user.email ?? 'Utilisateur IKTracker',
      });
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryValue}>{totals.km.toFixed(0)} km</Text>
        <Text style={styles.summaryValue}>{totals.ik.toFixed(2)} €</Text>
      </View>

      <Pressable style={styles.primaryBtn} onPress={onExport} disabled={busy}>
        <Text style={styles.primaryText}>{busy ? 'Génération…' : 'Exporter le relevé PDF'}</Text>
      </Pressable>

      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingVertical: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.purpose ?? 'Déplacement'}</Text>
              <Text style={styles.rowMeta}>
                {item.date} · {item.start_address ?? '-'} → {item.end_address ?? '-'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.rowTitle}>{item.distance.toFixed(1)} km</Text>
              <Text style={styles.rowMeta}>{(item.ik_amount ?? 0).toFixed(2)} €</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.rowMeta}>Aucun trajet enregistré pour l’instant.</Text>}
      />

      <Pressable onPress={signOut}>
        <Text style={styles.signout}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  summary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  summaryValue: { fontSize: 26, fontWeight: '700', color: colors.text },
  primaryBtn: { height: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  row: { flexDirection: 'row', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
  rowTitle: { color: colors.text, fontWeight: '600' },
  rowMeta: { color: colors.muted, fontSize: 12 },
  signout: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.md },
});
