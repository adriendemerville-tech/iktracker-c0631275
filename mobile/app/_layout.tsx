import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/hooks/useAuth";
import { colors } from "@/theme";
import { StartupBoundary } from "@/components/StartupBoundary";
import { StartupErrorScreen } from "@/components/StartupErrorScreen";
import { checkBackendConfig, describeRuntimeError, type StartupIssue } from "@/lib/startup-checks";
import { captureStartupError } from "@/lib/monitoring";

// Enregistrement de la tâche GPS background : ne doit jamais faire crasher le boot.
let taskIssue: StartupIssue | null = null;
try {
  require("@/lib/tour-tracking");
} catch (error) {
  taskIssue = describeRuntimeError(error);
  captureStartupError(error, "background-task-registration");
}

export default function RootLayout() {
  const [retryKey, setRetryKey] = React.useState(0);
  const issue = React.useMemo(() => checkBackendConfig() ?? taskIssue, [retryKey]);

  if (issue) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <StartupErrorScreen issue={issue} onRetry={() => setRetryKey((k) => k + 1)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StartupBoundary>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </AuthProvider>
      </StartupBoundary>
    </SafeAreaProvider>
  );
}
