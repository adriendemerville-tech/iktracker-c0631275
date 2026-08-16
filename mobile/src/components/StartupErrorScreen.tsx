import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/theme";
import type { StartupIssue } from "@/lib/startup-checks";

interface Props {
  issue: StartupIssue;
  onRetry?: () => void;
}

export function StartupErrorScreen({ issue, onRetry }: Props) {
  const showSettings = issue.code === "gps-denied" || issue.code === "gps-background-denied";

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.badge}>IKtracker</Text>
          <Text style={styles.title}>{issue.title}</Text>
          <Text style={styles.detail}>{issue.detail}</Text>

          <View style={styles.hintBox}>
            <Text style={styles.hintLabel}>Que faire</Text>
            <Text style={styles.hint}>{issue.hint}</Text>
          </View>

          <Text style={styles.code}>Code : {issue.code}</Text>

          <View style={styles.actions}>
            {onRetry ? (
              <Pressable style={[styles.button, styles.primary]} onPress={onRetry}>
                <Text style={styles.primaryLabel}>Réessayer</Text>
              </Pressable>
            ) : null}
            {showSettings ? (
              <Pressable
                style={[styles.button, styles.secondary]}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.secondaryLabel}>Ouvrir les réglages</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  badge: { color: colors.primary, fontWeight: "700", letterSpacing: 1, fontSize: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: "700" },
  detail: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  hintBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  hintLabel: { color: colors.text, fontWeight: "600", marginBottom: 4 },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  code: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  button: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.md },
  primary: { backgroundColor: colors.primary },
  primaryLabel: { color: colors.primaryText, fontWeight: "600" },
  secondary: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  secondaryLabel: { color: colors.text, fontWeight: "600" },
});
