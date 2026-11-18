import { Suspense, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { DATABASE_NAME } from '../db/config';
import { migrateDbIfNeeded } from '../db/migrate';
import { FeedbackProvider } from '../ui/Feedback';
import { cor } from '../ui/tema';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Carregando() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cor.fundo }}>
      <ActivityIndicator size="large" color={cor.acaoInicio} />
    </View>
  );
}

export default function RootLayout() {
  const [fontesProntas, erroFontes] = useFonts({ Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const pronto = fontesProntas || !!erroFontes; // sem a fonte, segue com a do sistema

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync().catch(() => {});
  }, [pronto]);

  if (!pronto) return null;

  return (
    <View style={{ flex: 1, backgroundColor: cor.fundo }}>
      <StatusBar style="light" />
      <Suspense fallback={<Carregando />}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded} useSuspense>
          <FeedbackProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: cor.fundo },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(abas)" />
              <Stack.Screen name="orcamento/novo" options={{ animation: 'slide_from_bottom' }} />
            </Stack>
          </FeedbackProvider>
        </SQLiteProvider>
      </Suspense>
    </View>
  );
}
