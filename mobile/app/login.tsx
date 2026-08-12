import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing } from '@/theme';

export default function Login() {
  const { signInWithEmail, signInWithProvider } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIOS = Platform.OS === 'ios';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.replace('/(app)/tournee');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  };

  const appleButton = (
    <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => run(() => signInWithProvider('apple'))}>
      <Text style={styles.btnPrimaryText}>Continuer avec Apple</Text>
    </Pressable>
  );
  const googleButton = (
    <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => run(() => signInWithProvider('google'))}>
      <Text style={styles.btnOutlineText}>Continuer avec Google</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IKTracker</Text>
      <Text style={styles.subtitle}>Vos indemnités kilométriques, sans saisie manuelle.</Text>

      {isIOS ? (
        <>
          {appleButton}
          {googleButton}
        </>
      ) : (
        <>
          {googleButton}
          {appleButton}
        </>
      )}
      <Text style={styles.hint}>Inscription immédiate, sans mot de passe ni e-mail de confirmation.</Text>

      <View style={styles.separator} />

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor={colors.muted}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholderTextColor={colors.muted}
      />
      <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => run(() => signInWithEmail(email, password))}>
        <Text style={styles.btnOutlineText}>Se connecter</Text>
      </Pressable>

      {busy ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center', backgroundColor: colors.background },
  title: { fontSize: 32, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  btn: { height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  btnPrimary: { backgroundColor: colors.text },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  btnOutline: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  btnOutlineText: { color: colors.text, fontWeight: '600', fontSize: 16 },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.xs },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  error: { color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
});
