import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './startup-checks';

// .env (dev) puis app.json > extra (build EAS) : la cle anon est publique.
const { url, anonKey } = getSupabaseConfig();

// Si la config manque, on n'instancie pas le client : l'écran d'erreur de
// démarrage prend le relais au lieu d'un crash natif au boot.
export const supabase: SupabaseClient =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : (new Proxy(
        {},
        {
          get() {
            throw new Error(
              'Configuration backend manquante : EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY absentes.',
            );
          },
        },
      ) as SupabaseClient);
