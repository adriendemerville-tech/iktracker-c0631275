import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { createTrip, fetchVehicles, type Vehicle } from "@/lib/trips";
import { fetchDayEvents, requestCalendarAccess, type DayEvent } from "@/lib/calendar";
import { colors, radius, spacing } from "@/theme";

export default function NouveauTrajet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [purpose, setPurpose] = useState("");
  const [distance, setDistance] = useState("");
  const [roundTrip, setRoundTrip] = useState(false);
  const [events, setEvents] = useState<DayEvent[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVehicles()
      .then((v) => {
        setVehicles(v);
        setVehicleId(v[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, []);

  const importCalendar = async () => {
    const ok = await requestCalendarAccess();
    if (!ok) {
      Alert.alert(
        "Accès agenda refusé",
        "Autorisez l’accès au calendrier pour pré-remplir vos trajets.",
      );
      return;
    }
    const grouped = await fetchDayEvents();
    const flat = Object.values(grouped).flat();
    setEvents(flat);
    if (!flat.length)
      Alert.alert("Aucun rendez-vous", "Pas de rendez-vous aujourd’hui dans vos agendas.");
  };

  const submit = async () => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const base = parseFloat(distance.replace(",", "."));
    if (!vehicle || !Number.isFinite(base) || base <= 0) {
      Alert.alert(
        "Champs incomplets",
        "Sélectionnez un véhicule et saisissez une distance valide.",
      );
      return;
    }
    setSaving(true);
    try {
      const trip = await createTrip({
        vehicle,
        date: new Date().toISOString().slice(0, 10),
        distance: roundTrip ? base * 2 : base,
        purpose: purpose || "Déplacement professionnel",
        startAddress,
        endAddress,
      });
      Alert.alert(
        "Trajet enregistré",
        `${trip.distance.toFixed(1)} km — ${trip.ik_amount.toFixed(2)} €`,
      );
      setStartAddress("");
      setEndAddress("");
      setPurpose("");
      setDistance("");
      setRoundTrip(false);
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.secondaryBtn} onPress={importCalendar}>
        <Text style={styles.secondaryText}>Importer les rendez-vous du jour</Text>
      </Pressable>

      {events.map((e) => (
        <Pressable
          key={e.id}
          style={styles.event}
          onPress={() => {
            setEndAddress(e.location ?? e.title);
            setPurpose(e.title);
          }}
        >
          <Text style={styles.eventTitle}>{e.title}</Text>
          <Text style={styles.eventMeta}>{e.location ?? "Adresse non renseignée"}</Text>
        </Pressable>
      ))}

      <Text style={styles.label}>Véhicule</Text>
      {vehicles.map((v) => (
        <Pressable
          key={v.id}
          onPress={() => setVehicleId(v.id)}
          style={[styles.chip, vehicleId === v.id && styles.chipActive]}
        >
          <Text style={[styles.chipText, vehicleId === v.id && styles.chipTextActive]}>
            {v.make} {v.model} · {v.fiscal_power} CV
          </Text>
        </Pressable>
      ))}

      <TextInput
        style={styles.input}
        placeholder="Départ"
        value={startAddress}
        onChangeText={setStartAddress}
        placeholderTextColor={colors.muted}
      />
      <TextInput
        style={styles.input}
        placeholder="Arrivée"
        value={endAddress}
        onChangeText={setEndAddress}
        placeholderTextColor={colors.muted}
      />
      <TextInput
        style={styles.input}
        placeholder="Motif"
        value={purpose}
        onChangeText={setPurpose}
        placeholderTextColor={colors.muted}
      />
      <TextInput
        style={styles.input}
        placeholder="Distance (km)"
        keyboardType="decimal-pad"
        value={distance}
        onChangeText={setDistance}
        placeholderTextColor={colors.muted}
      />

      <View style={styles.row}>
        <Text style={styles.chipText}>Aller-retour</Text>
        <Switch value={roundTrip} onValueChange={setRoundTrip} />
      </View>

      <Pressable style={styles.primaryBtn} onPress={submit} disabled={saving}>
        <Text style={styles.primaryText}>
          {saving ? "Enregistrement…" : "Enregistrer le trajet"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm },
  label: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: "#EEF0FF" },
  chipText: { color: colors.text },
  chipTextActive: { color: colors.primary, fontWeight: "600" },
  event: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
  },
  eventTitle: { color: colors.text, fontWeight: "600" },
  eventMeta: { color: colors.muted, fontSize: 12 },
  primaryBtn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  secondaryText: { color: colors.text, fontWeight: "600" },
});
